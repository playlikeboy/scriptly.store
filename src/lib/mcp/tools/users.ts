import { z } from "zod";
import { and, desc, eq, ilike, isNotNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { affiliateProfiles, orders, payouts, products, reviews, users } from "@/db/schema";
import { defineTool } from "../registry";
import { ToolError, catalogMoney, iso, likeTerm, maskTail, num, page, paginationFields, searchField } from "../util";

// Correlated subqueries reference the outer row explicitly: drizzle renders
// columns unqualified in single-table selects, which would bind to the inner table.
const OUTER_USER_ID = sql.raw(`"users"."id"`);
const productCountSql = sql<number>`(select count(*) from ${products} p where p.creator_id = ${OUTER_USER_ID})`;
/** Users who have a store name or own at least one product. */
const isCreatorSql = sql`(coalesce(${users.storeName}, '') <> '' or exists (select 1 from ${products} p where p.creator_id = ${OUTER_USER_ID}))`;

const usersList = defineTool({
  name: "users_list",
  title: "List users",
  description:
    "Search users by email, name, store name or affiliate handle; filter by role or creator status. Role is informational only: admin access is governed by ADMIN_EMAILS and cannot be changed here.",
  kind: "read",
  input: z.strictObject({
    query: searchField.optional(),
    role: z.enum(["user", "admin"]).optional(),
    creatorsOnly: z.boolean().default(false),
    ...paginationFields,
  }),
  async handler(a) {
    const where: SQL[] = [];
    if (a.query) {
      const t = likeTerm(a.query);
      where.push(or(ilike(users.email, t), ilike(users.name, t), ilike(users.storeName, t), ilike(users.affiliateSlug, t), eq(users.id, a.query))!);
    }
    if (a.role) where.push(eq(users.role, a.role));
    if (a.creatorsOnly) where.push(isCreatorSql);
    const cond = where.length ? and(...where) : undefined;
    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          storeName: users.storeName,
          affiliateSlug: users.affiliateSlug,
          productCount: productCountSql.mapWith(Number),
          completedOrders: sql<number>`(select count(*) from ${orders} o where o.user_id = ${OUTER_USER_ID} and o.status = 'completed')`.mapWith(Number),
          createdAt: users.createdAt,
        })
        .from(users)
        .where(cond)
        .orderBy(desc(users.createdAt), desc(users.id))
        .limit(a.limit)
        .offset(a.offset),
      db.select({ total: sql<number>`count(*)`.mapWith(Number) }).from(users).where(cond),
    ]);
    const items = rows.map((r) => ({ ...r, createdAt: iso(r.createdAt) }));
    return { summary: `${items.length} of ${total} users.`, data: page(items, total, a.limit, a.offset) };
  },
});

const usersGet = defineTool({
  name: "users_get",
  title: "Get user",
  description:
    "One user by id or email with purchase totals, creator stats, payouts received and affiliate status. Bank account numbers are masked.",
  kind: "read",
  input: z.strictObject({ idOrEmail: z.string().trim().min(1).max(254) }),
  async handler({ idOrEmail }) {
    const [u] = await db
      .select()
      .from(users)
      .where(or(eq(users.id, idOrEmail), sql`lower(${users.email}) = lower(${idOrEmail})`))
      .limit(1);
    if (!u) throw new ToolError(`User not found: ${idOrEmail}`);
    const [[buy], [created], [sold], [paid], [aff], [rev]] = await Promise.all([
      db
        .select({
          completed: sql<number>`count(*) filter (where ${orders.status} = 'completed')`.mapWith(Number),
          spent: sql<number>`coalesce(sum(${orders.amount}) filter (where ${orders.status} = 'completed'), 0)`.mapWith(Number),
          all: sql<number>`count(*)`.mapWith(Number),
        })
        .from(orders)
        .where(eq(orders.userId, u.id)),
      db
        .select({
          total: sql<number>`count(*)`.mapWith(Number),
          approved: sql<number>`count(*) filter (where ${products.status} = 'approved')`.mapWith(Number),
          pending: sql<number>`count(*) filter (where ${products.status} = 'pending')`.mapWith(Number),
          rejected: sql<number>`count(*) filter (where ${products.status} = 'rejected')`.mapWith(Number),
        })
        .from(products)
        .where(eq(products.creatorId, u.id)),
      db
        .select({
          orders: sql<number>`count(*)`.mapWith(Number),
          gross: sql<number>`coalesce(sum(${orders.amount}), 0)`.mapWith(Number),
        })
        .from(orders)
        .innerJoin(products, eq(orders.productId, products.id))
        .where(and(eq(products.creatorId, u.id), eq(orders.status, "completed"))),
      db
        .select({ n: sql<number>`count(*)`.mapWith(Number), total: sql<number>`coalesce(sum(${payouts.amount}), 0)`.mapWith(Number) })
        .from(payouts)
        .where(eq(payouts.userId, u.id)),
      db.select({ status: affiliateProfiles.status }).from(affiliateProfiles).where(eq(affiliateProfiles.id, u.id)).limit(1).then((r) => (r.length ? r : [null])),
      db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(reviews).where(eq(reviews.userId, u.id)),
    ]);
    const data = {
      user: {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        storeName: u.storeName,
        affiliateSlug: u.affiliateSlug,
        payoutMethod: u.payoutMethod,
        paypalEmail: u.paypalEmail,
        payoutDetails: u.payoutDetails,
        razorpayAccountId: u.razorpayAccountId,
        bankName: u.bankName,
        bankAccountName: u.bankAccountName,
        bankAccountNumber: maskTail(u.bankAccountNumber),
        bankIfsc: u.bankIfsc,
        createdAt: iso(u.createdAt),
        updatedAt: iso(u.updatedAt),
      },
      purchases: { completedOrders: buy.completed, allOrders: buy.all, spent: catalogMoney(buy.spent) },
      creator: {
        products: created,
        completedSales: sold.orders,
        grossSales: catalogMoney(sold.gross),
        creatorShare95: catalogMoney(Math.round(sold.gross * 0.95)),
      },
      payoutsReceived: { count: paid.n, total: catalogMoney(paid.total) },
      affiliateStatus: aff?.status ?? null,
      reviewsWritten: rev.n,
    };
    return { summary: `${u.email} (${u.role}): ${buy.completed} purchases, ${created.total} products, ${data.creator.grossSales.formatted} gross sales.`, data };
  },
});

