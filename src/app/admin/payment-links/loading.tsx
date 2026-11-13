import {
  AdminFiguresSkeleton,
  AdminFormSkeleton,
  AdminHeaderSkeleton,
  AdminTableSkeleton,
} from "@/app/admin/_components/admin-skeletons";

export default function AdminPaymentLinksLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading payment links">
      <AdminHeaderSkeleton />
      <AdminFiguresSkeleton count={4} />
      <div className="grid items-start gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <AdminFormSkeleton fields={5} />
        <AdminTableSkeleton rows={6} columns={4} withTitle />
      </div>
    </div>
  );
}
