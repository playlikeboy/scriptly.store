"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, CheckCircle2, Download, ExternalLink, FileWarning, Loader2, Package, X } from "lucide-react";
import { toast } from "sonner";
import { approveProductAction, rejectProductAction } from "@/lib/actions/products";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/price-utils";
import { cn } from "@/lib/utils";

interface PendingProduct {
  id: string;
  title: string;
  slug: string;
  price: number;
  category: string;
  thumbnail?: string | null;
  fileUrl: string | null;
  createdAt: Date | string;
  creator: {
    name: string | null;
    email: string;
  } | null;
}

interface AdminApprovalsListProps {
  pendingItems: PendingProduct[];
}

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export default function AdminApprovalsList({ pendingItems }: AdminApprovalsListProps) {
  const [resolvedIds, setResolvedIds] = useState<string[]>([]);
  const [processing, setProcessing] = useState<{ id: string; kind: "approve" | "reject" } | null>(null);
  const [, startTransition] = useTransition();

  const items = pendingItems.filter((item) => !resolvedIds.includes(item.id));

  const moderate = (item: PendingProduct, kind: "approve" | "reject") => {
    const prompt =
      kind === "approve"
        ? `Approve “${item.title}”? It will be listed live on the marketplace.`
        : `Reject “${item.title}”? It will be marked rejected and stay unlisted.`;
    if (!window.confirm(prompt)) return;

    setProcessing({ id: item.id, kind });
    startTransition(async () => {
      try {
        const res = kind === "approve" ? await approveProductAction(item.id) : await rejectProductAction(item.id);
        if (res.success) {
          toast.success(kind === "approve" ? `“${item.title}” approved and listed` : `“${item.title}” rejected`);
          setResolvedIds((prev) => [...prev, item.id]);
        } else {
          toast.error(kind === "approve" ? "Could not approve this product." : "Could not reject this product.");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong. Try again.");
      } finally {
        setProcessing(null);
      }
    });
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-border bg-card px-6 py-14 text-center">
        <CheckCircle2 aria-hidden="true" strokeWidth={1.75} className="mb-3 size-5 text-success" />
        <p className="text-sm font-medium text-foreground">Queue is clear</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Every creator submission has been moderated. New submissions will appear here.
        </p>
      </div>
    );
  }

  return (
    <section aria-label="Pending submissions" className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
        <h2 className="text-sm font-semibold text-foreground">Waiting for review</h2>
        <span className="text-xs text-muted-foreground tabular-nums">
          {items.length} {items.length === 1 ? "submission" : "submissions"}
        </span>
      </div>

      <ul className="divide-y divide-border">
        {items.map((item) => {
          const busy = processing?.id === item.id;
          const locked = processing !== null;
          return (
            <li key={item.id} className="grid gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="flex min-w-0 gap-3 sm:gap-4">
                <div className="h-14 w-[5.5rem] shrink-0 overflow-hidden rounded-md bg-muted">
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt="" width={88} height={56} loading="lazy" decoding="async" className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center">
                      <Package aria-hidden="true" strokeWidth={1.75} className="size-4 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                    <Link
                      href={`/products/${item.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 text-sm font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:underline"
                    >
                      {item.title}
                    </Link>
                    <span className={cn("text-sm font-medium tabular-nums", item.price <= 0 ? "text-success" : "text-foreground")}>
                      {formatPrice(item.price)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.category} · Submitted {dateFormat.format(new Date(item.createdAt))} ·{" "}
                    <span className="font-mono text-[11px]">{item.id.slice(0, 8)}</span>
                  </p>
                  <p className="mt-1.5 truncate text-xs text-muted-foreground">
                    <span className="text-foreground">{item.creator?.name || "Unnamed creator"}</span>
                    {item.creator?.email ? <> · {item.creator.email}</> : " · No creator account linked"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                {item.fileUrl ? (
                  <Button asChild size="sm" variant="outline">
                    <a href={item.fileUrl} download>
                      <Download aria-hidden="true" />
                      Download bundle
                    </a>
                  </Button>
                ) : (
                  <span className="inline-flex h-8 items-center gap-1.5 px-1 text-xs text-destructive">
                    <FileWarning aria-hidden="true" className="size-3.5" />
                    No file uploaded
                  </span>
                )}
                <Button asChild size="sm" variant="ghost">
                  <Link href={`/products/${item.slug}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink aria-hidden="true" />
                    Preview
                  </Link>
                </Button>
                <span aria-hidden="true" className="mx-1 hidden h-5 w-px bg-border sm:block" />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={locked}
                  onClick={() => moderate(item, "reject")}
                  className="hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                >
                  {busy && processing?.kind === "reject" ? <Loader2 aria-hidden="true" className="animate-spin" /> : <X aria-hidden="true" />}
                  Reject
                </Button>
                <Button type="button" size="sm" disabled={locked} onClick={() => moderate(item, "approve")}>
                  {busy && processing?.kind === "approve" ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Check aria-hidden="true" />}
                  Approve
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
