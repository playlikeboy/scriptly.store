"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ExternalLink, Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteProductAction } from "@/lib/actions/products";
import { toast } from "sonner";

export function AdminActions({
  productId,
  productSlug,
  productTitle,
}: {
  productId: string;
  productSlug: string;
  productTitle?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const name = productTitle ? `“${productTitle}”` : "this product";

  function handleDelete() {
    if (!window.confirm(`Delete ${name} permanently? This cannot be undone.`)) return;

    startTransition(async () => {
      try {
        await deleteProductAction(productId);
        toast.success("Product deleted");
        router.refresh();
      } catch (error) {
        console.error("Delete failed:", error);
        toast.error("Could not delete the product. Try again.");
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-0.5">
      <Button asChild variant="ghost" size="icon-sm" title="View public page">
        <Link href={`/products/${productSlug}`} target="_blank" rel="noopener noreferrer" aria-label={`View ${productTitle ?? "product"} on the marketplace`}>
          <ExternalLink />
        </Link>
      </Button>

      <Button asChild variant="ghost" size="icon-sm" title="Edit product">
        <Link href={`/admin/products/${productId}/edit`} aria-label={`Edit ${productTitle ?? "product"}`}>
          <Pencil />
        </Link>
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={isPending}
        onClick={handleDelete}
        className="hover:bg-destructive/10 hover:text-destructive"
        aria-label={`Delete ${productTitle ?? "product"}`}
        title="Delete product"
      >
        {isPending ? <Loader2 className="animate-spin" /> : <Trash2 />}
      </Button>
    </div>
  );
}
