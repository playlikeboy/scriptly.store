"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ProcessPrompt {
  id: string;
  title: string;
  category: string;
  summary: string;
  systemPrompt: string;
  schemaExample: string;
  implementationCode: string;
  keyEdgeCases: string[];
}

const PROCESS_PROMPTS: ProcessPrompt[] = [
  {
    id: "payment-links",
    title: "Dynamic & Encrypted Payment Links Engine",
    category: "Payments & Commerce",
    summary:
      "Generate zero-setup, tamper-proof payment links with guaranteed post-payment redirection. Supports URL-safe Base64 encoding, optional 256-bit AES key encryption, and REST API creation.",
    systemPrompt: `You are an expert developer commerce agent integrating ScriptlyStore's open payment links engine.

OBJECTIVE:
Generate or parse dynamic payment checkout links using ScriptlyStore's endpoint:
- Checkout Page: https://scriptly.store/pay?data={TOKEN}
- Or Plain Query: https://scriptly.store/pay?title={TITLE}&price={PRICE_IN_INR}&redirect={REDIRECT_URL}
- REST API: POST https://scriptly.store/api/pay/create

RULES & SCHEMA:
1. All monetary prices MUST be represented in Indian Rupee (INR ₹). Minimum price is ₹1.
2. The payload MUST conform to this exact JSON schema:
   {
     "title": "string (Required): Product or service name",
     "price": "number (Required): Amount in INR",
     "redirectUrl": "string (Required): Verified HTTP/HTTPS destination post-payment",
     "description": "string (Optional): Subtitle or deliverable notes",
     "currency": "INR",
     "sig": "string (Optional): HMAC-SHA256 signature for tamper verification"
   }
3. ENCODING OPTIONS:
   - Standard Base64: JSON stringify -> Base64 URL-safe (replace + with -, / with _, remove =).
   - Key-Protected AES: Encrypt with AES-256-GCM. Token prefix: "k1.<iv_hex>.<tag_hex>.<ciphertext_hex>".
     When accessed, buyer is prompted for the key, or pass &key={KEY} to unlock automatically.
4. VERIFICATION:
   - Calculate HMAC-SHA256 signature over: "\${title.trim()}|\${price}|\${redirectUrl.trim()}"
   - Reject any transaction where the signature does not match.`,
    schemaExample: `{
  "title": "Full-Stack SaaS Boilerplate",
  "price": 1499,
  "redirectUrl": "https://github.com/sh20raj/nexus-saas-template",
  "description": "Next.js 16 + TailwindCSS production starter kit",
  "currency": "INR",
  "sig": "e7b301f92a10cb5d"
}`,
    implementationCode: `// TypeScript / Node.js Helper
import crypto from "crypto";

export function createPaymentUrl(params: {
  title: string;
  price: number;
  redirectUrl: string;
  key?: string;
}) {
  const { title, price, redirectUrl, key } = params;

  if (key) {
    // AES-256-GCM Key Encryption
    const derivedKey = crypto.createHash("sha256").update(key).digest();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", derivedKey, iv);
    const json = JSON.stringify({ title, price, redirectUrl, currency: "INR" });
    let ct = cipher.update(json, "utf8", "hex");
    ct += cipher.final("hex");
    const tag = cipher.getAuthTag().toString("hex");
    const token = \`k1.\${iv.toString("hex")}.\${tag}.\${ct}\`;
    return \`https://scriptly.store/pay?data=\${token}&key=\${encodeURIComponent(key)}\`;
  }

  // URL-Safe Base64
  const payload = { title, price, redirectUrl, currency: "INR" };
  const token = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return \`https://scriptly.store/pay?data=\${token}\`;
}`,
    keyEdgeCases: [
      "Redirect URLs must include protocol (https://) or default to https automatically.",
      "If user enters wrong encryption key on /pay, KeyUnlockCard shows clear error state without crashing.",
      "Base64 padding must be safely normalized (+/- and _// replacements).",
    ],
  },
  {
    id: "product-publishing",
    title: "Product Packaging & Marketplace Publishing",
    category: "Inventory & Catalog",
    summary:
      "Automate digital product packaging, private ZIP archive placement under /uploads, database metadata indexing, and category/subcategory classification.",
    systemPrompt: `You are the ScriptlyStore Product Lifecycle & Asset Packaging Agent.

OBJECTIVE:
Validate, package, and insert new digital code products, SaaS templates, and developer scripts into the Neon PostgreSQL database via Drizzle ORM.

RULES & SCHEMA:
1. Product assets (ZIP packages) MUST be stored securely in the local private storage:
   Path: /uploads/{productId}.zip (NEVER exposed publicly, served only via /api/download/[productId]).
2. Drizzle Schema Model ('products' table):
   - id: text (cuid / uuid)
   - title: text (e.g. "Vetra AI Marketing SaaS")
   - slug: text (unique, url-friendly kebab-case)
   - description: text (markdown overview & tech specs)
   - price: integer (in paise, e.g. ₹999 = 99900 paise)
   - categoryId: text (references categories table)
   - subcategoryId: text (optional, references subcategories table)
   - creatorId: text (references users table)
   - status: "draft" | "pending" | "approved" | "rejected"
   - fileKey: text (relative path in /uploads)
   - demoUrl: text (optional live preview URL)
   - githubRepo: text (optional repository link)
3. SCALABILITY:
   - Use indexed category slugs: /explore/[category] and /explore/[category]/[subcategory]
   - All explore queries must push pagination and filters down to SQL using LIMIT and OFFSET.`,
    schemaExample: `{
  "title": "Nexus SaaS Template",
  "slug": "nexus-saas-template",
  "price": 199900,
  "currency": "INR",
  "category": "saas-templates",
  "subcategory": "nextjs",
  "fileKey": "/uploads/nexus-saas-template.zip",
  "techStack": ["Next.js 16", "Tailwind CSS", "Neon Postgres", "Drizzle ORM"]
}`,
    implementationCode: `// Drizzle Insertion Example
import { db } from "@/db";
import { products } from "@/db/schema";

export async function publishProduct(data: {
  title: string;
  slug: string;
  description: string;
  priceInRupees: number;
  categoryId: string;
  creatorId: string;
  fileKey: string;
}) {
  return await db.insert(products).values({
    title: data.title,
    slug: data.slug,
    description: data.description,
    price: Math.round(data.priceInRupees * 100), // convert to paise
    categoryId: data.categoryId,
    creatorId: data.creatorId,
    fileKey: data.fileKey,
    status: "approved",
    createdAt: new Date(),
  }).returning();
}`,
    keyEdgeCases: [
      "Slugs must be strictly unique. Generate a numerical suffix if a conflict occurs.",
      "Product prices must always be converted to paise when saving to SQL database.",
      "Downloads must verify completed order ownership before streaming bytes.",
    ],
  },
  {
    id: "razorpay-webhooks",
    title: "Razorpay Signature Verification & Webhook Handling",
    category: "Payments & Commerce",
    summary:
      "Authenticate payment callbacks, compute HMAC SHA-256 order signatures, fulfill orders, generate digital receipts, and trigger automated redirections.",
    systemPrompt: `You are the Razorpay Payment Verification & Fulfillment Agent for ScriptlyStore.

OBJECTIVE:
Verify client-side Razorpay payment signatures or incoming webhook events to prevent fraudulent order fulfillment.

RULES:
1. Signature Verification Formula:
   Expected Signature = HMAC_SHA256(
     message: "\${razorpay_order_id}|\${razorpay_payment_id}",
     secret: RAZORPAY_KEY_SECRET
   )
2. Comparison MUST use timingSafeEqual to guard against timing side-channel attacks.
3. Upon verified success:
   - Update order record status from "pending" to "completed".
   - Record paymentId, timestamp, and buyer contact details.
   - Record ledger split: 95% creator balance, 5% platform commission.
   - If dynamic payment link, redirect buyer to link's redirectUrl.`,
    schemaExample: `{
  "razorpay_order_id": "order_Q123456789ABCD",
  "razorpay_payment_id": "pay_P987654321WXYZ",
  "razorpay_signature": "4a7b9c1d2e3f4g5h6i7j8k9l0m1n2o3p4q5r6s7t8u9v0w1x2y3z"
}`,
    implementationCode: `import crypto from "crypto";

export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): boolean {
  const generatedSignature = crypto
    .createHmac("sha256", secret)
    .update(\`\${orderId}|\${paymentId}\`)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(generatedSignature),
    Buffer.from(signature)
  );
}`,
    keyEdgeCases: [
      "Buffer lengths must match before invoking timingSafeEqual to avoid ERR_CRYPTO_TIMING_SAFE_EQUAL_LENGTH.",
      "Never trust client-reported payment status without backend HMAC check or Razorpay API verification.",
      "Double webhook deliveries must be idempotent—check if order is already 'completed'.",
    ],
  },
  {
    id: "creator-payouts",
    title: "Creator Storefronts & 95/5 Commission Split",
    category: "Creators & Revenue",
    summary:
      "Enforce ScriptlyStore's developer-first 95% revenue share model. Calculate ledger balances, manage payouts, and power custom creator storefronts.",
    systemPrompt: `You are the ScriptlyStore Creator Revenue & Split Architecture Agent.

OBJECTIVE:
Calculate, allocate, and audit earnings splits for all digital sales across the marketplace.

BUSINESS LOGIC:
1. ScriptlyStore guarantees a 95% creator payout model on direct developer sales:
   - Creator Share = 95% of Net Sale Price
   - Platform Commission = 5% of Net Sale Price
2. Ledger Architecture:
   - Every completed order MUST create an immutable ledger transaction.
   - creator_ledger fields: id, creatorId, orderId, amount, splitRatio (0.95), platformFee, status ("pending" | "settled").
3. Creator Storefronts:
   - Accessible via /stores/[id] or custom slug.
   - Displays creator bio, verified badge, listed digital products, and total shipped assets.`,
    schemaExample: `{
  "orderAmount": 100000,
  "creatorSplit": 95000,
  "platformFee": 5000,
  "currency": "INR",
  "creatorId": "user_creator_sh20raj",
  "payoutMethod": "UPI / Razorpay Fund Account"
}`,
    implementationCode: `export function calculateCreatorSplit(grossAmountInPaise: number) {
  const creatorShare = Math.floor(grossAmountInPaise * 0.95);
  const platformFee = grossAmountInPaise - creatorShare;

  return {
    creatorShare,   // 95% in paise
    platformFee,    // 5% in paise
    grossAmount: grossAmountInPaise,
  };
}`,
    keyEdgeCases: [
      "Rounding issues: Always round down creator paise and allocate remaining difference to platform to ensure sum equals gross.",
      "Refunded orders must debit the creator's ledger balance or freeze corresponding pending payout.",
    ],
  },
  {
    id: "coupons-discounts",
    title: "Discount Engine & Coupon Campaigns",
    category: "Marketing & Growth",
    summary:
      "Validate and apply percent or flat INR discounts, calculate cart deductions, enforce redemption limits, and manage campaign schedules.",
    systemPrompt: `You are the ScriptlyStore Discount & Promotions Engine Agent.

OBJECTIVE:
Validate, evaluate, and deduct discount codes during customer checkout at /cart or /pay.

RULES:
1. Types:
   - "percentage": e.g. 20% off total cart value.
   - "flat": e.g. ₹200 off (deducted in paise).
2. Constraints:
   - Check isActive === true.
   - Check current time < expiresAt.
   - Check timesUsed < maxUses (if maxUses is set).
   - Check cart total >= minCartValue.
3. Return discounted total in INR and paise with clear discount breakdown.`,
    schemaExample: `{
  "code": "LAUNCH20",
  "discountType": "percentage",
  "discountValue": 20,
  "minCartValue": 50000,
  "maxUses": 100,
  "timesUsed": 14,
  "expiresAt": "2026-12-31T23:59:59Z"
}`,
    implementationCode: `export function calculateDiscount(cartTotalPaise: number, coupon: {
  discountType: "percentage" | "flat";
  discountValue: number;
}) {
  let discountPaise = 0;
  if (coupon.discountType === "percentage") {
    discountPaise = Math.round((cartTotalPaise * coupon.discountValue) / 100);
  } else {
    discountPaise = coupon.discountValue * 100; // flat in rupees -> paise
  }

  const finalTotal = Math.max(0, cartTotalPaise - discountPaise);
  return { discountPaise, finalTotal };
}`,
    keyEdgeCases: [
      "Discount cannot exceed order total; final payable amount cannot fall below ₹0.",
      "Atomic usage increments: Update timesUsed using atomic SQL increment (sql\`times_used + 1\`) to prevent race conditions.",
    ],
  },
  {
    id: "customer-support-downloads",
    title: "Secure Downloads & Protected Digital Asset Delivery",
    category: "Support & Security",
    summary:
      "Handle customer digital fulfillment, stream private assets via /api/download/[productId], verify user ownership, and resolve download disputes.",
    systemPrompt: `You are the ScriptlyStore Digital Asset Delivery & Customer Support Agent.

OBJECTIVE:
Validate download authorization and securely serve digital archive ZIP packages to verified customers.

SECURITY & WORKFLOW:
1. Endpoint: /api/download/[productId]
2. Verification Pipeline:
   - Extract authenticated user session via getOrCreateDbUser().
   - Query orders table for (userId == user.id AND productId == productId AND status == 'completed').
   - If no valid order exists, return 403 Forbidden with helpful purchase redirect.
   - If valid order exists, stream file from /uploads/{productId}.zip with Content-Disposition: attachment.
3. Support Inquiries:
   - Verify paymentId in Razorpay dashboard if customer claims payment completed but order shows pending.`,
    schemaExample: `{
  "productId": "prod_vetra_ai",
  "userId": "user_2xABC123",
  "hasCompletedOrder": true,
  "fileSize": "14.2 MB",
  "downloadLimit": "unlimited"
}`,
    implementationCode: `// Protected Download Handler
import { db } from "@/db";
import { orders, products } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

export async function handleProtectedDownload(userId: string, productId: string) {
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.userId, userId), eq(orders.productId, productId), eq(orders.status, "completed")));

  if (!order) {
    return new NextResponse("Unauthorized: No completed purchase found.", { status: 403 });
  }

  const filePath = path.join(process.cwd(), "uploads", \`\${productId}.zip\`);
  if (!fs.existsSync(filePath)) {
    return new NextResponse("File archive not found.", { status: 404 });
  }

  const fileStream = fs.createReadStream(filePath);
  return new NextResponse(fileStream as any, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": \`attachment; filename="\${productId}.zip"\`,
    },
  });
}`,
    keyEdgeCases: [
      "Path traversal protection: Sanitize productId to prevent ../ directory escaping.",
      "Verify file exists on disk before attempting to stream to prevent server hangs.",
    ],
  },
];


