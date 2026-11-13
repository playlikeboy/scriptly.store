import { MetadataRoute } from "next";
import { db } from "@/db";
import { products, categories, subcategories } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { BLOG_POSTS } from "@/lib/blog-data";

const BASE_URL = "https://scriptly.store";

// A single sitemap file may hold at most 50,000 URLs; leave room for static,
// taxonomy and blog entries.
const MAX_PRODUCT_URLS = 45_000;

const STATIC_ROUTES = [
  "",
  "/explore",
  "/search",
  "/featured",
  "/free",
  "/offers",
  "/creator",
  "/hire-me",
  "/about",
  "/trust",
  "/contact",
  "/licenses",
  "/terms",
  "/privacy",
  "/refund",
  "/shipping",
  "/dmca",
  "/affiliate",
  "/directories",
  "/docs/route-guide",
];

const HIGH_PRIORITY = new Set(["/explore", "/featured", "/free", "/creator"]);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const routes: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: route === "" ? 1.0 : HIGH_PRIORITY.has(route) ? 0.9 : 0.7,
  }));

  // Fetch only the columns needed for URLs, in parallel. Each query fails
  // independently so one bad table never blanks the whole sitemap.
  const [productRows, categoryRows, subcategoryRows] = await Promise.all([
    db
      .select({ slug: products.slug, updatedAt: products.updatedAt })
      .from(products)
      .where(and(eq(products.published, true), eq(products.status, "approved")))
      .orderBy(desc(products.updatedAt))
      .limit(MAX_PRODUCT_URLS)
      .catch((err) => {
        console.error("sitemap: failed to load products", err);
        return [] as { slug: string; updatedAt: Date }[];
      }),
    db
      .select({ slug: categories.slug })
      .from(categories)
      .catch((err) => {
        console.error("sitemap: failed to load categories", err);
        return [] as { slug: string }[];
      }),
    db
      .select({ slug: subcategories.slug, categorySlug: categories.slug })
      .from(subcategories)
      .innerJoin(categories, eq(subcategories.categoryId, categories.id))
      .catch((err) => {
        console.error("sitemap: failed to load subcategories", err);
        return [] as { slug: string; categorySlug: string }[];
      }),
  ]);

  const productRoutes: MetadataRoute.Sitemap = productRows.map((product) => ({
    url: `${BASE_URL}/products/${product.slug}`,
    lastModified: product.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const categoryRoutes: MetadataRoute.Sitemap = categoryRows.map((category) => ({
    url: `${BASE_URL}/explore/${category.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const subcategoryRoutes: MetadataRoute.Sitemap = subcategoryRows.map((sub) => ({
    url: `${BASE_URL}/explore/${sub.categorySlug}/${sub.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const blogIndexRoute = {
    url: `${BASE_URL}/blog`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.8,
  };

  const blogRoutes: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.createdAt),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [
    ...routes,
    ...productRoutes,
    ...categoryRoutes,
    ...subcategoryRoutes,
    blogIndexRoute,
    ...blogRoutes,
  ];
}
