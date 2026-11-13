export const dynamic = "force-dynamic";

import { Metadata } from "next";
import { requireAdminPage } from "@/app/admin/_components/require-admin";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { products, users } from "@/db/schema";
import AdminApprovalsList from "@/components/AdminApprovalsList";
import { AdminPageHeader } from "@/app/admin/_components/admin-ui";

export const metadata: Metadata = {
  title: "Approvals",
};

export default async function AdminApprovalsPage() {
  await requireAdminPage();
  const pendingProducts = await db
    .select({
      id: products.id,
      title: products.title,
      slug: products.slug,
      price: products.price,
      category: products.category,
      thumbnail: products.thumbnail,
      fileUrl: products.fileUrl,
      createdAt: products.createdAt,
      creator: {
        name: users.name,
        email: users.email,
      },
    })
    .from(products)
    .leftJoin(users, eq(products.creatorId, users.id))
    .where(eq(products.status, "pending"))
    .orderBy(asc(products.createdAt));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Product submissions"
        description="Review, download and approve products submitted by creators before they are listed on the store."
      />
      <AdminApprovalsList pendingItems={pendingProducts} />
    </div>
  );
}
