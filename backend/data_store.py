"""Unified async access to app data (memory, MySQL, or MongoDB)."""
from __future__ import annotations

import asyncio
import os
from typing import Any, Optional

import memory_store
from app_db import get_app_db

USE_MEMORY = os.environ.get("USE_MEMORY", "0") == "1"
USE_APP_MYSQL = os.environ.get("USE_APP_MYSQL", "0") == "1"


def _env_flag(name: str) -> bool:
    return os.environ.get(name, "0") == "1"


def app_mysql_configured() -> bool:
    return _env_flag("USE_APP_MYSQL") and get_app_db().configured()


def app_mysql_enabled() -> bool:
    """App MySQL is active only when enabled, configured, and startup probe succeeded."""
    if not _env_flag("USE_APP_MYSQL"):
        return False
    db = get_app_db()
    if not db.configured():
        return False
    return db.is_runtime_ready()


def uses_mongo() -> bool:
    """Mongo is used only when neither in-memory nor App MySQL mode is selected."""
    if _env_flag("USE_MEMORY"):
        return False
    if _env_flag("USE_APP_MYSQL"):
        return False
    return True


def _mongo_db(mongo_db):
    if uses_mongo() and mongo_db is not None:
        return mongo_db
    return None


async def find_user(email: str, mongo_db=None) -> Optional[dict]:
    if _env_flag("USE_MEMORY"):
        return memory_store.find_user(email)
    if app_mysql_enabled():
        return await asyncio.to_thread(get_app_db().find_user, email)
    mdb = _mongo_db(mongo_db)
    if mdb:
        return await mdb.users.find_one({"email": email})
    return None


async def insert_user(user: dict, mongo_db=None) -> None:
    if USE_MEMORY:
        memory_store.insert_user(user)
        return
    if app_mysql_enabled():
        await asyncio.to_thread(get_app_db().insert_user, user)
        return
    mdb = _mongo_db(mongo_db)
    if mdb:
        await mdb.users.insert_one(user)
        return
    raise RuntimeError("User storage unavailable — enable USE_MEMORY=1 or fix APP_MYSQL_*")


async def update_user(email: str, updates: dict, mongo_db=None) -> Optional[dict]:
    if USE_MEMORY:
        return memory_store.update_user(email, updates)
    if app_mysql_enabled():
        return await asyncio.to_thread(get_app_db().update_user, email, updates)
    mdb = _mongo_db(mongo_db)
    if mdb:
        await mdb.users.update_one({"email": email}, {"$set": updates})
        return await mdb.users.find_one({"email": email})
    return None


async def anonymize_user(email: str, mongo_db=None) -> Optional[dict]:
    if USE_MEMORY:
        return memory_store.anonymize_user(email)
    if app_mysql_enabled():
        return await asyncio.to_thread(get_app_db().anonymize_user, email)
    mdb = _mongo_db(mongo_db)
    if mdb:
        user = await mdb.users.find_one({"email": email})
        if not user:
            return None
        uid = str(user.get("id") or "").strip()
        new_email = f"deleted-{uid}@deleted.invalid"
        updates = {
            "email": new_email,
            "name": "Deleted User",
            "phone": "",
            "address": "",
            "city": "",
            "postal_code": "",
            "businessName": "",
            "vatNumber": "",
            "companyAddress": "",
            "businessType": "",
            "accountType": "b2c",
            "isWholesale": False,
            "wholesaleStatus": None,
            "rejectionReason": None,
            "approvedAt": None,
            "approvedBy": None,
            "hashed_password": "!",
            "notificationPrefs": {},
        }
        await mdb.users.update_one({"email": email}, {"$set": updates})
        return await mdb.users.find_one({"email": new_email})
    return None


