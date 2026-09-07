# Website FastAPI backend

This folder is the **same Samphone API** the Expo app uses (`myapi` / `samphone.cloud`), vendored into the website repo so the storefront can run locally and on your own host.

The React app talks to it as `/cloud-api` → `/api` (see `artifacts/samphone/src/lib/samphone-cloud.ts`).

## What it covers

- Catalog: products, search, categories, banners, featured, new-arrivals, home-rails, related
- Auth: register, login, Clerk sync, MFA verify/setup, profile, GDPR export/delete
- Cart, Stripe checkout, orders, stock notify
- Admin: users, wholesale approve/reject/suspend, personal discounts, product prices
- Website leads: contact, newsletter, repair, trade-in
- Shipments (DPD), voice search, translations (same as the app)

## Run locally

```bash
cd backend
cp .env.example .env
# set JWT_SECRET and ADMIN_PASSWORD
chmod +x start.sh
./start.sh
```

API: `http://127.0.0.1:8006/api/health`  
Docs: `http://127.0.0.1:8006/docs` (disabled when `ENVIRONMENT=production`)

Point the storefront at it:

```bash
# artifacts/samphone/.env.local
VITE_SAMPHONE_API_URL=/cloud-api
VITE_SAMPHONE_CLOUD_ORIGIN=http://127.0.0.1:8006
```

Then `pnpm --filter @workspace/samphone dev`. Vite proxies `/cloud-api` → `http://127.0.0.1:8006/api`.

`USE_MEMORY=1` works without MySQL (empty or `products_seed.json` catalog). For live shop data, copy credentials from `samphone.cloud.env.example` and set `USE_CATALOG_MYSQL=1` + `USE_APP_MYSQL=1`.

## Production

Same process as `samphone.cloud`: uvicorn behind nginx/Caddy, env from `samphone.cloud.env.example`. Set Vercel `SAMPHONE_CLOUD_ORIGIN` if `/api/cloud` should proxy somewhere other than `https://samphone.cloud`.
