"""MySQL persistence for app users, orders, wholesale, and notifications.

Lives in the same database as the WooCommerce catalog clone
(`u552904336_samappdb` by default). APP_MYSQL_* may be set explicitly;
otherwise CATALOG_MYSQL_* / DB_* are used. Do not use a separate appdb.
"""
from __future__ import annotations

import json
import logging
import os
import secrets
import threading
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Iterator, Optional

import pymysql
from pymysql.cursors import DictCursor

from order_tracking import attach_tracking_fields, enrich_order
from localization import normalize_language, tr
from wholesale import default_wholesale_user_fields, user_public_wholesale, wholesale_request_row

logger = logging.getLogger(__name__)

SCHEMA_SQL = ("""
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL DEFAULT '',
  hashed_password VARCHAR(255) NOT NULL,
  role ENUM('customer', 'admin') NOT NULL DEFAULT 'customer',
  phone VARCHAR(50) NOT NULL DEFAULT '',
  address TEXT,
  city VARCHAR(100) NOT NULL DEFAULT '',
  postal_code VARCHAR(20) NOT NULL DEFAULT '',
  is_wholesale TINYINT(1) NOT NULL DEFAULT 0,
  wholesale_status ENUM('pending', 'approved', 'rejected', 'suspended') NULL,
  account_type VARCHAR(16) NOT NULL DEFAULT 'b2c',
  business_name VARCHAR(255) NOT NULL DEFAULT '',
  vat_number VARCHAR(100) NOT NULL DEFAULT '',
  company_address TEXT,
  business_type VARCHAR(64) NOT NULL DEFAULT '',
  language VARCHAR(8) NOT NULL DEFAULT 'en',
  rejection_reason TEXT NULL,
  approved_at DATETIME NULL,
  approved_by VARCHAR(36) NULL,
  dealer_tier ENUM('bronze', 'standard', 'silver', 'gold', 'platinum') NOT NULL DEFAULT 'bronze',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_wholesale_status (wholesale_status),
  INDEX idx_users_role (role)
)""", """
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(36) PRIMARY KEY,
  order_number VARCHAR(32) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  customer_email VARCHAR(255) NOT NULL DEFAULT '',
  customer_name VARCHAR(255) NOT NULL DEFAULT '',
  items JSON NOT NULL,
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  full_name VARCHAR(255) NOT NULL DEFAULT '',
  phone VARCHAR(50) NOT NULL DEFAULT '',
  address TEXT,
  city VARCHAR(100) NOT NULL DEFAULT '',
  postal_code VARCHAR(20) NOT NULL DEFAULT '',
  payment_method VARCHAR(32) NOT NULL DEFAULT 'delivery',
  language VARCHAR(8) NOT NULL DEFAULT 'en',
  status VARCHAR(32) NOT NULL DEFAULT 'order_placed',
  tracking_number VARCHAR(32) NULL,
  carrier VARCHAR(128) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_orders_user (user_id),
  INDEX idx_orders_created (created_at)
)""", """
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  kind VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notifications_user (user_id, created_at)
)""", """
CREATE TABLE IF NOT EXISTS stock_notifications (
  product_id VARCHAR(64) NOT NULL,
  email VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (product_id, email)
)""", """
CREATE TABLE IF NOT EXISTS app_meta (
  meta_key VARCHAR(64) PRIMARY KEY,
  meta_value TEXT NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)""", """
CREATE TABLE IF NOT EXISTS saved_carts (
  user_id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  items JSON NOT NULL,
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  abandoned_email_sent_at DATETIME NULL,
  converted_at DATETIME NULL,
  INDEX idx_saved_carts_reminder (updated_at, abandoned_email_sent_at, converted_at)
)""", """
CREATE TABLE IF NOT EXISTS user_discounts (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  discount_type ENUM('percentage', 'fixed') NOT NULL,
  discount_value DECIMAL(12, 2) NOT NULL,
  applies_to ENUM('all', 'category', 'product') NOT NULL DEFAULT 'all',
  target_ids JSON NULL,
  reason VARCHAR(500) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  starts_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NULL,
  created_by VARCHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_discounts_user (user_id),
  INDEX idx_user_discounts_active (user_id, is_active, expires_at)
)""", """
CREATE TABLE IF NOT EXISTS push_tokens (
  token VARCHAR(512) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  platform VARCHAR(32) NOT NULL DEFAULT '',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_push_tokens_user (user_id)
)""", """
CREATE TABLE IF NOT EXISTS shipments (
  id VARCHAR(36) PRIMARY KEY,
  order_id VARCHAR(36) NOT NULL,
  carrier VARCHAR(32) NOT NULL DEFAULT 'dpd',
  num_guia VARCHAR(64) NULL,
  label_path VARCHAR(512) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'created',
  raw_response JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_shipments_num_guia (num_guia),
  INDEX idx_shipments_order (order_id),
  INDEX idx_shipments_status (status)
)""")


def _env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


def _app_mysql_host() -> str:
    return _env("APP_MYSQL_HOST") or _env("CATALOG_MYSQL_HOST") or _env("DB_HOST", "127.0.0.1")


def _app_mysql_port() -> int:
    return int(_env("APP_MYSQL_PORT") or _env("CATALOG_MYSQL_PORT") or _env("DB_PORT", "3306"))


def _app_mysql_user() -> str:
    return _env("APP_MYSQL_USER") or _env("CATALOG_MYSQL_USER") or _env("DB_USER")


def _app_mysql_password() -> str:
    return _env("APP_MYSQL_PASSWORD") or _env("CATALOG_MYSQL_PASSWORD") or _env("DB_PASSWORD")


def _app_mysql_database() -> str:
    return (
        _env("APP_MYSQL_DATABASE")
        or _env("CATALOG_MYSQL_DATABASE")
        or _env("DB_NAME", "u552904336_samappdb")
    )


def _dt_iso(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, datetime):
        dt = value
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()
    return str(value)


def _dt_mysql(value: Any) -> Optional[datetime]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.replace(tzinfo=None) if value.tzinfo else value
    text = str(value).replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(text)
        return dt.replace(tzinfo=None)
    except ValueError:
        return None


