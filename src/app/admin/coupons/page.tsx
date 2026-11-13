export const dynamic = "force-dynamic";

import { Metadata } from "next";
import { requireAdminPage } from "@/app/admin/_components/require-admin";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { coupons } from "@/db/schema";
import AdminCouponsClient from "@/components/AdminCouponsClient";
import { AdminPageHeader } from "@/app/admin/_components/admin-ui";

export const metadata: Metadata = {
  title: "Admin Coupons Manager | ScriptlyStore",
  description: "Create, edit, toggle, and delete coupon codes for the marketplace.",
};

export default async function AdminCouponsPage() {
  await requireAdminPage();
  const initialCoupons = await db
    .select({
      id: coupons.id,
      code: coupons.code,
      discountType: coupons.discountType,
      discountValue: coupons.discountValue,
      minPurchaseAmount: coupons.minPurchaseAmount,
      active: coupons.active,
      createdAt: coupons.createdAt,
    })
    .from(coupons)
    .orderBy(desc(coupons.createdAt));

  return (
    <div className="space-y-6" id="admin-coupons-root">
      <AdminPageHeader title="Coupons" description="Create and manage promo codes and customer discounts." />
      <AdminCouponsClient
        initialCoupons={initialCoupons.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() }))}
      />
    </div>
  );
}
