import { Skeleton } from "@/components/ui/skeleton";
import { AdminHeaderSkeleton } from "@/app/admin/_components/admin-skeletons";

export default function AdminPromptsLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading prompt docs">
      <AdminHeaderSkeleton />
      <div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-1.5 px-4 py-3">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-6">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-6 w-80 max-w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-9 w-80 max-w-full" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
