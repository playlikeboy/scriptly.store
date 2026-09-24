"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminSearchSort() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(searchParams.get("search") || "");

  const currentSort = searchParams.get("sort") || "newest";

  useEffect(() => {
    setSearchValue(searchParams.get("search") || "");
  }, [searchParams]);

  function pushParams(next: URLSearchParams) {
    next.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
    });
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (searchValue.trim()) params.set("search", searchValue.trim());
    else params.delete("search");
    pushParams(params);
  }

  function handleSortChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", value);
    pushParams(params);
  }

  function clearSearch() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("search");
    setSearchValue("");
    pushParams(params);
  }

  const hasFilters = Boolean(searchValue.trim() || searchParams.get("sort"));

  return (
    <div className="mb-4 rounded-2xl border border-border/60 bg-card/45 p-3 shadow-sm sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={handleSearchSubmit} className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search products"
            placeholder="Search products by title…"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            className="h-11 rounded-xl border-border/70 bg-background pl-10 pr-20 text-sm shadow-none"
          />
          {searchValue && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {isPending && (
            <span className="absolute right-10 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin rounded-full border-2 border-muted-foreground/25 border-t-foreground" />
          )}
        </form>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <SlidersHorizontal className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
          <Select value={currentSort} onValueChange={handleSortChange}>
            <SelectTrigger className="h-11 w-full min-w-0 rounded-xl border-border/70 bg-background sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="price_asc">Price: low to high</SelectItem>
              <SelectItem value="price_desc">Price: high to low</SelectItem>
              <SelectItem value="featured_first">Featured first</SelectItem>
              <SelectItem value="title_asc">Title: A–Z</SelectItem>
              <SelectItem value="title_desc">Title: Z–A</SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                const params = new URLSearchParams();
                setSearchValue("");
                pushParams(params);
              }}
              className="h-11 shrink-0 rounded-xl px-3 text-muted-foreground hover:text-foreground"
            >
              <X className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">Reset</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
