import { Skeleton } from "@/components/ui/skeleton";

export default function HireMeLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-16 md:pt-24 md:pb-24">
        <div className="grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_auto] md:gap-16">
          <div>
            <Skeleton className="h-12 md:h-16 w-64 max-w-full" />
            <Skeleton className="mt-3 h-12 md:h-16 w-96 max-w-full" />
            <div className="mt-6 space-y-2">
              <Skeleton className="h-5 w-full max-w-[58ch]" />
              <Skeleton className="h-5 w-4/5 max-w-[46ch]" />
            </div>
            <Skeleton className="mt-5 h-4 w-32" />
            <div className="mt-6 flex flex-wrap gap-3">
              <Skeleton className="h-11 w-48 rounded-[10px]" />
              <Skeleton className="h-11 w-44 rounded-[10px]" />
            </div>
          </div>
          <Skeleton className="order-first size-28 rounded-2xl md:order-none md:size-60" />
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto grid max-w-7xl gap-14 px-4 sm:px-6 lg:px-8 py-16 md:py-24 lg:grid-cols-12 lg:gap-16">
          <div className="space-y-4 lg:col-span-5">
            <Skeleton className="mb-8 h-8 w-40" />
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-11/12" />
            ))}
          </div>
          <div className="lg:col-span-7">
            <Skeleton className="mb-8 h-8 w-64" />
            <div className="divide-y divide-border border-y border-border">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-4">
                  <Skeleton className="size-9 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3.5 w-52 max-w-full" />
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
