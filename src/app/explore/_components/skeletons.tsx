import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { PRODUCT_GRID_CLASS } from "./catalog";

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="aspect-[16/10] w-full rounded-xl" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-full" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="size-8 rounded-lg" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8, className }: { count?: number; className?: string }) {
  return (
    <div className={cn(PRODUCT_GRID_CLASS, className)} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function CatalogHeaderSkeleton({ crumbs = false, aside = false }: { crumbs?: boolean; aside?: boolean }) {
  return (
    <div className="mb-8">
      {crumbs && <Skeleton className="mb-4 h-4 w-48" />}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="w-full max-w-2xl space-y-3">
          <Skeleton className="h-9 w-2/3 max-w-sm md:h-10" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        {aside && <Skeleton className="h-4 w-40" />}
      </div>
    </div>
  );
}

export function ChipNavSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex gap-1.5 overflow-hidden pb-1">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-24 shrink-0 rounded-full" />
      ))}
    </div>
  );
}

export function ToolbarSkeleton({ price = true, sort = true }: { price?: boolean; sort?: boolean }) {
  return (
    <div className="flex flex-col gap-3 border-y border-border py-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex w-full gap-2 lg:max-w-md">
        <Skeleton className="h-10 flex-1 rounded-[10px]" />
        <Skeleton className="h-10 w-20 rounded-[10px]" />
      </div>
      <div className="flex items-center justify-between gap-3 lg:justify-end">
        {price && <Skeleton className="h-10 w-40 rounded-[10px]" />}
        {sort && <Skeleton className="h-10 w-44 rounded-[10px]" />}
      </div>
    </div>
  );
}

/** Full catalog page skeleton: header, chips, toolbar, count, grid. */
export function CatalogPageSkeleton({
  crumbs = false,
  chips = true,
  toolbar = true,
  price = true,
  sort = true,
  count = 8,
}: {
  crumbs?: boolean;
  chips?: boolean;
  toolbar?: boolean;
  price?: boolean;
  sort?: boolean;
  count?: number;
}) {
  return (
    <div className="bg-background" role="status" aria-label="Loading products">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 md:py-12 lg:px-8">
        <CatalogHeaderSkeleton crumbs={crumbs} />
        {chips && (
          <div className="mb-6">
            <ChipNavSkeleton />
          </div>
        )}
        {toolbar && <ToolbarSkeleton price={price} sort={sort} />}
        <Skeleton className="mb-6 mt-6 h-4 w-48" />
        <ProductGridSkeleton count={count} />
      </div>
    </div>
  );
}
