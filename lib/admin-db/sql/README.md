# SQL migrations (Step 2)

| File | Contents |
|------|----------|
| `000_extensions.sql` | pgcrypto, citext |
| `001_enums.sql` | PostgreSQL enum types |
| `002_users.sql` | `users`, refresh tokens |
| `003_vat.sql` | `vat_rules` |
| `004_catalog.sql` | brands, categories, products, images, variants |
| `005_customers.sql` | customers, addresses, activity |
| `006_customer_prices.sql` | `customer_prices`, `pricing_history` |
| `007_discounts.sql` | `discounts`, `discount_redemptions` |
| `008_orders.sql` | orders, items, status history, refunds |
| `009_inventory.sql` | warehouses, stock, `inventory_logs` |
| `010_admin_logs.sql` | `admin_logs`, `gdpr_requests` |
| `011_triggers.sql` | `updated_at` triggers |
| `012_seed_pt.sql` | PT IVA + demo data |

See `docs/ADMIN_DATABASE_SCHEMA.md` for the full reference.
