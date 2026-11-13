export const dynamic = "force-dynamic";

import { Metadata } from "next";
import { requireAdminPage } from "@/app/admin/_components/require-admin";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCategoriesAction, getSubcategoriesAction } from "@/lib/actions/products";
import ProductForm from "@/components/ProductForm";
import { AdminPageHeader } from "@/app/admin/_components/admin-ui";

export const metadata: Metadata = {
  title: "New Product",
};

export default async function NewProductPage() {
  await requireAdminPage();
  const [categoriesList, subcategoriesList] = await Promise.all([
    getCategoriesAction(),
    getSubcategoriesAction(),
  ]);

  return (
    <div className="space-y-6">
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:underline"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Products
      </Link>
      <AdminPageHeader
        title="Create product"
        description="Upload and configure a new digital product listing for the marketplace."
      />
      <ProductForm categories={categoriesList} subcategories={subcategoriesList} />
    </div>
  );
}
