# Samphone stack (website ↔ app ↔ cloud)

The storefront, Expo app, and FastAPI backend share one API contract so catalog, banners, orders, auth, and shipping stay in sync.

## Website backend (this repo)

Python FastAPI lives in `backend/` (same surface as the Expo `myapi` / `samphone.cloud` API).

- Local: `pnpm backend` or `backend/start.sh` → `http://127.0.0.1:8006`
- Storefront: `VITE_SAMPHONE_CLOUD_ORIGIN=http://127.0.0.1:8006` and `VITE_SAMPHONE_API_URL=/cloud-api`
- Production can still proxy `/cloud-api` to `https://samphone.cloud` via `api/cloud.js`

See `backend/README.md`.

## Live hosts

| Role | URL |
|------|-----|
| Shop (website) | https://samphone.eu ([https://www.samphone.eu](https://www.samphone.eu)) |
| Legacy Woo / images | https://www.samphone.pt |
| App + API | https://samphone.cloud → `/api` |
| Clerk | https://clerk.samphone.cloud |
| Android package | `com.samphone.app` |
| iOS bundle | `com.samphone.app` |

## What the website / app already use (public)

Put these on the website (Vercel / local `VITE_*`) so checkout, login, and banners match the app. App names are `EXPO_PUBLIC_*`; website names are `VITE_*`. Never put Stripe secret, Clerk secret, JWT, DPD, SMTP, or database passwords on the website.

```bash
# Public API (no trailing slash, no /api)
# App: EXPO_PUBLIC_BACKEND_URL / EXPO_PUBLIC_API_URL
VITE_SAMPHONE_CLOUD_ORIGIN=https://samphone.cloud
# Browser uses same-origin /cloud-api → https://samphone.cloud/api
VITE_SAMPHONE_API_URL=/cloud-api

VITE_SITE_URL=https://samphone.eu
SITE_URL=https://samphone.eu
NEXT_PUBLIC_SITE_URL=https://samphone.eu

# Clerk (publishable — same live instance as EAS)
VITE_CLERK_PUBLISHABLE_KEY=pk_live_Y2xlcmsuc2FtcGhvbmUuY2xvdWQk
VITE_CLERK_FRONTEND_API=https://clerk.samphone.cloud

# Stripe (publishable — secret only on API)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51TsRh0IFNHslwSxObrZX8Fx7eneUwyjSeSj0QmbJJKB39lmLDrwNzGOjfk646Y4hacs0jyT9bJSPpGuk4hlojYTy00Ir71HQaq

VITE_WOOCOMMERCE_STORE_URL=https://www.samphone.eu
VITE_WOOCOMMERCE_CURRENCY_SYMBOL=€
```

Hero banners: `GET https://samphone.cloud/api/banners`  
Those images come from `samphone.pt` (`wp-content/uploads/...`), same as the homepage carousel.

Templates: `artifacts/samphone/.env.example`, `vercel.env.example`.

## Production API env (samphone.cloud / VPS)

Use on the server only — not in WordPress public JS or `VITE_*`. Keep names exactly as below. Template: `samphone.cloud.env.example`.

Key flags:

- `USE_WOOCOMMERCE=0` — catalog from MySQL (`USE_CATALOG_MYSQL=1`)
- `PUBLIC_API_URL=https://samphone.cloud`
- `SITE_URL=https://samphone.eu`
- `STORE_WEB_DISPLAY=www.samphone.eu`
- `SAMPHONE_STORE_URL=https://www.samphone.eu`
- `CORS_ALLOW_ORIGINS=https://samphone.eu,https://www.samphone.eu,https://www.samphone.pt,https://samphone.pt`
- `CLERK_JWT_ISSUER=https://clerk.samphone.cloud`
- `WP_TABLE_PREFIX=wp_`

JWT, `CLERK_SECRET_KEY`, `STRIPE_SECRET_KEY`, MySQL, SMTP, OpenAI, and DPD stay on the VPS.

## DPD (shipment service on VPS)

Same credentials as the app backend. Do not wrap values in quotes. Sub-account:

`DPD_SUB_ACCOUNT_CODE=031683`

Fill username / password / client id / secret / sender mobile from DPD Portugal, then restart the shipment service. See `samphone.cloud.env.example`.

## Website (WordPress) should match

- **Hero carousel** — same images the API scrapes (`/api/banners`). Don’t swap to a different slider if you want app heroes identical.
- **CORS** — `samphone.eu`, `www.samphone.eu`, `www.samphone.pt`, and `samphone.pt` must be listed on cloud. Restart the API after changing CORS.
- **Clerk** — same live instance (`clerk.samphone.cloud`); allow `https://samphone.eu` and `https://www.samphone.eu`.
- **Stripe** — same live publishable key; secret and webhook (`https://samphone.cloud/api/payments/stripe/webhook`) only on API.
- **Catalog** — Woo/MySQL that `samphone.cloud` already reads (`WP_TABLE_PREFIX=wp_`).
- **Hotlink** — product/banner images on `samphone.pt` should allow `Referer: https://www.samphone.pt/` (the app sends that).

## Related docs

- `docs/AUTH.md` — same Clerk + cloud login for app and website
- `docs/B2B.md` — B2C vs B2B pricing, per-account / product / category discounts, SMTP emails
- `docs/VERCEL.md` — storefront deploy
- `docs/SECURITY.md` — never put secrets in `VITE_*`
