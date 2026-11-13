export const dynamic = "force-dynamic";

import { Metadata } from "next";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { coupons } from "@/db/schema";
import { getOrCreateDbUser } from "@/lib/auth-utils";
import CreatorCouponsManager from "@/components/CreatorCouponsManager";
import { PageHeader } from "@/components/creator/console-ui";

export const metadata: Metadata = {
  title: "Store Coupons | Creator Console",
  description: "Create and manage custom promotional coupon codes.",
};

export default async function CreatorCouponsPage() {
  const user = await getOrCreateDbUser();
  if (!user) {
    redirect("/handler/sign-in?redirectTo=/creator/coupons");
  }

  const storeCoupons = await db
    .select({
      id: coupons.id,
      code: coupons.code,
      discountType: coupons.discountType,
      discountValue: coupons.discountValue,
      minPurchaseAmount: coupons.minPurchaseAmount,
      active: coupons.active,
    })
    .from(coupons)
    .where(eq(coupons.creatorId, user.id))
    .orderBy(desc(coupons.createdAt))
    .limit(200);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Coupons"
        description="Discount codes that apply to every product in your store."
      />
      <CreatorCouponsManager initialCoupons={storeCoupons} />
    </div>
  );
}
