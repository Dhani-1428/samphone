"""In-memory store for local development (no MongoDB required)."""
import re
import uuid
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from typing import Optional

from stock import apply_stock_quantity, normalize_stock, validate_purchase_lines
from order_tracking import attach_tracking_fields, enrich_order
from localization import normalize_language, tr
from seed_data import PRODUCTS, MODELS
from category_groups import filter_by_group, filter_by_leaf, resolve_group_title
from model_match import filter_by_model

from wholesale import (
    default_wholesale_user_fields,
    enrich_product_pricing,
    user_public_wholesale,
    wholesale_request_row,
)

_products = [enrich_product_pricing(normalize_stock(dict(p))) for p in PRODUCTS]


def _ensure_promo_flags() -> None:
    """Guarantee home carousels always have best_seller / new_arrival products."""
    if not _products:
        return
    best_count = sum(1 for p in _products if p.get("best_seller"))
    new_count = sum(1 for p in _products if p.get("new_arrival"))
    if best_count >= 12 and new_count >= 12:
        return
    import random

    random.seed(42)
    pool = list(_products)
    random.shuffle(pool)
    if best_count < 12:
        for p in pool[:24]:
            p["best_seller"] = True
    if new_count < 12:
        rest = [p for p in pool if not p.get("new_arrival")]
        random.shuffle(rest)
        for p in rest[:24]:
            p["new_arrival"] = True


_ensure_promo_flags()
_users: dict[str, dict] = {}
_orders: list[dict] = []
_stock_notifications: list[dict] = []
_push_tokens: dict[str, dict] = {}  # token -> {user_id, platform}
_saved_carts: dict[str, dict] = {}
_notifications: list[dict] = []
_user_discounts: list[dict] = []
_meta: dict = {}


def _match_regex(value: str, pattern: str) -> bool:
    return bool(re.search(pattern, value or "", re.I))


def filter_products(
    q: Optional[str] = None,
    category: Optional[str] = None,
    brand: Optional[str] = None,
    subcategory: Optional[str] = None,
    model: Optional[str] = None,
    model_wc_id: Optional[int] = None,
    leaf_category: Optional[str] = None,
    category_group: Optional[str] = None,
    best_seller: Optional[bool] = None,
    new_arrival: Optional[bool] = None,
    limit: int = 15000,
    offset: int = 0,
    user: Optional[dict] = None,
) -> list[dict]:
    out = _products
    if category:
        if category == "Cards":
            from category_groups import is_cards_product

            out = [p for p in out if is_cards_product(p)]
        else:
            out = [p for p in out if p.get("category") == category]
    if brand:
        out = [p for p in out if p.get("brand") == brand]
    if subcategory:
        out = [p for p in out if p.get("subcategory") == subcategory]
    if model_wc_id is not None or model:
        out = filter_by_model(out, brand, model, model_wc_id)
    if leaf_category:
        out = filter_by_leaf(out, leaf_category)
    if category_group:
        from category_groups import filter_by_group, normalize_group_title

        out = filter_by_group(out, normalize_group_title(category_group) or category_group)
    if best_seller is not None:
        out = [p for p in out if bool(p.get("best_seller")) == best_seller]
    if new_arrival is not None:
        out = [p for p in out if bool(p.get("new_arrival")) == new_arrival]
    if q:
        group_title = resolve_group_title(q)
        if group_title:
            out = filter_by_group(out, group_title)
        else:
            out = [
                p
                for p in out
                if any(
                    _match_regex(str(p.get(f) or ""), q)
                    for f in ("title", "brand", "category", "subcategory", "model", "sku", "leaf_category", "part_type")
                )
            ]
    from catalog_sort import sort_products
    from wholesale import sanitize_products

    out = sort_products(
        out,
        category=category,
        category_group=category_group,
        leaf_category=leaf_category,
        model=model,
        model_wc_id=model_wc_id,
    )

    return sanitize_products(out[offset : offset + limit], user)


