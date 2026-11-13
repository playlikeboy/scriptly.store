export const dynamic = "force-dynamic";

import { Metadata } from "next";
import { requireAdminPage } from "@/app/admin/_components/require-admin";
import Link from "next/link";
import { db } from "@/db";
import { products } from "@/db/schema";
import { and, asc, desc, eq, ilike, sql } from "drizzle-orm";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import AdminProductsTable from "@/app/admin/products/AdminProductsTable";
import AdminQueryBar from "@/app/admin/_components/AdminQueryBar";
import { AdminFilterTabs, AdminPageHeader, buildHref, parsePage } from "@/app/admin/_components/admin-ui";

export const metadata: Metadata = {
  title: "Products Inventory | Admin Console",
  description: "Manage product inventory, pricing, approvals, and status.",
};

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    sort?: string;
    status?: string;
  }>;
}

export default async function AdminProductsPage({ searchParams }: PageProps) {
  await requireAdminPage();
  const resolvedParams = await searchParams;
  const currentPage = parsePage(resolvedParams.page);
  const currentSearch = resolvedParams.search?.trim() || "";
  const currentSort = resolvedParams.sort || "newest";
  const currentStatus = resolvedParams.status || "all";
  const limit = 50;
  const offset = (currentPage - 1) * limit;

  const conditions = [];
  if (currentSearch) {
    conditions.push(ilike(products.title, `%${currentSearch}%`));
  }

  if (currentStatus === "published") {
    conditions.push(eq(products.published, true));
  } else if (currentStatus === "draft") {
    conditions.push(eq(products.published, false));
  } else if (currentStatus === "featured") {
    conditions.push(eq(products.featured, true));
  } else if (currentStatus === "unfeatured") {
    conditions.push(eq(products.featured, false));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  let orderBy = desc(products.createdAt);
  switch (currentSort) {
    case "oldest":
      orderBy = asc(products.createdAt);
      break;
    case "price_asc":
      orderBy = asc(products.price);
      break;
    case "price_desc":
      orderBy = desc(products.price);
      break;
    case "title_asc":
      orderBy = asc(products.title);
      break;
    case "title_desc":
      orderBy = desc(products.title);
      break;
    case "featured_first":
      orderBy = desc(products.featured);
      break;
  }

  const [countsResult, filteredCountResult, productsList] = await Promise.all([
    db
      .select({
        all: sql<number>`count(*)`,
        published: sql<number>`count(*) filter (where ${products.published} = true)`,
        draft: sql<number>`count(*) filter (where ${products.published} = false)`,
        featured: sql<number>`count(*) filter (where ${products.featured} = true)`,
        notFeatured: sql<number>`count(*) filter (where ${products.featured} = false)`,
      })
      .from(products),
    db.select({ count: sql<number>`count(*)` }).from(products).where(whereClause),
    db
      .select({
        id: products.id,
        title: products.title,
        slug: products.slug,
        category: products.category,
        price: products.price,
        published: products.published,
        featured: products.featured,
        version: products.version,
        thumbnail: products.thumbnail,
        createdAt: products.createdAt,
      })
      .from(products)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset),
  ]);

  const counts = countsResult[0];
  const allCount = Number(counts?.all || 0);
  const publishedCount = Number(counts?.published || 0);
  const draftCount = Number(counts?.draft || 0);
  const featuredCount = Number(counts?.featured || 0);
  const notFeaturedCount = Number(counts?.notFeatured || 0);
  const totalCount = Number(filteredCountResult[0]?.count || 0);
  const totalPages = Math.ceil(totalCount / limit);

  const baseParams = {
    search: currentSearch || undefined,
    sort: currentSort !== "newest" ? currentSort : undefined,
  };
  const statusTabs = [
    { value: "all", label: "All", count: allCount },
    { value: "published", label: "Published", count: publishedCount },
    { value: "draft", label: "Drafts", count: draftCount },
    { value: "featured", label: "Featured", count: featuredCount },
    { value: "unfeatured", label: "Not featured", count: notFeaturedCount },
  ].map((tab) => ({
    label: tab.label,
    count: tab.count,
    active: currentStatus === tab.value,
    href: buildHref("/admin/products", baseParams, { status: tab.value === "all" ? undefined : tab.value }),
  }));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Products"
        description="Manage visibility, featured placement and listing content from one place."
        actions={
          <Button asChild>
            <Link href="/admin/products/new">
              <Plus aria-hidden="true" />
              New product
            </Link>
          </Button>
        }
      />

      <div className="space-y-3">
        <AdminQueryBar
          searchLabel="Search products"
          placeholder="Search by title"
          selects={[
            {
              key: "sort",
              label: "Sort products",
              defaultValue: "newest",
              options: [
                { value: "newest", label: "Newest first" },
                { value: "oldest", label: "Oldest first" },
                { value: "price_asc", label: "Price: low to high" },
                { value: "price_desc", label: "Price: high to low" },
                { value: "featured_first", label: "Featured first" },
                { value: "title_asc", label: "Title: A–Z" },
                { value: "title_desc", label: "Title: Z–A" },
              ],
            },
          ]}
        />
        <AdminFilterTabs label="Filter by status" tabs={statusTabs} />
      </div>

      <AdminProductsTable
        key={`${currentStatus}|${currentSearch}|${currentSort}|${currentPage}`}
        products={productsList}
        totalCount={totalCount}
        currentPage={currentPage}
        totalPages={totalPages}
        limit={limit}
        currentSearch={currentSearch}
        pagerParams={{ ...baseParams, status: currentStatus !== "all" ? currentStatus : undefined }}
      />
    </div>
  );
}
