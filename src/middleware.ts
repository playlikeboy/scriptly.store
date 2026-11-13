import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const REFERRAL_COOKIE = "scriptly_referred_by";
const REFERRAL_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

// Referral codes are user ids (UUIDs) or affiliate slugs. Anything else is ignored
// so arbitrary query strings can't bloat or poison the cookie.
const VALID_REF = /^[A-Za-z0-9_-]{1,64}$/;

export function middleware(request: NextRequest) {
  const ref = request.nextUrl.searchParams.get("ref")?.trim();
  if (!ref || !VALID_REF.test(ref)) {
    return NextResponse.next();
  }

  // Skip the Set-Cookie header when the browser already carries this code.
  if (request.cookies.get(REFERRAL_COOKIE)?.value === ref) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  response.cookies.set(REFERRAL_COOKIE, ref, {
    maxAge: REFERRAL_MAX_AGE,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

export const config = {
  matcher: [
    // Page navigations only: skip API routes, Next internals, auth handler,
    // metadata files and any request for a static asset (path with an extension).
    "/((?!api/|_next/|handler/|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.[A-Za-z0-9]+$).*)",
  ],
};
