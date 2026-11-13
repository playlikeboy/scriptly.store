import { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDirectories, safeExternalUrl, slugify } from "./_lib/directories";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Awesome SaaS Launch Directories - Complete SEO Registry",
  description: "Browse 150+ top SaaS directories, startup launchpads, and marketing directories to submit your software, boost domain authority, and accelerate SEO.",
  alternates: {
    canonical: "https://scriptly.store/directories",
  },
};

interface PageProps {
  searchParams: Promise<{
    search?: string;
  }>;
}

export default async function DirectoriesPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const searchQuery = (resolvedParams.search || "").trim();
  const q = searchQuery.toLowerCase();

  const directories = await getDirectories();
  const all = directories ?? [];

  const filtered = q
    ? all.filter((dir) => dir.name.toLowerCase().includes(q) || dir.description.toLowerCase().includes(q))
    : all;

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Awesome SaaS Launch Directories",
    "description": "A curated directory of places to launch your SaaS and boost SEO.",
    "numberOfItems": all.length,
    "itemListElement": all.slice(0, 50).map((dir, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "url": `https://scriptly.store/directories/${slugify(dir.name)}`,
      "name": dir.name,
      "description": dir.description,
    })),
  };

  return (
    <div className="bg-background text-foreground">
      {all.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
        />
      )}

      <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
        <header className="max-w-2xl">
          <h1 className="font-display text-3xl leading-tight tracking-[-0.02em] text-balance md:text-4xl">
            SaaS launch directories
          </h1>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            Submit your startup to{" "}
            {all.length > 0 ? <span className="tabular-nums">{all.length.toLocaleString("en-IN")}</span> : "dozens of"}{" "}
            launch platforms to gain early adopters, build backlinks, and improve domain ranking.
          </p>
        </header>

        <form method="GET" action="/directories" role="search" className="mt-8 flex max-w-lg items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <label htmlFor="directory-search" className="sr-only">
              Search directories
            </label>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <input
              id="directory-search"
              type="search"
              name="search"
              defaultValue={searchQuery}
              placeholder="Search by name or description"
              className="h-10 w-full min-w-0 rounded-[10px] border border-input bg-card pl-9 pr-3 text-sm text-foreground outline-none transition-colors duration-150 placeholder:text-muted-foreground hover:border-foreground/25 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>
          <Button type="submit" className="shrink-0">
            Search
          </Button>
        </form>

        <div className="mt-8 flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
          <p className="text-sm tabular-nums text-muted-foreground" aria-live="polite">
            {searchQuery
              ? `${filtered.length} of ${all.length} directories match “${searchQuery}”`
              : `${all.length} directories`}
          </p>
          {searchQuery && (
            <Link
              href="/directories"
              className="rounded-sm text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Clear search
            </Link>
          )}
        </div>

        {directories === null ? (
          <div className="mt-8 rounded-2xl bg-secondary/60 px-6 py-10" role="alert">
            <p className="text-base font-medium">The directory list could not be loaded</p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              The registry source did not respond. Reload the page in a moment.
            </p>
            <Button asChild variant="outline" className="mt-5">
              <Link href="/directories">Try again</Link>
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-8 rounded-2xl bg-secondary/60 px-6 py-10">
            <p className="text-base font-medium">No directories match your search</p>
            <p className="mt-2 text-sm text-muted-foreground">Try a shorter or different keyword.</p>
            <Button asChild variant="outline" className="mt-5">
              <Link href="/directories">Reset search</Link>
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((dir) => {
              const slug = slugify(dir.name);
              const submitUrl = safeExternalUrl(dir.submission_link);
              return (
                <li key={`${dir.id}-${slug}`} className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:gap-6">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-medium leading-snug">
                      <Link
                        href={`/directories/${slug}`}
                        className="rounded-sm text-foreground transition-colors duration-150 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {dir.name}
                      </Link>
                    </h2>
                    {dir.description && (
                      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                        {dir.description}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/directories/${slug}`} aria-label={`Submission guide for ${dir.name}`}>
                        Guide
                      </Link>
                    </Button>
                    {submitUrl && (
                      <Button asChild variant="outline" size="sm">
                        <a href={submitUrl} target="_blank" rel="noopener noreferrer">
                          Submit
                          <ArrowUpRight className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
                          <span className="sr-only"> to {dir.name} (opens in a new tab)</span>
                        </a>
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
