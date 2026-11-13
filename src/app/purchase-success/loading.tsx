import { Skeleton } from "@/components/ui/skeleton";

export default function PurchaseSuccessLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 md:py-20" aria-busy="true" aria-label="Loading your purchase">
      <Skeleton className="size-8 rounded-full" />
      <Skeleton className="mt-5 h-9 w-72 md:h-10" />
      <Skeleton className="mt-3 h-5 w-full max-w-md" />
      <div className="mt-10 rounded-2xl border border-border bg-card">
        <div className="flex items-start justify-between gap-4 p-5 sm:p-6">
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
        <div className="space-y-2 border-t border-border p-5 sm:p-6">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="flex justify-between pt-1">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-7 w-24" />
          </div>
        </div>
      </div>
      <div className="mt-8 flex gap-2">
        <Skeleton className="h-11 w-36 rounded-[10px]" />
        <Skeleton className="h-11 w-40 rounded-[10px]" />
      </div>
    </div>
  );
}
