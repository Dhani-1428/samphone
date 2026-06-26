# Vercel deployment

The storefront on Vercel is a **static SPA** plus **serverless API routes** in `/api` that proxy WooCommerce (same security model as `artifacts/api-server` locally).

## Vercel project settings

| Setting | Value |
|---------|--------|
| **Root Directory** | `.` (repository root — **not** `artifacts/samphone`) |
| **Framework Preset** | Other |
| **Build Command** | `pnpm --filter @workspace/samphone run build` |
| **Output Directory** | `artifacts/samphone/dist/public` |
| **Install Command** | `pnpm install` |

`vercel.json` at the repo root sets these automatically.

## Required environment variables

In **Vercel → Project → Settings → Environment Variables**, add (Production + Preview):

| Variable | Example | Notes |
|----------|---------|--------|
| `WOOCOMMERCE_STORE_URL` | `https://www.samphone.pt` | No trailing slash |
| `WOOCOMMERCE_CONSUMER_KEY` | `ck_...` | Read-only REST key |
| `WOOCOMMERCE_CONSUMER_SECRET` | `cs_...` | Server-side only |

Optional (storefront display — also set as `VITE_*` if needed at build time):

| Variable | Example |
|----------|---------|
| `VITE_WOOCOMMERCE_STORE_URL` | `https://www.samphone.pt` |
| `VITE_WOOCOMMERCE_CURRENCY_SYMBOL` | `€` |

**Never** set `VITE_WOOCOMMERCE_CONSUMER_KEY` or `VITE_WOOCOMMERCE_CONSUMER_SECRET`.

## How it works

```
Browser  →  https://your-app.vercel.app/api/woocommerce/products
         →  Vercel serverless function (api/woocommerce/[...path].ts)
         →  WooCommerce REST (keys added server-side)
```

SPA routes (`/category/samsung-parts`, etc.) rewrite to `index.html`.  
`/api/*` is **not** rewritten — it hits serverless functions.

## Verify after deploy

1. Open `https://your-app.vercel.app/api/woocommerce/status`  
   Expected: `{"configured":true}`
2. Open a category page — products should load.
3. If `configured: false`, WooCommerce env vars are missing or still placeholders.

## Redeploy

After adding or changing environment variables, trigger a **new deployment** (Redeploy from Vercel dashboard).

## Local vs Vercel

| Environment | API |
|-------------|-----|
| Local dev | `artifacts/api-server` on port 8080, Vite proxies `/api` |
| Vercel | Serverless functions in `/api` |

See also `docs/SECURITY.md`.
