"use client";

import { FormEvent, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type QuerySelect = {
  key: string;
  label: string;
  defaultValue: string;
  options: { value: string; label: string }[];
};

/**
 * URL-driven search + select filters for admin lists. Every change resets the
 * page params so the server re-queries from the first page.
 */
export default function AdminQueryBar({
  searchKey = "search",
  searchLabel,
  placeholder,
  selects = [],
  resetPageKeys = ["page"],
  className,
}: {
  searchKey?: string;
  searchLabel: string;
  placeholder: string;
  selects?: QuerySelect[];
  resetPageKeys?: string[];
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const urlValue = searchParams.get(searchKey) || "";
  const [value, setValue] = useState(urlValue);
  const [syncedFrom, setSyncedFrom] = useState(urlValue);

  // Keep the input in sync when the URL changes from elsewhere (back/forward, tabs).
  if (syncedFrom !== urlValue) {
    setSyncedFrom(urlValue);
    setValue(urlValue);
  }

  function push(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    resetPageKeys.forEach((key) => params.delete(key));
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    push((params) => {
      if (trimmed) params.set(searchKey, trimmed);
      else params.delete(searchKey);
    });
  }

  function clear() {
    setValue("");
    push((params) => params.delete(searchKey));
  }

  const hasActive =
    Boolean(urlValue) ||
    selects.some((s) => {
      const v = searchParams.get(s.key);
      return v !== null && v !== s.defaultValue;
    });

  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-center", className)}>
      <form role="search" onSubmit={onSubmit} className="relative min-w-0 flex-1 sm:max-w-md">
        <label htmlFor={`q-${searchKey}`} className="sr-only">
          {searchLabel}
        </label>
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id={`q-${searchKey}`}
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          enterKeyHint="search"
          className="h-10 w-full rounded-[10px] border border-input bg-card pr-16 pl-9 text-sm text-foreground transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 [&::-webkit-search-cancel-button]:hidden"
        />
        <span className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1">
          {isPending ? <Loader2 aria-label="Loading" className="size-4 animate-spin text-muted-foreground" /> : null}
          {value ? (
            <button
              type="button"
              onClick={clear}
              aria-label="Clear search"
              className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </span>
      </form>

      {selects.map((select) => (
        <div key={select.key} className="sm:w-48">
          <label htmlFor={`sel-${select.key}`} className="sr-only">
            {select.label}
          </label>
          <select
            id={`sel-${select.key}`}
            value={searchParams.get(select.key) || select.defaultValue}
            onChange={(event) => {
              const next = event.target.value;
              push((params) => {
                if (next === select.defaultValue) params.delete(select.key);
                else params.set(select.key, next);
              });
            }}
            className="h-10 w-full cursor-pointer rounded-[10px] border border-input bg-card px-3 text-sm text-foreground transition-colors outline-none hover:border-foreground/25 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            {select.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ))}

      {hasActive ? (
        <button
          type="button"
          onClick={() => {
            setValue("");
            push((params) => {
              params.delete(searchKey);
              selects.forEach((s) => params.delete(s.key));
            });
          }}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-[10px] px-3 text-sm text-muted-foreground transition-colors outline-none hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" aria-hidden="true" />
          Reset
        </button>
      ) : null}
    </div>
  );
}