def filter_products_page(
    *,
    q: Optional[str] = None,
    category: Optional[str] = None,
    brand: Optional[str] = None,
    subcategory: Optional[str] = None,
    model: Optional[str] = None,
    model_wc_id: Optional[int] = None,
    leaf_category: Optional[str] = None,
    category_group: Optional[str] = None,
    best_seller: Optional[bool] = None,
    new_arrival: Optional[bool] = None,
    limit: int = 24,
    offset: int = 0,
    user: Optional[dict] = None,
) -> dict:
    from catalog_pagination import clamp_page, product_page
    from catalog_sort import sort_products
    from category_groups import filter_by_group, normalize_group_title
    from wholesale import sanitize_products

    lim, off = clamp_page(limit, offset)
    out = _products
    if category:
        if category == "Cards":
            from category_groups import is_cards_product

            out = [p for p in out if is_cards_product(p)]
        else:
            out = [p for p in out if p.get("category") == category]
    if brand and not q:
        out = [p for p in out if (p.get("brand") or "").lower() == (brand or "").lower()]
    if subcategory and not q:
        out = [p for p in out if p.get("subcategory") == subcategory]
    if model_wc_id is not None or model:
        out = filter_by_model(out, brand, model, model_wc_id)
    if leaf_category:
        out = filter_by_leaf(out, leaf_category)
    if category_group:
        out = filter_by_group(out, normalize_group_title(category_group) or category_group)
    if best_seller is not None:
        out = [p for p in out if bool(p.get("best_seller")) == best_seller]
    if new_arrival is not None:
        out = [p for p in out if bool(p.get("new_arrival")) == new_arrival]
    if q:
        group_title = resolve_group_title(q)
        if group_title:
            out = filter_by_group(out, group_title)
        else:
            from weighted_search import build_search_terms, product_matches_any, score_product_text

            built = build_search_terms(q, extra_keywords=[brand, category, subcategory])
            scored: list[tuple[int, dict]] = []
            for p in out:
                cats = [p.get("category") or "", p.get("subcategory") or "", p.get("leaf_category") or ""]
                tags = p.get("tags") or []
                if isinstance(tags, list):
                    tag_names = [str(t.get("name") if isinstance(t, dict) else t) for t in tags]
                else:
                    tag_names = [str(tags)]
                attrs = p.get("attributes") or []
                if isinstance(attrs, list):
                    attr_names = [
                        str(a.get("name") if isinstance(a, dict) else a) for a in attrs
                    ]
                elif isinstance(attrs, dict):
                    attr_names = [str(v) for v in attrs.values()]
                else:
                    attr_names = [str(attrs)]
                if not product_matches_any(
                    title=str(p.get("title") or ""),
                    sku=str(p.get("sku") or ""),
                    categories=cats,
                    brand=str(p.get("brand") or ""),
                    tags=tag_names,
                    short_description=str(p.get("short_description") or ""),
                    description=str(p.get("description") or ""),
                    attributes=attr_names + [str(p.get("part_type") or ""), str(p.get("model") or "")],
                    expanded=built["expanded"],
                    required_tokens=built.get("required_tokens") or [],
                ):
                    continue
                sc = score_product_text(
                    title=str(p.get("title") or ""),
                    sku=str(p.get("sku") or ""),
                    categories=cats,
                    brand=str(p.get("brand") or ""),
                    tags=tag_names,
                    short_description=str(p.get("short_description") or ""),
                    description=str(p.get("description") or ""),
                    attributes=attr_names + [str(p.get("part_type") or ""), str(p.get("model") or "")],
                    phrase=built["phrase"],
                    tokens=built["tokens"],
                    expanded=built["expanded"],
                    score_keywords=built.get("score_keywords"),
                )
                scored.append((sc, p))
            scored.sort(key=lambda x: (-x[0], str(x[1].get("title") or "")))
            out = [p for _, p in scored]

    out = sort_products(
        out,
        category=category,
        category_group=category_group,
        leaf_category=leaf_category,
        model=model,
        model_wc_id=model_wc_id,
    ) if not q else out
    from product_variants import collapse_color_variant_products

    out = collapse_color_variant_products(out)
    total = len(out)
    page = sanitize_products(out[off : off + lim], user)
    return product_page(page, total, limit=lim, offset=off)


