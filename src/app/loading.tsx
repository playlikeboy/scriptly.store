import { Skeleton } from "@/components/ui/skeleton";

export default function RootLoading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="flex flex-col">
      {/* Hero */}
      <div className="border-b border-border">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 pt-12 pb-16 sm:px-6 md:pt-16 md:pb-24 lg:grid-cols-12 lg:gap-16 lg:px-8">
          <div className="flex flex-col justify-center lg:col-span-5">
            <Skeleton className="h-14 w-4/5 md:h-20" />
            <Skeleton className="mt-3 h-14 w-3/5 md:h-20" />
            <Skeleton className="mt-6 h-5 w-full max-w-md" />
            <Skeleton className="mt-2 h-5 w-2/3 max-w-sm" />
            <div className="mt-8 flex gap-3">
              <Skeleton className="h-11 w-48 rounded-[10px]" />
              <Skeleton className="h-11 w-40 rounded-[10px]" />
            </div>
            <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-36" />
              ))}
            </div>
          </div>
          <div className="lg:col-span-7">
            <Skeleton className="aspect-[16/10] w-full rounded-2xl" />
            <div className="mt-4 flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
            <div className="mt-8 grid grid-cols-1 gap-6 border-t border-border pt-6 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="aspect-[16/10] w-28 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="border-b border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:gap-12 md:py-12 lg:px-8">
          <Skeleton className="h-8 w-52 shrink-0" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-28 rounded-full" />
            ))}
          </div>
        </div>
      </div>

      {/* Product grid */}
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="mt-3 h-5 w-full max-w-lg" />
        <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="aspect-[16/10] w-full rounded-xl" />
              <Skeleton className="mt-4 h-5 w-4/5" />
              <Skeleton className="mt-2 h-4 w-full" />
              <div className="mt-4 flex items-center justify-between">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-4 w-10" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
