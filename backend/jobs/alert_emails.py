"""Automatic account alert emails: restock, new arrivals, promotions."""
from __future__ import annotations

import json
import logging
from typing import Any, Optional

import data_store
from email_service import send_back_in_stock_email, send_restock_subscribed_email
from push_service import PREF_DEFAULTS, prefs_allow_email

logger = logging.getLogger(__name__)

NEW_ARRIVAL_META = "alert_new_arrival_ids"


def _product_in_stock(product: Optional[dict]) -> bool:
    if not product:
        return False
    if product.get("in_stock") is True:
        return True
    try:
        return int(product.get("stock_quantity") or 0) > 0
    except (TypeError, ValueError):
        return False


def _product_title(product: Optional[dict]) -> str:
    if not product:
        return "Product"
    return str(product.get("title") or product.get("name") or "Product").strip() or "Product"


def resolve_product_sync(product_id: str) -> Optional[dict]:
    if data_store.USE_MEMORY:
        import memory_store

        return memory_store.get_product(product_id)
    try:
        from woocommerce_api import get_woo_db

        woo = get_woo_db()
        if hasattr(woo, "get_product_by_uuid"):
            return woo.get_product_by_uuid(product_id)
        if hasattr(woo, "get_product"):
            try:
                return woo.get_product(int(product_id))
            except (TypeError, ValueError):
                pass
    except Exception:
        logger.debug("resolve_product_sync failed for %s", product_id, exc_info=True)
    return None


def list_new_arrival_products_sync(limit: int = 24) -> list[dict]:
    if data_store.USE_MEMORY:
        import memory_store

        rows = memory_store.filter_products(new_arrival=True, limit=limit, offset=0)
        return list(rows or [])
    try:
        from woocommerce_api import get_woo_db

        woo = get_woo_db()
        if hasattr(woo, "new_arrivals"):
            payload = woo.new_arrivals(limit=limit)
            if isinstance(payload, dict):
                return list(payload.get("items") or [])
            if isinstance(payload, list):
                return payload
    except Exception:
        logger.debug("list_new_arrival_products_sync failed", exc_info=True)
    return []


async def confirm_restock_signup(product_id: str, email: str) -> None:
    product = resolve_product_sync(product_id)
    try:
        send_restock_subscribed_email(email, product)
    except Exception:
        logger.exception("Restock signup email failed for %s", email)


async def process_restock_for_product(product_id: str, mongo_db=None) -> int:
    product = resolve_product_sync(product_id)
    if not _product_in_stock(product):
        return 0
    rows = await data_store.list_stock_notifications(mongo_db=mongo_db)
    waiting = [r for r in rows if str(r.get("product_id")) == str(product_id)]
    sent = 0
    title = _product_title(product)
    for row in waiting:
        email = str(row.get("email") or "").strip().lower()
        if not email:
            continue
        user = await data_store.find_user(email, mongo_db)
        prefs = {**PREF_DEFAULTS, **((user or {}).get("notificationPrefs") or {})}
        if user and not prefs_allow_email(prefs, "restock"):
            await data_store.delete_stock_notification(product_id, email, mongo_db)
            continue
        ok = send_back_in_stock_email(email, product)
        if ok:
            sent += 1
            await data_store.delete_stock_notification(product_id, email, mongo_db)
            if user and user.get("id"):
                from notify import notify_user

                await notify_user(
                    user["id"],
                    "restock",
                    "Back in stock",
                    f"{title} is available again.",
                    data={"route": f"/product/p/{product_id}"},
                    mongo_db=mongo_db,
                    email=False,
                )
    return sent


async def process_restock_alerts(mongo_db=None) -> int:
    rows = await data_store.list_stock_notifications(mongo_db=mongo_db)
    ids = sorted({str(r.get("product_id") or "") for r in rows if r.get("product_id")})
    total = 0
    for pid in ids:
        try:
            total += await process_restock_for_product(pid, mongo_db)
        except Exception:
            logger.exception("Restock alert failed for product %s", pid)
    return total


async def process_new_arrival_emails(mongo_db=None) -> dict[str, Any]:
    products = list_new_arrival_products_sync(24)
    current_ids = [str(p.get("id") or "") for p in products if p.get("id")]
    raw = await data_store.get_meta(NEW_ARRIVAL_META, mongo_db)
    try:
        seen = list(json.loads(raw or "[]"))
        if not isinstance(seen, list):
            seen = []
    except json.JSONDecodeError:
        seen = []
    seen_set = {str(x) for x in seen}
    first_run = not seen_set
    newcomers = [p for p in products if str(p.get("id") or "") not in seen_set]
    merged = list(dict.fromkeys([*current_ids, *[str(x) for x in seen]]))[:500]
    await data_store.set_meta(NEW_ARRIVAL_META, json.dumps(merged), mongo_db)
    if first_run or not newcomers:
        return {"first_run": first_run, "new": 0, "broadcast": {}}

    names = [_product_title(p) for p in newcomers[:6]]
    extra = f" and {len(newcomers) - 6} more" if len(newcomers) > 6 else ""
    title = "New products have arrived"
    message = f"Just added: {', '.join(names)}{extra}."
    from notify import broadcast_customers

    result = await broadcast_customers(
        "new_product",
        title,
        message,
        data={"route": "/new"},
        mongo_db=mongo_db,
    )
    return {"first_run": False, "new": len(newcomers), "broadcast": result}


async def process_alert_emails(mongo_db=None) -> dict[str, Any]:
    restock = await process_restock_alerts(mongo_db)
    arrivals = await process_new_arrival_emails(mongo_db)
    return {"restock_emails": restock, "new_arrivals": arrivals}
