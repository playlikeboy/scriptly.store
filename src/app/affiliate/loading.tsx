import { Skeleton } from "@/components/ui/skeleton";

export default function AffiliateLoading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="border-b border-border">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-12 lg:gap-16 lg:px-8">
        <div className="space-y-6 lg:col-span-6">
          <div className="space-y-3">
            <Skeleton className="h-14 w-full max-w-lg" />
            <Skeleton className="h-14 w-3/4 max-w-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-full max-w-md" />
            <Skeleton className="h-5 w-2/3 max-w-sm" />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Skeleton className="h-12 w-full sm:w-36" />
            <Skeleton className="h-12 w-full sm:w-52" />
          </div>
          <div className="space-y-4 border-t border-border pt-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full max-w-md" />
            ))}
          </div>
        </div>
        <div className="space-y-4 lg:col-span-6">
          <Skeleton className="h-4 w-40" />
          <div className="rounded-2xl border border-border bg-card">
            <div className="space-y-7 p-5 sm:p-8">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                  <Skeleton className="h-1.5 w-full" />
                </div>
              ))}
            </div>
            <div className="space-y-3 border-t border-border p-5 sm:p-8">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-12 w-40" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
