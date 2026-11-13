import { NextResponse } from "next/server";
import { getOrCreateDbUser } from "@/lib/auth-utils";

// Per-user response: never cache in shared caches.
const NO_STORE = { "Cache-Control": "private, no-store" } as const;

export async function GET() {
  try {
    const user = await getOrCreateDbUser();
    return NextResponse.json({ role: user?.role || "user" }, { headers: NO_STORE });
  } catch (error) {
    console.error("Error fetching user role:", error);
    return NextResponse.json({ role: "user" }, { status: 500, headers: NO_STORE });
  }
}

export const dynamic = "force-dynamic";
