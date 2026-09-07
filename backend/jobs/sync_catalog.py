"""
One-way sync: live WooCommerce DB (read-only) → app catalog DB.

NEVER writes to the live site database (e.g. u552904336_NbzPn).
Only updates the app clone (u552904336_samappdb) via optional UPSERTs of
changed product posts/postmeta when LIVE_MYSQL_* is configured.

Run:
  python -m jobs.sync_catalog
  python -m jobs.sync_catalog --prices          # full price-meta catch-up
  python -m jobs.sync_catalog --orders          # full WooCommerce order history
  # or enable SYNC_CATALOG_ON_STARTUP=1 for a 5-minute background loop in server.py
"""
from __future__ import annotations

import logging
import os
import sys
import time
from pathlib import Path
from typing import Any, Iterable, Optional

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=True)

from catalog_db import get_catalog_db
from live_mysql import connect_live, live_configured

logger = logging.getLogger(__name__)

# Price / stock keys that drive business pricing in the app.
PRICE_META_KEYS = (
    "_sku",
    "_price",
    "_regular_price",
    "_sale_price",
    "_stock",
    "_stock_status",
    "_manage_stock",
    "wholesale_customer_wholesale_price",
    "wholesale_customer_have_wholesale_price",
)

# Broader set for recently-changed product sync.
CHANGED_META_KEYS = PRICE_META_KEYS + (
    "_thumbnail_id",
    "total_sales",
    "_wc_average_rating",
    "_wc_review_count",
    "_product_image_gallery",
)

# Rotating cursor for background price catch-up.
_price_sync_after_id = 0


def _env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


def _upsert_meta_rows(cur, prefix: str, meta_rows: Iterable[dict]) -> int:
    updated = 0
    for m in meta_rows:
        cur.execute(
            f"""
            SELECT meta_id FROM `{prefix}postmeta`
            WHERE post_id=%s AND meta_key=%s LIMIT 1
            """,
            (int(m["post_id"]), m["meta_key"]),
        )
        existing = cur.fetchone()
        if existing:
            cur.execute(
                f"UPDATE `{prefix}postmeta` SET meta_value=%s WHERE meta_id=%s",
                (m.get("meta_value"), int(existing["meta_id"])),
            )
        else:
            cur.execute(
                f"INSERT INTO `{prefix}postmeta` (post_id, meta_key, meta_value) VALUES (%s,%s,%s)",
                (int(m["post_id"]), m["meta_key"], m.get("meta_value")),
            )
        updated += 1
    return updated


def _replace_meta_for_products(
    cur,
    prefix: str,
    product_ids: list[int],
    meta_keys: tuple[str, ...],
    meta_rows: list[dict],
) -> int:
    """Delete then bulk-insert price meta for a product batch (faster catch-up)."""
    if not product_ids:
        return 0
    id_ph = ",".join(["%s"] * len(product_ids))
    key_ph = ",".join(["%s"] * len(meta_keys))
    cur.execute(
        f"""
        DELETE FROM `{prefix}postmeta`
        WHERE post_id IN ({id_ph})
          AND meta_key IN ({key_ph})
        """,
        list(product_ids) + list(meta_keys),
    )
    if not meta_rows:
        return 0
    cur.executemany(
        f"INSERT INTO `{prefix}postmeta` (post_id, meta_key, meta_value) VALUES (%s,%s,%s)",
        [(int(m["post_id"]), m["meta_key"], m.get("meta_value")) for m in meta_rows],
    )
    return len(meta_rows)


