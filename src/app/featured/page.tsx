export const dynamic = "force-dynamic";

import { Metadata } from "next";
import { getProductsAction, getCategoriesAction } from "@/lib/actions/products";
import {
  ActiveFilters,
  CatalogEmpty,
  CatalogHeader,
  CatalogPagination,
  CatalogShell,
  CatalogToolbar,
  ChipNav,
  ProductGrid,
  ResultCount,
  buildHref,
  categoryNameMap,
  parsePage,
  parsePrice,
  parseSort,
  type ActiveFilter,
  type PriceKey,
  type SortKey,
} from "@/app/explore/_components/catalog";

const PAGE_SIZE = 24;
const FEATURED_SORTS: SortKey[] = ["featured_premium", "rating", "newest", "price_asc", "price_desc"];

interface FeaturedPageProps {
  searchParams: Promise<{
    category?: string;
    search?: string;
    q?: string;
    page?: string;
    sort?: string;
    price?: string;
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

export default async function FeaturedPage({ searchParams }: FeaturedPageProps) {
  const resolvedParams = await searchParams;
  const currentCategory = resolvedParams.category || "all";
  const currentSearch = (resolvedParams.search || resolvedParams.q || "").trim();
  const currentPage = parsePage(resolvedParams.page);
  const currentSort = parseSort(resolvedParams.sort, FEATURED_SORTS, "featured_premium");
  const currentPrice = parsePrice(resolvedParams.price);

  // SQL pushdown query for featured items, in parallel with the category list.
  const [categories, { products: productsList, total, totalPages }] = await Promise.all([
    getCategoriesAction(),
    getProductsAction({
      featuredOnly: true,
      category: currentCategory === "all" ? undefined : currentCategory,
      search: currentSearch || undefined,
      page: currentPage,
      limit: PAGE_SIZE,
      sortBy: currentSort,
      priceType: currentPrice,
    }),
  ]);

  const activeCategoryObj = categories.find((c) => c.slug === currentCategory);

  const state = {
    category: currentCategory !== "all" ? currentCategory : undefined,
    search: currentSearch || undefined,
    sort: currentSort !== "featured_premium" ? currentSort : undefined,
    price: currentPrice !== "all" ? currentPrice : undefined,
  };
  const hrefWith = (overrides: Partial<Record<keyof typeof state, string | undefined>>) =>
    buildHref("/featured", { ...state, ...overrides });

  const filters: ActiveFilter[] = [];
  if (state.category) {
    filters.push({ label: activeCategoryObj?.name || currentCategory, removeHref: hrefWith({ category: undefined }) });
  }
  if (currentSearch) filters.push({ label: `“${currentSearch}”`, removeHref: hrefWith({ search: undefined }) });
  if (currentPrice !== "all") {
    filters.push({ label: currentPrice === "free" ? "Free" : "Paid", removeHref: hrefWith({ price: undefined }) });
  }

  return (
    <CatalogShell>
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
              position: (currentPage - 1) * PAGE_SIZE + index + 1,
              item: {
                "@type": "Product",
                name: prod.title,
                url: `https://scriptly.store/products/${prod.slug}`,
                description: prod.shortDescription || prod.title,
                image: prod.thumbnail,
                offers: {
                  "@type": "Offer",
                  priceCurrency: "USD",
                  price: (prod.price / 100).toFixed(2),
                  availability: "https://schema.org/InStock",
                },
              },
            })),
          }),
        }}
      />

      <CatalogHeader
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Featured" }]}
        title="Featured products"
        description="Our hand-picked selection of production-grade SaaS boilerplates, automation scripts, and UI systems tested for immediate deployment."
        aside={
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground md:flex-col md:items-end">
            <li>Commercial license included</li>
            <li>Instant code delivery</li>
          </ul>
        }
      />

      <div className="mb-6">
        <ChipNav
          label="Categories"
          items={[
            { label: "All featured", href: hrefWith({ category: undefined }), active: currentCategory === "all" },
            ...categories.map((cat) => ({
              label: cat.name,
              href: hrefWith({ category: cat.slug }),
              active: currentCategory === cat.slug,
            })),
          ]}
        />
      </div>

      <CatalogToolbar
        action="/featured"
        hidden={{ category: state.category, price: state.price }}
        search={currentSearch}
        searchPlaceholder="Search featured boilerplates, tools, scripts"
        price={{ current: currentPrice, hrefFor: (p: PriceKey) => hrefWith({ price: p === "all" ? undefined : p }) }}
        sort={{
          current: currentSort,
          options: FEATURED_SORTS,
          hrefFor: (s: SortKey) => hrefWith({ sort: s === "featured_premium" ? undefined : s }),
        }}
      />

      <ActiveFilters filters={filters} clearHref="/featured" />

      <div className="mb-6 mt-6">
        <ResultCount total={total} page={currentPage} limit={PAGE_SIZE} noun="featured release" />
      </div>

      {productsList.length === 0 ? (
        <CatalogEmpty
          title="No featured products found"
          body="We could not find any featured releases matching your current filters."
          action={{ href: "/featured", label: "Reset filters" }}
        />
      ) : (
        <>
          <ProductGrid products={productsList} categoryNames={categoryNameMap(categories)} />
          <CatalogPagination totalPages={totalPages} currentPage={currentPage} />
        </>
      )}
    </CatalogShell>
  );
}
