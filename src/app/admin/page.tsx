export const dynamic = "force-dynamic";

import { Metadata } from "next";
import { requireAdminPage } from "@/app/admin/_components/require-admin";
import Link from "next/link";
import { db } from "@/db";
import { orders, products, users } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { ArrowRight, Package, Plus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/price-utils";
import {
  AdminEmptyState,
  AdminFigures,
  AdminPageHeader,
  AdminPager,
  AdminPanel,
  StatusText,
  formatAdminDate,
  orderStatusTone,
  parsePage,
  td,
  th,
} from "@/app/admin/_components/admin-ui";

export const metadata: Metadata = {
  title: "Admin Overview",
};

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

const shortcuts = [
  { href: "/admin/approvals", label: "Review approvals", description: "Moderate incoming creator submissions" },
  { href: "/admin/stores", label: "Manage creators", description: "Stores, bank details and Route accounts" },
  { href: "/admin/categories", label: "Edit categories", description: "Keep the catalog organised" },
  { href: "/admin/payment-links", label: "Payment links", description: "Create and track payment links" },
  { href: "/admin/payouts", label: "Payouts", description: "Settle creator balances" },
] as const;

export default async function AdminDashboardPage({ searchParams }: PageProps) {
  await requireAdminPage();
  const resolvedParams = await searchParams;
  const currentPage = parsePage(resolvedParams.page);
  const limit = 8;
  const offset = (currentPage - 1) * limit;

  const [statsResult, userStatsResult, pendingResult, recentPurchases] = await Promise.all([
    db
      .select({
        orderRows: sql<number>`count(*)`,
        completed: sql<number>`count(*) filter (where ${orders.status} = 'completed')`,
        revenue: sql<number>`coalesce(sum(${orders.amount}) filter (where ${orders.status} = 'completed'), 0)`,
        products: sql<number>`(select count(*) from ${products})`,
      })
      .from(orders),
    db
      .select({
        users: sql<number>`count(*)`,
        creators: sql<number>`count(*) filter (where ${users.storeName} is not null)`,
      })
      .from(users),
    db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(eq(products.status, "pending")),
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

  const stats = statsResult[0];
  const totalProducts = Number(stats?.products || 0);
  const totalOrders = Number(stats?.completed || 0);
  const totalRevenue = Number(stats?.revenue || 0);
  const totalOrderRows = Number(stats?.orderRows || 0);
  const totalUsers = Number(userStatsResult[0]?.users || 0);
  const totalCreators = Number(userStatsResult[0]?.creators || 0);
  const pendingApprovals = Number(pendingResult[0]?.count || 0);
  const totalPages = Math.ceil(totalOrderRows / limit);
  const averageOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Overview"
        description="Monitor the marketplace and jump straight into the work that needs attention."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/admin/products">
                <Package aria-hidden="true" />
                Catalog
              </Link>
            </Button>
            <Button asChild>
              <Link href="/admin/products/new">
                <Plus aria-hidden="true" />
                New product
              </Link>
            </Button>
          </>
        }
      />

      {pendingApprovals > 0 ? (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"
        >
          <div>
            <p className="text-sm font-medium text-foreground">
              {pendingApprovals.toLocaleString("en-IN")} product{pendingApprovals === 1 ? "" : "s"} waiting for approval
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Review submissions before they are published to the marketplace.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="self-start sm:self-auto">
            <Link href="/admin/approvals">
              Open review queue
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      ) : null}

      <AdminFigures
        items={[
          { label: "Revenue", value: formatMoney(totalRevenue), hint: `Avg. order ${formatMoney(averageOrder)}` },
          { label: "Completed orders", value: totalOrders.toLocaleString("en-IN"), hint: `${totalOrderRows.toLocaleString("en-IN")} total checkouts` },
          { label: "Products", value: totalProducts.toLocaleString("en-IN"), hint: "Catalog items" },
          { label: "Users", value: totalUsers.toLocaleString("en-IN"), hint: `${totalCreators.toLocaleString("en-IN")} creators` },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <AdminPanel
          title="Recent orders"
          description="Latest checkout activity across the store."
          actions={
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/orders">
                All orders
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          }
        >
          {recentPurchases.length === 0 ? (
            <AdminEmptyState
              icon={ShoppingCart}
              title="No orders yet"
              description="Orders will appear here as customers purchase products."
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border">
                    <tr>
                      <th scope="col" className={th}>Product</th>
                      <th scope="col" className={`${th} hidden md:table-cell`}>Customer</th>
                      <th scope="col" className={`${th} hidden sm:table-cell`}>Status</th>
                      <th scope="col" className={`${th} text-right`}>Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentPurchases.map((purchase) => (
                      <tr key={purchase.orderId} className="transition-colors hover:bg-secondary/40">
                        <td className={`${td} max-w-0 w-full`}>
                          <p className="truncate font-medium text-foreground">{purchase.productTitle}</p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            <span className="md:hidden">{purchase.customerName || purchase.customerEmail} · </span>
                            {formatAdminDate(purchase.createdAt, true)}
                          </p>
                        </td>
                        <td className={`${td} hidden max-w-[220px] md:table-cell`}>
                          <p className="truncate text-foreground">{purchase.customerName || "Member"}</p>
                          <p className="truncate text-xs text-muted-foreground">{purchase.customerEmail}</p>
                        </td>
                        <td className={`${td} hidden sm:table-cell`}>
                          <StatusText tone={orderStatusTone(purchase.status)} className="capitalize">
                            {purchase.status}
                          </StatusText>
                        </td>
                        <td className={`${td} text-right font-medium whitespace-nowrap tabular-nums`}>
                          {formatMoney(purchase.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <AdminPager
                basePath="/admin"
                params={{}}
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={totalOrderRows}
                pageSize={limit}
                noun="orders"
              />
            </>
          )}
        </AdminPanel>

        <AdminPanel title="Shortcuts">
          <ul className="divide-y divide-border">
            {shortcuts.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="group flex items-center gap-3 px-4 py-3 transition-colors outline-none hover:bg-secondary/40 focus-visible:bg-secondary/60 sm:px-5"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">{item.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{item.description}</span>
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </AdminPanel>
      </div>
    </div>
  );
}
