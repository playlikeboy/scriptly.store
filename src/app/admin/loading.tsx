import { Skeleton } from "@/components/ui/skeleton";
import {
  AdminFiguresSkeleton,
  AdminHeaderSkeleton,
  AdminTableSkeleton,
} from "@/app/admin/_components/admin-skeletons";

export default function AdminLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading admin overview">
      <AdminHeaderSkeleton />
      <AdminFiguresSkeleton count={4} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <AdminTableSkeleton rows={8} columns={4} withTitle />
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3 sm:px-5">
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-1.5 px-4 py-3 sm:px-5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-44 max-w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
