"use server";

import { cache } from "react";
import { z } from "zod";
import { db } from "@/db";
import { paymentLinks, paymentLinkActivities } from "@/db/schema";
import { and, count, desc, eq, inArray, isNull, or, sql, sum } from "drizzle-orm";
import { getOrCreateDbUser, isAdmin } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { encodePaymentLinkPayload, isSafeRedirectUrl } from "@/lib/payments/link-encoder";
import {
  getRazorpay,
  getRazorpayKeyId,
  randomHex,
  verifyRazorpayPaymentSignature,
} from "@/lib/payments/razorpay-server";
import { recordPaymentLinkSuccess } from "@/lib/payments/fulfillment";

// payment_links.price / activity amounts are int4 paise.
const MAX_PAISE = 2_147_483_647;
const MAX_INR = Math.floor(MAX_PAISE / 100);

function newActivityId() {
  return `act_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

function generateSlug(title: string, addRandom = false): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  if (!addRandom) {
    return base || `link-${randomHex(3)}`;
  }
  const rand = randomHex(3);
  return base ? `${base}-${rand}` : `link-${rand}`;
}

function normalizeRedirectUrl(raw: string): string {
  let url = raw.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }
  return url;
}

const currencySchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{3}$/, "Currency must be a 3-letter ISO code.")
  .transform((c) => c.toUpperCase());

const createLinkSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200, "Title is too long."),
  price: z
    .number({ message: "Price must be greater than 0." })
    .positive("Price must be greater than 0.")
    .max(MAX_INR, "Price is too large."),
  description: z.string().trim().max(2000, "Description is too long.").optional(),
  redirectUrl: z.string().trim().min(1, "Redirect URL is required.").max(2048, "Redirect URL is too long."),
  customSlug: z.string().trim().max(80, "Custom slug is too long.").optional(),
  currency: currencySchema.optional(),
});

export interface CreatePaymentLinkInput {
  title: string;
  price: number; // in INR (will be stored as paise = price * 100)
  description?: string;
  redirectUrl: string;
  customSlug?: string;
  currency?: string;
}

/**
 * Creates a new stored payment link in the database.
 * Accessible to Admin or logged in Creator, or anonymously via the Open API.
 */
export async function createPaymentLinkAction(input: CreatePaymentLinkInput) {
  const parsed = createLinkSchema.safeParse({
    ...input,
    price: typeof input?.price === "string" ? Number(input.price) : input?.price,
    description: input?.description || undefined,
    customSlug: input?.customSlug || undefined,
    currency: input?.currency || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid payment link.");
  }
  const data = parsed.data;

  const parsedRedirect = normalizeRedirectUrl(data.redirectUrl);
  if (!isSafeRedirectUrl(parsedRedirect)) {
    throw new Error("Invalid redirect URL format.");
  }

  const priceInPaise = Math.round(data.price * 100);
  if (priceInPaise < 100) {
    throw new Error("Payment amount must be at least ₹1.");
  }

  let user = null;
  try {
    user = await getOrCreateDbUser();
  } catch {
    // Outside active request store or anonymous API call
  }

  const id = `pl_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  let slug = data.customSlug ? generateSlug(data.customSlug, false) : generateSlug(data.title, true);

  // Ensure slug uniqueness
  const [existing] = await db
    .select({ id: paymentLinks.id })
    .from(paymentLinks)
    .where(eq(paymentLinks.slug, slug))
    .limit(1);
  if (existing) {
    slug = `${slug}-${randomHex(2)}`;
  }

  const [newLink] = await db
    .insert(paymentLinks)
    .values({
      id,
      slug,
      title: data.title,
      description: data.description || null,
      price: priceInPaise,
      currency: data.currency || "INR",
      redirectUrl: parsedRedirect,
      creatorId: user?.id || null,
      active: true,
      views: 0,
      conversions: 0,
      totalEarned: 0,
    })
    .returning();

  try {
    revalidatePath("/admin/payment-links");
  } catch {
    // Ignore outside request scope
  }

  return { success: true, link: newLink };
}

/**
 * Retrieves all payment links for the Admin console with metrics.
 */
