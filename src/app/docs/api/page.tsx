import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "API Documentation",
  description: "Integrate ScriptlyStore products and blog feed into your applications using our public JSON API endpoints.",
};

interface Param {
  param: string;
  desc: string;
}

const ENDPOINTS: {
  id: string;
  title: string;
  intro: string;
  url: string;
  params: Param[];
}[] = [
  {
    id: "products",
    title: "Products JSON feed",
    intro: "Retrieve all published and approved products from the ScriptlyStore. Supports filtering by category, featured status, and limit.",
    url: "https://scriptly.store/api/products.json",
    params: [
      { param: "limit", desc: "Limit the number of results (e.g., ?limit=10)" },
      { param: "category", desc: "Filter by category slug (e.g., ?category=saas-templates)" },
      { param: "subcategory", desc: "Filter by subcategory slug" },
      { param: "slug", desc: "Fetch a specific product by slug" },
      { param: "featured", desc: "Set to 'true' to get featured products only" },
    ],
  },
  {
    id: "blog",
    title: "Blog JSON feed",
    intro: "Fetch the latest blog posts, guides, and tutorials from the ScriptlyStore blog.",
    url: "https://scriptly.store/api/blog.json",
    params: [
      { param: "limit", desc: "Number of posts to return" },
      { param: "category", desc: "Filter by blog category" },
      { param: "slug", desc: "Fetch a single post by slug" },
    ],
  },
];

const TOC = [
  ...ENDPOINTS.map((e) => ({ id: e.id, title: e.title })),
  { id: "response", title: "Response format" },
  { id: "limits", title: "Rate limiting & CORS" },
  { id: "payment-links", title: "Payment links" },
];

function Endpoint({ url }: { url: string }) {
  return (
    <div className="mt-5 flex items-start gap-3 overflow-x-auto rounded-xl border border-border bg-card px-4 py-3 font-mono text-sm">
      <span className="shrink-0 font-semibold text-success">GET</span>
      <span className="break-all text-foreground">{url}</span>
    </div>
  );
}

function ParamTable({ params }: { params: Param[] }) {
  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">Query parameters</caption>
        <thead>
          <tr className="border-b border-foreground/20 text-left">
            <th scope="col" className="w-36 py-2 pr-4 font-medium text-foreground">Parameter</th>
            <th scope="col" className="py-2 font-medium text-foreground">Description</th>
          </tr>
        </thead>
        <tbody>
          {params.map((p) => (
            <tr key={p.param} className="border-b border-border align-top">
              <td className="py-2.5 pr-4">
                <code className="rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[13px] text-foreground">{p.param}</code>
              </td>
              <td className="py-2.5 text-muted-foreground">{p.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ApiDocsPage() {
  return (
    <div className="bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-16 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
        <aside className="hidden lg:block">
          <nav aria-label="On this page" className="sticky top-24 text-sm">
            <h2 className="font-medium text-foreground">On this page</h2>
            <ol className="mt-3 space-y-2">
              {TOC.map((t) => (
                <li key={t.id}>
                  <a href={`#${t.id}`} className="block text-muted-foreground transition-colors hover:text-foreground">
                    {t.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <article className="min-w-0 max-w-[72ch]">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden="true" />
            Back to marketplace
          </Link>

          <header className="mt-8 border-b border-border pb-8">
            <h1 className="font-display text-3xl md:text-5xl leading-[1.1] text-foreground">Build with Scriptly data</h1>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              Integrate our marketplace products and blog feed directly into your applications using our public JSON endpoints.
            </p>
          </header>

          {ENDPOINTS.map((e) => (
            <section key={e.id} id={e.id} aria-labelledby={`${e.id}-title`} className="scroll-mt-24 pt-12">
              <h2 id={`${e.id}-title`} className="font-display text-2xl text-foreground">{e.title}</h2>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">{e.intro}</p>
              <Endpoint url={e.url} />
              <h3 className="mt-8 text-sm font-semibold text-foreground">Query parameters</h3>
              <ParamTable params={e.params} />
            </section>
          ))}

          <section id="response" aria-labelledby="response-title" className="scroll-mt-24 pt-12">
            <h2 id="response-title" className="font-display text-2xl text-foreground">Response format</h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              All endpoints return a standardized JSON structure including a success flag and the requested data array.
              Product amounts are in Indian Rupees: <code className="rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[13px] text-foreground">price</code> and{" "}
              <code className="rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[13px] text-foreground">effectivePrice</code> are integer paise, and the{" "}
              <code className="rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[13px] text-foreground">*Formatted</code> fields are rupee strings.
            </p>
            <figure className="mt-5 overflow-hidden rounded-xl border border-border bg-card">
              <figcaption className="border-b border-border px-4 py-2 font-mono text-xs text-muted-foreground">
                GET /api/products.json
              </figcaption>
              <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-foreground">
{`{
  "success": true,
  "count": 1,
  "products": [
    {
      "id": "nextjs-saas-kit",
      "title": "Premium SaaS Starter Kit",
      "slug": "nextjs-saas-kit",
      "price": 49900,
      "priceFormatted": "499.00",
      "effectivePrice": 39920,
      "effectivePriceFormatted": "399.20",
      "isFree": false,
      "thumbnail": "https://...",
      "storeName": "Scriptly Store",
      "url": "https://scriptly.store/products/nextjs-saas-kit",
      ...
    }
  ]
}`}
              </pre>
            </figure>
          </section>

          <section id="limits" aria-labelledby="limits-title" className="scroll-mt-24 pt-12">
            <h2 id="limits-title" className="font-display text-2xl text-foreground">Rate limiting & CORS</h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              Our public API supports Cross-Origin Resource Sharing (CORS) allowing you to fetch data directly from client-side React/Vue applications. While we don&apos;t require API keys yet, please use these endpoints responsibly.
            </p>
          </section>

          <section id="payment-links" aria-labelledby="payment-links-title" className="scroll-mt-24 pt-12">
            <h2 id="payment-links-title" className="font-display text-2xl text-foreground">Payment links</h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              Generate dynamic, optionally encrypted checkout links that open the hosted <code className="rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[13px] text-foreground">/pay</code> page.
            </p>
            <Link href="/docs/api/payment-links" className="mt-4 inline-flex text-sm font-medium text-primary hover:underline">
              Read the payment links guide
            </Link>
          </section>

          <footer className="mt-16 border-t border-border pt-8 text-sm text-muted-foreground">
            &copy; 2026 ScriptlyStore API. All rights reserved.
          </footer>
        </article>
      </div>
    </div>
  );
}
