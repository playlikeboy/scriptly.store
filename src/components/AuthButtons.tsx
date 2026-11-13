"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser, UserButton } from "@hexclave/next";
import { ChevronDown, LayoutDashboard, Shield, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface AuthButtonsProps {
  /** "inline" for the header bar, "stacked" for the mobile menu. */
  layout?: "inline" | "stacked";
}

const MENU_LINKS = [
  { href: "/dashboard", label: "Purchases & downloads", icon: LayoutDashboard },
  { href: "/creator/dashboard", label: "Creator console", icon: Store },
] as const;

export default function AuthButtons({ layout = "inline" }: AuthButtonsProps) {
  const user = useUser();
  const userId = user?.id ?? null;
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    fetch("/api/auth/role", { signal: controller.signal })
      .then((res): Promise<{ role?: string }> => (res.ok ? res.json() : Promise.resolve({ role: "user" })))
      .then((data: { role?: string }) => setIsAdmin(data.role === "admin"))
      .catch(() => {
        if (!controller.signal.aborted) setIsAdmin(false);
      });
    return () => controller.abort();
  }, [userId]);

  const stacked = layout === "stacked";

  if (!user) {
    return (
      <div className={cn("flex items-center gap-2", stacked && "flex-col items-stretch")}>
        <Button asChild variant={stacked ? "outline" : "ghost"} size={stacked ? "default" : "sm"}>
          <Link href="/handler/sign-in">Sign in</Link>
        </Button>
        <Button asChild size={stacked ? "default" : "sm"}>
          <Link href="/handler/sign-up">Create account</Link>
        </Button>
      </div>
    );
  }

  if (stacked) {
    const links = isAdmin
      ? [...MENU_LINKS, { href: "/admin", label: "Admin", icon: Shield }]
      : MENU_LINKS;
    return (
      <div className="flex flex-col gap-3">
        <ul className="flex flex-col">
          {links.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex items-center gap-2.5 rounded-lg px-1 py-2 text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Icon className="size-4" strokeWidth={1.75} aria-hidden="true" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <UserButton />
          <span className="truncate">{user.displayName || user.primaryEmail || "Account"}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1 text-foreground">
            Account
            <ChevronDown className="size-3.5 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 rounded-xl p-1">
          {MENU_LINKS.map(({ href, label, icon: Icon }) => (
            <DropdownMenuItem key={href} asChild className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-sm">
              <Link href={href}>
                <Icon className="size-4 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
                {label}
              </Link>
            </DropdownMenuItem>
          ))}
          {isAdmin && (
            <DropdownMenuItem asChild className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-sm">
              <Link href="/admin">
                <Shield className="size-4 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
                Admin
              </Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <UserButton />
    </div>
  );
}
