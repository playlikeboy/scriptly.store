import { Skeleton } from "@/components/ui/skeleton";

export default function ReceiptLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 md:py-12" aria-busy="true" aria-label="Loading receipt">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-40 rounded-lg" />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-6 sm:p-10">
        <div className="flex flex-col gap-6 border-b border-border pb-8 sm:flex-row sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-36" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="space-y-2 sm:items-end">
            <Skeleton className="h-8 w-28 sm:ml-auto" />
            <Skeleton className="h-3 w-32 sm:ml-auto" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 py-8 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-44" />
            </div>
          ))}
        </div>

        <div className="divide-y divide-border border-y border-border">
          <div className="flex justify-between py-3">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="flex justify-between py-4">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        </div>

        <div className="mt-4 ml-auto w-full space-y-2 sm:w-72">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex justify-between border-t border-border pt-3">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-7 w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}
