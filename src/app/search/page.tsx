import { Metadata } from "next";
import { getProductsAction, getCategoriesAction } from "@/lib/actions/products";
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
} from "@/app/explore/_components/catalog";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 36;

interface PageProps {
  searchParams: Promise<{
    search?: string;
    q?: string;
    category?: string;
    page?: string;
    sort?: string;
    price?: string;
  }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { search } = await searchParams;
  return {
    title: search ? `Results for "${search}"` : "Search Library",
    description: "Discover premium SaaS boilerplates, UI kits, and digital tools on ScriptlyStore.",
    alternates: {
      canonical: "https://scriptly.store/search",
    },
  };
}

export default async function SearchPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const currentSearch = (resolvedParams.search || resolvedParams.q || "").trim();
  const currentCategory = resolvedParams.category && resolvedParams.category !== "all" ? resolvedParams.category : undefined;
  const currentPage = parsePage(resolvedParams.page);
  const currentSort = parseSort(resolvedParams.sort, CATALOG_SORTS, "newest");
  const currentPrice = parsePrice(resolvedParams.price);

  const [categoriesList, { products: productsList, totalPages, total }] = await Promise.all([
    getCategoriesAction(),
    getProductsAction({
      search: currentSearch || undefined,
      category: currentCategory,
      page: currentPage,
      limit: PAGE_SIZE,
      sortBy: currentSort,
      priceType: currentPrice,
    }),
  ]);

  const activeCategory = categoriesList.find((c) => c.slug === currentCategory);

  const state = {
    search: currentSearch || undefined,
    category: currentCategory,
    sort: currentSort !== "newest" ? currentSort : undefined,
    price: currentPrice !== "all" ? currentPrice : undefined,
  };
  const hrefWith = (overrides: Partial<Record<keyof typeof state, string | undefined>>) =>
    buildHref("/search", { ...state, ...overrides });

  const filters: ActiveFilter[] = [];
  if (currentSearch) filters.push({ label: `“${currentSearch}”`, removeHref: hrefWith({ search: undefined }) });
  if (currentCategory) {
    filters.push({ label: activeCategory?.name || currentCategory, removeHref: hrefWith({ category: undefined }) });
  }
  if (currentPrice !== "all") {
    filters.push({ label: currentPrice === "free" ? "Free" : "Paid", removeHref: hrefWith({ price: undefined }) });
  }

  return (
    <CatalogShell>
      <CatalogHeader
        title={currentSearch ? <>Results for “{currentSearch}”</> : "Search the library"}
        description={
          currentSearch
            ? `Found ${total.toLocaleString("en-IN")} ${total === 1 ? "match" : "matches"}.`
            : "Browse our entire collection of digital assets."
        }
      />

      <div className="mb-6">
        <ChipNav
          label="Categories"
          items={[
            { label: "All", href: hrefWith({ category: undefined }), active: !currentCategory },
            ...categoriesList.map((cat) => ({
              label: cat.name,
              href: hrefWith({ category: cat.slug }),
              active: currentCategory === cat.slug,
            })),
          ]}
        />
      </div>

      <CatalogToolbar
        action="/search"
        hidden={{ category: state.category, price: state.price }}
        search={currentSearch}
        searchPlaceholder="Search products, stacks, tags"
        price={{ current: currentPrice, hrefFor: (p: PriceKey) => hrefWith({ price: p === "all" ? undefined : p }) }}
        sort={{
          current: currentSort,
          options: CATALOG_SORTS,
          hrefFor: (s: SortKey) => hrefWith({ sort: s === "newest" ? undefined : s }),
        }}
      />

      <ActiveFilters filters={filters} clearHref="/search" />

      <div className="mb-6 mt-6">
        <ResultCount total={total} page={currentPage} limit={PAGE_SIZE} />
      </div>

      {productsList.length === 0 ? (
        <CatalogEmpty
          title={currentSearch ? `Nothing matches “${currentSearch}”` : "No products found"}
          body="Check the spelling, try a broader term, or browse by category."
          action={{ href: "/explore", label: "Browse all products" }}
        />
      ) : (
        <>
          <ProductGrid products={productsList} categoryNames={categoryNameMap(categoriesList)} />
          <CatalogPagination totalPages={totalPages} currentPage={currentPage} />
        </>
      )}
    </CatalogShell>
  );
}
