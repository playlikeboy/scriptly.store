import crypto from "crypto";

export interface EncodedPaymentPayload {
  title: string;
  price: number; // in INR
  redirectUrl: string;
  description?: string | null;
  currency?: string;
  createdAt?: number;
  sig?: string;
}

export interface DecodeResult {
  success: boolean;
  data?: EncodedPaymentPayload;
  error?: string;
  requiresKey?: boolean;
  isEncrypted?: boolean;
}

// Server-side signing secret. PAYMENT_LINK_SECRET is preferred; the Razorpay
// secret remains a fallback so previously issued signed links keep verifying.
// NOTE: in a browser bundle none of these env vars exist, so links must be
// signed on the server (generateEncodedPaymentLinkAction / /api/pay/create).
const DEFAULT_SECRET_KEY =
  process.env.PAYMENT_LINK_SECRET ||
  process.env.RAZORPAY_KEY_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "scriptly_secure_pay_secret_key_2026";

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_REDIRECT_LENGTH = 2048;
// payment_links.price is int4 paise; keep rupee amounts within that range.
const MAX_PRICE_INR = 21_474_836;

/** Constant-time comparison for short hex signatures. */
function constantTimeEqual(a: string, b: string): boolean {
  const length = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < length; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/** Only absolute http(s) URLs may be used as post-payment redirects. */
export function isSafeRedirectUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value || value.length > MAX_REDIRECT_LENGTH) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/** Validates the shape of a decoded payload; returns an error message or null. */
function validateDecodedPayload(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== "object") return "Invalid payment payload.";
  const p = parsed as Record<string, unknown>;
  if (typeof p.title !== "string" || !p.title.trim() || p.title.length > MAX_TITLE_LENGTH) {
    return "Invalid payment title.";
  }
  const price = typeof p.price === "number" ? p.price : Number(p.price);
  if (!Number.isFinite(price) || price <= 0 || price > MAX_PRICE_INR) {
    return "Invalid payment amount.";
  }
  if (!isSafeRedirectUrl(p.redirectUrl)) {
    return "Invalid redirect URL in payment link.";
  }
  if (p.description != null && (typeof p.description !== "string" || p.description.length > MAX_DESCRIPTION_LENGTH)) {
    return "Invalid payment description.";
  }
  if (p.currency != null && (typeof p.currency !== "string" || !/^[A-Za-z]{3}$/.test(p.currency))) {
    return "Invalid payment currency.";
  }
  if (p.sig != null && typeof p.sig !== "string") {
    return "Invalid payment signature.";
  }
  return null;
}

/**
 * Derives a 32-byte AES key from any string key using SHA-256
 */
function deriveKey(secret: string): Buffer {
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Computes an HMAC SHA-256 signature for a payment payload.
 */
export function generatePayloadSignature(
  title: string,
  price: number,
  redirectUrl: string,
  customKey?: string
): string {
  const secret = customKey?.trim() || DEFAULT_SECRET_KEY;
  const message = `${title.trim()}|${Number(price)}|${redirectUrl.trim()}`;
  return crypto
    .createHmac("sha256", secret)
    .update(message)
    .digest("hex")
    .slice(0, 16); // 16-char hex signature keeps URL compact
}

/**
 * Encrypts arbitrary text using AES-256-GCM with a custom key.
 * Format: k1.<iv_hex>.<tag_hex>.<ciphertext_hex>
 */
export function encryptPayloadWithKey(plaintext: string, key: string): string {
  const derivedKey = deriveKey(key.trim());
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", derivedKey, iv);
  
  let ciphertext = cipher.update(plaintext, "utf8", "hex");
  ciphertext += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `k1.${iv.toString("hex")}.${authTag}.${ciphertext}`;
}

/**
 * Decrypts an AES-256-GCM encrypted payload using the provided key.
 */
export function decryptPayloadWithKey(token: string, key: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 4 || parts[0] !== "k1") {
      return null;
    }
    // 12-byte IV and 16-byte GCM tag, hex encoded; reject truncated tags.
    if (!/^[0-9a-f]{24}$/i.test(parts[1]) || !/^[0-9a-f]{32}$/i.test(parts[2]) || !/^[0-9a-f]*$/i.test(parts[3])) {
      return null;
    }

    const iv = Buffer.from(parts[1], "hex");
    const authTag = Buffer.from(parts[2], "hex");
    const ciphertext = parts[3];

    const derivedKey = deriveKey(key.trim());
    const decipher = crypto.createDecipheriv("aes-256-gcm", derivedKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return null;
  }
}