def list_categories() -> list[dict]:
    counts: dict[tuple[str, str], int] = {}
    for p in _products:
        name = str(p.get("category") or p.get("leaf_category") or "").strip()
        if not name:
            continue
        slug = name.lower().replace(" ", "-")
        key = (name, slug)
        counts[key] = counts.get(key, 0) + 1
    items = []
    for i, ((name, slug), count) in enumerate(sorted(counts.items(), key=lambda kv: kv[0][0].lower()), start=1):
        items.append({"id": i, "wc_id": i, "name": name, "slug": slug, "parent": 0, "count": count})
    return items


def list_brands() -> list[dict]:
    counts: dict[str, int] = {}
    for p in _products:
        brand = str(p.get("brand") or "").strip()
        if not brand:
            continue
        counts[brand] = counts.get(brand, 0) + 1
    return [
        {"name": name, "slug": name.lower().replace(" ", "-"), "count": count}
        for name, count in sorted(counts.items(), key=lambda kv: kv[0].lower())
    ]


def related_products(product_id: str, *, limit: int = 12, user: Optional[dict] = None) -> list[dict]:
    src = _get_product_raw(product_id)
    if not src:
        return []
    brand = src.get("brand")
    category = src.get("category")
    scored: list[tuple[int, dict]] = []
    for p in _products:
        if p.get("id") == product_id:
            continue
        score = 0
        if brand and p.get("brand") == brand:
            score += 2
        if category and p.get("category") == category:
            score += 1
        if p.get("model") and p.get("model") == src.get("model"):
            score += 3
        if score:
            scored.append((score, p))
    scored.sort(key=lambda x: -x[0])
    from wholesale import sanitize_products

    return sanitize_products([p for _, p in scored[: max(1, min(limit, 24))]], user)


def home_rails(*, part: str = "all", limit: int = 8, user: Optional[dict] = None) -> dict:
    part_key = (part or "all").strip().lower()
    if part_key not in {"all", "priority", "sections"}:
        part_key = "all"
    lim = max(1, min(int(limit or 8), 24))
    payload: dict = {"part": part_key, "limit": lim, "best": [], "fresh": [], "sections": []}
    if part_key in {"all", "priority"}:
        payload["best"] = filter_products(best_seller=True, limit=lim, offset=0, user=user)
        payload["fresh"] = filter_products(new_arrival=True, limit=lim, offset=0, user=user)
    if part_key in {"all", "sections"}:
        sections = []
        for key, title, group in (
            ("chargers", "Chargers", "Chargers"),
            ("cables", "Cables", "Cables"),
            ("headphones", "Headphones", "Headphones"),
            ("powerbanks", "Powerbanks", "Powerbanks"),
            ("speakers", "Speakers", "Speakers"),
        ):
            sections.append(
                {
                    "key": key,
                    "title": title,
                    "category_group": group,
                    "items": filter_products(category_group=group, limit=lim, offset=0, user=user),
                }
            )
        payload["sections"] = sections
    return payload


def _get_product_raw(product_id: str) -> Optional[dict]:
    for p in _products:
        if p.get("id") == product_id:
            return p
    return None


def get_product(product_id: str, user: Optional[dict] = None) -> Optional[dict]:
    product = _get_product_raw(product_id)
    if not product:
        return None
    from wholesale import sanitize_product

    return sanitize_product(normalize_stock(product), user)


