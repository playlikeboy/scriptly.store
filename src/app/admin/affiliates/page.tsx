export const dynamic = "force-dynamic";

import { Metadata } from "next";
import { requireAdminPage } from "@/app/admin/_components/require-admin";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { affiliateCommissions, affiliateProfiles, products, users } from "@/db/schema";
import AffiliatesAdminClient from "./AffiliatesAdminClient";
import { AdminPageHeader } from "@/app/admin/_components/admin-ui";

export const metadata: Metadata = {
  title: "Admin Affiliate Console | ScriptlyStore",
  description: "Review pending applications and release manual payouts.",
};

export default async function AdminAffiliatesPage() {
  await requireAdminPage();
  const [pendingProfiles, pendingCommissions] = await Promise.all([
    db
      .select({
        id: affiliateProfiles.id,
        status: affiliateProfiles.status,
        channels: affiliateProfiles.channels,
        createdAt: affiliateProfiles.createdAt,
        userName: users.name,
        userEmail: users.email,
        affiliateSlug: users.affiliateSlug,
      })
      .from(affiliateProfiles)
      .innerJoin(users, eq(affiliateProfiles.id, users.id))
      .where(eq(affiliateProfiles.status, "pending"))
      .orderBy(desc(affiliateProfiles.createdAt)),
    db
      .select({
        id: affiliateCommissions.id,
        amount: affiliateCommissions.amount,
        percent: affiliateCommissions.percent,
        createdAt: affiliateCommissions.createdAt,
        affiliateName: users.name,
        affiliateEmail: users.email,
        orderId: affiliateCommissions.orderId,
        productTitle: products.title,
      })
      .from(affiliateCommissions)
      .innerJoin(users, eq(affiliateCommissions.affiliateId, users.id))
      .innerJoin(products, eq(affiliateCommissions.productId, products.id))
      .where(eq(affiliateCommissions.status, "pending"))
      .orderBy(desc(affiliateCommissions.createdAt)),
  ]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Affiliates"
        description="Review partner applications and release pending commission payouts."
      />
      <AffiliatesAdminClient
        pendingProfiles={pendingProfiles.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() }))}
        pendingCommissions={pendingCommissions.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() }))}
      />
    </div>
  );
}
