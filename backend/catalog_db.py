"""Catalog MySQL — WooCommerce tables in u552904336_samappdb (read-heavy)."""
from __future__ import annotations

import logging
import os
import threading
from contextlib import contextmanager
from typing import Any, Iterator, Optional

import pymysql
from pymysql.cursors import DictCursor

logger = logging.getLogger(__name__)


def _env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


def catalog_mysql_configured() -> bool:
    return bool(
        (_env("CATALOG_MYSQL_HOST") or _env("DB_HOST"))
        and (_env("CATALOG_MYSQL_USER") or _env("DB_USER"))
        and (_env("CATALOG_MYSQL_PASSWORD") or _env("DB_PASSWORD"))
        and (_env("CATALOG_MYSQL_DATABASE") or _env("DB_NAME"))
    )


def catalog_host() -> str:
    # Prefer explicit catalog host; fall back to DB_* (user-facing names).
    return _env("CATALOG_MYSQL_HOST") or _env("DB_HOST", "127.0.0.1")


def catalog_database() -> str:
    return _env("CATALOG_MYSQL_DATABASE") or _env("DB_NAME", "u552904336_samappdb")


def table_prefix() -> str:
    return _env("WP_TABLE_PREFIX", "wp_")


class CatalogDB:
    """
    Shared-hosting friendly MySQL access.

    Hostinger enforces max_connections_per_hour (~500). Opening a fresh TCP
    connection per query exhausts that quickly, so we keep a tiny pool.
    """

    def __init__(self) -> None:
        self._prefix = table_prefix()
        self._lock = threading.Lock()
        self._pool: list[pymysql.connections.Connection] = []
        self._max_pool = max(1, int(_env("CATALOG_MYSQL_POOL_SIZE", "2") or "2"))

    def configured(self) -> bool:
        return catalog_mysql_configured()

    def t(self, name: str) -> str:
        """Qualified table name with WP prefix (safe identifier)."""
        return f"{self._prefix}{name}"

    def _new_connection(self) -> pymysql.connections.Connection:
        if not self.configured():
            raise RuntimeError("Catalog MySQL not configured (CATALOG_MYSQL_* / DB_*)")
        return pymysql.connect(
            host=catalog_host(),
            port=int(_env("CATALOG_MYSQL_PORT") or _env("DB_PORT", "3306")),
            user=_env("CATALOG_MYSQL_USER") or _env("DB_USER"),
            password=_env("CATALOG_MYSQL_PASSWORD") or _env("DB_PASSWORD"),
            database=catalog_database(),
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
    def connect(self) -> Iterator[pymysql.connections.Connection]:
        conn = self._acquire()
        discard = False
        try:
            yield conn
        except Exception:
            discard = True
            raise
        finally:
            self._release(conn, discard=discard)

    def health(self) -> dict[str, Any]:
        if not self.configured():
            return {"ok": False, "configured": False, "error": "Set CATALOG_MYSQL_* or DB_*"}
        try:
            with self.connect() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        f"SELECT COUNT(*) AS c FROM `{self.t('posts')}` "
                        "WHERE post_type='product' AND post_status='publish'"
                    )
                    products = int(cur.fetchone()["c"])
            return {
                "ok": True,
                "configured": True,
                "host": catalog_host(),
                "database": catalog_database(),
                "published_products": products,
                "source": "catalog_mysql",
                "pool_size": self._max_pool,
            }
        except Exception as exc:
            msg = str(exc)
            out = {"ok": False, "configured": True, "error": msg, "source": "catalog_mysql"}
            if "max_connections_per_hour" in msg:
                out["hint"] = (
                    "Hostinger hourly connection quota hit. Reuse the pool "
                    "(CATALOG_MYSQL_POOL_SIZE=2) and wait for the window to reset."
                )
            elif "Access denied" in msg or "1045" in msg:
                out["hint"] = (
                    "Whitelist this PC's public IP in hPanel → Databases → Remote MySQL "
                    f"(host={catalog_host()}). 127.0.0.1 only works with a local tunnel."
                )
            return out

    def ensure_app_tables(self) -> None:
        """App-owned tables inside samappdb (never touch live WC write path)."""
        with self.connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS samphone_b2c_pricing (
                      product_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
                      b2c_price DECIMAL(12,2) NULL,
                      public_price DECIMAL(12,2) NULL,
                      business_price DECIMAL(12,2) NULL,
                      markup DECIMAL(10,4) NULL,
                      image_url VARCHAR(1024) NULL,
                      compare_at_price DECIMAL(12,2) NULL,
                      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                        ON UPDATE CURRENT_TIMESTAMP
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                    """
                )
                for statement in (
                    "ALTER TABLE samphone_b2c_pricing ADD COLUMN public_price DECIMAL(12,2) NULL",
                    "ALTER TABLE samphone_b2c_pricing ADD COLUMN business_price DECIMAL(12,2) NULL",
                    "ALTER TABLE samphone_b2c_pricing ADD COLUMN image_url VARCHAR(1024) NULL",
                    "ALTER TABLE samphone_b2c_pricing ADD COLUMN compare_at_price DECIMAL(12,2) NULL",
                ):
                    try:
                        cur.execute(statement)
                    except Exception:
                        pass
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS samphone_public_price_bands (
                      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                      cost_min DECIMAL(12,2) NOT NULL,
                      cost_max DECIMAL(12,2) NOT NULL,
                      public_price DECIMAL(12,2) NOT NULL,
                      sort_order INT NOT NULL DEFAULT 0,
                      UNIQUE KEY uq_band_range (cost_min, cost_max)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                    """
                )
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS samphone_pricing_settings (
                      setting_key VARCHAR(64) NOT NULL PRIMARY KEY,
                      setting_value TEXT NOT NULL,
                      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                        ON UPDATE CURRENT_TIMESTAMP
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                    """
                )
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS samphone_id_map (
                      product_uuid CHAR(36) NOT NULL PRIMARY KEY,
                      wc_id BIGINT UNSIGNED NOT NULL,
                      UNIQUE KEY uq_wc_id (wc_id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                    """
                )
                cur.execute(
                    """
                    INSERT IGNORE INTO samphone_pricing_settings (setting_key, setting_value)
                    VALUES ('default_b2c_markup', %s)
                    """,
                    (_env("B2C_DEFAULT_MARKUP", "1.0"),),
                )
                # Seed accessory public bands (personal accounts only).
                from wholesale import PUBLIC_PRICE_BANDS

                # Replace bands from code of record so range edits (e.g. 1.50→1.90) apply.
                cur.execute("DELETE FROM samphone_public_price_bands")
                for i, (lo, hi, public) in enumerate(PUBLIC_PRICE_BANDS):
                    cur.execute(
                        """
                        INSERT INTO samphone_public_price_bands
                          (cost_min, cost_max, public_price, sort_order)
                        VALUES (%s, %s, %s, %s)
                        """,
                        (lo, hi, public, i),
                    )
        logger.info("Catalog app tables ready on %s", catalog_database())


_catalog_db: Optional[CatalogDB] = None


def get_catalog_db() -> CatalogDB:
    global _catalog_db
    if _catalog_db is None:
        _catalog_db = CatalogDB()
    return _catalog_db
