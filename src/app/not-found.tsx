import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

const SUGGESTIONS = [
  { href: "/explore", label: "Explore the catalogue" },
  { href: "/featured", label: "Featured products" },
  { href: "/free", label: "Free products" },
  { href: "/blog", label: "Guides & articles" },
];

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-7xl items-center px-4 py-16 sm:px-6 md:py-24 lg:px-8">
      <div className="w-full max-w-2xl">
        <h1 className="font-display text-4xl leading-[1.05] font-medium tracking-[-0.03em] text-balance text-foreground md:text-6xl">
          This page isn&apos;t in the catalogue.
        </h1>
        <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-muted-foreground md:text-lg">
          Error 404. The link may be broken, or the product may have moved or been unpublished. Search for it, or
          start from one of the sections below.
        </p>

        {/* Plain GET form: works without client JavaScript. */}
        <form action="/search" method="get" role="search" className="mt-8 flex max-w-lg flex-col gap-2 sm:flex-row">
          <label htmlFor="not-found-search" className="sr-only">
            Search products
          </label>
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <input
              id="not-found-search"
              type="search"
              name="search"
              placeholder="Templates, scripts, UI kits…"
              autoComplete="off"
              className="h-11 w-full rounded-[10px] border border-input bg-card pr-3 pl-9 text-sm text-foreground transition-colors outline-none placeholder:text-muted-foreground hover:border-foreground/25 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </div>
          <Button type="submit" size="lg">
            Search
          </Button>
        </form>

        <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3 border-t border-border pt-6 text-sm">
          <li>
            <Link href="/" className="font-medium text-foreground underline-offset-4 hover:underline">
              Home
            </Link>
          </li>
          {SUGGESTIONS.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
