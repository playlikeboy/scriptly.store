export const dynamic = "force-dynamic";

import { Metadata } from "next";
import Link from "next/link";
import { getProductsAction, getCategoriesAction } from "@/lib/actions/products";
import ProductCard from "@/components/marketplace/ProductCard";
import { ProductPagination } from "@/components/ProductPagination";
import {
  Sparkles,
  ArrowLeft,
  Search,
  LayoutGrid,
  Zap,
  Terminal,
  Palette,
  Bot,
  BookOpen,
  ArrowUpDown,
  ShieldCheck,
  Download,
  Star,
  Layers,
} from "lucide-react";
import { CyberBackground } from "@/components/ui/CyberBackground";
import { Button } from "@/components/ui/button";

interface FeaturedPageProps {
  searchParams: Promise<{
    category?: string;
    search?: string;
    q?: string;
    page?: string;
    sort?: "featured_premium" | "rating" | "newest" | "price_asc" | "price_desc";
    price?: "all" | "free" | "paid";
  }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Featured Products & Premium Boilerplates | ScriptlyStore",
    description:
      "Explore hand-picked, production-ready SaaS templates, automation scripts, developer tools, and UI kits vetted for engineering excellence.",
    alternates: {
      canonical: "https://scriptly.store/featured",
    },
    openGraph: {
      title: "Featured Products & Premium Boilerplates | ScriptlyStore",
      description:
        "Explore hand-picked, production-ready SaaS templates, automation scripts, developer tools, and UI kits vetted for engineering excellence.",
      url: "https://scriptly.store/featured",
      siteName: "ScriptlyStore",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Featured Products & Premium Boilerplates | ScriptlyStore",
      description:
        "Explore hand-picked, production-ready SaaS templates, automation scripts, developer tools, and UI kits vetted for engineering excellence.",
    },
  };
}

const getCategoryIcon = (slug: string) => {
  switch (slug) {
    case "scripts":
      return <Terminal className="w-3.5 h-3.5 text-[#1CB0F6]" />;
    case "saas-templates":
      return <Zap className="w-3.5 h-3.5 text-[#58CC02]" />;
    case "landing-pages":
      return <Layers className="w-3.5 h-3.5 text-[#FF9600]" />;
    case "design-assets":
    case "templates":
    case "ui-kits":
      return <Palette className="w-3.5 h-3.5 text-[#CE82FF]" />;
    case "ai-prompts":
      return <Bot className="w-3.5 h-3.5 text-[#FFC800]" />;
    case "ebooks":
      return <BookOpen className="w-3.5 h-3.5 text-[#FF9600]" />;
    default:
      return <LayoutGrid className="w-3.5 h-3.5 text-primary" />;
  }
};

