export const dynamic = "force-dynamic";

import { cache } from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
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
  parsePage,
  parsePrice,
  parseSort,
  type ActiveFilter,
  type PriceKey,
  type SortKey,
} from "../_components/catalog";

const PAGE_SIZE = 24;

interface CategoryPageProps {
  params: Promise<{
    category: string;
  }>;
  searchParams: Promise<{
    sub?: string;
    search?: string;
    page?: string;
    sort?: string;
    price?: string;
  }>;
}

// Deduplicates the categories query between generateMetadata and the page render.
const getCategories = cache(() => getCategoriesAction());

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category } = await params;
  const categories = await getCategories();
  const cat = categories.find((c) => c.slug === category);

  const title = cat ? `${cat.name} Library | ScriptlyStore` : "Explore Category | ScriptlyStore";
  const description = `Browse verified ${cat ? cat.name : category} templates, boilerplates, and developer scripts on ScriptlyStore.`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://scriptly.store/explore/${category}`,
    },
    openGraph: {
      title,
      description,
      url: `https://scriptly.store/explore/${category}`,
    },
  };
}

export default async function CategoryExplorePage({ params, searchParams }: CategoryPageProps) {
  const { category } = await params;
  const resolvedParams = await searchParams;
  const currentSubcategory = resolvedParams.sub;
  const currentSearch = (resolvedParams.search || "").trim();
  const currentPage = parsePage(resolvedParams.page);
  const currentSort = parseSort(resolvedParams.sort, CATALOG_SORTS, "newest");
  const currentPrice = parsePrice(resolvedParams.price);

  const [categories, allSubcategories] = await Promise.all([getCategories(), getSubcategoriesAction()]);

  const activeCategory = categories.find((c) => c.slug === category);
  if (!activeCategory) {
    notFound();
  }

  const subcategories = allSubcategories.filter((s) => s.categoryId === activeCategory.id);
  const activeSub = subcategories.find((s) => s.slug === currentSubcategory);

  // Scalable SQL query: filtering, sorting and pagination are pushed down.
  const { products: productsList, total, totalPages } = await getProductsAction({
    category: activeCategory.slug,
    subcategory: currentSubcategory,
    search: currentSearch || undefined,
    page: currentPage,
    limit: PAGE_SIZE,
    sortBy: currentSort,
    priceType: currentPrice,
  });

  const basePath = `/explore/${category}`;
  const state = {
    sub: currentSubcategory,
    search: currentSearch || undefined,
    sort: currentSort !== "newest" ? currentSort : undefined,
    price: currentPrice !== "all" ? currentPrice : undefined,
  };
  const hrefWith = (overrides: Partial<Record<keyof typeof state, string | undefined>>) =>
    buildHref(basePath, { ...state, ...overrides });

  const filters: ActiveFilter[] = [];
  if (currentSubcategory) {
    filters.push({ label: activeSub?.name || currentSubcategory, removeHref: hrefWith({ sub: undefined }) });
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
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Explore", href: "/explore" },
          { label: activeCategory.name },
        ]}
        title={activeCategory.name}
        description={`Curated, production-tested ${activeCategory.name.toLowerCase()} for software engineers and indie builders.`}
      />

      {subcategories.length > 0 && (
        <div className="mb-6">
          <ChipNav
            label={`${activeCategory.name} subcategories`}
            items={[
              { label: `All ${activeCategory.name}`, href: basePath, active: !currentSubcategory },
              ...subcategories.map((sub) => ({
                label: sub.name,
                href: `${basePath}/${sub.slug}`,
                active: currentSubcategory === sub.slug,
              })),
            ]}
          />
        </div>
      )}

      <CatalogToolbar
        action={basePath}
        hidden={{ sub: state.sub, price: state.price }}
        search={currentSearch}
        searchPlaceholder={`Search in ${activeCategory.name}`}
        price={{ current: currentPrice, hrefFor: (p: PriceKey) => hrefWith({ price: p === "all" ? undefined : p }) }}
        sort={{
          current: currentSort,
          options: CATALOG_SORTS,
          hrefFor: (s: SortKey) => hrefWith({ sort: s === "newest" ? undefined : s }),
        }}
      />

      <ActiveFilters filters={filters} clearHref={basePath} />

      <div className="mb-6 mt-6">
        <ResultCount total={total} page={currentPage} limit={PAGE_SIZE} />
      </div>

      {productsList.length === 0 ? (
        <CatalogEmpty
          title={`No products found in ${activeCategory.name}`}
          body="Try clearing your search or check back soon as creators add new items."
          action={{ href: basePath, label: "Reset filters" }}
        />
      ) : (
        <>
          <ProductGrid
            products={productsList}
            categoryNames={{ [activeCategory.slug]: activeCategory.name }}
          />
          <CatalogPagination totalPages={totalPages} currentPage={currentPage} />
        </>
      )}
    </CatalogShell>
  );
}
