import { Skeleton } from "@/components/ui/skeleton";

export default function AffiliateDashboardLoading() {
  return (
    <div className="container max-w-7xl mx-auto px-4 py-10 md:py-16 space-y-10 animate-in fade-in duration-200">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56 rounded-xl" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl shrink-0" />
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-5 rounded-2xl border border-border/40 bg-card/25 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-xl" />
            </div>
            <Skeleton className="h-8 w-28 rounded-xl" />
            <Skeleton className="h-3 w-20 rounded-md" />
          </div>
        ))}
      </div>

      {/* Quick Link Generator Skeleton */}
      <div className="rounded-3xl border border-border/40 bg-card/25 p-6 space-y-4">
        <div className="space-y-1">
          <Skeleton className="h-5 w-40 rounded-lg" />
          <Skeleton className="h-4 w-64 rounded-md" />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Skeleton className="h-11 flex-1 rounded-xl" />
          <Skeleton className="h-11 w-32 rounded-xl shrink-0" />
        </div>
      </div>

      {/* Products To Promote Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48 rounded-lg" />
          <Skeleton className="h-4 w-24 rounded-md" />
        </div>
        <div className="rounded-2xl border border-border/40 bg-card/25 overflow-hidden">
          <div className="p-4 border-b border-border/30 bg-muted/10 grid grid-cols-4 gap-4">
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="h-4 w-16 rounded-md" />
            <Skeleton className="h-4 w-20 rounded-md" />
            <Skeleton className="h-4 w-16 rounded-md ml-auto" />
          </div>
          <div className="divide-y divide-border/20">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="p-4 grid grid-cols-4 gap-4 items-center">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-40 rounded-md" />
                  <Skeleton className="h-3 w-24 rounded-md" />
                </div>
                <Skeleton className="h-4 w-16 rounded-md" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-8 w-24 rounded-xl ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
