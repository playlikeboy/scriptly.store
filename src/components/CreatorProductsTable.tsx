import Link from "next/link";
import { ChevronLeft, ChevronRight, ExternalLink, Pencil } from "lucide-react";
import { formatPrice } from "@/lib/price-utils";
import { Button } from "@/components/ui/button";
import DeleteProductButton from "@/components/creator/DeleteProductButton";
import {
  EmptyState,
  StatusPill,
  formatDate,
  tableCellClass,
  tableHeadClass,
} from "@/components/creator/console-ui";

export interface CreatorProductRow {
  id: string;
  title: string;
  slug: string;
  category: string;
  thumbnail: string | null;
  price: number;
  isFree: boolean;
  status: string | null;
  published: boolean;
  createdAt: Date;
}

interface Pagination {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  prevHref: string | null;
  nextHref: string | null;
}

function StatusCell({ status, published }: { status: string | null; published: boolean }) {
  if (status === "approved") {
    return published ? <StatusPill tone="success">Live</StatusPill> : <StatusPill>Unlisted</StatusPill>;
  }
  if (status === "rejected") return <StatusPill tone="destructive">Rejected</StatusPill>;
  return <StatusPill>In review</StatusPill>;
}

function Thumb({ src, title }: { src: string | null; title: string }) {
  if (!src) {
    return (
      <span
        aria-hidden
        className="flex h-10 w-16 shrink-0 items-center justify-center rounded-lg bg-secondary text-xs font-medium text-muted-foreground"
      >
        {title.slice(0, 1).toUpperCase()}
      </span>
    );
  }
  return (
     
    <img
      src={src}
      alt=""
      width={64}
      height={40}
      loading="lazy"
      decoding="async"
      className="h-10 w-16 shrink-0 rounded-lg bg-secondary object-cover"
    />
  );
}

export default function CreatorProductsTable({
  products,
  pagination,
  hasAnyProducts,
  isFiltered,
}: {
  products: CreatorProductRow[];
  pagination: Pagination;
  hasAnyProducts: boolean;
  isFiltered: boolean;
}) {
  if (products.length === 0) {
    return hasAnyProducts && isFiltered ? (
      <EmptyState
        title="No products match these filters"
        description="Try a different search term or status."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/creator/products">Clear filters</Link>
          </Button>
        }
      />
    ) : (
      <EmptyState
        title="You haven’t listed anything yet"
        description="Package a script, template or kit and submit it. Every listing is reviewed before it goes live."
        action={
          <Button asChild size="sm">
            <Link href="/creator/new">New product</Link>
          </Button>
        }
      />
    );
  }

  const from = (pagination.page - 1) * pagination.pageSize + 1;
  const to = Math.min(pagination.page * pagination.pageSize, pagination.total);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <thead className="border-b border-border bg-secondary/40">
            <tr>
              <th scope="col" className={tableHeadClass}>Product</th>
              <th scope="col" className={tableHeadClass}>Category</th>
              <th scope="col" className={`${tableHeadClass} text-right`}>Price</th>
              <th scope="col" className={tableHeadClass}>Status</th>
              <th scope="col" className={`${tableHeadClass} text-right`}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.map((p) => {
              const free = p.isFree || p.price <= 0;
              return (
                <tr key={p.id} className="transition-colors hover:bg-secondary/40">
                  <td className={tableCellClass}>
                    <div className="flex min-w-0 items-center gap-3">
                      <Thumb src={p.thumbnail} title={p.title} />
                      <div className="min-w-0">
                        <Link
                          href={`/creator/${p.id}/edit`}
                          className="block max-w-[22rem] truncate font-medium text-foreground underline-offset-4 hover:underline"
                        >
                          {p.title}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">
                          <span className="font-mono">/{p.slug}</span> · {formatDate(p.createdAt)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className={`${tableCellClass} text-muted-foreground capitalize whitespace-nowrap`}>
                    {p.category}
                  </td>
                  <td
                    className={`${tableCellClass} tabular text-right font-medium whitespace-nowrap ${
                      free ? "text-success" : "text-foreground"
                    }`}
                  >
                    {free ? "Free" : formatPrice(p.price)}
                  </td>
                  <td className={tableCellClass}>
                    <StatusCell status={p.status} published={p.published} />
                  </td>
                  <td className={tableCellClass}>
                    <div className="flex items-center justify-end gap-0.5">
                      <Button asChild variant="ghost" size="icon-sm">
                        <Link
                          href={`/products/${p.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`View public page for ${p.title} (opens in a new tab)`}
                        >
                          <ExternalLink strokeWidth={1.75} />
                        </Link>
                      </Button>
                      <Button asChild variant="ghost" size="icon-sm">
                        <Link href={`/creator/${p.id}/edit`} aria-label={`Edit ${p.title}`}>
                          <Pencil strokeWidth={1.75} />
                        </Link>
                      </Button>
                      <DeleteProductButton id={p.id} title={p.title} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <nav
        aria-label="Product pages"
        className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:px-5"
      >
        <p className="tabular">
          {from}–{to} of {pagination.total.toLocaleString("en-IN")}
        </p>
        {pagination.totalPages > 1 ? (
          <div className="flex items-center gap-2">
            {pagination.prevHref ? (
              <Button asChild variant="outline" size="sm">
                <Link href={pagination.prevHref} rel="prev">
                  <ChevronLeft strokeWidth={1.75} /> Previous
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                <ChevronLeft strokeWidth={1.75} /> Previous
              </Button>
            )}
            <span className="tabular px-1">
              {pagination.page} / {pagination.totalPages}
            </span>
            {pagination.nextHref ? (
              <Button asChild variant="outline" size="sm">
                <Link href={pagination.nextHref} rel="next">
                  Next <ChevronRight strokeWidth={1.75} />
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Next <ChevronRight strokeWidth={1.75} />
              </Button>
            )}
          </div>
        ) : null}
      </nav>
    </>
  );
}
