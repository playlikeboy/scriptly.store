# ScriptlyStore MCP Server

`/api/agents/mcp` is a [Model Context Protocol](https://modelcontextprotocol.io) server that gives an AI agent full admin control of the store: catalog, moderation, categories, coupons, orders (read-only), users, creator payouts, affiliates, payment links and reviews.

- **Endpoint:** `https://scriptly.store/api/agents/mcp`
- **Transports:** Streamable HTTP (preferred, protocol `2025-06-18` / `2025-03-26`), and legacy HTTP+SSE (`2024-11-05`)
- **Auth:** the `AGENT_API_KEY` secret, sent as `Authorization: Bearer <key>` **or** `x-api-key: <key>`
- **Code:** `src/app/api/agents/mcp/route.ts` (thin HTTP layer), `src/lib/mcp/` (protocol, tools, resources)

> The key grants full admin access to production data. Treat it like a database password: never put it in a URL, chat log or client-side code, and rotate it (`wrangler secret put AGENT_API_KEY`) if it leaks. Rotation immediately invalidates every open session.

---

## 1. Connecting

### Claude Code (Streamable HTTP, recommended)

```bash
claude mcp add --transport http scriptly https://scriptly.store/api/agents/mcp \
  --header "Authorization: Bearer <KEY>"
```

### Composio (custom MCP server)

| Field | Value |
|---|---|
| Server URL | `https://scriptly.store/api/agents/mcp` |
| Transport | Streamable HTTP |
| Header | `Authorization: Bearer <KEY>` (or `x-api-key: <KEY>`) |

The server answers `initialize`, `tools/list` and `tools/call` on a plain POST with no prior session, so generic clients like Composio list all tools immediately.

### Legacy SSE clients

```bash
claude mcp add --transport sse scriptly https://scriptly.store/api/agents/mcp \
  --header "Authorization: Bearer <KEY>"
```

### Any HTTP client

```bash
curl -s https://scriptly.store/api/agents/mcp \
  -H "Authorization: Bearer $AGENT_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"site_overview","arguments":{}}}'
```

---

## 2. Transport details

### Streamable HTTP (stateless)

| Request | Response |
|---|---|
| `POST` JSON-RPC request or batch (array, max 50, run in order) | `200 application/json` with the response(s) |
| `POST` with `Accept: text/event-stream` only (no `application/json`) | `200 text/event-stream`: one `event: message` frame with the JSON-RPC response, then the stream closes |
| `POST` containing only notifications / client responses | `202` with no body |
| `POST` `initialize` | Response carries a random `Mcp-Session-Id` header. The server is stateless: any session id sent back is accepted and echoed, never required |
| `GET` without `Accept: text/event-stream`, or with an `Mcp-Session-Id` header | `405` with `Allow: GET, POST, DELETE, OPTIONS` (there is no server-initiated stream) |
| `DELETE` (session termination) | `204` |
| `OPTIONS` (CORS preflight) | `204`. Allows `Authorization, Content-Type, Accept, Mcp-Session-Id, MCP-Protocol-Version, X-API-Key`; exposes `Mcp-Session-Id` |

- **Protocol version:** `initialize` echoes the client's `protocolVersion` if it is one of `2025-06-18`, `2025-03-26` or `2024-11-05`, otherwise `2025-06-18`. The `MCP-Protocol-Version` request header is accepted and ignored.
- **Methods:** `initialize`, `ping`, `tools/list`, `tools/call`, `resources/list`, `resources/templates/list` (empty), `resources/read`, `prompts/list` (empty), `logging/setLevel` (no-op).
- **JSON-RPC errors:** `-32700` parse error (HTTP 400), `-32600` invalid request, `-32601` method not found, `-32602` invalid params / unknown tool, `-32002` unknown resource, `-32603` internal.
- **Request limits:** request bodies are capped at 1 MB (HTTP 413).
- **Tool argument errors:** these come back as a tool result with `isError: true` and a readable message, so the model can correct itself. They are not JSON-RPC errors.

### Legacy HTTP+SSE

1. `GET /api/agents/mcp` with `Accept: text/event-stream` and the key header opens the stream. The first event is `event: endpoint` with `data: https://scriptly.store/api/agents/mcp?session=<random-uuid>`. **The URL contains no key.**
2. The client POSTs JSON-RPC messages to that URL. The server replies `202`, and the JSON-RPC response arrives on the stream as `event: message`.

Workers cannot share memory between requests, so responses are relayed through the `mcp_messages` table. The table is created idempotently, at most once per isolate, and only on the legacy path; Streamable HTTP never touches it.

**Session binding (security model):**

- The authenticated GET stores a marker row holding `HMAC-SHA256(AGENT_API_KEY, "mcp-session:" + sessionId)`, never the key itself.
- A session POST is accepted only if the session marker exists and is less than 24 hours old, **and** one of these holds:
  - the request carries a valid key header (an *invalid* key header is always rejected), or
  - no key header is sent, and the stored HMAC still matches the current key.
- So the random 122-bit session id acts as a short-lived capability for one live stream, the same model as the reference SDK. This keeps clients working that cannot attach headers to POSTs.
- Rotating `AGENT_API_KEY` revokes all sessions immediately.
- `?token=` / `?apiKey=` on the GET still work for old clients but are **deprecated** (they are logged as `mcp_deprecated_query_token`). POSTs no longer accept a query key.

---

## 3. Money units

| Data | Unit | Example |
|---|---|---|
| Catalog: `products.price`, `orders.amount`, `orders.discount_applied`, coupon fixed `discountValue` and `minPurchaseAmount`, `payouts.amount`, `affiliate_commissions.amount` | integer **USD cents** (`CHECKOUT_CURRENCY.catalogCurrency`) | `2500` = $25.00 |
| Payment links: `payment_links.price` / `total_earned`, `payment_link_activities.amount` | integer **INR paise** | `49900` = ₹499 |
| Percentage coupons: `discountValue` | whole percent 1-100 | `20` = 20% |

- **Output:** every money value is `{ "amount": 2500, "unit": "USD cents", "formatted": "$25" }`. Catalog money is formatted with `formatMoney`; payment links use `formatPaiseToINR`, which rounds to whole rupees.
- **Input:** tools take the raw integer. Catalog fields are named `price` / `amount` / `minPurchaseAmount`; payment-link fields are named `pricePaise`. All money inputs are bounded to Postgres int4 (2,147,483,647).

---

## 4. Tools

**Kind** maps to MCP annotations:
- `read`: `readOnlyHint: true`.
- `write`: changes data.
- `destructive`: `destructiveHint: true`. These delete data, record money movements or touch many rows, and the input **must include `confirm: true`**.

All list tools filter, sort, count and paginate in SQL. They take `limit` (1-100, default 25) and `offset`, and return `total`, `count` and `nextOffset`.

| Tool | Kind | What it does |
|---|---|---|
| `site_overview` | read | Headline numbers: products (published, pending approval), orders by status, catalog revenue (USD cents) all-time and last 30 days, users, affiliate queue, payment-link earnings (INR paise). |
| `products_list` | read | Search the catalog with filters, sorting and pagination. Returns summaries (no descriptions). Prices are catalog money (integer USD cents plus formatted string). |
| `products_get` | read | Full product record by id or slug, with sales stats (completed orders, revenue), review stats, saves/likes, download count and creator info. |
| `products_create` | write | Create a catalog product. Validates category/subcategory and creator, normalizes the slug and enforces uniqueness. price is integer USD cents (2500 = $25.00). |
| `products_update` | write | Partially update a product (only the fields you send change; send null to clear nullable fields). Setting published=true without status also sets status 'approved'. price is integer USD cents. |
| `products_delete` | destructive (confirm) | Permanently delete a product. WARNING: orders, downloads, reviews and affiliate commissions for the product are cascade-deleted. Refuses when the product has completed orders unless force=true. Prefer products_set_published(false). |
| `products_set_published` | write | Set a product's published flag. Publishing also sets status 'approved'; unpublishing keeps the current status. |
| `products_set_featured` | write | Set whether a product appears in featured placements. |
| `products_bulk_update` | destructive (confirm) | Apply the same patch to up to 100 products by id in one UPDATE. Supports publish/feature/status/category/discount/promo fields. |
| `approvals_list_pending` | read | Products with status 'pending' (creator submissions), oldest first, with creator email/store. |
| `products_approve` | write | Approve a product: status 'approved' and published=true. |
| `products_reject` | write | Reject a product: status 'rejected' and published=false. The schema has no rejection-reason column, so no reason is stored; tell the creator out of band. |
| `products_reset_ratings` | destructive (confirm) | Recompute rating / ratingCount from real top-level reviews for the given products (or every product when ids is omitted). Products without reviews become rating '0', ratingCount 0. |
| `categories_list` | read | Categories (by name) with nested subcategories and product counts. Product rows reference categories by slug. |
| `categories_create` | write | Create a category, or a subcategory under an existing category. The id equals the normalized slug. |
| `categories_update` | write | Change a category/subcategory name and/or slug. A slug change also rewrites products.category / products.subcategory in the same transaction so listings stay attached. The id never changes. |
| `categories_delete` | destructive (confirm) | Delete a category (its subcategories are cascade-deleted) or a subcategory. Refuses when products reference it unless force=true; forced deletes leave those products pointing at a missing slug. |
| `coupons_list` | read | Coupons with completed-order usage counts and totals. Fixed discounts and minimum purchase are catalog money (USD cents). |
| `coupons_get` | read | One coupon by id or code, with usage stats and creator info. |
| `coupons_create` | write | Create a coupon. percentage: discountValue is 1-100. fixed: discountValue is integer USD cents. minPurchaseAmount is USD cents. Omit creatorId for a platform-wide coupon. |
| `coupons_update` | write | Partially update a coupon (code, type, value, minimum purchase, active). Values follow coupons_create units. |
| `coupons_set_active` | write | Enable or disable a coupon without deleting it. |
| `coupons_delete` | destructive (confirm) | Permanently delete a coupon. Past orders keep their coupon code text. Prefer coupons_set_active(false). |
| `orders_list` | read | Search orders with filters (status, buyer, product, Razorpay ids, coupon, affiliate, date range). Amounts are catalog money (USD cents). Read-only. |
| `orders_get` | read | One order by id, Razorpay order id or Razorpay payment id, with buyer, product, downloads and affiliate commission. |
| `orders_sales_summary` | read | Revenue and order counts per UTC day for a date range (default: last 30 days, max 366), totals, and top products by revenue. Revenue is catalog money (USD cents). |
| `users_list` | read | Search users by email, name, store name or affiliate handle; filter by role or creator status. Role is informational only: admin access is governed by ADMIN_EMAILS and cannot be changed here. |
| `users_get` | read | One user by id or email with purchase totals, creator stats, payouts received and affiliate status. Bank account numbers are masked. |
| `stores_list` | read | Creators (store name or at least one product) with product counts by status and completed-sales totals (USD cents), sorted by gross sales or newest. |
| `payouts_creator_balances` | read | Per-creator gross sales, 95% creator share, total paid out and unpaid balance (all integer USD cents, computed in SQL), plus grand totals. 'paid' counts every payout row for the user, including affiliate settlements. |
| `payouts_list` | read | Recorded payouts (creator settlements and affiliate commission settlements), newest first. Amounts are USD cents. |
| `payouts_record` | destructive (confirm) | Log a settlement you have ALREADY transferred to a creator (this does not move money). amount is integer USD cents and must not exceed the creator's unpaid balance; the check and insert run in one SQL statement. |
| `affiliates_list` | read | Affiliate profiles (applications) with handle, channels, click count, completed referred orders and commission totals by status (USD cents). Filter status='pending' for the review queue. |
| `affiliates_set_status` | write | Set an affiliate profile's status (approved, rejected or back to pending). Only approved affiliates earn referral commission. |
| `affiliate_commissions_list` | read | Affiliate commissions with order, product and affiliate info, plus totals by status for the filter. Amounts are USD cents. |
| `affiliate_commissions_mark_paid` | destructive (confirm) | Mark one commission paid after you have transferred the money, and log the settlement in the payout ledger. Atomic: one statement flips status (only from pending/approved) and inserts the payout, so double calls cannot double-log. |
| `payment_links_list` | read | Stored /pay links with views, conversions and earnings. All money here is INR paise (not catalog USD cents). |
| `payment_links_get` | read | One payment link (id or slug) with activity counts by type, failed/succeeded payments and the most recent activities (payer email/name, no IP or user agent). Money is INR paise. |
| `payment_links_create` | write | Create a stored /pay/<slug> link. pricePaise is integer INR paise (49900 = ₹499). redirectUrl must be http(s). A custom slug must be unused; otherwise one is generated from the title. |
| `payment_links_update` | write | Partially update a payment link (title, description, pricePaise in INR paise, redirectUrl, slug, active). Counters cannot be edited. |
| `payment_links_deactivate` | write | Turn a payment link off so it no longer accepts payments (reversible with payment_links_update active=true). Stats are kept. |
| `reviews_list` | read | Reviews and replies with author, product, rating and like count. Filter by product (id or slug), author, rating range or text. |
| `reviews_delete` | destructive (confirm) | Delete a review and its whole reply thread (likes cascade), then recompute the product's rating/ratingCount from the remaining top-level reviews. |
| `reviews_delete_by_user` | destructive (confirm) | Spam cleanup: delete every review and reply written by a user (plus the reply threads under them and the likes they gave), then recompute ratings for affected products. |

**Not exposed on purpose:**
- Order mutations (refunds, status changes).
- User role changes: `ADMIN_EMAILS` stays the only admin authority.
- Deleting payment links: deactivate them instead.
- IndexNow submission: the only helper requires an admin browser session.

### Resources

| URI | Type | Content |
|---|---|---|
| `scriptly://categories` | JSON | Category tree with product counts |
| `scriptly://stats/overview` | JSON | Same as `site_overview` |
| `scriptly://guide/money` | Markdown | Money unit rules |

---

## 5. Safety model

- **Auth:** checks run before any work. The key is compared in constant time using Web Crypto. The server fails closed when `AGENT_API_KEY` is unset. A `401` carries `WWW-Authenticate: Bearer`.
- **Validation:**
  - Every tool input is a strict zod object, so unknown keys are rejected.
  - Strings, arrays and IDs have length caps.
  - Money and counters must be integers within int4 range.
  - Promotion dates must be in order.
  - Slugs are normalized to kebab-case and checked for uniqueness. Unique-constraint races are reported as conflicts.
- **URLs:**
  - Demo, video and redirect URLs must be absolute `http(s)`.
  - Images may also be site-relative paths.
  - Product `fileUrl` accepts `http(s)`, `r2://<slug>/<file>.zip`, or a site-relative path without `..`.
- **Referential checks:** a product's category and subcategory must exist and belong together. Creators and coupon owners must exist.
- **Guard rails:**
  - `products_delete` refuses when completed orders exist, because they would be cascade-deleted, unless `force: true`. Prefer unpublishing.
  - `categories_delete` refuses while products reference the slug, unless `force: true`.
  - `categories_update` rewrites product references in the same transaction when a slug changes.
  - `payouts_record` inserts only if `amount <= unpaid balance`, checked in the same SQL statement as the insert.
  - `affiliate_commissions_mark_paid` uses one statement: `UPDATE … WHERE status NOT IN ('paid','cancelled')` feeds the payout-ledger `INSERT`. A repeated call cannot log a payout twice.
  - Recording a payout or marking a commission paid only *logs* a transfer you already made. Nothing sends money.
- **Ratings:** new products start at rating `'0'` / count `0`. Review deletions and `products_reset_ratings` recompute both from real top-level reviews; a product with no reviews becomes `'0'` / `0`.
- **Privacy:**
  - Bank account numbers are masked to the last 4 digits.
  - Payment-link activity output omits IP and user agent.
  - Handler errors are returned as generic messages: no stack traces and no SQL or driver text.
- **Audit log:** every `tools/call` writes one structured line to Workers logs:
  ```json
  {"type":"mcp_audit","tool":"products_update","ok":true,"durationMs":84,"args":{"idOrSlug":"my-kit","patch":{"price":2900}},"at":"2026-11-14T10:00:00.000Z"}
  ```
  Arguments are summarized: long strings become `<string len=N>`, and keys that look like secrets are `<redacted>`. Unexpected failures also log `mcp_tool_failure` with a truncated error message.
- **Runtime:** everything runs on Cloudflare Workers. It uses Web Crypto and the Neon HTTP driver (`db.batch` for multi-statement transactions), with no Node-only APIs.
