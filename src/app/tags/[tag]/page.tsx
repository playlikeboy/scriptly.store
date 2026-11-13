import { Metadata } from "next";
import { getProductsAction, getCategoriesAction } from "@/lib/actions/products";
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

interface PageProps {
  params: Promise<{
    tag: string;
  }>;
  searchParams: Promise<{
    page?: string;
  }>;
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tag } = await params;
  const decodedTag = safeDecode(tag);
  return {
    title: "Tagged as #" + decodedTag + " | ScriptlyStore",
    description: "Browse premium digital assets tagged with " + decodedTag + " on ScriptlyStore.",
  };
}

export default async function TagPage({ params, searchParams }: PageProps) {
  const { tag } = await params;
  const resolvedSearchParams = await searchParams;
  const decodedTag = safeDecode(tag);
  const currentPage = parsePage(resolvedSearchParams.page);

  const [categoriesList, { products: productsList, totalPages, total }] = await Promise.all([
    getCategoriesAction(),
    getProductsAction({
      tag: decodedTag,
      page: currentPage,
      limit: PAGE_SIZE,
    }),
  ]);

  return (
    <CatalogShell>
      <CatalogHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Explore", href: "/explore" },
          { label: `#${decodedTag}` },
        ]}
        title={<>Tagged #{decodedTag}</>}
        description={`Browsing ${total.toLocaleString("en-IN")} ${total === 1 ? "asset" : "assets"} with this tag.`}
      />

      <div className="mb-6 border-t border-border pt-6">
        <ResultCount total={total} page={currentPage} limit={PAGE_SIZE} />
      </div>

      {productsList.length === 0 ? (
        <CatalogEmpty
          title={`No assets tagged #${decodedTag}`}
          body="Tags are added by creators. Try searching for the term instead."
          action={{ href: `/search?search=${encodeURIComponent(decodedTag)}`, label: `Search “${decodedTag}”` }}
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
