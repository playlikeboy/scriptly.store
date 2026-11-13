# ScriptlyHQ — Coding Agent Guidelines & Architecture Rules

This document outlines mandatory architectural patterns, security requirements, database standards, and coding conventions for AI agents and human contributors working inside the `playlikeboy/scriptly.store` codebase.

---

## 1. Stack & System Architecture

| Component | Technology | Canonical Entrypoint |
|---|---|---|
| **Runtime & Bundler** | Next.js 16+ (Turbopack, App Router) | [package.json](package.json) |
| **Edge Deployment** | OpenNext Cloudflare Worker | [open-next.config.ts](open-next.config.ts), [wrangler.jsonc](wrangler.jsonc) |
| **Database ORM** | Drizzle ORM | [schema.ts](src/db/schema.ts), [index.ts](src/db/index.ts) |
| **Database Instance** | Neon Serverless PostgreSQL | `DATABASE_URL` (.env / .dev.vars) |
| **Authentication** | Hexclave User Infrastructure (`@hexclave/next`) | [hexclave.ts](src/lib/hexclave.ts), [auth-utils.ts](src/lib/auth-utils.ts) |
| **Payments** | Razorpay Global Checkout & Webhooks | [orders.ts](src/lib/actions/orders.ts), [link-encoder.ts](src/lib/payments/link-encoder.ts) |
| **UI Styling** | Tailwind CSS v4 + "Paper & Ember" design system ([DESIGN.md](DESIGN.md)) | [globals.css](src/app/globals.css), [skeleton.tsx](src/components/ui/skeleton.tsx) |

---

## 2. Core Development Rules

### Rule 1: Database Pushdown for High Scalability
- **Never fetch entire tables into memory** using JavaScript `.filter()`, `.sort()`, or `.slice()`.
- **Always execute filtering, sorting, pagination, and counts directly in SQL** using Drizzle ORM:
  ```ts
  // Correct pattern in src/lib/actions/products.ts
  const [items, totalResult] = await Promise.all([
    db.select().from(products)
      .where(and(...conditions))
      .orderBy(sortExpr)
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` })
      .from(products)
      .where(and(...conditions)),
  ]);
  ```
- Use nested category routes for scalable directory hubs:
  - `/explore` (Universal catalog with query filters)
  - `/explore/[category]` (Dedicated category hub with subcategories)
  - `/explore/[category]/[subcategory]` (Targeted subcategory directory)

### Rule 2: Currency & Pricing Standardization
- **Catalog currency is USD.** Product prices, order amounts, coupons, payouts and affiliate commissions are stored as **integer US cents** (e.g. $29 is stored as `2900`). The switch lives in `CHECKOUT_CURRENCY.catalogCurrency` in [pricing.ts](src/config/pricing.ts).
- **Razorpay charges INR.** `createRazorpayOrderAction` in [orders.ts](src/lib/actions/orders.ts) converts the catalog amount to INR paise using the live USD→INR rate (fallback `95`). Razorpay Route transfers are in INR paise.
- **Display** every catalog amount with `formatPrice(cents)` (shows "Free" for 0) or `formatMoney(cents)` from [price-utils.ts](src/lib/price-utils.ts). Never hand-format with `toFixed` or hardcode `$`/`₹`.
- **Payment links are the exception.** `/pay` links and `payment_links` rows are real INR paise; format them with `formatPaiseToINR`.

### Rule 3: Authentication & Protected User Sessions
- Use [auth-utils.ts](src/lib/auth-utils.ts) for retrieving database users:
  - `getOrCreateDbUser()`: Verifies Hexclave session and syncs or retrieves the Neon database user record.
  - `isAdmin()`: Validates whether the active session user email matches `ADMIN_EMAILS`.
- Client-side auth UI is powered by `@hexclave/next`: `<UserButton />`, `useUser()`.

### Rule 4: Digital Asset Security & Private Storage
- Digital product ZIP archives are stored securely on the local filesystem under `/uploads` in the project root.
- Files under `/uploads` must **never** be served as static public assets.
- Downloads are served exclusively through the authenticated entitlement route:
  - Route: `/api/download/[productId]`
  - Validates completed purchase ownership in the `orders` table before streaming file bytes.

### Rule 5: Dynamic & Key-Encrypted Payment Links
- Public dynamic checkout: `/pay`
- Token encoder: [link-encoder.ts](src/lib/payments/link-encoder.ts)
  - Supports URL-safe Base64 JSON schema (`title`, `price`, `redirectUrl`, `description`, `currency`, `sig`).
  - Supports optional 256-bit AES-GCM symmetric key encryption (`k1.<iv>.<tag>.<ciphertext>`).
  - When accessing encrypted links without a key in query params, `/pay` presents [KeyUnlockCard.tsx](src/components/pay/KeyUnlockCard.tsx).
  - Pre-unlocked links can pass `&key=YOUR_KEY` to bypass the prompt.

### Rule 6: "Paper & Ember" Design System & Centralized Skeletons
- [DESIGN.md](DESIGN.md) is the visual source of truth: warm paper neutrals, ink default buttons, a single ember accent (`--primary`) reserved for purchase CTAs, links and focus; Geist sans, Newsreader serif display (`.font-display`), Geist Mono only for code/IDs.
- Never reintroduce the retired Duolingo look: no `border-b-4` press shadows, hard offset shadows, glassmorphism, gradient text, eyebrow labels, emoji icons, or hardcoded Tailwind palette colors.
- Every route with server-side data loading must have a dedicated `loading.tsx` powered by [skeleton.tsx](src/components/ui/skeleton.tsx).

### Rule 7: Cloudflare Deployment & OpenNext
- Production builds run via `@opennextjs/cloudflare`.
- Build & Deploy command: `bun run deploy`.
- Cloudflare environment bindings and variables are configured in `.dev.vars` and `wrangler.jsonc`.
- Avoid Node.js-only native packages that cannot run on Cloudflare Workers / workerd edge runtime unless polyfilled or shimmed by OpenNext.
