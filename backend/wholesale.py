"""Wholesale access control — pricing enrichment and API response sanitization."""
from __future__ import annotations

import hashlib
import re
from copy import deepcopy
from typing import Any, Optional

from user_discounts import apply_user_discounts_to_product
from localization import normalize_language

WHOLESALE_SENSITIVE_FIELDS = (
    "wholesalePrice",
    "wholesaleDiscount",
    "minimumWholesaleQuantity",
    "dealerOnly",
    "dealerTier",
    "dealerOnlyOffers",
    "apiPrice",
)

DEALER_TIERS = {
    "retail": 0.0,
    "bronze": 0.10,
    "standard": 0.12,
    "silver": 0.15,
    "gold": 0.18,
    "platinum": 0.22,
}

PRICING_TIERS = [
    {"id": "bronze", "name": "Bronze B2B", "discountPercent": 10, "minOrderValue": 0},
    {"id": "standard", "name": "Standard B2B", "discountPercent": 12, "minOrderValue": 0},
    {"id": "silver", "name": "Silver B2B", "discountPercent": 15, "minOrderValue": 0},
    {"id": "gold", "name": "Gold B2B", "discountPercent": 18, "minOrderValue": 0},
    {"id": "platinum", "name": "Platinum B2B", "discountPercent": 22, "minOrderValue": 0},
]

# Public accessory retail bands for personal (B2C) accounts only.
# Business (B2B) keeps the live API / wholesale price from the DB.
# Ranges are [lo, hi) except: first band includes hi; last band includes hi.
PUBLIC_PRICE_BANDS: tuple[tuple[float, float, float], ...] = (
    (0.00, 1.90, 4.90),   # 0–1.90 inclusive (covers 0.99–1.90 → 4.90)
    (1.90, 2.50, 6.90),   # >1.90 … <2.50
    (2.50, 3.00, 7.90),
    (3.00, 4.00, 8.90),
    (4.00, 5.00, 9.90),
    (5.00, 7.00, 12.90),
    (7.00, 8.00, 14.90),
    (8.00, 9.00, 17.50),
    (9.00, 10.00, 19.90),
    (10.00, 12.00, 22.50),
    (12.00, 15.00, 24.90),
    (15.00, 18.00, 29.90),
    (18.00, 23.00, 34.90),
    (23.00, 30.00, 44.90),
    (30.00, 35.00, 49.90),
    (35.00, 40.00, 59.90),
    (40.00, 45.00, 69.90),
    (45.00, 50.00, 79.90),
    (50.00, 60.00, 89.90),
    (60.00, 70.00, 99.90),
    (70.00, 80.00, 119.90),
    (80.00, 90.00, 129.90),
)

# Public bands for phone parts on mobile brand → model pages (personal accounts).
# Accessories / glass / tools keep PUBLIC_PRICE_BANDS above.
PARTS_PUBLIC_PRICE_BANDS: tuple[tuple[float, float, float], ...] = (
    (0.00, 2.50, 4.90),
    (2.50, 3.50, 5.90),
    (3.50, 5.00, 9.90),
    (5.00, 8.00, 14.90),
    (8.00, 10.00, 19.90),
    (10.00, 13.00, 22.50),
    (13.00, 15.00, 24.90),
    (15.00, 20.00, 29.90),
    (20.00, 23.00, 34.90),
    (23.00, 27.00, 39.90),
    (27.00, 30.00, 44.90),
    (30.00, 35.00, 49.90),
    (35.00, 40.00, 54.90),
)


def list_pricing_tiers() -> list[dict]:
    return list(PRICING_TIERS)


# True repair hardware — public keeps raw B2B/API price (no accessory bands).
# Repairing Tools are sellable accessories and use public bands (not listed here).
_REPAIR_PART_LEAVES = frozenset(
    {
        "screen / lcd assembly",
        "battery",
        "back glass / cover",
        "housing / frame",
        "charging port flex",
        "front camera",
        "rear camera",
        "camera lens",
        "speaker / earpiece",
        "fingerprint flex",
        "side buttons flex",
        "main flex",
        "vibrator motor",
        "sim tray",
        "sim reader",
        "antenna flex",
        "other part",
    }
)

_PUBLIC_BAND_CATEGORIES = frozenset(
    {"Accessories", "Hoco", "Smartwatches", "Cards", "Repair Tools", "Repairing Tools"}
)


