"use server";

import { db } from "@/db";
import { users, affiliateProfiles, affiliateCommissions, orders, products, affiliateReferrals, payouts } from "@/db/schema";
import { eq, and, ne, desc, gt, or, count, sql } from "drizzle-orm";
import { getOrCreateDbUser, isAdmin } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

const MAX_CHANNELS_LENGTH = 1000;
const MAX_REF_LENGTH = 128;

/** Best client IP: Cloudflare's header first, then the first X-Forwarded-For hop. */
function clientIp(headersList: Headers): string {
  return (
    headersList.get("cf-connecting-ip") ||
    headersList.get("x-real-ip") ||
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export async function registerAffiliateAction({
  slug,
  channels,
}: {
  slug: string;
  channels: string;
}) {
  const user = await getOrCreateDbUser();
  if (!user) {
    throw new Error("Unauthorized: Please sign in to register.");
  }

  if (typeof slug !== "string" || typeof channels !== "string") {
    throw new Error("Invalid affiliate registration.");
  }
  if (channels.length > MAX_CHANNELS_LENGTH) {
    throw new Error(`Channels must be at most ${MAX_CHANNELS_LENGTH} characters.`);
  }

  // Validate slug
  const cleanSlug = slug.trim().toLowerCase();
  if (!/^[a-z0-9_-]{3,20}$/.test(cleanSlug)) {
    throw new Error("Handle must be 3-20 characters, containing only letters, numbers, hyphens, or underscores.");
  }

  // A handle must not collide with another user's handle or user id
  // (referral codes resolve by either).
  const [taken] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(or(eq(users.affiliateSlug, cleanSlug), eq(users.id, cleanSlug)), ne(users.id, user.id)))
    .limit(1);

  if (taken) {
    throw new Error("This referral handle is already in use by another user.");
  }

  // Update user's affiliate slug (unique constraint guards concurrent claims)
  try {
    await db
      .update(users)
      .set({
        affiliateSlug: cleanSlug,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));
  } catch {
    throw new Error("This referral handle is already in use by another user.");
  }

  // Create or update affiliate profile in one upsert
  const now = new Date();
  await db
    .insert(affiliateProfiles)
    .values({
      id: user.id,
      channels,
      status: "approved", // Auto-approved
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: affiliateProfiles.id,
      set: { channels, status: "approved", updatedAt: now },
    });

  revalidatePath("/affiliate");
  revalidatePath("/affiliate/dashboard");
  return { success: true };
}

export async function updateAffiliateStatusAction({
  userId,
  status,
}: {
  userId: string;
  status: "approved" | "rejected";
}) {
  const authorized = await isAdmin();
  if (!authorized) {
    throw new Error("Unauthorized: Admin access required.");
  }
  if (typeof userId !== "string" || !userId || (status !== "approved" && status !== "rejected")) {
    throw new Error("Invalid affiliate status update.");
  }

  await db
    .update(affiliateProfiles)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(affiliateProfiles.id, userId));

  revalidatePath("/admin/affiliates");
  return { success: true };
}

export async function getAffiliateDashboardStatsAction() {
  const user = await getOrCreateDbUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  // Independent queries run in parallel; counts and sums are aggregated in SQL.
  const [[clickAgg], [conversionAgg], [commissionAgg], commissions, referredOrders] = await Promise.all([
    db
      .select({ n: count() })
      .from(affiliateReferrals)
      .where(eq(affiliateReferrals.affiliateId, user.id)),
    db
      .select({ n: count() })
      .from(orders)
      .where(and(eq(orders.referredById, user.id), eq(orders.status, "completed"))),
    db
      .select({
        totalEarned: sql<number>`coalesce(sum(${affiliateCommissions.amount}) filter (where ${affiliateCommissions.status} in ('paid', 'approved', 'pending')), 0)`.mapWith(Number),
        unpaidBalance: sql<number>`coalesce(sum(${affiliateCommissions.amount}) filter (where ${affiliateCommissions.status} = 'pending'), 0)`.mapWith(Number),
        paidBalance: sql<number>`coalesce(sum(${affiliateCommissions.amount}) filter (where ${affiliateCommissions.status} = 'paid'), 0)`.mapWith(Number),
      })
      .from(affiliateCommissions)
      .where(eq(affiliateCommissions.affiliateId, user.id)),
    db.query.affiliateCommissions.findMany({
      where: eq(affiliateCommissions.affiliateId, user.id),
      orderBy: desc(affiliateCommissions.createdAt),
    }),
    db
      .select({
        id: orders.id,
        amount: orders.amount,
        status: orders.status,
        createdAt: orders.createdAt,
        productTitle: products.title,
      })
      .from(orders)
      .innerJoin(products, eq(orders.productId, products.id))
      .where(eq(orders.referredById, user.id))
      .orderBy(desc(orders.createdAt)),
  ]);

  const totalClicks = clickAgg?.n ?? 0;
  const totalConversions = conversionAgg?.n ?? 0;
  const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
  const totalEarned = commissionAgg?.totalEarned ?? 0;
  const unpaidBalance = commissionAgg?.unpaidBalance ?? 0;
  const paidBalance = commissionAgg?.paidBalance ?? 0;

  return {
    totalClicks,
    totalConversions,
    conversionRate,
    totalEarned,
    unpaidBalance,
    paidBalance,
    commissions,
    referredOrders,
  };
}

