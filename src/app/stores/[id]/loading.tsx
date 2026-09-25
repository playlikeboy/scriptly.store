import { Skeleton } from "@/components/ui/skeleton";

export default function StorefrontLoading() {
  return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-16 space-y-10 animate-in fade-in duration-200">
      {/* Creator Profile Header Skeleton */}
      <div className="rounded-3xl border border-border/40 bg-card/25 p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <Skeleton className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl shrink-0" />
          <div className="space-y-3 text-center sm:text-left flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <Skeleton className="h-8 w-56 rounded-xl mx-auto sm:mx-0" />
              <Skeleton className="h-5 w-24 rounded-full mx-auto sm:mx-0" />
            </div>
            <Skeleton className="h-4 w-72 rounded-md mx-auto sm:mx-0" />
            <Skeleton className="h-4 w-96 max-w-full rounded-md mx-auto sm:mx-0" />
          </div>
          <Skeleton className="h-10 w-32 rounded-xl shrink-0" />
        </div>

        {/* Creator Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-border/30">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="text-center sm:text-left space-y-1">
              <Skeleton className="h-3.5 w-20 rounded-md mx-auto sm:mx-0" />
              <Skeleton className="h-6 w-24 rounded-lg mx-auto sm:mx-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Products Section Header */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <Skeleton className="h-7 w-40 rounded-xl" />
        <Skeleton className="h-4 w-24 rounded-md" />
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-3xl border border-border/40 bg-card/25 p-4 space-y-4 shadow-sm"
          >
            <Skeleton className="aspect-[16/10] w-full rounded-2xl" />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-16 rounded-md" />
                <Skeleton className="h-4 w-12 rounded-full" />
              </div>
              <Skeleton className="h-5 w-4/5 rounded-lg" />
              <Skeleton className="h-3.5 w-full rounded-md" />
              <Skeleton className="h-3.5 w-3/4 rounded-md" />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/30">
              <Skeleton className="h-5 w-16 rounded-md" />
              <Skeleton className="h-8 w-20 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
