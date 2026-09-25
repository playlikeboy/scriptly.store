import { Skeleton } from "@/components/ui/skeleton";

export default function OffersLoading() {
  return (
    <div className="container max-w-7xl mx-auto px-4 py-16 md:py-24 space-y-16 animate-in fade-in duration-200">
      {/* Header Skeleton */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <Skeleton className="h-6 w-32 rounded-full mx-auto" />
        <Skeleton className="h-10 sm:h-14 w-3/4 rounded-2xl mx-auto" />
        <Skeleton className="h-4 w-2/3 rounded-xl mx-auto" />
      </div>

      {/* Main Campaign Cards Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="rounded-3xl border border-border/40 bg-card/25 p-6 sm:p-8 space-y-6 shadow-sm"
          >
            <Skeleton className="w-12 h-12 rounded-2xl" />
            <div className="space-y-3">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-8 w-4/5 rounded-xl" />
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-3/4 rounded-md" />
            </div>
            <div className="pt-4 border-t border-border/30 flex items-center justify-between">
              <Skeleton className="h-10 w-32 rounded-xl" />
              <Skeleton className="h-10 w-28 rounded-xl" />
            </div>
          </div>
        ))}
      </div>

      {/* Coupon List Cards Skeleton */}
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-7 w-48 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-dashed border-border/60 bg-card/20 p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-20 rounded-md" />
                <Skeleton className="h-4 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full rounded-md" />
              <div className="flex items-center justify-between pt-2">
                <Skeleton className="h-9 w-28 rounded-xl" />
                <Skeleton className="h-9 w-20 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
