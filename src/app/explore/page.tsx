export const dynamic = "force-dynamic";

import { Metadata } from "next";
import { getProductsAction, getCategoriesAction, getSubcategoriesAction } from "@/lib/actions/products";
import {
  ActiveFilters,
  CATALOG_SORTS,
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
} from "./_components/catalog";

const PAGE_SIZE = 24;

interface ExplorePageProps {
  searchParams: Promise<{
    category?: string;
    sub?: string;
    search?: string;
    q?: string;
    page?: string;
    sort?: string;
    /** Legacy alias used by older links (e.g. `/explore?sortBy=rating`). */
    sortBy?: string;
    price?: string;
  }>;
}

export async function generateMetadata({ searchParams }: ExplorePageProps): Promise<Metadata> {
  const params = await searchParams;
  const cat = params.category && params.category !== "all" ? params.category : "All Categories";
  return {
    title: `Explore ${cat.replace(/-/g, " ")} | ScriptlyStore Marketplace`,
    description: "Discover developer-curated SaaS boilerplates, backend scripts, UI kits, and AI tools with automated digital delivery.",
    alternates: {
      canonical: "https://scriptly.store/explore",
    },
  };
}

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const resolvedParams = await searchParams;
  const currentCategory = resolvedParams.category || "all";
  const currentSubcategory = resolvedParams.sub;
  const currentSearch = (resolvedParams.search || resolvedParams.q || "").trim();
  const currentPage = parsePage(resolvedParams.page);
  const currentSort = parseSort(resolvedParams.sort || resolvedParams.sortBy, CATALOG_SORTS, "newest");
  const currentPrice = parsePrice(resolvedParams.price);

  // Categories, subcategories and the product page are independent: fetch in parallel.
  const [categories, subcategories, { products: productsList, total, totalPages }] = await Promise.all([
    getCategoriesAction(),
    getSubcategoriesAction(),
    getProductsAction({
      category: currentCategory === "all" ? undefined : currentCategory,
      subcategory: currentSubcategory,
      search: currentSearch || undefined,
      page: currentPage,
      limit: PAGE_SIZE,
      sortBy: currentSort,
      priceType: currentPrice,
    }),
  ]);

  const activeCategoryObj = categories.find((c) => c.slug === currentCategory);
  const relevantSubcategories = activeCategoryObj
    ? subcategories.filter((s) => s.categoryId === activeCategoryObj.id)
    : [];
  const activeSubObj = relevantSubcategories.find((s) => s.slug === currentSubcategory);

  const state = {
    category: currentCategory !== "all" ? currentCategory : undefined,
    sub: currentSubcategory,
    search: currentSearch || undefined,
    sort: currentSort !== "newest" ? currentSort : undefined,
    price: currentPrice !== "all" ? currentPrice : undefined,
  };
  const hrefWith = (overrides: Partial<Record<keyof typeof state, string | undefined>>) =>
    buildHref("/explore", { ...state, ...overrides });

  const filters: ActiveFilter[] = [];
  if (activeCategoryObj || state.category) {
    filters.push({
      label: activeCategoryObj?.name || currentCategory,
      removeHref: hrefWith({ category: undefined, sub: undefined }),
    });
  }
  if (currentSubcategory) {
    filters.push({ label: activeSubObj?.name || currentSubcategory, removeHref: hrefWith({ sub: undefined }) });
  }
  if (currentSearch) {
    filters.push({ label: `“${currentSearch}”`, removeHref: hrefWith({ search: undefined }) });
  }
  if (currentPrice !== "all") {
    filters.push({ label: currentPrice === "free" ? "Free" : "Paid", removeHref: hrefWith({ price: undefined }) });
  }

  return (
    <CatalogShell>
      <CatalogHeader
        title={activeCategoryObj ? activeCategoryObj.name : "All digital products"}
        description="Discover battle-tested boilerplates, automation scripts, and UI libraries. Filtered and verified for fast engineering pipelines."
      />

      <div className="mb-6 space-y-3">
        <ChipNav
          label="Categories"
          items={[
            { label: "All categories", href: "/explore", active: currentCategory === "all" },
            ...categories.map((cat) => ({
              label: cat.name,
              href: `/explore/${cat.slug}`,
              active: currentCategory === cat.slug,
            })),
          ]}
        />
        {relevantSubcategories.length > 0 && (
          <ChipNav
            label="Subcategories"
            size="sm"
            items={[
              { label: "All", href: `/explore/${currentCategory}`, active: !currentSubcategory },
              ...relevantSubcategories.map((sub) => ({
                label: sub.name,
                href: `/explore/${currentCategory}/${sub.slug}`,
                active: currentSubcategory === sub.slug,
              })),
            ]}
          />
        )}
      </div>

      <CatalogToolbar
        action="/explore"
        hidden={{ category: state.category, sub: state.sub, price: state.price }}
        search={currentSearch}
        searchPlaceholder="Search scripts, boilerplates, keywords"
        price={{ current: currentPrice, hrefFor: (p: PriceKey) => hrefWith({ price: p === "all" ? undefined : p }) }}
        sort={{
          current: currentSort,
          options: CATALOG_SORTS,
          hrefFor: (s: SortKey) => hrefWith({ sort: s === "newest" ? undefined : s }),
        }}
      />

      <ActiveFilters filters={filters} clearHref="/explore" />

      <div className="mb-6 mt-6">
        <ResultCount total={total} page={currentPage} limit={PAGE_SIZE} />
      </div>

      {productsList.length === 0 ? (
        <CatalogEmpty
          title="No products match these filters"
          body="Try a different keyword, remove a filter, or browse another category."
          action={{ href: "/explore", label: "Clear all filters" }}
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
