import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { categories, subcategories } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { jsonError, jsonOk, readJson, requireAdmin, zodDetails } from "../_lib/guard";

const createSchema = z.object({
  type: z.enum(["category", "subcategory"]),
  name: z.string().trim().min(1).max(100),
  slug: z.string().trim().min(1).max(100),
  categoryId: z.string().trim().min(1).max(100).optional(),
});

function cleanSlug(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const [allCategories, allSubcategories] = await Promise.all([
      db.select().from(categories).orderBy(asc(categories.name)),
      db.select().from(subcategories).orderBy(asc(subcategories.name)),
    ]);

    // Group subcategories by parent in a single pass (O(n) instead of O(n*m)).
    const byCategory = new Map<string, typeof allSubcategories>();
    for (const sub of allSubcategories) {
      const list = byCategory.get(sub.categoryId);
      if (list) list.push(sub);
      else byCategory.set(sub.categoryId, [sub]);
    }

    const categoriesWithSub = allCategories.map((cat) => ({
      ...cat,
      subcategories: byCategory.get(cat.id) ?? [],
    }));

    return jsonOk({ categories: categoriesWithSub });
  } catch (error) {
    console.error("GET admin categories failed:", error);
    return jsonError("Server error fetching categories.", 500);
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await readJson(request);
  if (!body.ok) return jsonError("Request body must be valid JSON.", 400);

  const parsed = createSchema.safeParse(body.data);
  if (!parsed.success) {
    return jsonError("Missing or invalid fields.", 400, zodDetails(parsed.error));
  }
  const { type, name, categoryId } = parsed.data;
  const slug = cleanSlug(parsed.data.slug);
  if (!slug) return jsonError("Slug must contain at least one letter or number.", 400);

  try {
    if (type === "category") {
      const existing = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.slug, slug))
        .limit(1);
      if (existing.length > 0) {
        return jsonError("Category slug already exists.", 409);
      }

      await db.insert(categories).values({ id: slug, name, slug });
      return jsonOk({}, 201);
    }

    if (!categoryId) {
      return jsonError("Category ID is required for subcategory.", 400);
    }

    const [parent, existing] = await Promise.all([
      db.select({ id: categories.id }).from(categories).where(eq(categories.id, categoryId)).limit(1),
      db.select({ id: subcategories.id }).from(subcategories).where(eq(subcategories.slug, slug)).limit(1),
    ]);
    if (parent.length === 0) {
      return jsonError("Parent category not found.", 404);
    }
    if (existing.length > 0) {
      return jsonError("Subcategory slug already exists.", 409);
    }

    await db.insert(subcategories).values({ id: slug, name, slug, categoryId });
    return jsonOk({}, 201);
  } catch (error) {
    console.error("POST admin categories failed:", error);
    return jsonError("Server error creating category or subcategory.", 500);
  }
}

export const dynamic = "force-dynamic";
