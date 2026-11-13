import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12 lg:px-8" aria-busy="true" aria-label="Loading your library">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-52 md:h-10" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-36 rounded-[10px]" />
          <Skeleton className="h-10 w-32 rounded-[10px]" />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-12 lg:grid-cols-12">
        {/* Library rows */}
        <div className="lg:col-span-8">
          <Skeleton className="mb-3 h-5 w-40" />
          <div className="divide-y divide-border border-y border-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center">
                <div className="flex flex-1 items-start gap-4">
                  <Skeleton className="aspect-[16/10] w-24 shrink-0 rounded-lg sm:w-28" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/5" />
                    <Skeleton className="h-3 w-4/5" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-32 rounded-lg" />
                  <Skeleton className="h-8 w-24 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Invoices */}
        <div className="lg:col-span-4">
          <Skeleton className="mb-3 h-5 w-36" />
          <div className="divide-y divide-border border-y border-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start justify-between gap-3 py-3">
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-4 w-14" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
