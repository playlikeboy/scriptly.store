import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About Us — Our Mission & Story | ScriptlyStore",
  description: "Discover how ScriptlyStore was founded to help developers bypass infrastructure setup, launch projects faster, and retain 95% of sales.",
  alternates: {
    canonical: "https://scriptly.store/about",
  },
};

const VALUES = [
  {
    title: "Our mission",
    body: "We help founders and developers launch products in hours instead of weeks. By aggregating top-tier SaaS templates, extensions, and ebooks, we streamline early startup execution.",
  },
  {
    title: "Vetted quality",
    body: "We strictly vet every script, UI kit, and document. No junk, no outdated setups. Everything in our library compiles, runs, and is production-ready out-of-the-box.",
  },
  {
    title: "Builder first",
    body: "We charge minimal commission fees to builders, providing creators and developers a clean channel to monetize their digital crafts and bootstrap SaaS kits.",
  },
  {
    title: "Global network",
    body: "ScriptlyStore is backed by a global network of solo builders. We construct and deploy modern developer boilerplates, tools, widgets, and instructional guides worldwide.",
  },
];

const team = [
  {
    name: "Shaswat Raj",
    role: "Founder & Lead Architect",
    bio: "Full-stack engineer and product builder. Created ScriptlyStore to solve the repetitive pain of boilerplate setups for developers.",
    github: "https://github.com/SH20RAJ",
    twitter: "https://x.com/ShaswatBuilds",
    sponsor: "https://razorpay.me/@iamsh",
  },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function AboutPage() {
  return (
    <div className="bg-background text-foreground" id="about-page-root">
      {/* AboutPage JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "AboutPage",
            "name": "About ScriptlyStore",
            "description": "Discover how ScriptlyStore was founded to help developers bypass infrastructure setup, launch projects faster, and retain 95% of sales.",
            "publisher": {
              "@type": "Organization",
              "name": "ScriptlyStore",
              "logo": "https://scriptly.store/logo.png"
            },
            "url": "https://scriptly.store/about"
          })
        }}
      />
      {/* BreadcrumbList JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://scriptly.store/"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "About Us",
                "item": "https://scriptly.store/about"
              }
            ]
          })
        }}
      />

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-12 md:pt-24 md:pb-16">
        <h1 className="max-w-[18ch] font-display text-4xl md:text-6xl leading-[1.05] text-foreground">
          Accelerating developer startup velocity.
        </h1>
        <p className="mt-6 max-w-[60ch] text-lg leading-relaxed text-muted-foreground">
          ScriptlyStore is a curated digital marketplace designed specifically for builders, developers, and indie founders who value speed, aesthetics, and clean code.
        </p>
      </section>

      {/* Founder story */}
      <section aria-labelledby="story-title" className="border-t border-border">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:px-8 py-16 md:grid-cols-[minmax(0,1fr)_minmax(0,68ch)] md:gap-16 md:py-24">
          <h2 id="story-title" className="font-display text-3xl md:text-4xl leading-tight text-foreground">
            Tired of rebuilding the plumbing
          </h2>
          <div className="space-y-5 text-[1.0625rem] leading-[1.75] text-foreground/85">
            <p>
              Like most developers, we had a directory full of unfinished side projects. Every time a new idea struck, we spent the first weekend configuring PostgreSQL connection pooling, coding auth routes, writing email triggers, and setting up payment webhooks.
            </p>
            <p>
              By the time we got to the actual product feature, the weekend was over and the initial excitement had faded. We realized developers shouldn&apos;t have to keep writing the same generic codebases.
            </p>
            <p>
              We built <strong className="font-semibold text-foreground">ScriptlyStore</strong> to act as a repository of production-ready boilerplates, high-converting landing pages, and serverless scripts. Our goal is to let developers skip the setup phase, launch in hours, and sell their own code keeping <strong className="font-semibold text-foreground">95% of the revenue</strong>.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section aria-labelledby="values-title" className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <h2 id="values-title" className="font-display text-3xl md:text-4xl leading-tight text-foreground">
            What we hold to
          </h2>
          <dl className="mt-10 grid gap-x-16 gap-y-10 sm:grid-cols-2">
            {VALUES.map((v) => (
              <div key={v.title} className="border-t border-foreground/15 pt-5">
                <dt className="text-lg font-semibold text-foreground">{v.title}</dt>
                <dd className="mt-2 max-w-[52ch] text-base leading-relaxed text-muted-foreground">{v.body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Team */}
      <section aria-labelledby="team-title" className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <h2 id="team-title" className="font-display text-3xl md:text-4xl leading-tight text-foreground">
            Meet the builders
          </h2>
          <p className="mt-3 max-w-[60ch] text-base text-muted-foreground">
            The core engineers, designers, and growth guides keeping the engine running.
          </p>

          <ul className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {team.map((t) => (
              <li key={t.name} className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center gap-4">
                  <span
                    aria-hidden="true"
                    className="flex size-12 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-lg text-foreground"
                  >
                    {initials(t.name)}
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">{t.name}</h3>
                    <p className="text-sm text-muted-foreground">{t.role}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{t.bio}</p>
                <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-4 text-sm">
                  <a href={t.github} target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary transition-colors">GitHub</a>
                  <a href={t.twitter} target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary transition-colors">Twitter</a>
                  <a href={t.sponsor} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Tip &amp; sponsor</a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Closing */}
      <section className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 sm:px-6 lg:px-8 py-16 md:flex-row md:items-center md:justify-between md:py-20">
          <p className="max-w-[40ch] font-display text-2xl md:text-3xl leading-snug text-foreground">
            Skip the setup phase. Launch in hours.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/explore">
                Explore the catalog <ArrowRight className="size-4" strokeWidth={1.75} aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/contact">Contact us</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
