import { Skeleton } from "@/components/ui/skeleton";

export default function BlogPostLoading() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-10 pb-16 md:pt-14" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading article</span>

      <div className="mx-auto max-w-[68ch]">
        <Skeleton className="h-4 w-36" />
        <div className="mt-8 space-y-3">
          <Skeleton className="h-10 md:h-14 w-full" />
          <Skeleton className="h-10 md:h-14 w-3/4" />
        </div>
        <div className="mt-5 space-y-2">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-5/6" />
        </div>
        <div className="mt-8 border-t border-border pt-4">
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
      </div>

      <Skeleton className="mx-auto mt-10 aspect-[21/9] w-full max-w-5xl rounded-2xl" />

      <div className="mx-auto mt-12 max-w-[68ch] space-y-3">
        {Array.from({ length: 3 }).map((_, block) => (
          <div key={block} className="space-y-3 pb-6">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
        <Skeleton className="h-7 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </div>
  );
}
