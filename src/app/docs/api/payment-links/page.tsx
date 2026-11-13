import { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, ArrowUpRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Open Payment Links API Documentation | ScriptlyStore",
  description: "Learn how to generate instant, zero-setup payment links with post-payment redirects using ScriptlyStore's open API and encoded URLs.",
};

const FEATURES = [
  {
    title: "No authentication needed",
    body: "Anyone—even logged-out developers—can construct a URL or call the API to collect payments.",
  },
  {
    title: "Automatic redirection",
    body: "Upon Razorpay signature verification, the customer is immediately redirected to your target destination.",
  },
  {
    title: "256-bit encrypted",
    body: "Payments are processed via official Razorpay SDK with HMAC SHA-256 server-side signature validation.",
  },
];

const PARAMS: { name: string; type: string; required: string; desc: ReactNode }[] = [
  { name: "title", type: "string", required: "Yes", desc: <>Product, service, or call title shown to buyer. (Alias: <C>name</C>)</> },
  { name: "price", type: "number", required: "Yes", desc: <>Price in INR (e.g. <C>499</C> or <C>1500</C>). (Alias: <C>prize</C>)</> },
  { name: "redirect", type: "string (URL)", required: "Yes", desc: <>Destination URL to redirect buyer after verified payment. (Alias: <C>redirectUrl</C>)</> },
  { name: "data", type: "string", required: "No*", desc: <>Base64 encoded payload or AES encrypted token (<C>k1....</C>). Replaces title, price, and redirect parameters.</> },
  { name: "key", type: "string", required: "No", desc: <>Decryption key/passphrase for AES-encrypted tokens. Automatically unlocks the checkout without user input. (Alias: <C>secret</C>)</> },
  { name: "desc", type: "string", required: "No", desc: <>Optional short explanation displayed on checkout card. (Alias: <C>description</C>)</> },
];

const TOC = [
  { id: "encoded-url", title: "Method 1: Encoded URL" },
  { id: "parameters", title: "Query parameters" },
  { id: "rest-api", title: "Method 2: REST API" },
  { id: "javascript", title: "JavaScript / TypeScript" },
];

function C({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">{children}</code>
  );
}

function CodeBlock({ label, children }: { label?: string; children: string }) {
  return (
    <figure className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
      {label && (
        <figcaption className="border-b border-border px-4 py-2 text-xs text-muted-foreground">{label}</figcaption>
      )}
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-foreground">
        <code>{children}</code>
      </pre>
    </figure>
  );
}

function Pattern({ title, url, children }: { title: string; url: string; children?: ReactNode }) {
  return (
    <div className="border-t border-border pt-6">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <pre className="mt-3 overflow-x-auto rounded-xl border border-border bg-card px-4 py-3 font-mono text-[13px] text-foreground">
        {url}
      </pre>
      {children && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{children}</p>}
    </div>
  );
}

