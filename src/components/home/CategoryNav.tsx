import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { HomeCategory } from "@/components/home/product-bits";

interface CategoryNavProps {
  categories: HomeCategory[];
}

export default function CategoryNav({ categories }: CategoryNavProps) {
  if (categories.length === 0) return null;

  const sorted = [...categories].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <section aria-labelledby="home-categories-title" className="border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-12 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-baseline md:gap-12">
          <h2
            id="home-categories-title"
            className="shrink-0 font-display text-2xl font-medium tracking-[-0.02em] text-foreground md:w-56"
          >
            Browse by category
          </h2>
          <ul className="flex flex-wrap gap-2">
            {sorted.map((category) => (
              <li key={category.id}>
                <Link
                  href={`/explore/${category.slug}`}
                  className="inline-flex h-9 items-center rounded-full border border-border bg-card px-4 text-sm text-foreground transition-colors duration-150 outline-none hover:border-foreground/30 hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {category.name}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/explore"
                className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-sm text-muted-foreground transition-colors duration-150 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                Everything
                <ArrowUpRight className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
