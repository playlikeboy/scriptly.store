import { HeaderSkeleton, StatStripSkeleton, TableSkeleton } from "../_components/skeletons";

export default function CreatorLedgerLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading sales ledger">
      <HeaderSkeleton />
      <StatStripSkeleton />
      <TableSkeleton rows={10} />
    </div>
  );
}
