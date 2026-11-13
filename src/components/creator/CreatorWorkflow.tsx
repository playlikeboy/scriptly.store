const STEPS = [
  {
    title: "Package your code",
    description: "Take a working repo, remove hardcoded secrets, add a .env.example and write a concise README.",
  },
  {
    title: "Create the listing",
    description: "Add a title, stack tags, screenshots or a live demo link, and upload your ZIP package.",
  },
  {
    title: "Set your price",
    description: "Choose your price in rupees. Direct sales route 95% of every transaction to your balance.",
  },
  {
    title: "Get discovered",
    description: "Your product appears in Scriptly’s curated marketplace, is indexed by search engines and found by builders.",
  },
  {
    title: "Delivery runs itself",
    description: "When someone buys, Scriptly verifies payment, issues secure download access and routes your payout.",
  },
];

export default function CreatorWorkflow() {
  return (
    <section className="border-b border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <h2 className="font-display text-3xl leading-tight tracking-[-0.02em] text-balance text-foreground md:text-4xl">
              From local repo to first sale in five steps
            </h2>
            <p className="mt-4 max-w-[44ch] text-base leading-relaxed text-muted-foreground">
              No three-week verification queue. If your code works and passes review, you can start selling.
            </p>
          </div>

          <ol className="divide-y divide-border border-y border-border lg:col-span-8">
            {STEPS.map((step, i) => (
              <li key={step.title} className="grid grid-cols-[2.5rem_1fr] gap-4 py-5 sm:grid-cols-[3rem_14rem_1fr] sm:gap-6">
                <span aria-hidden className="tabular font-display text-2xl leading-none text-muted-foreground">
                  {i + 1}
                </span>
                <h3 className="text-base font-medium text-foreground">{step.title}</h3>
                <p className="col-start-2 text-sm leading-relaxed text-muted-foreground sm:col-start-3">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
