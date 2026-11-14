import { z } from "zod";
import { and, asc, desc, eq, gte, ilike, inArray, isNull, lte, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  categories,
  downloads,
  orders,
  products,
  reviews,
  subcategories,
  userInteractions,
  users,
} from "@/db/schema";
import { getProductEffectivePrice } from "@/lib/price-utils";
import { defineTool } from "../registry";
import { recomputeProductRatings } from "../ratings";
import {
  INT4_MAX,
  ToolError,
  catalogAmount,
  catalogMoney,
  confirmField,
  dateField,
  httpOrPathField,
  httpUrlField,
  idOrSlugField,
  isHttpUrl,
  isUniqueViolation,
  iso,
  likeTerm,
  num,
  page,
  paginationFields,
  requireSlug,
  revalidate,
  searchField,
} from "../util";

// ---------------------------------------------------------------------------
// Shared product helpers
// ---------------------------------------------------------------------------

export const productStatus = z.enum(["pending", "approved", "rejected"]);

const tagsField = z
  .union([z.string().max(2000), z.array(z.string().trim().min(1).max(100)).max(100)])
  .describe("Tags as a comma-separated string or an array of strings.")
  .transform((v) => {
    const list = (Array.isArray(v) ? v : v.split(",")).map((t) => t.trim()).filter(Boolean);
    return list.length ? Array.from(new Set(list)).join(",") : null;
  });

const screenshotsField = z
  .array(httpOrPathField("Screenshot."))
  .max(30)
  .describe("Screenshot URLs (stored comma-separated).")
  .transform((list) => (list.length ? list.join(",") : null));

/** R2 object reference: r2://<product-slug>/<file>.zip */
const R2_FILE = /^r2:\/\/[a-z0-9]+(?:-[a-z0-9]+)*\/[A-Za-z0-9_-][A-Za-z0-9._-]{0,200}\.zip$/;

/** Product file: http(s) URL, r2:// object or a site-relative path; never javascript:/data: etc. */
const fileUrlField = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine(
    (v) =>
      isHttpUrl(v) ||
      (R2_FILE.test(v) && !v.includes("..")) ||
      (v.startsWith("/") && !v.startsWith("//") && !v.split(/[\\/]/).includes("..")),
    "Must be an http(s) URL, r2://<slug>/<file>.zip, or a site-relative path starting with '/' (no '..')."
  )
  .describe("Downloadable file: http(s) URL, r2://<slug>/<file>.zip (private R2 object), or site-relative path.");

const percent = (min: number, max: number) => z.number().int().min(min).max(max);
const counter = z.number().int().min(0).max(INT4_MAX);

const editableFields = {
  title: z.string().trim().min(1).max(200),
  shortDescription: z.string().trim().min(1).max(2000),
  description: z.string().trim().min(1).max(200_000).describe("Full description (Markdown/HTML as used by the site)."),
  category: z.string().trim().min(1).max(100).describe("Category slug (must exist; see categories_list)."),
  subcategory: z.string().trim().min(1).max(100).nullable().describe("Subcategory slug belonging to the category, or null."),
  tags: tagsField.nullable(),
  thumbnail: httpOrPathField("Thumbnail image.").nullable(),
  previewGif: httpOrPathField("Hover preview GIF/WebP.").nullable(),
  screenshots: screenshotsField.nullable(),
  videoUrl: httpUrlField("Video (YouTube embed or direct).").nullable(),
  demoUrl: httpUrlField("Live demo.").nullable(),
  fileUrl: fileUrlField.nullable(),
  redirectDownload: z.boolean().describe("True: download redirects to fileUrl. False: bytes are streamed by the server."),
  price: catalogAmount("List price."),
  version: z.string().trim().min(1).max(50),
  featured: z.boolean(),
  published: z.boolean(),
  creatorId: z.string().trim().min(1).max(200).nullable().describe("Owning creator's user id, or null for platform-owned."),
  status: productStatus.describe("Moderation status."),
  isFree: z.boolean(),
  discountPercent: percent(0, 100),
  promoStart: dateField("Promotion start.").nullable(),
  promoEnd: dateField("Promotion end.").nullable(),
  personal: z.boolean(),
  showStats: z.boolean(),
  affiliateCommissionPercent: percent(5, 50).describe("Affiliate commission percent (5-50)."),
};

