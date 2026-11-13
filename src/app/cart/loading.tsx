import { Skeleton } from "@/components/ui/skeleton";

export default function CartLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12 lg:px-8" aria-busy="true" aria-label="Loading cart">
      <Skeleton className="h-9 w-40 md:h-10" />
      <div className="mt-8 grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-7">
          <div className="flex items-center justify-between pb-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
          <div className="divide-y divide-border border-y border-border">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-4 py-5">
                <Skeleton className="aspect-[16/10] w-20 shrink-0 rounded-lg sm:w-32" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="hidden h-5 w-16 sm:block" />
              </div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-5">
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <Skeleton className="h-5 w-32" />
            <div className="mt-4 space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex justify-between border-t border-border pt-3">
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-7 w-24" />
              </div>
            </div>
            <div className="mt-5 space-y-2 border-t border-border pt-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-[10px]" />
            </div>
            <div className="mt-4 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-10 w-full rounded-[10px]" />
            </div>
            <Skeleton className="mt-5 h-12 w-full rounded-[10px]" />
          </div>
        </div>
      </div>
    </div>
  );
}
