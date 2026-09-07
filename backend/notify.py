"""In-app notification + Expo push fan-out for a single user or broadcast."""
from __future__ import annotations

import logging
from typing import Any, Optional

import data_store
from localization import normalize_language, tr
from push_service import PREF_DEFAULTS, notify_user_devices, prefs_allow

logger = logging.getLogger(__name__)


def _localized_note(kind: str, title: str, message: str, lang: str) -> tuple[str, str]:
    """Localize known system notification strings when caller used default English."""
    k = (kind or "").strip().lower()
    if k == "order_placed":
        if title.strip().lower() == "order confirmed":
            title = tr(lang, "order.confirmed.title")
    elif k == "order_cancelled":
        if title.strip().lower() == "order cancelled":
            title = tr(lang, "order.cancelled.title")
    return title, message


async def notify_user(
    user_id: str,
    kind: str,
    title: str,
    message: str,
    *,
    data: Optional[dict[str, Any]] = None,
    mongo_db=None,
    push: bool = True,
    persist: bool = True,
) -> Optional[dict]:
    """Persist in-app notification and/or send Expo push."""
    note = None
    user = None
    lang = "en"
    try:
        user = await data_store.find_user_by_id(user_id, mongo_db)
        lang = normalize_language((user or {}).get("language"))
    except Exception:
        logger.debug("Could not resolve user language for notifications", exc_info=True)
    title, message = _localized_note(kind, title, message, lang)
    if persist:
        note = await data_store.add_notification(user_id, kind, title, message, mongo_db)
    if not push:
        return note

    try:
        if user is None:
            user = await data_store.find_user_by_id(user_id, mongo_db)
        prefs = (user or {}).get("notificationPrefs") or {}
        tokens = await data_store.list_push_tokens(user_id, mongo_db)
        notify_user_devices(
            tokens=tokens,
            prefs=prefs,
            kind=kind,
            title=title,
            body=message,
            data=data,
        )
    except Exception:
        logger.exception("Push notify failed for user %s kind=%s", user_id, kind)
    return note


async def push_admin_alert(
    kind: str,
    title: str,
    message: str,
    *,
    data: Optional[dict[str, Any]] = None,
    mongo_db=None,
) -> None:
    """Send Expo push to admin devices (in-app feed is written separately)."""
    try:
        admin_ids: list[str] = ["admin"]
        if data_store.USE_MEMORY:
            import memory_store

            admin_ids.extend(
                u["id"] for u in memory_store._users.values() if u.get("role") == "admin"
            )
        elif data_store.app_mysql_enabled():
            from app_db import get_app_db

            db = get_app_db()
            db.ensure_schema()
            with db._conn() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT id FROM users WHERE role = 'admin'")
                    admin_ids.extend(r["id"] for r in cur.fetchall())

        seen = set()
        for uid in admin_ids:
            if uid in seen:
                continue
            seen.add(uid)
            tokens = await data_store.list_push_tokens(uid, mongo_db)
            if not tokens:
                continue
            notify_user_devices(
                tokens=tokens,
                prefs={**PREF_DEFAULTS},
                kind=kind,
                title=title,
                body=message,
                data=data,
            )
    except Exception:
        logger.exception("Admin device push failed kind=%s", kind)


async def broadcast_customers(
    kind: str,
    title: str,
    message: str,
    *,
    data: Optional[dict[str, Any]] = None,
    mongo_db=None,
) -> dict:
    """Notify all non-admin customers (new product / promotion)."""
    user_ids = await data_store.list_customer_user_ids(mongo_db)
    sent_in_app = 0
    pushed = 0
    for uid in user_ids:
        try:
            user = await data_store.find_user_by_id(uid, mongo_db)
            prefs = {**PREF_DEFAULTS, **((user or {}).get("notificationPrefs") or {})}
            if not prefs_allow(prefs, kind):
                continue
            await data_store.add_notification(uid, kind, title, message, mongo_db)
            sent_in_app += 1
            tokens = await data_store.list_push_tokens(uid, mongo_db)
            pushed += notify_user_devices(
                tokens=tokens,
                prefs=prefs,
                kind=kind,
                title=title,
                body=message,
                data=data,
            )
        except Exception:
            logger.exception("Broadcast failed for user %s", uid)
    return {"users": len(user_ids), "in_app": sent_in_app, "push_tickets": pushed}
