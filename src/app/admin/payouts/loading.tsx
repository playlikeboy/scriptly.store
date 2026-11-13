import {
  AdminFiguresSkeleton,
  AdminHeaderSkeleton,
  AdminTableSkeleton,
  AdminToolbarSkeleton,
} from "@/app/admin/_components/admin-skeletons";

export default function AdminPayoutsLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading payouts">
      <AdminHeaderSkeleton withAction={false} />
      <AdminFiguresSkeleton count={5} />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          <AdminToolbarSkeleton />
          <AdminTableSkeleton rows={8} columns={5} withTitle />
        </div>
        <div className="space-y-3">
          <AdminToolbarSkeleton />
          <AdminTableSkeleton rows={5} columns={2} withTitle />
        </div>
      </div>
    </div>
  );
}
