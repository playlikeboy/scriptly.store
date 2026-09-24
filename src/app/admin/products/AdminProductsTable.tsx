"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Check,
  CheckSquare,
  Copy,
  Eye,
  EyeOff,
  MinusSquare,
  Package,
  Star,
  Square,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminActions } from "@/app/admin/products/AdminActions";
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
  allCount: number;
  publishedCount: number;
  draftCount: number;
  featuredCount: number;
  notFeaturedCount: number;
  currentPage: number;
  totalPages: number;
  limit: number;
  currentStatus: string;
  currentSearch: string;
}

const filterOptions = [
  { value: "all", label: "All", key: "allCount" },
  { value: "published", label: "Published", key: "publishedCount" },
  { value: "draft", label: "Drafts", key: "draftCount" },
  { value: "featured", label: "Featured", key: "featuredCount" },
  { value: "unfeatured", label: "Not featured", key: "notFeaturedCount" },
] as const;

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price / 100);
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getPageNumbers(currentPage: number, totalPages: number) {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
  return Array.from(pages).filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
}

export default function AdminProductsTable({
  products,
  totalCount,
  allCount,
  publishedCount,
  draftCount,
  featuredCount,
  notFeaturedCount,
  currentPage,
  totalPages,
  limit,
  currentStatus,
  currentSearch,
}: AdminProductsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const counts = useMemo(
    () => ({
      allCount,
      publishedCount,
      draftCount,
      featuredCount,
      notFeaturedCount,
    }),
    [allCount, publishedCount, draftCount, featuredCount, notFeaturedCount]
  );

  const selectedCount = selectedIds.length;
  const isAllOnPageSelected =
    products.length > 0 && products.every((product) => selectedIds.includes(product.id));
  const isSomeSelected =
    products.some((product) => selectedIds.includes(product.id)) && !isAllOnPageSelected;

  function updateQuery(params: URLSearchParams) {
    params.delete("page");
    router.push(`/admin/products?${params.toString()}`, { scroll: false });
  }

  function handleFilterTab(status: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (status === "all") params.delete("status");
    else params.set("status", status);
    setSelectedIds([]);
    updateQuery(params);
  }

  function toggleSelectAll() {
    if (isAllOnPageSelected) {
      setSelectedIds((current) => current.filter((id) => !products.some((product) => product.id === id)));
      return;
    }
    setSelectedIds((current) => Array.from(new Set([...current, ...products.map((product) => product.id)])));
  }

  function toggleSelect(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  async function runBulkAction(action: () => Promise<unknown>, success: string) {
    if (!selectedCount) return;
    startTransition(async () => {
      try {
        await action();
        setSelectedIds([]);
        toast.success(success);
        router.refresh();
      } catch (error) {
        console.error(error);
        toast.error("The bulk update failed. Please try again.");
      }
    });
  }

  function handleBulkDelete() {
    if (!selectedCount) return;
    const message = `Delete ${selectedCount} selected product${selectedCount === 1 ? "" : "s"} permanently?`;
    if (!window.confirm(message)) return;
    runBulkAction(() => bulkDeleteProductsAction(selectedIds), `${selectedCount} product${selectedCount === 1 ? "" : "s"} deleted`);
  }

  function handleCopyId(id: string) {
    navigator.clipboard
      .writeText(id)
      .then(() => {
        setCopiedId(id);
        window.setTimeout(() => setCopiedId(null), 1800);
      })
      .catch(() => toast.error("Could not copy product ID"));
  }

  function togglePublish(id: string) {
    startTransition(async () => {
      try {
        const product = products.find((item) => item.id === id);
        await toggleProductPublishAction(id);
        toast.success(product?.published ? "Product moved to draft" : "Product published");
        router.refresh();
      } catch (error) {
        console.error(error);
        toast.error("Could not update visibility");
      }
    });
  }

  function toggleFeatured(id: string) {
    startTransition(async () => {
      try {
        const product = products.find((item) => item.id === id);
        await toggleProductFeaturedAction(id);
        toast.success(product?.featured ? "Removed from Featured" : "Added to Featured");
        router.refresh();
      } catch (error) {
        console.error(error);
        toast.error("Could not update featured status");
      }
    });
  }

  const pageStart = totalCount === 0 ? 0 : (currentPage - 1) * limit + 1;
  const pageEnd = Math.min((currentPage - 1) * limit + products.length, totalCount);
  const pageNumbers = getPageNumbers(currentPage, totalPages);

  function pageHref(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) params.delete("page");
    else params.set("page", String(page));
    return `/admin/products?${params.toString()}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none]">
        {filterOptions.map((filter) => {
          const active = currentStatus === filter.value;
          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => handleFilterTab(filter.value)}
              className={[
                "shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                active
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              ].join(" ")}
            >
              {filter.label}
              <span className={active ? "ml-1.5 opacity-70" : "ml-1.5 text-muted-foreground/70"}>
                {counts[filter.key]}
              </span>
            </button>
          );
        })}
      </div>

      {selectedCount > 0 && (
        <div className="sticky top-3 z-20 flex flex-col gap-3 rounded-xl border border-border/60 bg-background/95 p-3 shadow-lg backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold">
              {selectedCount} selected
            </span>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-[11px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Clear
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button size="sm" variant="outline" disabled={isPending} onClick={() => runBulkAction(() => bulkSetProductsPublishAction(selectedIds, true), "Products published")}>
              <Eye className="mr-1.5 h-3.5 w-3.5" /> Publish
            </Button>
            <Button size="sm" variant="outline" disabled={isPending} onClick={() => runBulkAction(() => bulkSetProductsPublishAction(selectedIds, false), "Products moved to draft")}>
              <EyeOff className="mr-1.5 h-3.5 w-3.5" /> Draft
            </Button>
            <Button size="sm" variant="outline" disabled={isPending} onClick={() => runBulkAction(() => bulkSetProductsFeaturedAction(selectedIds, true), "Products featured")}>
              <Star className="mr-1.5 h-3.5 w-3.5" /> Feature
            </Button>
            <Button size="sm" variant="outline" disabled={isPending} onClick={() => runBulkAction(() => bulkSetProductsFeaturedAction(selectedIds, false), "Products unfeatured")}>
              <Star className="mr-1.5 h-3.5 w-3.5" /> Unfeature
            </Button>
            <Button size="sm" variant="outline" disabled={isPending} onClick={handleBulkDelete} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
            </Button>
          </div>
        </div>
      )}

      {totalCount === 0 ? (
        <Card className="border-dashed bg-card/30">
          <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
            <Package className="mb-3 h-9 w-9 text-muted-foreground/35" />
            <p className="text-sm font-semibold">{currentSearch ? `No products match “${currentSearch}”.` : "No products match this filter."}</p>
            <p className="mt-1 max-w-md text-xs text-muted-foreground">
              Try another search or switch the catalog filter.
            </p>
          </div>
        </Card>
      ) : (
        <>
          <Card className="hidden overflow-hidden border-border/60 bg-card/40 shadow-sm md:block">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/35 hover:bg-muted/35">
                    <TableHead className="w-12 px-3">
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        aria-label="Select all products on this page"
                        className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        {isAllOnPageSelected ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : isSomeSelected ? (
                          <MinusSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead className="min-w-[320px] text-xs font-semibold">Product</TableHead>
                    <TableHead className="text-xs font-semibold">Category</TableHead>
                    <TableHead className="text-xs font-semibold">Price</TableHead>
                    <TableHead className="text-xs font-semibold">Visibility</TableHead>
                    <TableHead className="text-xs font-semibold">Spotlight</TableHead>
                    <TableHead className="w-[136px] text-right text-xs font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => {
                    const selected = selectedIds.includes(product.id);
                    return (
                      <TableRow key={product.id} className={selected ? "bg-primary/5" : ""}>
                        <TableCell className="px-3">
                          <button
                            type="button"
                            onClick={() => toggleSelect(product.id)}
                            aria-label={`Select ${product.title}`}
                            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            {selected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
                          </button>
                        </TableCell>

                        <TableCell className="py-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted">
                              {product.thumbnail ? (
                                <img src={product.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" />
                              ) : (
                                <div className="flex h-full items-center justify-center text-[9px] font-semibold text-muted-foreground">NO IMAGE</div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <Link
                                href={`/admin/products/${product.id}/edit`}
                                className="block truncate text-sm font-semibold hover:text-primary"
                              >
                                {product.title}
                              </Link>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                                <span>{product.category}</span>
                                <span aria-hidden="true">·</span>
                                <span>v{product.version}</span>
                                <span aria-hidden="true">·</span>
                                <span>{formatDate(product.createdAt)}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyId(product.id)}
                                  className="inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-muted hover:text-foreground"
                                  title="Copy product ID"
                                >
                                  {copiedId === product.id ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                                  ID
                                </button>
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge variant="secondary" className="rounded-full text-[10px] font-medium">
                            {product.category}
                          </Badge>
                        </TableCell>

                        <TableCell className="whitespace-nowrap text-sm font-semibold tabular-nums">
                          {formatPrice(product.price)}
                        </TableCell>

                        <TableCell>
                          <button
                            type="button"
                            onClick={() => togglePublish(product.id)}
                            disabled={isPending}
                            role="switch"
                            aria-checked={product.published}
                            title={product.published ? "Click to move to draft" : "Click to publish"}
                            className={[
                              "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors disabled:opacity-50",
                              product.published
                                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
                            ].join(" ")}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${product.published ? "bg-emerald-500" : "bg-amber-500"}`} />
                            {product.published ? "Published" : "Draft"}
                          </button>
                        </TableCell>

                        <TableCell>
                          <button
                            type="button"
                            onClick={() => toggleFeatured(product.id)}
                            disabled={isPending}
                            role="switch"
                            aria-checked={product.featured}
                            title={product.featured ? "Remove from Featured" : "Add to Featured"}
                            className={[
                              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors disabled:opacity-50",
                              product.featured
                                ? "border-primary/25 bg-primary/10 text-primary"
                                : "border-border/70 bg-background text-muted-foreground hover:border-primary/30 hover:text-primary",
                            ].join(" ")}
                          >
                            <Star className={`h-3.5 w-3.5 ${product.featured ? "fill-current" : ""}`} />
                            {product.featured ? "Featured" : "Feature"}
                          </button>
                        </TableCell>

                        <TableCell className="text-right">
                          <AdminActions productId={product.id} productSlug={product.slug} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>

          <div className="space-y-3 md:hidden">
            {products.map((product) => {
              const selected = selectedIds.includes(product.id);
              return (
                <Card key={product.id} className={selected ? "border-primary/35 bg-primary/5" : "border-border/60 bg-card/40"}>
                  <div className="p-3.5">
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => toggleSelect(product.id)}
                        aria-label={`Select ${product.title}`}
                        className="mt-1 shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        {selected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
                      </button>
                      <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted">
                        {product.thumbnail ? (
                          <img src={product.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[9px] font-semibold text-muted-foreground">NO IMAGE</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link href={`/admin/products/${product.id}/edit`} className="line-clamp-2 text-sm font-semibold leading-snug hover:text-primary">
                          {product.title}
                        </Link>
                        <p className="mt-1 truncate text-[10px] text-muted-foreground">
                          {product.category} · v{product.version} · {formatPrice(product.price)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => togglePublish(product.id)}
                        disabled={isPending}
                        className={[
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-semibold",
                          product.published
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
                        ].join(" ")}
                      >
                        {product.published ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                        {product.published ? "Published" : "Draft"}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleFeatured(product.id)}
                        disabled={isPending}
                        className={[
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-semibold",
                          product.featured
                            ? "border-primary/25 bg-primary/10 text-primary"
                            : "border-border/70 text-muted-foreground",
                        ].join(" ")}
                      >
                        <Star className={`h-3 w-3 ${product.featured ? "fill-current" : ""}`} />
                        {product.featured ? "Featured" : "Feature"}
                      </button>
                      <Badge variant="secondary" className="rounded-full text-[10px]">{product.category}</Badge>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3">
                      <button
                        type="button"
                        onClick={() => handleCopyId(product.id)}
                        className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                      >
                        {copiedId === product.id ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                        {copiedId === product.id ? "Copied" : product.id.slice(0, 8) + "…"}
                      </button>
                      <AdminActions productId={product.id} productSlug={product.slug} />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/30 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{pageStart}–{pageEnd}</span> of{" "}
                <span className="font-semibold text-foreground">{totalCount}</span>
              </p>
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <Button asChild variant="outline" size="sm" className="shrink-0 rounded-lg" disabled={currentPage <= 1}>
                  <Link href={pageHref(currentPage - 1)} aria-disabled={currentPage <= 1} className={currentPage <= 1 ? "pointer-events-none opacity-40" : ""}>
                    Previous
                  </Link>
                </Button>
                {pageNumbers.map((page, index) => {
                  const previous = pageNumbers[index - 1];
                  const showGap = previous && page - previous > 1;
                  return (
                    <span key={page} className="contents">
                      {showGap && <span className="px-1 text-muted-foreground">…</span>}
                      <Button asChild variant={page === currentPage ? "default" : "outline"} size="sm" className="h-9 w-9 shrink-0 rounded-lg p-0">
                        <Link href={pageHref(page)} aria-current={page === currentPage ? "page" : undefined}>{page}</Link>
                      </Button>
                    </span>
                  );
                })}
                <Button asChild variant="outline" size="sm" className="shrink-0 rounded-lg" disabled={currentPage >= totalPages}>
                  <Link href={pageHref(currentPage + 1)} aria-disabled={currentPage >= totalPages} className={currentPage >= totalPages ? "pointer-events-none opacity-40" : ""}>
                    Next
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
