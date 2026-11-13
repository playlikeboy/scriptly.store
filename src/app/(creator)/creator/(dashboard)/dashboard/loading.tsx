import { Skeleton } from "@/components/ui/skeleton";
import { HeaderSkeleton, StatStripSkeleton } from "../_components/skeletons";

function ListPanel({ className }: { className: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-card ${className}`}>
      <div className="flex justify-between border-b border-border px-4 py-3.5 sm:px-5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5">
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-2/3 max-w-[14rem]" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CreatorOverviewLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading overview">
      <HeaderSkeleton withAction />
      <Skeleton className="h-14 w-full rounded-2xl" />
      <StatStripSkeleton />
      <div className="rounded-2xl border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:justify-between sm:px-5">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-9 w-56" />
        </div>
        <div className="p-4">
          <Skeleton className="h-60 w-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <ListPanel className="lg:col-span-7" />
        <ListPanel className="lg:col-span-5" />
      </div>
    </div>
  );
}
