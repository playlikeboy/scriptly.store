export const dynamic = "force-dynamic";

import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { and, count, desc, eq, ilike, isNull, or, type SQL } from "drizzle-orm";
import { Plus } from "lucide-react";
import { db } from "@/db";
import { products } from "@/db/schema";
import { getOrCreateDbUser } from "@/lib/auth-utils";
import { Button } from "@/components/ui/button";
import CreatorProductsTable from "@/components/CreatorProductsTable";
import CreatorProductsFilters from "@/components/creator/CreatorProductsFilters";
import { PageHeader } from "@/components/creator/console-ui";

export const metadata: Metadata = {
  title: "My Creations | Creator Console",
  description: "View and manage all listed developer scripts and templates.",
};

const PAGE_SIZE = 10;
const STATUSES = ["approved", "pending", "rejected"] as const;
type StatusFilter = (typeof STATUSES)[number] | "all";

export default async function CreatorProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const user = await getOrCreateDbUser();
  if (!user) {
    redirect("/handler/sign-in?redirectTo=/creator/products");
  }

  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 100);
  const status: StatusFilter = (STATUSES as readonly string[]).includes(params.status ?? "")
    ? (params.status as StatusFilter)
    : "all";
  const requested = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const conditions: SQL[] = [eq(products.creatorId, user.id)];
  if (q) {
    const term = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
    conditions.push(or(ilike(products.title, term), ilike(products.slug, term))!);
  }
  if (status === "pending") {
    conditions.push(or(eq(products.status, "pending"), isNull(products.status))!);
  } else if (status !== "all") {
    conditions.push(eq(products.status, status));
  }
  const where = and(...conditions);

  const [[{ total }], [{ all }]] = await Promise.all([
    db.select({ total: count() }).from(products).where(where),
    db.select({ all: count() }).from(products).where(eq(products.creatorId, user.id)),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requested, totalPages);

  const rows =
    total > 0
      ? await db
          .select({
            id: products.id,
            title: products.title,
            slug: products.slug,
            category: products.category,
            thumbnail: products.thumbnail,
            price: products.price,
            isFree: products.isFree,
            status: products.status,
            published: products.published,
            createdAt: products.createdAt,
          })
          .from(products)
          .where(where)
          .orderBy(desc(products.createdAt))
          .limit(PAGE_SIZE)
          .offset((page - 1) * PAGE_SIZE)
      : [];

  const buildHref = (nextPage: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (status !== "all") sp.set("status", status);
    if (nextPage > 1) sp.set("page", String(nextPage));
    const s = sp.toString();
    return s ? `/creator/products?${s}` : "/creator/products";
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Products"
        description="Your listed scripts, templates and kits. Edits go back to review before they update the live listing."
        actions={
          <Button asChild size="sm">
            <Link href="/creator/new">
              <Plus strokeWidth={1.75} /> New product
            </Link>
          </Button>
        }
      />

      <section aria-label="Your products" className="overflow-hidden rounded-2xl border border-border bg-card">
        <CreatorProductsFilters key={`${q}|${status}`} initialQuery={q} initialStatus={status} />
        <CreatorProductsTable
          products={rows}
          hasAnyProducts={all > 0}
          isFiltered={Boolean(q) || status !== "all"}
          pagination={{
            page,
            totalPages,
            total,
            pageSize: PAGE_SIZE,
            prevHref: page > 1 ? buildHref(page - 1) : null,
            nextHref: page < totalPages ? buildHref(page + 1) : null,
          }}
        />
      </section>
    </div>
  );
}
