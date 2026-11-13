import { HeaderSkeleton, TableSkeleton } from "../_components/skeletons";

export default function CreatorProductsLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading products">
      <HeaderSkeleton withAction />
      <TableSkeleton rows={8} withThumb />
    </div>
  );
}
