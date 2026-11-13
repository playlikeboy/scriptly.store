export const dynamic = "force-dynamic";

import { Metadata } from "next";
import { requireAdminPage } from "@/app/admin/_components/require-admin";
import { asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { ShoppingCart } from "lucide-react";
import { db } from "@/db";
import { orders, products, users } from "@/db/schema";
import { formatMoney } from "@/lib/price-utils";
import AdminQueryBar from "@/app/admin/_components/AdminQueryBar";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPager,
  StatusText,
  formatAdminDate,
  orderStatusTone,
  parsePage,
  td,
  th,
} from "@/app/admin/_components/admin-ui";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Orders",
};

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    sort?: string;
  }>;
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  await requireAdminPage();
  const resolvedParams = await searchParams;
  const currentPage = parsePage(resolvedParams.page);
  const currentSearch = resolvedParams.search?.trim() || "";
  const currentSort = resolvedParams.sort || "newest";
  const limit = 50;
  const offset = (currentPage - 1) * limit;

  const whereClause = currentSearch
    ? or(
        ilike(orders.id, `%${currentSearch}%`),
        ilike(orders.razorpayPaymentId, `%${currentSearch}%`),
        ilike(users.email, `%${currentSearch}%`),
        ilike(users.name, `%${currentSearch}%`),
        ilike(products.title, `%${currentSearch}%`)
      )
    : undefined;

  let orderBy;
  switch (currentSort) {
    case "oldest":
      orderBy = asc(orders.createdAt);
      break;
    case "amount_asc":
      orderBy = asc(orders.amount);
      break;
    case "amount_desc":
      orderBy = desc(orders.amount);
      break;
    case "newest":
    default:
      orderBy = desc(orders.createdAt);
      break;
  }

  const [countResult, orderRows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .innerJoin(products, eq(orders.productId, products.id))
      .innerJoin(users, eq(orders.userId, users.id))
      .where(whereClause),
    db
      .select({
        orderId: orders.id,
        amount: orders.amount,
        status: orders.status,
        createdAt: orders.createdAt,
        paymentId: orders.razorpayPaymentId,
        couponCode: orders.couponCode,
        discountApplied: orders.discountApplied,
        productTitle: products.title,
        customerEmail: users.email,
        customerName: users.name,
      })
      .from(orders)
      .innerJoin(products, eq(orders.productId, products.id))
      .innerJoin(users, eq(orders.userId, users.id))
      .where(whereClause)
      .orderBy(orderBy, desc(orders.id))
      .limit(limit)
      .offset(offset),
  ]);

  const totalCount = Number(countResult[0]?.count || 0);
  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Orders" description="Every checkout with its payment reference, discount and status." />

      <AdminQueryBar
        searchLabel="Search orders"
        placeholder="Order ID, payment ID, email, name or product"
        selects={[
          {
            key: "sort",
            label: "Sort orders",
            defaultValue: "newest",
            options: [
              { value: "newest", label: "Newest first" },
              { value: "oldest", label: "Oldest first" },
              { value: "amount_asc", label: "Amount: low to high" },
              { value: "amount_desc", label: "Amount: high to low" },
            ],
          },
        ]}
      />

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {orderRows.length === 0 ? (
          <AdminEmptyState
            icon={ShoppingCart}
            title={currentSearch ? `No orders match “${currentSearch}”` : "No orders yet"}
            description={currentSearch ? "Check the spelling or search by a different field." : "Orders appear here as soon as a checkout starts."}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr>
                    <th scope="col" className={th}>Order</th>
                    <th scope="col" className={cn(th, "hidden lg:table-cell")}>Customer</th>
                    <th scope="col" className={cn(th, "hidden md:table-cell")}>Product</th>
                    <th scope="col" className={cn(th, "hidden xl:table-cell text-right")}>Discount</th>
                    <th scope="col" className={cn(th, "text-right")}>Amount</th>
                    <th scope="col" className={cn(th, "hidden sm:table-cell")}>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orderRows.map((ord) => (
                    <tr key={ord.orderId} className="align-top transition-colors hover:bg-secondary/40">
                      <td className={cn(td, "max-w-0 w-full md:w-auto md:max-w-none")}>
                        <p className="font-mono text-xs text-foreground" title={ord.orderId}>
                          {ord.orderId.slice(0, 12)}
                        </p>
                        {ord.paymentId ? (
                          <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground" title={ord.paymentId}>
                            {ord.paymentId}
                          </p>
                        ) : null}
                        <p className="mt-1 text-xs text-muted-foreground">{formatAdminDate(ord.createdAt, true)}</p>
                        <div className="mt-1 space-y-0.5 md:hidden">
                          <p className="truncate text-sm text-foreground">{ord.productTitle}</p>
                          <p className="truncate text-xs text-muted-foreground">{ord.customerEmail}</p>
                          <StatusText tone={orderStatusTone(ord.status)} className="capitalize sm:hidden">
                            {ord.status}
                          </StatusText>
                        </div>
                      </td>
                      <td className={cn(td, "hidden max-w-[240px] lg:table-cell")}>
                        <p className="truncate text-foreground">{ord.customerName || "Member"}</p>
                        <p className="truncate text-xs text-muted-foreground">{ord.customerEmail}</p>
                      </td>
                      <td className={cn(td, "hidden max-w-[280px] md:table-cell")}>
                        <p className="line-clamp-2 text-foreground">{ord.productTitle}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground lg:hidden">{ord.customerEmail}</p>
                      </td>
                      <td className={cn(td, "hidden text-right xl:table-cell")}>
                        {ord.discountApplied > 0 ? (
                          <>
                            <p className="whitespace-nowrap text-success tabular-nums">−{formatMoney(ord.discountApplied)}</p>
                            {ord.couponCode ? <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{ord.couponCode}</p> : null}
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className={cn(td, "text-right font-medium whitespace-nowrap tabular-nums")}>
                        {formatMoney(ord.amount)}
                      </td>
                      <td className={cn(td, "hidden sm:table-cell")}>
                        <StatusText tone={orderStatusTone(ord.status)} className="capitalize">
                          {ord.status}
                        </StatusText>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AdminPager
              basePath="/admin/orders"
              params={{ search: currentSearch || undefined, sort: currentSort !== "newest" ? currentSort : undefined }}
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={limit}
              noun="orders"
            />
          </>
        )}
      </div>
    </div>
  );
}
