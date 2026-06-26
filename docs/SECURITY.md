# Security — credentials, API protection, and production hardening

> **Primary rule:** Real security is **server-side**. Never put API keys, database URLs, or admin tokens in frontend code or `VITE_*` variables. Client obfuscation and DevTools blocking are **deterrents only** — they cannot stop a determined user.

---

## Quick checklist

| Measure | Status in this repo |
|--------|---------------------|
| Environment variables for secrets | `artifacts/api-server/.env` |
| `.gitignore` excludes `.env*` | Root + artifact `.gitignore` |
| Backend API proxy (no direct Woo calls) | `/api/woocommerce/*` |
| Rate limiting | Global + per-route on API |
| Request validation (Zod) | Pricing routes |
| CORS restricted in production | `CORS_ORIGINS` on API server |
| Security headers (Helmet) | API server |
| CSP + headers on static host | `artifacts/samphone/public/.htaccess` |
| No source maps in production | `vite.config.ts` |
| Console stripped in production | `esbuild.drop` in Vite |
| Code splitting | Vite `manualChunks` |
| DevTools deterrent (prod only) | `src/lib/security-hardening.ts` |
| HTTPS | Configure on host / reverse proxy |

---

## Folder structure (credential management)

```
Scroll-Animation/
├── .gitignore                    # Ignores .env, .env.local, node_modules, dist
├── docs/
│   └── SECURITY.md               # This file
├── artifacts/
│   ├── api-server/
│   │   ├── .env                  # SERVER ONLY — never commit
│   │   ├── .env.example          # Template (no real secrets)
│   │   └── src/
│   │       ├── lib/
│   │       │   ├── woocommerce-config.ts   # Reads WOOCOMMERCE_* from process.env
│   │       │   ├── env-validation.ts       # Startup warnings for weak/missing env
│   │       │   └── security-headers.ts     # Helmet configuration
│   │       ├── middleware/
│   │       │   ├── rate-limit.ts           # In-memory rate limiter
│   │       │   └── admin-auth.ts           # Bearer / X-Admin-Token for admin API
│   │       └── routes/
│   │           ├── woocommerce.ts          # Proxy — adds credentials server-side
│   │           └── pricing.ts              # Zod-validated pricing API
│   └── samphone/
│       ├── .env.local            # PUBLIC VITE_* only — safe in browser
│       ├── .env.example
│       ├── vite.config.ts        # Prod: no sourcemaps, drop console, chunk split
│       ├── public/.htaccess      # CSP + security headers for Apache hosts
│       └── src/
│           ├── config/woocommerce.ts       # Proxy path only — no secrets
│           └── lib/
│               ├── woocommerce.ts          # Calls /api/woocommerce (never WP directly)
│               └── security-hardening.ts   # Prod deterrents (optional)
```

---

## What must never be in the frontend

| Secret | Server location | Never in |
|--------|-----------------|----------|
| WooCommerce consumer key/secret | `artifacts/api-server/.env` | `VITE_*`, client code, git |
| Pricing admin token | `PRICING_ADMIN_TOKEN` on API | `VITE_*`, client code |
| Database URL | `DATABASE_URL` on API | anywhere public |

Anything prefixed with **`VITE_`** is embedded in the JavaScript bundle. Users can always read it in DevTools → Sources / Network.

---

## Backend security

### 1. API server environment (`artifacts/api-server/.env`)

```env
PORT=8080
WOOCOMMERCE_STORE_URL=https://www.samphone.pt
WOOCOMMERCE_CONSUMER_KEY=ck_...
WOOCOMMERCE_CONSUMER_SECRET=cs_...
PRICING_ADMIN_TOKEN=long-random-secret-min-32-chars
PRICING_ADMIN_EMAIL=admin@samphone.pt
CORS_ORIGINS=https://www.samphone.pt,https://samphone.pt,http://localhost:5173
```

Copy from `.env.example`. Start the server with:

```bash
cd artifacts/api-server
pnpm run build
pnpm run start
```

`pnpm run start` loads `.env` via Node `--env-file=.env`.

### 2. WooCommerce proxy (hide real endpoints & keys)

The storefront calls **`/api/woocommerce/products`** etc. The API server:

1. Validates the path (read-only `products` / `products/categories` only)
2. Appends `consumer_key` / `consumer_secret` server-side
3. Forwards to `https://your-store/wp-json/wc/v3/...`
4. Rate-limits clients (180 req/min per IP on Woo routes; 300 global)

```typescript
// artifacts/api-server/src/routes/woocommerce.ts (concept)
router.get("{*path}", async (req, res) => {
  const cfg = getWooServerConfig(); // from process.env only
  // ... validate path, fetch upstream with credentials in query string
});
```

### 3. CORS

In production, set `CORS_ORIGINS` to your real storefront origins. Without it, the API accepts any origin (logged as a startup warning).

### 4. Admin authentication

Admin pricing routes require:

```
Authorization: Bearer <PRICING_ADMIN_TOKEN>
```

or header `X-Admin-Token`. The storefront admin UI stores the token in **`sessionStorage`** after login at `/admin/pricing` — not in env files.

