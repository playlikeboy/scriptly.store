import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products } from "@/db/schema";
import { and, eq, inArray, ne, or } from "drizzle-orm";
import { authorizeAgentRequest, jsonError } from "../../_lib/auth";
import { cleanSlug, formatZodIssues, productPatchSchema } from "../../_lib/product-schema";

type RouteContext = { params: Promise<{ id: string }> };

function byIdOrSlug(idOrSlug: string) {
  return or(eq(products.id, idOrSlug), eq(products.slug, idOrSlug));
}

function isValidIdParam(id: string) {
  return id.length > 0 && id.length <= 200;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  if (!(await authorizeAgentRequest(request))) {
    return jsonError("Unauthorized", 401);
  }

  const { id } = await params;
  if (!isValidIdParam(id)) return jsonError("Invalid product id", 400);

  try {
    const result = await db.select().from(products).where(byIdOrSlug(id)).limit(1);

    if (result.length === 0) {
      return jsonError("Product not found", 404);
    }

    return NextResponse.json(
      { success: true, product: result[0] },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Agent API GET single product failed:", error);
    return jsonError("Server error", 500);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  if (!(await authorizeAgentRequest(request))) {
    return jsonError("Unauthorized", 401);
  }

  const { id } = await params;
  if (!isValidIdParam(id)) return jsonError("Invalid product id", 400);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON", 400);
  }

  const parsed = productPatchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, formatZodIssues(parsed.error));
  }
  const input = parsed.data;

  try {
    const result = await db
      .select({ id: products.id, slug: products.slug })
      .from(products)
      .where(byIdOrSlug(id))
      .limit(1);

    if (result.length === 0) {
      return jsonError("Product not found", 404);
    }

    const product = result[0];
    const { slug: rawSlug, ...rest } = input;
    const updateData: Partial<typeof products.$inferInsert> = {};

    // Copy only the keys the caller actually sent.
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined) {
        (updateData as Record<string, unknown>)[key] = value;
      }
    }

    if (rawSlug !== undefined) {
      const slug = cleanSlug(rawSlug);
      if (!slug) {
        return jsonError("Slug must contain at least one alphanumeric character.", 400);
      }
      if (slug !== product.slug) {
        const conflict = await db
          .select({ id: products.id })
          .from(products)
          .where(and(eq(products.slug, slug), ne(products.id, product.id)))
          .limit(1);
        if (conflict.length > 0) {
          return jsonError(`Slug '${slug}' is already taken.`, 409);
        }
      }
      updateData.slug = slug;
    }

    updateData.updatedAt = new Date();

    await db.update(products).set(updateData).where(eq(products.id, product.id));

    return NextResponse.json({ success: true, message: "Product updated successfully" });
  } catch (error) {
    console.error("Agent API PATCH product failed:", error);
    return jsonError("Server error", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  if (!(await authorizeAgentRequest(request))) {
    return jsonError("Unauthorized", 401);
  }

  const { id } = await params;
  if (!isValidIdParam(id)) return jsonError("Invalid product id", 400);

  try {
    const deleted = await db
      .delete(products)
      .where(
        inArray(
          products.id,
          db.select({ id: products.id }).from(products).where(byIdOrSlug(id)).limit(1)
        )
      )
      .returning({ id: products.id });

    if (deleted.length === 0) {
      return jsonError("Product not found", 404);
    }

    return NextResponse.json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    console.error("Agent API DELETE product failed:", error);
    return jsonError("Server error", 500);
  }
}

export const dynamic = "force-dynamic";
