export const dynamic = "force-dynamic";

import Link from "next/link";
import { Metadata } from "next";
import { getProductsAction, getCategoriesAction, getSubcategoriesAction } from "@/lib/actions/products";
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
  parseSort,
  type ActiveFilter,
  type SortKey,
} from "@/app/explore/_components/catalog";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Free Open-Source Developer Scripts & Code - ScriptlyStore",
  description: "Download ready-to-deploy open-source developer scripts, utility macros, scrapers, and automation tools for free. Secured downloads.",
};

const PAGE_SIZE = 36;
const FREE_SORTS: SortKey[] = ["newest", "rating"];

interface PageProps {
  searchParams: Promise<{
    category?: string;
    subcategory?: string;
    search?: string;
    sort?: string;
    /** Legacy param name. */
    sortBy?: string;
    page?: string;
  }>;
}

export default async function FreeProductsPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const currentCategory = resolvedParams.category && resolvedParams.category !== "all" ? resolvedParams.category : undefined;
  const currentSubcategory = currentCategory ? resolvedParams.subcategory || undefined : undefined;
  const currentSearch = (resolvedParams.search || "").trim();
  const currentSort = parseSort(resolvedParams.sort || resolvedParams.sortBy, FREE_SORTS, "newest");
  const currentPage = parsePage(resolvedParams.page);

  // Free products, categories, and subcategories in parallel.
  const [{ products: productsList, total, totalPages }, categoriesList, subcategoriesList] = await Promise.all([
    getProductsAction({
      category: currentCategory,
      subcategory: currentSubcategory,
      search: currentSearch || undefined,
      priceType: "free", // Force only free products
      sortBy: currentSort,
      page: currentPage,
      limit: PAGE_SIZE,
    }),
    getCategoriesAction(),
    getSubcategoriesAction(),
  ]);

  const activeCategory = categoriesList.find((c) => c.slug === currentCategory);
  const activeSubs = activeCategory ? subcategoriesList.filter((s) => s.categoryId === activeCategory.id) : [];
  const activeSub = activeSubs.find((s) => s.slug === currentSubcategory);
  const names = categoryNameMap(categoriesList);

  const state = {
    category: currentCategory,
    subcategory: currentSubcategory,
    search: currentSearch || undefined,
    sort: currentSort !== "newest" ? currentSort : undefined,
  };
  const hrefWith = (overrides: Partial<Record<keyof typeof state, string | undefined>>) =>
    buildHref("/free", { ...state, ...overrides });

  const filters: ActiveFilter[] = [];
  if (currentCategory) {
    filters.push({
      label: activeCategory?.name || currentCategory,
      removeHref: hrefWith({ category: undefined, subcategory: undefined }),
    });
  }
  if (currentSubcategory) {
    filters.push({ label: activeSub?.name || currentSubcategory, removeHref: hrefWith({ subcategory: undefined }) });
  }
  if (currentSearch) filters.push({ label: `“${currentSearch}”`, removeHref: hrefWith({ search: undefined }) });

  // Spotlight featured free drops only on the unfiltered first page.
  const isUnfiltered = !currentCategory && !currentSearch && currentPage === 1;
  const featuredProducts = isUnfiltered ? productsList.filter((p) => p.featured) : [];
  const gridProducts = featuredProducts.length > 0 ? productsList.filter((p) => !p.featured) : productsList;

  return (
    <CatalogShell>
      <CatalogHeader
        title="Free scripts & boilerplates"
        description="Accelerate your development cycle with free open-source boilerplates, scraper scripts, waitlist extensions, and AI recipes. No checkout or credit card required."
        aside={
          <Link
            href="/explore"
            className="rounded-sm text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Browse the full marketplace
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[14rem_minmax(0,1fr)]">
        {/* Category tree (desktop) */}
        <aside className="hidden lg:block">
          <nav aria-label="Free product categories" className="sticky top-24 space-y-1 text-sm">
            <h2 className="mb-3 text-sm font-medium text-foreground">Categories</h2>
            <ul className="space-y-0.5">
              <li>
                <Link
                  href={hrefWith({ category: undefined, subcategory: undefined })}
                  aria-current={!currentCategory ? "page" : undefined}
                  className={treeLinkClass(!currentCategory)}
                >
                  All categories
                </Link>
              </li>
              {categoriesList.map((cat) => {
                const isCatActive = currentCategory === cat.slug;
                const catSubs = isCatActive ? activeSubs : [];
                return (
                  <li key={cat.id}>
                    <Link
                      href={hrefWith({ category: cat.slug, subcategory: undefined })}
                      aria-current={isCatActive && !currentSubcategory ? "page" : undefined}
                      className={treeLinkClass(isCatActive && !currentSubcategory)}
                    >
                      {cat.name}
                    </Link>
                    {catSubs.length > 0 && (
                      <ul className="ml-3 mt-0.5 space-y-0.5 border-l border-border pl-2">
                        {catSubs.map((sub) => {
                          const isSubActive = currentSubcategory === sub.slug;
                          return (
                            <li key={sub.id}>
                              <Link
                                href={hrefWith({ category: cat.slug, subcategory: sub.slug })}
                                aria-current={isSubActive ? "page" : undefined}
                                className={treeLinkClass(isSubActive)}
                              >
                                {sub.name}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        <div className="min-w-0">
          {/* Category chips (mobile / tablet) */}
          <div className="mb-6 space-y-3 lg:hidden">
            <ChipNav
              label="Free product categories"
              items={[
                { label: "All", href: hrefWith({ category: undefined, subcategory: undefined }), active: !currentCategory },
                ...categoriesList.map((cat) => ({
                  label: cat.name,
                  href: hrefWith({ category: cat.slug, subcategory: undefined }),
                  active: currentCategory === cat.slug,
                })),
              ]}
            />
            {activeSubs.length > 0 && (
              <ChipNav
                label="Subcategories"
                size="sm"
                items={activeSubs.map((sub) => ({
                  label: sub.name,
                  href: hrefWith({ subcategory: sub.slug }),
                  active: currentSubcategory === sub.slug,
                }))}
              />
            )}
          </div>

          <CatalogToolbar
            action="/free"
            hidden={{ category: state.category, subcategory: state.subcategory }}
            search={currentSearch}
            searchPlaceholder="Search free scripts or stack"
            sort={{
              current: currentSort,
              options: FREE_SORTS,
              hrefFor: (s: SortKey) => hrefWith({ sort: s === "newest" ? undefined : s }),
            }}
          />

          <ActiveFilters filters={filters} clearHref="/free" />

          {featuredProducts.length > 0 && (
            <section aria-labelledby="free-featured" className="mt-8">
              <h2 id="free-featured" className="mb-5 text-xl font-medium tracking-[-0.01em] text-foreground">
                Featured free drops
              </h2>
              <ProductGrid products={featuredProducts} categoryNames={names} className="xl:grid-cols-3" />
            </section>
          )}

          <section aria-labelledby="free-results" className="mt-10">
            <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="free-results" className="text-xl font-medium tracking-[-0.01em] text-foreground">
                {currentSearch || currentCategory ? "Results" : "Free releases"}
              </h2>
              <ResultCount total={total} page={currentPage} limit={PAGE_SIZE} />
            </div>

            {productsList.length === 0 ? (
              <CatalogEmpty
                title="No free products found"
                body="Try clearing filters or adjusting your search."
                action={{ href: "/free", label: "Clear filters" }}
              />
            ) : gridProducts.length > 0 ? (
              <ProductGrid products={gridProducts} categoryNames={names} className="xl:grid-cols-3" />
            ) : null}

            <CatalogPagination totalPages={totalPages} currentPage={currentPage} />
          </section>
        </div>
      </div>

      {/* FAQs */}
      <section aria-labelledby="free-faq" className="mt-20 border-t border-border pt-12">
        <h2 id="free-faq" className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Frequently asked questions
        </h2>
        <dl className="mt-6 grid grid-cols-1 gap-x-12 gap-y-8 md:grid-cols-2">
          <div className="max-w-[60ch] space-y-2">
            <dt className="text-base font-medium text-foreground">Are these free scripts safe to run?</dt>
            <dd className="text-sm leading-relaxed text-muted-foreground">
              Absolutely. All free scripts are audited and sourced directly from open-source repositories. You can review the full code upon downloading.
            </dd>
          </div>
          <div className="max-w-[60ch] space-y-2">
            <dt className="text-base font-medium text-foreground">How do I deploy these boilerplates?</dt>
            <dd className="text-sm leading-relaxed text-muted-foreground">
              Each download package includes the original developer readme file outlining step-by-step setup, dependency installation instructions, and deployment triggers.
            </dd>
          </div>
        </dl>
      </section>
    </CatalogShell>
  );
}

function treeLinkClass(active: boolean) {
  return cn(
    "block rounded-lg px-2.5 py-1.5 transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring",
    active ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
  );
}
