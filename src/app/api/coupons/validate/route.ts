import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { coupons, products } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { formatPrice, getProductEffectivePrice } from "@/lib/price-utils";

export const dynamic = "force-dynamic";

// Coupon state can change at any moment; never cache validation results.
const NO_STORE = { "Cache-Control": "no-store" };

const querySchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Coupon code is required.")
    .max(64, "Coupon code is too long.")
    .transform((c) => c.toUpperCase()),
  amount: z.coerce.number().int().min(0).max(1_000_000_000).catch(0),
  productIds: z
    .string()
    .optional()
    .transform((s) =>
      s
        ? [...new Set(s.split(",").map((id) => id.trim()).filter((id) => id.length > 0 && id.length <= 128))].slice(0, 50)
        : []
    ),
});

function reply(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

/**
 * Advisory coupon check for the cart UI. The authoritative discount is always
 * recomputed server-side in createRazorpayOrderAction.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const parsed = querySchema.safeParse({
    code: searchParams.get("code") ?? "",
    amount: searchParams.get("amount") ?? undefined,
    productIds: searchParams.get("productIds") ?? undefined,
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || "Invalid coupon request.";
    return reply({ success: false, message }, 400);
  }

  const { code, amount, productIds } = parsed.data;

  try {
    const [coupon] = await db
      .select({
        id: coupons.id,
        code: coupons.code,
        discountType: coupons.discountType,
        discountValue: coupons.discountValue,
        minPurchaseAmount: coupons.minPurchaseAmount,
        active: coupons.active,
        creatorId: coupons.creatorId,
      })
      .from(coupons)
      .where(eq(coupons.code, code))
      .limit(1);

    if (!coupon) {
      return reply({ success: false, message: "Coupon code does not exist." });
    }

    if (!coupon.active) {
      return reply({ success: false, message: "This coupon code is inactive." });
    }

    if (coupon.creatorId) {
      // Store-specific coupon
      if (productIds.length === 0) {
        return reply({
          success: false,
          message: "This is a store-specific coupon. Product selection is required to validate it.",
        });
      }

      // Only this creator's items in the cart, filtered in SQL
      const eligibleProducts = await db
        .select({
          price: products.price,
          isFree: products.isFree,
          discountPercent: products.discountPercent,
          promoStart: products.promoStart,
          promoEnd: products.promoEnd,
        })
        .from(products)
        .where(and(inArray(products.id, productIds), eq(products.creatorId, coupon.creatorId)));

      if (eligibleProducts.length === 0) {
        return reply({
          success: false,
          message:
            "This coupon is only valid for items from a specific creator's store, which are not present in your cart.",
        });
      }

      const eligibleSubtotal = eligibleProducts.reduce(
        (sum, p) => sum + getProductEffectivePrice(p).effectivePrice,
        0
      );

      if (eligibleSubtotal < coupon.minPurchaseAmount) {
        return reply({
          success: false,
          message: `This coupon requires a minimum purchase of ${formatPrice(coupon.minPurchaseAmount)} of items from this store.`,
        });
      }
    } else if (amount < coupon.minPurchaseAmount) {
      // Global coupon
      return reply({
        success: false,
        message: `This coupon requires a minimum purchase of ${formatPrice(coupon.minPurchaseAmount)}.`,
      });
    }

    return reply({
      success: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        creatorId: coupon.creatorId,
      },
    });
  } catch (error) {
    console.error("Coupon validation error:", error);
    return reply({ success: false, message: "Server error validating coupon." }, 500);
  }
}
