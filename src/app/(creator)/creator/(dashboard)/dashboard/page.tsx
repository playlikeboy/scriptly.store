export const dynamic = "force-dynamic";

import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { count, desc, eq } from "drizzle-orm";
import { ArrowRight, Plus } from "lucide-react";
import { db } from "@/db";
import { products } from "@/db/schema";
import { getOrCreateDbUser } from "@/lib/auth-utils";
import { formatMoney, formatPrice } from "@/lib/price-utils";
import { Button } from "@/components/ui/button";
import CreatorEarningsChart from "@/components/CreatorEarningsChart";
import {
  EmptyState,
  PageHeader,
  Panel,
  StatStrip,
  StatusPill,
  formatDate,
} from "@/components/creator/console-ui";
import { getCreatorDailySales, getCreatorSales, getCreatorSalesSummary } from "../_lib/sales";

export const metadata: Metadata = {
  title: "Creator Overview | ScriptlyStore",
  description: "Monitor store-level analytics, sales performance, and payout splits.",
};

function productStatus(status: string | null) {
  if (status === "approved") return <StatusPill tone="success">Live</StatusPill>;
  if (status === "rejected") return <StatusPill tone="destructive">Rejected</StatusPill>;
  return <StatusPill>In review</StatusPill>;
}

export default async function CreatorConsolePage() {
  const user = await getOrCreateDbUser();
  if (!user) {
    redirect("/handler/sign-in?redirectTo=/creator/dashboard");
  }

  const [summary, series, recentSales, recentProducts, [productCount]] = await Promise.all([
    getCreatorSalesSummary(user.id),
    getCreatorDailySales(user.id, 30),
    getCreatorSales(user.id, { limit: 5 }),
    db
      .select({
        id: products.id,
        title: products.title,
        slug: products.slug,
        category: products.category,
        price: products.price,
        isFree: products.isFree,
        status: products.status,
      })
      .from(products)
      .where(eq(products.creatorId, user.id))
      .orderBy(desc(products.createdAt))
      .limit(5),
    db.select({ value: count() }).from(products).where(eq(products.creatorId, user.id)),
  ]);

  const hasBankDetails = Boolean(user.bankAccountNumber && user.bankIfsc);
  const isRouteActive = Boolean(user.razorpayAccountId?.startsWith("acc_"));
  const totalProducts = productCount?.value ?? 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Overview"
        description="Sales, earnings and payout status for your storefront."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/affiliate">Affiliate console</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/creator/new">
                <Plus strokeWidth={1.75} /> New product
              </Link>
            </Button>
          </>
        }
      />

      {/* Payout status */}
      <div
        role="status"
        className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5"
      >
        <div className="flex min-w-0 items-start gap-3">
          {isRouteActive ? (
            <StatusPill tone="success">Payouts active</StatusPill>
          ) : hasBankDetails ? (
            <StatusPill>Setup in progress</StatusPill>
          ) : (
            <StatusPill tone="destructive">Action needed</StatusPill>
          )}
          <p className="min-w-0 text-sm text-muted-foreground">
            {isRouteActive ? (
              <>
                Automated 95/5 splits transfer to Razorpay account{" "}
                <code className="font-mono text-xs break-all text-foreground">{user.razorpayAccountId}</code>.
              </>
            ) : hasBankDetails ? (
              "Bank details recorded. Your Razorpay Route account is being configured."
            ) : (
              "Link your bank account to receive your 95% share automatically."
            )}
          </p>
        </div>
        <Button asChild variant={hasBankDetails ? "ghost" : "outline"} size="sm" className="self-start sm:self-auto">
          <Link href="/creator/payouts">
            {hasBankDetails ? "Payout settings" : "Add bank details"}
          </Link>
        </Button>
      </div>

      <StatStrip
        items={[
          { label: "Your earnings", value: formatMoney(summary.net), hint: "Net creator share" },
          { label: "Gross volume", value: formatMoney(summary.gross), hint: "Paid by customers" },
          { label: "Orders", value: summary.count.toLocaleString("en-IN"), hint: "Completed" },
          { label: "Products", value: totalProducts.toLocaleString("en-IN"), hint: "Listed by you" },
        ]}
      />

      <CreatorEarningsChart series={series} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Panel
          className="lg:col-span-7"
          title="Recent products"
          action={
            <Link
              href="/creator/products"
              className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
            >
              All products <ArrowRight className="size-3.5" strokeWidth={1.75} />
            </Link>
          }
        >
          {recentProducts.length === 0 ? (
            <EmptyState
              title="No products yet"
              description="List your first script, template or kit. Every submission is reviewed before it goes live."
              action={
                <Button asChild size="sm">
                  <Link href="/creator/new">New product</Link>
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {recentProducts.map((prod) => (
                <li key={prod.id}>
                  <Link
                    href={`/creator/${prod.id}/edit`}
                    className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-secondary/50 focus-visible:bg-secondary/50 focus-visible:outline-none sm:px-5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{prod.title}</p>
                      <p className="truncate text-xs text-muted-foreground capitalize">{prod.category}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span
                        className={
                          prod.isFree || prod.price <= 0
                            ? "tabular text-sm font-medium text-success"
                            : "tabular text-sm font-medium text-foreground"
                        }
                      >
                        {prod.isFree ? "Free" : formatPrice(prod.price)}
                      </span>
                      <span className="hidden sm:inline-flex">{productStatus(prod.status)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          className="lg:col-span-5"
          title="Latest sales"
          action={
            <Link
              href="/creator/ledger"
              className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
            >
              Ledger <ArrowRight className="size-3.5" strokeWidth={1.75} />
            </Link>
          }
        >
          {recentSales.length === 0 ? (
            <EmptyState
              title="No sales yet"
              description="Completed orders for your products will show up here."
            />
          ) : (
            <ul className="divide-y divide-border">
              {recentSales.map((sale) => (
                <li key={sale.orderId} className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{sale.productTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(sale.date)}
                      {sale.referred ? " · Affiliate" : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="tabular text-sm font-medium text-success">+{formatMoney(sale.creatorShare)}</p>
                    <p className="tabular text-xs text-muted-foreground">of {formatMoney(sale.amount)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
