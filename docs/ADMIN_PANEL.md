# Samphone Admin Panel — Enterprise Architecture

Portugal-based ecommerce admin (EUR, IVA/VAT, GDPR, PT/EN) for smartphones, accessories, electronics, and telecom.

## Development flow (module-by-module)

| Step | Deliverable | Status |
|------|-------------|--------|
| **1** | Project folder structure | ✅ This document + scaffold |
| 2 | PostgreSQL database schema (SQL) | Pending confirmation |
| 3 | Prisma models | Pending confirmation |
| 4 | Express backend setup | Pending confirmation |
| 5 | JWT authentication system | Pending confirmation |
| 6 | Product management APIs | Pending confirmation |
| 7 | Customer-specific pricing engine | Pending confirmation |
| 8 | Next.js admin dashboard frontend | Pending confirmation |
| 9 | Inventory + order modules | Pending confirmation |
| 10 | Redis, optimization, deployment | Pending confirmation |

## Monorepo packages

| Package | Path | Role |
|---------|------|------|
| Admin DB | `lib/admin-db` | Prisma schema, migrations, generated client |
| Admin shared | `lib/admin-shared` | Types, IVA constants, validation, i18n keys |
| Admin API | `artifacts/admin-api` | Express REST, JWT, RBAC, modules |
| Admin dashboard | `artifacts/admin-dashboard` | Next.js App Router UI |

**Existing integration (storefront):**

- `artifacts/samphone` — customer storefront (Vite/React)
- `artifacts/api-server` — legacy pricing API (Drizzle); will migrate/consume `admin-api` over time
- `lib/pricing` — pricing priority engine (reused by admin-api)

## Tech stack

- **Frontend:** React 19 + Next.js 15 (App Router), Tailwind CSS 4, dark-mode-ready layout
- **Backend:** Node.js + Express 5, REST, JWT, role-based access
- **Database:** PostgreSQL + Prisma ORM (UUID PKs, soft deletes, indexes, FKs)
- **Cache (Step 10):** Redis
- **Security:** JWT, RBAC, audit logs, rate limiting, CSRF (dashboard), secure headers

## Country / compliance

- Currency: **EUR (€)**
- Tax: **Portuguese IVA** (inclusive/exclusive, tax classes, invoice-ready)
- **GDPR:** consent flags, data export/delete hooks (schema Step 2)
- **i18n:** Portuguese + English (`lib/admin-shared/src/i18n`)

## Admin roles

| Role | Access |
|------|--------|
| Owner | Full |
| Admin | All except billing secrets |
| Staff | Orders, customers (read), products (read) |
| Inventory Manager | Products, stock, warehouses |

## Feature modules → code paths

### 1. Dashboard
`admin-dashboard/src/app/(dashboard)/page.tsx`  
`admin-api/src/modules/analytics/`

### 2. Product management
`admin-api/src/modules/products/`  
`admin-dashboard/src/app/(dashboard)/products/`

### 3. Customer management
`admin-api/src/modules/customers/`  
`admin-dashboard/src/app/(dashboard)/customers/`

### 4. Customer-specific pricing
`admin-api/src/modules/pricing/` (uses `@workspace/pricing` engine)  
`admin-dashboard/src/app/(dashboard)/pricing/`

**Priority:** product price → category discount → sale price → catalog price.

### 5. Categories
`admin-api/src/modules/categories/`  
`admin-dashboard/src/app/(dashboard)/categories/`

### 6. Orders
`admin-api/src/modules/orders/`  
`admin-dashboard/src/app/(dashboard)/orders/`

### 7. Discounts & promotions
`admin-api/src/modules/promotions/`  
`admin-dashboard/src/app/(dashboard)/promotions/`

### 8. Inventory
`admin-api/src/modules/inventory/`  
`admin-dashboard/src/app/(dashboard)/inventory/`

### 9. Security & audit
`admin-api/src/modules/auth/`  
`admin-api/src/modules/audit/`  
`admin-api/src/middleware/`

### 10. VAT / IVA
`admin-api/src/modules/vat/`  
`lib/admin-shared/src/vat/`

## Database tables (Step 2)

`users`, `customers`, `products`, `categories`, `orders`, `order_items`, `discounts`, `customer_prices`, `inventory_logs`, `admin_logs` (+ supporting tables in `lib/admin-db/prisma/`).

## API conventions

- Base URL: `/api/v1/admin`
- Pagination: `?page=&limit=`
- Auth: `Authorization: Bearer <jwt>`
- Errors: `{ error, code, details? }`
- Locale: `Accept-Language: pt|en`

## Environment variables

See `.env.example` in each package (`admin-api`, `admin-dashboard`, `admin-db`).

---

**Next step:** Reply **confirm Step 1** to proceed to **Step 2 — PostgreSQL database schema**.
