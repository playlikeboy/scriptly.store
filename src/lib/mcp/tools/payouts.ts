import { z } from "zod";
import { and, desc, eq, gte, ilike, isNotNull, lt, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { orders, payouts, products, users } from "@/db/schema";
import { COMMISSION_RATES } from "@/config/pricing";
import { defineTool } from "../registry";
import {
  INT4_MAX,
  ToolError,
  catalogMoney,
  confirmField,
  dateField,
  iso,
  likeTerm,
  num,
  page,
  paginationFields,
  revalidate,
  searchField,
} from "../util";

const SHARE = COMMISSION_RATES.directCreatorShare; // 0.95
// Inlined as a numeric literal: a bound param would be inferred as bigint next to sum(int).
const SHARE_SQL = sql.raw(`${Number(SHARE)}::numeric`);

/**
 * Same aggregation as /admin/payouts: gross = completed orders of the
 * creator's products; net = round(gross * 0.95); paid = every payouts row for
 * the user (this includes affiliate-commission settlements); unpaid = net - paid.
 */
function balanceQuery() {
  const productAgg = db
    .select({ creatorId: products.creatorId, productsCount: sql<number>`count(*)`.as("products_count") })
    .from(products)
    .where(isNotNull(products.creatorId))
    .groupBy(products.creatorId)
    .as("pa");
  const salesAgg = db
    .select({ creatorId: products.creatorId, gross: sql<number>`sum(${orders.amount})`.as("gross") })
    .from(orders)
    .innerJoin(products, eq(orders.productId, products.id))
    .where(and(eq(orders.status, "completed"), isNotNull(products.creatorId)))
    .groupBy(products.creatorId)
    .as("sa");
  const paidAgg = db
    .select({ userId: payouts.userId, paid: sql<number>`sum(${payouts.amount})`.as("paid") })
    .from(payouts)
    .groupBy(payouts.userId)
    .as("pd");
  const gross = sql`coalesce(${salesAgg.gross}, 0)`;
  const net = sql`round(coalesce(${salesAgg.gross}, 0) * ${SHARE_SQL})`;
  const paid = sql`coalesce(${paidAgg.paid}, 0)`;
  const unpaid = sql`(${net} - ${paid})`;
  const isCreator = sql`(coalesce(${users.storeName}, '') <> '' or coalesce(${productAgg.productsCount}, 0) > 0)`;
  return { productAgg, salesAgg, paidAgg, gross, net, paid, unpaid, isCreator };
}

const creatorBalances = defineTool({
  name: "payouts_creator_balances",
  title: "Creator balances",
  description:
    "Per-creator gross sales, 95% creator share, total paid out and unpaid balance (all integer USD cents, computed in SQL), plus grand totals. 'paid' counts every payout row for the user, including affiliate settlements.",
  kind: "read",
  input: z.strictObject({
    query: searchField.optional().describe("Match on email, name or store name."),
    balance: z.enum(["all", "outstanding", "settled"]).default("all"),
    sort: z.enum(["unpaid_desc", "gross_desc", "newest"]).default("unpaid_desc"),
    ...paginationFields,
  }),
  async handler(a) {
    const q = balanceQuery();
    const where: SQL[] = [q.isCreator];
    if (a.query) {
      const t = likeTerm(a.query);
      where.push(or(ilike(users.email, t), ilike(users.name, t), ilike(users.storeName, t))!);
    }
    if (a.balance === "outstanding") where.push(sql`${q.unpaid} > 0`);
    if (a.balance === "settled") where.push(sql`${q.unpaid} <= 0`);
    const cond = and(...where);
    const order =
      a.sort === "unpaid_desc"
        ? [sql`${q.unpaid} desc`, desc(users.id)]
        : a.sort === "gross_desc"
          ? [sql`${q.gross} desc`, desc(users.id)]
          : [desc(users.createdAt), desc(users.id)];

    const [rows, [count], [totals]] = await Promise.all([
      db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          storeName: users.storeName,
          payoutMethod: users.payoutMethod,
          paypalEmail: users.paypalEmail,
          productsCount: sql<number>`coalesce(${q.productAgg.productsCount}, 0)`.mapWith(Number),
          gross: sql<number>`${q.gross}::bigint`.mapWith(Number),
          net: sql<number>`${q.net}::bigint`.mapWith(Number),
          paid: sql<number>`${q.paid}::bigint`.mapWith(Number),
          unpaid: sql<number>`${q.unpaid}::bigint`.mapWith(Number),
        })
        .from(users)
        .leftJoin(q.productAgg, eq(q.productAgg.creatorId, users.id))
        .leftJoin(q.salesAgg, eq(q.salesAgg.creatorId, users.id))
        .leftJoin(q.paidAgg, eq(q.paidAgg.userId, users.id))
        .where(cond)
        .orderBy(...order)
        .limit(a.limit)
        .offset(a.offset),
      db
        .select({ total: sql<number>`count(*)`.mapWith(Number) })
        .from(users)
        .leftJoin(q.productAgg, eq(q.productAgg.creatorId, users.id))
        .leftJoin(q.salesAgg, eq(q.salesAgg.creatorId, users.id))
        .leftJoin(q.paidAgg, eq(q.paidAgg.userId, users.id))
        .where(cond),
      db
        .select({
          gross: sql<number>`coalesce(sum(${q.gross}), 0)::bigint`.mapWith(Number),
          net: sql<number>`coalesce(sum(${q.net}), 0)::bigint`.mapWith(Number),
          paid: sql<number>`coalesce(sum(${q.paid}), 0)::bigint`.mapWith(Number),
          unpaid: sql<number>`coalesce(sum(${q.unpaid}), 0)::bigint`.mapWith(Number),
        })
        .from(users)
        .leftJoin(q.productAgg, eq(q.productAgg.creatorId, users.id))
        .leftJoin(q.salesAgg, eq(q.salesAgg.creatorId, users.id))
        .leftJoin(q.paidAgg, eq(q.paidAgg.userId, users.id))
        .where(cond),
    ]);
    const items = rows.map((r) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      storeName: r.storeName,
      payoutMethod: r.payoutMethod,
      paypalEmail: r.paypalEmail,
      productsCount: r.productsCount,
      grossSales: catalogMoney(r.gross),
      creatorShare: catalogMoney(r.net),
      paid: catalogMoney(r.paid),
      unpaid: catalogMoney(r.unpaid),
    }));
    const data = {
      ...page(items, count.total, a.limit, a.offset),
      totals: {
        grossSales: catalogMoney(totals.gross),
        platformFee: catalogMoney(totals.gross - totals.net),
        creatorShare: catalogMoney(totals.net),
        paid: catalogMoney(totals.paid),
        unpaid: catalogMoney(totals.unpaid),
      },
      creatorSharePercent: SHARE * 100,
    };
    return { summary: `${count.total} creators; unpaid total ${data.totals.unpaid.formatted}.`, data };
  },
});

