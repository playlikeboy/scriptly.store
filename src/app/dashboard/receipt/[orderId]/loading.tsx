import { Skeleton } from "@/components/ui/skeleton";

export default function ReceiptLoading() {
  return (
    <div className="min-h-screen py-10 md:py-16 animate-in fade-in duration-200">
      <div className="container max-w-2xl mx-auto px-4 space-y-6">
        {/* Back Link Skeleton */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>

        {/* Receipt Card Skeleton */}
        <div className="rounded-3xl border border-border/40 bg-card/40 p-6 sm:p-10 space-y-8 shadow-sm">
          {/* Header */}
          <div className="text-center space-y-3 pb-6 border-b border-border/30">
            <Skeleton className="w-12 h-12 rounded-full mx-auto" />
            <Skeleton className="h-7 w-48 rounded-xl mx-auto" />
            <Skeleton className="h-4 w-64 rounded-md mx-auto" />
          </div>

          {/* Details Table */}
          <div className="space-y-4 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-border/20">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-4 w-36 rounded-md" />
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/20">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-4 w-44 rounded-md" />
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/20">
              <Skeleton className="h-4 w-20 rounded-md" />
              <Skeleton className="h-4 w-24 rounded-md" />
            </div>
          </div>

          {/* Purchased Item Box */}
          <div className="p-4 rounded-2xl bg-muted/20 border border-border/30 flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-5 w-48 rounded-lg" />
              <Skeleton className="h-3.5 w-32 rounded-md" />
            </div>
            <Skeleton className="h-6 w-20 rounded-lg" />
          </div>

          {/* Total & Action */}
          <div className="pt-4 border-t border-border/30 flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-3.5 w-16 rounded-md" />
              <Skeleton className="h-7 w-28 rounded-xl" />
            </div>
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
