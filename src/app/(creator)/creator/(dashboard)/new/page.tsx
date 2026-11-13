export const dynamic = "force-dynamic";

import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCategoriesAction, getSubcategoriesAction } from "@/lib/actions/products";
import { getOrCreateDbUser } from "@/lib/auth-utils";
import ProductForm from "@/components/ProductForm";
import { PageHeader } from "@/components/creator/console-ui";

export const metadata: Metadata = {
  title: "List New Script | Creator Console",
  description: "Share your custom code, automation, or boilerplate with the Scriptly library.",
};

export default async function CreatorNewScriptPage() {
  const user = await getOrCreateDbUser();
  if (!user) {
    redirect("/handler/sign-in?redirectTo=/creator/new");
  }

  const [categoriesList, subcategoriesList] = await Promise.all([
    getCategoriesAction(),
    getSubcategoriesAction(),
  ]);

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
        title="New product"
        description="Share your code, boilerplate or automation on Scriptly. You keep 95% of direct sales."
      />
      <ProductForm categories={categoriesList} subcategories={subcategoriesList} isCreatorConsole />
    </div>
  );
}
