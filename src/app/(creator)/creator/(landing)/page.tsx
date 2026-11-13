import { Metadata } from "next";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { getOrCreateDbUser } from "@/lib/auth-utils";
import CreatorHero, { type ShowcaseProduct } from "@/components/creator/CreatorHero";
import CreatorProblemOpportunity from "@/components/creator/CreatorProblemOpportunity";
import CreatorProductTypes from "@/components/creator/CreatorProductTypes";
import CreatorWorkflow from "@/components/creator/CreatorWorkflow";
import CreatorEarningsCalculator from "@/components/creator/CreatorEarningsCalculator";
import CreatorPackagingGuide from "@/components/creator/CreatorPackagingGuide";
import CreatorFAQ from "@/components/creator/CreatorFAQ";
import CreatorFinalCTA from "@/components/creator/CreatorFinalCTA";

export const metadata: Metadata = {
  title: "Sell on Scriptly | Developer Creator Platform & Marketplace",
  description:
    "Turn your boilerplates, scripts, tools, and UI kits into high-margin developer products. Keep 95% of direct sales with zero listing or monthly fees.",
  keywords: [
    "sell developer tools",
    "sell code online",
    "developer creator economy",
    "sell Next.js templates",
    "monetize software",
    "sell boilerplates",
    "developer marketplace",
  ],
  openGraph: {
    title: "Sell on Scriptly | Developer Creator Platform",
    description: "You built it. Now sell it. Keep 95% of direct sales with zero listing or monthly fees.",
  },
};

async function getShowcase(): Promise<ShowcaseProduct[]> {
  try {
    return await db
      .select({
        title: products.title,
        slug: products.slug,
        thumbnail: products.thumbnail,
        price: products.price,
        isFree: products.isFree,
        category: products.category,
      })
      .from(products)
      .where(
        and(eq(products.status, "approved"), eq(products.published, true), isNotNull(products.thumbnail))
      )
      .orderBy(desc(products.featured), desc(products.createdAt))
      .limit(4);
  } catch {
    return [];
  }
}

export default async function CreatorLandingPage() {
  const [user, showcase] = await Promise.all([getOrCreateDbUser(), getShowcase()]);
  const isLoggedIn = Boolean(user);

  return (
    <div className="bg-background text-foreground">
      <CreatorHero isLoggedIn={isLoggedIn} userName={user?.storeName || user?.name || user?.email} showcase={showcase} />
      <CreatorProblemOpportunity />
      <CreatorProductTypes />
      <CreatorWorkflow />
      <CreatorEarningsCalculator isLoggedIn={isLoggedIn} />
      <CreatorPackagingGuide />
      <CreatorFAQ />
      <CreatorFinalCTA isLoggedIn={isLoggedIn} />
    </div>
  );
}
