export const dynamic = "force-dynamic";

import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { and, count, desc, eq, gte, ilike, ne, sql } from "drizzle-orm";
import { Search } from "lucide-react";
import { db } from "@/db";
import { affiliateCommissions, affiliateProfiles, affiliateReferrals, orders, products } from "@/db/schema";
import { getOrCreateDbUser } from "@/lib/auth-utils";
import { formatMoney, formatPrice } from "@/lib/price-utils";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  PageHeader,
  Panel,
  StatStrip,
  StatusPill,
  fieldClass,
  formatDate,
  tableCellClass,
  tableHeadClass,
} from "@/components/creator/console-ui";
import { cn } from "@/lib/utils";
import AffiliateDashboardClient, { type AffiliateDailyPoint } from "./AffiliateDashboardClient";
import CopyLinkButton from "./CopyLinkButton";

export const metadata: Metadata = {
  title: "Affiliate Dashboard | ScriptlyStore",
  description: "Track your referral clicks, sales, commission payouts, and generate affiliate links.",
};

const SITE = "https://scriptly.store";
const DAYS = 14;
const PRODUCT_LIMIT = 50;

const istDay = (col: typeof orders.createdAt | typeof affiliateReferrals.createdAt) =>
  sql<string>`to_char((${col} at time zone 'UTC') at time zone 'Asia/Kolkata', 'YYYY-MM-DD')`;

function istDayKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export default async function AffiliateDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getOrCreateDbUser();
  if (!user) {
    redirect("/handler/sign-in?redirectTo=/affiliate/dashboard");
  }

  const profile = await db.query.affiliateProfiles.findFirst({
    columns: { status: true },
    where: eq(affiliateProfiles.id, user.id),
  });
  if (!profile || profile.status !== "approved") {
    redirect("/affiliate");
  }

  const { q: rawQ } = await searchParams;
  const q = (rawQ ?? "").trim().slice(0, 100);
  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);
  const clickDay = istDay(affiliateReferrals.createdAt);
  const orderDay = istDay(orders.createdAt);

  const productWhere = and(
    eq(products.status, "approved"),
    q ? ilike(products.title, `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`) : undefined
  );

  const [
    [clickTotal],
    [conversionTotal],
    [earnings],
    clicksByDay,
    salesByDay,
    recentCommissions,
    promotable,
    [promotableCount],
  ] = await Promise.all([
    db.select({ value: count() }).from(affiliateReferrals).where(eq(affiliateReferrals.affiliateId, user.id)),
    db
      .select({ value: count() })
      .from(orders)
      .where(and(eq(orders.referredById, user.id), eq(orders.status, "completed"))),
    db
      .select({
        total: sql<number>`coalesce(sum(${affiliateCommissions.amount}) filter (where ${affiliateCommissions.status} in ('paid','approved','pending')), 0)`.mapWith(Number),
        pending: sql<number>`coalesce(sum(${affiliateCommissions.amount}) filter (where ${affiliateCommissions.status} = 'pending'), 0)`.mapWith(Number),
        paid: sql<number>`coalesce(sum(${affiliateCommissions.amount}) filter (where ${affiliateCommissions.status} = 'paid'), 0)`.mapWith(Number),
      })
      .from(affiliateCommissions)
      .where(eq(affiliateCommissions.affiliateId, user.id)),
    db
      .select({ day: clickDay, value: count() })
      .from(affiliateReferrals)
      .where(and(eq(affiliateReferrals.affiliateId, user.id), gte(affiliateReferrals.createdAt, since)))
      .groupBy(clickDay),
    db
      .select({ day: orderDay, value: count() })
      .from(orders)
      .where(and(eq(orders.referredById, user.id), eq(orders.status, "completed"), gte(orders.createdAt, since)))
      .groupBy(orderDay),
    db
      .select({
        id: affiliateCommissions.id,
        amount: affiliateCommissions.amount,
        percent: affiliateCommissions.percent,
        status: affiliateCommissions.status,
        createdAt: affiliateCommissions.createdAt,
        productTitle: products.title,
        productSlug: products.slug,
      })
      .from(affiliateCommissions)
      .leftJoin(products, eq(affiliateCommissions.productId, products.id))
      .where(and(eq(affiliateCommissions.affiliateId, user.id), ne(affiliateCommissions.status, "cancelled")))
      .orderBy(desc(affiliateCommissions.createdAt))
      .limit(20),
    db
      .select({
        id: products.id,
        title: products.title,
        slug: products.slug,
        price: products.price,
        isFree: products.isFree,
        affiliateCommissionPercent: products.affiliateCommissionPercent,
      })
      .from(products)
      .where(productWhere)
      .orderBy(desc(products.createdAt))
      .limit(PRODUCT_LIMIT),
    db.select({ value: count() }).from(products).where(productWhere),
  ]);

  const totalClicks = clickTotal?.value ?? 0;
  const totalConversions = conversionTotal?.value ?? 0;
  const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
  const handle = user.affiliateSlug || user.id;

  const clicksMap = new Map(clicksByDay.map((r) => [r.day, r.value]));
  const salesMap = new Map(salesByDay.map((r) => [r.day, r.value]));
  const series: AffiliateDailyPoint[] = Array.from({ length: DAYS }, (_, i) => {
    const key = istDayKey(new Date(Date.now() - (DAYS - 1 - i) * 24 * 60 * 60 * 1000));
    return { day: key, clicks: clicksMap.get(key) ?? 0, sales: salesMap.get(key) ?? 0 };
  });

  const storeLink = `${SITE}/?ref=${handle}`;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 md:py-12 lg:px-8">
      <PageHeader
        title="Affiliate dashboard"
        description="Track clicks and conversions, copy product links, and follow your commission."
        actions={
          <>
            <StatusPill tone="success">Approved partner</StatusPill>
            <Button asChild variant="ghost" size="sm">
              <Link href="/creator/dashboard">Creator console</Link>
            </Button>
          </>
        }
      />

      <section
        aria-labelledby="your-link"
        className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
      >
        <div className="min-w-0">
          <h2 id="your-link" className="text-sm font-semibold text-foreground">
            Your store-wide link
          </h2>
          <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{storeLink}</p>
        </div>
        <CopyLinkButton value={storeLink} label="Copy your store-wide referral link" showText />
      </section>

      <StatStrip
        items={[
          { label: "Clicks", value: totalClicks.toLocaleString("en-IN"), hint: "All time" },
          { label: "Sales", value: totalConversions.toLocaleString("en-IN"), hint: "Completed orders" },
          { label: "Conversion", value: `${conversionRate.toFixed(1)}%`, hint: "Sales ÷ clicks" },
          {
            label: "Commission earned",
            value: formatMoney(earnings?.total ?? 0),
            hint: (
              <>
                <span className="tabular">{formatMoney(earnings?.paid ?? 0)}</span> paid ·{" "}
                <span className="tabular">{formatMoney(earnings?.pending ?? 0)}</span> pending
              </>
            ),
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Panel className="lg:col-span-7" title="Last 14 days" description="Clicks and completed sales per day.">
          <div className="px-2 pt-4 pb-2 sm:px-4">
            <AffiliateDashboardClient series={series} />
          </div>
        </Panel>

        <Panel className="lg:col-span-5" title="Recent commission" description="Your latest 20 credited sales.">
          {recentCommissions.length === 0 ? (
            <EmptyState
              title="No referred sales yet"
              description="Share a product link below. Commission shows up here when someone buys."
            />
          ) : (
            <ul className="max-h-[22rem] divide-y divide-border overflow-y-auto">
              {recentCommissions.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{c.productTitle ?? "Referred product"}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(c.createdAt)} · <span className="tabular">{c.percent}%</span>
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="tabular text-sm font-medium text-success">+{formatMoney(c.amount)}</p>
                    <p className="text-xs text-muted-foreground capitalize">{c.status}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <section aria-labelledby="promote-title" className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-col gap-4 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 id="promote-title" className="text-sm font-semibold text-foreground">
              Products to promote
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {promotableCount?.value ?? 0} approved {promotableCount?.value === 1 ? "product" : "products"}
              {q ? ` matching “${q}”` : ""}
              {(promotableCount?.value ?? 0) > PRODUCT_LIMIT ? `, showing the newest ${PRODUCT_LIMIT}` : ""}
            </p>
          </div>
          <form role="search" action="/affiliate/dashboard" className="flex w-full gap-2 sm:w-auto">
            <label htmlFor="promote-search" className="sr-only">
              Search products
            </label>
            <div className="relative flex-1 sm:w-64">
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                strokeWidth={1.75}
              />
              <input
                id="promote-search"
                name="q"
                type="search"
                defaultValue={q}
                placeholder="Search by title"
                className={cn(fieldClass, "pl-9")}
              />
            </div>
            <Button type="submit" variant="outline">
              Search
            </Button>
          </form>
        </div>

        {promotable.length === 0 ? (
          <EmptyState
            title={q ? "No products match that search" : "No products available yet"}
            description={q ? "Try a shorter or different title." : "Approved marketplace products will be listed here."}
            action={
              q ? (
                <Button asChild variant="outline" size="sm">
                  <Link href="/affiliate/dashboard">Clear search</Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead className="border-b border-border bg-secondary/40">
                <tr>
                  <th scope="col" className={tableHeadClass}>Product</th>
                  <th scope="col" className={`${tableHeadClass} text-right`}>Price</th>
                  <th scope="col" className={`${tableHeadClass} text-right`}>Commission</th>
                  <th scope="col" className={`${tableHeadClass} text-right`}>Per sale</th>
                  <th scope="col" className={`${tableHeadClass} text-right`}>
                    <span className="sr-only">Referral link</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {promotable.map((p) => {
                  const free = p.isFree || p.price <= 0;
                  const link = `${SITE}/products/${p.slug}?ref=${handle}`;
                  return (
                    <tr key={p.id} className="transition-colors hover:bg-secondary/40">
                      <td className={`${tableCellClass} max-w-[20rem]`}>
                        <Link
                          href={`/products/${p.slug}`}
                          className="block truncate font-medium text-foreground underline-offset-4 hover:underline"
                        >
                          {p.title}
                        </Link>
                      </td>
                      <td className={`${tableCellClass} tabular text-right whitespace-nowrap ${free ? "text-success" : "text-foreground"}`}>
                        {free ? "Free" : formatPrice(p.price)}
                      </td>
                      <td className={`${tableCellClass} tabular text-right text-foreground`}>
                        {p.affiliateCommissionPercent}%
                      </td>
                      <td className={`${tableCellClass} tabular text-right whitespace-nowrap text-muted-foreground`}>
                        {free ? "—" : `≈ ${formatMoney(Math.round((p.price * p.affiliateCommissionPercent) / 100))}`}
                      </td>
                      <td className={`${tableCellClass} text-right`}>
                        <CopyLinkButton value={link} label={`Copy referral link for ${p.title}`} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground sm:px-5">
              “Per sale” is the commission at list price; discounts and coupons lower it.
            </p>
          </div>
        )}
      </section>

      <section aria-labelledby="settlement-title" className="max-w-[68ch] space-y-2 text-sm leading-relaxed text-muted-foreground">
        <h2 id="settlement-title" className="text-sm font-semibold text-foreground">
          How settlement works
        </h2>
        <p>Split commissions are transferred automatically through Razorpay Route when your account is linked.</p>
        <p>Commission that isn’t split at checkout accrues here and is released on the 1st of each month to your bank account.</p>
      </section>
    </div>
  );
}
