import { Skeleton } from "@/components/ui/skeleton";

export default function AffiliateDashboardLoading() {
  return (
    <div aria-busy="true" aria-label="Loading affiliate dashboard" className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 md:py-12 lg:px-8">
      <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2.5">
          <Skeleton className="h-9 w-64 max-w-full" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-6 w-36 rounded-full" />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-64 max-w-full" />
        </div>
        <Skeleton className="h-8 w-28" />
      </div>

      <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`space-y-2 p-4 sm:p-5 ${i % 2 === 1 ? "border-l border-border" : ""} ${
              i >= 2 ? "border-t border-border lg:border-t-0" : ""
            } ${i === 2 ? "lg:border-l" : ""}`}
          >
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-24" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-2xl border border-border bg-card lg:col-span-7">
          <div className="border-b border-border px-4 py-3.5 sm:px-5">
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="p-4">
            <Skeleton className="h-60 w-full" />
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card lg:col-span-5">
          <div className="border-b border-border px-4 py-3.5 sm:px-5">
            <Skeleton className="h-4 w-36" />
          </div>
          <div className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5">
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-4 w-14" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-col gap-4 border-b border-border px-4 py-4 sm:flex-row sm:justify-between sm:px-5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-10 w-full sm:w-80" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 sm:px-5">
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-14" />
              <Skeleton className="hidden h-4 w-10 sm:block" />
              <Skeleton className="size-8" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