def sync_changed_products(*, since_minutes: int = 10, limit: int = 500) -> dict[str, Any]:
    """
    Copy recently modified product rows + key postmeta from live → app DB.

    Safety: only SELECT from live (READ ONLY session); INSERT/UPDATE only on catalog DB.
    """
    if not live_configured():
        return {"ok": False, "skipped": True, "reason": "LIVE_MYSQL_* not configured (read-only sync source)"}

    catalog = get_catalog_db()
    if not catalog.configured():
        return {"ok": False, "error": "Catalog MySQL not configured"}

    # IMPORTANT: live connection is read-only — never write to the live site here.
    try:
        live = connect_live(read_only=True)
    except Exception as exc:
        logger.warning("Live catalog sync connect failed: %s", exc)
        return {"ok": False, "error": str(exc)}
    prefix = _env("WP_TABLE_PREFIX", "wp_")
    started = time.time()
    changed = 0
    try:
        with live.cursor() as cur:
            cur.execute(
                f"""
                SELECT ID, post_title, post_name, post_content, post_excerpt, post_status, post_type,
                       post_date, post_modified
                FROM `{prefix}posts`
                WHERE post_type='product'
                  AND post_modified >= (NOW() - INTERVAL %s MINUTE)
                ORDER BY post_modified DESC
                LIMIT %s
                """,
                (int(since_minutes), int(limit)),
            )
            posts = cur.fetchall()
            ids = [int(p["ID"]) for p in posts]
            meta_rows = []
            if ids:
                ph = ",".join(["%s"] * len(ids))
                key_ph = ",".join(["%s"] * len(CHANGED_META_KEYS))
                cur.execute(
                    f"""
                    SELECT post_id, meta_key, meta_value
                    FROM `{prefix}postmeta`
                    WHERE post_id IN ({ph})
                      AND meta_key IN ({key_ph})
                    """,
                    ids + list(CHANGED_META_KEYS),
                )
                meta_rows = cur.fetchall()
    finally:
        live.close()

    with catalog.connect() as conn:
        with conn.cursor() as cur:
            for p in posts:
                cur.execute(
                    f"""
                    INSERT INTO `{prefix}posts`
                      (ID, post_author, post_date, post_date_gmt, post_content, post_title, post_excerpt,
                       post_status, comment_status, ping_status, post_password, post_name, to_ping, pinged,
                       post_modified, post_modified_gmt, post_content_filtered, post_parent, guid, menu_order,
                       post_type, post_mime_type, comment_count)
                    VALUES
                      (%s, 1, %s, %s, %s, %s, %s,
                       %s, 'closed', 'closed', '', %s, '', '',
                       %s, %s, '', 0, '', 0,
                       %s, '', 0)
                    ON DUPLICATE KEY UPDATE
                      post_title=VALUES(post_title),
                      post_name=VALUES(post_name),
                      post_content=VALUES(post_content),
                      post_excerpt=VALUES(post_excerpt),
                      post_status=VALUES(post_status),
                      post_modified=VALUES(post_modified),
                      post_modified_gmt=VALUES(post_modified_gmt)
                    """,
                    (
                        int(p["ID"]),
                        p["post_date"],
                        p["post_date"],
                        p.get("post_content") or "",
                        p.get("post_title") or "",
                        p.get("post_excerpt") or "",
                        p.get("post_status") or "publish",
                        p.get("post_name") or "",
                        p["post_modified"],
                        p["post_modified"],
                        p.get("post_type") or "product",
                    ),
                )
                changed += 1
            meta_updated = _upsert_meta_rows(cur, prefix, meta_rows)
        conn.commit()

    return {
        "ok": True,
        "changed_posts": changed,
        "meta_rows": meta_updated,
        "ms": int((time.time() - started) * 1000),
    }


