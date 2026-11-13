import { NextResponse } from "next/server";

const encoder = new TextEncoder();

/**
 * Constant-time string comparison using Web Crypto (runs on Cloudflare Workers).
 * Both values are hashed first so the comparison length is fixed and does not
 * leak the secret's length.
 */
export async function timingSafeEqualString(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b)),
  ]);
  const va = new Uint8Array(ha);
  const vb = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i];
  return diff === 0;
}

/** Extracts a bearer token from the Authorization header. */
export function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

/**
 * Validates a presented agent API key against AGENT_API_KEY.
 * Fails closed when the server key is not configured.
 */
export async function isValidAgentKey(token: string | null | undefined): Promise<boolean> {
  const expected = process.env.AGENT_API_KEY;
  if (!expected || !token) return false;
  return timingSafeEqualString(token, expected);
}

export async function authorizeAgentRequest(request: Request): Promise<boolean> {
  return isValidAgentKey(getBearerToken(request));
}

export function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    details === undefined ? { success: false, error: message } : { success: false, error: message, details },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}
