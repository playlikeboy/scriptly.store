import { z } from "zod";
import { and, asc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, products, subcategories } from "@/db/schema";
import { defineTool } from "../registry";

// Correlated subqueries reference the outer row explicitly: drizzle renders
// columns unqualified in single-table selects, which would bind to the inner table.
const OUTER_CATEGORY_SLUG = sql.raw(`"categories"."slug"`);
const OUTER_SUBCATEGORY_SLUG = sql.raw(`"subcategories"."slug"`);
import { ToolError, confirmField, isUniqueViolation, likeTerm, page, paginationFields, requireSlug, revalidate, searchField } from "../util";

const kind = z.enum(["category", "subcategory"]);
const nameField = z.string().trim().min(1).max(100);
const slugInput = z.string().trim().min(1).max(100).describe("Slug; normalized to kebab-case.");

function revalidateTaxonomy() {
  revalidate("/", "/explore", "/admin/categories");
}

/** Categories with their subcategories and product counts (all aggregated in SQL). */
export async function loadCategoryTree(opts: { query?: string; limit: number; offset: number }) {
  const cond = opts.query
    ? or(ilike(categories.name, likeTerm(opts.query)), ilike(categories.slug, likeTerm(opts.query)))
    : undefined;
  const [cats, [{ total }]] = await Promise.all([
    db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        productCount: sql<number>`(select count(*) from ${products} p where p.category = ${OUTER_CATEGORY_SLUG})`.mapWith(Number),
        publishedCount: sql<number>`(select count(*) from ${products} p where p.category = ${OUTER_CATEGORY_SLUG} and p.published)`.mapWith(Number),
      })
      .from(categories)
      .where(cond)
      .orderBy(asc(categories.name), asc(categories.id))
      .limit(opts.limit)
      .offset(opts.offset),
    db.select({ total: sql<number>`count(*)`.mapWith(Number) }).from(categories).where(cond),
  ]);
  const subs = cats.length
    ? await db
        .select({
          id: subcategories.id,
          name: subcategories.name,
          slug: subcategories.slug,
          categoryId: subcategories.categoryId,
          productCount: sql<number>`(select count(*) from ${products} p where p.subcategory = ${OUTER_SUBCATEGORY_SLUG})`.mapWith(Number),
        })
        .from(subcategories)
        .where(inArray(subcategories.categoryId, cats.map((c) => c.id)))
        .orderBy(asc(subcategories.name))
    : [];
  const items = cats.map((c) => ({ ...c, subcategories: subs.filter((s) => s.categoryId === c.id) }));
  return page(items, total, opts.limit, opts.offset);
}

const categoriesList = defineTool({
  name: "categories_list",
  title: "List categories",
  description: "Categories (by name) with nested subcategories and product counts. Product rows reference categories by slug.",
  kind: "read",
  input: z.strictObject({
    query: searchField.optional().describe("Match on category name or slug."),
    ...paginationFields,
  }),
  async handler(a) {
    const result = await loadCategoryTree(a);
    return { summary: `${result.count} of ${result.total} categories.`, data: result };
  },
});

async function resolveCategory(idOrSlug: string) {
  const [cat] = await db
    .select({ id: categories.id, slug: categories.slug, name: categories.name })
    .from(categories)
    .where(or(eq(categories.id, idOrSlug), eq(categories.slug, idOrSlug)))
    .limit(1);
  if (!cat) throw new ToolError(`Category not found: ${idOrSlug}`);
  return cat;
}

async function resolveSubcategory(idOrSlug: string) {
  const [sub] = await db
    .select({ id: subcategories.id, slug: subcategories.slug, name: subcategories.name, categoryId: subcategories.categoryId })
    .from(subcategories)
    .where(or(eq(subcategories.id, idOrSlug), eq(subcategories.slug, idOrSlug)))
    .limit(1);
  if (!sub) throw new ToolError(`Subcategory not found: ${idOrSlug}`);
  return sub;
}

const categoriesCreate = defineTool({
  name: "categories_create",
  title: "Create category or subcategory",
  description: "Create a category, or a subcategory under an existing category. The id equals the normalized slug.",
  kind: "write",
  input: z.strictObject({
    type: kind,
    name: nameField,
    slug: slugInput.optional().describe("Defaults to the name, normalized."),
    category: z.string().trim().min(1).max(100).optional().describe("Parent category id or slug (required for subcategories)."),
  }),
  async handler(a) {
    const slug = requireSlug(a.slug ?? a.name);
    try {
      if (a.type === "category") {
        const [dupe] = await db.select({ id: categories.id }).from(categories).where(or(eq(categories.slug, slug), eq(categories.id, slug))).limit(1);
        if (dupe) throw new ToolError(`Category slug '${slug}' already exists.`);
        await db.insert(categories).values({ id: slug, name: a.name, slug });
        revalidateTaxonomy();
        return { summary: `Created category '${a.name}' (${slug}).`, data: { type: a.type, id: slug, slug, name: a.name } };
      }
      if (!a.category) throw new ToolError("category (parent id or slug) is required for subcategories.");
      const parent = await resolveCategory(a.category);
      const [dupe] = await db
        .select({ id: subcategories.id })
        .from(subcategories)
        .where(or(eq(subcategories.slug, slug), eq(subcategories.id, slug)))
        .limit(1);
      if (dupe) throw new ToolError(`Subcategory slug '${slug}' already exists.`);
      await db.insert(subcategories).values({ id: slug, name: a.name, slug, categoryId: parent.id });
      revalidateTaxonomy();
      return {
        summary: `Created subcategory '${a.name}' (${slug}) under ${parent.slug}.`,
        data: { type: a.type, id: slug, slug, name: a.name, categoryId: parent.id },
      };
    } catch (err) {
      if (isUniqueViolation(err)) throw new ToolError(`Slug '${slug}' already exists.`);
      throw err;
    }
  },
});

