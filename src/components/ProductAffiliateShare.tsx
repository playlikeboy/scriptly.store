"use client";

import { useState, useId } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, ArrowRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { siteConfig } from "@/config/site";

interface ProductAffiliateShareProps {
  productSlug: string;
  productTitle: string;
  affiliateSlug: string | null;
  isApproved: boolean;
  isLoggedIn: boolean;
  commissionPercent: number;
}

export default function ProductAffiliateShare({
  productSlug,
  productTitle,
  affiliateSlug,
  isApproved,
  isLoggedIn,
  commissionPercent,
}: ProductAffiliateShareProps) {
  const [copied, setCopied] = useState(false);
  const inputId = useId();

  const referralUrl = `${siteConfig.url}/products/${productSlug}?ref=${affiliateSlug || ""}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      toast.success("Affiliate link copied.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy. Select the link and copy it manually.");
    }
  };

  const canShare = isLoggedIn && isApproved && !!affiliateSlug;

  return (
    <section aria-labelledby={`${inputId}-heading`} className="rounded-2xl border border-border p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`${inputId}-heading`} className="text-base font-semibold text-foreground">
          {canShare ? "Your referral link" : "Promote this product"}
        </h2>
        <p className="text-sm text-muted-foreground">
          <span className="tabular font-medium text-foreground">{commissionPercent}%</span> commission
        </p>
      </div>

      {canShare ? (
        <div className="mt-3 space-y-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Share this link on your developer blog, newsletters, or Twitter. You keep {commissionPercent}% of every
            resulting purchase of {productTitle}.
          </p>
          <div className="flex gap-2">
            <label htmlFor={inputId} className="sr-only">
              Referral link
            </label>
            <input
              id={inputId}
              readOnly
              value={referralUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="h-10 min-w-0 flex-1 rounded-[10px] border border-input bg-background px-3 font-mono text-xs text-foreground outline-none focus-visible:border-ring"
            />
            <Button type="button" variant="outline" onClick={handleCopy} aria-label={copied ? "Copied" : "Copy referral link"}>
              {copied ? <Check className="size-4 text-success" strokeWidth={1.75} /> : <Copy className="size-4" strokeWidth={1.75} />}
              <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
            </Button>
          </div>
        </div>
      ) : isLoggedIn && !isApproved ? (
        <div className="mt-3 space-y-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Your affiliate application is pending review. Once an admin approves it, your referral link appears here.
          </p>
          <Button asChild variant="link" className="h-auto">
            <Link href="/affiliate">
              Check status
              <ArrowRight className="size-4" strokeWidth={1.75} aria-hidden="true" />
            </Link>
          </Button>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Share this product with other builders and keep {commissionPercent}% of every checkout. Split payments are
            deposited directly to your bank.
          </p>
          <Button asChild variant="link" className="h-auto">
            <Link href={isLoggedIn ? "/affiliate" : "/handler/sign-in?redirectTo=/affiliate"}>
              Become an affiliate
              <ArrowRight className="size-4" strokeWidth={1.75} aria-hidden="true" />
            </Link>
          </Button>
        </div>
      )}
    </section>
  );
}
