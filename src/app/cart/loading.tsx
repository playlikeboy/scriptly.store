import { Skeleton } from "@/components/ui/skeleton";

export default function CartLoading() {
  return (
    <div className="min-h-screen py-8 md:py-14 animate-in fade-in duration-200">
      <div className="container max-w-7xl mx-auto px-4 space-y-8">
        {/* Stepper Skeleton */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-28 rounded-full" />
            <span className="text-muted-foreground/30">→</span>
            <Skeleton className="h-5 w-20 rounded-md" />
            <span className="text-muted-foreground/30">→</span>
            <Skeleton className="h-5 w-24 rounded-md" />
          </div>
          <div className="hidden sm:flex gap-4">
            <Skeleton className="h-5 w-28 rounded-md" />
            <Skeleton className="h-5 w-24 rounded-md" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Cart Items Skeleton */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center justify-between border-b border-border/40 pb-4">
              <Skeleton className="h-6 w-32 rounded-lg" />
              <Skeleton className="h-4 w-20 rounded-md" />
            </div>

            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-border/40 bg-card/40 p-4 sm:p-5 flex gap-4 items-center justify-between"
                >
                  <Skeleton className="w-18 h-18 sm:w-20 sm:h-20 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-20 rounded-full" />
                    <Skeleton className="h-5 w-4/5 rounded-md" />
                    <Skeleton className="h-4 w-28 rounded-md" />
                  </div>
                  <Skeleton className="w-8 h-8 rounded-xl shrink-0" />
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Order Summary Skeleton */}
          <div className="lg:col-span-5">
            <div className="rounded-3xl border border-border/50 bg-card/60 p-6 sm:p-7 space-y-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-border/40 pb-4">
                <Skeleton className="h-6 w-36 rounded-lg" />
                <Skeleton className="h-4 w-16 rounded-md" />
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-24 rounded-md" />
                  <Skeleton className="h-4 w-16 rounded-md" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-28 rounded-md" />
                  <Skeleton className="h-4 w-14 rounded-md" />
                </div>
                <div className="pt-3 border-t border-border/40 flex justify-between items-baseline">
                  <Skeleton className="h-5 w-20 rounded-md" />
                  <Skeleton className="h-8 w-28 rounded-xl" />
                </div>
              </div>

              {/* Promo input skeleton */}
              <div className="pt-4 border-t border-border/40 space-y-2">
                <Skeleton className="h-4 w-32 rounded-md" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 flex-1 rounded-xl" />
                  <Skeleton className="h-10 w-20 rounded-xl" />
                </div>
              </div>

              {/* Checkout button skeleton */}
              <Skeleton className="h-13 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