const adminCounters = {
  views: counter,
  downloadsCount: counter,
  saves: counter,
};

export const productSummaryColumns = {
  id: products.id,
  title: products.title,
  slug: products.slug,
  category: products.category,
  subcategory: products.subcategory,
  status: products.status,
  published: products.published,
  featured: products.featured,
  creatorId: products.creatorId,
  price: products.price,
  isFree: products.isFree,
  discountPercent: products.discountPercent,
  promoStart: products.promoStart,
  promoEnd: products.promoEnd,
  views: products.views,
  downloadsCount: products.downloadsCount,
  createdAt: products.createdAt,
  updatedAt: products.updatedAt,
};

type ProductSummaryRow = {
  id: string;
  title: string;
  slug: string;
  category: string;
  subcategory: string | null;
  status: string | null;
  published: boolean;
  featured: boolean;
  creatorId: string | null;
  price: number;
  isFree: boolean;
  discountPercent: number;
  promoStart: Date | null;
  promoEnd: Date | null;
  views: number;
  downloadsCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export function formatProductSummary(p: ProductSummaryRow) {
  const eff = getProductEffectivePrice(p);
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    category: p.category,
    subcategory: p.subcategory,
    status: p.status,
    published: p.published,
    featured: p.featured,
    creatorId: p.creatorId,
    price: catalogMoney(p.price),
    effectivePrice: catalogMoney(eff.effectivePrice),
    isFree: p.isFree,
    discountPercent: p.discountPercent,
    promoStart: iso(p.promoStart),
    promoEnd: iso(p.promoEnd),
    views: p.views,
    downloadsCount: p.downloadsCount,
    createdAt: iso(p.createdAt),
    updatedAt: iso(p.updatedAt),
  };
}

const byIdOrSlug = (idOrSlug: string) => or(eq(products.id, idOrSlug), eq(products.slug, idOrSlug));

async function findProduct(idOrSlug: string) {
  const [row] = await db
    .select({ id: products.id, slug: products.slug, category: products.category, subcategory: products.subcategory, status: products.status })
    .from(products)
    .where(byIdOrSlug(idOrSlug))
    .limit(1);
  if (!row) throw new ToolError(`Product not found: ${idOrSlug}`);
  return row;
}

async function assertSlugFree(slug: string, excludeId?: string) {
  const [conflict] = await db
    .select({ id: products.id })
    .from(products)
    .where(excludeId ? and(eq(products.slug, slug), ne(products.id, excludeId)) : eq(products.slug, slug))
    .limit(1);
  if (conflict) throw new ToolError(`Slug '${slug}' is already used by product ${conflict.id}.`);
}

/** Category must exist; subcategory (if any) must belong to it. */
async function assertTaxonomy(category: string, subcategory: string | null | undefined) {
  const [cat] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, category))
    .limit(1);
  if (!cat) throw new ToolError(`Unknown category slug '${category}'. Use categories_list to see valid slugs.`);
  if (subcategory) {
    const [sub] = await db
      .select({ categoryId: subcategories.categoryId })
      .from(subcategories)
      .where(eq(subcategories.slug, subcategory))
      .limit(1);
    if (!sub) throw new ToolError(`Unknown subcategory slug '${subcategory}'.`);
    if (sub.categoryId !== cat.id) {
      throw new ToolError(`Subcategory '${subcategory}' does not belong to category '${category}'.`);
    }
  }
}

async function assertUserExists(userId: string | null | undefined) {
  if (!userId) return;
  const [u] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  if (!u) throw new ToolError(`User not found: ${userId}`);
}

function assertPromoOrder(start: Date | null | undefined, end: Date | null | undefined) {
  if (start && end && end <= start) throw new ToolError("promoEnd must be after promoStart.");
}