def _products_by_id() -> dict[str, dict]:
    return {p["id"]: p for p in _products if p.get("id")}


def decrement_stock(lines: list[dict]) -> list[dict]:
    """Reduce stock for order lines. Raises ValueError if insufficient."""
    by_id = _products_by_id()
    validate_purchase_lines(by_id, lines)
    updated: list[dict] = []
    for line in lines:
        pid = str(line["product_id"])
        qty = int(line["quantity"])
        product = by_id[pid]
        apply_stock_quantity(product, int(product.get("stock_quantity") or 0) - qty)
        updated.append({"product_id": pid, "stock_quantity": product["stock_quantity"], "in_stock": product["in_stock"]})
    return updated


def update_product_stock(product_id: str, stock_quantity: int) -> Optional[dict]:
    product = _get_product_raw(product_id)
    if not product:
        return None
    apply_stock_quantity(product, stock_quantity)
    return dict(product)


def list_admin_products(q: Optional[str] = None, limit: int = 80, offset: int = 0) -> dict:
    out = _products
    if q:
        out = [
            p
            for p in out
            if any(
                _match_regex(str(p.get(f) or ""), q)
                for f in ("title", "brand", "sku", "id", "category")
            )
        ]
    total = len(out)
    page = out[offset : offset + limit]
    return {
        "total": total,
        "items": [
            {
                "id": p.get("id"),
                "title": p.get("title"),
                "brand": p.get("brand"),
                "sku": p.get("sku"),
                "price": p.get("price"),
                "image": p.get("image"),
                "stock_quantity": int(p.get("stock_quantity") or 0),
                "in_stock": bool(p.get("in_stock")),
            }
            for p in page
        ],
    }


from model_sort import model_rank


def brand_models(brand: str) -> list[dict]:
    brand_products = [p for p in _products if p.get("brand") == brand]
    items = []
    for m in MODELS:
        if m["brand"] != brand:
            continue
        row = dict(m)
        row["count"] = len(filter_by_model(brand_products, brand, m["name"], m["wc_id"]))
        items.append(row)
    items.sort(key=lambda m: (-model_rank(m["name"]), m["name"]))
    return items


def find_user(email: str) -> Optional[dict]:
    return _users.get(email.lower())


def insert_user(user: dict) -> None:
    for key, val in default_wholesale_user_fields().items():
        user.setdefault(key, val)
    _users[user["email"]] = user
    email = user.get("email") or "user"
    is_business = bool(
        user.get("businessName") or user.get("vatNumber") or user.get("accountType") == "b2b"
    )
    if is_business:
        who = (user.get("businessName") or user.get("name") or email or "Someone").strip()
        add_admin_notification(
            "wholesale_request",
            f"{who} applied for a business account ({email}) — review in Wholesale",
        )
        lang = normalize_language(user.get("language"))
        add_notification(
            user["id"],
            "wholesale_submitted",
            tr(lang, "notify.wholesale.submitted.title"),
            tr(lang, "notify.wholesale.submitted.body"),
        )
    else:
        add_admin_notification("user_signup", f"New public signup: {email}")


def update_user(email: str, updates: dict) -> Optional[dict]:
    user = _users.get(email.lower())
    if not user:
        return None
    user.update(updates)
    new_email = str(user.get("email") or email).strip().lower()
    if new_email != email.lower():
        _users.pop(email.lower(), None)
        user["email"] = new_email
        _users[new_email] = user
    else:
        _users[email.lower()] = user
    return user


def anonymize_user(email: str) -> Optional[dict]:
    user = _users.get(email.lower())
    if not user:
        return None
    uid = str(user.get("id") or "").strip()
    return update_user(
        email,
        {
            "email": f"deleted-{uid}@deleted.invalid",
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
        },
    )


def insert_order(order: dict) -> dict:
    decrement_stock(
        [{"product_id": i["product_id"], "quantity": i["quantity"]} for i in order.get("items", [])]
    )
    return insert_order_without_stock(order)


