import Razorpay from "razorpay";

/**
 * Server-only Razorpay helpers shared by checkout, payment links and webhooks.
 *
 * Signature checks use the Web Crypto API (HMAC-SHA256) so they run unchanged
 * on Cloudflare Workers (workerd) and Node.js, and compare digests in constant
 * time to avoid timing oracles.
 */

const encoder = new TextEncoder();

const MOCK_KEY_ID = "rzp_test_mockkeyid123";
const MOCK_KEY_SECRET = "rzp_test_mocksecret123";

/** True only when the deployment is explicitly configured with mock test keys. */
export function isRazorpayMockMode(): boolean {
  return (process.env.RAZORPAY_KEY_ID || "").startsWith("rzp_test_mock");
}

/** Public key id handed to Razorpay Checkout on the client. */
export function getRazorpayKeyId(): string {
  return process.env.RAZORPAY_KEY_ID || MOCK_KEY_ID;
}

let razorpayInstance: Razorpay | null = null;

export function getRazorpay(): Razorpay {
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || MOCK_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET || MOCK_KEY_SECRET,
    });
  }
  return razorpayInstance;
}

function toHex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

/** Random lowercase hex string of `byteLength` bytes (Web Crypto). */
export function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  globalThis.crypto.getRandomValues(bytes);
  return toHex(bytes);
}

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await globalThis.crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return toHex(new Uint8Array(signature));
}

/** Constant-time string comparison (length mismatch still walks the longer input). */
export function timingSafeEqualString(a: string, b: string): boolean {
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  const length = Math.max(left.length, right.length);
  let diff = left.length ^ right.length;
  for (let i = 0; i < length; i++) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

/**
 * Verifies the `razorpay_signature` returned by Checkout:
 * HMAC_SHA256(order_id + "|" + payment_id, key_secret).
 */
export async function verifyRazorpayPaymentSignature({
  razorpayOrderId,
  razorpayPaymentId,
  signature,
}: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
}): Promise<boolean> {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret || !signature) return false;
  const expected = await hmacSha256Hex(secret, `${razorpayOrderId}|${razorpayPaymentId}`);
  return timingSafeEqualString(expected, signature.trim().toLowerCase());
}

/** Verifies `x-razorpay-signature` = HMAC_SHA256(rawBody, webhook_secret). */
export async function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string
): Promise<boolean> {
  if (!secret || !signature) return false;
  const expected = await hmacSha256Hex(secret, rawBody);
  return timingSafeEqualString(expected, signature.trim().toLowerCase());
}
