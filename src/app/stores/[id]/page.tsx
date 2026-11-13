import { cache } from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { users, products, coupons, categories } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { formatMoney } from "@/lib/price-utils";
import {
  CatalogEmpty,
  CatalogHeader,
  CatalogPagination,
  CatalogShell,
  ProductGrid,
  ResultCount,
  categoryNameMap,
  parsePage,
} from "@/app/explore/_components/catalog";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

interface StorePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}

// One creator lookup per request, shared by generateMetadata and the page.
const getCreator = cache(async (id: string) =>
  db.query.users.findFirst({
    where: eq(users.id, id),
    columns: { id: true, name: true, storeName: true, razorpayAccountId: true },
  })
);

export async function generateMetadata({ params }: StorePageProps): Promise<Metadata> {
  const { id } = await params;
  const creator = await getCreator(id);

  if (!creator) {
    return {
      title: "Store Not Found | ScriptlyStore",
    };
  }

  const displayName = creator.storeName || creator.name || "Creator's Store";

  return {
    title: `${displayName} Storefront | ScriptlyStore`,
    description: `Explore SaaS templates, extensions, prompts, and developer scripts listed by ${displayName} on ScriptlyStore.`,
  };
}

export default async function CreatorStorefrontPage({ params, searchParams }: StorePageProps) {
  const { id } = await params;
  const { page } = await searchParams;
  const currentPage = parsePage(page);

  const creator = await getCreator(id);

  // notFound only if the user doesn't exist at all
  if (!creator) {
    notFound();
  }

  const displayName = creator.storeName || creator.name || "Creator's Store";
  const storeWhere = and(
    eq(products.creatorId, id),
    eq(products.status, "approved"),
    eq(products.published, true)
  );

  // Paginated listing + count + coupons + category names, all in parallel and pushed down to SQL.
  const [storeProducts, countRows, activeCoupons, categoryRows] = await Promise.all([
    db
      .select()
      .from(products)
      .where(storeWhere)
      .orderBy(desc(products.createdAt))
      .limit(PAGE_SIZE)
      .offset((currentPage - 1) * PAGE_SIZE),
    db.select({ count: sql<number>`count(*)` }).from(products).where(storeWhere),
    db
      .select({
        id: coupons.id,
        code: coupons.code,
        discountType: coupons.discountType,
        discountValue: coupons.discountValue,
        minPurchaseAmount: coupons.minPurchaseAmount,
      })
      .from(coupons)
      .where(and(eq(coupons.creatorId, id), eq(coupons.active, true)))
      .orderBy(desc(coupons.createdAt)),
    db.select({ slug: categories.slug, name: categories.name }).from(categories),
  ]);

  const total = Number(countRows[0]?.count ?? 0);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <CatalogShell>
      <CatalogHeader
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Explore", href: "/explore" }, { label: displayName }]}
        title={displayName}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="tabular-nums">
              {total.toLocaleString("en-IN")} {total === 1 ? "listing" : "listings"}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Creator ID <span className="font-mono text-[13px]">{creator.id.slice(0, 8)}</span>
            </span>
            {creator.razorpayAccountId && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-success">Automated split routing active</span>
              </>
            )}
          </span>
        }
      />

      {activeCoupons.length > 0 && (
        <section aria-labelledby="store-promos" className="mb-10">
          <h2 id="store-promos" className="mb-4 text-xl font-medium tracking-[-0.01em]">
            Store promos
          </h2>
          <ul className="divide-y divide-border border-y border-border">
            {activeCoupons.map((coupon) => (
              <li key={coupon.id} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3">
                <span className="flex items-baseline gap-3">
                  <span className="rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[13px] text-foreground">
                    {coupon.code}
                  </span>
                  <span className="text-sm font-medium tabular-nums">
                    {coupon.discountType === "percentage"
                      ? `${coupon.discountValue}% off`
                      : `${formatMoney(coupon.discountValue)} off`}
                  </span>
                </span>
                <span className="text-sm tabular-nums text-muted-foreground">
                  Applies to all items in this store
                  {coupon.minPurchaseAmount > 0 && ` · min. purchase ${formatMoney(coupon.minPurchaseAmount)}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="store-catalog">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2 border-t border-border pt-6">
          <h2 id="store-catalog" className="text-xl font-medium tracking-[-0.01em]">
            Catalog
          </h2>
          <ResultCount total={total} page={currentPage} limit={PAGE_SIZE} />
        </div>

        {storeProducts.length === 0 ? (
          <CatalogEmpty
            title={total === 0 ? "No items published yet" : "This page is empty"}
            body={
              total === 0
                ? "This creator has not published anything on their storefront yet."
                : "There are fewer listings than this page number."
            }
            action={total === 0 ? { href: "/explore", label: "Explore the marketplace" } : { href: `/stores/${id}`, label: "Back to first page" }}
          />
        ) : (
          <>
            <ProductGrid products={storeProducts} categoryNames={categoryNameMap(categoryRows)} />
            <CatalogPagination totalPages={totalPages} currentPage={currentPage} />
          </>
        )}
      </section>
    </CatalogShell>
  );
}