def is_accessory_for_public_pricing(product: Optional[dict]) -> bool:
    """
    Accessories, repairing tools, and model-page glass/covers/cases get public price bands.
    Phone repair parts keep the raw/API price for everyone.
    """
    if not product:
        return True

    cat = (product.get("category") or "").strip()
    if cat in _PUBLIC_BAND_CATEGORIES:
        return True
    if cat == "Smartphones":
        return False

    leaf = (product.get("leaf_category") or product.get("part_type") or "").strip()
    leaf_l = leaf.lower()

    # Screwdrivers, openers, kits — public bands even if leaf/category is mis-tagged.
    if leaf_l in {"repair tools", "repairing tools", "laptop tools"}:
        return True
    try:
        from category_groups import is_repairing_tools_product

        if is_repairing_tools_product(product):
            return True
    except Exception:
        pass

    # Soft Jelly / MagSafe / tempered glass etc. often classify as Phone Parts
    # but are sellable accessories and must use public bands (e.g. 0.99 → 4.90).
    try:
        from category_groups import MODEL_GLASS_COVER_LEAVES, is_model_glass_cover_product

        if leaf and any(leaf_l == x.strip().lower() for x in MODEL_GLASS_COVER_LEAVES):
            return True
        if is_model_glass_cover_product(product):
            return True
    except Exception:
        pass

    if leaf_l in _REPAIR_PART_LEAVES:
        return False

    if cat == "Phone Parts":
        return False

    # Any remaining part_type on a non-accessory category → treat as repair part.
    try:
        from catalog_sort import is_phone_parts_product

        return not is_phone_parts_product(product)
    except Exception:
        return True


def _map_price_through_bands(
    value: float,
    bands: tuple[tuple[float, float, float], ...],
) -> float:
    """Accessory-style: first value <= hi; middle lo <= value < hi; last lo <= value <= hi."""
    if value <= bands[0][1]:
        return round(bands[0][2], 2)
    last_idx = len(bands) - 1
    for i, (lo, hi, public) in enumerate(bands):
        if i == 0:
            continue
        if i == last_idx:
            if lo <= value <= hi:
                return round(public, 2)
        elif lo <= value < hi:
            return round(public, 2)
    return round(value, 2)


def _map_parts_price_through_bands(value: float) -> float:
    """Parts bands: each range is upper-inclusive (0–2.50, 2.50–3.50, …, 35–40)."""
    for _lo, hi, public in PARTS_PUBLIC_PRICE_BANDS:
        if value <= hi:
            return round(public, 2)
    return round(value, 2)


def is_model_part_for_public_pricing(product: Optional[dict]) -> bool:
    """True for phone repair parts shown on brand/model pages (not accessories/glass/tools)."""
    if not product or is_accessory_for_public_pricing(product):
        return False
    cat = (product.get("category") or "").strip()
    if cat == "Smartphones":
        return False
    leaf = (product.get("leaf_category") or product.get("part_type") or "").strip().lower()
    if leaf in _REPAIR_PART_LEAVES:
        return True
    if cat == "Phone Parts":
        return True
    try:
        from catalog_sort import is_phone_parts_product

        return bool(is_phone_parts_product(product))
    except Exception:
        return False


def map_public_retail_price(api_price: float, product: Optional[dict] = None) -> float:
    """Map cost into public retail. Business pricing never uses this path."""
    try:
        value = float(api_price)
    except (TypeError, ValueError):
        return 0.0
    if value <= 0:
        return 0.0
    if product is not None and is_model_part_for_public_pricing(product):
        return _map_parts_price_through_bands(value)
    if product is not None and not is_accessory_for_public_pricing(product):
        return round(value, 2)
    return _map_price_through_bands(value, PUBLIC_PRICE_BANDS)


def normalize_dealer_tier(tier: Optional[str]) -> str:
    key = (tier or "bronze").strip().lower()
    if key in DEALER_TIERS and key != "retail":
        return key
    return "bronze"


def default_wholesale_user_fields() -> dict[str, Any]:
    return {
        "isWholesale": False,
        "wholesaleStatus": "pending",
        "accountType": "b2c",
        "businessName": "",
        "vatNumber": "",
        "companyAddress": "",
        "businessType": "",
        "phone": "",
        "address": "",
        "city": "",
        "postal_code": "",
        "language": "en",
        "rejectionReason": None,
        "approvedAt": None,
        "approvedBy": None,
        "dealerTier": "bronze",
    }


_BLOCKED_WHOLESALE_STATUS = {
    "pending",
    "rejected",
    "denied",
    "blocked",
    "inactive",
    "suspended",
}


