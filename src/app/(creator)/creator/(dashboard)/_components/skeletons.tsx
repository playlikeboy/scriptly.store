import { Skeleton } from "@/components/ui/skeleton";

export function HeaderSkeleton({ withAction = false }: { withAction?: boolean }) {
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2.5">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      {withAction ? <Skeleton className="h-8 w-32 shrink-0" /> : null}
    </div>
  );
}

export function StatStripSkeleton() {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className={`space-y-2 p-4 sm:p-5 ${i % 2 === 1 ? "border-l border-border" : ""} ${
            i >= 2 ? "border-t border-border lg:border-t-0" : ""
          } ${i === 2 ? "lg:border-l" : ""}`}
        >
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-28" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6, withThumb = false }: { rows?: number; withThumb?: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex gap-3 border-b border-border p-4 sm:px-5">
        <Skeleton className="h-10 flex-1 sm:max-w-sm" />
        <Skeleton className="h-10 w-32 sm:w-44" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 sm:px-5">
            {withThumb ? <Skeleton className="h-10 w-16 shrink-0" /> : null}
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-2/3 max-w-xs" />
              <Skeleton className="h-3 w-1/3 max-w-[10rem]" />
            </div>
            <Skeleton className="hidden h-4 w-16 sm:block" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PanelSkeleton({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-card ${className}`}>
      <div className="border-b border-border px-4 py-3.5 sm:px-5">
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="space-y-4 p-4 sm:p-5">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
