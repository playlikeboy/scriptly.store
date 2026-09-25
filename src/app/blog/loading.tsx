import { Skeleton } from "@/components/ui/skeleton";

export default function BlogLoading() {
  return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-16 space-y-12 animate-in fade-in duration-200">
      {/* Blog Hero Header Skeleton */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-6 w-36 rounded-full mx-auto" />
        <Skeleton className="h-10 sm:h-14 w-3/4 rounded-2xl mx-auto" />
        <Skeleton className="h-4 sm:h-5 w-2/3 rounded-xl mx-auto" />
      </div>

      {/* Search & Category Pills Skeleton */}
      <div className="space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-11 w-full rounded-2xl" />
        <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-xl shrink-0" />
          ))}
        </div>
      </div>

      {/* Featured Post Card Skeleton */}
      <div className="rounded-3xl border border-border/40 bg-card/25 p-6 sm:p-8 flex flex-col md:flex-row gap-6 md:gap-8 items-center shadow-sm">
        <Skeleton className="aspect-[16/10] w-full md:w-1/2 rounded-2xl shrink-0" />
        <div className="space-y-4 w-full md:w-1/2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-16 rounded-md" />
          </div>
          <Skeleton className="h-8 w-4/5 rounded-xl" />
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-5/6 rounded-md" />
          <div className="pt-2 flex items-center justify-between">
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="h-9 w-28 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Blog Posts Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-3xl border border-border/40 bg-card/25 p-5 space-y-4 shadow-sm flex flex-col justify-between"
          >
            <Skeleton className="aspect-[16/10] w-full rounded-2xl" />
            <div className="space-y-2.5 flex-1">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-16 rounded-full" />
                <Skeleton className="h-3.5 w-12 rounded-md" />
              </div>
              <Skeleton className="h-5 w-11/12 rounded-lg" />
              <Skeleton className="h-3.5 w-full rounded-md" />
              <Skeleton className="h-3.5 w-4/5 rounded-md" />
            </div>
            <div className="pt-3 border-t border-border/30 flex items-center justify-between">
              <Skeleton className="h-3.5 w-20 rounded-md" />
              <Skeleton className="h-4 w-24 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
