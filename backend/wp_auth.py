"""Authenticate against WordPress `wp_users` in the catalog MySQL clone."""
from __future__ import annotations

import logging
import re
import uuid
from typing import Any, Optional

from passlib.hash import phpass

from catalog_db import get_catalog_db

logger = logging.getLogger(__name__)


def _normalize_email(value: str) -> str:
    return (value or "").strip().lower()


def verify_wp_password(plain: str, hashed: str) -> bool:
    """Verify WordPress phpass (`$P$` / `$H$`) or bcrypt hashes."""
    raw = (hashed or "").strip()
    if not plain or not raw:
        return False
    try:
        if raw.startswith("$P$") or raw.startswith("$H$"):
            return bool(phpass.verify(plain, raw))
        if raw.startswith("$2y$") or raw.startswith("$2a$") or raw.startswith("$2b$"):
            # WordPress occasionally stores bcrypt; normalize $2y$ → $2b$ for bcrypt lib.
            import bcrypt

            normalized = raw
            if normalized.startswith("$2y$"):
                normalized = "$2b$" + normalized[4:]
            return bcrypt.checkpw(plain.encode("utf-8"), normalized.encode("utf-8"))
    except Exception as exc:
        logger.debug("WP password verify failed: %s", exc)
    return False


def _parse_capabilities(raw: str | None) -> set[str]:
    text = raw or ""
    # Serialized PHP: a:1:{s:8:"customer";b:1;}
    return {m.lower() for m in re.findall(r's:\d+:"([^"]+)"', text)}


