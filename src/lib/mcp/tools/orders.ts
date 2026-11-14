import { z } from "zod";
import { and, asc, desc, eq, gte, ilike, lt, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { affiliateCommissions, downloads, orders, products, users } from "@/db/schema";
import { defineTool } from "../registry";
import { ToolError, catalogMoney, dateField, iso, likeTerm, num, page, paginationFields, searchField } from "../util";

const orderStatus = z.enum(["pending", "completed", "failed"]);
const DAY_MS = 86_400_000;

const SORTS = {
  newest: [desc(orders.createdAt), desc(orders.id)],
  oldest: [asc(orders.createdAt), asc(orders.id)],
  amount_desc: [desc(orders.amount), desc(orders.id)],
  amount_asc: [asc(orders.amount), asc(orders.id)],
} as const;

const ordersList = defineTool({
  name: "orders_list",
  title: "List orders",
  description:
    "Search orders with filters (status, buyer, product, Razorpay ids, coupon, affiliate, date range). Amounts are catalog money (USD cents). Read-only.",
  kind: "read",
  input: z.strictObject({
    status: orderStatus.optional(),
    userEmail: searchField.optional().describe("Buyer email (case-insensitive substring)."),
    userId: z.string().trim().min(1).max(200).optional(),
    product: z.string().trim().min(1).max(200).optional().describe("Product id or slug."),
    razorpayId: z.string().trim().min(1).max(200).optional().describe("Exact Razorpay order id or payment id."),
    couponCode: z.string().trim().min(1).max(64).optional(),
    referredById: z.string().trim().min(1).max(200).optional().describe("Affiliate user id."),
    from: dateField("Created at or after.").optional(),
    to: dateField("Created before.").optional(),
    query: searchField.optional().describe("Substring match on order id, buyer email/name or product title."),
    sort: z.enum(["newest", "oldest", "amount_desc", "amount_asc"]).default("newest"),
    ...paginationFields,
  }),
  async handler(a) {
    const where: SQL[] = [];
    if (a.status) where.push(eq(orders.status, a.status));
    if (a.userEmail) where.push(ilike(users.email, likeTerm(a.userEmail)));
    if (a.userId) where.push(eq(orders.userId, a.userId));
    if (a.product) where.push(or(eq(products.id, a.product), eq(products.slug, a.product))!);
    if (a.razorpayId) where.push(or(eq(orders.razorpayOrderId, a.razorpayId), eq(orders.razorpayPaymentId, a.razorpayId))!);
    if (a.couponCode) where.push(sql`upper(${orders.couponCode}) = ${a.couponCode.toUpperCase()}`);
    if (a.referredById) where.push(eq(orders.referredById, a.referredById));
    if (a.from) where.push(gte(orders.createdAt, a.from));
    if (a.to) where.push(lt(orders.createdAt, a.to));
    if (a.query) {
      const t = likeTerm(a.query);
      where.push(or(ilike(orders.id, t), ilike(users.email, t), ilike(users.name, t), ilike(products.title, t))!);
    }
    const cond = where.length ? and(...where) : undefined;

    const [rows, [agg]] = await Promise.all([
      db
        .select({
          id: orders.id,
          status: orders.status,
          amount: orders.amount,
          discountApplied: orders.discountApplied,
          couponCode: orders.couponCode,
          razorpayOrderId: orders.razorpayOrderId,
          razorpayPaymentId: orders.razorpayPaymentId,
          referredById: orders.referredById,
          createdAt: orders.createdAt,
          userId: orders.userId,
          userEmail: users.email,
          productId: orders.productId,
          productTitle: products.title,
          productSlug: products.slug,
        })
        .from(orders)
        .leftJoin(users, eq(orders.userId, users.id))
        .leftJoin(products, eq(orders.productId, products.id))
        .where(cond)
        .orderBy(...SORTS[a.sort])
        .limit(a.limit)
        .offset(a.offset),
      db
        .select({
          total: sql<number>`count(*)`.mapWith(Number),
          amount: sql<number>`coalesce(sum(${orders.amount}), 0)`.mapWith(Number),
        })
        .from(orders)
        .leftJoin(users, eq(orders.userId, users.id))
        .leftJoin(products, eq(orders.productId, products.id))
        .where(cond),
    ]);
    const items = rows.map((r) => ({
      ...r,
      amount: catalogMoney(r.amount),
      discountApplied: catalogMoney(r.discountApplied),
      createdAt: iso(r.createdAt),
    }));
    return {
      summary: `${items.length} of ${agg.total} matching orders; matching amount total ${catalogMoney(agg.amount).formatted}.`,
      data: { ...page(items, agg.total, a.limit, a.offset), matchingAmountTotal: catalogMoney(agg.amount) },
    };
  },
});

const ordersGet = defineTool({
  name: "orders_get",
  title: "Get order",
  description: "One order by id, Razorpay order id or Razorpay payment id, with buyer, product, downloads and affiliate commission.",
  kind: "read",
  input: z.strictObject({ id: z.string().trim().min(1).max(200).describe("Order id or Razorpay order/payment id.") }),
  async handler({ id }) {
    const [o] = await db
      .select()
      .from(orders)
      .where(or(eq(orders.id, id), eq(orders.razorpayOrderId, id), eq(orders.razorpayPaymentId, id)))
      .orderBy(desc(orders.createdAt))
      .limit(1);
    if (!o) throw new ToolError(`Order not found: ${id}`);
    const [buyer, product, [dl], commissions] = await Promise.all([
      db.select({ id: users.id, email: users.email, name: users.name }).from(users).where(eq(users.id, o.userId)).limit(1),
      db
        .select({ id: products.id, title: products.title, slug: products.slug, creatorId: products.creatorId })
        .from(products)
        .where(eq(products.id, o.productId))
        .limit(1),
      db
        .select({ n: sql<number>`count(*)`.mapWith(Number), last: sql<Date | null>`max(${downloads.downloadedAt})` })
        .from(downloads)
        .where(eq(downloads.orderId, o.id)),
      db
        .select({
          id: affiliateCommissions.id,
          affiliateId: affiliateCommissions.affiliateId,
          amount: affiliateCommissions.amount,
          percent: affiliateCommissions.percent,
          status: affiliateCommissions.status,
        })
        .from(affiliateCommissions)
        .where(eq(affiliateCommissions.orderId, o.id)),
    ]);
    const data = {
      order: {
        ...o,
        amount: catalogMoney(o.amount),
        discountApplied: catalogMoney(o.discountApplied),
        createdAt: iso(o.createdAt),
      },
      buyer: buyer[0] ?? null,
      product: product[0] ?? null,
      downloads: { count: dl.n, lastAt: iso(dl.last) },
      affiliateCommissions: commissions.map((c) => ({ ...c, amount: catalogMoney(c.amount) })),
    };
    return { summary: `Order ${o.id}: ${o.status}, ${data.order.amount.formatted}.`, data };
  },
});

const salesSummary = defineTool({
  name: "orders_sales_summary",
  title: "Sales summary",
  description:
    "Revenue and order counts per UTC day for a date range (default: last 30 days, max 366), totals, and top products by revenue. Revenue is catalog money (USD cents).",
  kind: "read",
  input: z.strictObject({
    from: dateField("Range start (inclusive).").optional(),
    to: dateField("Range end (exclusive). Default: now.").optional(),
    status: orderStatus.default("completed"),
    topProducts: z.number().int().min(1).max(50).default(10),
  }),
  async handler(a) {
    const to = a.to ?? new Date();
    const from = a.from ?? new Date(to.getTime() - 30 * DAY_MS);
    if (from >= to) throw new ToolError("from must be before to.");
    if (to.getTime() - from.getTime() > 366 * DAY_MS) throw new ToolError("Range is limited to 366 days.");
    const cond = and(eq(orders.status, a.status), gte(orders.createdAt, from), lt(orders.createdAt, to));
    const day = sql<string>`to_char(date_trunc('day', ${orders.createdAt}), 'YYYY-MM-DD')`;

    const [daily, [totals], top] = await Promise.all([
      db
        .select({
          day,
          orders: sql<number>`count(*)`.mapWith(Number),
          revenue: sql<number>`coalesce(sum(${orders.amount}), 0)`.mapWith(Number),
        })
        .from(orders)
        .where(cond)
        .groupBy(day)
        .orderBy(day),
      db
        .select({
          orders: sql<number>`count(*)`.mapWith(Number),
          revenue: sql<number>`coalesce(sum(${orders.amount}), 0)`.mapWith(Number),
          discounts: sql<number>`coalesce(sum(${orders.discountApplied}), 0)`.mapWith(Number),
          buyers: sql<number>`count(distinct ${orders.userId})`.mapWith(Number),
          referred: sql<number>`count(*) filter (where ${orders.referredById} is not null)`.mapWith(Number),
        })
        .from(orders)
        .where(cond),
      db
        .select({
          productId: orders.productId,
          title: products.title,
          slug: products.slug,
          orders: sql<number>`count(*)`.mapWith(Number),
          revenue: sql<number>`coalesce(sum(${orders.amount}), 0)`.mapWith(Number),
        })
        .from(orders)
        .leftJoin(products, eq(orders.productId, products.id))
        .where(cond)
        .groupBy(orders.productId, products.title, products.slug)
        .orderBy(sql`coalesce(sum(${orders.amount}), 0) desc`, desc(sql`count(*)`))
        .limit(a.topProducts),
    ]);
    const data = {
      range: { from: from.toISOString(), to: to.toISOString(), status: a.status },
      totals: {
        orders: totals.orders,
        revenue: catalogMoney(totals.revenue),
        discounts: catalogMoney(totals.discounts),
        averageOrderValue: catalogMoney(totals.orders ? Math.round(totals.revenue / totals.orders) : 0),
        uniqueBuyers: totals.buyers,
        affiliateReferredOrders: totals.referred,
      },
      daily: daily.map((d) => ({ day: d.day, orders: d.orders, revenue: catalogMoney(num(d.revenue)) })),
      topProducts: top.map((t) => ({ ...t, revenue: catalogMoney(t.revenue) })),
    };
    return {
      summary: `${totals.orders} ${a.status} orders, revenue ${data.totals.revenue.formatted} between ${data.range.from.slice(0, 10)} and ${data.range.to.slice(0, 10)}.`,
      data,
    };
  },
});

export const orderTools = [ordersList, ordersGet, salesSummary];
