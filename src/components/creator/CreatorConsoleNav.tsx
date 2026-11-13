"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Package, Store, Landmark, TicketPercent, ReceiptText } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { name: "Overview", href: "/creator/dashboard", icon: LayoutGrid },
  { name: "Products", href: "/creator/products", icon: Package },
  { name: "Sales ledger", href: "/creator/ledger", icon: ReceiptText },
  { name: "Coupons", href: "/creator/coupons", icon: TicketPercent },
  { name: "Storefront", href: "/creator/store", icon: Store },
  { name: "Bank & payouts", href: "/creator/payouts", icon: Landmark },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/creator/products") {
    return (
      pathname === href ||
      pathname === "/creator/new" ||
      /^\/creator\/[^/]+\/edit$/.test(pathname)
    );
  }
  return pathname === href;
}

export default function CreatorConsoleNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav aria-label="Creator console" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:overflow-visible md:px-0">
      <ul className="flex gap-1 md:flex-col">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-9 items-center gap-2.5 rounded-[10px] px-3 text-sm whitespace-nowrap transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "bg-secondary font-medium text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                )}
              >
                <Icon className={cn("size-4", active ? "text-primary" : "")} strokeWidth={1.75} />
                {item.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
