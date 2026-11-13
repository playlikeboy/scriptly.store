import { Skeleton } from "@/components/ui/skeleton";
import { CatalogHeaderSkeleton, ProductGridSkeleton } from "@/app/explore/_components/skeletons";

export default function StoreLoading() {
  return (
    <div className="bg-background" role="status" aria-label="Loading storefront">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 md:py-12 lg:px-8">
        <CatalogHeaderSkeleton crumbs />
        <div className="mb-6 flex items-baseline justify-between border-t border-border pt-6">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-40" />
        </div>
        <ProductGridSkeleton count={8} />
      </div>
    </div>
  );
}
