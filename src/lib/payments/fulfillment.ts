import { db } from "@/db";
import {
  orders,
  products,
  users,
  payouts,
  affiliateCommissions,
  paymentLinks,
  paymentLinkActivities,
} from "@/db/schema";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { COMMISSION_RATES, PRICING_RULES } from "@/config/pricing";

/**
 * Idempotent order fulfillment shared by the client verification action and the
 * Razorpay webhook. Whichever arrives first transitions the rows; the other is a
 * no-op, so commissions and payout ledger rows are written exactly once.
 */

type OrderRow = typeof orders.$inferSelect;

export interface CompleteOrderResult {
  /** At least one order row exists for this Razorpay order (and user, if scoped). */
  found: boolean;
  /** First order id, used for the purchase-success redirect. */
  firstOrderId: string | null;
  /** Number of rows that moved to `completed` in this call. */
  newlyCompleted: number;
}

/**
 * Marks every non-completed order row for `razorpayOrderId` as completed, then
 * logs affiliate commissions and Route split payouts for exactly those rows.
 */
export async function completeRazorpayOrder({
  razorpayOrderId,
  razorpayPaymentId,
  userId,
}: {
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  userId?: string;
}): Promise<CompleteOrderResult> {
  const scope = userId
    ? and(eq(orders.razorpayOrderId, razorpayOrderId), eq(orders.userId, userId))
    : eq(orders.razorpayOrderId, razorpayOrderId);

  // Atomic state transition: only rows not yet completed are touched, so a
  // concurrent webhook + client verify cannot double-log splits.
  const transitioned = await db
    .update(orders)
    .set({
      status: "completed",
      ...(razorpayPaymentId ? { razorpayPaymentId } : {}),
    })
    .where(and(scope, ne(orders.status, "completed")))
    .returning();

  if (transitioned.length === 0) {
    const [existing] = await db
      .select({ id: orders.id })
      .from(orders)
      .where(scope)
      .orderBy(orders.createdAt)
      .limit(1);
    return { found: !!existing, firstOrderId: existing?.id ?? null, newlyCompleted: 0 };
  }

  try {
    await logSplitsForCompletedOrders(transitioned);
  } catch (err) {
    // The sale itself is recorded; a split-logging failure must not revoke access.
    console.error("Failed to log commission/payout splits for", razorpayOrderId, err);
  }

  const first = [...transitioned].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )[0];

  return { found: true, firstOrderId: first.id, newlyCompleted: transitioned.length };
}

/** Moves still-pending rows to `failed`. Never downgrades a completed order. */
export async function failRazorpayOrder({
  razorpayOrderId,
  razorpayPaymentId,
  userId,
}: {
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  userId?: string;
}): Promise<void> {
  const scope = userId
    ? and(eq(orders.razorpayOrderId, razorpayOrderId), eq(orders.userId, userId))
    : eq(orders.razorpayOrderId, razorpayOrderId);

  await db
    .update(orders)
    .set({
      status: "failed",
      ...(razorpayPaymentId ? { razorpayPaymentId } : {}),
    })
    .where(and(scope, eq(orders.status, "pending")));
}

