# Security — API keys and credentials

## Problem

Any variable prefixed with `VITE_` is **embedded in the JavaScript bundle** shipped to browsers. Anyone can open DevTools → Sources/Network and read WooCommerce keys, admin tokens, etc.

## Architecture (secure)

| Secret | Where it lives | Never in |
|--------|----------------|----------|
| WooCommerce consumer key/secret | `artifacts/api-server/.env` | `VITE_*`, client code |
| Pricing admin token | `PRICING_ADMIN_TOKEN` on API server | `VITE_*`, client code |
| Admin session | `sessionStorage` after login at `/admin/pricing` | env files |

The storefront calls **`/api/woocommerce/*`**. The API server adds credentials and forwards read-only requests to WordPress.

## Setup

### 1. API server (`artifacts/api-server/.env`)

```env
PORT=8080
WOOCOMMERCE_STORE_URL=https://www.samphone.pt
WOOCOMMERCE_CONSUMER_KEY=ck_...
WOOCOMMERCE_CONSUMER_SECRET=cs_...
PRICING_ADMIN_TOKEN=long-random-secret
CORS_ORIGINS=https://www.samphone.pt,http://localhost:5173
```

### 2. Storefront (`artifacts/samphone/.env.local`)

```env
VITE_WOOCOMMERCE_STORE_URL=https://www.samphone.pt
VITE_PRICING_API_URL=/api
```

### 3. Development

Run both:

```bash
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/samphone dev
```

Vite proxies `/api` → `http://127.0.0.1:8080`.

### 4. Production (static host)

- Deploy the **API server** (Node) on a private host or subdomain.
- Proxy `/api` from the web server to the API (see commented rules in `artifacts/samphone/public/.htaccess`).
- Rebuild the storefront **after** removing old `VITE_WOOCOMMERCE_CONSUMER_*` from env.

## If keys were already exposed

1. **Revoke** WooCommerce REST keys in WordPress → WooCommerce → Settings → Advanced → REST API.
2. Create new **read-only** keys and put them only in `artifacts/api-server/.env`.
3. Change `PRICING_ADMIN_TOKEN`.
4. Rebuild and redeploy the site bundle.

## Admin pricing UI

- Open `/admin/pricing`, enter the token once per browser session.
- Token is stored in `sessionStorage` only (cleared when the tab closes).
