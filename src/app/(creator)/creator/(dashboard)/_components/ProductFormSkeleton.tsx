import { Skeleton } from "@/components/ui/skeleton";
import { HeaderSkeleton, PanelSkeleton } from "./skeletons";

export default function ProductFormSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading product form">
      <Skeleton className="h-4 w-20" />
      <HeaderSkeleton />
      <Skeleton className="h-12 w-full rounded-2xl" />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <PanelSkeleton lines={5} />
          <PanelSkeleton lines={3} />
        </div>
        <div className="space-y-6 lg:col-span-5">
          <PanelSkeleton lines={2} />
          <PanelSkeleton lines={3} />
        </div>
      </div>
    </div>
  );
}
