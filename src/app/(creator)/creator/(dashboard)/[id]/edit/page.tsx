export const dynamic = "force-dynamic";

import { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { db } from "@/db";
import { products } from "@/db/schema";
import { getCategoriesAction, getSubcategoriesAction } from "@/lib/actions/products";
import { getOrCreateDbUser } from "@/lib/auth-utils";
import ProductForm from "@/components/ProductForm";
import { PageHeader, StatusPill } from "@/components/creator/console-ui";

export const metadata: Metadata = {
  title: "Edit Script | Creator Console",
  description: "Modify details, adjust price, or replace script file assets.",
};

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CreatorEditScriptPage({ params }: PageProps) {
  const user = await getOrCreateDbUser();
  if (!user) {
    redirect("/handler/sign-in?redirectTo=/creator/products");
  }

  const { id } = await params;

  // Ownership guard is part of the query: other creators' products 404.
  const [product, categoriesList, subcategoriesList] = await Promise.all([
    db.query.products.findFirst({
      where: and(eq(products.id, id), eq(products.creatorId, user.id)),
    }),
    getCategoriesAction(),
    getSubcategoriesAction(),
  ]);

  if (!product) {
    notFound();
  }

  const status =
    product.status === "approved" ? (
      <StatusPill tone="success">Live</StatusPill>
    ) : product.status === "rejected" ? (
      <StatusPill tone="destructive">Rejected</StatusPill>
    ) : (
      <StatusPill>In review</StatusPill>
    );

  return (
    <div className="space-y-6">
      <Link
        href="/creator/products"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:underline focus-visible:outline-none"
      >
        <ArrowLeft className="size-4" strokeWidth={1.75} />
        Products
      </Link>
      <PageHeader
        title="Edit product"
        description={product.title}
        actions={status}
      />
      <ProductForm
        categories={categoriesList}
        subcategories={subcategoriesList}
        initialData={product}
        isCreatorConsole
      />
    </div>
  );
}
