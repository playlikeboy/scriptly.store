export const dynamic = "force-dynamic";

import { db } from "@/db";
import { orders, products } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getOrCreateDbUser } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Download, FileText, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductPagination } from "@/components/ProductPagination";
import { Metadata } from "next";
import { formatMoney } from "@/lib/price-utils";

interface PageProps {
  searchParams: Promise<{
    page?: string;
  }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Customer Inventory | ScriptlyStore",
    description: "Access your purchased scripts, license keys, and digital receipts on ScriptlyStore.",
    robots: { index: false, follow: false },
  };
}

const PAGE_SIZE = 8;

const formatDate = (value: Date | string) =>
  new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const formatAmount = (paise: number) => (paise <= 0 ? "Free" : formatMoney(paise));

export default async function DashboardPage({ searchParams }: PageProps) {
  const user = await getOrCreateDbUser();
  if (!user) {
    redirect("/handler/sign-in?redirectTo=/dashboard");
  }

  const resolvedParams = await searchParams;
  const parsedPage = parseInt(resolvedParams.page || "1", 10);
  const currentPage = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;
  const offset = (currentPage - 1) * PAGE_SIZE;

  const ownedCompleted = and(eq(orders.userId, user.id), eq(orders.status, "completed"));

  // Stats, ledger and the current library page are independent: run them together.
  const [[statsResult], billingHistory, purchasedItems] = await Promise.all([
    db
      .select({
        count: sql<number>`count(*)`,
        sum: sql<number>`coalesce(sum(${orders.amount}), 0)`,
      })
      .from(orders)
      .where(ownedCompleted),

    db
      .select({
        orderId: orders.id,
        amount: orders.amount,
        purchaseDate: orders.createdAt,
        productTitle: products.title,
      })
      .from(orders)
      .innerJoin(products, eq(orders.productId, products.id))
      .where(ownedCompleted)
      .orderBy(desc(orders.createdAt))
      .limit(10),

    db
      .select({
        orderId: orders.id,
        amount: orders.amount,
        paymentId: orders.razorpayPaymentId,
        purchaseDate: orders.createdAt,
        product: {
          id: products.id,
          title: products.title,
          slug: products.slug,
          thumbnail: products.thumbnail,
          category: products.category,
          version: products.version,
          shortDescription: products.shortDescription,
          demoUrl: products.demoUrl,
        },
      })
      .from(orders)
      .innerJoin(products, eq(orders.productId, products.id))
      .where(ownedCompleted)
      .orderBy(desc(orders.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),
  ]);

  const totalCount = Number(statsResult?.count || 0);
  const totalInvested = Number(statsResult?.sum || 0);
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12 lg:px-8">
        {/* Header */}
        <header className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0 space-y-2">
            <h1 className="font-display text-3xl text-foreground md:text-4xl">Your library</h1>
            <p className="text-sm text-muted-foreground">
              Signed in as <span className="break-all text-foreground">{user.email}</span>
            </p>
            {totalCount > 0 && (
              <p className="text-sm text-muted-foreground">
                <span className="tabular font-medium text-foreground">{totalCount}</span>{" "}
                {totalCount === 1 ? "product" : "products"} unlocked ·{" "}
                <span className="tabular font-medium text-foreground">{formatMoney(totalInvested)}</span> spent ·
                Commercial license for personal & client projects
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/handler/account-settings">Account settings</Link>
            </Button>
            <Button asChild>
              <Link href="/explore">Explore catalog</Link>
            </Button>
          </div>
        </header>

        {totalCount === 0 ? (
          <div className="max-w-xl py-16">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">No products yet</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Explore our catalog of production-ready SaaS boilerplates, scrapers, and tools to start building your
              library. Everything you buy lands here with lifetime downloads.
            </p>
            <Button asChild className="mt-6">
              <Link href="/explore">Browse marketplace</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-12 lg:grid-cols-12">
            {/* Purchased products */}
            <section aria-labelledby="library-heading" className="min-w-0 lg:col-span-8">
              <div className="flex items-baseline justify-between gap-4 pb-3">
                <h2 id="library-heading" className="text-base font-semibold text-foreground">
                  Purchased products
                </h2>
                {totalPages > 1 && (
                  <span className="tabular text-xs text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                )}
              </div>

              {purchasedItems.length === 0 ? (
                <p className="border-t border-border py-8 text-sm text-muted-foreground">
                  Nothing on this page.{" "}
                  <Link href="/dashboard" className="text-primary underline-offset-4 hover:underline">
                    Go to the first page
                  </Link>
                </p>
              ) : (
                <ul className="divide-y divide-border border-y border-border">
                  {purchasedItems.map((item) => (
                    <li key={item.orderId} className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center">
                      <div className="flex min-w-0 flex-1 items-start gap-4">
                        <Link
                          href={`/products/${item.product.slug}`}
                          tabIndex={-1}
                          aria-hidden="true"
                          className="relative aspect-[16/10] w-24 shrink-0 overflow-hidden rounded-lg bg-secondary sm:w-28"
                        >
                          {item.product.thumbnail && (
                            <Image src={item.product.thumbnail} alt="" fill sizes="112px" className="object-cover" />
                          )}
                        </Link>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-medium leading-snug text-foreground sm:text-base">
                            <Link
                              href={`/products/${item.product.slug}`}
                              className="hover:text-primary transition-colors"
                            >
                              {item.product.title}
                            </Link>
                          </h3>
                          {item.product.shortDescription && (
                            <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                              {item.product.shortDescription}
                            </p>
                          )}
                          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                            <span className="capitalize">{item.product.category.replace(/-/g, " ")}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono">v{item.product.version}</span>
                            <span aria-hidden="true">·</span>
                            <span>
                              Bought <time dateTime={new Date(item.purchaseDate).toISOString()}>{formatDate(item.purchaseDate)}</time>
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2 sm:justify-end">
                        <Button asChild size="sm">
                          <a href={`/api/download/${item.product.id}`}>
                            <Download strokeWidth={1.75} aria-hidden="true" />
                            Download ZIP
                          </a>
                        </Button>
                        <Button asChild variant="ghost" size="sm">
                          <Link
                            href={`/dashboard/receipt/${item.orderId}`}
                            aria-label={`Receipt for ${item.product.title}`}
                          >
                            <FileText strokeWidth={1.75} aria-hidden="true" />
                            Receipt
                          </Link>
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {totalPages > 1 && (
                <div className="pt-2">
                  <ProductPagination totalPages={totalPages} currentPage={currentPage} />
                </div>
              )}
            </section>

            {/* Billing ledger */}
            <aside className="space-y-10 lg:col-span-4">
              <section aria-labelledby="invoices-heading">
                <div className="flex items-baseline justify-between gap-4 pb-3">
                  <h2 id="invoices-heading" className="text-base font-semibold text-foreground">
                    Recent invoices
                  </h2>
                  <span className="text-xs text-muted-foreground">Latest 10</span>
                </div>
                <table className="w-full border-y border-border text-sm">
                  <caption className="sr-only">Your 10 most recent invoices</caption>
                  <thead className="sr-only">
                    <tr>
                      <th scope="col">Product</th>
                      <th scope="col">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {billingHistory.map((item) => (
                      <tr key={item.orderId}>
                        <td className="max-w-0 py-3 pr-3">
                          <Link
                            href={`/dashboard/receipt/${item.orderId}`}
                            className="block truncate text-foreground hover:text-primary transition-colors"
                          >
                            {item.productTitle}
                          </Link>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {formatDate(item.purchaseDate)} ·{" "}
                            <span className="font-mono">{item.orderId.slice(0, 8)}</span>
                          </span>
                        </td>
                        <td
                          className={`tabular whitespace-nowrap py-3 text-right align-top ${
                            item.amount <= 0 ? "text-success" : "text-foreground"
                          }`}
                        >
                          {formatAmount(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <section aria-labelledby="sell-heading" className="text-sm">
                <h2 id="sell-heading" className="font-semibold text-foreground">
                  Build and sell code
                </h2>
                <p className="mt-1.5 leading-relaxed text-muted-foreground">
                  Turn your own templates and scripts into products. Keep 95% of direct sales with no monthly fees.
                </p>
                <Link
                  href="/creator"
                  className="mt-2 inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                >
                  Learn about selling
                  <ArrowRight className="size-4" strokeWidth={1.75} aria-hidden="true" />
                </Link>
              </section>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
