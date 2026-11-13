import { Metadata } from "next";
import Link from "next/link";
import { Mail, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Contact Support & Inquiries",
  description: "Get in touch with ScriptlyStore support for payment assistance, order issues, or custom SaaS development requests.",
  alternates: {
    canonical: "https://scriptly.store/contact",
  },
};

const FAQ = [
  {
    q: "When will I get files after payment?",
    a: "Instantly! You will be redirected to download links immediately, and they will be saved permanently in your dashboard.",
  },
  {
    q: "Can I request customization?",
    a: "Our templates are boilerplates. You can customize them or reach out to builders directly through contact coordinates.",
  },
];

export default function ContactPage() {
  return (
    <div className="bg-background text-foreground" id="contact-page-root">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {/* Header */}
        <header className="max-w-[60ch]">
          <h1 className="font-display text-3xl md:text-5xl leading-[1.1] text-foreground">
            Get in touch with ScriptlyStore
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            Need help with orders, payment validations, or builder tools? We are here to assist.
          </p>
        </header>

        {/* Primary contact */}
        <section aria-labelledby="coordinates-title" className="mt-12 rounded-2xl border border-border bg-card p-6 md:p-8">
          <h2 id="coordinates-title" className="sr-only">Merchant coordinates</h2>
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Email support</p>
              <a
                href="mailto:mail@scriptly.store"
                className="mt-1 inline-block font-display text-2xl md:text-3xl text-foreground transition-colors hover:text-primary"
              >
                mail@scriptly.store
              </a>
              <p className="mt-2 max-w-[52ch] text-sm leading-relaxed text-muted-foreground">
                Razorpay encrypted checkouts and Hexclave authorization provide security for client data.
              </p>
            </div>
            <Button asChild size="lg" className="self-start md:self-auto">
              <a href="mailto:mail@scriptly.store">
                <Mail className="size-4" strokeWidth={1.75} aria-hidden="true" /> Write to support
              </a>
            </Button>
          </div>
        </section>

        <div className="mt-16 grid gap-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-16">
          {/* FAQ */}
          <section aria-labelledby="faq-title">
            <h2 id="faq-title" className="font-display text-2xl text-foreground">Quick FAQ</h2>
            <dl className="mt-6 divide-y divide-border border-y border-border">
              {FAQ.map((item) => (
                <div key={item.q} className="py-5">
                  <dt className="text-base font-semibold text-foreground">{item.q}</dt>
                  <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.a}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-5 text-sm text-muted-foreground">
              Order or download issue? See the{" "}
              <Link href="/shipping" className="text-primary underline decoration-primary/40 hover:decoration-primary">delivery policy</Link>{" "}
              and{" "}
              <Link href="/refund" className="text-primary underline decoration-primary/40 hover:decoration-primary">refund policy</Link>.
            </p>
          </section>

          {/* Custom development */}
          <section aria-labelledby="custom-title">
            <h2 id="custom-title" className="font-display text-2xl text-foreground">
              Need custom development or AI automation?
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Looking to customize a boilerplate, build custom templates, or want to launch a brand new SaaS, website, landing page, or AI automation flow? Let&apos;s collaborate.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <a href="https://www.linkedin.com/in/sh20raj" target="_blank" rel="noopener noreferrer">
                  Connect on LinkedIn <ArrowUpRight className="size-4" strokeWidth={1.75} aria-hidden="true" />
                </a>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/hire-me">See services</Link>
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