export default function PaymentLinksDocPage() {
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
          <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link href="/docs/api" className="inline-flex items-center gap-1 transition-colors hover:text-foreground">
                  <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden="true" /> API docs
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-foreground">Payment links</li>
            </ol>
          </nav>

          <header className="mt-8 border-b border-border pb-8">
            <h1 className="font-display text-3xl md:text-5xl leading-[1.1] text-foreground">
              Payment links & instant checkouts
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              Create zero-setup payment links with Razorpay processing and guaranteed post-payment redirection. Open to everyone—no API keys or signups required.
            </p>
            <ul className="mt-8 space-y-4">
              {FEATURES.map((f) => (
                <li key={f.title} className="flex items-start gap-3">
                  <Check className="mt-1 size-4 shrink-0 text-success" strokeWidth={1.75} aria-hidden="true" />
                  <p className="text-base leading-relaxed">
                    <span className="font-semibold text-foreground">{f.title}.</span>{" "}
                    <span className="text-muted-foreground">{f.body}</span>
                  </p>
                </li>
              ))}
            </ul>
          </header>

          {/* Method 1 */}
          <section id="encoded-url" aria-labelledby="encoded-url-title" className="scroll-mt-24 pt-12">
            <h2 id="encoded-url-title" className="font-display text-2xl text-foreground">Method 1: Direct encoded URL</h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              The simplest approach. No code or server required—just construct a link with query parameters.
            </p>

            <div className="mt-8 space-y-8">
              <Pattern title="Pattern 1: Base64 encoded (signed or plain schema)" url="https://scriptly.store/pay?data=BASE64_ENCODED_PAYLOAD">
                Conceals price and destination parameters in a URL-safe Base64 token conforming to the JSON schema below. Supports optional HMAC-SHA256 signature verification.
              </Pattern>
              <Pattern title="Pattern 2: Key-protected (AES-256-GCM encrypted)" url="https://scriptly.store/pay?data=k1.IV.TAG.CIPHERTEXT">
                Encrypted using a secret key. Buyers are prompted for the key on checkout, or pass <C>&key=YOUR_SECRET_KEY</C> to unlock automatically.
              </Pattern>
              <Pattern title="Pattern 3: Plain query string" url="https://scriptly.store/pay?title=YOUR_TITLE&price=PRICE_IN_INR&redirect=REDIRECT_URL" />
            </div>

            <h3 className="mt-10 text-base font-semibold text-foreground">Base64 payload schema</h3>
            <p className="mt-1 text-sm text-muted-foreground">UTF-8 JSON string, Base64 encoded.</p>
            <CodeBlock label="payload.json">
{`{
  "title": "Architecture Review",        // [Required] string: Product or service name
  "price": 1499,                         // [Required] number: Amount in INR (₹)
  "redirectUrl": "https://example.com",  // [Required] string: Target URL after payment
  "description": "Optional notes",       // [Optional] string: Subtitle displayed on card
  "currency": "INR",                     // [Optional] string: Defaults to "INR"
  "sig": "a1b2c3d4e5f67890"              // [Optional] string: HMAC-SHA256 signature
}`}
            </CodeBlock>
          </section>

          <section id="parameters" aria-labelledby="parameters-title" className="scroll-mt-24 pt-12">
            <h2 id="parameters-title" className="font-display text-2xl text-foreground">Query parameters</h2>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-foreground/20">
                    <th scope="col" className="py-2 pr-4 font-medium text-foreground">Parameter</th>
                    <th scope="col" className="py-2 pr-4 font-medium text-foreground">Type</th>
                    <th scope="col" className="py-2 pr-4 font-medium text-foreground">Required</th>
                    <th scope="col" className="py-2 font-medium text-foreground">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {PARAMS.map((p) => (
                    <tr key={p.name} className="border-b border-border align-top">
                      <td className="py-2.5 pr-4"><C>{p.name}</C></td>
                      <td className="py-2.5 pr-4 whitespace-nowrap text-muted-foreground">{p.type}</td>
                      <td className={p.required === "Yes" ? "py-2.5 pr-4 font-medium text-foreground" : "py-2.5 pr-4 text-muted-foreground"}>
                        {p.required}
                      </td>
                      <td className="py-2.5 text-muted-foreground">{p.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Live working example</p>
                <p className="text-sm text-muted-foreground">Open the live hosted checkout card in a new tab.</p>
              </div>
              <Button asChild variant="outline" size="sm" className="self-start sm:self-auto">
                <a href="/pay?title=Architecture+Review&price=999&redirect=https%3A%2F%2Fexample.com%2Fbooking" target="_blank" rel="noopener noreferrer">
                  Try example <ArrowUpRight className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
                </a>
              </Button>
            </div>
          </section>

          {/* Method 2 */}
          <section id="rest-api" aria-labelledby="rest-api-title" className="scroll-mt-24 pt-12">
            <h2 id="rest-api-title" className="font-display text-2xl text-foreground">Method 2: REST API endpoint</h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              Programmatically create stored payment links with clean slugs from your backend, webhooks, or scripts.
            </p>
            <div className="mt-5 flex items-start gap-3 overflow-x-auto rounded-xl border border-border bg-card px-4 py-3 font-mono text-sm">
              <span className="shrink-0 font-semibold text-success">POST</span>
              <span className="break-all text-foreground">https://scriptly.store/api/pay/create</span>
            </div>

            <CodeBlock label="cURL example">
{`curl -X POST https://scriptly.store/api/pay/create \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "API Access Pass",
    "price": 799,
    "redirectUrl": "https://myapp.com/onboarding?token=abc123xyz",
    "description": "Lifetime access to REST endpoints."
  }'`}
            </CodeBlock>

            <CodeBlock label="JSON response">
{`{
  "success": true,
  "message": "Payment link created successfully",
  "data": {
    "id": "pl_8f9e2b10a4",
    "slug": "api-access-pass-7d2a",
    "url": "https://scriptly.store/pay/api-access-pass-7d2a",
    "dynamicUrl": "https://scriptly.store/pay?title=API+Access+Pass&price=799...",
    "price": 799,
    "currency": "INR",
    "redirectUrl": "https://myapp.com/onboarding?token=abc123xyz"
  }
}`}
            </CodeBlock>
          </section>

          <section id="javascript" aria-labelledby="javascript-title" className="scroll-mt-24 pt-12">
            <h2 id="javascript-title" className="font-display text-2xl text-foreground">JavaScript / TypeScript integration</h2>
            <CodeBlock label="create-link.ts">
{`// Generate payment link from your frontend or server
const response = await fetch("https://scriptly.store/api/pay/create", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    title: "1-on-1 Mentorship",
    price: 1200,
    redirectUrl: "https://calendar.google.com/calendar/u/0/r",
    description: "45-minute live mentorship session",
  }),
});

const { data } = await response.json();
console.log("Send buyer to:", data.url);
// Redirect user: window.location.href = data.url;`}
            </CodeBlock>
          </section>
        </article>
      </div>
    </div>
  );
}
