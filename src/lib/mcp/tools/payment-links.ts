import { z } from "zod";
import { and, asc, desc, eq, ilike, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { paymentLinkActivities, paymentLinks, users } from "@/db/schema";
import { defineTool } from "../registry";
import {
  INT4_MAX,
  ToolError,
  httpUrlField,
  isUniqueViolation,
  iso,
  likeTerm,
  normalizeSlug,
  page,
  paginationFields,
  paiseMoney,
  revalidate,
  searchField,
} from "../util";

const pricePaise = z
  .number()
  .int()
  .min(100)
  .max(INT4_MAX)
  .describe("Price in integer INR paise (minimum 100 = ₹1). Payment links are always INR paise, unlike catalog prices.");

function randomSuffix() {
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

type LinkRow = typeof paymentLinks.$inferSelect;

function formatLink(l: LinkRow) {
  return {
    id: l.id,
    slug: l.slug,
    url: `/pay/${l.slug}`,
    title: l.title,
    description: l.description,
    price: paiseMoney(l.price),
    currency: l.currency,
    redirectUrl: l.redirectUrl,
    creatorId: l.creatorId,
    active: l.active,
    views: l.views,
    conversions: l.conversions,
    conversionRatePercent: l.views > 0 ? Number(((l.conversions / l.views) * 100).toFixed(1)) : 0,
    totalEarned: paiseMoney(l.totalEarned),
    createdAt: iso(l.createdAt),
    updatedAt: iso(l.updatedAt),
  };
}

async function findLink(idOrSlug: string) {
  const [l] = await db
    .select()
    .from(paymentLinks)
    .where(or(eq(paymentLinks.id, idOrSlug), eq(paymentLinks.slug, idOrSlug)))
    .limit(1);
  if (!l) throw new ToolError(`Payment link not found: ${idOrSlug}`);
  return l;
}

const SORTS = {
  newest: [desc(paymentLinks.createdAt), desc(paymentLinks.id)],
  oldest: [asc(paymentLinks.createdAt), asc(paymentLinks.id)],
  earned_desc: [desc(paymentLinks.totalEarned), desc(paymentLinks.id)],
  views_desc: [desc(paymentLinks.views), desc(paymentLinks.id)],
} as const;

const linksList = defineTool({
  name: "payment_links_list",
  title: "List payment links",
  description: "Stored /pay links with views, conversions and earnings. All money here is INR paise (not catalog USD cents).",
  kind: "read",
  input: z.strictObject({
    query: searchField.optional().describe("Match on title or slug."),
    active: z.boolean().optional(),
    creatorId: z.string().trim().min(1).max(200).optional(),
    sort: z.enum(["newest", "oldest", "earned_desc", "views_desc"]).default("newest"),
    ...paginationFields,
  }),
  async handler(a) {
    const where: SQL[] = [];
    if (a.query) where.push(or(ilike(paymentLinks.title, likeTerm(a.query)), ilike(paymentLinks.slug, likeTerm(a.query)))!);
    if (a.active !== undefined) where.push(eq(paymentLinks.active, a.active));
    if (a.creatorId) where.push(eq(paymentLinks.creatorId, a.creatorId));
    const cond = where.length ? and(...where) : undefined;
    const [rows, [agg]] = await Promise.all([
      db.select().from(paymentLinks).where(cond).orderBy(...SORTS[a.sort]).limit(a.limit).offset(a.offset),
      db
        .select({
          total: sql<number>`count(*)`.mapWith(Number),
          earned: sql<number>`coalesce(sum(${paymentLinks.totalEarned}), 0)`.mapWith(Number),
        })
        .from(paymentLinks)
        .where(cond),
    ]);
    return {
      summary: `${rows.length} of ${agg.total} payment links; matching earnings ${paiseMoney(agg.earned).formatted}.`,
      data: { ...page(rows.map(formatLink), agg.total, a.limit, a.offset), matchingEarned: paiseMoney(agg.earned) },
    };
  },
});

const linksGet = defineTool({
  name: "payment_links_get",
  title: "Get payment link with analytics",
  description:
    "One payment link (id or slug) with activity counts by type, failed/succeeded payments and the most recent activities (payer email/name, no IP or user agent). Money is INR paise.",
  kind: "read",
  input: z.strictObject({
    idOrSlug: z.string().trim().min(1).max(128),
    recent: z.number().int().min(0).max(100).default(20).describe("How many recent activities to include."),
  }),
  async handler({ idOrSlug, recent }) {
    const l = await findLink(idOrSlug);
    const [byType, activities, creator] = await Promise.all([
      db
        .select({
          type: paymentLinkActivities.type,
          n: sql<number>`count(*)`.mapWith(Number),
          amount: sql<number>`coalesce(sum(${paymentLinkActivities.amount}), 0)`.mapWith(Number),
        })
        .from(paymentLinkActivities)
        .where(eq(paymentLinkActivities.linkId, l.id))
        .groupBy(paymentLinkActivities.type),
      recent > 0
        ? db
            .select({
              id: paymentLinkActivities.id,
              type: paymentLinkActivities.type,
              amount: paymentLinkActivities.amount,
              orderId: paymentLinkActivities.orderId,
              paymentId: paymentLinkActivities.paymentId,
              payerEmail: paymentLinkActivities.payerEmail,
              payerName: paymentLinkActivities.payerName,
              createdAt: paymentLinkActivities.createdAt,
            })
            .from(paymentLinkActivities)
            .where(eq(paymentLinkActivities.linkId, l.id))
            .orderBy(desc(paymentLinkActivities.createdAt))
            .limit(recent)
        : Promise.resolve([]),
      l.creatorId ? db.select({ id: users.id, email: users.email }).from(users).where(eq(users.id, l.creatorId)).limit(1) : Promise.resolve([]),
    ]);
    const count = (t: string) => byType.find((r) => r.type === t)?.n ?? 0;
    const data = {
      link: formatLink(l),
      creator: creator[0] ?? null,
      analytics: {
        views: Math.max(count("view"), l.views),
        checkoutsInitiated: count("checkout_initiated"),
        paymentsSucceeded: Math.max(count("payment_success"), l.conversions),
        paymentsFailed: count("payment_failed"),
        successAmount: paiseMoney(byType.find((r) => r.type === "payment_success")?.amount ?? 0),
        totalEarned: paiseMoney(l.totalEarned),
      },
      recentActivities: activities.map((r) => ({ ...r, amount: r.amount == null ? null : paiseMoney(r.amount), createdAt: iso(r.createdAt) })),
    };
    return {
      summary: `${l.title} (/pay/${l.slug}): ${l.active ? "active" : "inactive"}, ${data.analytics.paymentsSucceeded} paid, earned ${data.link.totalEarned.formatted}.`,
      data,
    };
  },
});

const linksCreate = defineTool({
  name: "payment_links_create",
  title: "Create payment link",
  description:
    "Create a stored /pay/<slug> link. pricePaise is integer INR paise (49900 = ₹499). redirectUrl must be http(s). A custom slug must be unused; otherwise one is generated from the title.",
  kind: "write",
  input: z.strictObject({
    title: z.string().trim().min(1).max(200),
    pricePaise,
    redirectUrl: httpUrlField("Where the payer is sent after a successful payment."),
    description: z.string().trim().min(1).max(2000).optional(),
    slug: z.string().trim().min(1).max(80).optional().describe("Custom slug (normalized)."),
    currency: z.string().trim().regex(/^[A-Za-z]{3}$/).default("INR").describe("Display currency code; amounts are still stored as paise."),
    active: z.boolean().default(true),
  }),
  async handler(a) {
    let slug: string;
    if (a.slug) {
      slug = normalizeSlug(a.slug).slice(0, 80);
      if (!slug) throw new ToolError("Slug must contain at least one letter or number.");
      const [dupe] = await db.select({ id: paymentLinks.id }).from(paymentLinks).where(eq(paymentLinks.slug, slug)).limit(1);
      if (dupe) throw new ToolError(`Slug '${slug}' is already used by payment link ${dupe.id}.`);
    } else {
      slug = `${normalizeSlug(a.title).slice(0, 60) || "link"}-${randomSuffix()}`;
    }
    const id = `pl_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    let row: LinkRow;
    try {
      [row] = await db
        .insert(paymentLinks)
        .values({
          id,
          slug,
          title: a.title,
          description: a.description ?? null,
          price: a.pricePaise,
          currency: a.currency.toUpperCase(),
          redirectUrl: a.redirectUrl,
          creatorId: null,
          active: a.active,
        })
        .returning();
    } catch (err) {
      if (isUniqueViolation(err)) throw new ToolError(`Slug '${slug}' is already taken; retry or pass a different slug.`);
      throw err;
    }
    revalidate("/admin/payment-links");
    return { summary: `Created payment link /pay/${slug} for ${paiseMoney(a.pricePaise).formatted}.`, data: { link: formatLink(row) } };
  },
});

const linksUpdate = defineTool({
  name: "payment_links_update",
  title: "Update payment link",
  description: "Partially update a payment link (title, description, pricePaise in INR paise, redirectUrl, slug, active). Counters cannot be edited.",
  kind: "write",
  idempotent: true,
  input: z.strictObject({
    idOrSlug: z.string().trim().min(1).max(128),
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    pricePaise: pricePaise.optional(),
    redirectUrl: httpUrlField("Post-payment redirect.").optional(),
    slug: z.string().trim().min(1).max(80).optional(),
    active: z.boolean().optional(),
  }),
  async handler({ idOrSlug, ...p }) {
    const l = await findLink(idOrSlug);
    const set: Partial<typeof paymentLinks.$inferInsert> = {};
    if (p.title !== undefined) set.title = p.title;
    if (p.description !== undefined) set.description = p.description || null;
    if (p.pricePaise !== undefined) set.price = p.pricePaise;
    if (p.redirectUrl !== undefined) set.redirectUrl = p.redirectUrl;
    if (p.active !== undefined) set.active = p.active;
    if (p.slug !== undefined) {
      const slug = normalizeSlug(p.slug).slice(0, 80);
      if (!slug) throw new ToolError("Slug must contain at least one letter or number.");
      if (slug !== l.slug) {
        const [dupe] = await db
          .select({ id: paymentLinks.id })
          .from(paymentLinks)
          .where(and(eq(paymentLinks.slug, slug), ne(paymentLinks.id, l.id)))
          .limit(1);
        if (dupe) throw new ToolError(`Slug '${slug}' is already used.`);
      }
      set.slug = slug;
    }
    const keys = Object.keys(set);
    if (keys.length === 0) throw new ToolError("Provide at least one field to change.");
    set.updatedAt = new Date();
    let row: LinkRow;
    try {
      [row] = await db.update(paymentLinks).set(set).where(eq(paymentLinks.id, l.id)).returning();
    } catch (err) {
      if (isUniqueViolation(err)) throw new ToolError(`Slug '${set.slug}' is already used.`);
      throw err;
    }
    revalidate("/admin/payment-links", `/pay/${l.slug}`);
    return { summary: `Updated payment link ${l.id}: ${keys.join(", ")}.`, data: { link: formatLink(row), changed: keys } };
  },
});

const linksDeactivate = defineTool({
  name: "payment_links_deactivate",
  title: "Deactivate payment link",
  description: "Turn a payment link off so it no longer accepts payments (reversible with payment_links_update active=true). Stats are kept.",
  kind: "write",
  idempotent: true,
  input: z.strictObject({ idOrSlug: z.string().trim().min(1).max(128) }),
  async handler({ idOrSlug }) {
    const l = await findLink(idOrSlug);
    await db.update(paymentLinks).set({ active: false, updatedAt: new Date() }).where(eq(paymentLinks.id, l.id));
    revalidate("/admin/payment-links", `/pay/${l.slug}`);
    return { summary: `Deactivated payment link /pay/${l.slug}.`, data: { id: l.id, slug: l.slug, active: false } };
  },
});

export const paymentLinkTools = [linksList, linksGet, linksCreate, linksUpdate, linksDeactivate];
