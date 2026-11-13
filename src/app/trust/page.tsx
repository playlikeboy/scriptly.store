import { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { Check, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Trust & Security Center | ScriptlyStore",
  description: "Verified infrastructure, security policies, digital delivery model, and honest commercial standards at ScriptlyStore.",
  alternates: {
    canonical: `${siteConfig.url}/trust`,
  },
};

const PILLARS = [
  {
    id: "payments",
    title: "Payment infrastructure",
    body: "All credit card, debit card, and UPI transactions are handled directly through Razorpay's PCI-DSS Level 1 compliant infrastructure with 256-bit SSL encryption. ScriptlyStore never touches or stores raw payment credentials.",
    points: ["Idempotent webhook transaction verification", "Automated Route split disbursements"],
  },
  {
    id: "authentication",
    title: "Authentication & access",
    body: "User authentication is managed via Hexclave identity services, offering passwordless login, encrypted session tokens, and strict server-side authorization boundaries on all protected assets.",
    points: ["HTTP-only secure authentication cookies", "Zero client-side entitlement assumptions"],
  },
  {
    id: "delivery",
    title: "Digital delivery model",
    body: "Product ZIP packages are delivered immediately upon order confirmation. Every download request is authenticated server-side against completed purchase records before granting asset access.",
    points: ["Server-side entitlement validation", "Permanent redownload access in buyer dashboard"],
  },
  {
    id: "economics",
    title: "Transparent economics",
    body: "Direct sales grant creators 95% of proceeds (5% platform fee). When a verified affiliate refers a sale, the creator receives 65%, the affiliate earns 30%, and the platform retains 5%.",
    points: ["No monthly subscription or listing fees", "Real-time earnings ledger & automated payouts"],
  },
];

const REVIEW_CHECKS = [
  "Valid package manifests and installable dependencies",
  "Accurate documentation and setup instructions",
  "Absence of obfuscated malicious binaries",
  "Legitimate author ownership and licensing rights",
];

const SPLITS = [
  { sale: "Direct sale", creator: "95%", affiliate: "—", platform: "5%" },
  { sale: "Affiliate-referred sale", creator: "65%", affiliate: "30%", platform: "5%" },
];

const POLICY_LINKS = [
  { href: "/dmca", label: "DMCA takedown process" },
  { href: "/refund", label: "Refund policy" },
  { href: "/licenses", label: "Licensing guidelines" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
];

function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="mt-4 space-y-2 text-sm text-foreground">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5">
          <Check className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={1.75} aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function TrustPage() {
  return (
    <div className="bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {/* Header */}
        <header className="max-w-[68ch] border-b border-border pb-10">
          <h1 className="font-display text-3xl md:text-5xl leading-[1.1] text-foreground">
            Trust, security & operational standards
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            ScriptlyStore is designed for software developers and creators who demand technical rigor, financial transparency, and reliable digital delivery.
          </p>
        </header>

        {/* Pillars */}
        <div className="divide-y divide-border">
          {PILLARS.map((p) => (
            <section
              key={p.id}
              id={p.id}
              aria-labelledby={`${p.id}-title`}
              className="grid scroll-mt-24 gap-3 py-10 md:grid-cols-[16rem_minmax(0,1fr)] md:gap-12"
            >
              <h2 id={`${p.id}-title`} className="font-display text-2xl leading-tight text-foreground">
                {p.title}
              </h2>
              <div className="max-w-[60ch]">
                <p className="text-base leading-relaxed text-muted-foreground">{p.body}</p>
                {p.id === "economics" && (
                  <div className="mt-6 overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <caption className="sr-only">Revenue split per sale</caption>
                      <thead>
                        <tr className="border-b border-foreground/20 text-left">
                          <th scope="col" className="py-2 pr-4 font-medium text-foreground">Sale type</th>
                          <th scope="col" className="py-2 px-4 text-right font-medium text-foreground">Creator</th>
                          <th scope="col" className="py-2 px-4 text-right font-medium text-foreground">Affiliate</th>
                          <th scope="col" className="py-2 pl-4 text-right font-medium text-foreground">Platform</th>
                        </tr>
                      </thead>
                      <tbody className="tabular">
                        {SPLITS.map((s) => (
                          <tr key={s.sale} className="border-b border-border">
                            <th scope="row" className="py-2.5 pr-4 text-left font-normal text-muted-foreground">{s.sale}</th>
                            <td className="py-2.5 px-4 text-right text-foreground">{s.creator}</td>
                            <td className="py-2.5 px-4 text-right text-muted-foreground">{s.affiliate}</td>
                            <td className="py-2.5 pl-4 text-right text-muted-foreground">{s.platform}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <CheckList items={p.points} />
              </div>
            </section>
          ))}

          {/* Review policy */}
          <section
            id="review"
            aria-labelledby="review-title"
            className="grid scroll-mt-24 gap-3 py-10 md:grid-cols-[16rem_minmax(0,1fr)] md:gap-12"
          >
            <h2 id="review-title" className="font-display text-2xl leading-tight text-foreground">
              Product review & quality policy
            </h2>
            <div className="max-w-[60ch]">
              <p className="text-base leading-relaxed text-muted-foreground">
                Before any script or template is published to the public catalog, products undergo an administrative moderation review checking for:
              </p>
              <CheckList items={REVIEW_CHECKS} />
            </div>
          </section>

          {/* Abuse reporting */}
          <section
            id="reporting"
            aria-labelledby="reporting-title"
            className="grid scroll-mt-24 gap-3 py-10 md:grid-cols-[16rem_minmax(0,1fr)] md:gap-12"
          >
            <h2 id="reporting-title" className="font-display text-2xl leading-tight text-foreground">
              Abuse reporting & intellectual property
            </h2>
            <div className="max-w-[60ch]">
              <p className="text-base leading-relaxed text-muted-foreground">
                ScriptlyStore respects intellectual property rights. If you suspect any product infringes your copyright or breaches licensing terms, submit an immediate takedown notification.
              </p>
              <ul className="mt-5 divide-y divide-border border-y border-border">
                {POLICY_LINKS.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="group flex items-center justify-between py-3 text-sm text-foreground transition-colors hover:text-primary"
                    >
                      {l.label}
                      <ArrowRight className="size-4 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary" strokeWidth={1.75} aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
