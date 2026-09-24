export const dynamic = "force-dynamic";

import { Metadata } from "next";
import Link from "next/link";
import { db } from "@/db";
import { products } from "@/db/schema";
import { and, asc, desc, eq, ilike, sql } from "drizzle-orm";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import AdminSearchSort from "@/app/admin/products/AdminSearchSort";
import AdminProductsTable from "@/app/admin/products/AdminProductsTable";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    sort?: string;
    status?: string;
  }>;
}

export default async function AdminProductsPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const currentPage = Math.max(1, parseInt(resolvedParams.page || "1", 10) || 1);
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

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Catalog
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage visibility, featured placement, and product content from one place.
          </p>
        </div>

        <Button asChild className="rounded-xl sm:shrink-0">
          <Link href="/admin/products/new">
            <Plus className="mr-2 h-4 w-4" />
            New product
          </Link>
        </Button>
      </header>

      <AdminSearchSort />

      <AdminProductsTable
        products={productsList}
        totalCount={totalCount}
        allCount={allCount}
        publishedCount={publishedCount}
        draftCount={draftCount}
        featuredCount={featuredCount}
        notFeaturedCount={notFeaturedCount}
        currentPage={currentPage}
        totalPages={totalPages}
        limit={limit}
        currentStatus={currentStatus}
        currentSearch={currentSearch}
      />
    </div>
  );
}
