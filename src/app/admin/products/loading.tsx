import { Skeleton } from "@/components/ui/skeleton";
import {
  AdminHeaderSkeleton,
  AdminTableSkeleton,
  AdminToolbarSkeleton,
} from "@/app/admin/_components/admin-skeletons";

export default function AdminProductsLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading products">
      <AdminHeaderSkeleton />
      <AdminToolbarSkeleton />
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20" />
        ))}
      </div>
      <AdminTableSkeleton rows={8} columns={6} withThumb />
    </div>
  );
}
