import { HeaderSkeleton, PanelSkeleton } from "./_components/skeletons";

export default function CreatorConsoleLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading">
      <HeaderSkeleton />
      <PanelSkeleton lines={3} className="max-w-xl" />
    </div>
  );
}
