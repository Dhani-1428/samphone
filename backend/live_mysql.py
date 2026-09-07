"""
Live WooCommerce MySQL helpers.

- Sync / reads: SELECT only (READ ONLY session).
- Price push: optional, narrowly scoped UPDATEs of price-related postmeta so
  admin business-price edits in the app also appear on the live storefront.
"""

from __future__ import annotations

import logging
import os
import socket
from typing import Any, Optional

import pymysql
from pymysql.cursors import DictCursor

logger = logging.getLogger(__name__)

# Only these keys may be written on the live DB (never posts/users/orders).
LIVE_PRICE_META_KEYS = frozenset(
    {
        "_price",
        "_regular_price",
        "_sale_price",
        "wholesale_customer_wholesale_price",
    }
)


def _env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


def live_configured() -> bool:
    return bool(_env("LIVE_MYSQL_HOST") and _env("LIVE_MYSQL_USER") and _env("LIVE_MYSQL_DATABASE"))


def resolve_mysql_host(host: str) -> str:
    """Prefer IPv4 — Hostinger Remote MySQL often only whitelists A-record clients."""
    host = (host or "").strip()
    if not host:
        return host
    try:
        infos = socket.getaddrinfo(host, None, socket.AF_INET, socket.SOCK_STREAM)
        if infos:
            return infos[0][4][0]
    except OSError:
        pass
    return host


def connect_live(*, read_only: bool = True):
    """
    Open a connection to the live WooCommerce DB.

    When read_only=True (default), sets SESSION TRANSACTION READ ONLY so
    accidental writes fail at the MySQL level when the server supports it.
    """
    if not live_configured():
        raise RuntimeError("LIVE_MYSQL_* not configured")
    host = resolve_mysql_host(_env("LIVE_MYSQL_HOST"))
    conn = pymysql.connect(
        host=host,
        user=_env("LIVE_MYSQL_USER"),
        password=_env("LIVE_MYSQL_PASSWORD"),
        database=_env("LIVE_MYSQL_DATABASE"),
        port=int(_env("LIVE_MYSQL_PORT", "3306")),
        charset="utf8mb4",
        cursorclass=DictCursor,
        connect_timeout=20,
        read_timeout=120,
        write_timeout=60,
        autocommit=False,
    )
    if read_only:
        try:
            with conn.cursor() as cur:
                cur.execute("SET SESSION TRANSACTION READ ONLY")
        except Exception:
            logger.debug("Could not set live session READ ONLY", exc_info=True)
    return conn


def _set_postmeta(cur, prefix: str, post_id: int, meta_key: str, meta_value: str) -> None:
    if meta_key not in LIVE_PRICE_META_KEYS:
        raise ValueError(f"Refusing to write non-price meta on live DB: {meta_key}")
    t = f"{prefix}postmeta"
    cur.execute(
        f"UPDATE `{t}` SET meta_value=%s WHERE post_id=%s AND meta_key=%s",
        (meta_value, int(post_id), meta_key),
    )
    if cur.rowcount == 0:
        cur.execute(
            f"INSERT INTO `{t}` (post_id, meta_key, meta_value) VALUES (%s,%s,%s)",
            (int(post_id), meta_key, meta_value),
        )


def push_product_prices_to_live(
    wc_id: int,
    *,
    regular_price: float | None = None,
    sale_price: float | None = None,
    clear_sale: bool = False,
) -> dict[str, Any]:
    """
    Write business / sale prices onto the live WooCommerce product.

    Updates clone-equivalent keys: _regular_price, _sale_price, _price,
    and wholesale_customer_wholesale_price (B2B / business price).
    """
    if not live_configured():
        return {"ok": False, "skipped": True, "reason": "LIVE_MYSQL_* not configured"}
    if regular_price is None and sale_price is None and not clear_sale:
        return {"ok": False, "skipped": True, "reason": "no price fields"}

    prefix = _env("WP_TABLE_PREFIX", "wp_")
    updates: dict[str, str] = {}

    if regular_price is not None:
        reg = f"{float(regular_price):.2f}"
        updates["_regular_price"] = reg
        # Business / wholesale price used by B2B roles on the site.
        updates["wholesale_customer_wholesale_price"] = reg

    if clear_sale:
        updates["_sale_price"] = ""
        if regular_price is not None:
            updates["_price"] = f"{float(regular_price):.2f}"
    elif sale_price is not None:
        if float(sale_price) > 0:
            sale = f"{float(sale_price):.2f}"
            updates["_sale_price"] = sale
            updates["_price"] = sale
        else:
            updates["_sale_price"] = ""
            if regular_price is not None:
                updates["_price"] = f"{float(regular_price):.2f}"
    elif regular_price is not None:
        updates["_price"] = f"{float(regular_price):.2f}"

    try:
        conn = connect_live(read_only=False)
    except Exception as exc:
        logger.warning("Live price push connect failed for wc_id=%s: %s", wc_id, exc)
        return {"ok": False, "error": str(exc), "wc_id": int(wc_id)}

    try:
        with conn.cursor() as cur:
            # If only regular changed, preserve a cheaper live sale when present.
            if regular_price is not None and sale_price is None and not clear_sale and "_price" in updates:
                cur.execute(
                    f"""
                    SELECT meta_value FROM `{prefix}postmeta`
                    WHERE post_id=%s AND meta_key='_sale_price' LIMIT 1
                    """,
                    (int(wc_id),),
                )
                row = cur.fetchone()
                sale_raw = (row or {}).get("meta_value") or ""
                try:
                    sale_f = float(str(sale_raw).strip()) if str(sale_raw).strip() else 0.0
                except (TypeError, ValueError):
                    sale_f = 0.0
                if sale_f > 0 and sale_f < float(regular_price):
                    updates["_price"] = f"{sale_f:.2f}"

            for key, val in updates.items():
                _set_postmeta(cur, prefix, int(wc_id), key, val)

            # Touch post_modified so WP/object caches notice the change.
            cur.execute(
                f"""
                UPDATE `{prefix}posts`
                SET post_modified=NOW(), post_modified_gmt=UTC_TIMESTAMP()
                WHERE ID=%s AND post_type='product'
                """,
                (int(wc_id),),
            )
        conn.commit()
        logger.info("Pushed prices to live WooCommerce wc_id=%s keys=%s", wc_id, sorted(updates))
        return {"ok": True, "wc_id": int(wc_id), "keys": sorted(updates.keys())}
    except Exception as exc:
        conn.rollback()
        logger.exception("Live price push failed for wc_id=%s", wc_id)
        return {"ok": False, "error": str(exc), "wc_id": int(wc_id)}
    finally:
        conn.close()


