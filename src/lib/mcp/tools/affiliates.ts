import { z } from "zod";
import { and, asc, desc, eq, gte, ilike, lt, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { affiliateCommissions, affiliateProfiles, products, users } from "@/db/schema";
import { defineTool } from "../registry";
import { ToolError, catalogMoney, confirmField, dateField, iso, likeTerm, page, paginationFields, revalidate, searchField } from "../util";

// Outer-row reference for correlated subqueries (explicitly qualified).
const OUTER_AFF_ID = sql.raw(`"affiliate_profiles"."id"`);

const profileStatus = z.enum(["pending", "approved", "rejected"]);
const commissionStatus = z.enum(["pending", "approved", "paid", "cancelled"]);

const affiliatesList = defineTool({
  name: "affiliates_list",
  title: "List affiliates / applications",
  description:
    "Affiliate profiles (applications) with handle, channels, click count, completed referred orders and commission totals by status (USD cents). Filter status='pending' for the review queue.",
  kind: "read",
  input: z.strictObject({
    status: profileStatus.optional(),
    query: searchField.optional().describe("Match on email, name or affiliate handle."),
    ...paginationFields,
  }),
  async handler(a) {
    const where: SQL[] = [];
    if (a.status) where.push(eq(affiliateProfiles.status, a.status));
    if (a.query) {
      const t = likeTerm(a.query);
      where.push(or(ilike(users.email, t), ilike(users.name, t), ilike(users.affiliateSlug, t))!);
    }
    const cond = where.length ? and(...where) : undefined;
    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          id: affiliateProfiles.id,
          status: affiliateProfiles.status,
          channels: affiliateProfiles.channels,
          createdAt: affiliateProfiles.createdAt,
          email: users.email,
          name: users.name,
          handle: users.affiliateSlug,
          clicks: sql<number>`(select count(*) from affiliate_referrals r where r.affiliate_id = ${OUTER_AFF_ID})`.mapWith(Number),
          conversions: sql<number>`(select count(*) from orders o where o.referred_by_id = ${OUTER_AFF_ID} and o.status = 'completed')`.mapWith(Number),
          pending: sql<number>`(select coalesce(sum(c.amount), 0) from affiliate_commissions c where c.affiliate_id = ${OUTER_AFF_ID} and c.status in ('pending', 'approved'))`.mapWith(Number),
          paid: sql<number>`(select coalesce(sum(c.amount), 0) from affiliate_commissions c where c.affiliate_id = ${OUTER_AFF_ID} and c.status = 'paid')`.mapWith(Number),
        })
        .from(affiliateProfiles)
        .innerJoin(users, eq(affiliateProfiles.id, users.id))
        .where(cond)
        .orderBy(a.status === "pending" ? asc(affiliateProfiles.createdAt) : desc(affiliateProfiles.createdAt), desc(affiliateProfiles.id))
        .limit(a.limit)
        .offset(a.offset),
      db
        .select({ total: sql<number>`count(*)`.mapWith(Number) })
        .from(affiliateProfiles)
        .innerJoin(users, eq(affiliateProfiles.id, users.id))
        .where(cond),
    ]);
    const items = rows.map(({ pending, paid, createdAt, ...r }) => ({
      ...r,
      unpaidCommission: catalogMoney(pending),
      paidCommission: catalogMoney(paid),
      createdAt: iso(createdAt),
    }));
    return { summary: `${items.length} of ${total} affiliates.`, data: page(items, total, a.limit, a.offset) };
  },
});

const affiliatesSetStatus = defineTool({
  name: "affiliates_set_status",
  title: "Approve / reject affiliate",
  description: "Set an affiliate profile's status (approved, rejected or back to pending). Only approved affiliates earn referral commission.",
  kind: "write",
  idempotent: true,
  input: z.strictObject({ userId: z.string().trim().min(1).max(200), status: profileStatus }),
  async handler({ userId, status }) {
    const updated = await db
      .update(affiliateProfiles)
      .set({ status, updatedAt: new Date() })
      .where(eq(affiliateProfiles.id, userId))
      .returning({ id: affiliateProfiles.id });
    if (updated.length === 0) throw new ToolError(`No affiliate profile for user ${userId}.`);
    revalidate("/admin/affiliates");
    return { summary: `Affiliate ${userId} is now ${status}.`, data: { userId, status } };
  },
});