### 5. Request validation & body limits

- Pricing POST bodies validated with **Zod** (`artifacts/api-server/src/routes/pricing.ts`)
- JSON/urlencoded body limit: **100kb** (`artifacts/api-server/src/app.ts`)

---

## Frontend security

### 1. Storefront env (`artifacts/samphone/.env.local`)

```env
VITE_WOOCOMMERCE_STORE_URL=https://www.samphone.pt
VITE_WOOCOMMERCE_CURRENCY_SYMBOL=€
# Optional — defaults shown:
# VITE_WOO_API_BASE=/api/woocommerce
# VITE_PRICING_API_URL=/api
```

**Do not set** `VITE_WOO_USE_CLIENT_CREDENTIALS=true` in production (that flag is for legacy/debug only and would expose keys if paired with `VITE_WOOCOMMERCE_CONSUMER_*`).

### 2. Production build (`vite.config.ts`)

| Setting | Production behavior |
|---------|---------------------|
| `sourcemap: false` | No `.map` files shipped |
| `esbuild.drop: ['console','debugger']` | Strips logs from bundle |
| `legalComments: 'none'` | Removes comments |
| `manualChunks` | Splits vendor code (React, Radix, motion) |
| `minify: 'esbuild'` | Minified output |

Build:

```bash
pnpm --filter @workspace/samphone run build
```

### 3. DevTools deterrent (secondary only)

`src/lib/security-hardening.ts` runs in production only:

- Blocks context menu (right-click → Inspect)
- Blocks F12, Ctrl+Shift+I/J/C, Ctrl+U

**This is bypassable.** It does not protect secrets — the proxy architecture does.

### 4. Optional: stronger obfuscation

For additional obscurity (not security), consider:

- [`vite-plugin-javascript-obfuscator`](https://www.npmjs.com/package/vite-plugin-javascript-obfuscator) — increases bundle size and can break debugging
- Server-side rendering (SSR) — hides less logic but improves SEO; not required for this SPA

---

## API protection summary

```
Browser  →  /api/woocommerce/products  →  Vite proxy (dev) or Apache/Nginx (prod)
         →  API server :8080            →  WooCommerce REST (credentials added here)
```

- External WooCommerce URL and keys never appear in the browser bundle
- Rate limiting on all `/api` routes
- Helmet security headers on API responses
- Trust proxy enabled for correct client IP behind load balancers

---

## Static host headers (Apache)

`artifacts/samphone/public/.htaccess` sets:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy` (fonts, images, connect-src)

**Update CSP `connect-src`** when your API runs on a different subdomain (e.g. `https://api.samphone.pt`).

For **Nginx**, equivalent:

```nginx
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
# add_header Content-Security-Policy "..." always;
```

---

## HTTPS / SSL

- Terminate TLS at your host (Replit, Vercel, Cloudflare, Apache/Nginx)
- API server sets **HSTS** via Helmet when `NODE_ENV=production`
- Never send `PRICING_ADMIN_TOKEN` or Woo keys over plain HTTP in production

---

## Development

Run both processes:

```bash
# Terminal 1 — API (port 8080)
cd artifacts/api-server && pnpm run build && pnpm run start

# Terminal 2 — Storefront (port 5173)
pnpm --filter @workspace/samphone dev
```

Vite proxies `/api` → `http://127.0.0.1:8080`.

---

## Production deployment

1. Deploy **API server** (Node) on a private host or `api.` subdomain
2. Set all secrets in the host's environment (not in the git repo)
3. Proxy `/api` from the web server to the API (see commented rules in `.htaccess`)
4. Build storefront **after** removing any old `VITE_WOOCOMMERCE_CONSUMER_*` from env
5. Set `CORS_ORIGINS` to production storefront URL(s) only
6. Use **read-only** WooCommerce REST keys where possible

---

## If keys were already exposed

1. **Revoke** keys in WordPress → WooCommerce → Settings → Advanced → REST API
2. Create new **read-only** keys → `artifacts/api-server/.env` only
3. Rotate `PRICING_ADMIN_TOKEN`
4. Rebuild and redeploy the storefront bundle
5. Clear CDN/browser caches if applicable

---

## Tools & libraries used

| Layer | Tool |
|-------|------|
| API framework | Express 5 |
| Security headers | `helmet` |
| CORS | `cors` |
| Validation | `zod` |
| Rate limiting | Custom middleware (use Redis for multi-instance prod) |
| Frontend build | Vite 7 + esbuild minify |
| Logging | `pino` (no secrets in request logs) |

---

## Tamper detection (optional pattern)

For high-assurance admin panels, you can:

1. Serve critical admin JS with **Subresource Integrity** (`integrity=` on `<script>`)
2. Compare build hash on the server at deploy time
3. Alert if static assets change outside CI

This repo does not enable SRI by default (Vite hashed filenames change each build). Document for ops if needed.

---

## Related docs

- `docs/PRICING_SYSTEM.md` — pricing API and admin flow
- `artifacts/samphone/.env.example` — safe public vars
- `artifacts/api-server/.env.example` — server secrets template
