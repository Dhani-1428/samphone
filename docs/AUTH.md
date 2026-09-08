# Shared identity: app ↔ React storefront

Same email/password works on the **Expo app** and the **React website** only when both use:

1. **Clerk Production** — `https://clerk.samphone.cloud` (`pk_live_…`, never `pk_test_` on live hosts)
2. **samphone.cloud API** — browser `/cloud-api` → `https://samphone.cloud/api`
3. **App JWT** — `Authorization: Bearer <access_token>` on catalog, cart, checkout, `/auth/me`

WordPress / WooCommerce “My Account” is a **different** password store. Treat WP as catalog images; login lives in **Clerk + cloud**.

## Storefront behaviour (this repo)

| Action | Flow |
|--------|------|
| Email/password login | Try Clerk `signIn` → `getToken` → `POST /auth/clerk-sync` → app JWT. If Clerk fails → `POST /auth/login`. |
| Apple / Google | Clerk OAuth → `ClerkCloudBridge` → `clerk-sync` with `account_type` from Clerk metadata. |
| Register B2C / B2B | `POST /auth/register` (cloud source of truth), then best-effort Clerk `signUp` + clerk-sync so the same password works in Clerk UI. |
| MFA | If login returns `mfa_required` + `mfa_token` → `POST /auth/mfa/verify`. |
| Shopping | `cloudFetchJson` attaches stored JWT on every non-public path. |

Key files:

- `src/lib/shared-identity-auth.ts`
- `src/lib/samphone-cloud.ts` (`cloudAuth`, `clerkSync`, `cloudMfaVerify`)
- `src/pages/Login.tsx`, `Register.tsx`, `RegisterBusiness.tsx`
- `src/components/ClerkCloudBridge.tsx`
- `src/config/samphone.ts` (Clerk + API public config)

## Checklist

1. Site Clerk = Production `clerk.samphone.cloud` (same publishable key as the app).
2. Login/register/sync hit `samphone.cloud/api` (via `/cloud-api` rewrite).
3. Every shop API call sends the **app JWT**.
4. VPS `CORS_ALLOW_ORIGINS` includes `https://samphone.eu` and `https://www.samphone.eu`.
5. Test: register on app → login on site; reverse (legacy WP user → app already works via cloud `wp_users` import).

## Do not

- Use WooCommerce login as the React site’s login for app-created users
- Use a second Clerk app (dev vs prod)
- Put secrets in `VITE_*`
- Sign in with Clerk only and skip clerk-sync (looks logged in, stays retail on the API)

See also: `docs/STACK.md`, `docs/B2B.md`.
