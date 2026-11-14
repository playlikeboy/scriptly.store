import { z } from "zod";
import { and, desc, eq, gte, ilike, isNotNull, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { products, reviews, users } from "@/db/schema";
import { defineTool } from "../registry";
import { recomputeProductRatings } from "../ratings";
import { ToolError, confirmField, iso, likeTerm, page, paginationFields, revalidate, searchField } from "../util";

type DeletedRow = { id: string; product_id: string };

function rowsOf<T>(res: unknown): T[] {
  return ((res as { rows?: T[] })?.rows ?? []) as T[];
}

async function afterDelete(deleted: DeletedRow[]) {
  const productIds = Array.from(new Set(deleted.map((d) => d.product_id)));
  const ratings = await recomputeProductRatings(productIds);
  revalidate(...ratings.slice(0, 20).map((r) => `/products/${r.slug}`));
  return {
    reviewsDeleted: deleted.length,
    productsRecomputed: ratings.map((r) => ({ id: r.id, slug: r.slug, rating: r.rating, ratingCount: r.ratingCount })),
  };
}

const reviewsList = defineTool({
  name: "reviews_list",
  title: "List reviews",
  description: "Reviews and replies with author, product, rating and like count. Filter by product (id or slug), author, rating range or text.",
  kind: "read",
  input: z.strictObject({
    product: z.string().trim().min(1).max(200).optional().describe("Product id or slug."),
    userId: z.string().trim().min(1).max(200).optional(),
    minRating: z.number().int().min(1).max(5).optional(),
    maxRating: z.number().int().min(1).max(5).optional(),
    kind: z.enum(["all", "reviews", "replies"]).default("all"),
    query: searchField.optional().describe("Substring match on comment text or author email."),
    ...paginationFields,
  }),
  async handler(a) {
    const where: SQL[] = [];
    if (a.product) where.push(or(eq(products.id, a.product), eq(products.slug, a.product))!);
    if (a.userId) where.push(eq(reviews.userId, a.userId));
    if (a.minRating) where.push(gte(reviews.rating, a.minRating));
    if (a.maxRating) where.push(lte(reviews.rating, a.maxRating));
    if (a.kind === "reviews") where.push(isNull(reviews.parentId));
    if (a.kind === "replies") where.push(isNotNull(reviews.parentId));
    if (a.query) where.push(or(ilike(reviews.comment, likeTerm(a.query)), ilike(users.email, likeTerm(a.query)))!);
    const cond = where.length ? and(...where) : undefined;
    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          id: reviews.id,
          rating: reviews.rating,
          comment: reviews.comment,
          parentId: reviews.parentId,
          createdAt: reviews.createdAt,
          userId: reviews.userId,
          userEmail: users.email,
          productId: reviews.productId,
          productSlug: products.slug,
          likes: sql<number>`(select count(*) from review_likes l where l.review_id = ${sql.raw(`"reviews"."id"`)})`.mapWith(Number),
        })
        .from(reviews)
        .leftJoin(users, eq(reviews.userId, users.id))
        .leftJoin(products, eq(reviews.productId, products.id))
        .where(cond)
        .orderBy(desc(reviews.createdAt), desc(reviews.id))
        .limit(a.limit)
        .offset(a.offset),
      db
        .select({ total: sql<number>`count(*)`.mapWith(Number) })
        .from(reviews)
        .leftJoin(users, eq(reviews.userId, users.id))
        .leftJoin(products, eq(reviews.productId, products.id))
        .where(cond),
    ]);
    const items = rows.map((r) => ({ ...r, createdAt: iso(r.createdAt) }));
    return { summary: `${items.length} of ${total} reviews.`, data: page(items, total, a.limit, a.offset) };
  },
});

const reviewsDelete = defineTool({
  name: "reviews_delete",
  title: "Delete review",
  description:
    "Delete a review and its whole reply thread (likes cascade), then recompute the product's rating/ratingCount from the remaining top-level reviews.",
  kind: "destructive",
  input: z.strictObject({ id: z.string().trim().min(1).max(200), confirm: confirmField }),
  async handler({ id }) {
    const deleted = rowsOf<DeletedRow>(
      await db.execute(sql`
        with recursive tree as (
          select id from reviews where id = ${id}
          union all
          select r.id from reviews r join tree t on r.parent_id = t.id
        )
        delete from reviews where id in (select id from tree)
        returning id, product_id
      `)
    );
    if (deleted.length === 0) throw new ToolError(`Review not found: ${id}`);
    const result = await afterDelete(deleted);
    return { summary: `Deleted review ${id} and ${deleted.length - 1} replies; rating recomputed.`, data: { id, ...result } };
  },
});

const reviewsDeleteByUser = defineTool({
  name: "reviews_delete_by_user",
  title: "Delete all reviews by a user",
  description:
    "Spam cleanup: delete every review and reply written by a user (plus the reply threads under them and the likes they gave), then recompute ratings for affected products.",
  kind: "destructive",
  input: z.strictObject({
    userIdOrEmail: z.string().trim().min(1).max(254).describe("User id or email."),
    confirm: confirmField,
  }),
  async handler({ userIdOrEmail }) {
    const [u] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(or(eq(users.id, userIdOrEmail), sql`lower(${users.email}) = lower(${userIdOrEmail})`))
      .limit(1);
    if (!u) throw new ToolError(`User not found: ${userIdOrEmail}`);
    const [likesRes, reviewsRes] = await db.batch([
      db.execute(sql`delete from review_likes where user_id = ${u.id} returning id`),
      db.execute(sql`
        with recursive tree as (
          select id from reviews where user_id = ${u.id}
          union all
          select r.id from reviews r join tree t on r.parent_id = t.id
        )
        delete from reviews where id in (select id from tree)
        returning id, product_id
      `),
    ]);
    const likesDeleted = rowsOf<{ id: string }>(likesRes).length;
    const deleted = rowsOf<DeletedRow>(reviewsRes);
    const result = await afterDelete(deleted);
    return {
      summary: `Deleted ${deleted.length} reviews/replies and ${likesDeleted} likes by ${u.email}; ${result.productsRecomputed.length} product ratings recomputed.`,
      data: { userId: u.id, email: u.email, likesDeleted, ...result },
    };
  },
});

export const reviewTools = [reviewsList, reviewsDelete, reviewsDeleteByUser];
