# Customer Specific Pricing System (Portugal / EUR / IVA)

Production-oriented pricing engine for Samphone B2C + B2B ecommerce (smartphones, accessories, telecom).

## Architecture

| Layer | Package / path | Role |
|--------|----------------|------|
| Pricing engine | `lib/pricing` | Priority logic, IVA helpers, unit tests |
| Database | `lib/db/src/schema/pricing` | PostgreSQL schema (Drizzle + SQL migration) |
| API | `artifacts/api-server` | REST, admin auth, rate limits, audit |
| Storefront | `artifacts/samphone` | Personalized prices when logged in |
| Admin UI | `/admin/pricing` | Rules management (PT/EN ready) |

## Pricing priority

1. **Customer product-specific** (`customer_product_prices`)
2. **Customer category discount** (`customer_category_discounts`)
3. **Global promotion** (`global_promotions`)
4. **Catalog base price** (WooCommerce / `products.base_price_cents`)

Then **Portuguese IVA** is applied for display (inclusive by default).

## Environment

### API server (`artifacts/api-server`)

```env
PORT=8080
DATABASE_URL=postgresql://...   # optional in dev — memory store used if unset
PRICING_ADMIN_TOKEN=your-secret-admin-token
PRICING_ADMIN_EMAIL=admin@samphone.pt
WOOCOMMERCE_STORE_URL=https://www.samphone.pt
WOOCOMMERCE_CONSUMER_KEY=ck_...
WOOCOMMERCE_CONSUMER_SECRET=cs_...
CORS_ORIGINS=https://www.samphone.pt,http://localhost:5173
```

### Storefront (`artifacts/samphone`)

```env
VITE_PRICING_API_URL=/api
# Dev only — Vite proxy target:
# VITE_PRICING_API_PROXY=http://127.0.0.1:8080
```

Do **not** set `VITE_PRICING_ADMIN_TOKEN` (exposes admin access in the browser bundle). Use `/admin/pricing` login → session token. See `docs/SECURITY.md`.

## REST API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/pricing/resolve` | Public (rate limited) | Resolve price for logged-in customer |
| GET | `/api/customer-pricing/:customerId` | Admin | List product rules |
| POST | `/api/customer-pricing` | Admin | Create product rule |
| PUT | `/api/customer-pricing/:id` | Admin | Update rule |
| DELETE | `/api/customer-pricing/:id` | Admin | Soft-delete rule |
| GET | `/api/customer-category-discounts` | Admin | List category rules |
| POST | `/api/customer-category-discounts` | Admin | Create category rule |
| GET | `/api/customers?q=` | Admin | Search customers |
| GET | `/api/pricing/vat-rules` | Public | Portuguese IVA rates |
| GET | `/api/pricing-history` | Admin | Audit log |

Admin auth: `Authorization: Bearer <PRICING_ADMIN_TOKEN>` or `X-Admin-Token`.

### Resolve example

```json
POST /api/pricing/resolve
{
  "customerEmail": "joao@example.pt",
  "wooProductId": 1000,
  "basePriceCents": 10000,
  "quantity": 1
}
```

## Demo seed (in-memory)

When `DATABASE_URL` is not wired, the API uses an in-memory store:

| Customer | Email | Sample price (€100 product) |
|----------|-------|-------------------------------|
| João | joao@example.pt | €85 |
| Maria | maria@example.pt | €92 |
| Dealer | dealer@samphone.pt | €70 |

## Database

Apply schema:

```bash
psql $DATABASE_URL -f lib/db/src/sql/001_pricing_schema.sql
# or
pnpm --filter @workspace/db run push
```

## Development

```bash
# Terminal 1 — API
PORT=8080 PRICING_ADMIN_TOKEN=dev-admin pnpm --filter @workspace/api-server run dev

# Terminal 2 — Storefront
pnpm --filter @workspace/samphone dev
```

- Storefront: log in with any email matching seed (`joao@example.pt`, etc.) or register then map customer in admin.
- Admin: https://localhost:5173/admin/pricing

## GDPR & security

- Customer PII: email, name, VAT number — store consent timestamp (`gdpr_consent_at`).
- Admin routes require token; validate all inputs (Zod).
- Pricing changes written to `pricing_history`.
- Negative prices rejected.
- Rate limit on public resolve endpoint.

## Redis (production)

Plug a cache in front of `resolveCustomerPrice` keyed by `customerId:wooProductId:qty` with TTL 60s. Interface stub: extend `pricing-service.ts` with `PricingCache` adapter.

## Tests

```bash
node --test lib/pricing/src/engine.test.ts
```

## CSV import / export

Planned extension: `POST /api/customer-pricing/import` with queued worker — schema supports bulk via `pricing_history` audit trail.
