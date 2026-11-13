import { Skeleton } from "@/components/ui/skeleton";

export default function BlogLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-16" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading articles</span>

      {/* Header */}
      <div className="max-w-[68ch] space-y-3">
        <Skeleton className="h-10 md:h-14 w-72 max-w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>

      {/* Filters */}
      <div className="mt-10 flex flex-col gap-4 border-b border-border pb-4 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-1.5 overflow-hidden">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 shrink-0 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-10 w-full md:w-72 rounded-[10px]" />
      </div>

      {/* Featured */}
      <div className="mt-12 grid grid-cols-1 gap-6 md:gap-10 lg:grid-cols-12 lg:items-center">
        <Skeleton className="aspect-[16/10] w-full rounded-2xl lg:col-span-7" />
        <div className="space-y-4 lg:col-span-5">
          <Skeleton className="h-3.5 w-48" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      {/* Grid */}
      <Skeleton className="mt-16 md:mt-24 mb-8 h-7 w-44" />
      <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx}>
            <Skeleton className="aspect-[16/10] w-full rounded-2xl" />
            <div className="mt-4 space-y-2">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-5 w-11/12" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
