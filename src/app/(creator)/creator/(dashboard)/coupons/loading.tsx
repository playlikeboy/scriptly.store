import { HeaderSkeleton, PanelSkeleton, TableSkeleton } from "../_components/skeletons";

export default function CreatorCouponsLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading coupons">
      <HeaderSkeleton />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <PanelSkeleton lines={3} className="lg:col-span-5" />
        <div className="lg:col-span-7">
          <TableSkeleton rows={4} />
        </div>
      </div>
    </div>
  );
}
