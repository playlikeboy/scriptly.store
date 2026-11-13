import { NextResponse } from "next/server";
import { z } from "zod";
import {
  isRazorpayMockMode,
  verifyRazorpayWebhookSignature,
} from "@/lib/payments/razorpay-server";
import { completeRazorpayOrder, recordPaymentLinkSuccess } from "@/lib/payments/fulfillment";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ success: false, error: { code, message } }, { status, headers: NO_STORE });
}

const notesSchema = z.record(z.string(), z.unknown()).or(z.array(z.unknown())).optional().nullable();

const webhookSchema = z.object({
  event: z.string(),
  payload: z
    .object({
      payment: z
        .object({
          entity: z
            .object({
              id: z.string().optional(),
              order_id: z.string().optional().nullable(),
              amount: z.number().optional(),
              email: z.string().optional().nullable(),
              contact: z.union([z.string(), z.number()]).optional().nullable(),
            })
            .passthrough(),
        })
        .optional(),
      order: z
        .object({
          entity: z
            .object({
              id: z.string().optional(),
              amount_paid: z.number().optional(),
              notes: notesSchema,
            })
            .passthrough(),
        })
        .optional(),
    })
    .passthrough(),
});

function noteString(notes: unknown, key: string): string | undefined {
  if (!notes || typeof notes !== "object" || Array.isArray(notes)) return undefined;
  const value = (notes as Record<string, unknown>)[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * Razorpay webhook: authoritative, idempotent fulfillment for store orders and
 * payment links. Safe to receive alongside the client-side verify call.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature");
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  // Signature is mandatory unless the whole deployment runs on mock test keys
  // with no webhook secret configured (local development only).
  if (webhookSecret) {
    if (!signature) {
      return errorResponse(400, "missing_signature", "Missing x-razorpay-signature header");
    }
    const valid = await verifyRazorpayWebhookSignature(rawBody, signature, webhookSecret);
    if (!valid) {
      return errorResponse(401, "invalid_signature", "Invalid webhook signature");
    }
  } else if (!isRazorpayMockMode()) {
    console.error("RAZORPAY_WEBHOOK_SECRET is not configured; rejecting webhook.");
    return errorResponse(503, "webhook_not_configured", "Webhook secret not configured");
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return errorResponse(400, "invalid_json", "Malformed JSON body");
  }

  const parsed = webhookSchema.safeParse(json);
  if (!parsed.success) {
    return errorResponse(400, "invalid_payload", "Unexpected webhook payload");
  }

  const { event, payload } = parsed.data;

  try {
    if (event === "order.paid" || event === "payment.captured") {
      const payment = payload.payment?.entity;
      const order = payload.order?.entity;
      const razorpayOrderId = payment?.order_id || order?.id;
      const razorpayPaymentId = payment?.id ?? null;

      if (razorpayOrderId) {
        const result = await completeRazorpayOrder({ razorpayOrderId, razorpayPaymentId });

        // Not a store order: it may be a payment-link checkout (order notes carry the link).
        if (!result.found && razorpayPaymentId && noteString(order?.notes, "type") === "payment_link") {
          const linkIdNote = noteString(order?.notes, "linkId");
          await recordPaymentLinkSuccess({
            linkId: linkIdNote && linkIdNote !== "dynamic" ? linkIdNote : null,
            orderId: razorpayOrderId,
            paymentId: razorpayPaymentId,
            amount: payment?.amount ?? order?.amount_paid ?? 0,
            payerEmail: noteString(order?.notes, "payerEmail") ?? payment?.email ?? null,
            payerName: noteString(order?.notes, "payerName") ?? null,
            payerPhone: payment?.contact != null ? String(payment.contact) : null,
            metadata: { title: noteString(order?.notes, "title") ?? null, source: "webhook" },
          });
        }
      }
    }

    return NextResponse.json({ received: true }, { headers: NO_STORE });
  } catch (error) {
    console.error("Razorpay webhook processing error:", error);
    // Non-2xx makes Razorpay retry; fulfillment is idempotent so retries are safe.
    return errorResponse(500, "processing_failed", "Webhook processing failed");
  }
}
