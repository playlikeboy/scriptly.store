import { Metadata } from "next";
import type { ReactNode } from "react";
import { Mail, ArrowUpRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Hire Shaswat Raj — Next.js & AI Product Developer",
  description: "Hire remote Next.js, TypeScript, AI, SaaS MVP, landing page, dashboard, and automation developer. View portfolio and socials.",
  alternates: {
    canonical: "https://scriptly.store/hire-me",
  },
};

const icon = (path: ReactNode, stroke = false) => (
  <svg
    className={stroke ? "size-4 fill-none stroke-current" : "size-4 fill-current"}
    strokeWidth={stroke ? 1.75 : undefined}
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    {path}
  </svg>
);

const socialLinks = [
  {
    name: "GitHub",
    url: "https://github.com/SH20RAJ",
    desc: "Open source tools & repositories",
    svg: icon(<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />),
  },
  {
    name: "LinkedIn",
    url: "https://linkedin.com/in/sh20raj",
    desc: "Professional updates & networking",
    svg: icon(<path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />),
  },
  {
    name: "X (Twitter)",
    url: "https://x.com/ShaswatBuilds",
    desc: "Tech discussions & startup building",
    svg: icon(<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />),
  },
  {
    name: "YouTube",
    url: "https://www.youtube.com/@StackShade",
    desc: "Programming tutorials & video logs",
    svg: icon(<path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.107C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.388.511a3.002 3.002 0 0 0-2.11 2.107C0 8.053 0 12 0 12s0 3.947.502 5.837a3.003 3.003 0 0 0 2.11 2.107c1.883.511 9.388.511 9.388.511s7.505 0 9.388-.511a3.002 3.002 0 0 0 2.11-2.107C24 15.947 24 12 24 12s0-3.947-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />),
  },
  {
    name: "CodePen",
    url: "https://codepen.io/sh20raj",
    desc: "Creative CSS & frontend animations",
    svg: icon(<path d="M12 2l10 6.5v7L12 22 2 15.5v-7L12 2zM12 22v-6.5M22 8.5l-10 7-10-7M2 15.5l10-7 10 7M12 2v6.5" />, true),
  },
  {
    name: "npm Profile",
    url: "https://www.npmjs.com/~sh20raj",
    desc: "Published developer packages",
    svg: icon(<path d="M0 7.334v8h11.5v-8h-11.5zm9.167 5.666h-1.167v-3.333h-1.167v3.333h-2.333v-5h4.667v5zm5.833-5.666v8h5.667v-3h1.167v-5h-6.834zm5 5h-1.167v-2.333h-1.167v2.333h-1.5v-3.333h3.834v3.333z" />),
  },
  {
    name: "Tip & Sponsor",
    url: "https://razorpay.me/@iamsh",
    desc: "Support open-source work via Razorpay",
    svg: icon(<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />, true),
  },
];

const highlights = [
  "Next.js App Router & Server Components expert",
  "Tailwind CSS, Radix UI & shadcn/ui custom layout builder",
  "PostgreSQL, Neon, Drizzle ORM, & serverless setups",
  "SaaS dashboards, auth integrations, & Razorpay checkouts",
  "AI APIs (OpenAI, Claude, Gemini) & autonomous workflows",
  "Remote-first contract & agency overflow sprint developer",
];

export default function HireMePage() {
  return (
    <div className="bg-background text-foreground" id="hire-me-page-root">
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-16 md:pt-24 md:pb-24">
        <div className="grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_auto] md:gap-16">
          <div>
            <h1 className="font-display text-4xl md:text-6xl leading-[1.05] text-foreground">
              Shaswat Raj
              <span className="block italic text-muted-foreground">Next.js & AI developer</span>
            </h1>
            <p className="mt-6 max-w-[58ch] text-lg leading-relaxed text-muted-foreground">
              I build landing pages, SaaS dashboards, AI tools, and MVPs for founders who need a working product, not a slide deck. Shipping fast using Next.js, TypeScript, Cloudflare, and custom AI setups.
            </p>
            <p className="mt-5 inline-flex items-center gap-2 text-sm text-foreground">
              <span className="size-2 rounded-full bg-success" aria-hidden="true" />
              Available for hire
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <a href="mailto:sh20raj@gmail.com">
                  <Mail className="size-4" strokeWidth={1.75} aria-hidden="true" />
                  sh20raj@gmail.com
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="https://sh20raj.github.io" target="_blank" rel="noopener noreferrer">
                  sh20raj.github.io
                  <ArrowUpRight className="size-4" strokeWidth={1.75} aria-hidden="true" />
                </a>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <a href="https://razorpay.me/@iamsh" target="_blank" rel="noopener noreferrer">
                  Tip & sponsor
                  <ArrowUpRight className="size-4" strokeWidth={1.75} aria-hidden="true" />
                </a>
              </Button>
            </div>
          </div>
          <div className="order-first md:order-none">
            <img
              src="https://sh20raj.github.io/profile.jpg"
              alt="Shaswat Raj"
              width={240}
              height={240}
              decoding="async"
              fetchPriority="high"
              className="size-28 rounded-2xl bg-muted object-cover md:size-60"
            />
          </div>
        </div>
      </section>

      {/* Expertise + channels */}
      <section className="border-t border-border">
        <div className="mx-auto grid max-w-7xl gap-14 px-4 sm:px-6 lg:px-8 py-16 md:py-24 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <h2 className="font-display text-3xl leading-tight text-foreground">Expertise</h2>
            <ul className="mt-8 space-y-4">
              {highlights.map((item) => (
                <li key={item} className="flex items-start gap-3 text-base leading-relaxed text-foreground">
                  <Check className="mt-1 size-4 shrink-0 text-success" strokeWidth={1.75} aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-7">
            <h2 className="font-display text-3xl leading-tight text-foreground">Channels & social links</h2>
            <ul className="mt-8 divide-y divide-border border-y border-border">
              {socialLinks.map((social) => (
                <li key={social.name}>
                  <a
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-4 py-4 transition-colors"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">
                      {social.svg}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-medium text-foreground transition-colors group-hover:text-primary">
                        {social.name}
                      </span>
                      <span className="block text-sm text-muted-foreground">{social.desc}</span>
                    </span>
                    <ArrowUpRight
                      className="size-4 shrink-0 text-muted-foreground transition-[color,transform] duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Closing */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <h2 className="max-w-[24ch] font-display text-3xl md:text-4xl leading-tight text-foreground">
            Need custom SaaS modules or landing pages built?
          </h2>
          <p className="mt-4 max-w-[58ch] text-lg leading-relaxed text-muted-foreground">
            Let&apos;s connect. I work sprint-based contract roles helping founders and teams push features to production quickly.
          </p>
          <Button asChild size="lg" className="mt-8">
            <a href="mailto:sh20raj@gmail.com">
              <Mail className="size-4" strokeWidth={1.75} aria-hidden="true" />
              Send an email inquiry
            </a>
          </Button>
        </div>
      </section>
    </div>
  );
}
