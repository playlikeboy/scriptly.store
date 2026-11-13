import { cache } from "react";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hexclave } from "@/lib/hexclave";

const DEFAULT_ADMIN_EMAILS = "shaswatraj@gmail.com,shaswatraj3@gmail.com";
const OWNER_EMAIL = "shaswatraj3@gmail.com";

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || DEFAULT_ADMIN_EMAILS)
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Admin role is granted only to a verified primary email that is listed in
 * ADMIN_EMAILS. An unverified email address must never grant elevated access,
 * otherwise anyone could sign up with an admin's address and become admin.
 */
function emailGrantsAdmin(email: string, verified: boolean): boolean {
  if (!email || !verified) return false;
  const normalized = email.toLowerCase();
  return getAdminEmails().includes(normalized) || normalized === OWNER_EMAIL;
}

/**
 * Verifies the Hexclave session and returns (creating if needed) the matching
 * database user. Wrapped in React `cache()` so repeated calls within a single
 * server request (layout + page + server actions) hit Hexclave and Neon once.
 */
export const getOrCreateDbUser = cache(async function getOrCreateDbUser() {
  const hexclaveUser = await hexclave.getUser();
  if (!hexclaveUser) {
    return null;
  }

  const id = hexclaveUser.id;
  const email = hexclaveUser.primaryEmail || "";
  const name = hexclaveUser.displayName || "";
  const shouldBeAdmin = emailGrantsAdmin(email, hexclaveUser.primaryEmailVerified === true);

  const existing = await db.query.users.findFirst({
    where: eq(users.id, id),
  });

  if (existing) {
    // Promote if the (verified) email was added to ADMIN_EMAILS later.
    if (shouldBeAdmin && existing.role !== "admin") {
      const [updated] = await db
        .update(users)
        .set({ role: "admin", updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();
      return updated ?? existing;
    }
    return existing;
  }

  // First sign-in: insert idempotently so concurrent first requests don't
  // fail on the primary key, then fall back to reading the winning row.
  const [newUser] = await db
    .insert(users)
    .values({
      id,
      email,
      name,
      role: shouldBeAdmin ? "admin" : "user",
    })
    .onConflictDoNothing({ target: users.id })
    .returning();

  if (newUser) return newUser;

  const raced = await db.query.users.findFirst({
    where: eq(users.id, id),
  });
  return raced ?? null;
});

export async function isAdmin() {
  const user = await getOrCreateDbUser();
  return user?.role === "admin";
}
