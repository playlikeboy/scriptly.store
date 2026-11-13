import Link from "next/link";
import { BLOG_POSTS, type BlogPost } from "@/lib/blog-data";
import { ArrowRight, Search, X } from "lucide-react";
import { Metadata } from "next";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ScriptlyStore Blog | Traffic Driving Developer Resource Centre",
  description: "Read the latest developer guides, SaaS launching strategies, prompt engineering manuals, and software side-hustle guides.",
};

interface PageProps {
  searchParams: Promise<{
    category?: string;
    search?: string;
  }>;
}

// Categories are derived from the posts themselves so every chip has content.
const CATEGORIES = Array.from(new Set(BLOG_POSTS.map((p) => p.category)));

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formatDate(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : dateFormatter.format(d);
}

function PostMeta({ post }: { post: BlogPost }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <span>{post.category}</span>
      <span aria-hidden="true">·</span>
      <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
      <span aria-hidden="true">·</span>
      <span>{post.readTime}</span>
    </p>
  );
}

export default async function BlogIndexPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const currentCategory = (resolvedParams.category || "all").toLowerCase();
  const rawSearch = (resolvedParams.search || "").trim();
  const currentSearch = rawSearch.toLowerCase();

  const filteredPosts = BLOG_POSTS.filter((post) => {
    const matchesCategory = currentCategory === "all" || post.category.toLowerCase() === currentCategory;
    const matchesSearch =
      !currentSearch ||
      post.title.toLowerCase().includes(currentSearch) ||
      post.excerpt.toLowerCase().includes(currentSearch) ||
      post.content.toLowerCase().includes(currentSearch);
    return matchesCategory && matchesSearch;
  });

  const isFiltered = currentCategory !== "all" || !!currentSearch;
  const featuredPost = !isFiltered ? filteredPosts[0] : undefined;
  const regularPosts = featuredPost ? filteredPosts.slice(1) : filteredPosts;

  const chipHref = (cat: string) => ({
    pathname: "/blog",
    query: {
      ...(cat !== "all" && { category: cat.toLowerCase() }),
      ...(rawSearch && { search: rawSearch }),
    },
  });

  return (
    <div className="bg-background text-foreground">
      {/* Blog JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Blog",
            "name": "ScriptlyStore Blog",
            "description": "Read the latest developer guides, SaaS launching strategies, prompt engineering manuals, and software side-hustle guides.",
            "publisher": {
              "@type": "Organization",
              "name": "ScriptlyStore",
              "logo": {
                "@type": "ImageObject",
                "url": "https://scriptly.store/logo.png"
              }
            },
            "url": "https://scriptly.store/blog",
            "blogPost": BLOG_POSTS.map(post => ({
              "@type": "BlogPosting",
              "headline": post.title,
              "description": post.excerpt,
              "image": post.thumbnail,
              "datePublished": post.createdAt,
              "author": {
                "@type": "Person",
                "name": post.author.name
              },
              "url": `https://scriptly.store/blog/${post.slug}`
            }))
          })
        }}
      />
      {/* BreadcrumbList JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://scriptly.store/"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Blog",
                "item": "https://scriptly.store/blog"
              }
            ]
          })
        }}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {/* Header */}
        <header className="max-w-[68ch] space-y-3">
          <h1 className="font-display text-3xl md:text-5xl text-foreground">ScriptlyStore Blog</h1>
          <p className="text-base text-muted-foreground leading-relaxed">
            Actionable guides, framework reviews, deployment walkthroughs, and passive income playbooks built for solo developers and SaaS founders.
          </p>
        </header>

        {/* Filters */}
        <div className="mt-10 flex flex-col gap-4 border-b border-border pb-4 md:flex-row md:items-center md:justify-between">
          <nav aria-label="Blog categories" className="-mx-4 overflow-x-auto px-4 scrollbar-none md:mx-0 md:px-0">
            <ul className="flex items-center gap-1.5">
              {["all", ...CATEGORIES].map((cat) => {
                const isActive = currentCategory === cat.toLowerCase();
                return (
                  <li key={cat} className="shrink-0">
                    <Link
                      href={chipHref(cat)}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "inline-flex h-8 items-center rounded-full px-3 text-sm transition-colors duration-150",
                        isActive
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}
                    >
                      {cat === "all" ? "All" : cat}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <form method="GET" action="/blog" role="search" className="relative w-full md:w-72">
            <label htmlFor="blog-search" className="sr-only">Search articles</label>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
            <input
              id="blog-search"
              type="search"
              name="search"
              defaultValue={rawSearch}
              placeholder="Search articles"
              className="h-10 w-full rounded-[10px] border border-input bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            />
            {currentCategory !== "all" && (
              <input type="hidden" name="category" value={currentCategory} />
            )}
          </form>
        </div>

        {isFiltered && (
          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <p aria-live="polite">
              {filteredPosts.length} {filteredPosts.length === 1 ? "article" : "articles"}
              {rawSearch && <> matching &ldquo;<span className="text-foreground">{rawSearch}</span>&rdquo;</>}
            </p>
            <Link href="/blog" className="inline-flex items-center gap-1 text-primary hover:underline">
              <X className="size-3.5" strokeWidth={1.75} aria-hidden="true" /> Clear filters
            </Link>
          </div>
        )}

        {/* Featured */}
        {featuredPost && (
          <article className="mt-12">
            <Link
              href={`/blog/${featuredPost.slug}`}
              className="group grid grid-cols-1 gap-6 md:gap-10 lg:grid-cols-12 lg:items-center rounded-2xl focus-visible:outline-offset-4"
            >
              <div className="overflow-hidden rounded-2xl bg-muted lg:col-span-7">
                <img
                  src={featuredPost.thumbnail}
                  alt=""
                  width={1200}
                  height={750}
                  decoding="async"
                  fetchPriority="high"
                  className="aspect-[16/10] w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
                />
              </div>
              <div className="space-y-4 lg:col-span-5">
                <PostMeta post={featuredPost} />
                <h2 className="font-display text-2xl md:text-4xl text-foreground transition-colors group-hover:text-primary">
                  {featuredPost.title}
                </h2>
                <p className="text-base text-muted-foreground leading-relaxed">{featuredPost.excerpt}</p>
                <p className="text-sm text-muted-foreground">
                  By <span className="text-foreground">{featuredPost.author.name}</span>
                  {featuredPost.author.role && <>, {featuredPost.author.role}</>}
                </p>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                  Read article
                  <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" strokeWidth={1.75} aria-hidden="true" />
                </span>
              </div>
            </Link>
          </article>
        )}

        {/* Posts */}
        <section aria-labelledby="latest-heading" className={cn(featuredPost ? "mt-16 md:mt-24" : "mt-10")}>
          <h2 id="latest-heading" className={cn("font-display text-2xl text-foreground mb-8", !featuredPost && "sr-only")}>
            {featuredPost ? "Latest articles" : "Articles"}
          </h2>

          {filteredPosts.length === 0 ? (
            <div className="max-w-[68ch] rounded-2xl border border-dashed border-border px-6 py-16 text-center">
              <p className="text-base font-medium text-foreground">No articles found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Nothing matches these filters. Try a different search or browse every article.
              </p>
              <Link href="/blog" className="mt-5 inline-flex h-10 items-center rounded-[10px] border border-input bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
                View all articles
              </Link>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {regularPosts.map((post) => (
                <li key={post.slug}>
                  <article>
                    <Link href={`/blog/${post.slug}`} className="group block rounded-2xl focus-visible:outline-offset-4">
                      <div className="overflow-hidden rounded-2xl bg-muted">
                        <img
                          src={post.thumbnail}
                          alt=""
                          width={600}
                          height={375}
                          loading="lazy"
                          decoding="async"
                          className="aspect-[16/10] w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
                        />
                      </div>
                      <div className="mt-4 space-y-2">
                        <PostMeta post={post} />
                        <h3 className="text-lg font-semibold leading-snug text-foreground transition-colors group-hover:text-primary line-clamp-2">
                          {post.title}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{post.excerpt}</p>
                        <p className="pt-1 text-xs text-muted-foreground">By {post.author.name}</p>
                      </div>
                    </Link>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