const storesList = defineTool({
  name: "stores_list",
  title: "List creator stores",
  description: "Creators (store name or at least one product) with product counts by status and completed-sales totals (USD cents), sorted by gross sales or newest.",
  kind: "read",
  input: z.strictObject({
    query: searchField.optional().describe("Match on store name, email or name."),
    sort: z.enum(["gross_desc", "newest"]).default("gross_desc"),
    ...paginationFields,
  }),
  async handler(a) {
    const productAgg = db
      .select({
        creatorId: products.creatorId,
        total: sql<number>`count(*)`.as("total"),
        approved: sql<number>`count(*) filter (where ${products.status} = 'approved')`.as("approved"),
        pending: sql<number>`count(*) filter (where ${products.status} = 'pending')`.as("pending"),
        rejected: sql<number>`count(*) filter (where ${products.status} = 'rejected')`.as("rejected"),
      })
      .from(products)
      .where(isNotNull(products.creatorId))
      .groupBy(products.creatorId)
      .as("pa");
    const salesAgg = db
      .select({
        creatorId: products.creatorId,
        orders: sql<number>`count(*)`.as("orders"),
        gross: sql<number>`sum(${orders.amount})`.as("gross"),
      })
      .from(orders)
      .innerJoin(products, eq(orders.productId, products.id))
      .where(and(eq(orders.status, "completed"), isNotNull(products.creatorId)))
      .groupBy(products.creatorId)
      .as("sa");

    const where: SQL[] = [sql`(coalesce(${users.storeName}, '') <> '' or coalesce(${productAgg.total}, 0) > 0)`];
    if (a.query) {
      const t = likeTerm(a.query);
      where.push(or(ilike(users.storeName, t), ilike(users.email, t), ilike(users.name, t))!);
    }
    const cond = and(...where);
    const grossExpr = sql`coalesce(${salesAgg.gross}, 0)`;
    const base = () =>
      db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          storeName: users.storeName,
          razorpayAccountId: users.razorpayAccountId,
          products: sql<number>`coalesce(${productAgg.total}, 0)`.mapWith(Number),
          approved: sql<number>`coalesce(${productAgg.approved}, 0)`.mapWith(Number),
          pending: sql<number>`coalesce(${productAgg.pending}, 0)`.mapWith(Number),
          rejected: sql<number>`coalesce(${productAgg.rejected}, 0)`.mapWith(Number),
          completedOrders: sql<number>`coalesce(${salesAgg.orders}, 0)`.mapWith(Number),
          gross: sql<number>`${grossExpr}::bigint`.mapWith(Number),
          createdAt: users.createdAt,
        })
        .from(users)
        .leftJoin(productAgg, eq(productAgg.creatorId, users.id))
        .leftJoin(salesAgg, eq(salesAgg.creatorId, users.id));

    const [rows, [{ total }]] = await Promise.all([
      base()
        .where(cond)
        .orderBy(...(a.sort === "gross_desc" ? [sql`${grossExpr} desc`, desc(users.createdAt)] : [desc(users.createdAt), desc(users.id)]))
        .limit(a.limit)
        .offset(a.offset),
      db
        .select({ total: sql<number>`count(*)`.mapWith(Number) })
        .from(users)
        .leftJoin(productAgg, eq(productAgg.creatorId, users.id))
        .where(cond),
    ]);
    const items = rows.map((r) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      storeName: r.storeName,
      routeAccountLinked: !!r.razorpayAccountId,
      products: { total: r.products, approved: r.approved, pending: r.pending, rejected: r.rejected },
      completedOrders: r.completedOrders,
      grossSales: catalogMoney(num(r.gross)),
      creatorShare95: catalogMoney(Math.round(num(r.gross) * 0.95)),
      createdAt: iso(r.createdAt),
    }));
    return { summary: `${items.length} of ${total} creator stores.`, data: page(items, total, a.limit, a.offset) };
  },
});

export const userTools = [usersList, usersGet, storesList];
