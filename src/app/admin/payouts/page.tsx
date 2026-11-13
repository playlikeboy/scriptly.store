export const dynamic = "force-dynamic";

import { Metadata } from "next";
import { requireAdminPage } from "@/app/admin/_components/require-admin";
import { and, desc, eq, ilike, isNotNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { orders, payouts, products, users } from "@/db/schema";
import PayoutsClient from "@/app/admin/payouts/PayoutsClient";
import AdminQueryBar from "@/app/admin/_components/AdminQueryBar";
import { AdminFigures, AdminPageHeader, parsePage } from "@/app/admin/_components/admin-ui";
import { formatMoney } from "@/lib/price-utils";

export const metadata: Metadata = {
  title: "Payouts",
};

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
    lpage?: string;
    lsearch?: string;
  }>;
}

const CREATORS_PER_PAGE = 10;
const LEDGER_PER_PAGE = 8;

export default async function AdminPayoutsPage({ searchParams }: PageProps) {
  await requireAdminPage();
  const resolved = await searchParams;
  const creatorPage = parsePage(resolved.page);
  const ledgerPage = parsePage(resolved.lpage);
  const creatorSearch = resolved.search?.trim() || "";
  const creatorStatus = resolved.status || "all";
  const ledgerSearch = resolved.lsearch?.trim() || "";

  // Aggregates computed in SQL (all amounts are integer paise).
  const productAgg = db
    .select({
      creatorId: products.creatorId,
      productsCount: sql<number>`count(*)`.as("products_count"),
    })
    .from(products)
    .where(isNotNull(products.creatorId))
    .groupBy(products.creatorId)
    .as("pa");

  const salesAgg = db
    .select({
      creatorId: products.creatorId,
      gross: sql<number>`sum(${orders.amount})`.as("gross"),
    })
    .from(orders)
    .innerJoin(products, eq(orders.productId, products.id))
    .where(and(eq(orders.status, "completed"), isNotNull(products.creatorId)))
    .groupBy(products.creatorId)
    .as("sa");

  const paidAgg = db
    .select({
      userId: payouts.userId,
      paid: sql<number>`sum(${payouts.amount})`.as("paid"),
    })
    .from(payouts)
    .groupBy(payouts.userId)
    .as("pd");

  const grossExpr = sql`coalesce(${salesAgg.gross}, 0)`;
  // Creator share is 95% of gross, rounded to the nearest paisa.
  const netExpr = sql`round(coalesce(${salesAgg.gross}, 0) * 0.95)`;
  const paidExpr = sql`coalesce(${paidAgg.paid}, 0)`;
  const unpaidExpr = sql`(${netExpr} - ${paidExpr})`;

  const isCreator = sql`(coalesce(${users.storeName}, '') <> '' or coalesce(${productAgg.productsCount}, 0) > 0)`;

  const creatorConditions: SQL[] = [isCreator];
  if (creatorSearch) {
    const term = `%${creatorSearch}%`;
    creatorConditions.push(or(ilike(users.email, term), ilike(users.name, term), ilike(users.storeName, term))!);
  }
  if (creatorStatus === "balance") creatorConditions.push(sql`${unpaidExpr} > 0`);
  else if (creatorStatus === "settled") creatorConditions.push(sql`${unpaidExpr} = 0`);

  const ledgerWhere = ledgerSearch
    ? or(
        ilike(users.email, `%${ledgerSearch}%`),
        ilike(users.storeName, `%${ledgerSearch}%`),
        ilike(payouts.payoutMethod, `%${ledgerSearch}%`)
      )
    : undefined;

  const creatorBase = () =>
    db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        storeName: users.storeName,
        payoutMethod: users.payoutMethod,
        paypalEmail: users.paypalEmail,
        payoutDetails: users.payoutDetails,
        grossSales: sql<number>`${grossExpr}::bigint`,
        netEarning: sql<number>`${netExpr}::bigint`,
        totalPaid: sql<number>`${paidExpr}::bigint`,
        unpaidBalance: sql<number>`${unpaidExpr}::bigint`,
        productsCount: sql<number>`coalesce(${productAgg.productsCount}, 0)`,
      })
      .from(users)
      .leftJoin(productAgg, eq(productAgg.creatorId, users.id))
      .leftJoin(salesAgg, eq(salesAgg.creatorId, users.id))
      .leftJoin(paidAgg, eq(paidAgg.userId, users.id));

  const [creatorRows, creatorCount, totals, ledgerRows, ledgerCount] = await Promise.all([
    creatorBase()
      .where(and(...creatorConditions))
      .orderBy(desc(users.createdAt), desc(users.id))
      .limit(CREATORS_PER_PAGE)
      .offset((creatorPage - 1) * CREATORS_PER_PAGE),
    db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .leftJoin(productAgg, eq(productAgg.creatorId, users.id))
      .leftJoin(salesAgg, eq(salesAgg.creatorId, users.id))
      .leftJoin(paidAgg, eq(paidAgg.userId, users.id))
      .where(and(...creatorConditions)),
    db
      .select({
        gross: sql<number>`coalesce(sum(${grossExpr}), 0)::bigint`,
        net: sql<number>`coalesce(sum(${netExpr}), 0)::bigint`,
        paid: sql<number>`coalesce(sum(${paidExpr}), 0)::bigint`,
        unpaid: sql<number>`coalesce(sum(${unpaidExpr}), 0)::bigint`,
      })
      .from(users)
      .leftJoin(productAgg, eq(productAgg.creatorId, users.id))
      .leftJoin(salesAgg, eq(salesAgg.creatorId, users.id))
      .leftJoin(paidAgg, eq(paidAgg.userId, users.id))
      .where(isCreator),
    db
      .select({
        id: payouts.id,
        userId: payouts.userId,
        userEmail: users.email,
        userStoreName: users.storeName,
        amount: payouts.amount,
        payoutMethod: payouts.payoutMethod,
        paypalEmail: payouts.paypalEmail,
        payoutDetails: payouts.payoutDetails,
        createdAt: payouts.createdAt,
      })
      .from(payouts)
      .leftJoin(users, eq(payouts.userId, users.id))
      .where(ledgerWhere)
      .orderBy(desc(payouts.createdAt), desc(payouts.id))
      .limit(LEDGER_PER_PAGE)
      .offset((ledgerPage - 1) * LEDGER_PER_PAGE),
    db
      .select({ count: sql<number>`count(*)` })
      .from(payouts)
      .leftJoin(users, eq(payouts.userId, users.id))
      .where(ledgerWhere),
  ]);

  const creators = creatorRows.map((c) => ({
    ...c,
    grossSales: Number(c.grossSales),
    netEarning: Number(c.netEarning),
    totalPaid: Number(c.totalPaid),
    unpaidBalance: Number(c.unpaidBalance),
    productsCount: Number(c.productsCount),
  }));

  const payoutsHistory = ledgerRows.map((p) => ({
    ...p,
    userEmail: p.userEmail || "Deleted user",
    userStoreName: p.userStoreName || null,
    createdAt: p.createdAt.toISOString(),
  }));

  const totalGross = Number(totals[0]?.gross || 0);
  const totalNet = Number(totals[0]?.net || 0);
  const totalPaid = Number(totals[0]?.paid || 0);
  const totalUnpaid = Number(totals[0]?.unpaid || 0);
  const creatorTotal = Number(creatorCount[0]?.count || 0);
  const ledgerTotal = Number(ledgerCount[0]?.count || 0);

  const sharedParams = {
    search: creatorSearch || undefined,
    status: creatorStatus !== "all" ? creatorStatus : undefined,
    lsearch: ledgerSearch || undefined,
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Payouts"
        description="Creator revenue, unpaid balances and payout preferences. Log each settlement after you transfer the funds."
      />

      <AdminFigures
        items={[
          { label: "Gross sales", value: formatMoney(totalGross), hint: "Completed creator orders" },
          { label: "Platform fee (5%)", value: formatMoney(totalGross - totalNet) },
          { label: "Creator share (95%)", value: formatMoney(totalNet) },
          { label: "Paid out", value: formatMoney(totalPaid) },
          {
            label: "Unpaid balance",
            value: formatMoney(totalUnpaid),
            hint: "Remaining to distribute",
            tone: totalUnpaid > 0 ? "attention" : "default",
          },
        ]}
      />

      <PayoutsClient
        key={`${creatorSearch}|${creatorStatus}|${creatorPage}|${ledgerSearch}|${ledgerPage}`}
        creators={creators}
        payoutsHistory={payoutsHistory}
        creatorPager={{
          params: { ...sharedParams, lpage: ledgerPage > 1 ? String(ledgerPage) : undefined },
          currentPage: creatorPage,
          totalPages: Math.max(1, Math.ceil(creatorTotal / CREATORS_PER_PAGE)),
          totalCount: creatorTotal,
          pageSize: CREATORS_PER_PAGE,
        }}
        ledgerPager={{
          params: { ...sharedParams, page: creatorPage > 1 ? String(creatorPage) : undefined },
          currentPage: ledgerPage,
          totalPages: Math.max(1, Math.ceil(ledgerTotal / LEDGER_PER_PAGE)),
          totalCount: ledgerTotal,
          pageSize: LEDGER_PER_PAGE,
        }}
        creatorFilters={
          <AdminQueryBar
            searchLabel="Search creators"
            placeholder="Store, email or owner"
            selects={[
              {
                key: "status",
                label: "Filter by balance",
                defaultValue: "all",
                options: [
                  { value: "all", label: "All balances" },
                  { value: "balance", label: "Outstanding balance" },
                  { value: "settled", label: "Fully settled" },
                ],
              },
            ]}
          />
        }
        ledgerFilters={
          <AdminQueryBar
            searchKey="lsearch"
            searchLabel="Search payout ledger"
            placeholder="Store, email or method"
            resetPageKeys={["lpage"]}
          />
        }
      />
    </div>
  );
}