def is_business_account(user: Optional[dict]) -> bool:
    """True for wholesale/business signups (shop, samphone.pt, samphone.eu, or app). Personal stays B2C."""
    if not user:
        return False
    account = str(user.get("accountType") or user.get("account_type") or "").strip().lower()
    if account == "b2c":
        return bool(
            str(user.get("businessName") or user.get("business_name") or "").strip()
            or str(user.get("vatNumber") or user.get("vat_number") or "").strip()
        )
    if account == "b2b":
        return True
    return bool(
        str(user.get("businessName") or user.get("business_name") or "").strip()
        or str(user.get("vatNumber") or user.get("vat_number") or "").strip()
        or str(user.get("wholesaleStatus") or user.get("wholesale_status") or "").strip()
    )


def is_wholesale_approved(user: Optional[dict]) -> bool:
    """requireWholesaleApproval middleware helper."""
    if not user:
        return False
    if user.get("role") == "admin":
        return True
    status = str(user.get("wholesaleStatus") or "").strip().lower()
    if status in _BLOCKED_WHOLESALE_STATUS:
        return False
    if status == "approved":
        return True
    account = str(user.get("accountType") or "").strip().lower()
    return bool(user.get("isWholesale")) and account in {"b2b", ""}


def can_see_business_pricing(user: Optional[dict]) -> bool:
    """B2B prices only for approved business accounts. Personal (B2C) always sees public prices."""
    if not user:
        return False
    if user.get("role") == "admin":
        return True
    if not is_business_account(user):
        return False
    return is_wholesale_approved(user)


def _dealer_only_flag(product: dict) -> bool:
    if product.get("dealerOnly") is not None:
        return bool(product.get("dealerOnly"))
    pid = str(product.get("id") or "")
    digest = int(hashlib.md5(pid.encode()).hexdigest()[:8], 16)
    retail = float(product.get("retailPrice") or product.get("price") or 0)
    return digest % 12 == 0 or (product.get("category") == "Phone Parts" and retail >= 80)


def enrich_product_pricing(product: dict, dealer_tier: str = "standard") -> dict:
    p = dict(product)
    # Live catalog/API unit price (business source of truth).
    api_price = float(p.get("apiPrice") or p.get("price") or p.get("regularPrice") or p.get("retailPrice") or 0)
    # If price was already mapped to public retail, prefer an explicit api/wholesale field when present.
    existing_wholesale = p.get("wholesalePrice")
    if existing_wholesale is not None:
        try:
            api_price = float(existing_wholesale) or api_price
        except (TypeError, ValueError):
            pass
    discount_pct = float(p.get("wholesaleDiscount") or DEALER_TIERS.get(dealer_tier, 0.12) * 100)

    wholesale = existing_wholesale
    if wholesale is None:
        wholesale = api_price
    else:
        wholesale = float(wholesale)

    public_retail = map_public_retail_price(api_price, p)
    dealer_only = _dealer_only_flag({**p, "retailPrice": public_retail, "price": public_retail})

    p["apiPrice"] = round(api_price, 2)
    p["retailPrice"] = public_retail
    # Keep API price on `price` until sanitize_product chooses retail vs wholesale for the viewer.
    p["price"] = round(float(wholesale), 2)
    p["wholesalePrice"] = round(float(wholesale), 2)
    p["wholesaleDiscount"] = round(discount_pct, 1)
    p["minimumWholesaleQuantity"] = int(p.get("minimumWholesaleQuantity") or (5 if dealer_only else 1))
    p["dealerOnly"] = dealer_only
    p.setdefault("dealerTier", dealer_tier)
    return p


