"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { fieldClass, selectClass } from "@/components/creator/console-ui";
import { cn } from "@/lib/utils";

export default function CreatorProductsFilters({
  initialQuery,
  initialStatus,
}: {
  initialQuery: string;
  initialStatus: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const navigate = (nextQuery: string, nextStatus: string) => {
    const sp = new URLSearchParams();
    if (nextQuery.trim()) sp.set("q", nextQuery.trim());
    if (nextStatus !== "all") sp.set("status", nextStatus);
    const s = sp.toString();
    startTransition(() => {
      router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
    });
  };

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (timer.current) clearTimeout(timer.current);
        navigate(query, status);
      }}
      className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:px-5"
    >
      <div className="relative flex-1 sm:max-w-sm">
        <label htmlFor="product-search" className="sr-only">
          Search products
        </label>
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          strokeWidth={1.75}
        />
        <input
          id="product-search"
          type="search"
          value={query}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => navigate(next, status), 300);
          }}
          placeholder="Search by title or slug"
          className={cn(fieldClass, "pl-9")}
        />
      </div>
      <div className="flex items-center gap-3">
        <label htmlFor="product-status" className="sr-only">
          Filter by status
        </label>
        <select
          id="product-status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            navigate(query, e.target.value);
          }}
          className={cn(selectClass, "sm:w-44")}
        >
          <option value="all">All statuses</option>
          <option value="approved">Live</option>
          <option value="pending">In review</option>
          <option value="rejected">Rejected</option>
        </select>
        <span aria-live="polite" className="flex size-4 shrink-0 items-center">
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin text-muted-foreground" strokeWidth={1.75} />
              <span className="sr-only">Updating results</span>
            </>
          ) : null}
        </span>
      </div>
    </form>
  );
}
