import { AdminFormSkeleton, AdminHeaderSkeleton, AdminTableSkeleton } from "@/app/admin/_components/admin-skeletons";

export default function AdminCategoriesLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading categories">
      <AdminHeaderSkeleton withAction={false} />
      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <AdminFormSkeleton fields={5} />
        <AdminTableSkeleton rows={8} columns={2} withTitle />
      </div>
    </div>
  );
}
