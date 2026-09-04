# Vercel deployment

The storefront on Vercel is a **static SPA** plus optional **serverless API routes** in `/api` (legacy Woo proxy). Production catalog, banners, checkout, and auth go through **https://samphone.cloud** (rewritten as `/cloud-api` → `/api`) — same stack as the Expo app. See **`docs/STACK.md`**.

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

Required public `VITE_*` (must match Expo `EXPO_PUBLIC_*` — see `vercel.env.example` / `docs/STACK.md`):

| Variable | Example |
|----------|---------|
| `VITE_SAMPHONE_CLOUD_ORIGIN` | `https://samphone.cloud` |
| `VITE_SAMPHONE_API_URL` | `/cloud-api` |
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_live_…` (clerk.samphone.cloud) |
| `VITE_CLERK_FRONTEND_API` | `https://clerk.samphone.cloud` |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_live_51TsRh0…` |
| `VITE_WOOCOMMERCE_STORE_URL` | `https://www.samphone.pt` |
| `VITE_WOOCOMMERCE_CURRENCY_SYMBOL` | `€` |

**Never** set `VITE_WOOCOMMERCE_CONSUMER_KEY`, `VITE_WOOCOMMERCE_CONSUMER_SECRET`, Clerk/Stripe secrets, JWT, MySQL, SMTP, or DPD on Vercel.

## How it works

```
Browser  →  https://your-app.vercel.app/api/woocommerce/products
         →  Vercel functions `api/woocommerce/status.ts`, `banners.ts`, `products.ts`
         →  WooCommerce REST (keys added server-side)
```

SPA routes (`/category/samsung-parts`, etc.) rewrite to `index.html`.  
`/api/*` is **not** rewritten — it hits serverless functions.

## Verify after deploy

1. Open `https://your-app.vercel.app/api/woocommerce/status`  
   Expected: `{"configured":true}` — **JSON**, not the homepage HTML.
2. If that URL shows the website or `configured: false`, products and banners will stay empty.
3. Open a category page — products should load.

Env vars do **not** update a live deployment by themselves. After changing them, click **Deployments → ⋮ → Redeploy** (uncheck “Use existing Build Cache”).

`VITE_*` values are baked in at **build** time. `WOOCOMMERCE_*` are read by `/api/woocommerce` at **runtime**, but Vercel still needs a new deployment to attach them.

## If the Vercel link still looks old or empty

- Confirm you opened the project that GitHub actually deployed (this repo currently has multiple Vercel projects: `samphone`, `samphone-api-server`, `samphone-api-server-8bff`). Env vars must be on **that** project, for **Production**.
- If the link redirects to `vercel.com/sso-api`, Deployment Protection is on — visitors will not see the store. In Vercel: **Settings → Deployment Protection → Off** (or Standard Protection off for Production).
- Check `https://<your-app>/api/woocommerce/status`. If it returns HTML, API routes are missing (Root Directory `artifacts/api-server` must include the committed `api/` folder).

## Local vs Vercel

| Environment | API |
|-------------|-----|
| Local dev | `artifacts/api-server` on port 8080, Vite proxies `/api` |
| Vercel | Serverless functions in `/api` |

See also `docs/SECURITY.md`.
