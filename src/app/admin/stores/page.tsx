export const dynamic = "force-dynamic";

import { Metadata } from "next";
import { requireAdminPage } from "@/app/admin/_components/require-admin";
import { and, desc, eq, ilike, isNotNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { products, users } from "@/db/schema";
import StoresClient from "@/app/admin/stores/StoresClient";
import AdminQueryBar from "@/app/admin/_components/AdminQueryBar";
import { AdminFigures, AdminPageHeader, parsePage } from "@/app/admin/_components/admin-ui";

export const metadata: Metadata = {
  title: "Stores & Creators",
};

interface PageProps {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}

const PAGE_SIZE = 10;

export default async function AdminStoresPage({ searchParams }: PageProps) {
  await requireAdminPage();
  const resolved = await searchParams;
  const currentPage = parsePage(resolved.page);
  const currentSearch = resolved.search?.trim() || "";
  const currentStatus = resolved.status || "all";

  // Per-creator product aggregates, computed in SQL.
  const productAgg = db
    .select({
      creatorId: products.creatorId,
      approved: sql<number>`count(*) filter (where ${products.status} = 'approved')`.as("approved_count"),
      pending: sql<number>`count(*) filter (where ${products.status} = 'pending')`.as("pending_count"),
      rejected: sql<number>`count(*) filter (where ${products.status} = 'rejected')`.as("rejected_count"),
      titles: sql<string>`string_agg(${products.title}, ', ' order by ${products.createdAt} desc)`.as("titles"),
    })
    .from(products)
    .where(isNotNull(products.creatorId))
    .groupBy(products.creatorId)
    .as("pa");

  const hasStore = sql`coalesce(${users.storeName}, '') <> ''`;
  const hasBank = sql`coalesce(${users.bankAccountNumber}, '') <> '' and coalesce(${users.bankIfsc}, '') <> ''`;
  const routeConnected = sql`${users.razorpayAccountId} like 'acc\\_%'`;

  // A creator is anyone with a store name or at least one approved/pending/rejected listing.
  const isCreator = sql`(${hasStore} or coalesce(${productAgg.approved}, 0) + coalesce(${productAgg.pending}, 0) + coalesce(${productAgg.rejected}, 0) > 0)`;

  const conditions: SQL[] = [isCreator];
  if (currentSearch) {
    const term = `%${currentSearch}%`;
    conditions.push(or(ilike(users.email, term), ilike(users.name, term), ilike(users.storeName, term))!);
  }
  if (currentStatus === "route_connected") conditions.push(routeConnected);
  else if (currentStatus === "route_pending") conditions.push(sql`not coalesce(${routeConnected}, false) and ${hasBank}`);
  else if (currentStatus === "bank_missing") conditions.push(sql`not (${hasBank})`);
  const where = and(...conditions);

  const [rows, countResult, statsResult, productStats] = await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        storeName: users.storeName,
        role: users.role,
        razorpayAccountId: users.razorpayAccountId,
        bankName: users.bankName,
        bankAccountName: users.bankAccountName,
        bankAccountNumber: users.bankAccountNumber,
        bankIfsc: users.bankIfsc,
        approvedCount: sql<number>`coalesce(${productAgg.approved}, 0)`,
        pendingCount: sql<number>`coalesce(${productAgg.pending}, 0)`,
        rejectedCount: sql<number>`coalesce(${productAgg.rejected}, 0)`,
        productsList: sql<string>`coalesce(${productAgg.titles}, '')`,
        createdAt: users.createdAt,
      })
      .from(users)
      .leftJoin(productAgg, eq(productAgg.creatorId, users.id))
      .where(where)
      .orderBy(desc(users.createdAt), desc(users.id))
      .limit(PAGE_SIZE)
      .offset((currentPage - 1) * PAGE_SIZE),
    db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .leftJoin(productAgg, eq(productAgg.creatorId, users.id))
      .where(where),
    db
      .select({
        stores: sql<number>`count(*) filter (where ${hasStore})`,
        linked: sql<number>`count(*) filter (where coalesce(${users.razorpayAccountId}, '') <> '')`,
      })
      .from(users)
      .leftJoin(productAgg, eq(productAgg.creatorId, users.id))
      .where(isCreator),
    db
      .select({
        listings: sql<number>`count(*)`,
        pending: sql<number>`count(*) filter (where ${products.status} = 'pending')`,
      })
      .from(products)
      .where(isNotNull(products.creatorId)),
  ]);

  const totalCount = Number(countResult[0]?.count || 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const pendingListings = Number(productStats[0]?.pending || 0);

  const creators = rows.map((row) => ({
    ...row,
    approvedCount: Number(row.approvedCount),
    pendingCount: Number(row.pendingCount),
    rejectedCount: Number(row.rejectedCount),
    createdAt: row.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Creators"
        description="Review creator storefronts, bank details and Razorpay Route accounts for split payments."
      />

      <AdminFigures
        items={[
          { label: "Creator stores", value: Number(statsResult[0]?.stores || 0).toLocaleString("en-IN") },
          { label: "Linked Route accounts", value: Number(statsResult[0]?.linked || 0).toLocaleString("en-IN") },
          { label: "Creator listings", value: Number(productStats[0]?.listings || 0).toLocaleString("en-IN") },
          {
            label: "Pending approvals",
            value: pendingListings.toLocaleString("en-IN"),
            tone: pendingListings > 0 ? "attention" : "default",
          },
        ]}
      />

      <AdminQueryBar
        searchLabel="Search creators"
        placeholder="Store, email or owner"
        selects={[
          {
            key: "status",
            label: "Filter by onboarding status",
            defaultValue: "all",
            options: [
              { value: "all", label: "All statuses" },
              { value: "route_connected", label: "Route connected" },
              { value: "route_pending", label: "Bank added, Route pending" },
              { value: "bank_missing", label: "Bank details missing" },
            ],
          },
        ]}
      />

      <StoresClient
        key={`${currentSearch}|${currentStatus}|${currentPage}`}
        initialCreators={creators}
        currentSearch={currentSearch}
        pager={{
          params: {
            search: currentSearch || undefined,
            status: currentStatus !== "all" ? currentStatus : undefined,
          },
          currentPage,
          totalPages,
          totalCount,
          pageSize: PAGE_SIZE,
        }}
      />
    </div>
  );
}
