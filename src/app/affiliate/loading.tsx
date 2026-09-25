import { Skeleton } from "@/components/ui/skeleton";

export default function AffiliateLoading() {
  return (
    <div className="container max-w-5xl mx-auto px-4 py-16 md:py-24 space-y-12 animate-in fade-in duration-200">
      {/* Hero Header Skeleton */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <Skeleton className="h-6 w-36 rounded-full mx-auto" />
        <Skeleton className="h-10 sm:h-14 w-4/5 rounded-2xl mx-auto" />
        <Skeleton className="h-4 sm:h-5 w-2/3 rounded-xl mx-auto" />
      </div>

      {/* Feature Perks Row Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-6 rounded-3xl border border-border/40 bg-card/25 space-y-3 text-center">
            <Skeleton className="w-12 h-12 rounded-2xl mx-auto" />
            <Skeleton className="h-5 w-28 mx-auto rounded-lg" />
            <Skeleton className="h-4 w-44 mx-auto rounded-md" />
          </div>
        ))}
      </div>

      {/* Onboarding Form Card Skeleton */}
      <div className="max-w-xl mx-auto rounded-3xl border border-border/40 bg-card/40 p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="space-y-2 text-center">
          <Skeleton className="h-6 w-48 rounded-xl mx-auto" />
          <Skeleton className="h-4 w-64 rounded-md mx-auto" />
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
