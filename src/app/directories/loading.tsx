import { Skeleton } from "@/components/ui/skeleton";

export default function DirectoriesLoading() {
  return (
    <div className="bg-background" role="status" aria-label="Loading directories">
      <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
        <div className="max-w-2xl space-y-3">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="mt-8 flex max-w-lg gap-2">
          <Skeleton className="h-10 flex-1 rounded-[10px]" />
          <Skeleton className="h-10 w-20 rounded-[10px]" />
        </div>
        <div className="mt-8 border-b border-border pb-3">
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:gap-6">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-full max-w-xl" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 w-16 rounded-lg" />
                <Skeleton className="h-8 w-20 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
