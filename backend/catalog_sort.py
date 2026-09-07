"""Catalog price sort: mobile parts high→low, accessories low→high."""
from __future__ import annotations

import re
from typing import Optional

PHONE_PARTS_CATEGORY = "Phone Parts"
ACCESSORIES_CATEGORY = "Accessories"

# Sellable glass/covers on model pages — sort with accessories, not repair parts.
_GLASS_COVER_LEAVES = frozenset(
    {
        "full glue glass",
        "privacy glass",
        "normal glass",
        "camera lens 3-in-1",
        "camera lens complete",
        "curved full glue glass",
        "smart watch glass",
        "silicon soft jelly",
        "antishock cover",
        "flip cover",
        "ring cover",
        "magsafe cover",
        "design cover",
        "cases & glass",
    }
)

# Repair hardware — always parts-first on model pages.
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
        "repair tools",
    }
)

_REPAIR_TITLE_RE = re.compile(
    r"\b("
    r"sim\s*tray|sim\s*reader|sim\s*card\s*(?:tray|reader)|"
    r"lcd|oled|incell|tft|display|screen\s*assembly|touch\s*screen|"
    r"battery(?!\s*cover)|"
    r"charging\s*port|charge\s*flex|usb\s*flex|dock\s*flex|"
    r"fingerprint\s*flex|finger\s*flex|power\s*flex|volume\s*flex|"
    r"side\s*button|main\s*flex|motherboard\s*flex|"
    r"vibrator|antenna\s*flex|earpiece|buzzer|"
    r"front\s*camera|rear\s*camera|back\s*glass|housing|middle\s*frame"
    r")\b",
    re.I,
)

_GLASS_COVER_TITLE_RE = re.compile(
    r"soft\s*jelly|magsafe|antishock|flip\s*cover|ring\s*cover|design\s*cover|"
    r"tempered\s*glass|privacy\s*glass|full\s*glue|curved\s*full\s*glue|"
    r"normal\s*glass|smart\s*watch\s*glass",
    re.I,
)


def product_price(product: dict) -> float:
    return float(product.get("retailPrice") or product.get("regularPrice") or product.get("price") or 0)


def _leaf(product: dict) -> str:
    return (product.get("leaf_category") or product.get("part_type") or "").strip().lower()


def is_glass_cover_product(product: dict) -> bool:
    leaf = _leaf(product)
    if leaf in _GLASS_COVER_LEAVES:
        return True
    title = product.get("title") or ""
    if title and _GLASS_COVER_TITLE_RE.search(title):
        return True
    try:
        from category_groups import is_model_glass_cover_product

        return is_model_glass_cover_product(product)
    except Exception:
        return False


def is_phone_parts_product(product: dict) -> bool:
    """
    True for repair hardware (LCD, battery, SIM tray, flex, …).
    Glass/covers/cases sort as accessories on model pages.
    """
    if is_glass_cover_product(product):
        return False

    leaf = _leaf(product)
    if leaf in _REPAIR_PART_LEAVES:
        return True

    title = product.get("title") or ""
    if title and _REPAIR_TITLE_RE.search(title):
        return True

    if (product.get("category") or "").strip() == PHONE_PARTS_CATEGORY:
        return True

    # Classify sometimes leaves part_type on repair parts under other categories
    if leaf and (product.get("category") or "").strip() not in {
        ACCESSORIES_CATEGORY,
        "Hoco",
        "Smartwatches",
        "Cards",
        "Smartphones",
    }:
        return True
    return False


def is_accessories_list_context(
    *,
    category: Optional[str] = None,
    category_group: Optional[str] = None,
    leaf_category: Optional[str] = None,
) -> bool:
    if category == ACCESSORIES_CATEGORY:
        return True
    if category == PHONE_PARTS_CATEGORY:
        return False
    if category_group or leaf_category:
        return True
    return False


def is_model_list_context(*, model: Optional[str] = None, model_wc_id: Optional[int] = None) -> bool:
    return model_wc_id is not None or bool(model)


def sort_products(
    products: list[dict],
    *,
    category: Optional[str] = None,
    category_group: Optional[str] = None,
    leaf_category: Optional[str] = None,
    model: Optional[str] = None,
    model_wc_id: Optional[int] = None,
) -> list[dict]:
    if not products:
        return products

    if is_model_list_context(model=model, model_wc_id=model_wc_id):
        parts = sorted(
            [p for p in products if is_phone_parts_product(p)],
            key=product_price,
            reverse=True,
        )
        accessories = sorted(
            [p for p in products if not is_phone_parts_product(p)],
            key=product_price,
            reverse=False,
        )
        return parts + accessories

    if is_accessories_list_context(
        category=category,
        category_group=category_group,
        leaf_category=leaf_category,
    ):
        return sorted(products, key=product_price, reverse=False)

    return sorted(products, key=product_price, reverse=True)


def wc_price_order(
    *,
    category: Optional[str] = None,
    category_group: Optional[str] = None,
    leaf_category: Optional[str] = None,
    model: Optional[str] = None,
    model_wc_id: Optional[int] = None,
    best_seller: Optional[bool] = None,
    new_arrival: Optional[bool] = None,
) -> tuple[str, str] | None:
    """WooCommerce orderby hint — None because price order returns 401 on read-only keys."""
    return None