export async function getAdminPaymentLinksAction() {
  const authorized = await isAdmin();
  if (!authorized) {
    throw new Error("Unauthorized: Admin access required.");
  }

  return db.query.paymentLinks.findMany({
    orderBy: [desc(paymentLinks.createdAt)],
  });
}

/**
 * Retrieves recent payment link activities for the Admin stream.
 */
export async function getPaymentLinkActivitiesAction(limit = 50) {
  const authorized = await isAdmin();
  if (!authorized) {
    throw new Error("Unauthorized: Admin access required.");
  }

  const safeLimit = Math.min(Math.max(Math.trunc(Number(limit)) || 50, 1), 500);

  return db.query.paymentLinkActivities.findMany({
    orderBy: [desc(paymentLinkActivities.createdAt)],
    limit: safeLimit,
  });
}

/**
 * Toggles payment link active status.
 */
export async function togglePaymentLinkActiveAction(id: string, active: boolean) {
  const authorized = await isAdmin();
  if (!authorized) {
    throw new Error("Unauthorized: Admin access required.");
  }
  if (typeof id !== "string" || !id || typeof active !== "boolean") {
    throw new Error("Invalid request.");
  }

  await db
    .update(paymentLinks)
    .set({ active, updatedAt: new Date() })
    .where(eq(paymentLinks.id, id));

  revalidatePath("/admin/payment-links");
  return { success: true };
}

/**
 * Deletes a payment link.
 */
export async function deletePaymentLinkAction(id: string) {
  const authorized = await isAdmin();
  if (!authorized) {
    throw new Error("Unauthorized: Admin access required.");
  }
  if (typeof id !== "string" || !id) {
    throw new Error("Invalid request.");
  }

  await db.delete(paymentLinks).where(eq(paymentLinks.id, id));
  revalidatePath("/admin/payment-links");
  return { success: true };
}

/**
 * Request-deduplicated lookup: generateMetadata and the page both call
 * getPublicPaymentLinkAction, but a view is only counted once per request.
 */
const loadPublicLinkAndCountView = cache(async (slugOrId: string) => {
  if (typeof slugOrId !== "string" || !slugOrId || slugOrId.length > 128) {
    return null;
  }

  const [link] = await db
    .select()
    .from(paymentLinks)
    .where(or(eq(paymentLinks.slug, slugOrId), eq(paymentLinks.id, slugOrId)))
    .limit(1);

  if (link && link.active) {
    try {
      await Promise.all([
        db
          .update(paymentLinks)
          .set({ views: sql`${paymentLinks.views} + 1` })
          .where(eq(paymentLinks.id, link.id)),
        db.insert(paymentLinkActivities).values({
          id: newActivityId(),
          linkId: link.id,
          type: "view",
          amount: link.price,
        }),
      ]);
    } catch (err) {
      // Analytics must never block the checkout page.
      console.error("Failed to record payment link view:", err);
    }
  }

  return link || null;
});

/**
 * Fetches a public payment link by its slug or ID, and logs a view activity.
 */
export async function getPublicPaymentLinkAction(slugOrId: string) {
  return loadPublicLinkAndCountView(slugOrId);
}

type ActivityType = "view" | "checkout_initiated" | "payment_success" | "payment_failed";

interface ActivityInput {
  linkId?: string | null;
  type: ActivityType;
  orderId?: string | null;
  paymentId?: string | null;
  amount?: number;
  payerEmail?: string;
  payerName?: string;
  payerPhone?: string;
  metadata?: string;
}

const clip = (value: string | undefined | null, max: number) =>
  value ? String(value).slice(0, max) : null;

