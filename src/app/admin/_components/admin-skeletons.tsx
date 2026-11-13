import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function AdminHeaderSkeleton({ withAction = true }: { withAction?: boolean }) {
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-3">
        <Skeleton className="h-9 w-56 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      {withAction ? <Skeleton className="h-10 w-36" /> : null}
    </div>
  );
}

export function AdminFiguresSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border",
        count >= 4 ? "lg:grid-cols-4" : "sm:grid-cols-3",
        count === 5 && "lg:grid-cols-5"
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2 bg-card px-4 py-3.5 sm:px-5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-24" />
        </div>
      ))}
    </div>
  );
}

export function AdminToolbarSkeleton() {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Skeleton className="h-10 w-full sm:max-w-md" />
      <Skeleton className="h-10 w-full sm:w-44" />
    </div>
  );
}

export function AdminTableSkeleton({
  rows = 8,
  columns = 5,
  withThumb = false,
  withTitle = false,
}: {
  rows?: number;
  columns?: number;
  withThumb?: boolean;
  withTitle?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      {withTitle ? (
        <div className="border-b border-border px-4 py-3 sm:px-5">
          <Skeleton className="h-4 w-36" />
        </div>
      ) : null}
      <div className="hidden items-center gap-6 border-b border-border px-5 py-3 md:flex">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className={cn("h-3", i === 0 ? "w-40" : "w-16", i === columns - 1 && "ml-auto")} />
        ))}
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-4 py-3 sm:px-5">
            {withThumb ? <Skeleton className="h-10 w-16 shrink-0 rounded-md" /> : null}
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-48 max-w-full" />
              <Skeleton className="h-3 w-32 max-w-full" />
            </div>
            {Array.from({ length: Math.max(0, columns - 2) }).map((_, c) => (
              <Skeleton key={c} className="hidden h-4 w-16 md:block" />
            ))}
            <Skeleton className="h-8 w-20 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminFormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="space-y-6 rounded-2xl border border-border bg-card p-4 sm:p-6">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className={cn("w-full", i === 2 ? "h-28" : "h-10")} />
        </div>
      ))}
      <div className="flex justify-end">
        <Skeleton className="h-10 w-36" />
      </div>
    </div>
  );
}
