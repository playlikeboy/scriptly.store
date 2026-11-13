"use server";

import { z } from "zod";
import { getOrCreateDbUser } from "@/lib/auth-utils";
import { db } from "@/db";
import { products, orders, coupons, users, affiliateProfiles } from "@/db/schema";
import { and, eq, inArray, or } from "drizzle-orm";
import { getProductEffectivePrice } from "@/lib/price-utils";
import { cookies } from "next/headers";
import { CHECKOUT_CURRENCY, COMMISSION_RATES, PRICING_RULES } from "@/config/pricing";
import {
  getRazorpay,
  getRazorpayKeyId,
  isRazorpayMockMode,
  randomHex,
  verifyRazorpayPaymentSignature,
} from "@/lib/payments/razorpay-server";
import { completeRazorpayOrder, failRazorpayOrder } from "@/lib/payments/fulfillment";

const REFERRAL_COOKIE = "scriptly_referred_by";
const MAX_CART_ITEMS = 50;

const idSchema = z.string().trim().min(1).max(128);

const createOrderInputSchema = z.object({
  productId: idSchema.optional(),
  productIds: z.array(idSchema).max(MAX_CART_ITEMS).optional(),
  couponCode: z.string().trim().max(64).optional(),
  referredByCode: z.string().trim().max(128).optional(),
  addOnEditCopy: z.boolean().optional().default(false),
  addOnSetupDeploy: z.boolean().optional().default(false),
});

const verifyInputSchema = z.object({
  razorpayPaymentId: z.string().trim().min(1).max(128),
  razorpayOrderId: z.string().trim().min(1).max(128),
  razorpaySignature: z.string().trim().max(256).optional(),
});

/** Resolves an approved affiliate (by id or slug) in a single joined query. */
async function resolveApprovedAffiliate(code: string) {
  const [row] = await db
    .select({
      id: users.id,
      affiliateSlug: users.affiliateSlug,
      razorpayAccountId: users.razorpayAccountId,
    })
    .from(users)
    .innerJoin(affiliateProfiles, eq(affiliateProfiles.id, users.id))
    .where(
      and(
        or(eq(users.id, code), eq(users.affiliateSlug, code)),
        eq(affiliateProfiles.status, "approved")
      )
    )
    .limit(1);
  return row ?? null;
}

/**
 * Multiplier from catalog minor units to INR paise for the Razorpay charge.
 * See CHECKOUT_CURRENCY in src/config/pricing.ts.
 */
async function getCatalogToInrPaiseRate(): Promise<number> {
  if (CHECKOUT_CURRENCY.catalogCurrency === "INR") return 1;

  try {
    const res = await fetch(CHECKOUT_CURRENCY.exchangeRateUrl, {
      next: { revalidate: CHECKOUT_CURRENCY.exchangeRateRevalidateSeconds },
      signal: AbortSignal.timeout(CHECKOUT_CURRENCY.exchangeRateTimeoutMs),
    });
    if (res.ok) {
      const data = (await res.json()) as { rates?: Record<string, number> };
      const live = data.rates?.INR;
      if (typeof live === "number" && Number.isFinite(live) && live > 0) {
        return live;
      }
    }
  } catch (err) {
    console.error(
      `Failed to fetch live USD to INR exchange rate. Falling back to ${CHECKOUT_CURRENCY.fallbackUsdToInrRate}.`,
      err
    );
  }
  return CHECKOUT_CURRENCY.fallbackUsdToInrRate;
}

interface RazorpayTransfer {
  account: string;
  amount: number;
  currency: string;
  notes: Record<string, string>;
  linked_to: string[];
  on_hold: boolean;
}

