"use server";

import { db } from "@/db";
import { products, reviews, userInteractions, users, reviewLikes } from "@/db/schema";
import { eq, and, sql, desc, isNull, inArray } from "drizzle-orm";
import { getOrCreateDbUser } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";

const INTERACTION_TYPES = new Set(["save", "like"]);
const MAX_COMMENT_LENGTH = 5000;

function isValidId(id: unknown): id is string {
  return typeof id === "string" && id.length > 0 && id.length <= 200;
}

/** Shows a reviewer initial without exposing their email address publicly. */
function maskEmail(email: string | null | undefined): string {
  if (!email) return "";
  const first = email.trim().charAt(0);
  return first ? `${first}***` : "";
}

export async function incrementViewAction(productId: string) {
  if (!isValidId(productId)) return { error: "Failed to increment views" };
  try {
    await db
      .update(products)
      .set({ views: sql`${products.views} + 1` })
      .where(eq(products.id, productId));
    return { success: true };
  } catch (error) {
    console.error("Failed to increment views:", error);
    return { error: "Failed to increment views" };
  }
}

export async function getProductStatsAction(productId: string) {
  if (!isValidId(productId)) return { error: "Failed to get stats" };
  try {
    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
      columns: {
        views: true,
        downloadsCount: true,
        saves: true,
      },
    });
    return { success: true, stats: product || { views: 0, downloadsCount: 0, saves: 0 } };
  } catch (error) {
    console.error("Failed to get product stats:", error);
    return { error: "Failed to get stats" };
  }
}

export async function toggleInteractionAction(productId: string, type: "save" | "like") {
  try {
    const user = await getOrCreateDbUser();
    if (!user) {
      return { error: "Unauthorized: Sign in required." };
    }
    if (!isValidId(productId) || !INTERACTION_TYPES.has(type)) {
      return { error: "Invalid interaction." };
    }

    // Try to remove first: one round trip decides the toggle direction and
    // cannot double-delete under concurrent clicks.
    const removed = await db
      .delete(userInteractions)
      .where(
        and(
          eq(userInteractions.userId, user.id),
          eq(userInteractions.productId, productId),
          eq(userInteractions.type, type)
        )
      )
      .returning({ id: userInteractions.id });

    if (removed.length > 0) {
      if (type === "save") {
        await db
          .update(products)
          .set({ saves: sql`GREATEST(0, ${products.saves} - ${removed.length})` })
          .where(eq(products.id, productId));
      }
      return { success: true, active: false };
    }

    await db.insert(userInteractions).values({
      id: crypto.randomUUID(),
      userId: user.id,
      productId,
      type,
    });

    if (type === "save") {
      await db
        .update(products)
        .set({ saves: sql`${products.saves} + 1` })
        .where(eq(products.id, productId));
    }

    return { success: true, active: true };
  } catch (error) {
    console.error("Failed to toggle interaction:", error);
    return { error: "Failed to update interaction" };
  }
}

export async function checkInteractionStatusAction(productId: string) {
  try {
    const user = await getOrCreateDbUser();
    if (!user || !isValidId(productId)) {
      return { isSaved: false, isLiked: false };
    }

    const rows = await db
      .select({ type: userInteractions.type })
      .from(userInteractions)
      .where(
        and(
          eq(userInteractions.userId, user.id),
          eq(userInteractions.productId, productId),
          inArray(userInteractions.type, ["save", "like"])
        )
      );

    return {
      isSaved: rows.some((r) => r.type === "save"),
      isLiked: rows.some((r) => r.type === "like"),
    };
  } catch {
    return { isSaved: false, isLiked: false };
  }
}

