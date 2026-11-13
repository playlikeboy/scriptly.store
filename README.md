<div align="center">

<img src="public/favicon.svg" width="56" height="56" alt="ScriptlyStore" />

# ScriptlyStore

**A curated marketplace for production-ready code.**
SaaS templates, automation scripts, landing pages, UI kits and developer tools — bought once, shipped today.

[scriptly.store](https://scriptly.store) · [Explore](https://scriptly.store/explore) · [Sell on Scriptly](https://scriptly.store/creator) · [Payment Links API](https://scriptly.store/docs/api/payment-links)

![Next.js 16](https://img.shields.io/badge/Next.js-16-17140F?style=flat-square&logo=next.js&logoColor=F7F6F2)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-17140F?style=flat-square&logo=cloudflare&logoColor=F7F6F2)
![Neon Postgres](https://img.shields.io/badge/Neon-Postgres-17140F?style=flat-square&logo=postgresql&logoColor=F7F6F2)
![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-17140F?style=flat-square&logo=drizzle&logoColor=F7F6F2)
![Razorpay](https://img.shields.io/badge/Razorpay-Checkout-C2410C?style=flat-square&logo=razorpay&logoColor=FFFBF5)

</div>

---

## What it is

ScriptlyStore is an edge-rendered marketplace where developers buy and sell code they would otherwise spend weeks writing. Every listing is a real, downloadable asset with screenshots, a stated license, and delivery gated behind a verified purchase.

Creators keep **95% of direct sales**. Affiliates earn on referred sales. Prices are listed in **US dollars** and Razorpay charges the INR equivalent at checkout.

| For buyers | For creators | For developers |
|---|---|---|
| Browse by category and subcategory, filter, sort, and buy in one step. | A studio for listings, coupons, payouts, a sales ledger and a public storefront. | Dynamic and AES-GCM encrypted payment links, a public products JSON feed, and an agent/MCP API. |

## Design

The interface follows **Paper & Ember** — a warm, editorial system built for scanning code products quickly. Paper-toned surfaces and dense ink type keep the focus on product screenshots and prices, and a single ember accent marks where money moves. Headlines use Newsreader, the interface uses Geist, and code uses Geist Mono.

The full specification lives in [`DESIGN.md`](DESIGN.md).

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack, React 19 Server Components) |
| Runtime | Cloudflare Workers via [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare) |
| Database | Neon serverless Postgres + Drizzle ORM |
| Auth | Hexclave (`@hexclave/next`) |
| Payments | Razorpay orders, signature verification and webhooks (USD catalog, INR charge) |
| UI | Tailwind CSS v4, Radix/Base UI primitives, lucide icons |

## Architecture notes

- **SQL does the work.** Filtering, sorting, pagination and counts run in Postgres, never in JavaScript over full tables.
- **Server-first rendering.** Pages are Server Components. Client code is limited to interactive leaves such as the cart, checkout, and filters.
- **Money is integers.** Catalog amounts are stored in US cents. The server recomputes prices from the database and converts them to INR paise at the live rate before creating a Razorpay order.
- **Private assets.** Archives are never public. `/api/download/[productId]` streams a file only after the buyer's completed order has been verified.
- **Encrypted payment links.** `/pay` accepts signed Base64 tokens or `k1.<iv>.<tag>.<ciphertext>` AES-256-GCM tokens. A key can be entered on the page or passed as `&key=`.

```text
src/
├── app/                 Routes: explore, products, cart, pay, blog, docs, creator studio, admin
│   └── api/             download, pay/create, webhooks/razorpay, coupons, products.json, agents
├── components/          Feature components; ui/ holds primitives and the Skeleton
├── db/                  Drizzle schema and Neon client
├── lib/actions/         Server actions: products, orders, payment links, affiliates, payouts
└── lib/payments/        Payment link encoder (Base64 / AES-GCM)
```

## Getting started

Prerequisites: [Bun](https://bun.sh) 1.1+, a [Neon](https://neon.tech) database, [Razorpay](https://razorpay.com) keys and a [Hexclave](https://hexclave.com) project.

```bash
git clone https://github.com/playlikeboy/scriptly.store.git
cd scriptly.store
bun install
```

Create `.env` (Next.js) and `.dev.vars` (Wrangler) with:

```env
DATABASE_URL=postgresql://user:pass@ep-host.neon.tech/neondb?sslmode=require

NEXT_PUBLIC_HEXCLAVE_PROJECT_ID=
NEXT_PUBLIC_HEXCLAVE_PUBLISHABLE_CLIENT_KEY=
HEXCLAVE_SECRET_SERVER_KEY=

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

ADMIN_EMAILS=admin@example.com
```

```bash
bun x drizzle-kit push   # apply schema to Neon
bun run dev              # http://localhost:3000
```

## Deployment

Pushing to `main` triggers [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). The workflow syncs runtime secrets to Cloudflare, then builds and deploys the Worker. To deploy manually:

```bash
bun run deploy     # opennextjs-cloudflare build && deploy
bun run preview    # local workerd preview
```

## Documentation

| Topic | File |
|---|---|
| Architecture | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) |
| Routes and access levels | [`docs/ROUTES.md`](docs/ROUTES.md) |
| REST API | [`docs/API.md`](docs/API.md) |
| Payment links | [`docs/PAYMENT-LINKS.md`](docs/PAYMENT-LINKS.md) |
| Security | [`docs/SECURITY.md`](docs/SECURITY.md) |
| Performance | [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md) |
| SEO | [`docs/SEO.md`](docs/SEO.md) |
| Design system | [`DESIGN.md`](DESIGN.md) |
| Contributor and agent rules | [`AGENTS.md`](AGENTS.md) |

## Support

Built by [Shaswat Raj](https://github.com/SH20RAJ). If Scriptly saves you time, you can [sponsor development](https://razorpay.me/@iamsh).

## License

© ScriptlyStore. All rights reserved. Each product sold on the marketplace is covered by its own license, listed on [scriptly.store/licenses](https://scriptly.store/licenses).