def find_wp_user_by_email_or_login(identifier: str) -> Optional[dict[str, Any]]:
    """Lookup wp_users by email or user_login (case-insensitive email)."""
    ident = (identifier or "").strip()
    if not ident:
        return None
    email = _normalize_email(ident)
    db = get_catalog_db()
    if not db.configured():
        return None
    try:
        with db.connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    SELECT ID, user_login, user_email, user_pass, display_name, user_registered
                    FROM `{db.t('users')}`
                    WHERE LOWER(user_email)=%s OR user_login=%s
                    LIMIT 1
                    """,
                    (email, ident),
                )
                row = cur.fetchone()
                if not row:
                    return None
                wp_id = int(row["ID"])
                cur.execute(
                    f"""
                    SELECT meta_key, meta_value
                    FROM `{db.t('usermeta')}`
                    WHERE user_id=%s
                      AND meta_key IN (
                        'first_name','last_name','billing_phone','billing_company',
                        'billing_address_1','billing_city','billing_postcode',
                        'billing_vat','vat_number','wp_capabilities'
                      )
                    """,
                    (wp_id,),
                )
                meta = {str(m["meta_key"]): (m.get("meta_value") or "") for m in cur.fetchall()}
    except Exception as exc:
        logger.warning("WP user lookup failed: %s", exc)
        return None

    caps = _parse_capabilities(meta.get("wp_capabilities"))
    first = (meta.get("first_name") or "").strip()
    last = (meta.get("last_name") or "").strip()
    display = (row.get("display_name") or "").strip() or f"{first} {last}".strip()
    company = (meta.get("billing_company") or "").strip()
    is_wholesale_role = any(
        key in caps
        for key in (
            "wholesale_customer",
            "wholesaler",
            "shop_manager",
            "administrator",
        )
    )
    return {
        "wp_id": wp_id,
        "email": _normalize_email(row.get("user_email") or email),
        "login": row.get("user_login") or "",
        "user_pass": row.get("user_pass") or "",
        "name": display or (row.get("user_login") or email.split("@")[0]),
        "phone": (meta.get("billing_phone") or "").strip(),
        "address": (meta.get("billing_address_1") or "").strip(),
        "city": (meta.get("billing_city") or "").strip(),
        "postal_code": (meta.get("billing_postcode") or "").strip(),
        "businessName": company,
        "vatNumber": (meta.get("billing_vat") or meta.get("vat_number") or "").strip(),
        "is_wholesale_role": is_wholesale_role,
        "capabilities": sorted(caps),
        "created_at": row.get("user_registered"),
    }


def authenticate_wp_user(identifier: str, password: str) -> Optional[dict[str, Any]]:
    """Return WP profile dict if credentials match; never mutates WordPress tables."""
    profile = find_wp_user_by_email_or_login(identifier)
    if not profile:
        return None
    if not verify_wp_password(password, profile.get("user_pass") or ""):
        return None
    # Never leak hash to callers
    profile = dict(profile)
    profile.pop("user_pass", None)
    return profile


def _wp_profile_public(profile: dict[str, Any]) -> dict[str, Any]:
    """Admin-safe website customer row (no password hash)."""
    caps = list(profile.get("capabilities") or [])
    is_b2b = bool(profile.get("is_wholesale_role") or profile.get("businessName") or profile.get("vatNumber"))
    created = profile.get("created_at")
    created_iso = created.isoformat() if hasattr(created, "isoformat") else str(created or "")
    wp_id = int(profile.get("wp_id") or 0)
    return {
        "id": f"wp-{wp_id}",
        "wp_id": wp_id,
        "email": profile.get("email") or "",
        "login": profile.get("login") or "",
        "name": profile.get("name") or "",
        "phone": profile.get("phone") or "",
        "address": profile.get("address") or "",
        "city": profile.get("city") or "",
        "postal_code": profile.get("postal_code") or "",
        "accountType": "b2b" if is_b2b else "b2c",
        "businessName": profile.get("businessName") or "",
        "vatNumber": profile.get("vatNumber") or "",
        "isWholesaleRole": bool(profile.get("is_wholesale_role")),
        "roles": caps,
        "created_at": created_iso,
        "createdAt": created_iso,
        "source": "website",
    }


def list_website_customers(
    *,
    q: str = "",
    limit: int = 2000,
    offset: int = 0,
) -> dict[str, Any]:
    """
    List WooCommerce / WordPress customers from the catalog MySQL clone (`wp_users`).
    No extra env — uses the same CATALOG_MYSQL_* / DB_* connection as products.
    """
    db = get_catalog_db()
    if not db.configured():
        return {"items": [], "total": 0, "limit": limit, "offset": offset, "source": "website"}

    # limit<=0 means "all" (capped for safety)
    if limit is None or int(limit) <= 0:
        limit = 5000
    else:
        limit = max(1, min(int(limit), 5000))
    offset = max(0, int(offset or 0))
    needle = (q or "").strip()
    users_t = db.t("users")
    meta_t = db.t("usermeta")

    where = "1=1"
    params: list[Any] = []
    if needle:
        like = f"%{needle}%"
        where = "(u.user_email LIKE %s OR u.user_login LIKE %s OR u.display_name LIKE %s)"
        params.extend([like, like, like])

    try:
        with db.connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"SELECT COUNT(*) AS n FROM `{users_t}` u WHERE {where}",
                    tuple(params),
                )
                total = int((cur.fetchone() or {}).get("n") or 0)

                cur.execute(
                    f"""
                    SELECT u.ID, u.user_login, u.user_email, u.display_name, u.user_registered
                    FROM `{users_t}` u
                    WHERE {where}
                    ORDER BY u.user_registered DESC
                    LIMIT %s OFFSET %s
                    """,
                    tuple(params + [limit, offset]),
                )
                rows = cur.fetchall() or []
                if not rows:
                    return {
                        "items": [],
                        "total": total,
                        "limit": limit,
                        "offset": offset,
                        "source": "website",
                    }

                ids = [int(r["ID"]) for r in rows]
                ph = ",".join(["%s"] * len(ids))
                cur.execute(
                    f"""
                    SELECT user_id, meta_key, meta_value
                    FROM `{meta_t}`
                    WHERE user_id IN ({ph})
                      AND meta_key IN (
                        'first_name','last_name','billing_phone','billing_company',
                        'billing_address_1','billing_city','billing_postcode',
                        'billing_vat','vat_number','wp_capabilities'
                      )
                    """,
                    tuple(ids),
                )
                meta_by_user: dict[int, dict[str, str]] = {}
                for m in cur.fetchall() or []:
                    uid = int(m["user_id"])
                    meta_by_user.setdefault(uid, {})[str(m["meta_key"])] = m.get("meta_value") or ""
    except Exception as exc:
        logger.warning("list_website_customers failed: %s", exc)
        return {"items": [], "total": 0, "limit": limit, "offset": offset, "source": "website", "error": str(exc)}

    items: list[dict[str, Any]] = []
    for row in rows:
        wp_id = int(row["ID"])
        meta = meta_by_user.get(wp_id, {})
        caps = _parse_capabilities(meta.get("wp_capabilities"))
        first = (meta.get("first_name") or "").strip()
        last = (meta.get("last_name") or "").strip()
        display = (row.get("display_name") or "").strip() or f"{first} {last}".strip()
        email = _normalize_email(row.get("user_email") or "")
        company = (meta.get("billing_company") or "").strip()
        is_wholesale_role = any(
            key in caps
            for key in ("wholesale_customer", "wholesaler", "shop_manager", "administrator")
        )
        profile = {
            "wp_id": wp_id,
            "email": email,
            "login": row.get("user_login") or "",
            "name": display or (row.get("user_login") or (email.split("@")[0] if email else f"user-{wp_id}")),
            "phone": (meta.get("billing_phone") or "").strip(),
            "address": (meta.get("billing_address_1") or "").strip(),
            "city": (meta.get("billing_city") or "").strip(),
            "postal_code": (meta.get("billing_postcode") or "").strip(),
            "businessName": company,
            "vatNumber": (meta.get("billing_vat") or meta.get("vat_number") or "").strip(),
            "is_wholesale_role": is_wholesale_role,
            "capabilities": sorted(caps),
            "created_at": row.get("user_registered"),
        }
        items.append(_wp_profile_public(profile))

    return {
        "items": items,
        "total": total,
        "limit": limit,
        "offset": offset,
        "source": "website",
        "has_more": (offset + len(items)) < total,
    }


def _um_approved_sql(users_t: str, meta_t: str) -> str:
    return f"""
                    SELECT u.ID, u.user_login, u.user_email, u.display_name, u.user_registered,
                           caps.meta_value AS caps,
                           fn.meta_value AS first_name,
                           ln.meta_value AS last_name,
                           ph.meta_value AS phone,
                           co.meta_value AS company,
                           vat.meta_value AS billing_vat,
                           vat2.meta_value AS vat_number,
                           ad.meta_value AS address,
                           ci.meta_value AS city,
                           pc.meta_value AS postcode
                    FROM `{users_t}` u
                    INNER JOIN `{meta_t}` st
                      ON st.user_id = u.ID
                     AND st.meta_key = 'account_status'
                     AND st.meta_value = 'approved'
                    LEFT JOIN `{meta_t}` caps
                      ON caps.user_id = u.ID AND caps.meta_key = 'wp_capabilities'
                    LEFT JOIN `{meta_t}` fn
                      ON fn.user_id = u.ID AND fn.meta_key = 'first_name'
                    LEFT JOIN `{meta_t}` ln
                      ON ln.user_id = u.ID AND ln.meta_key = 'last_name'
                    LEFT JOIN `{meta_t}` ph
                      ON ph.user_id = u.ID AND ph.meta_key = 'billing_phone'
                    LEFT JOIN `{meta_t}` co
                      ON co.user_id = u.ID AND co.meta_key = 'billing_company'
                    LEFT JOIN `{meta_t}` vat
                      ON vat.user_id = u.ID AND vat.meta_key = 'billing_vat'
                    LEFT JOIN `{meta_t}` vat2
                      ON vat2.user_id = u.ID AND vat2.meta_key = 'vat_number'
                    LEFT JOIN `{meta_t}` ad
                      ON ad.user_id = u.ID AND ad.meta_key = 'billing_address_1'
                    LEFT JOIN `{meta_t}` ci
                      ON ci.user_id = u.ID AND ci.meta_key = 'billing_city'
                    LEFT JOIN `{meta_t}` pc
                      ON pc.user_id = u.ID AND pc.meta_key = 'billing_postcode'
                    ORDER BY u.user_registered DESC
                    """


def _fetch_um_approved_rows(conn, prefix: str) -> list[dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(_um_approved_sql(f"{prefix}users", f"{prefix}usermeta"))
        return list(cur.fetchall() or [])


def list_um_approved_dealers() -> list[dict[str, Any]]:
    """
    Ultimate Member–approved dealers from the live shop (fallback: catalog clone).

    `usermeta.account_status = approved`. Excludes WordPress administrators.
    Shape matches `wholesale_request_row`.
    """
    import os

    prefix = os.environ.get("WP_TABLE_PREFIX", "wp_") or "wp_"
    rows: list[dict[str, Any]] = []
    try:
        from live_mysql import connect_live, live_configured

        if live_configured():
            conn = connect_live(read_only=True)
            try:
                rows = _fetch_um_approved_rows(conn, prefix)
            finally:
                conn.close()
    except Exception as exc:
        logger.warning("list_um_approved_dealers live failed: %s", exc)
        rows = []

    if not rows:
        db = get_catalog_db()
        if not db.configured():
            return []
        try:
            with db.connect() as conn:
                rows = _fetch_um_approved_rows(conn, prefix)
        except Exception as exc:
            logger.warning("list_um_approved_dealers clone failed: %s", exc)
            return []

    items: list[dict[str, Any]] = []
    for row in rows:
        caps = _parse_capabilities(row.get("caps"))
        if "administrator" in caps:
            continue
        wp_id = int(row["ID"])
        email = _normalize_email(row.get("user_email") or "")
        first = (row.get("first_name") or "").strip()
        last = (row.get("last_name") or "").strip()
        display = (row.get("display_name") or "").strip() or f"{first} {last}".strip()
        name = display or (row.get("user_login") or (email.split("@")[0] if email else f"user-{wp_id}"))
        company = (row.get("company") or "").strip()
        vat = (row.get("billing_vat") or row.get("vat_number") or "").strip()
        address = (row.get("address") or "").strip()
        city = (row.get("city") or "").strip()
        postal = (row.get("postcode") or "").strip()
        company_address = ", ".join(p for p in (address, city, postal) if p)
        created = row.get("user_registered")
        created_iso = created.isoformat() if hasattr(created, "isoformat") else str(created or "")
        items.append(
            {
                "id": f"wp-{wp_id}",
                "wp_id": wp_id,
                "name": name,
                "email": email,
                "phone": (row.get("phone") or "").strip(),
                "businessName": company,
                "vatNumber": vat,
                "companyAddress": company_address,
                "businessType": "",
                "accountType": "b2b",
                "wholesaleStatus": "approved",
                "isWholesale": True,
                "dealerTier": "bronze",
                "rejectionReason": None,
                "created_at": created_iso,
                "approvedAt": created_iso,
                "source": "website",
            }
        )
    return items


def wp_profile_to_app_user(profile: dict[str, Any], *, hashed_password: str) -> dict[str, Any]:
    """Build an app `users` row from a verified WordPress profile."""
    is_b2b = bool(profile.get("is_wholesale_role") or profile.get("businessName") or profile.get("vatNumber"))
    return {
        "id": str(uuid.uuid5(uuid.NAMESPACE_URL, f"wp-user:{profile['wp_id']}")),
        "email": profile["email"],
        "name": profile.get("name") or profile["email"].split("@")[0],
        "hashed_password": hashed_password,
        "role": "customer",
        "phone": profile.get("phone") or "",
        "address": profile.get("address") or "",
        "city": profile.get("city") or "",
        "postal_code": profile.get("postal_code") or "",
        "isWholesale": False,
        "wholesaleStatus": "pending" if is_b2b else None,
        "accountType": "b2b" if is_b2b else "b2c",
        "businessName": profile.get("businessName") or "",
        "vatNumber": profile.get("vatNumber") or "",
        "companyAddress": "",
        "businessType": "",
        "dealerTier": "bronze",
    }
