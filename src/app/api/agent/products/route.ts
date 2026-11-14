import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { products } from "@/db/schema";
import { eq, and, ilike, desc, type SQL } from "drizzle-orm";
import { authorizeAgentRequest, jsonError } from "../_lib/auth";
import {
  cleanSlug,
  formatZodIssues,
  productCreateSchema,
  productStatusSchema,
} from "../_lib/product-schema";

const listQuerySchema = z.object({
  category: z.string().trim().min(1).max(100).optional(),
  status: productStatusSchema.optional(),
  published: z.enum(["true", "false"]).optional(),
  tag: z.string().trim().min(1).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(500).catch(100),
  offset: z.coerce.number().int().min(0).max(1_000_000).catch(0),
});

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export async function GET(request: NextRequest) {
  if (!(await authorizeAgentRequest(request))) {
    return jsonError("Unauthorized", 401);
  }

  const sp = request.nextUrl.searchParams;
  const parsed = listQuerySchema.safeParse({
    category: sp.get("category") ?? undefined,
    status: sp.get("status") ?? undefined,
    published: sp.get("published") ?? undefined,
    tag: sp.get("tag") ?? undefined,
    limit: sp.get("limit") ?? undefined,
    offset: sp.get("offset") ?? undefined,
  });
  if (!parsed.success) {
    return jsonError("Invalid query parameters", 400, formatZodIssues(parsed.error));
  }
  const q = parsed.data;

  try {
    const conditions: SQL[] = [];
    if (q.category) conditions.push(eq(products.category, q.category));
    if (q.status) conditions.push(eq(products.status, q.status));
    if (q.published !== undefined) conditions.push(eq(products.published, q.published === "true"));
    if (q.tag) conditions.push(ilike(products.tags, `%${escapeLike(q.tag)}%`));

    const results = await db
      .select()
      .from(products)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(products.createdAt), desc(products.id))
      .limit(q.limit)
      .offset(q.offset);

    return NextResponse.json(
      { success: true, count: results.length, products: results },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Agent API GET products failed:", error);
    return jsonError("Server error", 500);
  }
}

export async function POST(request: NextRequest) {
  if (!(await authorizeAgentRequest(request))) {
    return jsonError("Unauthorized", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON", 400);
  }

  const parsed = productCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, formatZodIssues(parsed.error));
  }
  const input = parsed.data;

  try {
    const slug = cleanSlug(input.slug);
    if (!slug) {
      return jsonError("Slug must contain at least one alphanumeric character.", 400);
    }

    const existing = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1);

    if (existing.length > 0) {
      return jsonError(`Slug '${slug}' already exists.`, 409);
    }

    const id = crypto.randomUUID();

    await db.insert(products).values({
      id,
      title: input.title,
      slug,
      shortDescription: input.shortDescription,
      description: input.description,
      category: input.category,
      subcategory: input.subcategory ?? null,
      tags: input.tags ?? null,
      thumbnail: input.thumbnail ?? null,
      previewGif: input.previewGif ?? null,
      screenshots: input.screenshots ?? null,
      videoUrl: input.videoUrl ?? null,
      demoUrl: input.demoUrl ?? null,
      fileUrl: input.fileUrl ?? null,
      redirectDownload: input.redirectDownload ?? true,
      price: input.price,
      version: input.version || "1.0.0",
      featured: input.featured ?? false,
      published: input.published ?? true,
      creatorId: input.creatorId ?? null,
      status: input.status ?? "approved",
      // No reviews yet: don't fake social proof with the schema defaults ('5.0' / 1).
      rating: input.rating ?? "0",
      ratingCount: input.ratingCount ?? 0,
      isFree: input.isFree ?? false,
      discountPercent: input.discountPercent ?? 0,
      promoStart: input.promoStart ?? null,
      promoEnd: input.promoEnd ?? null,
    });

    return NextResponse.json(
      { success: true, id, slug },
      { status: 201, headers: { Location: `/api/agent/products/${id}` } }
    );
  } catch (error) {
    console.error("Agent API POST product failed:", error);
    return jsonError("Server error", 500);
  }
}

export const dynamic = "force-dynamic";
