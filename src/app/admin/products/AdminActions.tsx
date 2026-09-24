"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Edit2, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteProductAction } from "@/lib/actions/products";
import { toast } from "sonner";

export function AdminActions({
  productId,
  productSlug,
}: {
  productId: string;
  productSlug: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm("Delete this product permanently? This cannot be undone.")) return;

    startTransition(async () => {
      try {
        await deleteProductAction(productId);
        toast.success("Product deleted");
        router.refresh();
      } catch (error) {
        console.error("Delete failed:", error);
        toast.error("Could not delete product");
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Button
        asChild
        variant="outline"
        size="icon"
        className="h-9 w-9 rounded-lg"
        aria-label="View product"
        title="View public product"
      >
        <Link href={`/products/${productSlug}`} target="_blank" rel="noopener noreferrer">
          <Eye className="h-3.5 w-3.5" />
        </Link>
      </Button>

      <Button
        asChild
        variant="outline"
        size="icon"
        className="h-9 w-9 rounded-lg"
        aria-label="Edit product"
        title="Edit product"
      >
        <Link href={`/admin/products/${productId}/edit`}>
          <Edit2 className="h-3.5 w-3.5" />
        </Link>
      </Button>

      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={isPending}
        onClick={handleDelete}
        className="h-9 w-9 rounded-lg border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive"
        aria-label="Delete product"
        title="Delete product"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