async function logSplitsForCompletedOrders(completed: OrderRow[]): Promise<void> {
  const productIds = [...new Set(completed.map((o) => o.productId))];
  const productRows = await db
    .select({
      id: products.id,
      creatorId: products.creatorId,
      affiliateCommissionPercent: products.affiliateCommissionPercent,
    })
    .from(products)
    .where(inArray(products.id, productIds));
  const productById = new Map(productRows.map((p) => [p.id, p]));

  const userIds = new Set<string>();
  for (const o of completed) if (o.referredById) userIds.add(o.referredById);
  for (const p of productRows) if (p.creatorId) userIds.add(p.creatorId);

  const userRows = userIds.size
    ? await db
        .select({
          id: users.id,
          razorpayAccountId: users.razorpayAccountId,
          paypalEmail: users.paypalEmail,
        })
        .from(users)
        .where(inArray(users.id, [...userIds]))
    : [];
  const userById = new Map(userRows.map((u) => [u.id, u]));

  const now = new Date();
  const commissionRows: (typeof affiliateCommissions.$inferInsert)[] = [];
  const payoutRows: (typeof payouts.$inferInsert)[] = [];

  for (const order of completed) {
    const product = productById.get(order.productId);
    if (!product) continue;

    const affiliate = order.referredById ? userById.get(order.referredById) : undefined;
    let commissionPercent = 0;
    let commissionAmount = 0;

    if (affiliate) {
      commissionPercent =
        product.affiliateCommissionPercent ?? PRICING_RULES.defaultAffiliateCommissionPercent;
      commissionAmount = Math.round(order.amount * (commissionPercent / 100));
    }

    // 1. Affiliate commission ledger
    if (affiliate && commissionAmount > 0) {
      const isAffiliateRouteActive = !!affiliate.razorpayAccountId?.startsWith("acc_");
      commissionRows.push({
        id: crypto.randomUUID(),
        affiliateId: affiliate.id,
        orderId: order.id,
        productId: product.id,
        amount: commissionAmount,
        percent: commissionPercent,
        status: isAffiliateRouteActive ? "paid" : "pending",
        createdAt: now,
        updatedAt: now,
      });

      // Paid out automatically via Razorpay Route: log the settlement.
      if (isAffiliateRouteActive) {
        payoutRows.push({
          id: crypto.randomUUID(),
          userId: affiliate.id,
          amount: commissionAmount,
          status: "processed",
          payoutMethod: "bank",
          payoutDetails: `Automated Razorpay Route Split Affiliate commission for Order: ${order.id}`,
          createdAt: now,
        });
      }
    }

    // 2. Creator Route split payout
    const creator = product.creatorId ? userById.get(product.creatorId) : undefined;
    if (creator?.razorpayAccountId && order.amount > 0) {
      const creatorShare = affiliate
        ? Math.max(COMMISSION_RATES.directCreatorShare - commissionPercent / 100, 0)
        : COMMISSION_RATES.directCreatorShare;
      const creatorSplit = Math.round(order.amount * creatorShare);

      if (creatorSplit > 0) {
        payoutRows.push({
          id: crypto.randomUUID(),
          userId: creator.id,
          amount: creatorSplit,
          status: "processed",
          payoutMethod: "bank",
          paypalEmail: creator.paypalEmail || null,
          payoutDetails: `Automated Razorpay Route Split payout for Order ID: ${order.id}`,
          createdAt: now,
        });
      }
    }
  }

  await Promise.all([
    commissionRows.length ? db.insert(affiliateCommissions).values(commissionRows) : null,
    payoutRows.length ? db.insert(payouts).values(payoutRows) : null,
  ]);
}

/**
 * Records a successful payment-link payment once per Razorpay payment id and
 * bumps the stored link's conversion metrics. Returns false when it was
 * already recorded (client verify + webhook both deliver the same payment).
 */
export async function recordPaymentLinkSuccess({
  linkId,
  orderId,
  paymentId,
  amount,
  payerEmail,
  payerName,
  payerPhone,
  metadata,
}: {
  linkId: string | null;
  orderId: string;
  paymentId: string;
  amount: number;
  payerEmail?: string | null;
  payerName?: string | null;
  payerPhone?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<boolean> {
  const [already] = await db
    .select({ id: paymentLinkActivities.id })
    .from(paymentLinkActivities)
    .where(
      and(
        eq(paymentLinkActivities.paymentId, paymentId),
        eq(paymentLinkActivities.type, "payment_success")
      )
    )
    .limit(1);

  if (already) return false;

  await Promise.all([
    db.insert(paymentLinkActivities).values({
      id: `act_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
      linkId,
      type: "payment_success",
      orderId,
      paymentId,
      amount,
      payerEmail: payerEmail || null,
      payerName: payerName || null,
      payerPhone: payerPhone || null,
      metadata: metadata ? JSON.stringify(metadata) : null,
    }),
    linkId
      ? db
          .update(paymentLinks)
          .set({
            conversions: sql`${paymentLinks.conversions} + 1`,
            totalEarned: sql`${paymentLinks.totalEarned} + ${amount}`,
            updatedAt: new Date(),
          })
          .where(eq(paymentLinks.id, linkId))
      : null,
  ]);

  return true;
}
