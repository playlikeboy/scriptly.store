import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { affiliateCommissions, affiliateProfiles, orders, paymentLinks, products, reviews, users } from "@/db/schema";
import { defineTool } from "../registry";
import { catalogMoney, paiseMoney } from "../util";

/** Store-wide counters, each a single aggregate query. */
export async function loadOverview() {
  const [[p], [o], [u], [aff], [pl], [rv]] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)`.mapWith(Number),
        published: sql<number>`count(*) filter (where ${products.published})`.mapWith(Number),
        featured: sql<number>`count(*) filter (where ${products.featured})`.mapWith(Number),
        pending: sql<number>`count(*) filter (where ${products.status} = 'pending')`.mapWith(Number),
        rejected: sql<number>`count(*) filter (where ${products.status} = 'rejected')`.mapWith(Number),
      })
      .from(products),
    db
      .select({
        total: sql<number>`count(*)`.mapWith(Number),
        completed: sql<number>`count(*) filter (where ${orders.status} = 'completed')`.mapWith(Number),
        pending: sql<number>`count(*) filter (where ${orders.status} = 'pending')`.mapWith(Number),
        failed: sql<number>`count(*) filter (where ${orders.status} = 'failed')`.mapWith(Number),
        revenue: sql<number>`coalesce(sum(${orders.amount}) filter (where ${orders.status} = 'completed'), 0)`.mapWith(Number),
        revenue30d: sql<number>`coalesce(sum(${orders.amount}) filter (where ${orders.status} = 'completed' and ${orders.createdAt} >= now() - interval '30 days'), 0)`.mapWith(Number),
        completed30d: sql<number>`count(*) filter (where ${orders.status} = 'completed' and ${orders.createdAt} >= now() - interval '30 days')`.mapWith(Number),
      })
      .from(orders),
    db
      .select({
        total: sql<number>`count(*)`.mapWith(Number),
        new30d: sql<number>`count(*) filter (where ${users.createdAt} >= now() - interval '30 days')`.mapWith(Number),
        stores: sql<number>`count(*) filter (where coalesce(${users.storeName}, '') <> '')`.mapWith(Number),
      })
      .from(users),
    db
      .select({
        pendingApplications: sql<number>`(select count(*) from ${affiliateProfiles} where status = 'pending')`.mapWith(Number),
        unpaidCommissions: sql<number>`coalesce(sum(${affiliateCommissions.amount}) filter (where ${affiliateCommissions.status} in ('pending', 'approved')), 0)`.mapWith(Number),
      })
      .from(affiliateCommissions),
    db
      .select({
        total: sql<number>`count(*)`.mapWith(Number),
        active: sql<number>`count(*) filter (where ${paymentLinks.active})`.mapWith(Number),
        earned: sql<number>`coalesce(sum(${paymentLinks.totalEarned}), 0)`.mapWith(Number),
      })
      .from(paymentLinks),
    db.select({ total: sql<number>`count(*)`.mapWith(Number) }).from(reviews),
  ]);
  return {
    products: { total: p.total, published: p.published, featured: p.featured, pendingApproval: p.pending, rejected: p.rejected },
    orders: {
      total: o.total,
      completed: o.completed,
      pending: o.pending,
      failed: o.failed,
      completedLast30Days: o.completed30d,
      revenue: catalogMoney(o.revenue),
      revenueLast30Days: catalogMoney(o.revenue30d),
    },
    users: { total: u.total, newLast30Days: u.new30d, creatorStores: u.stores },
    affiliates: { pendingApplications: aff.pendingApplications, unpaidCommissions: catalogMoney(aff.unpaidCommissions) },
    paymentLinks: { total: pl.total, active: pl.active, totalEarned: paiseMoney(pl.earned) },
    reviews: { total: rv.total },
    generatedAt: new Date().toISOString(),
  };
}

const siteOverview = defineTool({
  name: "site_overview",
  title: "Store overview",
  description:
    "Headline numbers: products (published, pending approval), orders by status, catalog revenue (USD cents) all-time and last 30 days, users, affiliate queue, payment-link earnings (INR paise).",
  kind: "read",
  input: z.strictObject({}),
  async handler() {
    const data = await loadOverview();
    return {
      summary: `${data.products.published}/${data.products.total} products published, ${data.products.pendingApproval} pending approval; ${data.orders.completed} completed orders, revenue ${data.orders.revenue.formatted}; ${data.users.total} users.`,
      data,
    };
  },
});

export const siteTools = [siteOverview];
