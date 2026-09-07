"""Saved-cart storage and abandoned-cart reminder emails."""
from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import data_store
from email_service import send_cart_abandonment_email

logger = logging.getLogger(__name__)


def abandon_hours() -> int:
    try:
        return max(1, int(os.environ.get("CART_ABANDON_HOURS", "24")))
    except ValueError:
        return 24


def abandoned_cart_emails_enabled() -> bool:
    """Gate background abandoned-cart mailer.

    Local/dev often cannot resolve Hostinger MySQL (getaddrinfo) — default OFF
    outside production unless ENABLE_ABANDONED_CART_EMAILS=1.
    """
    flag = (os.environ.get("ENABLE_ABANDONED_CART_EMAILS") or "").strip().lower()
    if flag in {"0", "false", "no", "off"}:
        return False
    if flag in {"1", "true", "yes", "on"}:
        return True
    env = (os.environ.get("ENVIRONMENT") or os.environ.get("ENV") or "development").strip().lower()
    return env in {"production", "prod", "staging"}


async def upsert_saved_cart(
    user_id: str,
    email: str,
    items: list[dict],
    subtotal: float,
    mongo_db=None,
) -> None:
    await data_store.upsert_saved_cart(user_id, email, items, subtotal, mongo_db)


async def clear_saved_cart(user_id: str, mongo_db=None) -> None:
    await data_store.clear_saved_cart(user_id, mongo_db)


async def mark_cart_converted(user_id: str, email: str = "", mongo_db=None) -> None:
    await data_store.mark_cart_converted(user_id, email, mongo_db)


async def process_abandoned_cart_emails(mongo_db=None) -> int:
    """Send reminder emails + push for carts idle longer than CART_ABANDON_HOURS."""
    if not abandoned_cart_emails_enabled():
        return 0
    hours = abandon_hours()
    due = await data_store.list_carts_due_for_reminder(hours, mongo_db)
    sent = 0
    for cart in due:
        user = await data_store.find_user_by_id(cart.get("user_id", ""), mongo_db)
        recipient = (user or {}).get("email") or cart.get("email") or ""
        if not recipient:
            continue
        ok = send_cart_abandonment_email(user or {"email": recipient}, cart)
        try:
            from notify import notify_user

            uid = cart.get("user_id") or (user or {}).get("id")
            if uid:
                n = len(cart.get("items") or [])
                await notify_user(
                    uid,
                    "cart_abandon",
                    "Items waiting in your cart",
                    f"You still have {n} item{'s' if n != 1 else ''} in your Samphone cart.",
                    data={"route": "/cart"},
                    mongo_db=mongo_db,
                )
        except Exception:
            logger.debug("Cart abandon push failed", exc_info=True)
        if ok:
            await data_store.mark_cart_reminder_sent(cart.get("user_id", ""), mongo_db)
            sent += 1
    if sent:
        logger.info("Sent %s abandoned-cart reminder email(s)", sent)
    return sent