export async function submitReviewAction(productId: string, rating: number, comment: string, parentId?: string) {
  try {
    const user = await getOrCreateDbUser();
    if (!user) {
      return { error: "Unauthorized: Sign in required." };
    }

    if (!isValidId(productId)) {
      return { error: "Product not found." };
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return { error: "Rating must be between 1 and 5." };
    }

    const trimmedComment = typeof comment === "string" ? comment.trim() : "";
    if (!trimmedComment) {
      return { error: "Comment cannot be empty." };
    }
    if (trimmedComment.length > MAX_COMMENT_LENGTH) {
      return { error: `Comment must be under ${MAX_COMMENT_LENGTH} characters.` };
    }

    const replyTo = parentId || null;

    const [product, parent] = await Promise.all([
      db.query.products.findFirst({
        where: eq(products.id, productId),
        columns: { id: true, slug: true },
      }),
      replyTo
        ? db.query.reviews.findFirst({
            where: and(eq(reviews.id, replyTo), eq(reviews.productId, productId)),
            columns: { id: true },
          })
        : Promise.resolve(null),
    ]);

    if (!product) {
      return { error: "Product not found." };
    }
    // Replies must target a review on the same product.
    if (replyTo && !parent) {
      return { error: "The review you are replying to no longer exists." };
    }

    await db.insert(reviews).values({
      id: crypto.randomUUID(),
      userId: user.id,
      productId,
      rating,
      comment: trimmedComment,
      parentId: replyTo,
    });

    // Only top-level reviews affect the product rating. Aggregate in SQL
    // instead of loading every review into memory.
    if (!replyTo) {
      const [agg] = await db
        .select({
          avg: sql<string | null>`round(avg(${reviews.rating})::numeric, 1)::text`,
          count: sql<number>`count(*)::int`,
        })
        .from(reviews)
        .where(and(eq(reviews.productId, productId), isNull(reviews.parentId)));

      const count = Number(agg?.count ?? 0);
      await db
        .update(products)
        .set({
          rating: count > 0 && agg?.avg ? agg.avg : "5.0",
          ratingCount: count,
        })
        .where(eq(products.id, productId));
    }

    revalidatePath(`/products/${product.slug}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to submit review:", error);
    return { error: "Failed to submit review" };
  }
}

export async function toggleReviewLikeAction(reviewId: string) {
  try {
    const user = await getOrCreateDbUser();
    if (!user) {
      return { error: "Unauthorized: Sign in required." };
    }
    if (!isValidId(reviewId)) {
      return { error: "Review not found." };
    }

    const removed = await db
      .delete(reviewLikes)
      .where(and(eq(reviewLikes.userId, user.id), eq(reviewLikes.reviewId, reviewId)))
      .returning({ id: reviewLikes.id });

    if (removed.length > 0) {
      return { success: true, liked: false };
    }

    await db.insert(reviewLikes).values({
      id: crypto.randomUUID(),
      userId: user.id,
      reviewId,
    });
    return { success: true, liked: true };
  } catch (error) {
    console.error("Failed to toggle review like:", error);
    return { error: "Failed to toggle like" };
  }
}

export async function getProductReviewsAction(productId: string) {
  try {
    if (!isValidId(productId)) {
      return { success: true, reviews: [] };
    }

    const user = await getOrCreateDbUser();
    const viewerId = user?.id ?? null;

    // Single query: reviews + author + like count + viewer-liked flag.
    // Replaces the previous N+1 pattern (2 extra queries per review).
    const rows = await db
      .select({
        id: reviews.id,
        userId: reviews.userId,
        productId: reviews.productId,
        rating: reviews.rating,
        comment: reviews.comment,
        parentId: reviews.parentId,
        createdAt: reviews.createdAt,
        userName: users.name,
        userEmail: users.email,
        likesCount: sql<number>`(select count(*)::int from ${reviewLikes} where ${reviewLikes.reviewId} = ${reviews.id})`,
        userLiked: viewerId
          ? sql<boolean>`exists(select 1 from ${reviewLikes} where ${reviewLikes.reviewId} = ${reviews.id} and ${reviewLikes.userId} = ${viewerId})`
          : sql<boolean>`false`,
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.userId, users.id))
      .where(eq(reviews.productId, productId))
      .orderBy(desc(reviews.createdAt));

    const mappedReviews = rows.map(({ userName, userEmail, likesCount, userLiked, ...r }) => ({
      ...r,
      user:
        userName !== null || userEmail !== null
          ? { name: userName, email: maskEmail(userEmail) }
          : { name: "Anonymous Builder", email: "" },
      likesCount: Number(likesCount) || 0,
      userLiked: userLiked === true,
    }));

    return { success: true, reviews: mappedReviews };
  } catch (error) {
    console.error("Failed to get product reviews:", error);
    return { error: "Failed to get reviews", reviews: [] };
  }
}
