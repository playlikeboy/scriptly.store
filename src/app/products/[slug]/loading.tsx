import { Skeleton } from "@/components/ui/skeleton";

export default function ProductDetailLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-10 lg:px-8" aria-busy="true" aria-label="Loading product">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-32" />
      </div>

      {/* Title block */}
      <div className="mt-6 max-w-4xl space-y-3 md:mt-8">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-9 w-4/5 md:h-12" />
        <Skeleton className="h-5 w-full max-w-[60ch]" />
        <Skeleton className="h-4 w-28" />
      </div>

      <div className="mt-8 grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-12">
        {/* Media + overview */}
        <div className="space-y-12 lg:col-span-7">
          <div className="space-y-4">
            <Skeleton className="aspect-[16/10] w-full rounded-2xl" />
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="aspect-video rounded-lg" />
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        </div>

        {/* Purchase panel */}
        <div className="lg:col-span-5">
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="mt-2 h-4 w-64" />
            <div className="mt-5 flex gap-2">
              <Skeleton className="h-12 flex-1 rounded-[10px]" />
              <Skeleton className="h-12 w-14 rounded-[10px] sm:w-32" />
            </div>
            <Skeleton className="mt-3 h-10 w-full rounded-[10px]" />
            <div className="mt-6 space-y-4 border-t border-border pt-5">
              <Skeleton className="h-4 w-24" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="size-4 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
