import { Skeleton } from "@/components/ui/skeleton";

export default function OffersLoading() {
  return (
    <div className="bg-background" role="status" aria-label="Loading offers">
      <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
        <div className="max-w-2xl space-y-3">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="mt-10 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="mt-3 h-7 w-56" />
          <Skeleton className="mt-4 h-4 w-full max-w-lg" />
          <Skeleton className="mt-2 h-4 w-2/3 max-w-md" />
          <Skeleton className="mt-6 h-4 w-32" />
        </div>
        <Skeleton className="mt-14 h-7 w-40" />
        <div className="mt-6 divide-y divide-border border-y border-border">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-56" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 w-28 rounded-lg" />
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
