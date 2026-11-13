import Link from "next/link";
import { Button } from "@/components/ui/button";

const TERMS = [
  {
    term: "Your share",
    detail: "Keep 95% of direct sales. A 5% platform fee applies to direct storefront transactions.",
  },
  {
    term: "Listing cost",
    detail: "No upfront listing fees and no subscription to distribute your products.",
  },
  {
    term: "Delivery",
    detail: "Automated order fulfilment, receipts and secure file downloads, handled for you.",
  },
];

const STEPS = [
  { title: "Create the product", desc: "Title, category, tags and a semantic version." },
  { title: "Upload files", desc: "Source ZIP, demo link and screenshots." },
  { title: "Set pricing", desc: "Free or paid, with Razorpay checkout built in." },
  { title: "Get discovered", desc: "Listed across the catalogue, categories and search." },
  { title: "Get paid", desc: "Keep 95% of direct sales with automated creator payouts." },
];

export default function CreatorSection() {
  return (
    <section aria-labelledby="home-creator-title" className="bg-secondary">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-12 lg:gap-16 lg:px-8">
        <div className="lg:col-span-5">
          <h2
            id="home-creator-title"
            className="font-display text-4xl leading-[1.05] font-medium tracking-[-0.03em] text-balance text-foreground md:text-5xl"
          >
            You built it.
            <br />
            <span className="italic text-muted-foreground">Now sell it.</span>
          </h2>
          <p className="mt-5 max-w-[46ch] text-base leading-relaxed text-muted-foreground md:text-lg">
            Turn internal codebases, boilerplates, automation scripts and UI tools into revenue. Your
            storefront, your pricing, your customers.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild variant="accent" size="lg">
              <Link href="/creator">Start selling on Scriptly</Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="text-foreground">
              <Link href="/trust">How the split works</Link>
            </Button>
          </div>

          <dl className="mt-12 divide-y divide-border border-y border-border">
            {TERMS.map((item) => (
              <div key={item.term} className="grid grid-cols-1 gap-1 py-4 sm:grid-cols-[8rem_1fr] sm:gap-6">
                <dt className="text-sm font-medium text-foreground">{item.term}</dt>
                <dd className="text-sm leading-relaxed text-muted-foreground">{item.detail}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="lg:col-span-6 lg:col-start-7">
          <h3 className="text-sm font-medium text-foreground">From repository to checkout in five steps</h3>
          <ol className="mt-6 space-y-0">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="grid grid-cols-[2.5rem_1fr] gap-4 border-t border-border py-5 first:border-t-0 first:pt-0"
              >
                <span className="tabular font-display text-2xl leading-none text-muted-foreground" aria-hidden="true">
                  {index + 1}
                </span>
                <div>
                  <p className="text-base font-medium text-foreground">{step.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