/**
 * Encodes payment parameters.
 * Supports:
 * 1. Plain or Signed Base64 JSON schema (when no encryptionKey is provided)
 * 2. Key-based AES-256-GCM encryption (when encryptionKey is provided)
 */
export function encodePaymentLinkPayload(
  payload: {
    title: string;
    price: number;
    redirectUrl: string;
    description?: string | null;
    currency?: string;
  },
  options: {
    sign?: boolean;
    encryptionKey?: string;
  } | boolean = true
): string {
  const sign = typeof options === "boolean" ? options : options.sign ?? true;
  const encryptionKey = typeof options === "object" ? options.encryptionKey?.trim() : undefined;

  let redirect = payload.redirectUrl.trim();
  if (!/^https?:\/\//i.test(redirect)) {
    redirect = "https://" + redirect;
  }

  const cleanPrice = Number(payload.price);
  const cleanTitle = payload.title.trim();

  const data: EncodedPaymentPayload = {
    title: cleanTitle,
    price: cleanPrice,
    redirectUrl: redirect,
    description: payload.description?.trim() || undefined,
    currency: payload.currency || "INR",
    createdAt: Date.now(),
  };

  if (sign) {
    data.sig = generatePayloadSignature(cleanTitle, cleanPrice, redirect, encryptionKey);
  }

  const jsonString = JSON.stringify(data);

  // If encryption key is specified, encrypt with AES-256-GCM
  if (encryptionKey) {
    return encryptPayloadWithKey(jsonString, encryptionKey);
  }

  // Otherwise, encode with URL-safe Base64
  return Buffer.from(jsonString, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Decodes and verifies a payment token.
 * Automatically handles:
 * - AES-256-GCM key-encrypted tokens (k1. prefix)
 * - Standard URL-safe Base64 JSON schema tokens
 */
export function decodePaymentLinkPayload(
  token: string,
  key?: string
): DecodeResult {
  if (!token || typeof token !== "string") {
    return { success: false, error: "Missing or invalid payment token." };
  }

  const cleanToken = token.trim();

  // 1. Check if token is Key-Encrypted (AES-256-GCM)
  if (cleanToken.startsWith("k1.")) {
    if (!key || !key.trim()) {
      return {
        success: false,
        requiresKey: true,
        isEncrypted: true,
        error: "This checkout is protected with an encryption key. Please provide the key to proceed.",
      };
    }

    const decryptedJson = decryptPayloadWithKey(cleanToken, key.trim());
    if (!decryptedJson) {
      return {
        success: false,
        requiresKey: true,
        isEncrypted: true,
        error: "Invalid decryption key or corrupted token.",
      };
    }

    try {
      const parsed: EncodedPaymentPayload = JSON.parse(decryptedJson);
      const invalid = validateDecodedPayload(parsed);
      if (invalid) {
        return { success: false, error: `Decrypted payload has invalid schema. ${invalid}` };
      }
      parsed.price = Number(parsed.price);

      return { success: true, data: parsed, isEncrypted: true };
    } catch {
      return { success: false, error: "Failed to parse decrypted payment payload." };
    }
  }

  // 2. Standard or Signed Base64 JSON Schema
  try {
    let base64 = cleanToken.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }

    const decodedJson = Buffer.from(base64, "base64").toString("utf8");
    const parsed: EncodedPaymentPayload = JSON.parse(decodedJson);

    if (!parsed || !parsed.title || !parsed.price || !parsed.redirectUrl) {
      return { success: false, error: "Missing essential payload parameters (title, price, redirectUrl)." };
    }
    const invalid = validateDecodedPayload(parsed);
    if (invalid) {
      return { success: false, error: invalid };
    }
    parsed.price = Number(parsed.price);

    // Verify signature if present. Plain tokens are only ever signed with the
    // server secret, so a caller-supplied key is never used here (otherwise
    // anyone could re-sign a modified payload with their own key).
    if (parsed.sig) {
      const expectedSig = generatePayloadSignature(
        parsed.title,
        parsed.price,
        parsed.redirectUrl
      );
      if (!constantTimeEqual(parsed.sig, expectedSig)) {
        return {
          success: false,
          error: "Payment link has been tampered with or modified. Signature verification failed.",
        };
      }
    }

    return { success: true, data: parsed };
  } catch {
    return { success: false, error: "Invalid or corrupted encoded payment data." };
  }
}