async def seed_admin_user(email: str, hashed_password: str, mongo_db=None) -> Optional[dict]:
    if USE_MEMORY:
        memory_store.seed_admin_user(email, hashed_password)
        return memory_store.find_user(email)
    if app_mysql_enabled():
        await asyncio.to_thread(get_app_db().seed_admin_user, email, hashed_password)
        return await asyncio.to_thread(get_app_db().find_user, email)
    mdb = _mongo_db(mongo_db)
    if not mdb:
        return None
    user = await mdb.users.find_one({"email": email})
    if user:
        return user
    user = {
        "id": "admin-user",
        "email": email,
        "name": "Admin",
        "hashed_password": hashed_password,
        "role": "admin",
        "created_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
    }
    await mdb.users.insert_one(user)
    return user


async def insert_order(order: dict, mongo_db=None) -> dict:
    if USE_MEMORY:
        return memory_store.insert_order(order)
    if app_mysql_enabled():
        return await asyncio.to_thread(get_app_db().insert_order, order)
    mdb = _mongo_db(mongo_db)
    if not mdb:
        raise RuntimeError("Order storage unavailable — enable USE_MEMORY=1 or fix APP_MYSQL_*")
    await mdb.orders.insert_one(order)
    order.pop("_id", None)
    from order_tracking import enrich_order

    return enrich_order(order)


async def insert_order_without_stock(order: dict, mongo_db=None) -> dict:
    if USE_MEMORY:
        return memory_store.insert_order_without_stock(order)
    return await insert_order(order, mongo_db)


async def list_orders(user_id: str, mongo_db=None) -> list[dict]:
    if USE_MEMORY:
        return memory_store.list_orders(user_id)
    if app_mysql_enabled():
        return await asyncio.to_thread(get_app_db().list_orders, user_id)
    mdb = _mongo_db(mongo_db)
    if not mdb:
        return []
    docs = await mdb.orders.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    from order_tracking import enrich_order

    return [enrich_order(d) for d in docs]


async def get_order(order_id: str, user_id: str, mongo_db=None) -> Optional[dict]:
    if USE_MEMORY:
        return memory_store.get_order(order_id, user_id)
    if app_mysql_enabled():
        return await asyncio.to_thread(get_app_db().get_order, order_id, user_id)
    mdb = _mongo_db(mongo_db)
    if not mdb:
        return None
    doc = await mdb.orders.find_one({"id": order_id, "user_id": user_id}, {"_id": 0})
    if not doc:
        return None
    from order_tracking import enrich_order

    return enrich_order(doc)


async def update_order_status(
    order_id: str, user_id: str, status: str, mongo_db=None
) -> Optional[dict]:
    if USE_MEMORY:
        return memory_store.update_order_status(order_id, user_id, status)
    if app_mysql_enabled():
        return await asyncio.to_thread(
            get_app_db().update_order_status, order_id, user_id, status
        )
    mdb = _mongo_db(mongo_db)
    if not mdb:
        return None
    new_status = (status or "").strip().lower()
    result = await mdb.orders.update_one(
        {"id": order_id, "user_id": user_id},
        {"$set": {"status": new_status}},
    )
    if result.matched_count == 0:
        return None
    doc = await mdb.orders.find_one({"id": order_id, "user_id": user_id}, {"_id": 0})
    if not doc:
        return None
    from order_tracking import enrich_order

    return enrich_order(doc)


async def list_all_orders(limit: int = 200, mongo_db=None) -> list[dict]:
    if USE_MEMORY:
        return memory_store.list_all_orders(limit=limit)
    if app_mysql_enabled():
        return await asyncio.to_thread(get_app_db().list_all_orders, limit)
    raise NotImplementedError("Admin orders require memory or app MySQL")


async def get_admin_order(order_id: str, mongo_db=None) -> Optional[dict]:
    if USE_MEMORY:
        return memory_store.get_admin_order(order_id)
    if app_mysql_enabled():
        return await asyncio.to_thread(get_app_db().get_admin_order, order_id)
    raise NotImplementedError("Admin orders require memory or app MySQL")


async def list_users(mongo_db=None) -> list[dict]:
    if USE_MEMORY:
        return memory_store.list_users()
    if app_mysql_enabled():
        return await asyncio.to_thread(get_app_db().list_users)
    raise NotImplementedError("Admin users require memory or app MySQL")


