import { Skeleton } from "@/components/ui/skeleton";

export default function RouteGuideLoading() {
  return (
    <div className="container max-w-5xl mx-auto px-4 py-10 md:py-16 space-y-10 animate-in fade-in duration-200">
      {/* Header Skeleton */}
      <div className="space-y-3 border-b border-border/40 pb-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-12 rounded-md" />
          <span className="text-muted-foreground/30">/</span>
          <Skeleton className="h-4 w-28 rounded-md" />
        </div>
        <Skeleton className="h-9 sm:h-12 w-3/4 rounded-2xl" />
        <Skeleton className="h-4 w-2/3 rounded-md" />
      </div>

      {/* Docs Body Content Skeleton */}
      <div className="space-y-8 max-w-3xl">
        <div className="space-y-3">
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-11/12 rounded-md" />
          <Skeleton className="h-4 w-4/5 rounded-md" />
        </div>

        {/* Section Heading & Code Box */}
        <div className="space-y-4 pt-2">
          <Skeleton className="h-7 w-48 rounded-xl" />
          <Skeleton className="h-4 w-full rounded-md" />
          <div className="rounded-2xl border border-border/40 bg-card/40 p-5 space-y-2">
            <Skeleton className="h-4 w-1/3 rounded-md" />
            <Skeleton className="h-4 w-2/3 rounded-md" />
            <Skeleton className="h-4 w-1/2 rounded-md" />
          </div>
        </div>

        {/* Workflow Diagram Box Skeleton */}
        <div className="rounded-3xl border border-border/40 bg-card/25 p-6 space-y-4">
          <Skeleton className="h-6 w-52 rounded-lg" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 rounded-xl border border-border/30 bg-muted/20 space-y-2 text-center">
                <Skeleton className="h-8 w-8 rounded-full mx-auto" />
                <Skeleton className="h-4 w-24 mx-auto rounded-md" />
                <Skeleton className="h-3 w-32 mx-auto rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