export async function recordReferralClickAction({
  ref,
  productId,
  referrerUrl,
}: {
  ref: string;
  productId?: string;
  referrerUrl?: string;
}) {
  try {
    if (typeof ref !== "string" || !ref.trim() || ref.length > MAX_REF_LENGTH) {
      return { success: false };
    }
    const cleanRef = ref.trim();

    const [headersList, [referrer]] = await Promise.all([
      headers(),
      db
        .select({ id: users.id })
        .from(users)
        .where(or(eq(users.id, cleanRef), eq(users.affiliateSlug, cleanRef.toLowerCase())))
        .limit(1),
    ]);

    if (!referrer) return { success: false };

    // IP + User Agent for simple deduplication
    const ip = clientIp(headersList);
    const userAgent = (headersList.get("user-agent") || "unknown").slice(0, 512);

    // Hash the IP to respect privacy (plain SHA-256 keeps existing hashes comparable)
    const ipHash = await sha256Hex(ip);

    // Check if this IP clicked this affiliate link in the last 24 hours to prevent spam
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [existingClick] = await db
      .select({ id: affiliateReferrals.id })
      .from(affiliateReferrals)
      .where(
        and(
          eq(affiliateReferrals.affiliateId, referrer.id),
          eq(affiliateReferrals.ipHash, ipHash),
          gt(affiliateReferrals.createdAt, oneDayAgo)
        )
      )
      .limit(1);

    if (existingClick) {
      return { success: true, message: "Duplicate click ignored" };
    }

    await db.insert(affiliateReferrals).values({
      id: crypto.randomUUID(),
      affiliateId: referrer.id,
      productId: typeof productId === "string" && productId.length <= MAX_REF_LENGTH ? productId : null,
      ipHash,
      userAgent,
      referrerUrl: typeof referrerUrl === "string" ? referrerUrl.slice(0, 2048) : null,
      createdAt: new Date(),
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to log referral click:", error);
    return { success: false };
  }
}

export async function payoutAffiliateCommissionAction(commissionId: string) {
  const authorized = await isAdmin();
  if (!authorized) {
    throw new Error("Unauthorized: Admin access required.");
  }

  if (typeof commissionId !== "string" || !commissionId) {
    throw new Error("Commission record not found.");
  }

  // Atomic pending -> paid transition: concurrent clicks cannot log two payouts.
  const [commission] = await db
    .update(affiliateCommissions)
    .set({
      status: "paid",
      updatedAt: new Date(),
    })
    .where(and(eq(affiliateCommissions.id, commissionId), ne(affiliateCommissions.status, "paid")))
    .returning({
      affiliateId: affiliateCommissions.affiliateId,
      amount: affiliateCommissions.amount,
      orderId: affiliateCommissions.orderId,
    });

  if (!commission) {
    const [existing] = await db
      .select({ id: affiliateCommissions.id })
      .from(affiliateCommissions)
      .where(eq(affiliateCommissions.id, commissionId))
      .limit(1);
    throw new Error(existing ? "Commission is already paid." : "Commission record not found.");
  }

  // Log payout
  await db.insert(payouts).values({
    id: crypto.randomUUID(),
    userId: commission.affiliateId,
    amount: commission.amount,
    status: "processed",
    payoutMethod: "manual",
    payoutDetails: `Manual admin settlement for affiliate commission. Order: ${commission.orderId}`,
    createdAt: new Date(),
  });

  revalidatePath("/admin/affiliates");
  return { success: true };
}

export async function validateReferralCodeAction(code: string) {
  if (!code || typeof code !== "string" || !code.trim()) {
    return { success: false, message: "Please enter a code." };
  }
  if (code.length > MAX_REF_LENGTH) {
    return { success: false, message: "Referral code not found." };
  }
  const cleanCode = code.trim().toLowerCase();
  const [referrer] = await db
    .select({
      id: users.id,
      affiliateSlug: users.affiliateSlug,
      storeName: users.storeName,
      profileStatus: affiliateProfiles.status,
    })
    .from(users)
    .leftJoin(affiliateProfiles, eq(affiliateProfiles.id, users.id))
    .where(or(eq(users.id, cleanCode), eq(users.affiliateSlug, cleanCode)))
    .limit(1);
  if (!referrer) {
    return { success: false, message: "Referral code not found." };
  }
  if (referrer.profileStatus !== "approved") {
    return { success: false, message: "Affiliate profile is inactive." };
  }
  return { 
    success: true, 
    referrerId: referrer.id,
    referrerSlug: referrer.affiliateSlug || referrer.id,
    storeName: referrer.storeName || "Partner" 
  };
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