type CopyTarget = { key: string; text: string; label: string };

function CopyButton({
  target,
  copiedKey,
  onCopy,
  variant = "ghost",
  children,
}: {
  target: CopyTarget;
  copiedKey: string | null;
  onCopy: (target: CopyTarget) => void;
  variant?: "ghost" | "default";
  children?: React.ReactNode;
}) {
  const copied = copiedKey === target.key;
  return (
    <Button type="button" size="sm" variant={variant} onClick={() => onCopy(target)} aria-live="polite">
      {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      {copied ? "Copied" : children ?? "Copy"}
    </Button>
  );
}

const codeBlock =
  "max-h-[60vh] overflow-auto rounded-xl bg-secondary p-4 font-mono text-xs leading-relaxed text-foreground sm:p-5";

export default function PromptsManagerClient() {
  const [activeProcessId, setActiveProcessId] = useState<string>("payment-links");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const query = searchQuery.trim().toLowerCase();
  const filteredProcesses = query
    ? PROCESS_PROMPTS.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.summary.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query)
      )
    : PROCESS_PROMPTS;

  const activeProcess = PROCESS_PROMPTS.find((p) => p.id === activeProcessId) || PROCESS_PROMPTS[0];

  const handleCopy = ({ key, text, label }: CopyTarget) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedKey(key);
        toast.success(`${label} copied`);
        window.setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 2000);
      })
      .catch(() => toast.error("Clipboard is unavailable in this browser."));
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 max-w-2xl">
          <h1 className="font-display text-3xl text-balance text-foreground md:text-4xl">Process prompt docs</h1>
          <p className="mt-2 text-sm text-pretty text-muted-foreground">
            Production-ready prompts, JSON schemas and code implementations for each ScriptlyStore process.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <a href="/docs/api/payment-links" target="_blank" rel="noreferrer">
              Public API docs
              <ExternalLink aria-hidden="true" />
            </a>
          </Button>
          <Button asChild variant="secondary">
            <a href="/admin/payment-links">Payment links tool</a>
          </Button>
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Process index */}
        <aside className="min-w-0 space-y-3 lg:sticky lg:top-20">
          <div className="relative">
            <label htmlFor="prompt-search" className="sr-only">
              Search processes
            </label>
            <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="prompt-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search processes"
              className="h-10 w-full rounded-[10px] border border-input bg-card pr-3 pl-9 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </div>

          <nav aria-label="Processes" className="overflow-hidden rounded-2xl border border-border bg-card">
            {filteredProcesses.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">No process matches “{searchQuery}”.</p>
            ) : (
              <ul className="divide-y divide-border">
                {filteredProcesses.map((proc) => {
                  const isActive = proc.id === activeProcess.id;
                  return (
                    <li key={proc.id}>
                      <button
                        type="button"
                        onClick={() => setActiveProcessId(proc.id)}
                        aria-current={isActive ? "true" : undefined}
                        className={cn(
                          "block w-full px-4 py-3 text-left transition-colors outline-none focus-visible:bg-secondary",
                          isActive ? "bg-secondary" : "hover:bg-secondary/50"
                        )}
                      >
                        <span className={cn("block text-sm leading-snug", isActive ? "font-medium text-foreground" : "text-foreground")}>
                          {proc.title}
                        </span>
                        <span className={cn("mt-0.5 block text-xs", isActive ? "text-primary" : "text-muted-foreground")}>
                          {proc.category}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </nav>
        </aside>

        {/* Active process */}
        <article aria-labelledby="active-process-title" className="min-w-0 rounded-2xl border border-border bg-card">
          <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-start sm:justify-between sm:p-6">
            <div className="min-w-0 space-y-1.5">
              <p className="text-xs text-muted-foreground">
                {activeProcess.category} · <span className="font-mono text-[11px]">{activeProcess.id}</span>
              </p>
              <h2 id="active-process-title" className="text-xl font-semibold tracking-tight text-balance text-foreground">
                {activeProcess.title}
              </h2>
              <p className="max-w-[68ch] text-sm leading-relaxed text-muted-foreground">{activeProcess.summary}</p>
            </div>
            <div className="shrink-0">
              <CopyButton
                variant="default"
                target={{ key: `prompt-${activeProcess.id}`, text: activeProcess.systemPrompt, label: "System prompt" }}
                copiedKey={copiedKey}
                onCopy={handleCopy}
              >
                Copy agent prompt
              </CopyButton>
            </div>
          </div>

          <Tabs key={activeProcess.id} defaultValue="prompt" className="p-4 sm:p-6">
            <div className="-mx-1 overflow-x-auto px-1 scrollbar-none">
              <TabsList className="mb-4">
                <TabsTrigger value="prompt">System prompt</TabsTrigger>
                <TabsTrigger value="schema">JSON schema</TabsTrigger>
                <TabsTrigger value="code">Implementation</TabsTrigger>
                <TabsTrigger value="edge-cases">Edge cases</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="prompt" className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Instructions for an AI coding agent (Claude, Antigravity or GPT).</p>
                <CopyButton
                  target={{ key: `prompt-inner-${activeProcess.id}`, text: activeProcess.systemPrompt, label: "Prompt" }}
                  copiedKey={copiedKey}
                  onCopy={handleCopy}
                />
              </div>
              <pre className={cn(codeBlock, "whitespace-pre-wrap")}>{activeProcess.systemPrompt}</pre>
            </TabsContent>

            <TabsContent value="schema" className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Payload and contract data structure.</p>
                <CopyButton
                  target={{ key: `schema-${activeProcess.id}`, text: activeProcess.schemaExample, label: "Schema" }}
                  copiedKey={copiedKey}
                  onCopy={handleCopy}
                />
              </div>
              <pre className={codeBlock}>{activeProcess.schemaExample}</pre>
            </TabsContent>

            <TabsContent value="code" className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Production reference code (TypeScript / Node.js).</p>
                <CopyButton
                  target={{ key: `code-${activeProcess.id}`, text: activeProcess.implementationCode, label: "Code snippet" }}
                  copiedKey={copiedKey}
                  onCopy={handleCopy}
                />
              </div>
              <pre className={codeBlock}>{activeProcess.implementationCode}</pre>
            </TabsContent>

            <TabsContent value="edge-cases" className="space-y-3">
              <p className="text-sm text-muted-foreground">Critical guardrails and production edge cases.</p>
              <ul className="divide-y divide-border rounded-xl border border-border">
                {activeProcess.keyEdgeCases.map((edgeCase) => (
                  <li key={edgeCase} className="px-4 py-3 text-sm leading-relaxed text-foreground">
                    {edgeCase}
                  </li>
                ))}
              </ul>
            </TabsContent>
          </Tabs>
        </article>
      </div>
    </div>
  );
}
