"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Search } from "lucide-react";
import AuthButtons from "@/components/AuthButtons";
import CartIcon from "@/components/CartIcon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MAIN_NAVIGATION, SELL_LINK } from "@/config/navigation";

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display text-[22px] font-semibold leading-none tracking-[-0.02em] text-foreground", className)}>
      Scriptly<span className="text-muted-foreground">.store</span>
    </span>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  // Cmd/Ctrl+K opens search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        router.push("/search");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  // Hairline appears only once the page has scrolled
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b bg-background transition-[border-color] duration-200 ease-out",
        scrolled ? "border-border" : "border-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="Scriptly.store home"
          className="shrink-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Wordmark />
        </Link>

        <nav aria-label="Primary" className="ml-4 hidden items-center gap-1 md:flex">
          {MAIN_NAVIGATION.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link
            href="/search"
            className="hidden h-9 w-56 items-center gap-2 rounded-[10px] border border-input bg-card px-3 text-sm text-muted-foreground transition-colors duration-150 outline-none hover:border-foreground/25 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring lg:flex"
          >
            <Search className="size-4" strokeWidth={1.75} aria-hidden="true" />
            <span className="flex-1">Search the catalogue</span>
            <kbd className="pointer-events-none rounded border border-border px-1.5 font-mono text-[10px] leading-4 text-muted-foreground">
              ⌘K
            </kbd>
          </Link>

          <Button asChild variant="ghost" size="icon-sm" className="lg:hidden">
            <Link href="/search" aria-label="Search the catalogue">
              <Search className="size-4" strokeWidth={1.75} />
            </Link>
          </Button>

          <Link
            href={SELL_LINK.href}
            className="hidden rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors duration-150 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring xl:inline-flex"
          >
            {SELL_LINK.label}
          </Link>

          <ThemeToggle />
          <CartIcon />

          <div className="hidden sm:block">
            <Suspense fallback={<div className="h-8 w-28 rounded-lg bg-muted" />}>
              <AuthButtons />
            </Suspense>
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label="Open menu">
                <Menu className="size-4" strokeWidth={1.75} />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex flex-col gap-0 bg-background p-0 data-[side=right]:w-80 data-[side=right]:max-w-[85vw]">
              <div className="border-b border-border px-5 py-4">
                <SheetTitle asChild>
                  <span><Wordmark /></span>
                </SheetTitle>
                <SheetDescription className="sr-only">Site navigation</SheetDescription>
              </div>

              <nav aria-label="Mobile" className="flex flex-1 flex-col overflow-y-auto px-3 py-4">
                {[...MAIN_NAVIGATION, { href: "/search", label: "Search" }, SELL_LINK].map((item) => {
                  const active = isActivePath(pathname, item.href);
                  return (
                    <SheetClose asChild key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "rounded-lg px-3 py-3 text-base transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          active
                            ? "bg-secondary font-medium text-foreground"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        )}
                      >
                        {item.label}
                      </Link>
                    </SheetClose>
                  );
                })}
              </nav>

              <div className="border-t border-border px-5 py-4">
                <Suspense fallback={null}>
                  <AuthButtons layout="stacked" />
                </Suspense>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
