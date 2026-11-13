export const dynamic = "force-dynamic";

import { Metadata } from "next";
import { requireAdminPage } from "@/app/admin/_components/require-admin";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { categories, subcategories } from "@/db/schema";
import AdminCategoriesClient from "@/components/AdminCategoriesClient";
import { AdminPageHeader } from "@/app/admin/_components/admin-ui";

export const metadata: Metadata = {
  title: "Admin Categories Manager | ScriptlyStore",
  description: "Create, edit, and delete product categories and subcategories for the marketplace.",
};

export default async function AdminCategoriesPage() {
  await requireAdminPage();
  const [allCategories, allSubcategories] = await Promise.all([
    db
      .select({ id: categories.id, name: categories.name, slug: categories.slug })
      .from(categories)
      .orderBy(asc(categories.name)),
    db
      .select({
        id: subcategories.id,
        name: subcategories.name,
        slug: subcategories.slug,
        categoryId: subcategories.categoryId,
      })
      .from(subcategories)
      .orderBy(asc(subcategories.name)),
  ]);

  const byCategory = new Map<string, typeof allSubcategories>();
  for (const sub of allSubcategories) {
    const list = byCategory.get(sub.categoryId);
    if (list) list.push(sub);
    else byCategory.set(sub.categoryId, [sub]);
  }

  const initialCategories = allCategories.map((cat) => ({
    ...cat,
    subcategories: byCategory.get(cat.id) ?? [],
  }));

  return (
    <div className="space-y-6" id="admin-categories-root">
      <AdminPageHeader title="Categories" description="Create and manage catalog categories and their subcategories." />
      <AdminCategoriesClient initialCategories={initialCategories} />
    </div>
  );
}