def insert_order_without_stock(order: dict) -> dict:
    o = deepcopy(attach_tracking_fields(order))
    _orders.append(o)
    return enrich_order(o)


def get_order(order_id: str, user_id: str) -> Optional[dict]:
    for o in _orders:
        if o.get("id") == order_id and o.get("user_id") == user_id:
            return enrich_order(o)
    return None


def update_order_status(order_id: str, user_id: str, status: str) -> Optional[dict]:
    new_status = (status or "").strip().lower()
    if not new_status:
        raise ValueError("status is required")
    for o in _orders:
        if o.get("id") == order_id and o.get("user_id") == user_id:
            o["status"] = new_status
            return enrich_order(o)
    return None


def list_orders(user_id: str) -> list[dict]:
    rows = [o for o in _orders if o.get("user_id") == user_id]
    rows.sort(key=lambda o: o.get("created_at", ""), reverse=True)
    return [enrich_order(o) for o in rows]


def _user_public(user: dict) -> dict:
    return user_public_wholesale(user)


def _lookup_user(user_id: str) -> Optional[dict]:
    for u in _users.values():
        if u.get("id") == user_id:
            return u
    return None


def _order_with_customer(order: dict) -> dict:
    enriched = enrich_order(order)
    user = _lookup_user(order.get("user_id", ""))
    enriched["customer_email"] = order.get("customer_email") or (user or {}).get("email", "")
    enriched["customer_name"] = order.get("customer_name") or (user or {}).get("name", "")
    return enriched


def list_all_orders(limit: int = 200) -> list[dict]:
    rows = sorted(_orders, key=lambda o: o.get("created_at", ""), reverse=True)
    return [_order_with_customer(o) for o in rows[:limit]]


def get_admin_order(order_id: str) -> Optional[dict]:
    for o in _orders:
        if o.get("id") == order_id:
            return _order_with_customer(o)
    return None


def list_users() -> list[dict]:
    users = [_user_public(u) for u in _users.values() if u.get("role") != "admin"]
    users.sort(key=lambda u: u.get("created_at", ""), reverse=True)
    return users


def search_users(q: str, limit: int = 40) -> list[dict]:
    needle = (q or "").strip().lower()
    users = []
    for u in _users.values():
        if u.get("role") == "admin":
            continue
        pub = _user_public(u)
        if needle:
            hay = " ".join(
                [
                    str(pub.get("email") or ""),
                    str(pub.get("name") or ""),
                    str(pub.get("phone") or ""),
                    str(pub.get("businessName") or ""),
                    str(pub.get("vatNumber") or ""),
                ]
            ).lower()
            if needle not in hay:
                continue
        acct = (pub.get("accountType") or "b2c").lower()
        pub["accountLabel"] = "business" if acct == "b2b" else "public"
        users.append(pub)
    users.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return users[:limit]


def list_user_discounts(user_id: str) -> list[dict]:
    rows = [deepcopy(d) for d in _user_discounts if d.get("user_id") == user_id]
    rows.sort(key=lambda d: d.get("created_at") or "", reverse=True)
    return rows


def list_active_user_discounts(user_id: str) -> list[dict]:
    from user_discounts import is_discount_active

    return [deepcopy(d) for d in _user_discounts if d.get("user_id") == user_id and is_discount_active(d)]


def get_user_discount(user_id: str, discount_id: str) -> Optional[dict]:
    for d in _user_discounts:
        if d.get("id") == discount_id and d.get("user_id") == user_id:
            return deepcopy(d)
    return None


