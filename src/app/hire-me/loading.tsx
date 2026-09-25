import { Skeleton } from "@/components/ui/skeleton";

export default function HireMeLoading() {
  return (
    <div className="container max-w-5xl mx-auto px-4 py-12 md:py-20 space-y-12 animate-in fade-in duration-200">
      {/* Profile Header Skeleton */}
      <div className="rounded-3xl border border-border/40 bg-card/25 p-8 sm:p-10 space-y-6 text-center sm:text-left shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <Skeleton className="w-24 h-24 rounded-3xl shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <Skeleton className="h-8 w-52 rounded-xl" />
              <Skeleton className="h-6 w-32 rounded-full" />
            </div>
            <Skeleton className="h-5 w-72 rounded-lg mx-auto sm:mx-0" />
            <Skeleton className="h-4 w-96 max-w-full rounded-md mx-auto sm:mx-0" />
          </div>
          <Skeleton className="h-11 w-36 rounded-xl shrink-0" />
        </div>

        {/* Tech Stack Pills */}
        <div className="pt-4 border-t border-border/30 flex flex-wrap gap-2 justify-center sm:justify-start">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20 rounded-full" />
          ))}
        </div>
      </div>

      {/* Services Grid Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-7 w-48 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-6 rounded-3xl border border-border/40 bg-card/25 space-y-4">
              <Skeleton className="w-12 h-12 rounded-2xl" />
              <Skeleton className="h-6 w-40 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-5/6 rounded-md" />
                <Skeleton className="h-4 w-3/4 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
