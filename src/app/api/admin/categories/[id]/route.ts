import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { categories, subcategories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { jsonError, jsonOk, requireAdmin } from "../../_lib/guard";

const typeSchema = z.enum(["category", "subcategory"]);

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const rawType = request.nextUrl.searchParams.get("type");
  if (!rawType) {
    return jsonError("Type query parameter is required.", 400);
  }
  const type = typeSchema.safeParse(rawType);
  if (!type.success) {
    return jsonError("Invalid type parameter.", 400);
  }

  const { id } = await params;
  if (!id || id.length > 100) {
    return jsonError("Invalid id.", 400);
  }

  try {
    const deleted =
      type.data === "category"
        ? await db.delete(categories).where(eq(categories.id, id)).returning({ id: categories.id })
        : await db.delete(subcategories).where(eq(subcategories.id, id)).returning({ id: subcategories.id });

    if (deleted.length === 0) {
      return jsonError(`${type.data === "category" ? "Category" : "Subcategory"} not found.`, 404);
    }
    return jsonOk({});
  } catch (error) {
    console.error("DELETE admin category failed:", error);
    return jsonError("Server error deleting category or subcategory.", 500);
  }
}

export const dynamic = "force-dynamic";
