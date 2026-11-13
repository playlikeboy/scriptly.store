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
} from "../../_components/catalog";

const PAGE_SIZE = 24;

interface SubcategoryPageProps {
  params: Promise<{
    category: string;
    subcategory: string;
  }>;
  searchParams: Promise<{
    search?: string;
    page?: string;
    sort?: string;
    price?: string;
  }>;
}

// Deduplicate taxonomy queries between generateMetadata and the page render.
const getTaxonomy = cache(() => Promise.all([getCategoriesAction(), getSubcategoriesAction()]));

export async function generateMetadata({ params }: SubcategoryPageProps): Promise<Metadata> {
  const { category, subcategory } = await params;
  const [categories, subcategories] = await getTaxonomy();

  const cat = categories.find((c) => c.slug === category);
  const sub = subcategories.find((s) => s.slug === subcategory);

  const title = `${sub ? sub.name : subcategory} (${cat ? cat.name : category}) | ScriptlyStore`;
  const description = `Discover verified ${sub ? sub.name : subcategory} digital assets under ${cat ? cat.name : category} on ScriptlyStore.`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://scriptly.store/explore/${category}/${subcategory}`,
    },
    openGraph: {
      title,
      description,
      url: `https://scriptly.store/explore/${category}/${subcategory}`,
    },
  };
}

export default async function SubcategoryExplorePage({ params, searchParams }: SubcategoryPageProps) {
  const { category, subcategory } = await params;
  const resolvedParams = await searchParams;
  const currentSearch = (resolvedParams.search || "").trim();
  const currentPage = parsePage(resolvedParams.page);
  const currentSort = parseSort(resolvedParams.sort, CATALOG_SORTS, "newest");
  const currentPrice = parsePrice(resolvedParams.price);

  const [categories, allSubcategories] = await getTaxonomy();

  const activeCategory = categories.find((c) => c.slug === category);
  if (!activeCategory) {
    notFound();
  }

  const siblings = allSubcategories.filter((s) => s.categoryId === activeCategory.id);
  const activeSubcategory = siblings.find((s) => s.slug === subcategory);
  if (!activeSubcategory) {
    notFound();
  }

  // Scalable SQL query for this specific subcategory
  const { products: productsList, total, totalPages } = await getProductsAction({
    category: activeCategory.slug,
    subcategory: activeSubcategory.slug,
    search: currentSearch || undefined,
    page: currentPage,
    limit: PAGE_SIZE,
    sortBy: currentSort,
    priceType: currentPrice,
  });

  const categoryPath = `/explore/${category}`;
  const basePath = `${categoryPath}/${subcategory}`;
  const state = {
    search: currentSearch || undefined,
    sort: currentSort !== "newest" ? currentSort : undefined,
    price: currentPrice !== "all" ? currentPrice : undefined,
  };
  const hrefWith = (overrides: Partial<Record<keyof typeof state, string | undefined>>) =>
    buildHref(basePath, { ...state, ...overrides });

  const filters: ActiveFilter[] = [];
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
          { label: activeCategory.name, href: categoryPath },
          { label: activeSubcategory.name },
        ]}
        title={activeSubcategory.name}
        description={`Curated ${activeSubcategory.name.toLowerCase()} assets and boilerplates ready for production deployment.`}
      />

      {siblings.length > 1 && (
        <div className="mb-6">
          <ChipNav
            label={`${activeCategory.name} subcategories`}
            items={[
              { label: `All ${activeCategory.name}`, href: categoryPath, active: false },
              ...siblings.map((sub) => ({
                label: sub.name,
                href: `${categoryPath}/${sub.slug}`,
                active: sub.slug === activeSubcategory.slug,
              })),
            ]}
          />
        </div>
      )}

      <CatalogToolbar
        action={basePath}
        hidden={{ price: state.price }}
        search={currentSearch}
        searchPlaceholder={`Search in ${activeSubcategory.name}`}
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
          title={`No products found in ${activeSubcategory.name}`}
          body="Try clearing your search, or browse the rest of this category."
          action={{ href: categoryPath, label: `Browse all ${activeCategory.name}` }}
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
