# Catalog from MySQL clone

The app uses **one MySQL database**: `u552904336_samappdb`.

| Concern | Tables | Access |
|---------|--------|--------|
| Products, categories, images, stock | `wp_*` | App reads; sync may write |
| B2C overrides / markup / uuid map | `samphone_*` | App writes |
| Users, orders, wholesale, notifications, carts | `users`, `orders`, `notifications`, … | App R/W |
| Live site WooCommerce | `u552904336_NbzPn` | **SELECT only** if sync enabled — never write |

`u552904336_appdb` is **retired** — do not point the app at it.

Backend is Python (FastAPI). Catalog entrypoint: `woocommerce_client.get_woo_db()` → `CatalogService` when `USE_CATALOG_MYSQL=1`. App data: `app_db.get_app_db()` (same DB credentials via `CATALOG_MYSQL_*` / `DB_*`).

## Pricing

- **B2B** = Woo `_price` (or wholesale meta when present)
- **B2C accessories** = `samphone_b2c_pricing.public_price` (or `b2c_price` override) → markup → `samphone_public_price_bands` / `PUBLIC_PRICE_BANDS` (e.g. €50–60 → €89.90). Business accounts keep live DB/wholesale prices (`business_price` is a snapshot only); phone parts are not band-mapped.

## Run

```bash
cd backend
# Ensure .env has USE_CATALOG_MYSQL=1, USE_APP_MYSQL=1, USE_WOOCOMMERCE=0, CATALOG_MYSQL_* → samappdb
python -m uvicorn server:app --host 0.0.0.0 --port 8007 --reload
```

Key endpoints: `/api/products`, `/api/products-search`, `/api/categories`, `/api/brands`, `/api/featured`, `/api/new-arrivals`, `/api/related/{id}`.

Admin: `POST /api/admin/products/{id}/b2c-price`, `POST /api/admin/pricing/markup`.

## Hostinger remote access

From your PC, use `DB_HOST=srv1038.hstgr.io` (not `127.0.0.1` unless you have an SSH tunnel).

If you get `Access denied for user '…'@'YOUR_IP'`:

1. hPanel → **Databases** → **Remote MySQL**
2. Add your public IP (or `%` for any host — less secure)
3. Confirm the DB user is allowed on `u552904336_samappdb`

## Hostinger connection limit

Shared hosting often caps **~500 MySQL connections per hour**. This codebase uses a **pool of 2** (`CATALOG_MYSQL_POOL_SIZE`).

## Optional live → clone sync

```bash
# Set LIVE_MYSQL_* (read-only credentials for live DB)
python -m jobs.sync_catalog
# or SYNC_CATALOG_ON_STARTUP=1 (5-minute loop)
```

Sync only `SELECT`s from live and `INSERT`/`UPDATE`s on the clone.