function revalidateProduct(...slugs: string[]) {
  revalidate("/", "/explore", "/featured", "/admin/products", "/admin/approvals", ...slugs.map((s) => `/products/${s}`));
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

const SORTS = {
  newest: [desc(products.createdAt), desc(products.id)],
  oldest: [asc(products.createdAt), asc(products.id)],
  updated: [desc(products.updatedAt), desc(products.id)],
  price_asc: [asc(products.price), asc(products.id)],
  price_desc: [desc(products.price), desc(products.id)],
  title: [asc(products.title), asc(products.id)],
  views: [desc(products.views), desc(products.id)],
  downloads: [desc(products.downloadsCount), desc(products.id)],
} as const;

const productsList = defineTool({
  name: "products_list",
  title: "List / search products",
  description:
    "Search the catalog with filters, sorting and pagination. Returns summaries (no descriptions). Prices are catalog money (integer USD cents plus formatted string).",
  kind: "read",
  input: z.strictObject({
    query: searchField.optional().describe("Case-insensitive match on title, slug, short description or tags."),
    status: productStatus.optional(),
    published: z.boolean().optional(),
    featured: z.boolean().optional(),
    category: z.string().trim().min(1).max(100).optional().describe("Category slug."),
    subcategory: z.string().trim().min(1).max(100).optional().describe("Subcategory slug."),
    creatorId: z.string().trim().min(1).max(200).optional().describe("Creator user id; use 'none' for platform-owned products."),
    isFree: z.boolean().optional(),
    minPrice: catalogAmount("Minimum list price.").optional(),
    maxPrice: catalogAmount("Maximum list price.").optional(),
    sort: z.enum(Object.keys(SORTS) as [keyof typeof SORTS, ...(keyof typeof SORTS)[]]).default("newest"),
    ...paginationFields,
  }),
  async handler(a) {
    const where: SQL[] = [];
    if (a.query) {
      const t = likeTerm(a.query);
      where.push(or(ilike(products.title, t), ilike(products.slug, t), ilike(products.shortDescription, t), ilike(products.tags, t))!);
    }
    if (a.status) where.push(eq(products.status, a.status));
    if (a.published !== undefined) where.push(eq(products.published, a.published));
    if (a.featured !== undefined) where.push(eq(products.featured, a.featured));
    if (a.category) where.push(eq(products.category, a.category));
    if (a.subcategory) where.push(eq(products.subcategory, a.subcategory));
    if (a.creatorId) where.push(a.creatorId === "none" ? isNull(products.creatorId) : eq(products.creatorId, a.creatorId));
    if (a.isFree !== undefined) where.push(eq(products.isFree, a.isFree));
    if (a.minPrice !== undefined) where.push(gte(products.price, a.minPrice));
    if (a.maxPrice !== undefined) where.push(lte(products.price, a.maxPrice));
    const cond = where.length ? and(...where) : undefined;

    const [rows, [{ total }]] = await Promise.all([
      db
        .select(productSummaryColumns)
        .from(products)
        .where(cond)
        .orderBy(...SORTS[a.sort])
        .limit(a.limit)
        .offset(a.offset),
      db.select({ total: sql<number>`count(*)`.mapWith(Number) }).from(products).where(cond),
    ]);
    const result = page(rows.map(formatProductSummary), total, a.limit, a.offset);
    return { summary: `${rows.length} of ${total} products (offset ${a.offset}).`, data: result };
  },
});

const productsGet = defineTool({
  name: "products_get",
  title: "Get product",
  description:
    "Full product record by id or slug, with sales stats (completed orders, revenue), review stats, saves/likes, download count and creator info.",
  kind: "read",
  input: z.strictObject({ idOrSlug: idOrSlugField("product") }),
  async handler({ idOrSlug }) {
    const [p] = await db.select().from(products).where(byIdOrSlug(idOrSlug)).limit(1);
    if (!p) throw new ToolError(`Product not found: ${idOrSlug}`);

    const [[sales], [rev], [inter], [dl], creator] = await Promise.all([
      db
        .select({
          completed: sql<number>`count(*) filter (where ${orders.status} = 'completed')`.mapWith(Number),
          pending: sql<number>`count(*) filter (where ${orders.status} = 'pending')`.mapWith(Number),
          failed: sql<number>`count(*) filter (where ${orders.status} = 'failed')`.mapWith(Number),
          revenue: sql<number>`coalesce(sum(${orders.amount}) filter (where ${orders.status} = 'completed'), 0)`.mapWith(Number),
        })
        .from(orders)
        .where(eq(orders.productId, p.id)),
      db
        .select({
          count: sql<number>`count(*)`.mapWith(Number),
          avg: sql<string | null>`round(avg(${reviews.rating})::numeric, 2)::text`,
          replies: sql<number>`(select count(*) from ${reviews} r2 where r2.product_id = ${p.id} and r2.parent_id is not null)`.mapWith(Number),
        })
        .from(reviews)
        .where(and(eq(reviews.productId, p.id), isNull(reviews.parentId))),
      db
        .select({
          saves: sql<number>`count(*) filter (where ${userInteractions.type} = 'save')`.mapWith(Number),
          likes: sql<number>`count(*) filter (where ${userInteractions.type} = 'like')`.mapWith(Number),
        })
        .from(userInteractions)
        .where(eq(userInteractions.productId, p.id)),
      db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(downloads).where(eq(downloads.productId, p.id)),
      p.creatorId
        ? db
            .select({ id: users.id, email: users.email, name: users.name, storeName: users.storeName })
            .from(users)
            .where(eq(users.id, p.creatorId))
            .limit(1)
        : Promise.resolve([]),
    ]);

    const eff = getProductEffectivePrice(p);
    const data = {
      product: {
        ...p,
        price: catalogMoney(p.price),
        effectivePrice: catalogMoney(eff.effectivePrice),
        promoActive: eff.isPromoActive,
        tags: p.tags ? p.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        screenshots: p.screenshots ? p.screenshots.split(",").map((s) => s.trim()).filter(Boolean) : [],
        promoStart: iso(p.promoStart),
        promoEnd: iso(p.promoEnd),
        createdAt: iso(p.createdAt),
        updatedAt: iso(p.updatedAt),
      },
      creator: creator[0] ?? null,
      stats: {
        orders: { completed: sales.completed, pending: sales.pending, failed: sales.failed },
        revenue: catalogMoney(sales.revenue),
        reviews: { topLevel: rev.count, replies: rev.replies, averageRating: rev.avg ? Number(rev.avg) : null },
        storedRating: p.rating,
        storedRatingCount: p.ratingCount,
        interactions: { saves: inter.saves, likes: inter.likes },
        downloadEvents: dl.n,
        counters: { views: p.views, downloadsCount: p.downloadsCount, saves: p.saves },
      },
    };
    return {
      summary: `${p.title} (${p.slug}) — ${p.status}, ${p.published ? "published" : "unpublished"}, ${sales.completed} completed orders, revenue ${data.stats.revenue.formatted}.`,
      data,
    };
  },
});

const createInput = z.strictObject({
  title: editableFields.title,
  slug: z.string().trim().min(1).max(200).optional().describe("URL slug; normalized to kebab-case. Defaults to the title."),
  shortDescription: editableFields.shortDescription,
  description: editableFields.description,
  category: editableFields.category,
  price: editableFields.price,
  subcategory: editableFields.subcategory.optional(),
  tags: editableFields.tags.optional(),
  thumbnail: editableFields.thumbnail.optional(),
  previewGif: editableFields.previewGif.optional(),
  screenshots: editableFields.screenshots.optional(),
  videoUrl: editableFields.videoUrl.optional(),
  demoUrl: editableFields.demoUrl.optional(),
  fileUrl: editableFields.fileUrl.optional(),
  redirectDownload: editableFields.redirectDownload.optional(),
  version: editableFields.version.optional(),
  featured: editableFields.featured.optional(),
  published: editableFields.published.optional().describe("Default true. Publishing implies status 'approved'."),
  creatorId: editableFields.creatorId.optional(),
  status: editableFields.status.optional().describe("Default: 'approved' when published, else 'pending'."),
  isFree: editableFields.isFree.optional(),
  discountPercent: editableFields.discountPercent.optional(),
  promoStart: editableFields.promoStart.optional(),
  promoEnd: editableFields.promoEnd.optional(),
  personal: editableFields.personal.optional(),
  showStats: editableFields.showStats.optional(),
  affiliateCommissionPercent: editableFields.affiliateCommissionPercent.optional(),
});

const productsCreate = defineTool({
  name: "products_create",
  title: "Create product",
  description:
    "Create a catalog product. Validates category/subcategory and creator, normalizes the slug and enforces uniqueness. price is integer USD cents (2500 = $25.00).",
  kind: "write",
  input: createInput,
  async handler(a) {
    const slug = requireSlug(a.slug ?? a.title);
    await Promise.all([assertSlugFree(slug), assertTaxonomy(a.category, a.subcategory), assertUserExists(a.creatorId)]);
    assertPromoOrder(a.promoStart, a.promoEnd);

    const published = a.published ?? true;
    const id = crypto.randomUUID();
    try {
      await db.insert(products).values({
        id,
        slug,
        title: a.title,
        shortDescription: a.shortDescription,
        description: a.description,
        category: a.category,
        subcategory: a.subcategory ?? null,
        tags: a.tags ?? null,
        thumbnail: a.thumbnail ?? null,
        previewGif: a.previewGif ?? null,
        screenshots: a.screenshots ?? null,
        videoUrl: a.videoUrl ?? null,
        demoUrl: a.demoUrl ?? null,
        fileUrl: a.fileUrl ?? null,
        redirectDownload: a.redirectDownload ?? true,
        price: a.price,
        version: a.version ?? "1.0.0",
        featured: a.featured ?? false,
        published,
        creatorId: a.creatorId ?? null,
        status: a.status ?? (published ? "approved" : "pending"),
        isFree: a.isFree ?? false,
        discountPercent: a.discountPercent ?? 0,
        promoStart: a.promoStart ?? null,
        promoEnd: a.promoEnd ?? null,
        personal: a.personal ?? false,
        showStats: a.showStats ?? false,
        affiliateCommissionPercent: a.affiliateCommissionPercent ?? 30,
        // Explicit: schema defaults ('5.0' / 1) would fake social proof.
        rating: "0",
        ratingCount: 0,
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw new ToolError(`Slug '${slug}' is already taken.`);
      throw err;
    }
    revalidateProduct(slug);
    return {
      summary: `Created product ${id} (${slug}) at ${catalogMoney(a.price).formatted}.`,
      data: { id, slug, url: `/products/${slug}`, price: catalogMoney(a.price) },
    };
  },
});

const updatePatch = z.strictObject({
  ...Object.fromEntries(Object.entries(editableFields).map(([k, v]) => [k, v.optional()])),
  slug: z.string().trim().min(1).max(200).optional().describe("New slug; normalized and checked for uniqueness."),
  views: adminCounters.views.optional(),
  downloadsCount: adminCounters.downloadsCount.optional(),
  saves: adminCounters.saves.optional(),
}) as unknown as z.ZodType<
  Partial<{ [K in keyof typeof editableFields]: z.output<(typeof editableFields)[K]> }> & {
    slug?: string;
    views?: number;
    downloadsCount?: number;
    saves?: number;
  }
>;

const productsUpdate = defineTool({
  name: "products_update",
  title: "Update product",
  description:
    "Partially update a product (only the fields you send change; send null to clear nullable fields). Setting published=true without status also sets status 'approved'. price is integer USD cents.",
  kind: "write",
  idempotent: true,
  input: z.strictObject({
    idOrSlug: idOrSlugField("product"),
    patch: updatePatch.describe("Fields to change."),
  }),
  async handler({ idOrSlug, patch }) {
    const keys = Object.keys(patch).filter((k) => (patch as Record<string, unknown>)[k] !== undefined);
    if (keys.length === 0) throw new ToolError("patch must contain at least one field.");
    const target = await findProduct(idOrSlug);

    const set: Partial<typeof products.$inferInsert> = {};
    for (const k of keys) (set as Record<string, unknown>)[k] = (patch as Record<string, unknown>)[k];

    if (patch.slug !== undefined) {
      set.slug = patch.slug === target.slug ? target.slug : requireSlug(patch.slug);
      if (set.slug !== target.slug) await assertSlugFree(set.slug, target.id);
    }
    if (patch.category !== undefined || patch.subcategory !== undefined) {
      await assertTaxonomy(
        patch.category ?? target.category,
        patch.subcategory !== undefined ? patch.subcategory : target.subcategory
      );
    }
    if (patch.creatorId !== undefined) await assertUserExists(patch.creatorId);
    if (patch.promoStart !== undefined || patch.promoEnd !== undefined) {
      const [cur] = await db
        .select({ s: products.promoStart, e: products.promoEnd })
        .from(products)
        .where(eq(products.id, target.id));
      assertPromoOrder(patch.promoStart !== undefined ? patch.promoStart : cur?.s, patch.promoEnd !== undefined ? patch.promoEnd : cur?.e);
    }
    if (patch.published === true && patch.status === undefined) set.status = "approved";
    set.updatedAt = new Date();

    let updated: { slug: string }[];
    try {
      updated = await db.update(products).set(set).where(eq(products.id, target.id)).returning({ slug: products.slug });
    } catch (err) {
      if (isUniqueViolation(err)) throw new ToolError(`Slug '${set.slug}' is already taken.`);
      throw err;
    }
    if (updated.length === 0) throw new ToolError(`Product not found: ${idOrSlug}`);
    revalidateProduct(target.slug, updated[0].slug);
    return {
      summary: `Updated product ${target.id}: ${keys.join(", ")}.`,
      data: { id: target.id, slug: updated[0].slug, changed: keys },
    };
  },
});

const productsDelete = defineTool({
  name: "products_delete",
  title: "Delete product",
  description:
    "Permanently delete a product. WARNING: orders, downloads, reviews and affiliate commissions for the product are cascade-deleted. Refuses when the product has completed orders unless force=true. Prefer products_set_published(false).",
  kind: "destructive",
  input: z.strictObject({
    idOrSlug: idOrSlugField("product"),
    force: z.boolean().default(false).describe("Delete even if completed orders exist (destroys sales history)."),
    confirm: confirmField,
  }),
  async handler({ idOrSlug, force }) {
    const target = await findProduct(idOrSlug);
    const [{ completed }] = await db
      .select({ completed: sql<number>`count(*)`.mapWith(Number) })
      .from(orders)
      .where(and(eq(orders.productId, target.id), eq(orders.status, "completed")));
    if (completed > 0 && !force) {
      throw new ToolError(
        `Product has ${completed} completed orders; deleting it would cascade-delete them. Unpublish instead, or pass force: true.`
      );
    }
    const deleted = await db.delete(products).where(eq(products.id, target.id)).returning({ id: products.id });
    if (deleted.length === 0) throw new ToolError(`Product not found: ${idOrSlug}`);
    revalidateProduct(target.slug);
    return {
      summary: `Deleted product ${target.id} (${target.slug}); ${completed} completed orders were removed with it.`,
      data: { id: target.id, slug: target.slug, deletedCompletedOrders: completed },
    };
  },
});

const productsSetPublished = defineTool({
  name: "products_set_published",
  title: "Publish / unpublish product",
  description: "Set a product's published flag. Publishing also sets status 'approved'; unpublishing keeps the current status.",
  kind: "write",
  idempotent: true,
  input: z.strictObject({ idOrSlug: idOrSlugField("product"), published: z.boolean() }),
  async handler({ idOrSlug, published }) {
    const target = await findProduct(idOrSlug);
    await db
      .update(products)
      .set(published ? { published, status: "approved", updatedAt: new Date() } : { published, updatedAt: new Date() })
      .where(eq(products.id, target.id));
    revalidateProduct(target.slug);
    return {
      summary: `Product ${target.slug} is now ${published ? "published (approved)" : "unpublished"}.`,
      data: { id: target.id, slug: target.slug, published, status: published ? "approved" : target.status },
    };
  },
});

const productsSetFeatured = defineTool({
  name: "products_set_featured",
  title: "Feature / unfeature product",
  description: "Set whether a product appears in featured placements.",
  kind: "write",
  idempotent: true,
  input: z.strictObject({ idOrSlug: idOrSlugField("product"), featured: z.boolean() }),
  async handler({ idOrSlug, featured }) {
    const target = await findProduct(idOrSlug);
    await db.update(products).set({ featured, updatedAt: new Date() }).where(eq(products.id, target.id));
    revalidateProduct(target.slug);
    return { summary: `Product ${target.slug} featured=${featured}.`, data: { id: target.id, slug: target.slug, featured } };
  },
});

const bulkPatch = z.strictObject({
  published: z.boolean().optional().describe("true also sets status 'approved' unless status is given."),
  featured: z.boolean().optional(),
  status: productStatus.optional(),
  category: editableFields.category.optional().describe("Category slug; clears subcategory unless one is given."),
  subcategory: editableFields.subcategory.optional(),
  isFree: z.boolean().optional(),
  discountPercent: editableFields.discountPercent.optional(),
  promoStart: editableFields.promoStart.optional(),
  promoEnd: editableFields.promoEnd.optional(),
  affiliateCommissionPercent: editableFields.affiliateCommissionPercent.optional(),
  personal: z.boolean().optional(),
  showStats: z.boolean().optional(),
});

const productsBulkUpdate = defineTool({
  name: "products_bulk_update",
  title: "Bulk update products",
  description:
    "Apply the same patch to up to 100 products by id in one UPDATE. Supports publish/feature/status/category/discount/promo fields.",
  kind: "destructive",
  input: z.strictObject({
    ids: z.array(z.string().trim().min(1).max(200)).min(1).max(100).describe("Product ids (not slugs), max 100."),
    patch: bulkPatch,
    confirm: confirmField,
  }),
  async handler({ ids, patch }) {
    const unique = Array.from(new Set(ids));
    const set: Partial<typeof products.$inferInsert> = {};
    for (const [k, v] of Object.entries(patch)) if (v !== undefined) (set as Record<string, unknown>)[k] = v;
    const keys = Object.keys(set);
    if (keys.length === 0) throw new ToolError("patch must contain at least one field.");
    if (patch.category !== undefined) {
      await assertTaxonomy(patch.category, patch.subcategory);
      if (patch.subcategory === undefined) set.subcategory = null;
    } else if (patch.subcategory) {
      throw new ToolError("Setting subcategory in bulk requires category as well.");
    }
    assertPromoOrder(patch.promoStart, patch.promoEnd);
    if (patch.published === true && patch.status === undefined) set.status = "approved";
    set.updatedAt = new Date();

    const updated = await db
      .update(products)
      .set(set)
      .where(inArray(products.id, unique))
      .returning({ id: products.id, slug: products.slug });
    const found = new Set(updated.map((u) => u.id));
    const missing = unique.filter((id) => !found.has(id));
    revalidateProduct(...updated.slice(0, 20).map((u) => u.slug));
    return {
      summary: `Updated ${updated.length} of ${unique.length} products (${keys.join(", ")}).${missing.length ? ` ${missing.length} ids not found.` : ""}`,
      data: { updated: updated.length, changed: keys, notFound: missing },
    };
  },
});

// ---------------------------------------------------------------------------
// Moderation
// ---------------------------------------------------------------------------

const approvalsList = defineTool({
  name: "approvals_list_pending",
  title: "List products awaiting approval",
  description: "Products with status 'pending' (creator submissions), oldest first, with creator email/store.",
  kind: "read",
  input: z.strictObject({ ...paginationFields }),
  async handler({ limit, offset }) {
    const cond = eq(products.status, "pending");
    const [rows, [{ total }]] = await Promise.all([
      db
        .select({ ...productSummaryColumns, creatorEmail: users.email, creatorStore: users.storeName })
        .from(products)
        .leftJoin(users, eq(products.creatorId, users.id))
        .where(cond)
        .orderBy(asc(products.createdAt), asc(products.id))
        .limit(limit)
        .offset(offset),
      db.select({ total: sql<number>`count(*)`.mapWith(Number) }).from(products).where(cond),
    ]);
    const items = rows.map((r) => ({ ...formatProductSummary(r), creatorEmail: r.creatorEmail, creatorStore: r.creatorStore }));
    return { summary: `${total} products pending approval.`, data: page(items, total, limit, offset) };
  },
});

const productsApprove = defineTool({
  name: "products_approve",
  title: "Approve product",
  description: "Approve a product: status 'approved' and published=true.",
  kind: "write",
  idempotent: true,
  input: z.strictObject({ idOrSlug: idOrSlugField("product") }),
  async handler({ idOrSlug }) {
    const target = await findProduct(idOrSlug);
    await db.update(products).set({ status: "approved", published: true, updatedAt: new Date() }).where(eq(products.id, target.id));
    revalidateProduct(target.slug);
    return { summary: `Approved and published ${target.slug}.`, data: { id: target.id, slug: target.slug, status: "approved", published: true } };
  },
});

const productsReject = defineTool({
  name: "products_reject",
  title: "Reject product",
  description:
    "Reject a product: status 'rejected' and published=false. The schema has no rejection-reason column, so no reason is stored; tell the creator out of band.",
  kind: "write",
  idempotent: true,
  input: z.strictObject({ idOrSlug: idOrSlugField("product") }),
  async handler({ idOrSlug }) {
    const target = await findProduct(idOrSlug);
    await db.update(products).set({ status: "rejected", published: false, updatedAt: new Date() }).where(eq(products.id, target.id));
    revalidateProduct(target.slug);
    return { summary: `Rejected and unpublished ${target.slug}.`, data: { id: target.id, slug: target.slug, status: "rejected", published: false } };
  },
});

const productsResetRatings = defineTool({
  name: "products_reset_ratings",
  title: "Recompute product ratings",
  description:
    "Recompute rating / ratingCount from real top-level reviews for the given products (or every product when ids is omitted). Products without reviews become rating '0', ratingCount 0.",
  kind: "destructive",
  idempotent: true,
  input: z.strictObject({
    ids: z.array(z.string().trim().min(1).max(200)).min(1).max(100).optional().describe("Product ids or slugs; omit for all products."),
    confirm: confirmField,
  }),
  async handler({ ids }) {
    let targetIds: string[] | null = null;
    if (ids) {
      const unique = Array.from(new Set(ids));
      const found = await db
        .select({ id: products.id })
        .from(products)
        .where(or(inArray(products.id, unique), inArray(products.slug, unique)));
      targetIds = found.map((f) => f.id);
      if (targetIds.length === 0) throw new ToolError("None of the given products exist.");
    }
    const updated = await recomputeProductRatings(targetIds);
    const reviewed = updated.filter((u) => u.ratingCount > 0).length;
    revalidateProduct(...updated.slice(0, 20).map((u) => u.slug));
    return {
      summary: `Recomputed ratings for ${updated.length} products (${reviewed} with reviews, ${updated.length - reviewed} reset to 0).`,
      data: {
        updated: updated.length,
        withReviews: reviewed,
        items: updated.slice(0, 100).map((u) => ({ id: u.id, slug: u.slug, rating: u.rating, ratingCount: u.ratingCount })),
        truncated: updated.length > 100,
      },
    };
  },
});

export const productTools = [
  productsList,
  productsGet,
  productsCreate,
  productsUpdate,
  productsDelete,
  productsSetPublished,
  productsSetFeatured,
  productsBulkUpdate,
  approvalsList,
  productsApprove,
  productsReject,
  productsResetRatings,
];
