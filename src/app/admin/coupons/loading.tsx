import { AdminFormSkeleton, AdminHeaderSkeleton, AdminTableSkeleton } from "@/app/admin/_components/admin-skeletons";

export default function AdminCouponsLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading coupons">
      <AdminHeaderSkeleton withAction={false} />
      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <AdminFormSkeleton fields={4} />
        <AdminTableSkeleton rows={6} columns={5} withTitle />
      </div>
    </div>
  );
}
