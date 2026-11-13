"use client";

import { useId, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2 } from "lucide-react";

export interface SortSelectOption {
  value: string;
  label: string;
  href: string;
}

/**
 * Smallest interactive leaf of the catalog toolbar: navigates to the
 * server-built href for the chosen sort. The search form carries the current
 * sort as a hidden field, so the rest of the toolbar works without JS.
 */
export function SortSelect({ value, options }: { value: string; options: SortSelectOption[] }) {
  const router = useRouter();
  const id = useId();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-sm text-muted-foreground whitespace-nowrap">
        Sort
      </label>
      <div className="relative">
        <select
          id={id}
          defaultValue={value}
          disabled={isPending}
          aria-busy={isPending}
          onChange={(e) => {
            const next = options.find((o) => o.value === e.target.value);
            if (next) startTransition(() => router.push(next.href));
          }}
          className="h-10 w-full min-w-0 cursor-pointer appearance-none rounded-[10px] border border-input bg-card py-1 pl-3 pr-9 text-sm text-foreground outline-none transition-colors duration-150 hover:border-foreground/25 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-wait disabled:opacity-70"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {isPending ? (
          <Loader2
            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
            strokeWidth={1.75}
            aria-hidden="true"
          />
        ) : (
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1.75}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}
