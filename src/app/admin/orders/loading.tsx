import {
  AdminHeaderSkeleton,
  AdminTableSkeleton,
  AdminToolbarSkeleton,
} from "@/app/admin/_components/admin-skeletons";

export default function AdminOrdersLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading orders">
      <AdminHeaderSkeleton withAction={false} />
      <AdminToolbarSkeleton />
      <AdminTableSkeleton rows={10} columns={6} />
    </div>
  );
}