def sync_price_meta(
    *,
    batch_size: int = 500,
    after_id: int = 0,
    max_products: Optional[int] = None,
) -> dict[str, Any]:
    """
    Catch-up sync of business price meta from live → clone.

    Incremental `sync_changed_products` only touches recently modified posts, so
    stale/_zero/_missing prices on the clone never heal. This walks product IDs
    and overwrites price-related postmeta from the live storefront (read-only).

    Reconnects to live MySQL each batch (Hostinger drops long SSL sessions).
    """
    if not live_configured():
        return {"ok": False, "skipped": True, "reason": "LIVE_MYSQL_* not configured (read-only sync source)"}

    catalog = get_catalog_db()
    if not catalog.configured():
        return {"ok": False, "error": "Catalog MySQL not configured"}

    prefix = _env("WP_TABLE_PREFIX", "wp_")
    started = time.time()
    products_seen = 0
    meta_updated = 0
    cursor_id = int(after_id)
    next_after = cursor_id
    remaining = max_products
    errors = 0

    while True:
        limit = int(batch_size)
        if remaining is not None:
            if remaining <= 0:
                break
            limit = min(limit, int(remaining))

        try:
            live = connect_live(read_only=True)
        except Exception as exc:
            logger.warning("Live price sync connect failed: %s", exc)
            return {"ok": False, "error": str(exc), "products": products_seen, "meta_rows": meta_updated}

        try:
            with live.cursor() as cur:
                cur.execute(
                    f"""
                    SELECT ID
                    FROM `{prefix}posts`
                    WHERE post_type='product'
                      AND post_status='publish'
                      AND ID > %s
                    ORDER BY ID ASC
                    LIMIT %s
                    """,
                    (cursor_id, limit),
                )
                ids = [int(r["ID"]) for r in cur.fetchall()]
                if not ids:
                    next_after = 0
                    break

                ph = ",".join(["%s"] * len(ids))
                key_ph = ",".join(["%s"] * len(PRICE_META_KEYS))
                cur.execute(
                    f"""
                    SELECT post_id, meta_key, meta_value
                    FROM `{prefix}postmeta`
                    WHERE post_id IN ({ph})
                      AND meta_key IN ({key_ph})
                    """,
                    ids + list(PRICE_META_KEYS),
                )
                meta_rows = list(cur.fetchall())
        except Exception as exc:
            errors += 1
            logger.warning("Live price sync batch failed after_id=%s: %s", cursor_id, exc)
            if errors >= 3:
                return {
                    "ok": False,
                    "error": str(exc),
                    "products": products_seen,
                    "meta_rows": meta_updated,
                    "next_after_id": cursor_id,
                }
            time.sleep(2)
            continue
        finally:
            try:
                live.close()
            except Exception:
                pass

        with catalog.connect() as conn:
            with conn.cursor() as cur:
                meta_updated += _replace_meta_for_products(
                    cur, prefix, ids, PRICE_META_KEYS, meta_rows
                )
            conn.commit()

        products_seen += len(ids)
        cursor_id = ids[-1]
        next_after = cursor_id
        errors = 0
        if remaining is not None:
            remaining -= len(ids)
            if remaining <= 0:
                break
        if products_seen % 2000 == 0:
            logger.info("Price sync progress: products=%s meta_rows=%s after_id=%s", products_seen, meta_updated, next_after)

    return {
        "ok": True,
        "products": products_seen,
        "meta_rows": meta_updated,
        "next_after_id": int(next_after),
        "ms": int((time.time() - started) * 1000),
    }


def sync_price_meta_batch(*, batch_size: int = 1000) -> dict[str, Any]:
    """Background-friendly rotating batch of price meta catch-up."""
    global _price_sync_after_id
    result = sync_price_meta(batch_size=batch_size, after_id=_price_sync_after_id, max_products=batch_size)
    if result.get("ok"):
        nxt = int(result.get("next_after_id") or 0)
        # If batch returned fewer than requested, we hit the end — restart next tick.
        if int(result.get("products") or 0) < batch_size:
            _price_sync_after_id = 0
            result["wrapped"] = True
        else:
            _price_sync_after_id = nxt
        result["after_id"] = _price_sync_after_id
    return result


# HPOS / classic WooCommerce order tables copied live → clone (read-only from live).
ORDER_SYNC_TABLES: tuple[tuple[str, str], ...] = (
    ("wc_orders", "id"),
    ("wc_order_addresses", "id"),
    ("wc_order_operational_data", "id"),
    ("wc_orders_meta", "id"),
    ("woocommerce_order_items", "order_item_id"),
    ("woocommerce_order_itemmeta", "meta_id"),
)


def _upsert_table_rows(
    cur,
    *,
    table: str,
    pk: str,
    rows: list[dict],
) -> int:
    if not rows:
        return 0
    cols = list(rows[0].keys())
    col_sql = ", ".join(f"`{c}`" for c in cols)
    placeholders = ", ".join(["%s"] * len(cols))
    updates = ", ".join(f"`{c}`=VALUES(`{c}`)" for c in cols if c != pk)
    sql = (
        f"INSERT INTO `{table}` ({col_sql}) VALUES ({placeholders}) "
        f"ON DUPLICATE KEY UPDATE {updates}"
    )
    values = [tuple(row.get(c) for c in cols) for row in rows]
    # Chunk executemany — much faster than one INSERT per row for itemmeta.
    chunk = 200
    for i in range(0, len(values), chunk):
        cur.executemany(sql, values[i : i + chunk])
    return len(values)


