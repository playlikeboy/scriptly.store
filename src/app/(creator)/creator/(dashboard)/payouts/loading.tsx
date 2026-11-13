import { HeaderSkeleton, PanelSkeleton } from "../_components/skeletons";

export default function CreatorPayoutsLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading payout settings">
      <HeaderSkeleton />
      <div className="max-w-xl space-y-6">
        <PanelSkeleton lines={1} />
        <PanelSkeleton lines={4} />
      </div>
    </div>
  );
}