def sanitize_product(product: dict, user: Optional[dict]) -> dict:
    p = deepcopy(product)
    specs = p.get("specs")
    if isinstance(specs, dict):
        p["specs"] = {
            k: v
            for k, v in specs.items()
            if not re.search(r"country\s*of\s*origin|origem|made\s*in", str(k), re.I)
        }
    if can_see_business_pricing(user):
        # Approved business (or admin): expose API/wholesale price as the active price.
        wholesale = p.get("wholesalePrice")
        if wholesale is None:
            wholesale = p.get("b2b_price")
        if wholesale is None:
            wholesale = p.get("apiPrice")
        if wholesale is None:
            wholesale = p.get("price")
        try:
            wholesale_f = float(wholesale) if wholesale is not None else 0.0
        except (TypeError, ValueError):
            wholesale_f = 0.0
        if wholesale_f > 0:
            p["price"] = round(wholesale_f, 2)
            p["wholesalePrice"] = round(wholesale_f, 2)
            p["b2b_price"] = round(wholesale_f, 2)

        # Always keep a public retail figure so admin can toggle Public/Business.
        retail = p.get("retailPrice")
        if retail is None:
            retail = p.get("b2c_price")
        try:
            retail_f = float(retail) if retail is not None else 0.0
        except (TypeError, ValueError):
            retail_f = 0.0
        if retail_f <= 0 and wholesale_f > 0:
            if p.get("b2c_override") and p.get("b2c_price"):
                try:
                    retail_f = float(p["b2c_price"])
                except (TypeError, ValueError):
                    retail_f = map_public_retail_price(wholesale_f, p)
            else:
                retail_f = map_public_retail_price(wholesale_f, p)
        if retail_f > 0:
            p["retailPrice"] = round(retail_f, 2)
            p["b2c_price"] = round(retail_f, 2)

        p.pop("apiPrice", None)
        # Sale compare-at stays on regularPrice when higher than public; else mirror public.
        compare = p.get("compareAtPrice")
        try:
            compare_f = float(compare) if compare is not None else 0.0
        except (TypeError, ValueError):
            compare_f = 0.0
        if compare_f > retail_f > 0:
            p["regularPrice"] = round(compare_f, 2)
            p["on_sale"] = True
        else:
            p["regularPrice"] = round(retail_f or wholesale_f or 0.0, 2)
        if user and user.get("id"):
            apply_user_discounts_to_product(p, user.get("_active_discounts"))
        return p
    # Guest / personal / pending business: public retail only — never mix wholesale.
    cost = p.get("b2b_price")
    if cost is None:
        cost = p.get("wholesalePrice")
    if cost is None:
        cost = p.get("apiPrice")
    b2c_override = bool(p.get("b2c_override"))
    try:
        cost_f = float(cost) if cost is not None else 0.0
    except (TypeError, ValueError):
        cost_f = 0.0
    if cost_f > 0 and not b2c_override:
        retail = map_public_retail_price(cost_f, p)
    else:
        retail = float(p.get("retailPrice") or map_public_retail_price(float(p.get("price") or 0), p) or 0)
    for field in WHOLESALE_SENSITIVE_FIELDS:
        p.pop(field, None)
    p["retailPrice"] = round(retail, 2)
    p["price"] = p["retailPrice"]
    # Guests and personal accounts see public retail only. Wholesale stays stripped.
    p.pop("b2b_price", None)
    p.pop("b2c_override", None)
    p.pop("b2c_price", None)
    p.pop("price_hidden", None)
    if not user:
        p["regularPrice"] = float(p["price"])
        return p
    if user and user.get("id"):
        # Normalize then apply personal discounts for this viewer only.
        p["regularPrice"] = float(p["price"])
        apply_user_discounts_to_product(p, user.get("_active_discounts"))
    return p


def sanitize_products(products: list[dict], user: Optional[dict]) -> list[dict]:
    return [sanitize_product(p, user) for p in products]


def user_public_wholesale(user: dict) -> dict:
    base = {
        "id": user["id"],
        "email": user["email"],
        "name": user.get("name", ""),
        "role": user.get("role", "customer"),
        "created_at": user.get("created_at"),
        "notificationPrefs": user.get("notificationPrefs") or {},
    }
    for key, default in default_wholesale_user_fields().items():
        base[key] = user.get(key, default)
    base["language"] = normalize_language(base.get("language"))
    return base


def wholesale_request_row(user: dict) -> dict:
    return {
        "id": user["id"],
        "name": user.get("name", ""),
        "email": user.get("email", ""),
        "phone": user.get("phone", ""),
        "businessName": user.get("businessName", ""),
        "vatNumber": user.get("vatNumber", ""),
        "companyAddress": user.get("companyAddress", ""),
        "businessType": user.get("businessType", ""),
        "accountType": user.get("accountType", "b2c"),
        "wholesaleStatus": user.get("wholesaleStatus", "pending"),
        "isWholesale": bool(user.get("isWholesale")),
        "dealerTier": user.get("dealerTier", "bronze"),
        "rejectionReason": user.get("rejectionReason"),
        "created_at": user.get("created_at"),
        "approvedAt": user.get("approvedAt"),
        "source": user.get("source") or "app",
    }
