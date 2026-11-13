import type { Metadata } from "next";
import { getProductsAction, getCategoriesAction } from "@/lib/actions/products";
import { siteConfig } from "@/config/site";
import { BLOG_POSTS } from "@/lib/blog-data";

import HeroSection from "@/components/home/HeroSection";
import CategoryNav from "@/components/home/CategoryNav";
import ProductDiscoverySection from "@/components/home/ProductDiscoverySection";
import FreePicks from "@/components/home/FreePicks";
import CreatorSection from "@/components/home/CreatorSection";
import LearnSection from "@/components/home/LearnSection";
import FinalCTA from "@/components/home/FinalCTA";

const TITLE = `${siteConfig.name} — Production-Ready Code, Templates & Developer Tools`;
const DESCRIPTION =
  "Discover production-ready SaaS templates, developer tools, landing pages, scripts, UI kits, automation assets, and more. Build faster with ScriptlyStore.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: {
    canonical: siteConfig.url,
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: siteConfig.url,
    siteName: siteConfig.name,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

const HERO_COUNT = 3;
const GRID_COUNT = 8;

export default async function Page() {
  // All homepage data loads in one parallel round trip.
  const [featuredData, catalogData, freeData, categories] = await Promise.all([
    getProductsAction({ featuredOnly: true, limit: HERO_COUNT, sortBy: "rating" }),
    getProductsAction({ limit: GRID_COUNT + HERO_COUNT, sortBy: "newest" }),
    getProductsAction({ priceType: "free", limit: 6, sortBy: "rating" }),
    getCategoriesAction(),
  ]);

  // Lead with featured products; fall back to the newest releases.
  const heroProducts =
    featuredData.products.length > 0
      ? featuredData.products
      : catalogData.products.slice(0, HERO_COUNT);

  // Newest releases, minus anything already shown in the hero.
  const heroIds = new Set(heroProducts.map((p) => p.id));
  const latestProducts = catalogData.products.filter((p) => !heroIds.has(p.id)).slice(0, GRID_COUNT);

  return (
    <div className="flex flex-col">
      {/* WebSite JSON-LD is emitted once by the root layout. */}
      <HeroSection featuredProducts={heroProducts} categories={categories} />
      <CategoryNav categories={categories} />
      <ProductDiscoverySection products={latestProducts} categories={categories} />
      <FreePicks products={freeData.products} categories={categories} />
      <CreatorSection />
      <LearnSection posts={BLOG_POSTS} />
      <FinalCTA />
    </div>
  );
}