async def search_users(q: str = "", limit: int = 2000, mongo_db=None) -> list[dict]:
    if USE_MEMORY:
        return memory_store.search_users(q, limit=limit)
    if app_mysql_enabled():
        return await asyncio.to_thread(get_app_db().search_users, q, limit)
    raise NotImplementedError("Admin users require memory or app MySQL")


async def list_user_discounts(user_id: str, mongo_db=None) -> list[dict]:
    if USE_MEMORY:
        return memory_store.list_user_discounts(user_id)
    if app_mysql_enabled():
        return await asyncio.to_thread(get_app_db().list_user_discounts, user_id)
    raise NotImplementedError("User discounts require memory or app MySQL")


async def list_active_user_discounts(user_id: str, mongo_db=None) -> list[dict]:
    if USE_MEMORY:
        return memory_store.list_active_user_discounts(user_id)
    if app_mysql_enabled():
        return await asyncio.to_thread(get_app_db().list_active_user_discounts, user_id)
    return []


async def get_user_discount(user_id: str, discount_id: str, mongo_db=None) -> Optional[dict]:
    if USE_MEMORY:
        return memory_store.get_user_discount(user_id, discount_id)
    if app_mysql_enabled():
        return await asyncio.to_thread(get_app_db().get_user_discount, user_id, discount_id)
    raise NotImplementedError("User discounts require memory or app MySQL")


async def create_user_discount(
    user_id: str, data: dict, created_by: Optional[str] = None, mongo_db=None
) -> dict:
    if USE_MEMORY:
        return memory_store.create_user_discount(user_id, data, created_by=created_by)
    if app_mysql_enabled():
        return await asyncio.to_thread(get_app_db().create_user_discount, user_id, data, created_by)
    raise NotImplementedError("User discounts require memory or app MySQL")


async def update_user_discount(
    user_id: str, discount_id: str, data: dict, mongo_db=None
) -> Optional[dict]:
    if USE_MEMORY:
        return memory_store.update_user_discount(user_id, discount_id, data)
    if app_mysql_enabled():
        return await asyncio.to_thread(get_app_db().update_user_discount, user_id, discount_id, data)
    raise NotImplementedError("User discounts require memory or app MySQL")


async def delete_user_discount(user_id: str, discount_id: str, mongo_db=None) -> bool:
    if USE_MEMORY:
        return memory_store.delete_user_discount(user_id, discount_id)
    if app_mysql_enabled():
        return await asyncio.to_thread(get_app_db().delete_user_discount, user_id, discount_id)
    raise NotImplementedError("User discounts require memory or app MySQL")


async def list_wholesale_requests(status: Optional[str] = None, mongo_db=None) -> list[dict]:
    if USE_MEMORY:
        return memory_store.list_wholesale_requests(status=status)
    if app_mysql_enabled():
        return await asyncio.to_thread(get_app_db().list_wholesale_requests, status)
    raise NotImplementedError("Wholesale admin requires memory or app MySQL")


async def approve_wholesale(
    user_id: str, admin_id: str, mongo_db=None, dealer_tier: str = "bronze"
) -> Optional[dict]:
    if USE_MEMORY:
        return memory_store.approve_wholesale(user_id, admin_id, dealer_tier=dealer_tier)
    if app_mysql_enabled():
        return await asyncio.to_thread(
            get_app_db().approve_wholesale, user_id, admin_id, dealer_tier
        )
    raise NotImplementedError("Wholesale admin requires memory or app MySQL")


async def reject_wholesale(user_id: str, admin_id: str, reason: str, mongo_db=None) -> Optional[dict]:
    if USE_MEMORY:
        return memory_store.reject_wholesale(user_id, admin_id, reason)
    if app_mysql_enabled():
        return await asyncio.to_thread(get_app_db().reject_wholesale, user_id, admin_id, reason)
    raise NotImplementedError("Wholesale admin requires memory or app MySQL")


async def suspend_wholesale(user_id: str, admin_id: str, mongo_db=None) -> Optional[dict]:
    if USE_MEMORY:
        return memory_store.suspend_wholesale(user_id, admin_id)
    if app_mysql_enabled():
        return await asyncio.to_thread(get_app_db().suspend_wholesale, user_id, admin_id)
    raise NotImplementedError("Wholesale admin requires memory or app MySQL")