export default async function FeaturedPage({ searchParams }: FeaturedPageProps) {
  const resolvedParams = await searchParams;
  const currentCategory = resolvedParams.category || "all";
  const currentSearch = (resolvedParams.search || resolvedParams.q || "").trim();
  const currentPage = Math.max(1, parseInt(resolvedParams.page || "1", 10));
  const currentSort = resolvedParams.sort || "featured_premium";
  const currentPrice = resolvedParams.price || "all";

  const categories = await getCategoriesAction();

  // Execute SQL pushdown query for featured items
  const { products: productsList, total, totalPages } = await getProductsAction({
    featuredOnly: true,
    category: currentCategory === "all" ? undefined : currentCategory,
    search: currentSearch || undefined,
    page: currentPage,
    limit: 24,
    sortBy: currentSort,
    priceType: currentPrice,
  });

  const activeCategoryObj = categories.find((c) => c.slug === currentCategory);

  const buildUrl = (overrides: Record<string, string | undefined>) => {
    const params: Record<string, string> = {};
    if (currentCategory !== "all") params.category = currentCategory;
    if (currentSearch) params.search = currentSearch;
    if (currentSort !== "featured_premium") params.sort = currentSort;
    if (currentPrice !== "all") params.price = currentPrice;

    Object.entries(overrides).forEach(([k, v]) => {
      if (v === undefined || v === "all" || (k === "sort" && v === "featured_premium")) {
        delete params[k];
      } else {
        params[k] = v;
      }
    });

    const qs = new URLSearchParams(params).toString();
    return `/featured${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="flex flex-col min-h-screen text-foreground relative bg-background">
      <CyberBackground />

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Featured Digital Products - ScriptlyStore",
            description: "Hand-picked selection of top-rated SaaS boilerplates, developer tools, and automation systems.",
            itemListElement: productsList.map((prod, index) => ({
              "@type": "ListItem",
              position: (currentPage - 1) * 24 + index + 1,
              item: {
                "@type": "Product",
                name: prod.title,
                url: `https://scriptly.store/products/${prod.slug}`,
                description: prod.shortDescription || prod.title,
                image: prod.thumbnail,
                offers: {
                  "@type": "Offer",
                  priceCurrency: "INR",
                  price: (prod.price / 100).toFixed(2),
                  availability: "https://schema.org/InStock",
                },
              },
            })),
          }),
        }}
      />

      <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-16 space-y-10 relative z-10">
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/40 pb-8">
          <div className="space-y-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Home</span>
            </Link>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-mono font-medium text-amber-600 dark:text-amber-400">
                <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-500" />
                <span>Hand-Picked Top Releases</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight text-foreground">
                Featured Products
              </h1>
              <p className="text-sm text-muted-foreground font-medium max-w-2xl leading-relaxed">
                Our hand-picked selection of production-grade SaaS boilerplates, automation scripts, and UI systems
                tested for immediate deployment.
              </p>
            </div>

            {/* Micro-Trust Highlights */}
            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span>{total} Verified Releases</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span>Commercial License Included</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Download className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Instant Code Delivery</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground font-mono self-start md:self-end">
            Showing <strong className="text-foreground">{productsList.length}</strong> of{" "}
            <strong className="text-foreground">{total}</strong> featured releases
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <Link
              href={buildUrl({ category: "all", page: undefined })}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border whitespace-nowrap ${
                currentCategory === "all"
                  ? "bg-foreground text-background border-foreground shadow-xs"
                  : "bg-card/40 border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>All Featured</span>
            </Link>

            {categories.map((cat) => {
              const isActive = currentCategory === cat.slug;
              return (
                <Link
                  key={cat.id}
                  href={buildUrl({ category: cat.slug, page: undefined })}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border whitespace-nowrap ${
                    isActive
                      ? "bg-foreground text-background border-foreground shadow-xs"
                      : "bg-card/40 border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
                >
                  {getCategoryIcon(cat.slug)}
                  <span>{cat.name}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-card/30 border border-border/40 backdrop-blur-md">
          {/* Search form */}
          <form method="GET" action="/featured" className="relative flex-1 w-full max-w-md">
            {currentCategory !== "all" && <input type="hidden" name="category" value={currentCategory} />}
            {currentSort !== "featured_premium" && <input type="hidden" name="sort" value={currentSort} />}
            {currentPrice !== "all" && <input type="hidden" name="price" value={currentPrice} />}

            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              name="search"
              defaultValue={currentSearch}
              placeholder="Search featured boilerplates, tools, scripts..."
              className="w-full pl-10 pr-20 py-2 rounded-xl border border-border/60 bg-background/60 text-foreground placeholder:text-muted-foreground text-xs focus:outline-none focus:border-primary/50 font-medium"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-wider rounded-lg hover:brightness-105 transition-all"
            >
              Search
            </button>
          </form>

          {/* Quick Filters: Price & Sort */}
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
            {/* Price Pills */}
            <div className="flex items-center gap-1 text-xs bg-muted/40 p-1 rounded-xl border border-border/40">
              <Link
                href={buildUrl({ price: "all", page: undefined })}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                  currentPrice === "all" ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All
              </Link>
              <Link
                href={buildUrl({ price: "free", page: undefined })}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                  currentPrice === "free" ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Free
              </Link>
              <Link
                href={buildUrl({ price: "paid", page: undefined })}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                  currentPrice === "paid" ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Paid
              </Link>
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-1.5 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
              <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/40">
                <Link
                  href={buildUrl({ sort: "featured_premium", page: undefined })}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                    currentSort === "featured_premium"
                      ? "bg-card text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Featured
                </Link>
                <Link
                  href={buildUrl({ sort: "rating", page: undefined })}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                    currentSort === "rating"
                      ? "bg-card text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Top Rated
                </Link>
                <Link
                  href={buildUrl({ sort: "newest", page: undefined })}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                    currentSort === "newest"
                      ? "bg-card text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Newest
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Products Grid / Empty State */}
        <div className="space-y-12">
          {productsList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 border border-dashed border-border/70 rounded-3xl bg-card/25 space-y-4 text-center px-4">
              <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground">
                <Sparkles className="w-6 h-6 text-amber-500" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground">No featured products found</h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  We could not find any featured releases matching your current filters.
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="rounded-xl font-bold">
                <Link href="/featured">Reset Filters</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {productsList.map((prod) => (
                <ProductCard
                  key={prod.id}
                  product={prod}
                  categoryName={categories.find((c) => c.slug === prod.category)?.name || prod.category}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pt-8 border-t border-border/40">
              <ProductPagination totalPages={totalPages} currentPage={currentPage} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
