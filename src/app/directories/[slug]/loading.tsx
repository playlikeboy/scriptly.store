import { Skeleton } from "@/components/ui/skeleton";
import { ProductGridSkeleton } from "@/app/explore/_components/skeletons";

export default function DirectoryDetailLoading() {
  return (
    <div className="bg-background" role="status" aria-label="Loading directory">
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
        <Skeleton className="h-4 w-56" />
        <div className="mt-6 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="max-w-[68ch] space-y-3">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="mt-10 h-7 w-56" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
          <div className="h-fit space-y-3 rounded-2xl border border-border bg-card p-5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-2 h-10 w-full rounded-[10px]" />
          </div>
        </div>
        <div className="mt-20 border-t border-border pt-12">
          <Skeleton className="h-7 w-72" />
          <ProductGridSkeleton count={3} className="mt-8 xl:grid-cols-3" />
        </div>
      </div>
    </div>
  );
}