def create_user_discount(user_id: str, data: dict, created_by: Optional[str] = None) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    starts = data.get("starts_at")
    if isinstance(starts, datetime):
        starts = starts.isoformat()
    expires = data.get("expires_at")
    if isinstance(expires, datetime):
        expires = expires.isoformat()
    row = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "discount_type": data["discount_type"],
        "discount_value": float(data["discount_value"]),
        "applies_to": data.get("applies_to") or "all",
        "target_ids": data.get("target_ids"),
        "reason": data.get("reason"),
        "is_active": bool(data.get("is_active", True)),
        "starts_at": starts or now,
        "expires_at": expires,
        "created_by": created_by,
        "created_at": now,
        "updated_at": now,
    }
    _user_discounts.append(row)
    return deepcopy(row)


def update_user_discount(user_id: str, discount_id: str, data: dict) -> Optional[dict]:
    for i, d in enumerate(_user_discounts):
        if d.get("id") != discount_id or d.get("user_id") != user_id:
            continue
        updated = dict(d)
        for key in (
            "discount_type",
            "discount_value",
            "applies_to",
            "target_ids",
            "reason",
            "is_active",
            "starts_at",
            "expires_at",
        ):
            if key in data:
                val = data[key]
                if isinstance(val, datetime):
                    val = val.isoformat()
                updated[key] = val
        updated["updated_at"] = datetime.now(timezone.utc).isoformat()
        _user_discounts[i] = updated
        return deepcopy(updated)
    return None


def delete_user_discount(user_id: str, discount_id: str) -> bool:
    for i, d in enumerate(_user_discounts):
        if d.get("id") == discount_id and d.get("user_id") == user_id:
            _user_discounts.pop(i)
            return True
    return False


def admin_stats() -> dict:
    revenue = sum(float(o.get("subtotal") or 0) for o in _orders)
    low_stock = sum(1 for p in _products if int(p.get("stock_quantity") or 0) <= 5)
    out_of_stock = sum(1 for p in _products if not p.get("in_stock"))
    customers = sum(1 for u in _users.values() if u.get("role") != "admin")
    return {
        "total_orders": len(_orders),
        "total_revenue": round(revenue, 2),
        "total_customers": customers,
        "total_products": len(_products),
        "low_stock": low_stock,
        "out_of_stock": out_of_stock,
    }


def upsert_stock_notification(product_id: str, email: str) -> None:
    for n in _stock_notifications:
        if n["product_id"] == product_id and n["email"] == email:
            n["created_at"] = datetime.now(timezone.utc).isoformat()
            return
    _stock_notifications.append(
        {"product_id": product_id, "email": email, "created_at": datetime.now(timezone.utc).isoformat()}
    )


def list_stock_notifications(email: Optional[str] = None) -> list[dict]:
    rows = _stock_notifications
    if email:
        needle = email.strip().lower()
        rows = [n for n in rows if n.get("email") == needle]
    return [deepcopy(n) for n in rows]


def delete_stock_notification(product_id: str, email: str) -> bool:
    needle = email.strip().lower()
    for i, n in enumerate(_stock_notifications):
        if n.get("product_id") == product_id and n.get("email") == needle:
            _stock_notifications.pop(i)
            return True
    return False


def get_meta(key: str) -> Optional[str]:
    val = _meta.get(key)
    if val is None:
        return None
    return val if isinstance(val, str) else str(val)


def set_meta(key: str, value: str) -> None:
    _meta[key] = value


def seed_meta(version: str) -> bool:
    if _meta.get("version") == version:
        return False
    _meta["version"] = version
    return True


def seed_test_user(email: str, hashed_password: str, name: str = "Test User") -> None:
    if email.lower() not in _users:
        _users[email.lower()] = {
            "id": str(uuid.uuid4()),
            "email": email.lower(),
            "name": name,
            "role": "customer",
            "hashed_password": hashed_password,
            "created_at": datetime.now(timezone.utc).isoformat(),
            **default_wholesale_user_fields(),
        }


def add_notification(user_id: str, kind: str, title: str, message: str) -> dict:
    note = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "kind": kind,
        "title": title,
        "message": message,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _notifications.insert(0, note)
    return note


