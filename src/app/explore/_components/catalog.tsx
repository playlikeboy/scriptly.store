import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight, Search, X } from "lucide-react";
import ProductCard, { type ProductCardProduct } from "@/components/marketplace/ProductCard";
import { ProductPagination } from "@/components/ProductPagination";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SortSelect } from "./SortSelect";

/* ------------------------------------------------------------------ */
/* Query parsing + URL helpers (shared by every catalog route)         */
/* ------------------------------------------------------------------ */

export type SortKey = "newest" | "rating" | "price_asc" | "price_desc" | "featured_premium";
export type PriceKey = "all" | "free" | "paid";

export const SORT_LABELS: Record<SortKey, string> = {
  featured_premium: "Featured",
  newest: "Newest",
  rating: "Top rated",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
};

export const CATALOG_SORTS: SortKey[] = ["newest", "rating", "price_asc", "price_desc"];

export function parseSort(value: string | undefined, allowed: SortKey[], fallback: SortKey): SortKey {
  return value && (allowed as string[]).includes(value) ? (value as SortKey) : fallback;
}

export function parsePrice(value: string | undefined): PriceKey {
  return value === "free" || value === "paid" ? value : "all";
}

export function parsePage(value: string | undefined): number {
  const n = parseInt(value || "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/** Builds `path?query`, dropping empty values so URLs stay canonical. */
export function buildHref(path: string, params: Record<string, string | undefined | null | false>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value);
  }
  const s = qs.toString();
  return s ? `${path}?${s}` : path;
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

export function CatalogShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="bg-background text-foreground">
      <div className={cn("mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 md:py-12 lg:px-8", className)}>
        {children}
      </div>
    </div>
  );
}

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-3.5" strokeWidth={1.75} aria-hidden="true" />}
            {item.href ? (
              <Link
                href={item.href}
                className="rounded-sm transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-foreground">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function CatalogHeader({
  breadcrumbs,
  title,
  description,
  aside,
}: {
  breadcrumbs?: Crumb[];
  title: ReactNode;
  description?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <header className="mb-8">
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 max-w-2xl">
          <h1 className="font-display text-3xl leading-tight tracking-[-0.02em] text-balance text-foreground md:text-4xl">
            {title}
          </h1>
          {description && (
            <p className="mt-3 text-base leading-relaxed text-pretty text-muted-foreground">{description}</p>
          )}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Filters                                                             */
/* ------------------------------------------------------------------ */

export interface ChipLink {
  label: string;
  href: string;
  active: boolean;
}

/** Horizontal, scrollable link chips (categories / subcategories). */
export function ChipNav({ label, items, size = "md" }: { label: string; items: ChipLink[]; size?: "sm" | "md" }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label={label} className="-mx-4 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0">
      <ul className="flex w-max items-center gap-1.5 pb-1">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "inline-flex items-center rounded-full border whitespace-nowrap transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                size === "md" ? "h-9 px-3.5 text-sm" : "h-8 px-3 text-[13px]",
                item.active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground hover:border-foreground/25 hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function CatalogToolbar({
  action,
  hidden = {},
  search,
  searchPlaceholder = "Search products",
  price,
  sort,
}: {
  action: string;
  /** Hidden GET fields preserved on search submit (category, sub, price…). */
  hidden?: Record<string, string | undefined | null | false>;
  search: string;
  searchPlaceholder?: string;
  price?: { current: PriceKey; hrefFor: (p: PriceKey) => string };
  sort?: { current: SortKey; options: SortKey[]; hrefFor: (s: SortKey) => string };
}) {
  const priceOptions: { value: PriceKey; label: string }[] = [
    { value: "all", label: "All" },
    { value: "free", label: "Free" },
    { value: "paid", label: "Paid" },
  ];

  return (
    <div className="flex flex-col gap-3 border-y border-border py-3 lg:flex-row lg:items-center lg:justify-between">
      <form method="GET" action={action} role="search" className="flex w-full min-w-0 items-center gap-2 lg:max-w-md">
        {Object.entries(hidden).map(([name, value]) =>
          value ? <input key={name} type="hidden" name={name} value={value} /> : null
        )}
        {sort && <input type="hidden" name="sort" value={sort.current} />}
        <div className="relative min-w-0 flex-1">
          <label htmlFor="catalog-search" className="sr-only">
            {searchPlaceholder}
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <input
            id="catalog-search"
            type="search"
            name="search"
            defaultValue={search}
            placeholder={searchPlaceholder}
            enterKeyHint="search"
            className="h-10 w-full min-w-0 rounded-[10px] border border-input bg-card pl-9 pr-3 text-sm text-foreground outline-none transition-colors duration-150 placeholder:text-muted-foreground hover:border-foreground/25 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>
        <Button type="submit" variant="default" className="shrink-0">
          Search
        </Button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3 lg:justify-end">
        {price && (
          <nav aria-label="Filter by price">
            <ul className="flex items-center rounded-[10px] bg-secondary p-0.5">
              {priceOptions.map((p) => {
                const active = price.current === p.value;
                return (
                  <li key={p.value}>
                    <Link
                      href={price.hrefFor(p.value)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "inline-flex h-9 items-center rounded-lg px-3 text-sm transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active
                          ? "bg-card text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.06)]"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {p.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
        {sort && (
          <SortSelect
            key={sort.current}
            value={sort.current}
            options={sort.options.map((s) => ({ value: s, label: SORT_LABELS[s], href: sort.hrefFor(s) }))}
          />
        )}
      </div>
    </div>
  );
}

export interface ActiveFilter {
  label: string;
  removeHref: string;
}

export function ActiveFilters({ filters, clearHref }: { filters: ActiveFilter[]; clearHref: string }) {
  if (filters.length === 0) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">Filtered by</span>
      <ul className="flex flex-wrap items-center gap-1.5">
        {filters.map((f) => (
          <li key={f.label}>
            <Link
              href={f.removeHref}
              aria-label={`Remove filter: ${f.label}`}
              className="inline-flex h-7 max-w-[16rem] items-center gap-1 rounded-full bg-secondary pl-3 pr-2 text-[13px] text-foreground transition-colors duration-150 outline-none hover:bg-secondary/70 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="truncate">{f.label}</span>
              <X className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href={clearHref}
        className="rounded-sm text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Clear all
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Results                                                             */
/* ------------------------------------------------------------------ */

export function ResultCount({
  total,
  page,
  limit,
  noun = "product",
}: {
  total: number;
  page: number;
  limit: number;
  noun?: string;
}) {
  const plural = total === 1 ? noun : `${noun}s`;
  if (total === 0) {
    return <p className="text-sm text-muted-foreground">No {noun}s</p>;
  }
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  return (
    <p className="text-sm tabular-nums text-muted-foreground" aria-live="polite">
      {start > total ? (
        <>
          {total.toLocaleString("en-IN")} {plural}
        </>
      ) : (
        <>
          Showing <span className="text-foreground">{start.toLocaleString("en-IN")}</span>–
          <span className="text-foreground">{end.toLocaleString("en-IN")}</span> of{" "}
          <span className="text-foreground">{total.toLocaleString("en-IN")}</span> {plural}
        </>
      )}
    </p>
  );
}

export const PRODUCT_GRID_CLASS =
  "grid grid-cols-1 gap-x-6 gap-y-10 min-[520px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

export function ProductGrid({
  products,
  categoryNames,
  className,
}: {
  products: ProductCardProduct[];
  /** slug → display name */
  categoryNames?: Map<string, string> | Record<string, string>;
  className?: string;
}) {
  const nameFor = (slug: string) => {
    if (!categoryNames) return slug;
    if (categoryNames instanceof Map) return categoryNames.get(slug) ?? slug;
    return categoryNames[slug] ?? slug;
  };
  return (
    <ul className={cn(PRODUCT_GRID_CLASS, className)}>
      {products.map((p) => (
        <li key={p.id} className="flex">
          <ProductCard product={p} categoryName={nameFor(p.category)} />
        </li>
      ))}
    </ul>
  );
}

export function CatalogEmpty({
  title,
  body,
  action,
}: {
  title: string;
  body?: ReactNode;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl bg-secondary/60 px-6 py-12 sm:items-center sm:px-10 sm:text-center">
      <h2 className="text-lg font-medium text-foreground">{title}</h2>
      {body && <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{body}</p>}
      {action && (
        <Button asChild variant="outline" className="mt-2">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}

export function CatalogPagination({ totalPages, currentPage }: { totalPages: number; currentPage: number }) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-12 border-t border-border pt-6">
      <ProductPagination totalPages={totalPages} currentPage={currentPage} />
    </div>
  );
}

/** Builds a slug → name map once per request. */
export function categoryNameMap(categories: { slug: string; name: string }[]): Map<string, string> {
  return new Map(categories.map((c) => [c.slug, c.name]));
}
