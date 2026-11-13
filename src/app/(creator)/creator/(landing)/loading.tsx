import { Skeleton } from "@/components/ui/skeleton";

export default function CreatorLandingLoading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="border-b border-border">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 pt-10 pb-16 sm:px-6 md:pt-16 md:pb-24 lg:grid-cols-12 lg:gap-16 lg:px-8">
        <div className="space-y-6 lg:col-span-6">
          <div className="space-y-3">
            <Skeleton className="h-14 w-4/5 sm:h-16" />
            <Skeleton className="h-14 w-3/5 sm:h-16" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-full max-w-md" />
            <Skeleton className="h-5 w-4/5 max-w-sm" />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Skeleton className="h-12 w-full sm:w-52" />
            <Skeleton className="h-12 w-full sm:w-48" />
          </div>
          <div className="flex flex-wrap gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-32" />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:col-span-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={i % 2 === 1 ? "space-y-2 sm:translate-y-6" : "space-y-2"}>
              <Skeleton className="aspect-[16/10] w-full rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
