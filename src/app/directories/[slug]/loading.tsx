import { Skeleton } from "@/components/ui/skeleton";

export default function DirectoryDetailLoading() {
  return (
    <div className="container max-w-5xl mx-auto px-4 sm:px-6 py-10 md:py-16 space-y-10 animate-in fade-in duration-200">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-28 rounded-xl" />
        <span className="text-muted-foreground/30">/</span>
        <Skeleton className="h-4 w-32 rounded-md" />
      </div>

      {/* Directory Hero Card Skeleton */}
      <div className="rounded-3xl border border-border/40 bg-card/25 p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-2xl shrink-0" />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-48 rounded-xl" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-64 rounded-md" />
            </div>
          </div>
          <Skeleton className="h-11 w-44 rounded-xl shrink-0" />
        </div>

        {/* Directory Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border/30">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3.5 w-20 rounded-md" />
              <Skeleton className="h-6 w-24 rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* Guide Content Card Skeleton */}
      <div className="rounded-3xl border border-border/40 bg-card/25 p-6 sm:p-8 space-y-6">
        <Skeleton className="h-6 w-48 rounded-lg" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-11/12 rounded-md" />
          <Skeleton className="h-4 w-4/5 rounded-md" />
        </div>

        <div className="pt-4 space-y-3">
          <Skeleton className="h-5 w-36 rounded-md" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="p-3 rounded-xl border border-border/30 bg-muted/20 flex items-center gap-3">
                <Skeleton className="w-5 h-5 rounded-full" />
                <Skeleton className="h-4 w-3/4 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
