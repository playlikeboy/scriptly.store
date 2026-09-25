"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { formatUSD } from "@/lib/price-utils";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Zap, ExternalLink, ArrowUp } from "lucide-react";

interface ProductStickyBarProps {
  title: string;
  thumbnail: string | null;
  pricePaise: number;
  isFree?: boolean;
  demoUrl?: string | null;
}

export default function ProductStickyBar({
  title,
  thumbnail,
  pricePaise,
  isFree = false,
  demoUrl,
}: ProductStickyBarProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show when scrolled past 650px
      if (window.scrollY > 650) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToCheckout = () => {
    const el = document.getElementById("checkout-panel");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-lg shadow-2xl animate-in slide-in-from-bottom duration-300">
      <div className="container mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-4">
        {/* Product preview info */}
        <div className="flex items-center gap-3 min-w-0">
          {thumbnail && (
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-muted border border-border/40 shrink-0 hidden sm:block relative">
              <Image src={thumbnail} alt={title} fill sizes="40px" className="object-cover" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-bold text-xs sm:text-sm text-foreground truncate max-w-xs sm:max-w-md">
              {title}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="font-mono font-bold text-foreground">
                {isFree ? "FREE" : formatUSD(pricePaise)}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1 text-emerald-500">
                <ShieldCheck className="w-3 h-3" />
                Commercial License
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          {demoUrl && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-xl text-xs font-bold border-border/60 hidden md:inline-flex"
            >
              <a href={demoUrl} target="_blank" rel="noopener noreferrer">
                <span>Demo</span>
                <ExternalLink className="w-3 h-3 ml-1.5" />
              </a>
            </Button>
          )}

          <Button
            onClick={scrollToCheckout}
            size="sm"
            className="rounded-xl text-xs font-black uppercase tracking-wider bg-[#58CC02] hover:bg-[#58CC02]/90 text-white shadow-[0_2px_0_#46A302] active:translate-y-px active:shadow-none transition-all px-5"
          >
            <Zap className="w-3.5 h-3.5 mr-1.5" />
            <span>{isFree ? "Download Free" : `Buy Now — ${formatUSD(pricePaise)}`}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
