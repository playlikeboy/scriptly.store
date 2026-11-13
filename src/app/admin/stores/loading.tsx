import {
  AdminFiguresSkeleton,
  AdminHeaderSkeleton,
  AdminTableSkeleton,
  AdminToolbarSkeleton,
} from "@/app/admin/_components/admin-skeletons";

export default function AdminStoresLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading creators">
      <AdminHeaderSkeleton withAction={false} />
      <AdminFiguresSkeleton count={4} />
      <AdminToolbarSkeleton />
      <AdminTableSkeleton rows={6} columns={5} />
    </div>
  );
}
