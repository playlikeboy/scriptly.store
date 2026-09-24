export const dynamic = "force-dynamic";

import { Metadata } from "next";
import Link from "next/link";
import { db } from "@/db";
import { orders, products, users } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import {
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  CreditCard,
  DollarSign,
  FolderKanban,
  Package,
  Plus,
  ShieldAlert,
  ShoppingCart,
  Store,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProductPagination } from "@/components/ProductPagination";

export const metadata: Metadata = {
  title: "Admin Overview",
};

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

function inr(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

const quickActions = [
  {
    href: "/admin/approvals",
    label: "Review approvals",
    description: "Moderate incoming products",
    icon: ShieldAlert,
  },
  {
    href: "/admin/stores",
    label: "Manage creators",
    description: "View stores and creator accounts",
    icon: Store,
  },
  {
    href: "/admin/categories",
    label: "Edit categories",
    description: "Keep the catalog organized",
    icon: FolderKanban,
  },
  {
    href: "/admin/payment-links",
    label: "Payment links",
    description: "Create and manage payment links",
    icon: CreditCard,
  },
] as const;

export default async function AdminDashboardPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const currentPage = Math.max(1, parseInt(resolvedParams.page || "1", 10) || 1);
  const limit = 8;
  const offset = (currentPage - 1) * limit;

  const [
    productCountResult,
    completedOrderCountResult,
    revenueResult,
    userCountResult,
    pendingResult,
    creatorResult,
    orderCountResult,
    recentPurchases,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(products),
    db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(eq(orders.status, "completed")),
    db
      .select({ sum: sql<number>`coalesce(sum(${orders.amount}), 0)` })
      .from(orders)
      .where(eq(orders.status, "completed")),
    db.select({ count: sql<number>`count(*)` }).from(users),
    db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(eq(products.status, "pending")),
    db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(sql`store_name is not null`),
    db.select({ count: sql<number>`count(*)` }).from(orders),
    db
      .select({
        orderId: orders.id,
        amount: orders.amount,
        status: orders.status,
        createdAt: orders.createdAt,
        productTitle: products.title,
        customerEmail: users.email,
        customerName: users.name,
      })
      .from(orders)
      .innerJoin(products, eq(orders.productId, products.id))
      .innerJoin(users, eq(orders.userId, users.id))
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset),
  ]);

  const totalProducts = Number(productCountResult[0]?.count || 0);
  const totalOrders = Number(completedOrderCountResult[0]?.count || 0);
  const totalRevenue = Number(revenueResult[0]?.sum || 0);
  const totalUsers = Number(userCountResult[0]?.count || 0);
  const pendingApprovals = Number(pendingResult[0]?.count || 0);
  const totalCreators = Number(creatorResult[0]?.count || 0);
  const totalOrderRows = Number(orderCountResult[0]?.count || 0);
  const totalPages = Math.ceil(totalOrderRows / limit);
  const averageOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const stats = [
    {
      label: "Revenue",
      value: inr(totalRevenue),
      helper: `AOV ${inr(averageOrder)}`,
      icon: DollarSign,
    },
    {
      label: "Orders",
      value: totalOrders.toLocaleString("en-IN"),
      helper: "Completed payments",
      icon: ShoppingCart,
    },
    {
      label: "Products",
      value: totalProducts.toLocaleString("en-IN"),
      helper: "Catalog items",
      icon: Package,
    },
    {
      label: "Users",
      value: totalUsers.toLocaleString("en-IN"),
      helper: `${totalCreators.toLocaleString("en-IN")} creators`,
      icon: Users,
    },
  ] as const;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Control center
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Overview</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Monitor the marketplace and jump straight into the actions that need attention.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/admin/products">
              <Package className="mr-2 h-4 w-4" />
              Catalog
            </Link>
          </Button>
          <Button asChild className="rounded-xl">
            <Link href="/admin/products/new">
              <Plus className="mr-2 h-4 w-4" />
              New product
            </Link>
          </Button>
        </div>
      </header>

      {pendingApprovals > 0 && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <div>
                <p className="text-sm font-semibold">
                  {pendingApprovals} product{pendingApprovals === 1 ? "" : "s"} need approval
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Review submissions before publishing them to the marketplace.
                </p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm" className="rounded-lg">
              <Link href="/admin/approvals">
                Review queue <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </Card>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-border/60 bg-card/45">
              <div className="p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">{stat.label}</span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/70">
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
                <div className="mt-4 text-2xl font-bold tracking-tight">{stat.value}</div>
                <p className="mt-1 text-[11px] text-muted-foreground">{stat.helper}</p>
              </div>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="overflow-hidden border-border/60 bg-card/40">
          <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3.5 sm:px-5">
            <div>
              <h2 className="text-sm font-semibold">Recent activity</h2>
              <p className="text-[11px] text-muted-foreground">Latest checkout activity across the store.</p>
            </div>
            <Link
              href="/admin/orders"
              className="text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              View orders
            </Link>
          </div>

          <div className="divide-y divide-border/50">
            {recentPurchases.map((purchase) => (
              <div key={purchase.orderId} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  {purchase.status === "completed" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Clock3 className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{purchase.productTitle}</p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {purchase.customerName || purchase.customerEmail}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums">{inr(purchase.amount)}</p>
                  <Badge
                    variant="outline"
                    className={[
                      "mt-1 rounded-full px-2 py-0.5 text-[10px]",
                      purchase.status === "completed"
                        ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-500"
                        : "border-border/70 text-muted-foreground",
                    ].join(" ")}
                  >
                    {purchase.status}
                  </Badge>
                </div>
              </div>
            ))}

            {recentPurchases.length === 0 && (
              <div className="px-5 py-14 text-center">
                <BarChart3 className="mx-auto mb-2 h-7 w-7 text-muted-foreground/30" />
                <p className="text-sm font-semibold">No activity yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Orders will appear here as customers purchase products.
                </p>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="border-t border-border/60 px-4 py-3 sm:px-5">
              <ProductPagination totalPages={totalPages} currentPage={currentPage} />
            </div>
          )}
        </Card>

        <Card className="border-border/60 bg-card/40">
          <div className="border-b border-border/60 px-4 py-3.5">
            <h2 className="text-sm font-semibold">Quick actions</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Common admin workflows.</p>
          </div>
          <div className="grid gap-2 p-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group flex items-center gap-3 rounded-xl border border-transparent p-3 transition-colors hover:border-border/60 hover:bg-muted/50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold">{action.label}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {action.description}
                    </span>
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              );
            })}
          </div>
        </Card>
      </section>
    </div>
  );
}
