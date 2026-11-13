import { Skeleton } from "@/components/ui/skeleton";
import { AdminFormSkeleton, AdminHeaderSkeleton } from "@/app/admin/_components/admin-skeletons";

export default function ProductFormLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading product form">
      <Skeleton className="h-4 w-20" />
      <AdminHeaderSkeleton withAction={false} />
      <AdminFormSkeleton fields={7} />
    </div>
  );
}
