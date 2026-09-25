import { Metadata } from "next";
import CartClient from "@/components/CartClient";
import { CyberBackground } from "@/components/ui/CyberBackground";
import { ShieldCheck, Zap, Lock, Headphones } from "lucide-react";

export const metadata: Metadata = {
  title: "Shopping Cart | ScriptlyStore",
  description: "Review your selected digital assets and complete secure checkout with instant download.",
};

export const dynamic = "force-dynamic";

export default function CartPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground" id="cart-page-root">
      <CyberBackground />

      <div className="container max-w-7xl mx-auto px-4 py-8 md:py-14 space-y-8 relative z-10">
        {/* Stepper Breadcrumb / Process Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-6">
          <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm font-bold">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-primary border border-primary/30">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              1. Cart Review
            </span>
            <span className="text-muted-foreground/40 font-mono">→</span>
            <span className="text-muted-foreground font-medium px-2 py-1">
              2. Payment
            </span>
            <span className="text-muted-foreground/40 font-mono">→</span>
            <span className="text-muted-foreground font-medium px-2 py-1">
              3. Instant Access
            </span>
          </div>

          {/* Guarantee Badges */}
          <div className="hidden sm:flex items-center gap-4 text-xs font-medium text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Instant Download</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-500" />
              <span>256-bit Secure</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span>Commercial License</span>
            </div>
          </div>
        </div>

        {/* Client Cart Implementation */}
        <CartClient />
      </div>
    </div>
  );
}
