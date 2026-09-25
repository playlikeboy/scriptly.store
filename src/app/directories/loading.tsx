import { Skeleton } from "@/components/ui/skeleton";

export default function DirectoriesLoading() {
  return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-16 space-y-10 animate-in fade-in duration-200">
      {/* Header Skeleton */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-6 w-40 rounded-full mx-auto" />
        <Skeleton className="h-10 sm:h-14 w-4/5 rounded-2xl mx-auto" />
        <Skeleton className="h-4 sm:h-5 w-2/3 rounded-xl mx-auto" />
      </div>

      {/* Stats Counter Bar Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 rounded-2xl border border-border/40 bg-card/25 text-center space-y-1.5">
            <Skeleton className="h-7 w-16 mx-auto rounded-lg" />
            <Skeleton className="h-3.5 w-24 mx-auto rounded-md" />
          </div>
        ))}
      </div>

      {/* Search Bar Skeleton */}
      <div className="max-w-2xl mx-auto">
        <Skeleton className="h-12 w-full rounded-2xl" />
      </div>

      {/* Directories Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 9 }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-3xl border border-border/40 bg-card/25 p-5 space-y-4 shadow-sm flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-xl" />
                  <Skeleton className="h-5 w-32 rounded-lg" />
                </div>
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-4/5 rounded-md" />
            </div>
            <div className="pt-3 border-t border-border/30 flex items-center justify-between">
              <Skeleton className="h-4 w-20 rounded-md" />
              <Skeleton className="h-9 w-28 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