const payoutsList = defineTool({
  name: "payouts_list",
  title: "Payout ledger",
  description: "Recorded payouts (creator settlements and affiliate commission settlements), newest first. Amounts are USD cents.",
  kind: "read",
  input: z.strictObject({
    userId: z.string().trim().min(1).max(200).optional(),
    query: searchField.optional().describe("Match on user email, store name or payout method."),
    from: dateField("Created at or after.").optional(),
    to: dateField("Created before.").optional(),
    ...paginationFields,
  }),
  async handler(a) {
    const where: SQL[] = [];
    if (a.userId) where.push(eq(payouts.userId, a.userId));
    if (a.query) {
      const t = likeTerm(a.query);
      where.push(or(ilike(users.email, t), ilike(users.storeName, t), ilike(payouts.payoutMethod, t))!);
    }
    if (a.from) where.push(gte(payouts.createdAt, a.from));
    if (a.to) where.push(lt(payouts.createdAt, a.to));
    const cond = where.length ? and(...where) : undefined;
    const [rows, [agg]] = await Promise.all([
      db
        .select({
          id: payouts.id,
          userId: payouts.userId,
          userEmail: users.email,
          storeName: users.storeName,
          amount: payouts.amount,
          status: payouts.status,
          payoutMethod: payouts.payoutMethod,
          payoutDetails: payouts.payoutDetails,
          createdAt: payouts.createdAt,
        })
        .from(payouts)
        .leftJoin(users, eq(payouts.userId, users.id))
        .where(cond)
        .orderBy(desc(payouts.createdAt), desc(payouts.id))
        .limit(a.limit)
        .offset(a.offset),
      db
        .select({ total: sql<number>`count(*)`.mapWith(Number), sum: sql<number>`coalesce(sum(${payouts.amount}), 0)`.mapWith(Number) })
        .from(payouts)
        .leftJoin(users, eq(payouts.userId, users.id))
        .where(cond),
    ]);
    const items = rows.map((r) => ({ ...r, amount: catalogMoney(r.amount), createdAt: iso(r.createdAt) }));
    return {
      summary: `${items.length} of ${agg.total} payouts; matching total ${catalogMoney(agg.sum).formatted}.`,
      data: { ...page(items, agg.total, a.limit, a.offset), matchingAmountTotal: catalogMoney(agg.sum) },
    };
  },
});

