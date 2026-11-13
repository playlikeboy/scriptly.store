import { NextResponse } from "next/server";
import type { z } from "zod";
import { getOrCreateDbUser } from "@/lib/auth-utils";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    details === undefined ? { success: false, error: message } : { success: false, error: message, details },
    { status, headers: NO_STORE }
  );
}

export function jsonOk(body: Record<string, unknown>, status = 200) {
  return NextResponse.json({ success: true, ...body }, { status, headers: NO_STORE });
}

/**
 * Returns null when the current session is an admin, otherwise the error
 * response to send (401 when signed out, 403 when signed in without admin role).
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const user = await getOrCreateDbUser();
  if (!user) return jsonError("Unauthorized: Sign in required.", 401);
  if (user.role !== "admin") return jsonError("Unauthorized: Admin access required.", 403);
  return null;
}

export async function readJson(request: Request): Promise<{ ok: true; data: unknown } | { ok: false }> {
  try {
    return { ok: true, data: await request.json() };
  } catch {
    return { ok: false };
  }
}

export function zodDetails(error: z.ZodError) {
  return error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
}
