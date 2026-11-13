const FRICTIONS = [
  {
    title: "Forgotten repos",
    body: "Client deliverables and side projects get archived. The architecture you built earns nothing.",
  },
  {
    title: "Predatory marketplaces",
    body: "Legacy template sites take 50% to 70% commission and delay your payouts for months.",
  },
  {
    title: "Fulfilment friction",
    body: "Setting up merchant accounts, file delivery and licences takes weeks away from building.",
  },
  {
    title: "Audience barrier",
    body: "Posting a checkout link to 50 followers leads to silence. You need marketplace distribution.",
  },
];

const LEVERAGE = [
  {
    title: "A compounding asset",
    body: "A script you write once in January keeps earning. Code assets don’t expire like consulting hours.",
  },
  {
    title: "High buyer intent",
    body: "Developers don’t see your product as an expense. They see a 20-hour shortcut that pays for itself on day one.",
  },
  {
    title: "Reach without an audience",
    body: "You don’t need a big following. Scriptly’s search, categories and SEO bring active buyers to your product.",
  },
];

export default function CreatorProblemOpportunity() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <h2 className="font-display text-3xl leading-tight tracking-[-0.02em] text-balance text-foreground md:text-4xl">
              Your best code shouldn’t die in a private repository.
            </h2>
            <div className="mt-6 max-w-[60ch] space-y-4 text-base leading-relaxed text-muted-foreground">
              <p>
                Think about the code sitting in your GitHub right now: the battle-tested webhook handler, the scraper you
                spent days debugging, the complete SaaS starter kit.
              </p>
              <p>
                For you, it was another project milestone. For an engineer on a deadline,{" "}
                <strong className="font-medium text-foreground">it’s a 30-hour shortcut they’ll gladly pay for.</strong>
              </p>
            </div>
          </div>

          <dl className="divide-y divide-border border-y border-border lg:col-span-7">
            {FRICTIONS.map((f) => (
              <div key={f.title} className="grid grid-cols-1 gap-1 py-5 sm:grid-cols-[12rem_1fr] sm:gap-6">
                <dt className="text-sm font-medium text-foreground">{f.title}</dt>
                <dd className="text-sm leading-relaxed text-muted-foreground">{f.body}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-20 md:mt-28">
          <div className="max-w-[44rem]">
            <h2 className="font-display text-3xl leading-tight tracking-[-0.02em] text-balance text-foreground md:text-4xl">
              Code once. Sell to hundreds of builders.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Developer tools carry some of the best margins in commerce: no inventory, instant digital delivery, and no
              marginal cost per sale.
            </p>
          </div>
          <ul className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-10">
            {LEVERAGE.map((l) => (
              <li key={l.title} className="border-t border-foreground pt-5">
                <h3 className="text-base font-medium text-foreground">{l.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{l.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