async def list_notifications(user_id: str, mongo_db=None) -> list[dict]:
    if USE_MEMORY:
        return memory_store.list_notifications(user_id)
    if app_mysql_enabled():
        return await asyncio.to_thread(get_app_db().list_notifications, user_id)
    raise NotImplementedError("Notifications require memory or app MySQL")


async def add_notification(
    user_id: str, kind: str, title: str, message: str, mongo_db=None
) -> dict:
    if USE_MEMORY:
        return memory_store.add_notification(user_id, kind, title, message)
    if app_mysql_enabled():
        return await asyncio.to_thread(get_app_db().add_notification, user_id, kind, title, message)
    raise NotImplementedError("Notifications require memory or app MySQL")


async def add_admin_notification(kind: str, message: str, mongo_db=None) -> dict:
    if USE_MEMORY:
        return memory_store.add_admin_notification(kind, message)
    if app_mysql_enabled():
        return await asyncio.to_thread(get_app_db().add_admin_notification, kind, message)
    raise NotImplementedError("Notifications require memory or app MySQL")


async def mark_notification_read(note_id: str, user_id: str, mongo_db=None) -> bool:
    if USE_MEMORY:
        return memory_store.mark_notification_read(note_id, user_id)
    if app_mysql_enabled():
        return await asyncio.to_thread(get_app_db().mark_notification_read, note_id, user_id)
    raise NotImplementedError("Notifications require memory or app MySQL")


async def upsert_push_token(user_id: str, token: str, platform: str = "", mongo_db=None) -> None:
    if USE_MEMORY:
        memory_store.upsert_push_token(user_id, token, platform)
        return
    if app_mysql_enabled():
        await asyncio.to_thread(get_app_db().upsert_push_token, user_id, token, platform)
        return


async def delete_push_token(token: str, user_id: Optional[str] = None, mongo_db=None) -> bool:
    if USE_MEMORY:
        return memory_store.delete_push_token(token, user_id)
    if app_mysql_enabled():
        return await asyncio.to_thread(get_app_db().delete_push_token, token, user_id)
    return False


async def delete_push_tokens_for_user(user_id: str, mongo_db=None) -> int:
    if USE_MEMORY:
        return memory_store.delete_push_tokens_for_user(user_id)
    if app_mysql_enabled():
        return await asyncio.to_thread(get_app_db().delete_push_tokens_for_user, user_id)
    return 0


async def list_push_tokens(user_id: str, mongo_db=None) -> list[str]:
    if USE_MEMORY:
        return memory_store.list_push_tokens(user_id)
    if app_mysql_enabled():
        return await asyncio.to_thread(get_app_db().list_push_tokens, user_id)
    return []


async def list_customer_user_ids(mongo_db=None) -> list[str]:
    if USE_MEMORY:
        return memory_store.list_customer_user_ids()
    if app_mysql_enabled():
        return await asyncio.to_thread(get_app_db().list_customer_user_ids)
    return []