async function insertActivity(input: ActivityInput) {
  try {
    const amount =
      typeof input.amount === "number" && Number.isFinite(input.amount)
        ? Math.min(Math.max(Math.round(input.amount), 0), MAX_PAISE)
        : null;
    await db.insert(paymentLinkActivities).values({
      id: newActivityId(),
      linkId: clip(input.linkId, 128),
      type: input.type,
      orderId: clip(input.orderId, 128),
      paymentId: clip(input.paymentId, 128),
      amount: amount || null,
      payerEmail: clip(input.payerEmail, 254),
      payerName: clip(input.payerName, 200),
      payerPhone: clip(input.payerPhone, 32),
      metadata: clip(input.metadata, 4000),
    });
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
}

/**
 * Log an activity (view or checkout initiation) for dynamic or stored links.
 *
 * This is a public server action, so it only records the client-observable
 * funnel events ("view", "checkout_initiated"). Payment outcomes are written
 * exclusively by server-verified paths, so analytics revenue cannot be forged.
 */
export async function logLinkActivityAction({
  linkId,
  type,
  amount,
  payerEmail,
  payerName,
  payerPhone,
  metadata,
}: {
  linkId?: string | null;
  type: "view" | "checkout_initiated" | "payment_success" | "payment_failed";
  amount?: number;
  payerEmail?: string;
  payerName?: string;
  payerPhone?: string;
  metadata?: string;
}) {
  if (type !== "view" && type !== "checkout_initiated") {
    return;
  }
  await insertActivity({ linkId, type, amount, payerEmail, payerName, payerPhone, metadata });
}

const createLinkOrderSchema = z.object({
  linkId: z.string().trim().min(1).max(128).optional(),
  title: z.string().trim().min(1).max(200),
  priceInPaise: z.number().int().min(100, "Payment amount must be at least ₹1 (100 paise).").max(MAX_PAISE),
  currency: currencySchema.optional().default("INR"),
  payerEmail: z.string().trim().max(254).optional(),
  payerName: z.string().trim().max(200).optional(),
  payerPhone: z.string().trim().max(32).optional(),
});

/**
 * Initiates Razorpay Order for a Payment Link (stored or dynamic).
 * Stored links are always charged their database price, never the client's.
 */
export async function createLinkRazorpayOrderAction(rawInput: {
  linkId?: string;
  title: string;
  priceInPaise: number;
  currency?: string;
  payerEmail?: string;
  payerName?: string;
  payerPhone?: string;
}) {
  const parsed = createLinkOrderSchema.safeParse({
    ...rawInput,
    priceInPaise:
      typeof rawInput?.priceInPaise === "number" ? Math.round(rawInput.priceInPaise) : rawInput?.priceInPaise,
    linkId: rawInput?.linkId || undefined,
    payerEmail: rawInput?.payerEmail || undefined,
    payerName: rawInput?.payerName || undefined,
    payerPhone: rawInput?.payerPhone || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid payment request.");
  }

  const { linkId, payerEmail, payerName, payerPhone } = parsed.data;
  let { title, priceInPaise, currency } = parsed.data;

  if (linkId) {
    const [link] = await db
      .select({
        id: paymentLinks.id,
        title: paymentLinks.title,
        price: paymentLinks.price,
        currency: paymentLinks.currency,
        active: paymentLinks.active,
      })
      .from(paymentLinks)
      .where(eq(paymentLinks.id, linkId))
      .limit(1);

    if (!link || !link.active) {
      throw new Error("This payment link is no longer active.");
    }
    title = link.title;
    priceInPaise = link.price;
    currency = (link.currency || "INR").toUpperCase();
  }

  const options = {
    amount: priceInPaise,
    currency,
    receipt: `rcpt_link_${Date.now().toString().slice(-8)}`,
    notes: {
      type: "payment_link",
      title: title.slice(0, 40),
      linkId: linkId || "dynamic",
      payerEmail: payerEmail || "",
      payerName: payerName || "",
    },
  };

  let order: { id: string; amount: number | string; currency: string };
  try {
    order = await getRazorpay().orders.create(options);
  } catch (err) {
    console.error("Razorpay payment link order creation failed:", err);
    throw new Error("Payment gateway is temporarily unavailable. Please try again in a moment.");
  }

  // Checkout initiation; the orderId column is the server-trusted record of
  // the amount/link for this order, used again during verification.
  await insertActivity({
    linkId: linkId || null,
    type: "checkout_initiated",
    orderId: order.id,
    amount: priceInPaise,
    payerEmail,
    payerName,
    payerPhone,
    metadata: JSON.stringify({ orderId: order.id, title }),
  });

  return {
    orderId: order.id,
    amount: Number(order.amount),
    currency: order.currency,
    keyId: getRazorpayKeyId(),
  };
}

/** Server-trusted amount and link for a Razorpay order created above. */
async function resolveTrustedLinkOrder(orderId: string): Promise<{
  linkId: string | null;
  amount: number;
  title: string | null;
} | null> {
  const [initiated] = await db
    .select({
      linkId: paymentLinkActivities.linkId,
      amount: paymentLinkActivities.amount,
      metadata: paymentLinkActivities.metadata,
    })
    .from(paymentLinkActivities)
    .where(
      and(
        eq(paymentLinkActivities.orderId, orderId),
        eq(paymentLinkActivities.type, "checkout_initiated")
      )
    )
    .orderBy(desc(paymentLinkActivities.createdAt))
    .limit(1);

  if (initiated && typeof initiated.amount === "number") {
    let title: string | null = null;
    try {
      title = initiated.metadata ? JSON.parse(initiated.metadata).title ?? null : null;
    } catch {
      title = null;
    }
    return { linkId: initiated.linkId, amount: initiated.amount, title };
  }

  // Fallback for orders created before orderId was recorded: ask Razorpay.
  try {
    const rzpOrder = await getRazorpay().orders.fetch(orderId);
    const notes = (rzpOrder.notes || {}) as Record<string, unknown>;
    const noteLink = typeof notes.linkId === "string" ? notes.linkId : "";
    return {
      linkId: noteLink && noteLink !== "dynamic" ? noteLink : null,
      amount: Number(rzpOrder.amount_paid || rzpOrder.amount) || 0,
      title: typeof notes.title === "string" ? notes.title : null,
    };
  } catch (err) {
    console.error("Failed to fetch Razorpay order for link verification:", err);
    return null;
  }
}

const verifyLinkSchema = z.object({
  orderId: z.string().trim().min(1).max(128),
  paymentId: z.string().trim().min(1).max(128),
  signature: z.string().trim().min(1).max(256),
  linkId: z.string().trim().max(128).optional(),
  redirectUrl: z.string().trim().max(2048),
  amount: z.number().optional(),
  payerEmail: z.string().trim().max(254).optional(),
  payerName: z.string().trim().max(200).optional(),
  payerPhone: z.string().trim().max(32).optional(),
});

/**
 * Verifies Razorpay payment signature and completes payment link fulfillment.
 * Amount and link attribution come from server records, and the success is
 * recorded at most once per payment id (shared with the webhook).
 */
export async function verifyLinkPaymentAction(rawInput: {
  orderId: string;
  paymentId: string;
  signature: string;
  linkId?: string;
  redirectUrl: string;
  amount: number;
  payerEmail?: string;
  payerName?: string;
  payerPhone?: string;
}) {
  const parsed = verifyLinkSchema.safeParse({
    ...rawInput,
    linkId: rawInput?.linkId || undefined,
    payerEmail: rawInput?.payerEmail || undefined,
    payerName: rawInput?.payerName || undefined,
    payerPhone: rawInput?.payerPhone || undefined,
  });
  if (!parsed.success) {
    throw new Error("Invalid payment verification request.");
  }
  const { orderId, paymentId, signature, payerEmail, payerName, payerPhone } = parsed.data;

  const isAuthentic = await verifyRazorpayPaymentSignature({
    razorpayOrderId: orderId,
    razorpayPaymentId: paymentId,
    signature,
  });

  if (!isAuthentic) {
    await insertActivity({
      linkId: parsed.data.linkId || null,
      type: "payment_failed",
      orderId,
      paymentId,
      payerEmail,
      payerName,
      payerPhone,
      metadata: JSON.stringify({ orderId, paymentId, reason: "Signature mismatch" }),
    });
    throw new Error("Invalid payment signature verification.");
  }

  const trusted = await resolveTrustedLinkOrder(orderId);
  const linkId = trusted ? trusted.linkId : null;

  // Stored links redirect to their saved destination; dynamic links use the
  // (validated) URL the payer was shown.
  let redirectUrl = isSafeRedirectUrl(parsed.data.redirectUrl) ? parsed.data.redirectUrl : "/";
  if (linkId) {
    const [link] = await db
      .select({ redirectUrl: paymentLinks.redirectUrl })
      .from(paymentLinks)
      .where(eq(paymentLinks.id, linkId))
      .limit(1);
    if (link && isSafeRedirectUrl(link.redirectUrl)) {
      redirectUrl = link.redirectUrl;
    }
  }

  await recordPaymentLinkSuccess({
    linkId,
    orderId,
    paymentId,
    amount: trusted?.amount ?? 0,
    payerEmail: payerEmail || null,
    payerName: payerName || null,
    payerPhone: payerPhone || null,
    metadata: { redirectUrl, title: trusted?.title ?? null },
  });

  return {
    success: true,
    redirectUrl,
    orderId,
    paymentId,
  };
}

/**
 * Generates a signed, URL-safe Base64 payment link token.
 */
export async function generateEncodedPaymentLinkAction(payload: {
  title: string;
  price: number;
  redirectUrl: string;
  description?: string | null;
  currency?: string;
  sign?: boolean;
}) {
  const title = typeof payload?.title === "string" ? payload.title.trim() : "";
  const price = Number(payload?.price);
  const redirectUrl =
    typeof payload?.redirectUrl === "string" ? normalizeRedirectUrl(payload.redirectUrl) : "";

  if (!title || title.length > 200) throw new Error("Title is required.");
  if (!Number.isFinite(price) || price <= 0 || price > MAX_INR) {
    throw new Error("Price must be greater than 0.");
  }
  if (!isSafeRedirectUrl(redirectUrl)) throw new Error("Invalid redirect URL format.");

  const token = encodePaymentLinkPayload(
    {
      title,
      price,
      redirectUrl,
      description: typeof payload.description === "string" ? payload.description.slice(0, 2000) : null,
      currency: typeof payload.currency === "string" && /^[A-Za-z]{3}$/.test(payload.currency)
        ? payload.currency.toUpperCase()
        : undefined,
    },
    payload.sign !== false
  );
  return {
    success: true,
    token,
    encodedUrl: `/pay?data=${token}`,
  };
}

/** Dynamic (/pay) activities have no stored link id. */
const isDynamicActivity = or(isNull(paymentLinkActivities.linkId), eq(paymentLinkActivities.linkId, "dynamic"));

const RECENT_DYNAMIC_LIMIT = 500;

/**
 * Returns detailed analytics separated for:
 * 1) Stored Database Links (/pay/[slug])
 * 2) Dynamic On-The-Fly / Base64 Encoded Checkouts (/pay)
 *
 * All counts and sums are aggregated in SQL.
 */
export async function getSeparatePaymentAnalyticsAction() {
  const authorized = await isAdmin();
  if (!authorized) {
    throw new Error("Unauthorized: Admin access required.");
  }

  const [storedAgg, dynamicByType, checkoutAgg, dynamicPaid] = await Promise.all([
    db
      .select({
        totalLinks: count(),
        activeLinks: sql<number>`count(*) filter (where ${paymentLinks.active})`.mapWith(Number),
        totalViews: sum(paymentLinks.views).mapWith(Number),
        totalConversions: sum(paymentLinks.conversions).mapWith(Number),
        totalEarned: sum(paymentLinks.totalEarned).mapWith(Number),
      })
      .from(paymentLinks),
    db
      .select({
        type: paymentLinkActivities.type,
        n: count(),
        amount: sum(paymentLinkActivities.amount).mapWith(Number),
      })
      .from(paymentLinkActivities)
      .where(
        and(
          isDynamicActivity,
          inArray(paymentLinkActivities.type, ["view", "checkout_initiated", "payment_success"])
        )
      )
      .groupBy(paymentLinkActivities.type),
    db
      .select({ n: count() })
      .from(paymentLinkActivities)
      .where(eq(paymentLinkActivities.type, "checkout_initiated")),
    db
      .select({
        id: paymentLinkActivities.id,
        orderId: paymentLinkActivities.orderId,
        paymentId: paymentLinkActivities.paymentId,
        amount: paymentLinkActivities.amount,
        payerEmail: paymentLinkActivities.payerEmail,
        payerName: paymentLinkActivities.payerName,
        payerPhone: paymentLinkActivities.payerPhone,
        metadata: paymentLinkActivities.metadata,
        createdAt: paymentLinkActivities.createdAt,
      })
      .from(paymentLinkActivities)
      .where(and(isDynamicActivity, eq(paymentLinkActivities.type, "payment_success")))
      .orderBy(desc(paymentLinkActivities.createdAt))
      .limit(RECENT_DYNAMIC_LIMIT),
  ]);

  const stored = storedAgg[0];
  const byType = new Map(dynamicByType.map((r) => [r.type, r]));

  // Dynamic /pay stats
  const dynamicViews = byType.get("view")?.n ?? 0;
  const dynamicCheckouts = byType.get("checkout_initiated")?.n ?? 0;
  const dynamicPaidCount = byType.get("payment_success")?.n ?? 0;
  const dynamicRevenueINR = (byType.get("payment_success")?.amount ?? 0) / 100;
  const dynamicConversionRate =
    dynamicViews > 0
      ? ((dynamicPaidCount / dynamicViews) * 100).toFixed(1)
      : dynamicCheckouts > 0
        ? ((dynamicPaidCount / dynamicCheckouts) * 100).toFixed(1)
        : "0.0";

  // Stored links stats
  const storedTotalViews = stored?.totalViews ?? 0;
  const storedTotalConversions = stored?.totalConversions ?? 0;
  const storedTotalRevenueINR = (stored?.totalEarned ?? 0) / 100;
  const storedConversionRate =
    storedTotalViews > 0 ? ((storedTotalConversions / storedTotalViews) * 100).toFixed(1) : "0.0";

  const recentDynamicTransactions = dynamicPaid.map((p) => {
    let redirectUrl = null;
    let title = null;
    try {
      if (p.metadata) {
        const meta = JSON.parse(p.metadata);
        redirectUrl = meta.redirectUrl || null;
        title = meta.title || null;
      }
    } catch {}
    return {
      id: p.id,
      orderId: p.orderId,
      paymentId: p.paymentId,
      amount: (p.amount || 0) / 100,
      payerEmail: p.payerEmail,
      payerName: p.payerName,
      payerPhone: p.payerPhone,
      redirectUrl,
      title,
      createdAt: p.createdAt,
    };
  });

  return {
    overall: {
      totalRevenue: storedTotalRevenueINR + dynamicRevenueINR,
      totalPaidOrders: storedTotalConversions + dynamicPaidCount,
      totalViews: storedTotalViews + dynamicViews,
      totalCheckouts: checkoutAgg[0]?.n ?? 0,
    },
    stored: {
      totalLinks: stored?.totalLinks ?? 0,
      activeLinks: stored?.activeLinks ?? 0,
      totalRevenue: storedTotalRevenueINR,
      totalConversions: storedTotalConversions,
      totalViews: storedTotalViews,
      conversionRate: storedConversionRate,
    },
    dynamicPay: {
      totalRevenue: dynamicRevenueINR,
      totalConversions: dynamicPaidCount,
      totalCheckoutStarts: dynamicCheckouts,
      totalViews: dynamicViews,
      conversionRate: dynamicConversionRate,
      recentTransactions: recentDynamicTransactions,
    },
  };
}

/**
 * Retrieves full telemetry analytics for a single specific link.
 */
export async function getSingleLinkAnalyticsAction(linkId: string) {
  const authorized = await isAdmin();
  if (!authorized) {
    throw new Error("Unauthorized: Admin access required.");
  }

  const [linkRows, typeCounts, activities] = await Promise.all([
    db.select().from(paymentLinks).where(eq(paymentLinks.id, linkId)).limit(1),
    db
      .select({ type: paymentLinkActivities.type, n: count() })
      .from(paymentLinkActivities)
      .where(eq(paymentLinkActivities.linkId, linkId))
      .groupBy(paymentLinkActivities.type),
    db.query.paymentLinkActivities.findMany({
      where: eq(paymentLinkActivities.linkId, linkId),
      orderBy: [desc(paymentLinkActivities.createdAt)],
      limit: 100,
    }),
  ]);

  const link = linkRows[0];
  if (!link) {
    throw new Error("Payment link not found.");
  }

  const countOf = (type: string) => typeCounts.find((r) => r.type === type)?.n ?? 0;

  return {
    link,
    metrics: {
      views: Math.max(countOf("view"), link.views),
      checkouts: countOf("checkout_initiated"),
      successes: Math.max(countOf("payment_success"), link.conversions),
      failures: countOf("payment_failed"),
      revenueINR: link.totalEarned / 100,
      conversionRate: link.views > 0 ? ((link.conversions / link.views) * 100).toFixed(1) : "0.0",
    },
    activities,
  };
}
