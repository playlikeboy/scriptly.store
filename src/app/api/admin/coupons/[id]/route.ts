import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { coupons } from "@/db/schema";
import { eq } from "drizzle-orm";
import { jsonError, jsonOk, readJson, requireAdmin } from "../../_lib/guard";

type RouteContext = { params: Promise<{ id: string }> };

const patchSchema = z.object({ active: z.boolean() });

function isValidId(id: string) {
  return id.length > 0 && id.length <= 100;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!isValidId(id)) return jsonError("Invalid coupon id.", 400);

  const body = await readJson(request);
  if (!body.ok) return jsonError("Request body must be valid JSON.", 400);

  const parsed = patchSchema.safeParse(body.data);
  if (!parsed.success) {
    return jsonError("Active status is required.", 400);
  }

  try {
    const updated = await db
      .update(coupons)
      .set({ active: parsed.data.active, updatedAt: new Date() })
      .where(eq(coupons.id, id))
      .returning({ id: coupons.id });

    if (updated.length === 0) return jsonError("Coupon not found.", 404);
    return jsonOk({});
  } catch (error) {
    console.error("PATCH admin coupon failed:", error);
    return jsonError("Server error updating coupon.", 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!isValidId(id)) return jsonError("Invalid coupon id.", 400);

  try {
    const deleted = await db
      .delete(coupons)
      .where(eq(coupons.id, id))
      .returning({ id: coupons.id });

    if (deleted.length === 0) return jsonError("Coupon not found.", 404);
    return jsonOk({});
  } catch (error) {
    console.error("DELETE admin coupon failed:", error);
    return jsonError("Server error deleting coupon.", 500);
  }
}

export const dynamic = "force-dynamic";
