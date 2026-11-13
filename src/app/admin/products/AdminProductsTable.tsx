"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, Eye, EyeOff, Loader2, Package, Star, StarOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AdminActions } from "@/app/admin/products/AdminActions";
import { AdminEmptyState, AdminPager, formatAdminDate, td, th } from "@/app/admin/_components/admin-ui";
import { formatPrice } from "@/lib/price-utils";
import { cn } from "@/lib/utils";
import {
  bulkDeleteProductsAction,
  bulkSetProductsFeaturedAction,
  bulkSetProductsPublishAction,
  toggleProductFeaturedAction,
  toggleProductPublishAction,
} from "@/lib/actions/products";

export interface AdminProductItem {
  id: string;
  title: string;
  slug: string;
  category: string;
  price: number;
  published: boolean;
  featured: boolean;
  version: string;
  thumbnail: string | null;
  createdAt: Date | string;
}

interface AdminProductsTableProps {
  products: AdminProductItem[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  limit: number;
  currentSearch: string;
  pagerParams: Record<string, string | undefined>;
}

function Thumb({ src, className }: { src: string | null; className?: string }) {
  return (
    <div className={cn("shrink-0 overflow-hidden rounded-md bg-muted", className)}>
      {src ? (
        <img src={src} alt="" width={64} height={40} loading="lazy" decoding="async" className="size-full object-cover" />
      ) : (
        <div className="flex size-full items-center justify-center">
          <Package aria-hidden="true" strokeWidth={1.75} className="size-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

function Price({ paise }: { paise: number }) {
  return (
    <span className={cn("font-medium whitespace-nowrap tabular-nums", paise <= 0 ? "text-success" : "text-foreground")}>
      {formatPrice(paise)}
    </span>
  );
}

const checkboxClass =
  "size-4 cursor-pointer rounded border-input accent-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card";

export default function AdminProductsTable({
  products,
  totalCount,
  currentPage,
  totalPages,
  limit,
  currentSearch,
  pagerParams,
}: AdminProductsTableProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkPending, startBulk] = useTransition();
  const [, startRow] = useTransition();
  const [rowPending, setRowPending] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const selectedCount = selectedIds.length;
  const isAllSelected = products.length > 0 && products.every((p) => selectedIds.includes(p.id));
  const isSomeSelected = !isAllSelected && products.some((p) => selectedIds.includes(p.id));

  function toggleSelectAll() {
    setSelectedIds(isAllSelected ? [] : products.map((p) => p.id));
  }

  function toggleSelect(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function runBulk(action: () => Promise<unknown>, success: string) {
    if (!selectedCount) return;
    startBulk(async () => {
      try {
        await action();
        setSelectedIds([]);
        toast.success(success);
        router.refresh();
      } catch (error) {
        console.error(error);
        toast.error("The bulk update failed. Try again.");
      }
    });
  }

  function handleBulkDelete() {
    const noun = `product${selectedCount === 1 ? "" : "s"}`;
    if (!window.confirm(`Delete ${selectedCount} selected ${noun} permanently? This cannot be undone.`)) return;
    runBulk(() => bulkDeleteProductsAction(selectedIds), `${selectedCount} ${noun} deleted`);
  }

  function handleCopyId(id: string) {
    navigator.clipboard
      .writeText(id)
      .then(() => {
        setCopiedId(id);
        window.setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1800);
      })
      .catch(() => toast.error("Could not copy the product ID"));
  }

  function runRow(id: string, action: () => Promise<unknown>, success: string, failure: string) {
    setRowPending(id);
    startRow(async () => {
      try {
        await action();
        toast.success(success);
        router.refresh();
      } catch (error) {
        console.error(error);
        toast.error(failure);
      } finally {
        setRowPending(null);
      }
    });
  }

  const togglePublish = (p: AdminProductItem) =>
    runRow(p.id, () => toggleProductPublishAction(p.id), p.published ? "Moved to drafts" : "Product published", "Could not update visibility");

  const toggleFeatured = (p: AdminProductItem) =>
    runRow(p.id, () => toggleProductFeaturedAction(p.id), p.featured ? "Removed from Featured" : "Added to Featured", "Could not update featured status");

  if (totalCount === 0 || products.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card">
        <AdminEmptyState
          icon={Package}
          title={currentSearch ? `No products match “${currentSearch}”` : "No products in this view"}
          description="Try another search or switch the status filter."
        />
      </div>
    );
  }

  const visibilityToggle = (p: AdminProductItem, className?: string) => (
    <button
      type="button"
      role="switch"
      aria-checked={p.published}
      aria-label={`Published: ${p.title}`}
      title={p.published ? "Move to drafts" : "Publish"}
      disabled={rowPending === p.id}
      onClick={() => togglePublish(p)}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium whitespace-nowrap transition-colors outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        p.published ? "text-success" : "text-muted-foreground",
        className
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", p.published ? "bg-success" : "bg-muted-foreground/60")} />
      {p.published ? "Published" : "Draft"}
    </button>
  );

  const featuredToggle = (p: AdminProductItem, className?: string) => (
    <button
      type="button"
      role="switch"
      aria-checked={p.featured}
      aria-label={`Featured: ${p.title}`}
      title={p.featured ? "Remove from Featured" : "Add to Featured"}
      disabled={rowPending === p.id}
      onClick={() => toggleFeatured(p)}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium whitespace-nowrap transition-colors outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        p.featured ? "text-primary" : "text-muted-foreground hover:text-foreground",
        className
      )}
    >
      {rowPending === p.id ? (
        <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
      ) : (
        <Star aria-hidden="true" className={cn("size-3.5", p.featured && "fill-current")} />
      )}
      {p.featured ? "Featured" : "Feature"}
    </button>
  );

  const copyId = (id: string) => (
    <button
      type="button"
      onClick={() => handleCopyId(id)}
      aria-label="Copy product ID"
      className="inline-flex items-center gap-1 rounded px-1 font-mono text-[11px] text-muted-foreground transition-colors outline-none hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      {copiedId === id ? <Check aria-hidden="true" className="size-3 text-success" /> : <Copy aria-hidden="true" className="size-3" />}
      {copiedId === id ? "Copied" : id.slice(0, 8)}
    </button>
  );

  return (
    <div className="space-y-3">
      {selectedCount > 0 ? (
        <div
          role="region"
          aria-label="Bulk actions"
          className="sticky top-[7.75rem] z-20 flex flex-col gap-2 rounded-2xl bg-card px-4 py-3 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.18)] sm:flex-row sm:items-center sm:justify-between lg:top-20"
        >
          <div className="flex items-center gap-3 text-sm">
            <span className="font-medium tabular-nums">{selectedCount} selected</span>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:underline"
            >
              Clear
            </button>
            {isBulkPending ? <Loader2 aria-label="Updating" className="size-4 animate-spin text-muted-foreground" /> : null}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" variant="outline" disabled={isBulkPending} onClick={() => runBulk(() => bulkSetProductsPublishAction(selectedIds, true), "Products published")}>
              <Eye aria-hidden="true" /> Publish
            </Button>
            <Button size="sm" variant="outline" disabled={isBulkPending} onClick={() => runBulk(() => bulkSetProductsPublishAction(selectedIds, false), "Moved to drafts")}>
              <EyeOff aria-hidden="true" /> Draft
            </Button>
            <Button size="sm" variant="outline" disabled={isBulkPending} onClick={() => runBulk(() => bulkSetProductsFeaturedAction(selectedIds, true), "Products featured")}>
              <Star aria-hidden="true" /> Feature
            </Button>
            <Button size="sm" variant="outline" disabled={isBulkPending} onClick={() => runBulk(() => bulkSetProductsFeaturedAction(selectedIds, false), "Products unfeatured")}>
              <StarOff aria-hidden="true" /> Unfeature
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isBulkPending}
              onClick={handleBulkDelete}
              className="text-destructive hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 aria-hidden="true" /> Delete
            </Button>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {/* Desktop table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr>
                <th scope="col" className={cn(th, "w-10 pr-0")}>
                  <input
                    type="checkbox"
                    aria-label="Select all products on this page"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isSomeSelected;
                    }}
                    onChange={toggleSelectAll}
                    className={checkboxClass}
                  />
                </th>
                <th scope="col" className={th}>Product</th>
                <th scope="col" className={cn(th, "hidden xl:table-cell")}>Category</th>
                <th scope="col" className={cn(th, "text-right")}>Price</th>
                <th scope="col" className={th}>Visibility</th>
                <th scope="col" className={th}>Featured</th>
                <th scope="col" className={cn(th, "text-right")}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((p) => {
                const selected = selectedIds.includes(p.id);
                return (
                  <tr key={p.id} className={cn("transition-colors", selected ? "bg-secondary/60" : "hover:bg-secondary/40")}>
                    <td className={cn(td, "w-10 pr-0")}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${p.title}`}
                        checked={selected}
                        onChange={() => toggleSelect(p.id)}
                        className={checkboxClass}
                      />
                    </td>
                    <td className={cn(td, "max-w-0 w-full")}>
                      <div className="flex min-w-0 items-center gap-3">
                        <Thumb src={p.thumbnail} className="h-10 w-16" />
                        <div className="min-w-0">
                          <Link
                            href={`/admin/products/${p.id}/edit`}
                            className="block truncate font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:underline"
                          >
                            {p.title}
                          </Link>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                            <span className="xl:hidden">{p.category}</span>
                            <span className="font-mono text-[11px]">v{p.version}</span>
                            <span>{formatAdminDate(p.createdAt)}</span>
                            {copyId(p.id)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className={cn(td, "hidden text-muted-foreground xl:table-cell")}>
                      <span className="whitespace-nowrap">{p.category}</span>
                    </td>
                    <td className={cn(td, "text-right")}>
                      <Price paise={p.price} />
                    </td>
                    <td className={cn(td, "pl-2")}>
                      {visibilityToggle(p)}
                    </td>
                    <td className={cn(td, "pl-2")}>
                      {featuredToggle(p)}
                    </td>
                    <td className={cn(td, "text-right")}>
                      <AdminActions productId={p.id} productSlug={p.slug} productTitle={p.title} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile list */}
        <div className="md:hidden">
          <div className="flex items-center gap-3 border-b border-border px-4 py-2.5">
            <input
              id="select-all-mobile"
              type="checkbox"
              checked={isAllSelected}
              ref={(el) => {
                if (el) el.indeterminate = isSomeSelected;
              }}
              onChange={toggleSelectAll}
              className={checkboxClass}
            />
            <label htmlFor="select-all-mobile" className="text-xs text-muted-foreground">
              Select all on this page
            </label>
          </div>
          <ul className="divide-y divide-border">
            {products.map((p) => {
              const selected = selectedIds.includes(p.id);
              return (
                <li key={p.id} className={cn("px-4 py-3", selected && "bg-secondary/60")}>
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      aria-label={`Select ${p.title}`}
                      checked={selected}
                      onChange={() => toggleSelect(p.id)}
                      className={cn(checkboxClass, "mt-3")}
                    />
                    <Thumb src={p.thumbnail} className="h-12 w-[4.5rem]" />
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/products/${p.id}/edit`} className="line-clamp-2 text-sm leading-snug font-medium text-foreground">
                        {p.title}
                      </Link>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {p.category} · <Price paise={p.price} />
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-1 pl-7">
                    <div className="-ml-2 flex flex-wrap items-center">
                      {visibilityToggle(p)}
                      {featuredToggle(p)}
                      {copyId(p.id)}
                    </div>
                    <AdminActions productId={p.id} productSlug={p.slug} productTitle={p.title} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <AdminPager
          basePath="/admin/products"
          params={pagerParams}
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={limit}
          noun="products"
        />
      </div>
    </div>
  );
}
