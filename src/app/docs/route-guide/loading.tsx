import { Skeleton } from "@/components/ui/skeleton";

export default function RouteGuideLoading() {
  return (
    <div
      className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-16 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading guide</span>
      <div className="hidden space-y-2 lg:block">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>

      <div className="min-w-0 max-w-[72ch]">
        <Skeleton className="h-4 w-40" />
        <div className="mt-8 border-b border-border pb-8">
          <Skeleton className="h-10 md:h-14 w-3/4" />
          <Skeleton className="mt-3 h-4 w-44" />
          <div className="mt-5 space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-4/5" />
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ))}
          </div>
        </div>

        <div className="pt-12">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="mt-3 h-5 w-64" />
          <div className="mt-3 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
          </div>
          <div className="mt-6 border-b border-border">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 border-t border-border py-5">
                <Skeleton className="h-6 w-4" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-56" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
