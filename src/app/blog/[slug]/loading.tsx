import { Skeleton } from "@/components/ui/skeleton";

export default function BlogPostLoading() {
  return (
    <div className="container max-w-4xl mx-auto px-4 sm:px-6 py-10 md:py-16 space-y-8 animate-in fade-in duration-200">
      {/* Back button & Breadcrumb Skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-24 rounded-xl" />
        <span className="text-muted-foreground/30">/</span>
        <Skeleton className="h-4 w-32 rounded-md" />
      </div>

      {/* Article Header Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-28 rounded-full" />
        <Skeleton className="h-10 sm:h-14 w-full rounded-2xl" />
        <Skeleton className="h-10 sm:h-14 w-4/5 rounded-2xl" />
        <Skeleton className="h-5 w-3/4 rounded-xl" />

        {/* Metadata row */}
        <div className="flex items-center gap-4 pt-2 border-y border-border/40 py-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="h-3 w-44 rounded-md" />
          </div>
          <Skeleton className="h-4 w-20 rounded-md" />
        </div>
      </div>

      {/* Cover Image Skeleton */}
      <div className="aspect-[16/9] w-full rounded-3xl border border-border/40 overflow-hidden bg-card/25">
        <Skeleton className="w-full h-full rounded-none" />
      </div>

      {/* Prose Content Skeleton */}
      <div className="space-y-6 pt-4 max-w-3xl">
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-4 w-11/12 rounded-md" />
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-4 w-4/5 rounded-md" />

        {/* Section Heading Skeleton */}
        <div className="pt-4 space-y-3">
          <Skeleton className="h-7 w-2/3 rounded-xl" />
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-3/4 rounded-md" />
        </div>

        {/* Code Block Skeleton */}
        <div className="rounded-2xl border border-border/40 bg-card/40 p-5 space-y-2">
          <Skeleton className="h-4 w-1/3 rounded-md" />
          <Skeleton className="h-4 w-2/3 rounded-md" />
          <Skeleton className="h-4 w-1/2 rounded-md" />
        </div>

        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-4 w-5/6 rounded-md" />
      </div>
    </div>
  );
}
