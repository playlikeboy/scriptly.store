const PRODUCT_TYPES = [
  {
    title: "SaaS starters & boilerplates",
    description: "Full-stack starters with auth, Neon database, Razorpay payments and email pipelines pre-wired.",
    priceRange: "₹2,499 – ₹6,999",
    tags: ["Next.js", "Drizzle", "Tailwind", "Razorpay"],
  },
  {
    title: "Backend scripts & scrapers",
    description: "Battle-tested scrapers, cron pipelines, webhook processors and API sync utilities that save hours.",
    priceRange: "₹999 – ₹2,999",
    tags: ["Python", "Node.js", "Puppeteer", "Docker"],
  },
  {
    title: "UI kits & design systems",
    description: "Component systems, dashboard widgets, chart templates and responsive layouts.",
    priceRange: "₹1,499 – ₹3,999",
    tags: ["React", "Tailwind v4", "Radix UI", "Framer"],
  },
  {
    title: "AI prompts & agent workflows",
    description: "RAG pipelines, LangChain chains, structured output schemas and production-tested system prompts.",
    priceRange: "₹499 – ₹1,999",
    tags: ["OpenAI", "Claude", "LangChain", "Vector DB"],
  },
  {
    title: "Developer CLIs & micro-tools",
    description: "Terminal tools, code generators, schema mappers, git hooks and productivity utilities.",
    priceRange: "₹799 – ₹1,999",
    tags: ["TypeScript", "Go", "Rust", "CLI"],
  },
  {
    title: "Marketing & landing pages",
    description: "Conversion-focused templates for developer tools, open-source libraries and waitlists.",
    priceRange: "₹1,299 – ₹3,499",
    tags: ["Next.js", "Astro", "Tailwind", "MDX"],
  },
];

export default function CreatorProductTypes() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <div className="max-w-[44rem]">
          <h2 className="font-display text-3xl leading-tight tracking-[-0.02em] text-balance text-foreground md:text-4xl">
            What you can sell on Scriptly
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            If it saves engineers time, it belongs here. These formats consistently command good prices.
          </p>
        </div>

        <div className="mt-10 border-t border-border">
          <div className="hidden grid-cols-12 gap-6 border-b border-border py-3 text-xs text-muted-foreground md:grid">
            <span className="col-span-4">Format</span>
            <span className="col-span-5">What buyers get</span>
            <span className="col-span-3 text-right">Typical price</span>
          </div>
          <ul className="divide-y divide-border border-b border-border">
            {PRODUCT_TYPES.map((type) => (
              <li key={type.title} className="grid grid-cols-1 gap-2 py-5 md:grid-cols-12 md:gap-6">
                <h3 className="text-base font-medium text-foreground md:col-span-4">{type.title}</h3>
                <div className="md:col-span-5">
                  <p className="text-sm leading-relaxed text-muted-foreground">{type.description}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{type.tags.join(" · ")}</p>
                </div>
                <p className="tabular text-sm text-foreground md:col-span-3 md:text-right">
                  <span className="text-muted-foreground md:hidden">Typical price: </span>
                  {type.priceRange}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
