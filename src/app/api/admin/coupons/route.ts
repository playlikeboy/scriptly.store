import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { coupons } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { jsonError, jsonOk, readJson, requireAdmin, zodDetails } from "../_lib/guard";

// discountValue: percent (1-100) for "percentage", paise for "fixed".
// minPurchaseAmount: paise.
const createSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,32}$/, "Code must be 3-32 letters, numbers, '-' or '_'."),
    discountType: z.enum(["percentage", "fixed"]),
    discountValue: z.coerce.number().int().positive(),
    minPurchaseAmount: z.coerce.number().int().min(0).max(100_000_000).optional().default(0),
  })
  .refine((v) => v.discountType !== "percentage" || v.discountValue <= 100, {
    message: "Percentage discount cannot exceed 100%.",
    path: ["discountValue"],
  })
  .refine((v) => v.discountType !== "fixed" || v.discountValue <= 100_000_000, {
    message: "Fixed discount is too large.",
    path: ["discountValue"],
  });

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const list = await db.select().from(coupons).orderBy(desc(coupons.createdAt));
    return jsonOk({ coupons: list });
  } catch (error) {
    console.error("GET admin coupons failed:", error);
    return jsonError("Server error fetching coupons.", 500);
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await readJson(request);
  if (!body.ok) return jsonError("Request body must be valid JSON.", 400);

  const parsed = createSchema.safeParse(body.data);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message;
    return jsonError(first || "Missing required fields.", 400, zodDetails(parsed.error));
  }
  const { code, discountType, discountValue, minPurchaseAmount } = parsed.data;

  try {
    const existing = await db
      .select({ id: coupons.id })
      .from(coupons)
      .where(eq(coupons.code, code))
      .limit(1);

    if (existing.length > 0) {
      return jsonError("A coupon with this code already exists.", 409);
    }

    await db.insert(coupons).values({
      id: crypto.randomUUID(),
      code,
      discountType,
      discountValue,
      minPurchaseAmount,
      active: true,
    });

    return jsonOk({}, 201);
  } catch (error) {
    console.error("POST admin coupons failed:", error);
    return jsonError("Server error creating coupon.", 500);
  }
}

export const dynamic = "force-dynamic";
