# Samphone stack (website ↔ app ↔ cloud)

The storefront, Expo app, and `samphone.cloud` share one backend so catalog, banners, orders, auth, and shipping stay in sync. The app never calls DPD directly — catalog, banners, orders, and DPD all go through `samphone.cloud`.

## Live hosts

| Role | URL |
|------|-----|
| Shop (WordPress / WooCommerce) | https://www.samphone.pt ([https://samphone.pt](https://samphone.pt)) |
| App + API | https://samphone.cloud → `/api` |
| Clerk | https://clerk.samphone.cloud |
| Android package | `com.samphone.app` |
| iOS bundle | `com.samphone.app` |

## What the website / app already use (public)

Put these on the website (Vercel / local `VITE_*`) so checkout, login, and banners match the app. App names are `EXPO_PUBLIC_*`; website names are `VITE_*`.

```bash
# Public API (no trailing slash, no /api)
# App: EXPO_PUBLIC_BACKEND_URL / EXPO_PUBLIC_API_URL
VITE_SAMPHONE_CLOUD_ORIGIN=https://samphone.cloud
# Browser uses same-origin /cloud-api → https://samphone.cloud/api
VITE_SAMPHONE_API_URL=/cloud-api

# Clerk (publishable — same live instance as EAS)
VITE_CLERK_PUBLISHABLE_KEY=pk_live_Y2xlcmsuc2FtcGhvbmUuY2xvdWQk
VITE_CLERK_FRONTEND_API=https://clerk.samphone.cloud

# Stripe (publishable — secret only on API)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51TsRh0IFNHslwSxObrZX8Fx7eneUwyjSeSj0QmbJJKB39lmLDrwNzGOjfk646Y4hacs0jyT9bJSPpGuk4hlojYTy00Ir71HQaq

VITE_WOOCOMMERCE_STORE_URL=https://www.samphone.pt
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
- `SITE_URL=https://www.samphone.pt`
- `CORS_ALLOW_ORIGINS=https://www.samphone.pt,https://samphone.pt,https://staging.samphone.pt,https://samphone.cloud`
- `CLERK_JWT_ISSUER=https://clerk.samphone.cloud`
- `WP_TABLE_PREFIX=wp_`

JWT, `CLERK_SECRET_KEY`, `STRIPE_SECRET_KEY`, MySQL, SMTP, OpenAI, and DPD stay on the VPS.

## DPD (shipment service on VPS)

Same credentials as the app backend. Do not wrap values in quotes. Sub-account:

`DPD_SUB_ACCOUNT_CODE=031683`

Fill username / password / client id / secret / sender mobile from DPD Portugal, then restart the shipment service. See `samphone.cloud.env.example`.

## Website (WordPress) should match

- **Hero carousel** — same images the API scrapes (`/api/banners`). Don’t swap to a different slider if you want app heroes identical.
- **CORS** — `www.samphone.pt` and `samphone.pt` already listed on cloud.
- **Clerk** — same live instance (`clerk.samphone.cloud`), same publishable key as the app.
- **Stripe** — same live publishable key; secret only on API.
- **Catalog** — Woo/MySQL that `samphone.cloud` already reads (`WP_TABLE_PREFIX=wp_`).
- **Hotlink** — product/banner images on `samphone.pt` should allow `Referer: https://www.samphone.pt/` (the app sends that).

## Related docs

- `docs/VERCEL.md` — storefront deploy
- `docs/SECURITY.md` — never put secrets in `VITE_*`
