import { Skeleton } from "@/components/ui/skeleton";

export default function PayLoading() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-5xl flex-col px-4 py-6 sm:px-6 md:py-10" aria-busy="true" aria-label="Loading checkout">
      <Skeleton className="h-4 w-28" />
      <div className="flex flex-1 items-center justify-center py-8 md:py-12">
        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card">
          <div className="space-y-3 border-b border-border p-6">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-4/5" />
            <Skeleton className="h-4 w-full" />
            <div className="flex items-baseline justify-between pt-3">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-8 w-28" />
            </div>
          </div>
          <div className="space-y-4 p-6">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-11 w-full rounded-[10px]" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-11 w-full rounded-[10px]" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-11 w-full rounded-[10px]" />
              </div>
            </div>
            <Skeleton className="h-12 w-full rounded-[10px]" />
          </div>
        </div>
      </div>
    </div>
  );
}
