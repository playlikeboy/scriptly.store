import { AdminHeaderSkeleton, AdminTableSkeleton } from "@/app/admin/_components/admin-skeletons";

export default function AdminApprovalsLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading submissions">
      <AdminHeaderSkeleton withAction={false} />
      <AdminTableSkeleton rows={5} columns={4} withThumb withTitle />
    </div>
  );
}
