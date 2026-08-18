# Vercel deployment

The storefront on Vercel is a **static SPA** plus **serverless API routes** in `/api` that proxy WooCommerce (same security model as `artifacts/api-server` locally).

## Vercel project settings

| Setting | Value |
|---------|--------|
| **Root Directory** | `.` (repository root — **recommended**) |
| **Framework Preset** | Other |
| **Build Command** | *(leave empty — uses `vercel.json`)* |
| **Output Directory** | *(leave empty — uses `vercel.json` → `public`)* |
| **Install Command** | *(leave empty — uses `vercel.json`)* |

> **Important:** If you previously set Output Directory to `artifacts/samphone/dist/public` in the Vercel dashboard, **clear it** or set it to `public`. The old value causes: `No entrypoint found in output directory`.

If Root Directory is `artifacts/samphone` instead, use that folder's `vercel.json` (same `public` output after build).

If Root Directory is `artifacts/api-server` (current production project), that folder now has wrappers at `scripts/prepare-vercel-public.mjs` so the dashboard build command still works. Output is copied to `artifacts/api-server/public`.

## Required environment variables

### Option A — Import one file (recommended)

1. Generate `vercel.env` from your local credentials:

```bash
node scripts/merge-vercel-env.mjs
```

This merges `artifacts/api-server/.env` + `artifacts/samphone/.env` into **`vercel.env`** at the repo root (gitignored).

2. In **Vercel → Project → Settings → Environment Variables**, click **Import .env**
3. Select `vercel.env`
4. Enable **Production**, **Preview**, and **Development**
5. **Redeploy** the project

Template (no secrets): copy `vercel.env.example` → `vercel.env` and fill in values manually.

### Option B — Add variables one by one

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
