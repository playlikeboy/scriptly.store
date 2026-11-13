"use server";

import { db } from "@/db";
import { users, coupons } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getOrCreateDbUser } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";

const COUPON_TYPES = new Set(["percentage", "fixed"]);
const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_NUMBER_PATTERN = /^[0-9]{9,18}$/;

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function updateCreatorStoreNameAction(storeName: string) {
  const user = await getOrCreateDbUser();
  if (!user) {
    throw new Error("Unauthorized: Sign in required.");
  }

  const trimmed = asString(storeName).trim();
  if (trimmed.length > 50) {
    throw new Error("Store name must be less than 50 characters.");
  }

  await db
    .update(users)
    .set({
      storeName: trimmed || null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  revalidatePath("/creator");
  return { success: true };
}

export async function createCreatorCouponAction(formData: FormData) {
  const user = await getOrCreateDbUser();
  if (!user) {
    throw new Error("Unauthorized: Sign in required.");
  }

  const code = asString(formData.get("code")).trim().toUpperCase();
  const discountType = asString(formData.get("discountType")) || "percentage";
  const discountValueStr = asString(formData.get("discountValue"));
  const minPurchaseAmountStr = asString(formData.get("minPurchaseAmount"));

  if (!code || !/^[A-Z0-9]{3,15}$/.test(code)) {
    throw new Error("Coupon code must be alphanumeric and between 3 to 15 characters.");
  }

  if (!COUPON_TYPES.has(discountType)) {
    throw new Error("Invalid discount type.");
  }

  const discountInput = Number.parseFloat(discountValueStr);
  if (!Number.isFinite(discountInput) || discountInput <= 0) {
    throw new Error("Discount value must be a positive number.");
  }

  // Percentage coupons store a whole percent; fixed coupons are entered in
  // dollars and stored in cents like every other monetary value.
  let discountValue: number;
  if (discountType === "percentage") {
    discountValue = Math.round(discountInput);
    if (discountValue < 1 || discountValue > 100) {
      throw new Error("Percentage discount cannot exceed 100%.");
    }
  } else {
    discountValue = Math.round(discountInput * 100);
    if (discountValue > 100_000_000) {
      throw new Error("Fixed discount is too large.");
    }
  }

  const minPurchaseValue = Number.parseFloat(minPurchaseAmountStr || "0");
  const minPurchaseAmount =
    Number.isFinite(minPurchaseValue) && minPurchaseValue > 0 ? Math.round(minPurchaseValue * 100) : 0;

  const existing = await db
    .select({ id: coupons.id })
    .from(coupons)
    .where(eq(coupons.code, code))
    .limit(1);

  if (existing.length > 0) {
    throw new Error("Coupon code already exists. Please choose a different code.");
  }

  await db.insert(coupons).values({
    id: crypto.randomUUID(),
    code,
    discountType,
    discountValue,
    minPurchaseAmount,
    active: true,
    creatorId: user.id, // Linked specifically to this creator's items!
  });

  revalidatePath("/creator");
  return { success: true };
}

export async function deleteCreatorCouponAction(couponId: string) {
  const user = await getOrCreateDbUser();
  if (!user) {
    throw new Error("Unauthorized: Sign in required.");
  }

  if (typeof couponId !== "string" || !couponId) {
    throw new Error("Coupon not found or unauthorized.");
  }

  // Ownership is enforced in the DELETE itself (single round trip, no TOCTOU).
  const deleted = await db
    .delete(coupons)
    .where(and(eq(coupons.id, couponId), eq(coupons.creatorId, user.id)))
    .returning({ id: coupons.id });

  if (deleted.length === 0) {
    throw new Error("Coupon not found or unauthorized.");
  }

  revalidatePath("/creator");
  return { success: true };
}

export async function updateCreatorPayoutSettingsAction(
  payoutMethod: string,
  paypalEmail: string,
  payoutDetails: string,
  bankName?: string,
  bankAccountName?: string,
  bankAccountNumber?: string,
  bankIfsc?: string
) {
  const user = await getOrCreateDbUser();
  if (!user) {
    throw new Error("Unauthorized: Sign in required.");
  }

  if (payoutMethod !== "bank") {
    throw new Error("Only Direct Bank Transfer (via Razorpay Route) split is supported.");
  }

  const bankNameTrimmed = asString(bankName).trim();
  const bankAccountNameTrimmed = asString(bankAccountName).trim();
  const bankAccountNumberTrimmed = asString(bankAccountNumber).replace(/\s+/g, "");
  const bankIfscTrimmed = asString(bankIfsc).trim().toUpperCase();

  if (!bankNameTrimmed || !bankAccountNameTrimmed || !bankAccountNumberTrimmed || !bankIfscTrimmed) {
    throw new Error("All bank account details are required for automated split routing.");
  }

  if (bankNameTrimmed.length > 100 || bankAccountNameTrimmed.length > 100) {
    throw new Error("Bank name and account holder name must be under 100 characters.");
  }

  if (!ACCOUNT_NUMBER_PATTERN.test(bankAccountNumberTrimmed)) {
    throw new Error("Bank account number must be 9 to 18 digits.");
  }

  if (!IFSC_PATTERN.test(bankIfscTrimmed)) {
    throw new Error("Invalid IFSC code. It should look like ABCD0123456.");
  }

  await db
    .update(users)
    .set({
      payoutMethod: "bank",
      paypalEmail: null,
      payoutDetails: null,
      bankName: bankNameTrimmed,
      bankAccountName: bankAccountNameTrimmed,
      bankAccountNumber: bankAccountNumberTrimmed,
      bankIfsc: bankIfscTrimmed,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  revalidatePath("/creator");
  return { success: true };
}