const commissionsList = defineTool({
  name: "affiliate_commissions_list",
  title: "List affiliate commissions",
  description: "Affiliate commissions with order, product and affiliate info, plus totals by status for the filter. Amounts are USD cents.",
  kind: "read",
  input: z.strictObject({
    status: commissionStatus.optional(),
    affiliateId: z.string().trim().min(1).max(200).optional(),
    orderId: z.string().trim().min(1).max(200).optional(),
    from: dateField("Created at or after.").optional(),
    to: dateField("Created before.").optional(),
    ...paginationFields,
  }),
  async handler(a) {
    const base: SQL[] = [];
    if (a.affiliateId) base.push(eq(affiliateCommissions.affiliateId, a.affiliateId));
    if (a.orderId) base.push(eq(affiliateCommissions.orderId, a.orderId));
    if (a.from) base.push(gte(affiliateCommissions.createdAt, a.from));
    if (a.to) base.push(lt(affiliateCommissions.createdAt, a.to));
    const withStatus = a.status ? [...base, eq(affiliateCommissions.status, a.status)] : base;
    const cond = withStatus.length ? and(...withStatus) : undefined;
    const [rows, [{ total }], byStatus] = await Promise.all([
      db
        .select({
          id: affiliateCommissions.id,
          status: affiliateCommissions.status,
          amount: affiliateCommissions.amount,
          percent: affiliateCommissions.percent,
          orderId: affiliateCommissions.orderId,
          productId: affiliateCommissions.productId,
          productTitle: products.title,
          affiliateId: affiliateCommissions.affiliateId,
          affiliateEmail: users.email,
          createdAt: affiliateCommissions.createdAt,
          updatedAt: affiliateCommissions.updatedAt,
        })
        .from(affiliateCommissions)
        .leftJoin(users, eq(affiliateCommissions.affiliateId, users.id))
        .leftJoin(products, eq(affiliateCommissions.productId, products.id))
        .where(cond)
        .orderBy(desc(affiliateCommissions.createdAt), desc(affiliateCommissions.id))
        .limit(a.limit)
        .offset(a.offset),
      db.select({ total: sql<number>`count(*)`.mapWith(Number) }).from(affiliateCommissions).where(cond),
      db
        .select({
          status: affiliateCommissions.status,
          n: sql<number>`count(*)`.mapWith(Number),
          sum: sql<number>`coalesce(sum(${affiliateCommissions.amount}), 0)`.mapWith(Number),
        })
        .from(affiliateCommissions)
        .where(base.length ? and(...base) : undefined)
        .groupBy(affiliateCommissions.status),
    ]);
    const items = rows.map((r) => ({ ...r, amount: catalogMoney(r.amount), createdAt: iso(r.createdAt), updatedAt: iso(r.updatedAt) }));
    const totals = Object.fromEntries(byStatus.map((s) => [s.status, { count: s.n, amount: catalogMoney(s.sum) }]));
    return { summary: `${items.length} of ${total} commissions.`, data: { ...page(items, total, a.limit, a.offset), totalsByStatus: totals } };
  },
});

const markPaid = defineTool({
  name: "affiliate_commissions_mark_paid",
  title: "Mark commission paid",
  description:
    "Mark one commission paid after you have transferred the money, and log the settlement in the payout ledger. Atomic: one statement flips status (only from pending/approved) and inserts the payout, so double calls cannot double-log.",
  kind: "destructive",
  input: z.strictObject({ commissionId: z.string().trim().min(1).max(200), confirm: confirmField }),
  async handler({ commissionId }) {
    const payoutId = crypto.randomUUID();
    const res = (await db.execute(sql`
      with upd as (
        update affiliate_commissions
        set status = 'paid', updated_at = now()
        where id = ${commissionId} and status not in ('paid', 'cancelled')
        returning affiliate_id, amount, order_id
      )
      insert into payouts (id, user_id, amount, status, payout_method, payout_details, created_at)
      select ${payoutId}, affiliate_id, amount, 'processed', 'manual',
             'Manual admin settlement for affiliate commission. Order: ' || order_id, now()
      from upd
      returning user_id, amount
    `)) as unknown as { rows?: Array<{ user_id: string; amount: number | string }> };
    const row = res.rows?.[0];
    if (!row) {
      const [existing] = await db
        .select({ status: affiliateCommissions.status })
        .from(affiliateCommissions)
        .where(eq(affiliateCommissions.id, commissionId))
        .limit(1);
      throw new ToolError(existing ? `Commission is ${existing.status}; nothing changed.` : `Commission not found: ${commissionId}`);
    }
    revalidate("/admin/affiliates", "/admin/payouts");
    const amount = catalogMoney(row.amount);
    return {
      summary: `Commission ${commissionId} marked paid (${amount.formatted}) and payout ${payoutId} logged.`,
      data: { commissionId, payoutId, affiliateId: row.user_id, amount },
    };
  },
});

export const affiliateTools = [affiliatesList, affiliatesSetStatus, commissionsList, markPaid];
