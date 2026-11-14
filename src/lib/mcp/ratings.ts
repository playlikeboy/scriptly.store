import { inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";

/**
 * Recomputes products.rating / rating_count from real top-level reviews in a
 * single UPDATE. Products without reviews get rating '0' and rating_count 0.
 * Pass `null` to recompute every product.
 */
export async function recomputeProductRatings(productIds: string[] | null) {
  if (productIds && productIds.length === 0) return [];
  return db
    .update(products)
    .set({
      rating: sql`coalesce((select round(avg(r.rating)::numeric, 1)::text from reviews r where r.product_id = "products"."id" and r.parent_id is null), '0')`,
      ratingCount: sql`(select count(*)::int from reviews r where r.product_id = "products"."id" and r.parent_id is null)`,
    })
    .where(productIds ? inArray(products.id, productIds) : undefined)
    .returning({ id: products.id, slug: products.slug, rating: products.rating, ratingCount: products.ratingCount });
}