def add_admin_notification(kind: str, message: str) -> dict:
    return add_notification("admin", kind, "Admin alert", message)


def upsert_push_token(user_id: str, token: str, platform: str = "") -> None:
    tok = (token or "").strip()
    if not tok or not user_id:
        return
    _push_tokens[tok] = {"user_id": user_id, "platform": (platform or "")[:32]}


def delete_push_token(token: str, user_id: Optional[str] = None) -> bool:
    tok = (token or "").strip()
    if not tok or tok not in _push_tokens:
        return False
    if user_id and _push_tokens[tok].get("user_id") != user_id:
        return False
    del _push_tokens[tok]
    return True


def delete_push_tokens_for_user(user_id: str) -> int:
    uid = (user_id or "").strip()
    if not uid:
        return 0
    stale = [t for t, meta in _push_tokens.items() if meta.get("user_id") == uid]
    for tok in stale:
        _push_tokens.pop(tok, None)
    return len(stale)


def list_push_tokens(user_id: str) -> list[str]:
    return [t for t, meta in _push_tokens.items() if meta.get("user_id") == user_id]


def list_push_tokens_for_users(user_ids: list[str]) -> dict[str, list[str]]:
    wanted = set(user_ids)
    out: dict[str, list[str]] = {}
    for t, meta in _push_tokens.items():
        uid = meta.get("user_id")
        if uid in wanted:
            out.setdefault(uid, []).append(t)
    return out


def list_customer_user_ids() -> list[str]:
    return [u["id"] for u in _users.values() if u.get("role") != "admin"]


def list_notifications(user_id: str, limit: int = 50) -> list[dict]:
    return [n for n in _notifications if n.get("user_id") == user_id][:limit]


def mark_notification_read(note_id: str, user_id: str) -> bool:
    for n in _notifications:
        if n.get("id") == note_id and n.get("user_id") == user_id:
            n["read"] = True
            return True
    return False


def list_wholesale_requests(status: Optional[str] = None) -> list[dict]:
    rows = [
        wholesale_request_row(u)
        for u in _users.values()
        if u.get("role") != "admin"
        and (
            u.get("businessName")
            or u.get("vatNumber")
            or u.get("accountType") == "b2b"
            or u.get("wholesaleStatus") in {"pending", "approved", "rejected", "suspended"}
        )
    ]
    if status:
        rows = [r for r in rows if r.get("wholesaleStatus") == status]
    rows.sort(key=lambda r: r.get("created_at", ""), reverse=True)
    return rows


def approve_wholesale(user_id: str, admin_id: str, dealer_tier: str = "bronze") -> Optional[dict]:
    from wholesale import normalize_dealer_tier

    user = _lookup_user(user_id)
    if not user or user.get("role") == "admin":
        return None
    now = datetime.now(timezone.utc).isoformat()
    user["isWholesale"] = True
    user["wholesaleStatus"] = "approved"
    user["accountType"] = "b2b"
    user["dealerTier"] = normalize_dealer_tier(dealer_tier)
    user["approvedAt"] = now
    user["approvedBy"] = admin_id
    user["rejectionReason"] = None
    lang = normalize_language(user.get("language"))
    add_notification(
        user_id,
        "wholesale_approved",
        tr(lang, "notify.wholesale.approved.title"),
        tr(lang, "notify.wholesale.approved.body", tier=user["dealerTier"]),
    )
    return wholesale_request_row(user)


def reject_wholesale(user_id: str, admin_id: str, reason: str) -> Optional[dict]:
    user = _lookup_user(user_id)
    if not user or user.get("role") == "admin":
        return None
    user["isWholesale"] = False
    user["wholesaleStatus"] = "rejected"
    user["rejectionReason"] = reason.strip() or "Application rejected."
    user["approvedAt"] = None
    user["approvedBy"] = admin_id
    lang = normalize_language(user.get("language"))
    add_notification(
        user_id,
        "wholesale_rejected",
        tr(lang, "notify.wholesale.rejected.title"),
        f"Your wholesale application has been rejected.\n\nReason:\n{user['rejectionReason']}",
    )
    return wholesale_request_row(user)