const categoriesUpdate = defineTool({
  name: "categories_update",
  title: "Rename category or subcategory",
  description:
    "Change a category/subcategory name and/or slug. A slug change also rewrites products.category / products.subcategory in the same transaction so listings stay attached. The id never changes.",
  kind: "write",
  idempotent: true,
  input: z.strictObject({
    type: kind,
    idOrSlug: z.string().trim().min(1).max(100),
    name: nameField.optional(),
    slug: slugInput.optional(),
  }),
  async handler(a) {
    if (a.name === undefined && a.slug === undefined) throw new ToolError("Provide name and/or slug.");
    const table = a.type === "category" ? categories : subcategories;
    const current = a.type === "category" ? await resolveCategory(a.idOrSlug) : await resolveSubcategory(a.idOrSlug);
    const newSlug = a.slug !== undefined ? requireSlug(a.slug) : current.slug;
    if (newSlug !== current.slug) {
      const [dupe] = await db.select({ id: table.id }).from(table).where(and(eq(table.slug, newSlug), ne(table.id, current.id))).limit(1);
      if (dupe) throw new ToolError(`Slug '${newSlug}' already exists.`);
    }
    const set = { name: a.name ?? current.name, slug: newSlug };
    let moved = 0;
    try {
      if (newSlug !== current.slug) {
        const productColumn = a.type === "category" ? products.category : products.subcategory;
        const [, movedRows] = await db.batch([
          db.update(table).set(set).where(eq(table.id, current.id)),
          db
            .update(products)
            .set(a.type === "category" ? { category: newSlug, updatedAt: new Date() } : { subcategory: newSlug, updatedAt: new Date() })
            .where(eq(productColumn, current.slug))
            .returning({ id: products.id }),
        ]);
        moved = movedRows.length;
      } else {
        await db.update(table).set(set).where(eq(table.id, current.id));
      }
    } catch (err) {
      if (isUniqueViolation(err)) throw new ToolError(`Slug '${newSlug}' already exists.`);
      throw err;
    }
    revalidateTaxonomy();
    return {
      summary: `Updated ${a.type} ${current.id}: name='${set.name}', slug='${newSlug}'${moved ? `; ${moved} products re-pointed` : ""}.`,
      data: { type: a.type, id: current.id, ...set, previousSlug: current.slug, productsUpdated: moved },
    };
  },
});

const categoriesDelete = defineTool({
  name: "categories_delete",
  title: "Delete category or subcategory",
  description:
    "Delete a category (its subcategories are cascade-deleted) or a subcategory. Refuses when products reference it unless force=true; forced deletes leave those products pointing at a missing slug.",
  kind: "destructive",
  input: z.strictObject({
    type: kind,
    idOrSlug: z.string().trim().min(1).max(100),
    force: z.boolean().default(false),
    confirm: confirmField,
  }),
  async handler(a) {
    const current = a.type === "category" ? await resolveCategory(a.idOrSlug) : await resolveSubcategory(a.idOrSlug);
    const column = a.type === "category" ? products.category : products.subcategory;
    const [{ n }] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(products).where(eq(column, current.slug));
    if (n > 0 && !a.force) {
      throw new ToolError(`${n} products use ${a.type} '${current.slug}'. Move them first (products_bulk_update) or pass force: true.`);
    }
    const deleted =
      a.type === "category"
        ? await db.delete(categories).where(eq(categories.id, current.id)).returning({ id: categories.id })
        : await db.delete(subcategories).where(eq(subcategories.id, current.id)).returning({ id: subcategories.id });
    if (deleted.length === 0) throw new ToolError(`${a.type} not found: ${a.idOrSlug}`);
    revalidateTaxonomy();
    return {
      summary: `Deleted ${a.type} '${current.slug}'${n ? ` (${n} products still reference it)` : ""}.`,
      data: { type: a.type, id: current.id, slug: current.slug, orphanedProducts: n },
    };
  },
});

export const categoryTools = [categoriesList, categoriesCreate, categoriesUpdate, categoriesDelete];
