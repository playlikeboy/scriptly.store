"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  CheckSquare,
  ChevronRight,
  Coins,
  FolderKanban,
  Gift,
  Home,
  LayoutDashboard,
  Link2,
  Menu,
  Package,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Store,
  Users,
  X,
  FileCode2,
} from "lucide-react";
import { useState } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: number;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const groups: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { href: "/admin", label: "Overview", icon: LayoutDashboard },
      { href: "/admin/products", label: "Products", icon: Package },
      { href: "/admin/approvals", label: "Approvals", icon: CheckSquare },
      { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
    ],
  },
  {
    label: "Commerce",
    items: [
      { href: "/admin/stores", label: "Creators", icon: Store },
      { href: "/admin/categories", label: "Categories", icon: FolderKanban },
      { href: "/admin/coupons", label: "Coupons", icon: Gift },
      { href: "/admin/payment-links", label: "Payment Links", icon: Link2 },
      { href: "/admin/payouts", label: "Payouts", icon: Coins },
      { href: "/admin/affiliates", label: "Affiliates", icon: Users },
    ],
  },
  {
    label: "Tools",
    items: [
      { href: "/admin/prompts", label: "Prompt Docs", icon: FileCode2 },
    ],
  },
];

function isItemActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Navigation({
  pathname,
  pendingCount,
  onNavigate,
}: {
  pathname: string;
  pendingCount: number;
  onNavigate?: () => void;
}) {
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.label}>
          <p className="px-2.5 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
            {group.label}
          </p>
          <nav className="space-y-1" aria-label={group.label}>
            {group.items.map((item) => {
              const active = isItemActive(pathname, item.href);
              const Icon = item.icon;
              const badge = item.href === "/admin/approvals" ? pendingCount : undefined;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "group flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.2 : 1.9} />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {typeof badge === "number" && badge > 0 && (
                    <span
                      className={[
                        "min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold tabular-nums",
                        active ? "bg-background/15 text-background" : "bg-rose-500/12 text-rose-500",
                      ].join(" ")}
                    >
                      {badge}
                    </span>
                  )}
                  {active && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" />}
                </Link>
              );
            })}
          </nav>
        </section>
      ))}
    </div>
  );
}

export default function AdminNav({ pendingCount }: { pendingCount: number }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-border/60 bg-background/95 lg:flex lg:flex-col">
        <div className="flex h-full min-h-0 flex-col px-4 py-4">
          <div className="mb-5 flex items-center justify-between rounded-2xl border border-border/60 bg-card/50 px-3.5 py-3">
            <Link href="/admin" className="min-w-0" aria-label="ScriptlyStore admin home">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold tracking-tight">ScriptlyStore</div>
                  <div className="text-[10px] font-medium text-muted-foreground">Admin workspace</div>
                </div>
              </div>
            </Link>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <Navigation pathname={pathname} pendingCount={pendingCount} />
          </div>

          <div className="mt-4 space-y-2 border-t border-border/60 pt-3">
            <Link
              href="/"
              className="flex h-9 items-center gap-2.5 rounded-xl px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
            >
              <Home className="h-4 w-4" />
              Marketplace
            </Link>
            <div className="flex items-center gap-2 px-3 text-[10px] text-muted-foreground/70">
              <Activity className="h-3.5 w-3.5" />
              Live admin controls
            </div>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open admin navigation"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-card text-foreground"
          >
            <Menu className="h-4.5 w-4.5" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <div className="truncate text-sm font-bold">ScriptlyStore Admin</div>
            <div className="text-[10px] text-muted-foreground">Operations workspace</div>
          </div>
          <Link
            href="/admin/products/new"
            aria-label="Create new product"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground text-background"
          >
            <Plus className="h-4.5 w-4.5" />
          </Link>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close admin navigation"
            className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[86vw] max-w-sm flex-col border-r border-border/60 bg-background p-4 shadow-2xl">
            <div className="mb-5 flex items-center justify-between rounded-2xl border border-border/60 bg-card/50 px-3.5 py-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">ScriptlyStore</div>
                  <div className="text-[10px] text-muted-foreground">Admin workspace</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close admin navigation"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <Navigation pathname={pathname} pendingCount={pendingCount} onNavigate={() => setMobileOpen(false)} />
            </div>

            <div className="mt-4 border-t border-border/60 pt-3">
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="flex h-10 items-center gap-2.5 rounded-xl px-3 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Home className="h-4 w-4" />
                Marketplace
              </Link>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
