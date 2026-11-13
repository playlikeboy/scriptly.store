export const dynamic = "force-dynamic";

import { Metadata } from "next";
import { requireAdminPage } from "@/app/admin/_components/require-admin";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { db } from "@/db";
import { products } from "@/db/schema";
import { getCategoriesAction, getSubcategoriesAction } from "@/lib/actions/products";
import ProductForm from "@/components/ProductForm";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/app/admin/_components/admin-ui";

export const metadata: Metadata = {
  title: "Edit Product",
};

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditProductPage({ params }: PageProps) {
  await requireAdminPage();
  const { id } = await params;

  const [product, categoriesList, subcategoriesList] = await Promise.all([
    db.query.products.findFirst({ where: eq(products.id, id) }),
    getCategoriesAction(),
    getSubcategoriesAction(),
  ]);

  if (!product) {
    notFound();
  }

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
        title="Edit product"
        description={
          <>
            Update the listing, pricing or uploaded files for{" "}
            <span className="text-foreground">{product.title}</span>.
          </>
        }
        actions={
          <Button asChild variant="outline">
            <Link href={`/products/${product.slug}`} target="_blank" rel="noopener noreferrer">
              View live page
              <ExternalLink aria-hidden="true" />
            </Link>
          </Button>
        }
      />
      <ProductForm categories={categoriesList} subcategories={subcategoriesList} initialData={product} />
    </div>
  );
}
