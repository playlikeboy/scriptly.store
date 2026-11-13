"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PageToken = number | "gap-start" | "gap-end";

/** First, last, and current +/- 1, with gaps collapsed. O(1) in totalPages. */
function getPageTokens(totalPages: number, currentPage: number): PageToken[] {
  const pages = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const tokens: PageToken[] = [];
  sorted.forEach((page, i) => {
    const prev = sorted[i - 1];
    if (prev !== undefined && page - prev > 1) {
      tokens.push(page < currentPage ? "gap-start" : "gap-end");
    }
    tokens.push(page);
  });
  return tokens;
}

export function ProductPagination({ totalPages, currentPage }: { totalPages: number; currentPage: number }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  if (totalPages <= 1) return null;

  const safeCurrent = Math.min(Math.max(1, currentPage), totalPages);

  const createPageUrl = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) params.delete("page");
    else params.set("page", String(page));
    const qs = params.toString();
    return `${pathname}${qs ? `?${qs}` : ""}`;
  };

  const tokens = getPageTokens(totalPages, safeCurrent);

  return (
    <nav aria-label="Pagination" className="flex w-full items-center justify-between gap-2 sm:justify-center">
      {safeCurrent > 1 ? (
        <Button asChild variant="ghost" size="sm">
          <Link href={createPageUrl(safeCurrent - 1)} rel="prev" aria-label="Previous page">
            <ChevronLeft className="size-4" strokeWidth={1.75} aria-hidden="true" />
            <span>Previous</span>
          </Link>
        </Button>
      ) : (
        <Button variant="ghost" size="sm" disabled aria-hidden="true" tabIndex={-1}>
          <ChevronLeft className="size-4" strokeWidth={1.75} aria-hidden="true" />
          <span>Previous</span>
        </Button>
      )}

      <ul className="hidden items-center gap-1 sm:flex">
        {tokens.map((token) =>
          typeof token === "number" ? (
            <li key={token}>
              <Button
                asChild
                variant={token === safeCurrent ? "outline" : "ghost"}
                size="icon-sm"
                className={cn("tabular-nums", token === safeCurrent && "text-foreground")}
              >
                <Link
                  href={createPageUrl(token)}
                  aria-label={`Page ${token}`}
                  aria-current={token === safeCurrent ? "page" : undefined}
                >
                  {token}
                </Link>
              </Button>
            </li>
          ) : (
            <li key={token} aria-hidden="true" className="flex size-8 items-center justify-center text-muted-foreground">
              …
            </li>
          )
        )}
      </ul>

      <p className="text-sm tabular-nums text-muted-foreground sm:hidden">
        Page {safeCurrent} of {totalPages}
      </p>

      {safeCurrent < totalPages ? (
        <Button asChild variant="ghost" size="sm">
          <Link href={createPageUrl(safeCurrent + 1)} rel="next" aria-label="Next page">
            <span>Next</span>
            <ChevronRight className="size-4" strokeWidth={1.75} aria-hidden="true" />
          </Link>
        </Button>
      ) : (
        <Button variant="ghost" size="sm" disabled aria-hidden="true" tabIndex={-1}>
          <span>Next</span>
          <ChevronRight className="size-4" strokeWidth={1.75} aria-hidden="true" />
        </Button>
      )}
    </nav>
  );
}
