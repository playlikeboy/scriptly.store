"use client";

import { useTransition } from "react";
import { toggleProductPublishAction } from "@/lib/actions/products";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Pencil, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function AdminToolbar({
  productId,
  isPublished,
}: {
  productId: string;
  isPublished: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      try {
        await toggleProductPublishAction(productId);
        toast.success(isPublished ? "Product unpublished." : "Product published.");
      } catch {
        toast.error("Couldn't update publish status. Try again.");
      }
    });
  };

  return (
    <div
      role="region"
      aria-label="Admin controls"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[10px] bg-secondary px-3 py-2 text-sm"
    >
      <p className="text-muted-foreground">
        Admin · <span className="font-medium text-foreground">{isPublished ? "Public" : "Draft (hidden)"}</span>
      </p>
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="sm" disabled={isPending} onClick={handleToggle} aria-busy={isPending}>
          {isPending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : isPublished ? (
            <EyeOff strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <Eye strokeWidth={1.75} aria-hidden="true" />
          )}
          {isPending ? "Updating…" : isPublished ? "Unpublish" : "Publish"}
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/admin/products/${productId}/edit`}>
            <Pencil strokeWidth={1.75} aria-hidden="true" />
            Edit
          </Link>
        </Button>
      </div>
    </div>
  );
}