async function creatorBalance(userId: string) {
  const res = (await db.execute(sql`
    select
      round(coalesce((select sum(o.amount) from orders o join products p on p.id = o.product_id
                      where p.creator_id = u.id and o.status = 'completed'), 0) * ${SHARE_SQL})::bigint as net,
      coalesce((select sum(po.amount) from payouts po where po.user_id = u.id), 0)::bigint as paid
    from users u where u.id = ${userId}
  `)) as unknown as { rows?: Array<{ net: string | number; paid: string | number }> };
  const row = res.rows?.[0];
  if (!row) return null;
  const net = num(row.net);
  const paid = num(row.paid);
  return { net, paid, unpaid: net - paid };
}

const recordPayout = defineTool({
  name: "payouts_record",
  title: "Record creator payout",
  description:
    "Log a settlement you have ALREADY transferred to a creator (this does not move money). amount is integer USD cents and must not exceed the creator's unpaid balance; the check and insert run in one SQL statement.",
  kind: "destructive",
  input: z.strictObject({
    userId: z.string().trim().min(1).max(200),
    amount: z.number().int().min(1).max(INT4_MAX).describe("Integer USD cents (> 0)."),
    payoutMethod: z.string().trim().min(1).max(64).optional().describe("Defaults to the creator's saved method."),
    paypalEmail: z.email().max(254).optional(),
    payoutDetails: z.string().trim().min(1).max(2000).optional().describe("Reference / transaction id / notes."),
    confirm: confirmField,
  }),
  async handler(a) {
    const id = crypto.randomUUID();
    const res = (await db.execute(sql`
      insert into payouts (id, user_id, amount, status, payout_method, paypal_email, payout_details, created_at)
      select ${id}, u.id, ${a.amount}, 'processed',
             coalesce(${a.payoutMethod ?? null}::text, u.payout_method),
             coalesce(${a.paypalEmail ?? null}::text, u.paypal_email),
             coalesce(${a.payoutDetails ?? null}::text, u.payout_details),
             now()
      from users u
      where u.id = ${a.userId}
        and (round(coalesce((select sum(o.amount) from orders o join products p on p.id = o.product_id
                             where p.creator_id = u.id and o.status = 'completed'), 0) * ${SHARE_SQL})
             - coalesce((select sum(po.amount) from payouts po where po.user_id = u.id), 0)) >= ${a.amount}
      returning id
    `)) as unknown as { rows?: Array<{ id: string }> };

    if (!res.rows?.length) {
      const bal = await creatorBalance(a.userId);
      if (!bal) throw new ToolError(`User not found: ${a.userId}`);
      throw new ToolError(
        `Amount ${catalogMoney(a.amount).formatted} exceeds unpaid balance ${catalogMoney(bal.unpaid).formatted}; nothing recorded.`
      );
    }
    const bal = await creatorBalance(a.userId);
    revalidate("/admin/payouts");
    return {
      summary: `Recorded payout ${id} of ${catalogMoney(a.amount).formatted} to ${a.userId}; remaining unpaid ${catalogMoney(bal?.unpaid ?? 0).formatted}.`,
      data: {
        id,
        userId: a.userId,
        amount: catalogMoney(a.amount),
        balanceAfter: bal ? { creatorShare: catalogMoney(bal.net), paid: catalogMoney(bal.paid), unpaid: catalogMoney(bal.unpaid) } : null,
      },
    };
  },
});

export const payoutTools = [creatorBalances, payoutsList, recordPayout];