def sync_orders(*, batch_size: int = 2000) -> dict[str, Any]:
    """
    Full one-way sync of WooCommerce orders: live (READ ONLY) → catalog clone.
    Keeps Admin → Orders website history complete (newest → oldest in the API).
    """
    if not live_configured():
        return {"ok": False, "error": "LIVE_MYSQL_* not configured"}

    started = time.time()
    catalog = get_catalog_db()
    if not catalog.configured():
        return {"ok": False, "error": "Catalog MySQL not configured"}

    prefix = _env("WP_TABLE_PREFIX", "wp_") or "wp_"
    live = connect_live(read_only=True)
    counts: dict[str, int] = {}
    try:
        with live.cursor() as lcur, catalog.connect() as conn:
            with conn.cursor() as ccur:
                for short, pk in ORDER_SYNC_TABLES:
                    table = f"{prefix}{short}"
                    t0 = time.time()
                    lcur.execute(f"SELECT COUNT(*) AS n FROM `{table}`")
                    total = int((lcur.fetchone() or {}).get("n") or 0)
                    synced = 0
                    after_id = 0
                    while True:
                        lcur.execute(
                            f"""
                            SELECT * FROM `{table}`
                            WHERE `{pk}` > %s
                            ORDER BY `{pk}` ASC
                            LIMIT %s
                            """,
                            (after_id, int(batch_size)),
                        )
                        rows = lcur.fetchall() or []
                        if not rows:
                            break
                        synced += _upsert_table_rows(ccur, table=table, pk=pk, rows=list(rows))
                        after_id = int(rows[-1][pk])
                        conn.commit()
                        if len(rows) < batch_size:
                            break
                    counts[short] = synced
                    logger.info(
                        "Order sync %s: %s/%s rows in %sms",
                        short,
                        synced,
                        total,
                        int((time.time() - t0) * 1000),
                    )
    except Exception as exc:
        logger.exception("Order sync failed: %s", exc)
        return {"ok": False, "error": str(exc), "tables": counts}
    finally:
        try:
            live.close()
        except Exception:
            pass

    return {
        "ok": True,
        "tables": counts,
        "ms": int((time.time() - started) * 1000),
    }


def sync_catalog_tick(
    *,
    since_minutes: int = 10,
    price_batch_size: int = 1000,
    refresh_public_prices: bool = False,
    sync_orders_too: bool = False,
) -> dict[str, Any]:
    """Recent changes + rotating price catch-up (used by the API background loop)."""
    changed = sync_changed_products(since_minutes=since_minutes)
    prices = sync_price_meta_batch(batch_size=price_batch_size)
    public = None
    orders = None
    if refresh_public_prices:
        try:
            from woocommerce_client import get_woo_db

            woo = get_woo_db()
            if hasattr(woo, "sync_accessory_public_prices"):
                public = woo.sync_accessory_public_prices(batch_size=400, max_products=20000)
        except Exception as exc:
            logger.warning("Public price band refresh failed: %s", exc)
            public = {"ok": False, "error": str(exc)}
    if sync_orders_too:
        orders = sync_orders()
    return {
        "ok": bool(changed.get("ok") and prices.get("ok")),
        "changed": changed,
        "prices": prices,
        "public_prices": public,
        "orders": orders,
    }


def run_loop(interval_sec: int = 300) -> None:
    logging.basicConfig(level=logging.INFO)
    while True:
        try:
            result = sync_catalog_tick(since_minutes=max(6, interval_sec // 60 + 1))
            logger.info("Catalog sync: %s", result)
        except Exception as exc:
            logger.exception("Catalog sync failed: %s", exc)
        time.sleep(interval_sec)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    if "--orders" in sys.argv:
        print(sync_orders())
    elif "--prices" in sys.argv:
        print(sync_price_meta(batch_size=500, after_id=0, max_products=None))
    else:
        print(sync_catalog_tick())