def _parse_json(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, (dict, list)):
        return value
    return json.loads(value)


class AppDB:
    """
    App users/orders MySQL access.

    Hostinger enforces max_connections_per_hour (~500). Opening a fresh TCP
    connection per query exhausts that quickly under polling, so we keep a
    tiny pool (same approach as CatalogDB).
    """

    def __init__(self) -> None:
        self._schema_ready = False
        self._runtime_ok: Optional[bool] = None
        self._lock = threading.Lock()
        self._pool: list[pymysql.connections.Connection] = []
        self._max_pool = max(2, int(os.environ.get("APP_MYSQL_POOL_SIZE", "4") or "4"))

    def configured(self) -> bool:
        return bool(_app_mysql_host() and _app_mysql_user() and _app_mysql_password() and _app_mysql_database())

    def is_runtime_ready(self) -> bool:
        """True only after a successful startup probe (or lazy health check)."""
        return self._runtime_ok is True

    def mark_runtime_unavailable(self) -> None:
        self._runtime_ok = False

    def probe_startup(self) -> bool:
        """Connect once at startup; disable App MySQL for the session on failure.

        Hostinger max_connections_per_hour is temporary — do not disable App MySQL
        for that case (avoids flipping the whole API to in-memory users).
        """
        if not self.configured():
            self._runtime_ok = False
            return False
        try:
            self.ensure_schema()
            self._runtime_ok = True
            return True
        except Exception as exc:
            msg = str(exc)
            if "max_connections_per_hour" in msg or "1226" in msg:
                # Quota resets on the hour; keep MySQL enabled and retry on demand.
                self._runtime_ok = True
                logger.warning(
                    "App MySQL hourly connection quota hit during probe; "
                    "keeping MySQL enabled (will retry). %s",
                    exc,
                )
                return True
            self.mark_runtime_unavailable()
            logger.warning("App MySQL probe failed: %s", exc)
            return False

    def _new_connection(self) -> pymysql.connections.Connection:
        return pymysql.connect(
            host=_app_mysql_host(),
            port=_app_mysql_port(),
            user=_app_mysql_user(),
            password=_app_mysql_password(),
            database=_app_mysql_database(),
            charset="utf8mb4",
            cursorclass=DictCursor,
            connect_timeout=15,
            read_timeout=60,
            write_timeout=60,
            autocommit=True,
        )

    def _acquire(self) -> pymysql.connections.Connection:
        with self._lock:
            while self._pool:
                conn = self._pool.pop()
                try:
                    conn.ping(reconnect=True)
                    return conn
                except Exception:
                    try:
                        conn.close()
                    except Exception:
                        pass
        return self._new_connection()

    def _release(self, conn: pymysql.connections.Connection, *, discard: bool = False) -> None:
        if discard:
            try:
                conn.close()
            except Exception:
                pass
            return
        with self._lock:
            if len(self._pool) < self._max_pool:
                self._pool.append(conn)
                return
        try:
            conn.close()
        except Exception:
            pass

    @contextmanager
    def _conn(self) -> Iterator[pymysql.connections.Connection]:
        conn = self._acquire()
        discard = False
        try:
            yield conn
        except Exception:
            discard = True
            raise
        finally:
            self._release(conn, discard=discard)

    def ensure_schema(self) -> None:
        if self._schema_ready:
            return
        with self._conn() as conn:
            with conn.cursor() as cur:
                for statement in SCHEMA_SQL:
                    cur.execute(statement)
                for statement in (
                    "ALTER TABLE users ADD COLUMN account_type VARCHAR(16) NOT NULL DEFAULT 'b2c'",
                    "ALTER TABLE users ADD COLUMN business_type VARCHAR(64) NOT NULL DEFAULT ''",
                    "ALTER TABLE users ADD COLUMN language VARCHAR(8) NOT NULL DEFAULT 'en'",
                    "ALTER TABLE users ADD COLUMN notification_prefs JSON NULL",
                    "ALTER TABLE users MODIFY wholesale_status ENUM('pending','approved','rejected','suspended') NULL",
                    "ALTER TABLE users MODIFY dealer_tier ENUM('bronze','standard','silver','gold','platinum') NOT NULL DEFAULT 'bronze'",
                    "ALTER TABLE orders ADD COLUMN language VARCHAR(8) NOT NULL DEFAULT 'en'",
                    "ALTER TABLE orders ADD COLUMN stripe_payment_intent_id VARCHAR(128) NULL",
                    "ALTER TABLE orders ADD INDEX idx_orders_stripe_pi (stripe_payment_intent_id)",
                ):
                    try:
                        cur.execute(statement)
                    except Exception:
                        pass
        self._schema_ready = True
        logger.info("App MySQL schema ready (%s)", _app_mysql_database())

    def health(self) -> dict[str, Any]:
        if not self.configured():
            return {
                "ok": False,
                "configured": False,
                "error": "Set CATALOG_MYSQL_* / DB_* (or APP_MYSQL_*) for u552904336_samappdb",
            }
        if not self.is_runtime_ready():
            return {
                "ok": False,
                "configured": True,
                "error": "App MySQL unavailable (startup probe failed or not run)",
                "database": _app_mysql_database(),
            }
        try:
            self.ensure_schema()
            with self._conn() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT COUNT(*) AS n FROM users")
                    users = int(cur.fetchone()["n"])
                    cur.execute("SELECT COUNT(*) AS n FROM orders")
                    orders = int(cur.fetchone()["n"])
            return {
                "ok": True,
                "configured": True,
                "database": _app_mysql_database(),
                "host": _app_mysql_host(),
                "users": users,
                "orders": orders,
                "pool_size": self._max_pool,
            }
        except Exception as exc:
            msg = str(exc)
            out: dict[str, Any] = {"ok": False, "configured": True, "error": msg}
            if "max_connections_per_hour" in msg:
                out["hint"] = (
                    "Hostinger hourly connection quota hit. AppDB now pools connections; "
                    "stop account-page polling storms and wait for the hour window to reset."
                )
            return out

    def _row_to_user(self, row: dict) -> dict:
        if not row:
            return {}
        user = {
            "id": row["id"],
            "email": row["email"],
            "name": row.get("name") or "",
            "hashed_password": row["hashed_password"],
            "role": row.get("role") or "customer",
            "phone": row.get("phone") or "",
            "address": row.get("address") or "",
            "city": row.get("city") or "",
            "postal_code": row.get("postal_code") or "",
            "isWholesale": bool(row.get("is_wholesale")),
            "wholesaleStatus": row.get("wholesale_status"),
            "accountType": row.get("account_type") or "b2c",
            "businessName": row.get("business_name") or "",
            "vatNumber": row.get("vat_number") or "",
            "companyAddress": row.get("company_address") or "",
            "businessType": row.get("business_type") or "",
            "language": row.get("language") or "en",
            "rejectionReason": row.get("rejection_reason"),
            "approvedAt": _dt_iso(row.get("approved_at")),
            "approvedBy": row.get("approved_by"),
            "dealerTier": row.get("dealer_tier") or "bronze",
            "created_at": _dt_iso(row.get("created_at")),
            "notificationPrefs": _parse_json(row.get("notification_prefs")) or {},
        }
        return user

    def _user_to_columns(self, user: dict) -> dict[str, Any]:
        return {
            "id": user["id"],
            "email": user["email"].lower(),
            "name": user.get("name") or "",
            "hashed_password": user["hashed_password"],
            "role": user.get("role") or "customer",
            "phone": user.get("phone") or "",
            "address": user.get("address") or "",
            "city": user.get("city") or "",
            "postal_code": user.get("postal_code") or "",
            "is_wholesale": 1 if user.get("isWholesale") else 0,
            "wholesale_status": user.get("wholesaleStatus"),
            "account_type": user.get("accountType") or "b2c",
            "business_name": user.get("businessName") or "",
            "vat_number": user.get("vatNumber") or "",
            "company_address": user.get("companyAddress") or "",
            "business_type": user.get("businessType") or "",
            "language": user.get("language") or "en",
            "rejection_reason": user.get("rejectionReason"),
            "approved_at": _dt_mysql(user.get("approvedAt")),
            "approved_by": user.get("approvedBy"),
            "dealer_tier": user.get("dealerTier") or "bronze",
        }

    def find_user(self, email: str) -> Optional[dict]:
        self.ensure_schema()
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM users WHERE email = %s LIMIT 1", (email.lower(),))
                row = cur.fetchone()
        return self._row_to_user(row) if row else None

    def find_user_by_id(self, user_id: str) -> Optional[dict]:
        self.ensure_schema()
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM users WHERE id = %s LIMIT 1", (user_id,))
                row = cur.fetchone()
        return self._row_to_user(row) if row else None

    def insert_user(self, user: dict) -> None:
        self.ensure_schema()
        for key, val in default_wholesale_user_fields().items():
            user.setdefault(key, val)
        cols = self._user_to_columns(user)
        sql = """
            INSERT INTO users (
              id, email, name, hashed_password, role, phone, address, city, postal_code,
              is_wholesale, wholesale_status, account_type, business_name, vat_number, company_address,
              business_type, language, rejection_reason, approved_at, approved_by, dealer_tier
            ) VALUES (
              %(id)s, %(email)s, %(name)s, %(hashed_password)s, %(role)s, %(phone)s, %(address)s,
              %(city)s, %(postal_code)s, %(is_wholesale)s, %(wholesale_status)s, %(account_type)s, %(business_name)s,
              %(vat_number)s, %(company_address)s, %(business_type)s, %(language)s, %(rejection_reason)s, %(approved_at)s,
              %(approved_by)s, %(dealer_tier)s
            )
        """
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, cols)
        if user.get("businessName") or user.get("vatNumber") or user.get("accountType") == "b2b":
            who = (user.get("businessName") or user.get("name") or user.get("email") or "Someone").strip()
            self.add_admin_notification(
                "wholesale_request",
                f"{who} applied for a business account ({user.get('email')}) — review in Wholesale",
            )
            lang = normalize_language(user.get("language"))
            self.add_notification(
                user["id"],
                "wholesale_submitted",
                tr(lang, "notify.wholesale.submitted.title"),
                tr(lang, "notify.wholesale.submitted.body"),
            )
        else:
            self.add_admin_notification("user_signup", f"New public signup: {user.get('email')}")

    def update_user(self, email: str, updates: dict) -> Optional[dict]:
        self.ensure_schema()
        mapping = {
            "name": "name",
            "phone": "phone",
            "address": "address",
            "city": "city",
            "postal_code": "postal_code",
            "businessName": "business_name",
            "vatNumber": "vat_number",
            "companyAddress": "company_address",
            "businessType": "business_type",
            "accountType": "account_type",
            "isWholesale": "is_wholesale",
            "wholesaleStatus": "wholesale_status",
            "rejectionReason": "rejection_reason",
            "approvedAt": "approved_at",
            "approvedBy": "approved_by",
            "dealerTier": "dealer_tier",
            "language": "language",
            "role": "role",
            "hashed_password": "hashed_password",
            "notificationPrefs": "notification_prefs",
            "email": "email",
        }
        sets: list[str] = []
        params: list[Any] = []
        for key, column in mapping.items():
            if key not in updates:
                continue
            value = updates[key]
            if key == "isWholesale":
                value = 1 if value else 0
            if key == "approvedAt":
                value = _dt_mysql(value)
            if key == "notificationPrefs":
                value = json.dumps(value or {})
            if key == "email":
                value = str(value or "").strip().lower()
            sets.append(f"{column} = %s")
            params.append(value)
        if not sets:
            return self.find_user(email)
        lookup = email.lower()
        new_email = None
        if "email" in updates:
            new_email = str(updates["email"] or "").strip().lower() or None
        params.append(lookup)
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute(f"UPDATE users SET {', '.join(sets)} WHERE email = %s", params)
        return self.find_user(new_email or email)

    def anonymize_user(self, email: str) -> Optional[dict]:
        """GDPR delete: wipe PII, keep the row (and order history) for tax."""
        self.ensure_schema()
        user = self.find_user(email)
        if not user:
            return None
        uid = str(user.get("id") or "").strip() or str(uuid.uuid4())
        new_email = f"deleted-{uid}@deleted.invalid"
        import bcrypt

        hashed = bcrypt.hashpw(secrets.token_bytes(32), bcrypt.gensalt()).decode()
        return self.update_user(
            email,
            {
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
                "hashed_password": hashed,
                "notificationPrefs": {},
            },
        )

    def delete_push_tokens_for_user(self, user_id: str) -> int:
        self.ensure_schema()
        uid = (user_id or "").strip()
        if not uid:
            return 0
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM push_tokens WHERE user_id = %s", (uid,))
                return int(cur.rowcount or 0)

    def seed_admin_user(self, email: str, hashed_password: str, name: str = "Admin") -> None:
        self.ensure_schema()
        key = email.lower()
        existing = self.find_user(key)
        if existing:
            user_id = existing["id"]
        else:
            import hashlib

            # Stable unique id — avoids colliding with a demoted legacy "admin-user" row.
            user_id = "admin-" + hashlib.sha1(key.encode("utf-8")).hexdigest()[:16]
            legacy = self.find_user_by_id("admin-user")
            if legacy and (legacy.get("email") or "").lower() == key:
                user_id = "admin-user"
        cols = {
            "id": user_id,
            "email": key,
            "name": name,
            "hashed_password": hashed_password,
            "role": "admin",
            "phone": "",
            "address": "",
            "city": "",
            "postal_code": "",
            "is_wholesale": 0,
            "wholesale_status": None,
            "account_type": "b2c",
            "business_name": "",
            "vat_number": "",
            "company_address": "",
            "business_type": "",
            "language": "en",
            "rejection_reason": None,
            "approved_at": None,
            "approved_by": None,
            "dealer_tier": "bronze",
        }
        sql = """
            INSERT INTO users (
              id, email, name, hashed_password, role, phone, address, city, postal_code,
              is_wholesale, wholesale_status, account_type, business_name, vat_number, company_address,
              business_type, language, rejection_reason, approved_at, approved_by, dealer_tier
            ) VALUES (
              %(id)s, %(email)s, %(name)s, %(hashed_password)s, %(role)s, %(phone)s, %(address)s,
              %(city)s, %(postal_code)s, %(is_wholesale)s, %(wholesale_status)s, %(account_type)s, %(business_name)s,
              %(vat_number)s, %(company_address)s, %(business_type)s, %(language)s, %(rejection_reason)s, %(approved_at)s,
              %(approved_by)s, %(dealer_tier)s
            )
            ON DUPLICATE KEY UPDATE
              email = VALUES(email),
              name = VALUES(name),
              hashed_password = VALUES(hashed_password),
              role = VALUES(role)
        """
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, cols)

    def _row_to_order(self, row: dict) -> dict:
        return {
            "id": row["id"],
            "order_number": row["order_number"],
            "user_id": row["user_id"],
            "customer_email": row.get("customer_email") or "",
            "customer_name": row.get("customer_name") or "",
            "items": _parse_json(row.get("items")) or [],
            "subtotal": float(row.get("subtotal") or 0),
            "full_name": row.get("full_name") or "",
            "phone": row.get("phone") or "",
            "address": row.get("address") or "",
            "city": row.get("city") or "",
            "postal_code": row.get("postal_code") or "",
            "payment_method": row.get("payment_method") or "delivery",
            "language": row.get("language") or "en",
            "status": row.get("status") or "order_placed",
            "tracking_number": row.get("tracking_number"),
            "carrier": row.get("carrier"),
            "stripe_payment_intent_id": row.get("stripe_payment_intent_id") or None,
            "created_at": _dt_iso(row.get("created_at")),
        }

    def insert_order(self, order: dict) -> dict:
        o = attach_tracking_fields(order)
        self.ensure_schema()
        sql = """
            INSERT INTO orders (
              id, order_number, user_id, customer_email, customer_name, items, subtotal,
              full_name, phone, address, city, postal_code, payment_method, language, status,
              tracking_number, carrier, stripe_payment_intent_id
            ) VALUES (
              %(id)s, %(order_number)s, %(user_id)s, %(customer_email)s, %(customer_name)s,
              %(items)s, %(subtotal)s, %(full_name)s, %(phone)s, %(address)s, %(city)s,
              %(postal_code)s, %(payment_method)s, %(language)s, %(status)s, %(tracking_number)s,
              %(carrier)s, %(stripe_payment_intent_id)s
            )
        """
        payload = {
            "id": o["id"],
            "order_number": o["order_number"],
            "user_id": o["user_id"],
            "customer_email": o.get("customer_email") or "",
            "customer_name": o.get("customer_name") or "",
            "items": json.dumps(o.get("items") or []),
            "subtotal": float(o.get("subtotal") or 0),
            "full_name": o.get("full_name") or "",
            "phone": o.get("phone") or "",
            "address": o.get("address") or "",
            "city": o.get("city") or "",
            "postal_code": o.get("postal_code") or "",
            "payment_method": o.get("payment_method") or "delivery",
            "language": o.get("language") or "en",
            "status": o.get("status") or "order_placed",
            "tracking_number": o.get("tracking_number"),
            "carrier": o.get("carrier"),
            "stripe_payment_intent_id": (
                (o.get("stripe_payment_intent_id") or o.get("stripe_checkout_session_id") or "")
                .strip()
                or None
            ),
        }
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, payload)
        return enrich_order(o)

    def get_order(self, order_id: str, user_id: str) -> Optional[dict]:
        self.ensure_schema()
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM orders WHERE id = %s AND user_id = %s LIMIT 1",
                    (order_id, user_id),
                )
                row = cur.fetchone()
        return enrich_order(self._row_to_order(row)) if row else None

    def update_order_status(self, order_id: str, user_id: str, status: str) -> Optional[dict]:
        """Persist order status (e.g. cancelled). Returns enriched order or None."""
        self.ensure_schema()
        new_status = (status or "").strip().lower()
        if not new_status:
            raise ValueError("status is required")
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE orders SET status = %s WHERE id = %s AND user_id = %s",
                    (new_status, order_id, user_id),
                )
                if cur.rowcount == 0:
                    return None
                cur.execute(
                    "SELECT * FROM orders WHERE id = %s AND user_id = %s LIMIT 1",
                    (order_id, user_id),
                )
                row = cur.fetchone()
        return enrich_order(self._row_to_order(row)) if row else None

    def list_orders(self, user_id: str, limit: int = 200) -> list[dict]:
        self.ensure_schema()
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM orders WHERE user_id = %s ORDER BY created_at DESC LIMIT %s",
                    (user_id, limit),
                )
                rows = cur.fetchall()
        return [enrich_order(self._row_to_order(row)) for row in rows]

    def _order_with_customer(self, order: dict) -> dict:
        enriched = enrich_order(order)
        user = self.find_user_by_id(order.get("user_id", ""))
        enriched["customer_email"] = order.get("customer_email") or (user or {}).get("email", "")
        enriched["customer_name"] = order.get("customer_name") or (user or {}).get("name", "")
        return enriched

    def list_all_orders(self, limit: int = 200) -> list[dict]:
        self.ensure_schema()
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM orders ORDER BY created_at DESC LIMIT %s", (limit,))
                rows = cur.fetchall()
        return [self._order_with_customer(self._row_to_order(row)) for row in rows]

    def get_admin_order(self, order_id: str) -> Optional[dict]:
        self.ensure_schema()
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM orders WHERE id = %s LIMIT 1", (order_id,))
                row = cur.fetchone()
        return self._order_with_customer(self._row_to_order(row)) if row else None

    def find_order_by_stripe_payment_id(self, payment_id: str) -> Optional[dict]:
        """Lookup order by PaymentIntent or Checkout Session id."""
        raw = (payment_id or "").strip()
        if not raw:
            return None
        self.ensure_schema()
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM orders WHERE stripe_payment_intent_id = %s LIMIT 1",
                    (raw,),
                )
                row = cur.fetchone()
        return self._order_with_customer(self._row_to_order(row)) if row else None

    def update_order_status_by_id(self, order_id: str, status: str) -> Optional[dict]:
        self.ensure_schema()
        new_status = (status or "").strip().lower()
        if not new_status:
            raise ValueError("status is required")
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE orders SET status = %s WHERE id = %s",
                    (new_status, order_id),
                )
                if cur.rowcount == 0:
                    return None
                cur.execute("SELECT * FROM orders WHERE id = %s LIMIT 1", (order_id,))
                row = cur.fetchone()
        return self._order_with_customer(self._row_to_order(row)) if row else None

    def list_users(self) -> list[dict]:
        self.ensure_schema()
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM users ORDER BY created_at DESC")
                rows = cur.fetchall()
        return [user_public_wholesale(self._row_to_user(row)) for row in rows]

    def admin_stats(self) -> dict:
        self.ensure_schema()
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) AS n FROM orders")
                total_orders = int(cur.fetchone()["n"])
                cur.execute("SELECT COALESCE(SUM(subtotal), 0) AS revenue FROM orders")
                revenue = float(cur.fetchone()["revenue"])
                cur.execute("SELECT COUNT(*) AS n FROM users WHERE role != 'admin'")
                customers = int(cur.fetchone()["n"])
        return {
            "total_orders": total_orders,
            "total_revenue": round(revenue, 2),
            "total_customers": customers,
            "total_products": 0,
            "low_stock": 0,
            "out_of_stock": 0,
        }

    def add_notification(self, user_id: str, kind: str, title: str, message: str) -> dict:
        self.ensure_schema()
        note = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "kind": kind,
            "title": title,
            "message": message,
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO notifications (id, user_id, kind, title, message, is_read)
                    VALUES (%s, %s, %s, %s, %s, 0)
                    """,
                    (note["id"], user_id, kind, title, message),
                )
        return note

    def add_admin_notification(self, kind: str, message: str) -> dict:
        return self.add_notification("admin", kind, "Admin alert", message)

    def upsert_push_token(self, user_id: str, token: str, platform: str = "") -> None:
        self.ensure_schema()
        tok = (token or "").strip()
        if not tok or not user_id:
            return
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO push_tokens (token, user_id, platform)
                    VALUES (%s, %s, %s)
                    ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), platform = VALUES(platform),
                      updated_at = CURRENT_TIMESTAMP
                    """,
                    (tok, user_id, (platform or "")[:32]),
                )

    def delete_push_token(self, token: str, user_id: Optional[str] = None) -> bool:
        self.ensure_schema()
        tok = (token or "").strip()
        if not tok:
            return False
        with self._conn() as conn:
            with conn.cursor() as cur:
                if user_id:
                    cur.execute("DELETE FROM push_tokens WHERE token = %s AND user_id = %s", (tok, user_id))
                else:
                    cur.execute("DELETE FROM push_tokens WHERE token = %s", (tok,))
                return cur.rowcount > 0

    def list_push_tokens(self, user_id: str) -> list[str]:
        self.ensure_schema()
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT token FROM push_tokens WHERE user_id = %s", (user_id,))
                rows = cur.fetchall()
        return [r["token"] for r in rows if r.get("token")]

    def list_push_tokens_for_users(self, user_ids: list[str]) -> dict[str, list[str]]:
        self.ensure_schema()
        if not user_ids:
            return {}
        placeholders = ",".join(["%s"] * len(user_ids))
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"SELECT user_id, token FROM push_tokens WHERE user_id IN ({placeholders})",
                    user_ids,
                )
                rows = cur.fetchall()
        out: dict[str, list[str]] = {}
        for r in rows:
            out.setdefault(r["user_id"], []).append(r["token"])
        return out

    def list_customer_user_ids(self) -> list[str]:
        self.ensure_schema()
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id FROM users WHERE role != 'admin'")
                rows = cur.fetchall()
        return [r["id"] for r in rows]

    def list_notifications(self, user_id: str, limit: int = 50) -> list[dict]:
        self.ensure_schema()
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, user_id, kind, title, message, is_read, created_at
                    FROM notifications WHERE user_id = %s
                    ORDER BY created_at DESC LIMIT %s
                    """,
                    (user_id, limit),
                )
                rows = cur.fetchall()
        return [
            {
                "id": row["id"],
                "user_id": row["user_id"],
                "kind": row["kind"],
                "title": row["title"],
                "message": row["message"],
                "read": bool(row["is_read"]),
                "created_at": _dt_iso(row.get("created_at")),
            }
            for row in rows
        ]

    def mark_notification_read(self, note_id: str, user_id: str) -> bool:
        self.ensure_schema()
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE notifications SET is_read = 1 WHERE id = %s AND user_id = %s",
                    (note_id, user_id),
                )
                return cur.rowcount > 0

    def upsert_stock_notification(self, product_id: str, email: str) -> None:
        self.ensure_schema()
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO stock_notifications (product_id, email)
                    VALUES (%s, %s)
                    ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP
                    """,
                    (product_id, email.lower()),
                )

    def list_stock_notifications(self, email: Optional[str] = None) -> list[dict]:
        self.ensure_schema()
        sql = "SELECT product_id, email, created_at FROM stock_notifications"
        params: list[Any] = []
        if email:
            sql += " WHERE email = %s"
            params.append(email.strip().lower())
        sql += " ORDER BY created_at DESC"
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                rows = cur.fetchall()
        out = []
        for r in rows:
            created = r.get("created_at")
            out.append(
                {
                    "product_id": r.get("product_id"),
                    "email": r.get("email"),
                    "created_at": created.isoformat() if hasattr(created, "isoformat") else created,
                }
            )
        return out

    def delete_stock_notification(self, product_id: str, email: str) -> bool:
        self.ensure_schema()
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM stock_notifications WHERE product_id = %s AND email = %s",
                    (product_id, email.strip().lower()),
                )
                return cur.rowcount > 0

    def get_meta(self, key: str) -> Optional[str]:
        self.ensure_schema()
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT meta_value FROM app_meta WHERE meta_key = %s", (key,))
                row = cur.fetchone()
        if not row:
            return None
        return row.get("meta_value")

    def set_meta(self, key: str, value: str) -> None:
        self.ensure_schema()
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO app_meta (meta_key, meta_value)
                    VALUES (%s, %s)
                    ON DUPLICATE KEY UPDATE meta_value = VALUES(meta_value)
                    """,
                    (key, value),
                )

    def list_wholesale_requests(self, status: Optional[str] = None) -> list[dict]:
        self.ensure_schema()
        sql = """
            SELECT * FROM users
            WHERE role != 'admin'
              AND (
                business_name != ''
                OR vat_number != ''
                OR account_type = 'b2b'
                OR wholesale_status IN ('pending', 'approved', 'rejected', 'suspended')
              )
        """
        params: list[Any] = []
        if status:
            sql += " AND wholesale_status = %s"
            params.append(status)
        sql += " ORDER BY created_at DESC"
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                rows = cur.fetchall()
        return [wholesale_request_row(self._row_to_user(row)) for row in rows]

    def approve_wholesale(self, user_id: str, admin_id: str, dealer_tier: str = "bronze") -> Optional[dict]:
        from wholesale import normalize_dealer_tier

        user = self.find_user_by_id(user_id)
        if not user or user.get("role") == "admin":
            return None
        now = datetime.now(timezone.utc).isoformat()
        self.update_user(
            user["email"],
            {
                "isWholesale": True,
                "wholesaleStatus": "approved",
                "accountType": "b2b",
                "dealerTier": normalize_dealer_tier(dealer_tier),
                "approvedAt": now,
                "approvedBy": admin_id,
                "rejectionReason": None,
            },
        )
        user = self.find_user_by_id(user_id)
        tier = (user or {}).get("dealerTier", "bronze")
        lang = normalize_language((user or {}).get("language"))
        self.add_notification(
            user_id,
            "wholesale_approved",
            tr(lang, "notify.wholesale.approved.title"),
            tr(lang, "notify.wholesale.approved.body", tier=tier),
        )
        return wholesale_request_row(user or {})

    def reject_wholesale(self, user_id: str, admin_id: str, reason: str) -> Optional[dict]:
        user = self.find_user_by_id(user_id)
        if not user or user.get("role") == "admin":
            return None
        rejection = reason.strip() or "Application rejected."
        self.update_user(
            user["email"],
            {
                "isWholesale": False,
                "wholesaleStatus": "rejected",
                "rejectionReason": rejection,
                "approvedAt": None,
                "approvedBy": admin_id,
            },
        )
        user = self.find_user_by_id(user_id)
        lang = normalize_language((user or {}).get("language"))
        self.add_notification(
            user_id,
            "wholesale_rejected",
            tr(lang, "notify.wholesale.rejected.title"),
            f"Your wholesale application has been rejected.\n\nReason:\n{rejection}",
        )
        return wholesale_request_row(user or {})

    def suspend_wholesale(self, user_id: str, admin_id: str) -> Optional[dict]:
        user = self.find_user_by_id(user_id)
        if not user or user.get("role") == "admin":
            return None
        self.update_user(
            user["email"],
            {
                "isWholesale": False,
                "wholesaleStatus": "suspended",
                "approvedBy": admin_id,
            },
        )
        user = self.find_user_by_id(user_id)
        lang = normalize_language((user or {}).get("language"))
        self.add_notification(
            user_id,
            "wholesale_suspended",
            tr(lang, "notify.wholesale.suspended.title"),
            tr(lang, "notify.wholesale.suspended.body"),
        )
        return wholesale_request_row(user or {})

    def upsert_saved_cart(self, user_id: str, email: str, items: list[dict], subtotal: float) -> None:
        self.ensure_schema()
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT items, abandoned_email_sent_at FROM saved_carts WHERE user_id = %s", (user_id,))
                row = cur.fetchone()
                if not items:
                    if row:
                        cur.execute(
                            "UPDATE saved_carts SET items = %s, subtotal = 0, updated_at = CURRENT_TIMESTAMP WHERE user_id = %s",
                            (json.dumps([]), user_id),
                        )
                    return
                old_items = _parse_json(row["items"]) if row else []
                reset_reminder = row is None or self._cart_items_signature(old_items) != self._cart_items_signature(items)
                sent_at = None if reset_reminder else row.get("abandoned_email_sent_at")
                cur.execute(
                    """
                    INSERT INTO saved_carts (user_id, email, items, subtotal, abandoned_email_sent_at)
                    VALUES (%s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                      email = VALUES(email),
                      items = VALUES(items),
                      subtotal = VALUES(subtotal),
                      updated_at = CURRENT_TIMESTAMP,
                      abandoned_email_sent_at = VALUES(abandoned_email_sent_at)
                    """,
                    (user_id, email.lower(), json.dumps(items), float(subtotal or 0), sent_at),
                )

    @staticmethod
    def _cart_items_signature(items: list[dict]) -> str:
        parts = [f"{item.get('product_id')}:{item.get('quantity')}" for item in (items or [])]
        return "|".join(sorted(parts))

    def clear_saved_cart(self, user_id: str) -> None:
        self.ensure_schema()
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM saved_carts WHERE user_id = %s", (user_id,))

    def mark_cart_converted(self, user_id: str, email: str = "") -> None:
        self.ensure_schema()
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE saved_carts
                    SET converted_at = CURRENT_TIMESTAMP, items = %s, subtotal = 0
                    WHERE user_id = %s
                    """,
                    (json.dumps([]), user_id),
                )
                if email:
                    cur.execute(
                        """
                        UPDATE saved_carts
                        SET converted_at = CURRENT_TIMESTAMP, items = %s, subtotal = 0
                        WHERE email = %s AND converted_at IS NULL
                        """,
                        (json.dumps([]), email.lower()),
                    )

    def mark_cart_reminder_sent(self, user_id: str) -> None:
        self.ensure_schema()
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE saved_carts SET abandoned_email_sent_at = CURRENT_TIMESTAMP WHERE user_id = %s",
                    (user_id,),
                )

    def list_carts_due_for_reminder(self, hours: int) -> list[dict]:
        self.ensure_schema()
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT user_id, email, items, subtotal, updated_at
                    FROM saved_carts
                    WHERE converted_at IS NULL
                      AND abandoned_email_sent_at IS NULL
                      AND JSON_LENGTH(items) > 0
                      AND updated_at <= (UTC_TIMESTAMP() - INTERVAL %s HOUR)
                    """,
                    (hours,),
                )
                rows = cur.fetchall()
        out: list[dict] = []
        for row in rows:
            out.append(
                {
                    "user_id": row["user_id"],
                    "email": row["email"],
                    "items": _parse_json(row["items"]) or [],
                    "subtotal": float(row.get("subtotal") or 0),
                    "updated_at": _dt_iso(row.get("updated_at")),
                }
            )
        return out


    def _discount_row(self, row: dict) -> dict:
        targets = _parse_json(row.get("target_ids"))
        return {
            "id": row["id"],
            "user_id": row["user_id"],
            "discount_type": row["discount_type"],
            "discount_value": float(row["discount_value"] or 0),
            "applies_to": row.get("applies_to") or "all",
            "target_ids": targets,
            "reason": row.get("reason"),
            "is_active": bool(row.get("is_active")),
            "starts_at": _dt_iso(row.get("starts_at")),
            "expires_at": _dt_iso(row.get("expires_at")),
            "created_by": row.get("created_by"),
            "created_at": _dt_iso(row.get("created_at")),
            "updated_at": _dt_iso(row.get("updated_at")),
        }

    def search_users(self, q: str, limit: int = 40) -> list[dict]:
        self.ensure_schema()
        needle = (q or "").strip()
        with self._conn() as conn:
            with conn.cursor() as cur:
                if not needle:
                    cur.execute(
                        """
                        SELECT * FROM users
                        ORDER BY created_at DESC LIMIT %s
                        """,
                        (limit,),
                    )
                else:
                    like = f"%{needle}%"
                    cur.execute(
                        """
                        SELECT * FROM users
                        WHERE (
                            email LIKE %s OR name LIKE %s OR phone LIKE %s
                            OR business_name LIKE %s OR vat_number LIKE %s
                          )
                        ORDER BY created_at DESC
                        LIMIT %s
                        """,
                        (like, like, like, like, like, limit),
                    )
                rows = cur.fetchall()
        out = []
        for row in rows:
            u = user_public_wholesale(self._row_to_user(row))
            acct = (u.get("accountType") or "b2c").lower()
            u["accountLabel"] = "business" if acct == "b2b" else "public"
            out.append(u)
        return out

    def list_user_discounts(self, user_id: str) -> list[dict]:
        self.ensure_schema()
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT * FROM user_discounts
                    WHERE user_id = %s
                    ORDER BY created_at DESC
                    """,
                    (user_id,),
                )
                rows = cur.fetchall()
        return [self._discount_row(r) for r in rows]

    def list_active_user_discounts(self, user_id: str) -> list[dict]:
        self.ensure_schema()
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT * FROM user_discounts
                    WHERE user_id = %s
                      AND is_active = 1
                      AND starts_at <= UTC_TIMESTAMP()
                      AND (expires_at IS NULL OR expires_at > UTC_TIMESTAMP())
                    ORDER BY created_at DESC
                    """,
                    (user_id,),
                )
                rows = cur.fetchall()
        return [self._discount_row(r) for r in rows]

    def get_user_discount(self, user_id: str, discount_id: str) -> Optional[dict]:
        self.ensure_schema()
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT * FROM user_discounts
                    WHERE id = %s AND user_id = %s
                    LIMIT 1
                    """,
                    (discount_id, user_id),
                )
                row = cur.fetchone()
        return self._discount_row(row) if row else None

    def create_user_discount(self, user_id: str, data: dict, created_by: Optional[str] = None) -> dict:
        self.ensure_schema()
        discount_id = str(uuid.uuid4())
        targets = data.get("target_ids")
        targets_json = json.dumps(targets) if targets is not None else None
        starts = data.get("starts_at") or datetime.now(timezone.utc)
        expires = data.get("expires_at")
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO user_discounts (
                      id, user_id, discount_type, discount_value, applies_to, target_ids,
                      reason, is_active, starts_at, expires_at, created_by
                    ) VALUES (
                      %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    )
                    """,
                    (
                        discount_id,
                        user_id,
                        data["discount_type"],
                        float(data["discount_value"]),
                        data.get("applies_to") or "all",
                        targets_json,
                        data.get("reason"),
                        1 if data.get("is_active", True) else 0,
                        starts.replace(tzinfo=None) if isinstance(starts, datetime) else starts,
                        expires.replace(tzinfo=None) if isinstance(expires, datetime) else expires,
                        created_by,
                    ),
                )
        row = self.get_user_discount(user_id, discount_id)
        assert row is not None
        return row

    def update_user_discount(self, user_id: str, discount_id: str, data: dict) -> Optional[dict]:
        self.ensure_schema()
        existing = self.get_user_discount(user_id, discount_id)
        if not existing:
            return None
        fields = []
        values: list[Any] = []
        mapping = {
            "discount_type": "discount_type",
            "discount_value": "discount_value",
            "applies_to": "applies_to",
            "reason": "reason",
            "is_active": "is_active",
            "starts_at": "starts_at",
            "expires_at": "expires_at",
        }
        for key, col in mapping.items():
            if key not in data:
                continue
            val = data[key]
            if key == "is_active":
                val = 1 if val else 0
            elif key in {"starts_at", "expires_at"} and isinstance(val, datetime):
                val = val.replace(tzinfo=None)
            fields.append(f"{col} = %s")
            values.append(val)
        if "target_ids" in data:
            targets = data["target_ids"]
            fields.append("target_ids = %s")
            values.append(json.dumps(targets) if targets is not None else None)
        if not fields:
            return existing
        values.extend([discount_id, user_id])
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"UPDATE user_discounts SET {', '.join(fields)} WHERE id = %s AND user_id = %s",
                    tuple(values),
                )
        return self.get_user_discount(user_id, discount_id)

    def delete_user_discount(self, user_id: str, discount_id: str) -> bool:
        self.ensure_schema()
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM user_discounts WHERE id = %s AND user_id = %s",
                    (discount_id, user_id),
                )
                return cur.rowcount > 0

    # ---- Shipments (DPD) ----

    def _row_to_shipment(self, row: dict) -> dict:
        if not row:
            return {}
        return {
            "id": row["id"],
            "order_id": row["order_id"],
            "carrier": row.get("carrier") or "dpd",
            "num_guia": row.get("num_guia"),
            "label_path": row.get("label_path"),
            "status": row.get("status") or "created",
            "raw_response": _parse_json(row.get("raw_response")),
            "created_at": _dt_iso(row.get("created_at")),
            "updated_at": _dt_iso(row.get("updated_at")),
        }

    def insert_shipment(self, shipment: dict) -> dict:
        self.ensure_schema()
        payload = {
            "id": shipment["id"],
            "order_id": shipment["order_id"],
            "carrier": shipment.get("carrier") or "dpd",
            "num_guia": shipment.get("num_guia"),
            "label_path": shipment.get("label_path"),
            "status": shipment.get("status") or "created",
            "raw_response": json.dumps(shipment.get("raw_response"))
            if shipment.get("raw_response") is not None
            else None,
        }
        sql = """
            INSERT INTO shipments (
              id, order_id, carrier, num_guia, label_path, status, raw_response
            ) VALUES (
              %(id)s, %(order_id)s, %(carrier)s, %(num_guia)s, %(label_path)s,
              %(status)s, %(raw_response)s
            )
        """
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, payload)
        return self.get_shipment_by_id(payload["id"]) or self._row_to_shipment(
            {**payload, "raw_response": shipment.get("raw_response"), "created_at": None, "updated_at": None}
        )

    def get_shipment_by_id(self, shipment_id: str) -> Optional[dict]:
        self.ensure_schema()
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM shipments WHERE id = %s LIMIT 1", (shipment_id,))
                row = cur.fetchone()
        return self._row_to_shipment(row) if row else None

    def get_shipment_by_order(self, order_id: str) -> Optional[dict]:
        """Latest non-error shipment for an order, falling back to any latest row."""
        self.ensure_schema()
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT * FROM shipments
                    WHERE order_id = %s AND status != 'error'
                    ORDER BY created_at DESC LIMIT 1
                    """,
                    (order_id,),
                )
                row = cur.fetchone()
                if not row:
                    cur.execute(
                        """
                        SELECT * FROM shipments
                        WHERE order_id = %s
                        ORDER BY created_at DESC LIMIT 1
                        """,
                        (order_id,),
                    )
                    row = cur.fetchone()
        return self._row_to_shipment(row) if row else None

    def update_shipments_status_by_guias(self, guia_numbers: list[str], status: str) -> int:
        self.ensure_schema()
        guias = [g for g in (guia_numbers or []) if g]
        if not guias:
            return 0
        placeholders = ", ".join(["%s"] * len(guias))
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"UPDATE shipments SET status = %s WHERE num_guia IN ({placeholders})",
                    [status, *guias],
                )
                return int(cur.rowcount or 0)

    def update_order_tracking(
        self,
        order_id: str,
        *,
        tracking_number: str | None = None,
        carrier: str | None = None,
    ) -> None:
        self.ensure_schema()
        fields: list[str] = []
        values: list[Any] = []
        if tracking_number is not None:
            fields.append("tracking_number = %s")
            values.append(tracking_number)
        if carrier is not None:
            fields.append("carrier = %s")
            values.append(carrier)
        if not fields:
            return
        values.append(order_id)
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"UPDATE orders SET {', '.join(fields)} WHERE id = %s",
                    tuple(values),
                )


_app_db: AppDB | None = None


def get_app_db() -> AppDB:
    global _app_db
    if _app_db is None:
        _app_db = AppDB()
    return _app_db
