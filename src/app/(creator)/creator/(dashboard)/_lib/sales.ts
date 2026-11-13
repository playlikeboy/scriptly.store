import { db } from "@/db";
import { orders, products } from "@/db/schema";
import { and, desc, eq, gte, sql } from "drizzle-orm";

/**
 * Creator's share of one completed order, in paise. Mirrors the split used at
 * checkout (src/lib/actions/orders.ts): 95% on direct sales, 95% minus the
 * product's affiliate commission on referred sales.
 */
const creatorShareSql = sql`round(${orders.amount} * case when ${orders.referredById} is not null then greatest(0.95 - coalesce(${products.affiliateCommissionPercent}, 30) / 100.0, 0) else 0.95 end)`;

const ownedCompletedSales = (creatorId: string) =>
  and(eq(products.creatorId, creatorId), eq(orders.status, "completed"));

export async function getCreatorSalesSummary(creatorId: string) {
  const [row] = await db
    .select({
      count: sql<number>`count(*)`.mapWith(Number),
      gross: sql<number>`coalesce(sum(${orders.amount}), 0)`.mapWith(Number),
      net: sql<number>`coalesce(sum(${creatorShareSql}), 0)`.mapWith(Number),
    })
    .from(orders)
    .innerJoin(products, eq(orders.productId, products.id))
    .where(ownedCompletedSales(creatorId));

  return row ?? { count: 0, gross: 0, net: 0 };
}

export type DailySalesPoint = { day: string; net: number; count: number };

const IST_DAY = (col: typeof orders.createdAt) =>
  sql<string>`to_char((${col} at time zone 'UTC') at time zone 'Asia/Kolkata', 'YYYY-MM-DD')`;

function istDayKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Last `days` calendar days (IST), zero-filled, oldest first. */
export async function getCreatorDailySales(creatorId: string, days = 30): Promise<DailySalesPoint[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const dayExpr = IST_DAY(orders.createdAt);

  const rows = await db
    .select({
      day: dayExpr,
      net: sql<number>`coalesce(sum(${creatorShareSql}), 0)`.mapWith(Number),
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(orders)
    .innerJoin(products, eq(orders.productId, products.id))
    .where(and(ownedCompletedSales(creatorId), gte(orders.createdAt, since)))
    .groupBy(dayExpr);

  const byDay = new Map(rows.map((r) => [r.day, r]));
  const series: DailySalesPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = istDayKey(new Date(Date.now() - i * 24 * 60 * 60 * 1000));
    const hit = byDay.get(key);
    series.push({ day: key, net: hit?.net ?? 0, count: hit?.count ?? 0 });
  }
  return series;
}

export async function getCreatorSales(creatorId: string, { limit, offset = 0 }: { limit: number; offset?: number }) {
  return db
    .select({
      orderId: orders.id,
      amount: orders.amount,
      date: orders.createdAt,
      productTitle: products.title,
      productSlug: products.slug,
      referred: sql<boolean>`${orders.referredById} is not null`,
      creatorShare: sql<number>`${creatorShareSql}`.mapWith(Number),
    })
    .from(orders)
    .innerJoin(products, eq(orders.productId, products.id))
    .where(ownedCompletedSales(creatorId))
    .orderBy(desc(orders.createdAt))
    .limit(limit)
    .offset(offset);
}
