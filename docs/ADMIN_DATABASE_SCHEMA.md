# Step 2 — PostgreSQL database schema

Location: `lib/admin-db/sql/` (run in numeric order via `migrate.ps1` or `migrate.sh`).

## Required tables (prompt)

| Table | File | Notes |
|-------|------|--------|
| `users` | `002_users.sql` | Admin JWT users, RBAC roles |
| `customers` | `005_customers.sql` | B2C/B2B/dealer, GDPR fields |
| `products` | `004_catalog.sql` | Full catalog + SKU, IVA, stock |
| `categories` | `004_catalog.sql` | Hierarchy, images, Woo sync |
| `orders` | `008_orders.sql` | EUR totals, invoice fields |
| `order_items` | `008_orders.sql` | Snapshotted prices + `pricing_source` |
| `discounts` | `007_discounts.sql` | Coupons, flash sales, customer-specific |
| `customer_prices` | `006_customer_prices.sql` | Fixed or % per product/category |
| `inventory_logs` | `009_inventory.sql` | Stock movements |
| `admin_logs` | `010_admin_logs.sql` | Audit trail |

## Supporting tables

| Domain | Tables |
|--------|--------|
| Auth | `user_refresh_tokens` |
| VAT | `vat_rules` |
| Catalog | `brands`, `product_images`, `product_variants` |
| Customers | `customer_addresses`, `customer_activity` |
| Pricing audit | `pricing_history` |
| Promotions | `discount_redemptions` |
| Orders | `order_status_history`, `order_refunds` |
| Inventory | `warehouses`, `inventory_stock` |
| GDPR | `gdpr_requests` |

## Design rules

- **PKs:** UUID v4 (`gen_random_uuid()`)
- **Soft delete:** `deleted_at TIMESTAMPTZ` on core entities
- **Timestamps:** `created_at`, `updated_at` (trigger in `011_triggers.sql`)
- **Money:** integer **cents**, `currency` default `EUR`
- **IVA:** `vat_rules.rate_bps`, `order_items.vat_rate_bps`, `vat_display_mode`
- **Indexes:** FK lookups, active rows, low stock, full-text customer search
- **Constraints:** CHECK on price rules, target types, refund amounts

## Customer pricing priority (stored on `order_items.pricing_source`)

1. `customer_product` — `customer_prices` where `target_type = 'product'`
2. `customer_category` — `customer_prices` where `target_type = 'category'`
3. `sale` — `products.sale_price_cents`
4. `catalog` — `products.regular_price_cents`

Engine: `@workspace/pricing` (Step 7).

## Apply locally

```powershell
$env:DATABASE_URL = "postgresql://postgres:password@localhost:5432/samphone_admin"
.\lib\admin-db\sql\migrate.ps1
```

## Seed data (`012_seed_pt.sql`)

- Portuguese IVA rates (23% / 13% / 6% / exempt)
- Default Lisboa warehouse
- Demo customers: joao@, maria@, dealer@

---

**Next:** Reply **confirm Step 2** for **Step 3 — Prisma models**.
