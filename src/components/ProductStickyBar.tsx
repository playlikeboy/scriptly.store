"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { formatMoney } from "@/lib/price-utils";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductStickyBarProps {
  title: string;
  thumbnail: string | null;
  pricePaise: number;
  isFree?: boolean;
  demoUrl?: string | null;
}

/**
 * Mobile/tablet buy bar. Shown only once the in-page purchase panel has
 * scrolled above the viewport; on desktop the panel itself is sticky.
 */
export default function ProductStickyBar({
  title,
  thumbnail,
  pricePaise,
  isFree = false,
  demoUrl,
}: ProductStickyBarProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const panel = document.getElementById("checkout-panel");
    if (!panel || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Visible only when the panel is out of view *above* the viewport.
        setIsVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0 }
    );
    observer.observe(panel);
    return () => observer.disconnect();
  }, []);

  const scrollToCheckout = () => {
    const el = document.getElementById("checkout-panel");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const priceLabel = isFree || pricePaise <= 0 ? "Free" : formatMoney(pricePaise);

  return (
    <div
      aria-hidden={!isVisible}
      inert={!isVisible}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] transition-transform duration-200 ease-out lg:hidden",
        isVisible ? "translate-y-0" : "translate-y-full"
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {thumbnail && (
            <div className="relative hidden size-10 shrink-0 overflow-hidden rounded-lg bg-secondary sm:block">
              <Image src={thumbnail} alt="" fill sizes="40px" className="object-cover" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{title}</p>
            <p
              className={cn(
                "tabular text-sm",
                priceLabel === "Free" ? "text-success" : "text-muted-foreground"
              )}
            >
              {priceLabel}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {demoUrl && (
            <Button asChild variant="outline" className="hidden md:inline-flex">
              <a href={demoUrl} target="_blank" rel="noopener noreferrer">
                Demo
                <ExternalLink className="size-4" strokeWidth={1.75} aria-hidden="true" />
              </a>
            </Button>
          )}
          <Button variant="accent" onClick={scrollToCheckout}>
            {isFree || pricePaise <= 0 ? "Get it free" : "Buy now"}
          </Button>
        </div>
      </div>
    </div>
  );
}