async def upsert_stock_notification(product_id: str, email: str, mongo_db=None) -> None:
    if USE_MEMORY:
        memory_store.upsert_stock_notification(product_id, email)
        return
    if app_mysql_enabled():
        await asyncio.to_thread(get_app_db().upsert_stock_notification, product_id, email)
        return
    mdb = _mongo_db(mongo_db)
    if not mdb:
        return
    from datetime import datetime, timezone

    await mdb.stock_notifications.update_one(
        {"product_id": product_id, "email": email},
        {"$set": {"product_id": product_id, "email": email, "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )


async def admin_stats(mongo_db=None) -> dict:
    if USE_MEMORY:
        return memory_store.admin_stats()
    if app_mysql_enabled():
        return await asyncio.to_thread(get_app_db().admin_stats)
    raise NotImplementedError("Admin stats require memory or app MySQL")


async def find_user_by_id(user_id: str, mongo_db=None) -> Optional[dict]:
    if USE_MEMORY:
        return memory_store.find_user_by_id(user_id)
    if app_mysql_enabled():
        return await asyncio.to_thread(get_app_db().find_user_by_id, user_id)
    mdb = _mongo_db(mongo_db)
    if mdb:
        return await mdb.users.find_one({"id": user_id})
    return None


async def upsert_saved_cart(
    user_id: str,
    email: str,
    items: list[dict],
    subtotal: float,
    mongo_db=None,
) -> None:
    if USE_MEMORY:
        memory_store.upsert_saved_cart(user_id, email, items, subtotal)
        return
    if app_mysql_enabled():
        await asyncio.to_thread(get_app_db().upsert_saved_cart, user_id, email, items, subtotal)
        return
    mdb = _mongo_db(mongo_db)
    if not mdb:
        return
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc).isoformat()
    existing = await mdb.saved_carts.find_one({"user_id": user_id})
    if not items:
        if existing:
            await mdb.saved_carts.update_one(
                {"user_id": user_id},
                {"$set": {"items": [], "subtotal": 0, "updated_at": now}},
            )
        return
    old_sig = memory_store._cart_items_signature(existing.get("items", [])) if existing else ""
    new_sig = memory_store._cart_items_signature(items)
    reset = existing is None or old_sig != new_sig
    doc = {
        "user_id": user_id,
        "email": email.lower(),
        "items": items,
        "subtotal": float(subtotal or 0),
        "updated_at": now,
        "abandoned_email_sent_at": None if reset else existing.get("abandoned_email_sent_at"),
        "converted_at": existing.get("converted_at") if existing else None,
    }
    await mdb.saved_carts.update_one({"user_id": user_id}, {"$set": doc}, upsert=True)


async def clear_saved_cart(user_id: str, mongo_db=None) -> None:
    if USE_MEMORY:
        memory_store.clear_saved_cart(user_id)
        return
    if app_mysql_enabled():
        await asyncio.to_thread(get_app_db().clear_saved_cart, user_id)
        return
    mdb = _mongo_db(mongo_db)
    if mdb:
        await mdb.saved_carts.delete_one({"user_id": user_id})


async def mark_cart_converted(user_id: str, email: str = "", mongo_db=None) -> None:
    if USE_MEMORY:
        memory_store.mark_cart_converted(user_id, email)
        return
    if app_mysql_enabled():
        await asyncio.to_thread(get_app_db().mark_cart_converted, user_id, email)
        return
    mdb = _mongo_db(mongo_db)
    if not mdb:
        return
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc).isoformat()
    await mdb.saved_carts.update_many(
        {"$or": [{"user_id": user_id}, {"email": email.lower()}] if email else [{"user_id": user_id}]},
        {"$set": {"converted_at": now, "items": [], "subtotal": 0}},
    )


async def mark_cart_reminder_sent(user_id: str, mongo_db=None) -> None:
    if USE_MEMORY:
        memory_store.mark_cart_reminder_sent(user_id)
        return
    if app_mysql_enabled():
        await asyncio.to_thread(get_app_db().mark_cart_reminder_sent, user_id)
        return
    mdb = _mongo_db(mongo_db)
    if mdb:
        from datetime import datetime, timezone

        await mdb.saved_carts.update_one(
            {"user_id": user_id},
            {"$set": {"abandoned_email_sent_at": datetime.now(timezone.utc).isoformat()}},
        )


async def list_carts_due_for_reminder(hours: int, mongo_db=None) -> list[dict]:
    if USE_MEMORY:
        return memory_store.list_carts_due_for_reminder(hours)
    if app_mysql_enabled():
        return await asyncio.to_thread(get_app_db().list_carts_due_for_reminder, hours)
    mdb = _mongo_db(mongo_db)
    if not mdb:
        return []
    from datetime import datetime, timedelta, timezone

    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    docs = await mdb.saved_carts.find(
        {
            "converted_at": None,
            "abandoned_email_sent_at": None,
            "items": {"$ne": []},
            "updated_at": {"$lte": cutoff.isoformat()},
        }
    ).to_list(500)
    return docs
