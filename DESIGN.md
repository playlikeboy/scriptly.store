# ScriptlyStore Design System — "Paper & Ember"

> Replaces the former Duolingo-derived system (Nov 2026). The old look — press-shadow
> buttons, playful chrome, sky-blue accent — is retired. Do not reintroduce it.

## World

A premium catalogue for code. Think of a well-edited print catalogue for tools:
warm paper, dense black ink, one ember accent used only where money or attention
moves. Products (their screenshots, titles, prices) are the imagery; chrome recedes.

Surfaces by mode:

| Surface | Mode | Expression |
|---|---|---|
| Home, /creator, /affiliate, /hire-me | Persuade | Serif display headlines, generous space, real product thumbnails as the visual. |
| Explore, search, tags, stores, product page, cart, pay | Operate (commerce) | Dense, scannable, precise. Price and primary action always obvious. |
| Blog, docs, legal, trust | Read | 68ch measure, serif titles, quiet chrome. |
| Admin, creator dashboard, affiliate dashboard | Operate (tool) | Neutral, tabular, compact. No display serif except page title. |

## Tokens (defined in `src/app/globals.css`)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` | `#F7F6F2` paper | `#12110F` | Page |
| `--card` | `#FFFEFB` | `#1A1916` | Raised surfaces (cards, panels) |
| `--foreground` | `#17140F` ink | `#F2EFE8` | Text, default buttons |
| `--muted-foreground` | `#645E54` | `#A39D92` | Secondary text (≥4.5:1 on paper) |
| `--primary` | `#C2410C` ember | `#FF8A4C` | Buy/checkout CTA, links, focus ring, active state. Nothing else. |
| `--secondary` / `--muted` | `#EFEDE6` / `#F0EEE8` | `#23211D` / `#1E1C19` | Fills, chips, hover |
| `--border` / `--input` | `#E2DED4` / `#D9D4C8` | `#2E2B26` / `#3A3631` | Hairlines, inputs |
| `--success` | `#1F7A4D` | `#4ADE9B` | "Free", "Paid", confirmations (`text-success`) |
| `--destructive` | `#B42318` | `#F97066` | Errors, destructive |

Never hardcode hex/Tailwind palette colors (`sky-500`, `emerald-500`, `indigo-*`, `amber-*` etc.)
in components. Exceptions: rating stars may use `amber-500`.

## Typography

- **Sans (UI/body):** Geist — `font-sans` (default).
- **Display:** Newsreader serif — `.font-display`. Page H1s, section headlines on Persuade/Read surfaces, product title on product page. Never for body, buttons, labels, tables.
- **Mono:** Geist Mono — `font-mono`. Only for code, file names, versions, license keys, order IDs. **Prices are NOT mono**; use `tabular-nums` (`.tabular`).
- Scale: display `text-4xl md:text-6xl` (hero only), `text-3xl md:text-4xl` (page H1), `text-2xl` (section), `text-base`/`text-sm` body, `text-xs` meta. Tracking never tighter than `-0.03em`.
- No uppercase tracked "eyebrow"/kicker labels above headings. No gradient text. No emoji as icons or decoration.

## Shape, depth, motion

- Radius: controls `10px` (`rounded-[10px]`/`rounded-lg`), cards `14px` (`rounded-2xl` max), pills only for small chips/badges.
- Elevation is declared once: cards use a 1px `border-border` **or** a soft shadow (`shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.12)]`) — never both, never nested cards.
- No hard offset/press shadows (`border-b-4`, `shadow-[0_4px_0_…]`), no glassmorphism, no glow halos, no grid/stripe backgrounds, no side-stripe borders.
- Motion: 150–250ms ease-out; hover = color/border change or image `scale-[1.03]`. One authored moment per page at most. Respect `prefers-reduced-motion`.

## Components

- `Button` variants: `default` (ink), `accent` (ember — Buy, Checkout, Pay, Sell CTA only), `outline`, `secondary`, `ghost`, `destructive`, `link`. Max one `accent` button visible per viewport region.
- Prices: always `formatPrice(cents)` / `formatMoney(cents)` from `@/lib/price-utils` (catalog is USD; Razorpay charges the INR equivalent). Payment links (`/pay`) use `formatPaiseToINR`. Free shows "Free" in `text-success`.
- Product card: thumbnail 16:10 on top, title (1 line), one-line description, price + rating row. Category as plain muted text, not a floating badge.
- Skeletons: `@/components/ui/skeleton` only, shaped like the real content.
- Icons: `lucide-react`, stroke 1.75, `size-4` inline.

## Layout

- Container: `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8`. Read surfaces: `max-w-[68ch]`.
- Section rhythm: `py-16 md:py-24` on Persuade, `py-8 md:py-12` on Operate. More space above a heading than below.
- Mobile first; no horizontal scroll at 360px.
