import { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateDbUser } from "@/lib/auth-utils";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import CreatorConsoleNav from "@/components/creator/CreatorConsoleNav";

export const metadata: Metadata = {
  title: "Creator Console | ScriptlyStore",
  description: "Manage your ScriptlyStore creator storefront, products, coupons, and payouts.",
};

export default async function CreatorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getOrCreateDbUser();
  if (!user) {
    redirect("/handler/sign-in?redirectTo=/creator/dashboard");
  }

  const displayName = user.storeName || user.name || "Your store";
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 md:flex-row md:gap-10 md:py-10 lg:px-8">
        <aside className="w-full shrink-0 md:sticky md:top-20 md:w-56 md:self-start">
          <div className="flex items-center gap-3 md:flex-col md:items-start md:gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-foreground text-xs font-semibold text-background"
              >
                {initials || "S"}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <Link
              href={`/stores/${user.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1 text-sm text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              View storefront
              <ArrowUpRight className="size-3.5" strokeWidth={1.75} />
              <span className="sr-only">(opens in a new tab)</span>
            </Link>
          </div>

          <div className="mt-5 border-t border-border pt-4 md:mt-6">
            <CreatorConsoleNav />
          </div>

          <div className="mt-4 hidden border-t border-border pt-4 md:block">
            <Link
              href="/dashboard"
              className="flex h-9 items-center gap-2 rounded-[10px] px-3 text-sm text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <ArrowLeft className="size-4" strokeWidth={1.75} />
              Customer area
            </Link>
          </div>
        </aside>

        <main id="creator-console" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
