import { z } from "zod";
import { revalidatePath } from "next/cache";
import { CATALOG_CURRENCY, formatMoney, formatPaiseToINR } from "@/lib/price-utils";

// ---------------------------------------------------------------------------
// Limits
// ---------------------------------------------------------------------------

/** Postgres int4 upper bound; every money column is int4. */
export const INT4_MAX = 2_147_483_647;
export const MAX_LIMIT = 100;
export const DEFAULT_LIMIT = 25;
export const MAX_OFFSET = 100_000;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/**
 * An error whose message is safe to show to the MCP client. Anything else
 * thrown by a handler is reported as a generic internal error.
 */
export class ToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolError";
  }
}

/** True when a (possibly wrapped) database error is a unique-constraint violation. */
export function isUniqueViolation(err: unknown): boolean {
  for (let e: unknown = err, depth = 0; e && depth < 4; depth++) {
    if (typeof e === "object" && e !== null && (e as { code?: unknown }).code === "23505") return true;
    e = typeof e === "object" && e !== null ? (e as { cause?: unknown }).cause : undefined;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

const CATALOG_UNIT = CATALOG_CURRENCY === "USD" ? "USD cents" : "INR paise";

export type Money = { amount: number; unit: string; formatted: string };

/** Catalog money (products, orders, coupons, payouts, commissions): integer minor units. */
export function catalogMoney(amount: number | string | null | undefined): Money {
  const n = Math.round(Number(amount ?? 0)) || 0;
  return { amount: n, unit: CATALOG_UNIT, formatted: formatMoney(n) };
}

/** Payment-link money: always integer INR paise. */
export function paiseMoney(amount: number | string | null | undefined): Money {
  const n = Math.round(Number(amount ?? 0)) || 0;
  return { amount: n, unit: "INR paise", formatted: formatPaiseToINR(n) };
}

export const CATALOG_MONEY_UNIT = CATALOG_UNIT;

/** Integer catalog money input (USD cents), bounded to int4. */
export const catalogAmount = (description: string) =>
  z.number().int().min(0).max(INT4_MAX).describe(`${description} Integer ${CATALOG_UNIT}.`);

// ---------------------------------------------------------------------------
// Common field schemas
// ---------------------------------------------------------------------------

export const idField = (what = "record") =>
  z.string().trim().min(1).max(200).describe(`The ${what} id.`);

export const idOrSlugField = (what = "record") =>
  z.string().trim().min(1).max(200).describe(`The ${what} id or slug.`);

export const confirmField = z
  .literal(true, { error: "This action is destructive. Re-send with confirm: true to proceed." })
  .describe("Must be true. Guards against accidental destructive calls.");

export const paginationFields = {
  limit: z
    .number()
    .int()
    .min(1)
    .max(MAX_LIMIT)
    .default(DEFAULT_LIMIT)
    .describe(`Page size (1-${MAX_LIMIT}, default ${DEFAULT_LIMIT}).`),
  offset: z.number().int().min(0).max(MAX_OFFSET).default(0).describe("Rows to skip (default 0)."),
};

export function page<T>(items: T[], total: number, limit: number, offset: number) {
  const next = offset + items.length;
  return { total, limit, offset, count: items.length, nextOffset: next < total ? next : null, items };
}

/** ISO 8601 date ("2026-01-31") or datetime; parsed to a Date. */
export const dateField = (description: string) =>
  z
    .string()
    .trim()
    .min(1)
    .max(40)
    .describe(`${description} ISO 8601 date or datetime (UTC if no offset).`)
    .transform((v, ctx) => {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) {
        ctx.addIssue({ code: "custom", message: "Invalid date; use ISO 8601 (e.g. 2026-01-31)." });
        return z.NEVER;
      }
      return d;
    });

export function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Absolute http(s) URL. */
export const httpUrlField = (description: string) =>
  z
    .string()
    .trim()
    .min(1)
    .max(2048)
    .refine(isHttpUrl, "Must be an absolute http(s) URL.")
    .describe(`${description} Absolute http(s) URL.`);

/** Absolute http(s) URL or a site-relative path such as "/thumbnails/x.png". */
export const httpOrPathField = (description: string) =>
  z
    .string()
    .trim()
    .min(1)
    .max(2048)
    .refine(
      (v) => (v.startsWith("/") && !v.startsWith("//")) || isHttpUrl(v),
      "Must be an http(s) URL or a site-relative path starting with '/'."
    )
    .describe(`${description} http(s) URL or site-relative path.`);

/** Normalizes a free-form slug to lowercase kebab-case. */
export function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 120);
}

export function requireSlug(input: string): string {
  const slug = normalizeSlug(input);
  if (!slug) throw new ToolError("Slug must contain at least one letter or number.");
  return slug;
}

/** Escapes LIKE/ILIKE wildcards so search text matches literally. */
export function likeTerm(value: string): string {
  return `%${value.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

export const searchField = z.string().trim().min(1).max(200);

/** Masks all but the last 4 characters (bank account numbers etc.). */
export function maskTail(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.length <= 4 ? "****" : `${"*".repeat(Math.min(value.length - 4, 8))}${value.slice(-4)}`;
}

export function iso(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(d);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function num(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** Revalidates cached pages; never fails the tool call. */
export function revalidate(...paths: string[]) {
  for (const p of paths) {
    try {
      revalidatePath(p);
    } catch {
      // Outside a request scope or unsupported by the runtime: caches expire on their own.
    }
  }
}
