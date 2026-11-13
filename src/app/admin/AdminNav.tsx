"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ArrowUpRight,
  CheckSquare,
  Coins,
  FileCode2,
  FolderKanban,
  Gift,
  LayoutDashboard,
  Link2,
  Menu,
  Package,
  Plus,
  ShoppingCart,
  Store,
  Users,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
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
      { href: "/admin/payment-links", label: "Payment links", icon: Link2 },
      { href: "/admin/payouts", label: "Payouts", icon: Coins },
      { href: "/admin/affiliates", label: "Affiliates", icon: Users },
    ],
  },
  {
    label: "Tools",
    items: [{ href: "/admin/prompts", label: "Prompt docs", icon: FileCode2 }],
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
        <nav key={group.label} aria-label={group.label}>
          <p className="px-3 pb-1.5 text-xs text-muted-foreground">{group.label}</p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isItemActive(pathname, item.href);
              const Icon = item.icon;
              const badge = item.href === "/admin/approvals" ? pendingCount : 0;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active
                        ? "bg-secondary font-medium text-foreground"
                        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    )}
                  >
                    <Icon
                      aria-hidden="true"
                      strokeWidth={1.75}
                      className={cn("size-4 shrink-0", active ? "text-primary" : "text-muted-foreground")}
                    />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {badge > 0 ? (
                      <span className="min-w-5 rounded-full bg-primary/10 px-1.5 text-center text-xs font-medium text-primary tabular-nums">
                        {badge}
                        <span className="sr-only"> pending</span>
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ))}
    </div>
  );
}

function Brand() {
  return (
    <Link
      href="/admin"
      className="flex min-w-0 items-baseline gap-2 rounded-lg px-3 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="truncate font-display text-lg text-foreground">ScriptlyStore</span>
      <span className="text-xs text-muted-foreground">Admin</span>
    </Link>
  );
}

function Footer({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="space-y-0.5 border-t border-border pt-3">
      <Link
        href="/admin/products/new"
        onClick={onNavigate}
        className="flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm text-muted-foreground transition-colors outline-none hover:bg-secondary/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Plus aria-hidden="true" strokeWidth={1.75} className="size-4" />
        New product
      </Link>
      <Link
        href="/"
        onClick={onNavigate}
        className="flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm text-muted-foreground transition-colors outline-none hover:bg-secondary/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowUpRight aria-hidden="true" strokeWidth={1.75} className="size-4" />
        View marketplace
      </Link>
    </div>
  );
}

export default function AdminNav({ pendingCount }: { pendingCount: number }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <aside className="sticky top-16 z-20 hidden h-[calc(100dvh-4rem)] w-60 border-r border-border bg-background lg:flex lg:flex-col">
        <div className="flex h-full min-h-0 flex-col gap-5 px-3 py-5">
          <Brand />
          <div className="min-h-0 flex-1 overflow-y-auto">
            <Navigation pathname={pathname} pendingCount={pendingCount} />
          </div>
          <Footer />
        </div>
      </aside>

      <header className="sticky top-16 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-background px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open admin navigation"
          aria-expanded={mobileOpen}
          className="inline-flex size-10 items-center justify-center rounded-[10px] text-foreground transition-colors outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Menu className="size-5" strokeWidth={1.75} />
        </button>
        <Brand />
        <Link
          href="/admin/products/new"
          aria-label="Create new product"
          className="inline-flex size-10 items-center justify-center rounded-[10px] bg-foreground text-background transition-colors outline-none hover:bg-foreground/85 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Plus className="size-4" />
        </Link>
      </header>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[86vw] max-w-xs gap-5 bg-background px-3 py-5">
          <SheetTitle className="sr-only">Admin navigation</SheetTitle>
          <Brand />
          <div className="min-h-0 flex-1 overflow-y-auto">
            <Navigation pathname={pathname} pendingCount={pendingCount} onNavigate={() => setMobileOpen(false)} />
          </div>
          <Footer onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
