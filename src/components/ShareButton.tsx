"use client";

import { useState, useEffect, useRef, useId } from "react";
import { Share2, Copy, Check, MessageSquare, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

interface ShareButtonProps {
  productTitle: string;
  productSlug: string;
}

// Inline brand marks (outline style, matched to lucide stroke weight)
const TwitterIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
);

const LinkedinIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

export default function ShareButton({ productTitle, productSlug }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  // Stable on server and client (no hydration mismatch).
  const productUrl = `${siteConfig.url}/products/${productSlug}`;

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(productUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const shareOptions = [
    {
      name: "X (Twitter)",
      icon: TwitterIcon,
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out ${productTitle} on ScriptlyStore!`)}&url=${encodeURIComponent(productUrl)}`,
    },
    {
      name: "LinkedIn",
      icon: LinkedinIcon,
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(productUrl)}`,
    },
    {
      name: "Facebook",
      icon: FacebookIcon,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}`,
    },
    {
      name: "WhatsApp",
      icon: MessageSquare,
      url: `https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out ${productTitle} on ScriptlyStore: ${productUrl}`)}`,
    },
    {
      name: "Email",
      icon: Mail,
      url: `mailto:?subject=${encodeURIComponent(productTitle)}&body=${encodeURIComponent(`Check out this premium digital product on ScriptlyStore:\n\n${productUrl}`)}`,
    },
  ];

  return (
    <div ref={containerRef} className="relative w-full">
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="w-full"
      >
        <Share2 className="size-4" strokeWidth={1.75} aria-hidden="true" />
        Share
      </Button>

      {isOpen && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Share this product"
          className="absolute right-0 top-12 z-50 w-[min(18rem,calc(100vw-2rem))] rounded-2xl bg-card p-3 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.2)] animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <div className="flex items-center gap-2 rounded-[10px] border border-input bg-background p-1 pl-3">
            <label htmlFor={`${panelId}-url`} className="sr-only">
              Product link
            </label>
            <input
              id={`${panelId}-url`}
              type="text"
              readOnly
              value={productUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 truncate bg-transparent font-mono text-xs text-muted-foreground outline-none"
            />
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={handleCopy}
              aria-label={copied ? "Link copied" : "Copy link"}
            >
              {copied ? (
                <Check className="text-success" strokeWidth={1.75} />
              ) : (
                <Copy strokeWidth={1.75} />
              )}
            </Button>
          </div>
          <span className="sr-only" aria-live="polite">
            {copied ? "Link copied to clipboard" : ""}
          </span>

          <ul className="mt-2">
            {shareOptions.map((opt) => {
              const Icon = opt.icon;
              return (
                <li key={opt.name}>
                  <a
                    href={opt.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {opt.name}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