def suspend_wholesale(user_id: str, admin_id: str) -> Optional[dict]:
    user = _lookup_user(user_id)
    if not user or user.get("role") == "admin":
        return None
    user["isWholesale"] = False
    user["wholesaleStatus"] = "suspended"
    user["approvedBy"] = admin_id
    lang = normalize_language(user.get("language"))
    add_notification(
        user_id,
        "wholesale_suspended",
        tr(lang, "notify.wholesale.suspended.title"),
        tr(lang, "notify.wholesale.suspended.body"),
    )
    return wholesale_request_row(user)


def find_user_by_id(user_id: str) -> Optional[dict]:
    return _lookup_user(user_id)


def _cart_items_signature(items: list[dict]) -> str:
    parts = []
    for item in items or []:
        parts.append(f"{item.get('product_id')}:{item.get('quantity')}")
    return "|".join(sorted(parts))


def upsert_saved_cart(user_id: str, email: str, items: list[dict], subtotal: float) -> None:
    now = datetime.now(timezone.utc).isoformat()
    existing = _saved_carts.get(user_id)
    if not items:
        if existing:
            existing["items"] = []
            existing["subtotal"] = 0.0
            existing["updated_at"] = now
        return
    reset_reminder = (
        existing is None
        or _cart_items_signature(existing.get("items") or []) != _cart_items_signature(items)
    )
    _saved_carts[user_id] = {
        "user_id": user_id,
        "email": (email or existing.get("email") if existing else email or "").lower(),
        "items": items,
        "subtotal": float(subtotal or 0),
        "updated_at": now,
        "abandoned_email_sent_at": None if reset_reminder else existing.get("abandoned_email_sent_at"),
        "converted_at": existing.get("converted_at") if existing else None,
    }


def clear_saved_cart(user_id: str) -> None:
    _saved_carts.pop(user_id, None)


def mark_cart_converted(user_id: str, email: str = "") -> None:
    now = datetime.now(timezone.utc).isoformat()
    cart = _saved_carts.get(user_id)
    if cart:
        cart["converted_at"] = now
        cart["items"] = []
        cart["subtotal"] = 0.0
        return
    if email:
        for cart in _saved_carts.values():
            if cart.get("email", "").lower() == email.lower():
                cart["converted_at"] = now
                cart["items"] = []
                cart["subtotal"] = 0.0


def mark_cart_reminder_sent(user_id: str) -> None:
    cart = _saved_carts.get(user_id)
    if cart:
        cart["abandoned_email_sent_at"] = datetime.now(timezone.utc).isoformat()


def list_carts_due_for_reminder(hours: int) -> list[dict]:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    due: list[dict] = []
    for cart in _saved_carts.values():
        if cart.get("converted_at"):
            continue
        if cart.get("abandoned_email_sent_at"):
            continue
        items = cart.get("items") or []
        if not items:
            continue
        updated = cart.get("updated_at") or ""
        try:
            updated_dt = datetime.fromisoformat(updated.replace("Z", "+00:00"))
            if updated_dt.tzinfo is None:
                updated_dt = updated_dt.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
        if updated_dt <= cutoff:
            due.append(dict(cart))
    return due


def seed_admin_user(email: str, hashed_password: str, name: str = "Admin") -> None:
    """Always refresh admin credentials in memory mode (dev)."""
    key = email.lower()
    existing = _users.get(key)
    _users[key] = {
        "id": existing.get("id", "admin-user") if existing else "admin-user",
        "email": key,
        "name": name,
        "role": "admin",
        "hashed_password": hashed_password,
        "created_at": (existing or {}).get("created_at") or datetime.now(timezone.utc).isoformat(),
    }