def push_via_woocommerce_rest(
    wc_id: int,
    *,
    regular_price: float | None = None,
    sale_price: float | None = None,
    clear_sale: bool = False,
) -> dict[str, Any]:
    """Push prices through WooCommerce REST when consumer keys are configured."""
    store = (
        _env("WOOCOMMERCE_STORE_URL")
        or _env("WC_API_URL")
        or _env("WC_SITE_URL")
        or _env("SITE_URL")
    ).rstrip("/")
    key = _env("WOOCOMMERCE_CONSUMER_KEY") or _env("WC_CONSUMER_KEY")
    secret = _env("WOOCOMMERCE_CONSUMER_SECRET") or _env("WC_CONSUMER_SECRET")
    if not (store and key and secret):
        return {"ok": False, "skipped": True, "reason": "WooCommerce REST keys not configured"}

    import requests

    payload: dict[str, Any] = {}
    meta: list[dict[str, str]] = []
    if regular_price is not None:
        payload["regular_price"] = f"{float(regular_price):.2f}"
        meta.append({"key": "wholesale_customer_wholesale_price", "value": f"{float(regular_price):.2f}"})
    if clear_sale:
        payload["sale_price"] = ""
    elif sale_price is not None:
        payload["sale_price"] = f"{float(sale_price):.2f}" if float(sale_price) > 0 else ""
    if meta:
        payload["meta_data"] = meta
    if not payload:
        return {"ok": False, "skipped": True, "reason": "no price fields"}

    # Hostinger/FastCGI often strips HTTP Basic Authorization — use query auth.
    url = f"{store}/wp-json/wc/v3/products/{int(wc_id)}"
    params = {"consumer_key": key, "consumer_secret": secret}
    try:
        r = requests.put(url, params=params, json=payload, timeout=30)
        if r.status_code >= 400:
            return {"ok": False, "error": f"HTTP {r.status_code}: {r.text[:300]}", "wc_id": int(wc_id)}
        return {"ok": True, "via": "woocommerce_rest", "wc_id": int(wc_id)}
    except Exception as exc:
        return {"ok": False, "error": str(exc), "wc_id": int(wc_id)}


def push_business_price_to_site(
    wc_id: int,
    *,
    regular_price: float | None = None,
    sale_price: float | None = None,
    clear_sale: bool = False,
) -> dict[str, Any]:
    """
    Push business/sale prices to the live storefront.

    Default: WooCommerce REST only (LIVE_MYSQL stays read-only for sync).
    Optional: set LIVE_MYSQL_ALLOW_PRICE_PUSH=1 to also/fallback write price
    postmeta on the live DB (narrow keys only).
    """
    rest = push_via_woocommerce_rest(
        wc_id,
        regular_price=regular_price,
        sale_price=sale_price,
        clear_sale=clear_sale,
    )
    if rest.get("ok"):
        return rest

    allow_mysql_push = _env("LIVE_MYSQL_ALLOW_PRICE_PUSH", "0") == "1"
    if not allow_mysql_push:
        if rest.get("skipped"):
            return {
                "ok": False,
                "skipped": True,
                "reason": (
                    "Set WOOCOMMERCE_CONSUMER_KEY/SECRET for site price push, "
                    "or LIVE_MYSQL_ALLOW_PRICE_PUSH=1 for scoped live MySQL writes"
                ),
                "rest": rest,
            }
        return rest

    if not rest.get("skipped"):
        logger.warning("WooCommerce REST price push failed, trying live MySQL: %s", rest)

    return push_product_prices_to_live(
        wc_id,
        regular_price=regular_price,
        sale_price=sale_price,
        clear_sale=clear_sale,
    )
