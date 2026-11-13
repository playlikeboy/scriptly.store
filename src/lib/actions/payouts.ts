"use server";

import { db } from "@/db";
import { payouts, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isAdmin } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";

export async function recordPayoutAction({
  userId,
  amountCents,
  payoutMethod,
  paypalEmail,
  payoutDetails,
}: {
  userId: string;
  amountCents: number;
  payoutMethod?: string;
  paypalEmail?: string;
  payoutDetails?: string;
}) {
  const authorized = await isAdmin();
  if (!authorized) {
    throw new Error("Unauthorized: Admin access required.");
  }

  // Amounts are integer minor units (see src/config/pricing.ts); int4 column.
  if (
    typeof amountCents !== "number" ||
    !Number.isInteger(amountCents) ||
    amountCents <= 0 ||
    amountCents > 2_147_483_647
  ) {
    throw new Error("Payout amount must be greater than zero.");
  }
  if (typeof userId !== "string" || !userId) {
    throw new Error("Creator not found.");
  }

  // Verify creator exists
  const [creator] = await db
    .select({
      id: users.id,
      payoutMethod: users.payoutMethod,
      paypalEmail: users.paypalEmail,
      payoutDetails: users.payoutDetails,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!creator) {
    throw new Error("Creator not found.");
  }

  const id = crypto.randomUUID();

  await db.insert(payouts).values({
    id,
    userId,
    amount: amountCents,
    status: "processed",
    payoutMethod: (payoutMethod || creator.payoutMethod || "").slice(0, 64) || null,
    paypalEmail: (paypalEmail || creator.paypalEmail || "").slice(0, 254) || null,
    payoutDetails: (payoutDetails || creator.payoutDetails || "").slice(0, 2000) || null,
    createdAt: new Date(),
  });

  revalidatePath("/admin/payouts");
  return { success: true };
}
