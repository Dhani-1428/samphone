# @workspace/admin-api

Express REST API for the Samphone admin panel.

## Module layout (`src/modules/`)

| Module | Routes prefix | Step |
|--------|---------------|------|
| `auth` | `/auth` | 5 |
| `products` | `/products` | 6 |
| `categories` | `/categories` | 6 |
| `customers` | `/customers` | 6 |
| `pricing` | `/pricing` | 7 |
| `promotions` | `/promotions` | 7 |
| `orders` | `/orders` | 9 |
| `inventory` | `/inventory` | 9 |
| `vat` | `/vat` | 6 |
| `analytics` | `/analytics` | 8 |
| `audit` | `/audit` | 5 |

## Middleware

- `authenticate` — JWT validation
- `authorize(roles)` — RBAC
- `rateLimit` — express-rate-limit
- `validate(schema)` — Zod request validation
- `auditLog` — admin action logging

**Step 1:** scaffold only. Run `pnpm install` before Step 4.
