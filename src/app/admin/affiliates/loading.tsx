import { AdminHeaderSkeleton, AdminTableSkeleton } from "@/app/admin/_components/admin-skeletons";

export default function AdminAffiliatesLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading affiliates">
      <AdminHeaderSkeleton withAction={false} />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <AdminTableSkeleton rows={4} columns={2} withTitle />
        <AdminTableSkeleton rows={4} columns={2} withTitle />
      </div>
    </div>
  );
}
