"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition, useState, useEffect, useId } from "react";
import { Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import ProductCard from "@/components/marketplace/ProductCard";

// Re-exported for legacy imports (`import { ProductCard } from "@/components/SearchFilter"`).
export { ProductCard };

function targetPath(pathname: string) {
  if (pathname.startsWith("/explore")) return "/explore";
  if (pathname === "/free") return "/free";
  return "/search";
}

export default function SearchFilter({
  categories,
}: {
  categories: { id: string; name: string; slug: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const inputId = useId();

  const currentCategory = searchParams.get("category") || "all";
  const [searchValue, setSearchValue] = useState(searchParams.get("search") || "");

  useEffect(() => {
    setSearchValue(searchParams.get("search") || "");
  }, [searchParams]);

  function navigate(url: string) {
    startTransition(() => router.push(url));
  }

  function handleSearchSubmit(value: string) {
    const term = value.trim();
    const params = new URLSearchParams(searchParams.toString());
    if (term) params.set("search", term);
    else params.delete("search");
    params.delete("page");
    const qs = params.toString();
    navigate(`${targetPath(pathname)}${qs ? `?${qs}` : ""}`);
  }

  function handleCategorySelect(slug: string) {
    if (pathname.startsWith("/explore")) {
      navigate(slug === "all" ? "/explore" : `/explore/${slug}`);
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    if (slug === "all") params.delete("category");
    else params.set("category", slug);
    params.delete("page");
    const qs = params.toString();
    navigate(`${pathname}${qs ? `?${qs}` : ""}`);
  }

  const chipClass = (active: boolean) =>
    cn(
      "inline-flex h-8 shrink-0 items-center rounded-full border px-3 text-[13px] whitespace-nowrap transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer",
      active
        ? "border-foreground bg-foreground text-background"
        : "border-border bg-card text-muted-foreground hover:border-foreground/25 hover:text-foreground"
    );

  return (
    <div className="flex w-full flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div
        role="group"
        aria-label="Filter by category"
        className="-mx-4 flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto px-4 pb-1 scrollbar-none md:mx-0 md:px-0 md:pb-0"
      >
        <button
          type="button"
          aria-pressed={currentCategory === "all"}
          className={chipClass(currentCategory === "all")}
          onClick={() => handleCategorySelect("all")}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            aria-pressed={currentCategory === cat.slug}
            className={chipClass(currentCategory === cat.slug)}
            onClick={() => handleCategorySelect(cat.slug)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          handleSearchSubmit(searchValue);
        }}
        className="relative flex w-full items-center md:w-80"
      >
        <label htmlFor={inputId} className="sr-only">
          Search products
        </label>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          strokeWidth={1.75}
          aria-hidden="true"
        />
        <Input
          id={inputId}
          type="search"
          placeholder="Search scripts or stack"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="h-10 rounded-[10px] bg-card pl-9 pr-20 [&::-webkit-search-cancel-button]:hidden"
        />
        {searchValue && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => {
              setSearchValue("");
              handleSearchSubmit("");
            }}
            className="absolute right-11 top-1/2 -translate-y-1/2"
            aria-label="Clear search"
          >
            <X strokeWidth={1.75} aria-hidden="true" />
          </Button>
        )}
        <Button
          type="submit"
          variant="default"
          size="icon-sm"
          className="absolute right-1 top-1/2 -translate-y-1/2"
          aria-label="Search"
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="animate-spin" strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <Search strokeWidth={1.75} aria-hidden="true" />
          )}
        </Button>
      </form>
    </div>
  );
}
