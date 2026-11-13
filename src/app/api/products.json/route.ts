import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { products, users, categories, subcategories } from "@/db/schema";
import { eq, and, desc, type SQL } from "drizzle-orm";
import { getProductEffectivePrice } from "@/lib/price-utils";

// Public catalog feed. Hard cap keeps a single request from dumping the whole table.
const MAX_LIMIT = 1000;

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).catch(MAX_LIMIT).transform((n) => Math.min(n, MAX_LIMIT)),
  offset: z.coerce.number().int().min(0).max(1_000_000).catch(0),
  category: z.string().trim().min(1).max(100).optional().catch(undefined),
  subcategory: z.string().trim().min(1).max(100).optional().catch(undefined),
  slug: z.string().trim().min(1).max(200).optional().catch(undefined),
  featured: z.string().optional(),
});

const PUBLIC_HEADERS = {
  "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=3600",
  "Access-Control-Allow-Origin": "*",
} as const;

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const q = querySchema.parse({
    limit: sp.get("limit") ?? undefined,
    offset: sp.get("offset") ?? undefined,
    category: sp.get("category") ?? undefined,
    subcategory: sp.get("subcategory") ?? undefined,
    slug: sp.get("slug") ?? undefined,
    featured: sp.get("featured") ?? undefined,
  });

  try {
    const conditions: SQL[] = [
      eq(products.published, true),
      eq(products.status, "approved"),
    ];
    if (q.slug) conditions.push(eq(products.slug, q.slug));
    if (q.category) conditions.push(eq(products.category, q.category));
    if (q.subcategory) conditions.push(eq(products.subcategory, q.subcategory));
    if (q.featured === "true") conditions.push(eq(products.featured, true));

    // Select only the columns the public feed exposes (never fileUrl or internal stats).
    const rows = await db
      .select({
        id: products.id,
        title: products.title,
        slug: products.slug,
        shortDescription: products.shortDescription,
        description: products.description,
        category: products.category,
        subcategory: products.subcategory,
        tags: products.tags,
        thumbnail: products.thumbnail,
        previewGif: products.previewGif,
        screenshots: products.screenshots,
        videoUrl: products.videoUrl,
        demoUrl: products.demoUrl,
        price: products.price,
        isFree: products.isFree,
        discountPercent: products.discountPercent,
        promoStart: products.promoStart,
        promoEnd: products.promoEnd,
        version: products.version,
        featured: products.featured,
        rating: products.rating,
        ratingCount: products.ratingCount,
        createdAt: products.createdAt,
        storeName: users.storeName,
        categoryName: categories.name,
        subcategoryName: subcategories.name,
      })
      .from(products)
      .leftJoin(users, eq(products.creatorId, users.id))
      .leftJoin(categories, eq(products.category, categories.slug))
      .leftJoin(subcategories, eq(products.subcategory, subcategories.slug))
      .where(and(...conditions))
      .orderBy(desc(products.createdAt), desc(products.id))
      .limit(q.limit)
      .offset(q.offset);

    const publicProducts = rows.map((product) => {
      const priceInfo = getProductEffectivePrice(product);
      return {
        id: product.id,
        title: product.title,
        slug: product.slug,
        shortDescription: product.shortDescription,
        description: product.description,
        category: product.category,
        categoryName: product.categoryName || product.category,
        subcategory: product.subcategory,
        subcategoryName: product.subcategoryName || product.subcategory,
        tags: product.tags ? product.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        thumbnail: product.thumbnail,
        previewGif: product.previewGif,
        screenshots: product.screenshots
          ? product.screenshots.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        videoUrl: product.videoUrl,
        demoUrl: product.demoUrl,
        price: product.price,
        priceFormatted: (product.price / 100).toFixed(2),
        effectivePrice: priceInfo.effectivePrice,
        effectivePriceFormatted: (priceInfo.effectivePrice / 100).toFixed(2),
        currency: "USD",
        isFree: priceInfo.isFree,
        hasDiscount: priceInfo.hasDiscount,
        discountPercent: priceInfo.discountPercent,
        promoEnd: product.promoEnd,
        version: product.version,
        featured: product.featured,
        rating: product.rating,
        ratingCount: product.ratingCount,
        storeName: product.storeName || "Scriptly Store",
        url: `https://scriptly.store/products/${product.slug}`,
        createdAt: product.createdAt,
      };
    });

    return NextResponse.json(
      { success: true, count: publicProducts.length, products: publicProducts },
      { headers: PUBLIC_HEADERS }
    );
  } catch (error) {
    console.error("GET public products failed:", error);
    return NextResponse.json(
      { success: false, error: "Server error fetching products." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export const dynamic = "force-dynamic";
