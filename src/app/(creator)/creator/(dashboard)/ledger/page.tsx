export const dynamic = "force-dynamic";

import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getOrCreateDbUser } from "@/lib/auth-utils";
import { formatMoney } from "@/lib/price-utils";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  PageHeader,
  StatStrip,
  StatusPill,
  formatDate,
  tableCellClass,
  tableHeadClass,
} from "@/components/creator/console-ui";
import { getCreatorSales, getCreatorSalesSummary } from "../_lib/sales";

export const metadata: Metadata = {
  title: "Sales Ledger | Creator Console",
  description: "Monitor purchase transactions and direct payouts settlement streams.",
};

const PAGE_SIZE = 25;

export default async function CreatorLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await getOrCreateDbUser();
  if (!user) {
    redirect("/handler/sign-in?redirectTo=/creator/ledger");
  }

  const { page: pageParam } = await searchParams;
  const requested = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

  const summary = await getCreatorSalesSummary(user.id);
  const totalPages = Math.max(1, Math.ceil(summary.count / PAGE_SIZE));
  const page = Math.min(requested, totalPages);
  const sales =
    summary.count > 0
      ? await getCreatorSales(user.id, { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE })
      : [];

  const from = summary.count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, summary.count);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Sales ledger"
        description="Every completed order for your products, with your share after platform and affiliate splits."
      />

      <StatStrip
        items={[
          { label: "Completed orders", value: summary.count.toLocaleString("en-IN") },
          { label: "Gross volume", value: formatMoney(summary.gross) },
          { label: "Your share", value: formatMoney(summary.net) },
          {
            label: "Platform + affiliate",
            value: formatMoney(Math.max(summary.gross - summary.net, 0)),
          },
        ]}
      />

      <section aria-labelledby="ledger-title" className="overflow-hidden rounded-2xl border border-border bg-card">
        <h2 id="ledger-title" className="sr-only">
          Transactions
        </h2>
        {sales.length === 0 ? (
          <EmptyState
            title="No transactions yet"
            description="Orders appear here as soon as customers buy your products."
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/creator/products">Manage products</Link>
              </Button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead className="border-b border-border bg-secondary/40">
                  <tr>
                    <th scope="col" className={tableHeadClass}>Date</th>
                    <th scope="col" className={tableHeadClass}>Product</th>
                    <th scope="col" className={tableHeadClass}>Order</th>
                    <th scope="col" className={tableHeadClass}>Source</th>
                    <th scope="col" className={`${tableHeadClass} text-right`}>Paid</th>
                    <th scope="col" className={`${tableHeadClass} text-right`}>Your share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sales.map((sale) => (
                    <tr key={sale.orderId} className="transition-colors hover:bg-secondary/40">
                      <td className={`${tableCellClass} whitespace-nowrap text-muted-foreground`}>
                        {formatDate(sale.date)}
                      </td>
                      <td className={`${tableCellClass} max-w-[18rem]`}>
                        <Link
                          href={`/products/${sale.productSlug}`}
                          className="block truncate font-medium text-foreground underline-offset-4 hover:underline"
                        >
                          {sale.productTitle}
                        </Link>
                      </td>
                      <td className={tableCellClass}>
                        <code className="font-mono text-xs text-muted-foreground" title={sale.orderId}>
                          {sale.orderId.slice(0, 10)}
                        </code>
                      </td>
                      <td className={tableCellClass}>
                        {sale.referred ? <StatusPill>Affiliate</StatusPill> : <span className="text-muted-foreground">Direct</span>}
                      </td>
                      <td className={`${tableCellClass} tabular text-right whitespace-nowrap text-foreground`}>
                        {formatMoney(sale.amount)}
                      </td>
                      <td className={`${tableCellClass} tabular text-right font-medium whitespace-nowrap text-success`}>
                        +{formatMoney(sale.creatorShare)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <nav
              aria-label="Ledger pages"
              className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:px-5"
            >
              <p className="tabular">
                {from}–{to} of {summary.count.toLocaleString("en-IN")}
              </p>
              <div className="flex items-center gap-2">
                {page > 1 ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/creator/ledger?page=${page - 1}`} rel="prev">
                      <ChevronLeft strokeWidth={1.75} /> Previous
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    <ChevronLeft strokeWidth={1.75} /> Previous
                  </Button>
                )}
                <span className="tabular px-1">
                  {page} / {totalPages}
                </span>
                {page < totalPages ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/creator/ledger?page=${page + 1}`} rel="next">
                      Next <ChevronRight strokeWidth={1.75} />
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    Next <ChevronRight strokeWidth={1.75} />
                  </Button>
                )}
              </div>
            </nav>
          </>
        )}
      </section>
    </div>
  );
}