export async function createRazorpayOrderAction(rawInput: {
  productId?: string;
  productIds?: string[];
  couponCode?: string;
  referredByCode?: string;
  addOnEditCopy?: boolean;
  addOnSetupDeploy?: boolean;
}) {
  const user = await getOrCreateDbUser();
  if (!user) {
    throw new Error("Unauthorized: Please sign in to purchase.");
  }

  const parsed = createOrderInputSchema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    throw new Error("Invalid checkout request.");
  }
  const { productId, productIds, couponCode, referredByCode, addOnEditCopy, addOnSetupDeploy } =
    parsed.data;

  // Support both single productId and array of productIds (deduplicated)
  const idsToFetch = [
    ...new Set(productIds && productIds.length > 0 ? productIds : productId ? [productId] : []),
  ];

  if (idsToFetch.length === 0) {
    throw new Error("No products selected for purchase.");
  }

  // Resolve referring affiliate (manual code or cookie) in parallel with the product fetch.
  const cookieStore = await cookies();
  const referredByVal = referredByCode || cookieStore.get(REFERRAL_COOKIE)?.value;

  const [rawProducts, referrer] = await Promise.all([
    db
      .select()
      .from(products)
      .where(and(inArray(products.id, idsToFetch), eq(products.published, true))),
    referredByVal && referredByVal !== user.id
      ? resolveApprovedAffiliate(referredByVal)
      : Promise.resolve(null),
  ]);

  // Self-referral (via own slug) earns nothing.
  const resolvedReferrer = referrer && referrer.id !== user.id ? referrer : null;
  const resolvedReferrerId = resolvedReferrer?.id ?? null;

  if (resolvedReferrer && referredByCode) {
    // Persist a manually entered code for 30 days
    cookieStore.set(REFERRAL_COOKIE, resolvedReferrer.affiliateSlug || resolvedReferrer.id, {
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  if (rawProducts.length === 0) {
    throw new Error("None of the selected products were found.");
  }

  // Server-side pricing: every amount below is recomputed from the database.
  const selectedProducts = rawProducts.map((p) => {
    const promo = getProductEffectivePrice(p);
    let addonPrice = 0;
    if (addOnEditCopy) addonPrice += Math.round(p.price / PRICING_RULES.addonCostDivisor);
    if (addOnSetupDeploy) addonPrice += Math.round(p.price / PRICING_RULES.addonCostDivisor);
    return {
      ...p,
      originalPrice: p.price,
      price: promo.effectivePrice, // promotion price (discounted or 0 if free)
      addonPrice,
    };
  });

  const totalAddonCost = selectedProducts.reduce((sum, p) => sum + p.addonPrice, 0);

  // Subtotal in catalog minor units (without addons)
  const subtotal = selectedProducts.reduce((sum, p) => sum + p.price, 0);

  // 1. Automatic bulk discount
  const autoDiscount =
    subtotal >= PRICING_RULES.bulkDiscountThresholdCents
      ? Math.round(subtotal * (PRICING_RULES.bulkDiscountPercent / 100))
      : 0;
  const amountAfterAuto = subtotal - autoDiscount;

  // 2. Coupon
  let couponDiscount = 0;
  let validatedCouponCode: string | null = null;

  if (couponCode) {
    const [coupon] = await db
      .select()
      .from(coupons)
      .where(eq(coupons.code, couponCode.toUpperCase()))
      .limit(1);

    if (coupon && coupon.active) {
      // Store coupons only discount that creator's items; global ones the whole cart.
      const base = coupon.creatorId
        ? selectedProducts
            .filter((p) => p.creatorId === coupon.creatorId)
            .reduce((sum, p) => sum + p.price, 0)
        : amountAfterAuto;

      if (base > 0 && amountAfterAuto >= coupon.minPurchaseAmount) {
        validatedCouponCode = coupon.code;
        if (coupon.discountType === "percentage") {
          const pct = Math.min(Math.max(coupon.discountValue, 0), 100);
          couponDiscount = Math.round(base * (pct / 100));
        } else if (coupon.discountType === "fixed") {
          couponDiscount = Math.min(Math.max(coupon.discountValue, 0), base);
        }
      }
    }
  }

  // 3. Referral buyer discount
  const referralDiscount = resolvedReferrerId
    ? Math.round(
        Math.max(subtotal - autoDiscount - couponDiscount, 0) *
          (PRICING_RULES.referralBuyerDiscountPercent / 100)
      )
    : 0;

  const totalDiscount = autoDiscount + couponDiscount + referralDiscount;
  const finalAmount = Math.max(subtotal - totalDiscount, 0) + totalAddonCost;
  const productName =
    selectedProducts.length === 1
      ? selectedProducts[0].title
      : `${selectedProducts.length} items in Cart`;

  // Free checkout: complete instantly, no gateway involved.
  if (finalAmount === 0) {
    const freeOrderId = "free_checkout_" + randomHex(8);
    const perItemDiscount = Math.round(totalDiscount / selectedProducts.length);
    const rows = selectedProducts.map((product) => ({
      id: crypto.randomUUID(),
      userId: user.id,
      productId: product.id,
      razorpayOrderId: freeOrderId,
      razorpayPaymentId: "free_pay_" + randomHex(8),
      amount: 0,
      status: "completed",
      couponCode: validatedCouponCode,
      discountApplied: product.originalPrice - product.price + perItemDiscount,
      addOnEditCopy,
      addOnSetupDeploy,
      referredById: resolvedReferrerId,
    }));

    await db.insert(orders).values(rows);

    return {
      success: true,
      isFreeCheckout: true,
      razorpayOrderId: freeOrderId,
      redirectUrl: `/purchase-success?orderId=${rows[0].id}`,
      amount: 0,
      key: "",
      productName,
      userEmail: user.email,
      userName: user.name || "",
      isMock: true,
    };
  }

  const razorpayAmount = Math.max(finalAmount, PRICING_RULES.minChargeableCents);
  const rate = await getCatalogToInrPaiseRate();
  const finalAmountInInrPaise = Math.round(razorpayAmount * rate);

  // Proportional per-item allocation (catalog units); the last item absorbs rounding.
  const netWithoutAddons = razorpayAmount - totalAddonCost;
  let distributedAmount = 0;
  let distributedDiscount = 0;
  const allocations = selectedProducts.map((product, i) => {
    const isLast = i === selectedProducts.length - 1;
    let itemAmount: number;
    let itemDiscount: number;
    if (isLast) {
      itemAmount = netWithoutAddons - distributedAmount;
      itemDiscount = totalDiscount - distributedDiscount;
    } else {
      const ratio = subtotal > 0 ? product.price / subtotal : 1 / selectedProducts.length;
      itemAmount = Math.round(netWithoutAddons * ratio);
      itemDiscount = Math.round(totalDiscount * ratio);
      distributedAmount += itemAmount;
      distributedDiscount += itemDiscount;
    }
    return { product, itemAmount: itemAmount + product.addonPrice, itemDiscount };
  });

  // Razorpay Route transfers (INR paise)
  const creatorIds = [
    ...new Set(selectedProducts.map((p) => p.creatorId).filter((id): id is string => !!id)),
  ];
  const productCreators = creatorIds.length
    ? await db
        .select({ id: users.id, razorpayAccountId: users.razorpayAccountId })
        .from(users)
        .where(inArray(users.id, creatorIds))
    : [];
  const creatorById = new Map(productCreators.map((c) => [c.id, c]));

  const transfers: RazorpayTransfer[] = [];
  for (const { product, itemAmount } of allocations) {
    const itemAmountInInrPaise = Math.round(itemAmount * rate);
    let creatorSplit = Math.round(itemAmountInInrPaise * COMMISSION_RATES.directCreatorShare);
    let affiliateSplit = 0;
    const commissionPercent =
      product.affiliateCommissionPercent ?? PRICING_RULES.defaultAffiliateCommissionPercent;

    if (resolvedReferrer) {
      affiliateSplit = Math.round(itemAmountInInrPaise * (commissionPercent / 100));
      const creatorShare = Math.max(COMMISSION_RATES.directCreatorShare - commissionPercent / 100, 0);
      creatorSplit = Math.round(itemAmountInInrPaise * creatorShare);
    }

    const creator = product.creatorId ? creatorById.get(product.creatorId) : undefined;
    if (creator?.razorpayAccountId && creatorSplit > 0) {
      transfers.push({
        account: creator.razorpayAccountId,
        amount: creatorSplit,
        currency: CHECKOUT_CURRENCY.chargeCurrency,
        notes: { info: `Split transfer for product: ${product.title.slice(0, 30)}` },
        linked_to: ["payment"],
        on_hold: false,
      });
    }

    if (resolvedReferrer?.razorpayAccountId && affiliateSplit > 0) {
      transfers.push({
        account: resolvedReferrer.razorpayAccountId,
        amount: affiliateSplit,
        currency: CHECKOUT_CURRENCY.chargeCurrency,
        notes: { info: `Affiliate transfer for product: ${product.title.slice(0, 30)}` },
        linked_to: ["payment"],
        on_hold: false,
      });
    }
  }

  // Create the Razorpay order
  const isMockKeys = isRazorpayMockMode();
  let rzpOrderId = "rzp_order_mock_" + randomHex(8);

  if (!isMockKeys) {
    try {
      const payload = {
        amount: finalAmountInInrPaise,
        currency: CHECKOUT_CURRENCY.chargeCurrency,
        receipt: crypto.randomUUID().replace(/-/g, "").slice(0, 32),
        notes: { type: "store_checkout", userId: user.id },
        ...(transfers.length > 0 ? { transfers } : {}),
      } as unknown as Parameters<ReturnType<typeof getRazorpay>["orders"]["create"]>[0];

      const rzpOrder = await getRazorpay().orders.create(payload);
      rzpOrderId = rzpOrder.id;
    } catch (error) {
      // A mock order id can never be paid with live keys, so fail loudly instead.
      console.error("Razorpay order creation failed:", error);
      throw new Error("Payment gateway is temporarily unavailable. Please try again in a moment.");
    }
  }

  await db.insert(orders).values(
    allocations.map(({ product, itemAmount, itemDiscount }) => ({
      id: crypto.randomUUID(),
      userId: user.id,
      productId: product.id,
      razorpayOrderId: rzpOrderId,
      amount: itemAmount,
      status: "pending",
      couponCode: validatedCouponCode,
      discountApplied: itemDiscount + (product.originalPrice - product.price),
      addOnEditCopy,
      addOnSetupDeploy,
      referredById: resolvedReferrerId,
    }))
  );

  return {
    success: true,
    razorpayOrderId: rzpOrderId,
    amount: finalAmountInInrPaise, // INR paise
    key: getRazorpayKeyId(),
    productName,
    userEmail: user.email,
    userName: user.name || "",
    isMock: isMockKeys,
  };
}

export async function verifyPaymentAction(rawInput: {
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature?: string;
}) {
  const user = await getOrCreateDbUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const parsed = verifyInputSchema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    throw new Error("Invalid payment verification request.");
  }
  const { razorpayPaymentId, razorpayOrderId, razorpaySignature } = parsed.data;

  let isValid: boolean;
  if (isRazorpayMockMode()) {
    isValid = true;
  } else {
    if (!razorpaySignature) {
      throw new Error("Missing razorpay payment signature");
    }
    isValid = await verifyRazorpayPaymentSignature({
      razorpayOrderId,
      razorpayPaymentId,
      signature: razorpaySignature,
    });
  }

  if (isValid) {
    // Scoped to the signed-in buyer; idempotent with the webhook.
    const result = await completeRazorpayOrder({
      razorpayOrderId,
      razorpayPaymentId,
      userId: user.id,
    });
    if (!result.found || !result.firstOrderId) {
      throw new Error("Order not found");
    }
    return { success: true, orderId: result.firstOrderId };
  }

  // Invalid signature: only this user's still-pending rows may be marked failed.
  const [owned] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.razorpayOrderId, razorpayOrderId), eq(orders.userId, user.id)))
    .limit(1);
  if (!owned) {
    throw new Error("Order not found");
  }
  await failRazorpayOrder({ razorpayOrderId, razorpayPaymentId, userId: user.id });

  return { success: false };
}
