"""Match products to a phone model (parts by wc_id + accessories by title)."""
from __future__ import annotations

import re
from functools import lru_cache
from typing import Optional

from seed_data import MODELS

# Longer forms of the same base model (Pro vs base, Ultra vs base, etc.).
_MODEL_EXTENDERS = (
    "pro max",
    "pro plus",
    "pro+",
    "plus",
    "ultra",
    "mini",
    "pro",
    "max",
    "lite",
    "fe",
)


def _brand_model_names(brand: str) -> list[str]:
    return [m["name"] for m in MODELS if m.get("brand") == brand]


@lru_cache(maxsize=4096)
def model_aliases(model_name: str, brand: str) -> tuple[str, ...]:
    """Title search keys for a catalog model (full name + common short forms)."""
    if not model_name:
        return ()
    out: list[str] = []
    seen: set[str] = set()

    def add(value: str) -> None:
        v = re.sub(r"\s+", " ", (value or "").strip())
        if not v:
            return
        key = v.lower()
        if key in seen:
            return
        seen.add(key)
        out.append(v)

    name = model_name.strip()
    add(name)

    stripped = name
    prefixes = []
    if brand:
        prefixes.append(brand)
    prefixes.extend(
        (
            "Samsung",
            "Xiaomi",
            "Apple",
            "iPhone",
            "Huawei",
            "Honor",
            "Oppo",
            "Realme",
            "Vivo",
            "Motorola",
            "Moto",
            "OnePlus",
            "Alcatel",
            "TCL",
            "ZTE",
            "Nokia",
            "Google",
            "LG",
            "Lenovo",
        )
    )
    changed = True
    while changed:
        changed = False
        for pfx in prefixes:
            if pfx and stripped.lower().startswith(f"{pfx.lower()} "):
                stripped = stripped[len(pfx) :].strip()
                add(stripped)
                if brand:
                    add(f"{brand} {stripped}")
                changed = True
                break

    code = ""
    m = re.match(r"^(.+?)\s*\(([^)]+)\)\s*$", stripped)
    if m:
        stripped = m.group(1).strip()
        code = m.group(2).strip()
        add(stripped)
        add(f"{brand} {stripped}".strip() if brand else stripped)
        if code:
            add(code)

    if stripped.lower().startswith("galaxy "):
        add(stripped[7:].strip())

    if brand and not name.lower().startswith(brand.lower()):
        add(f"{brand} {name}".strip())

    out.sort(key=len, reverse=True)
    return tuple(out)


def resolve_model_name(brand: Optional[str], model: Optional[str], model_wc_id: Optional[int]) -> Optional[str]:
    if model:
        return model.strip()
    if model_wc_id is not None:
        for m in MODELS:
            if m.get("wc_id") == model_wc_id and (not brand or m.get("brand") == brand):
                return m.get("name")
    return None


def title_matches_model(title: str, model_name: str, brand: str) -> bool:
    if not title or not model_name:
        return False
    t = title.lower()
    matched = [alias for alias in model_aliases(model_name, brand) if alias.lower() in t]
    if not matched:
        return False
    best = max(matched, key=len)
    best_l = best.lower()
    # Avoid "iPhone 17 Pro" matching "iPhone 17 Pro Max", or "S24" matching "S24 Ultra".
    want_l = model_name.strip().lower()
    for other in _brand_model_names(brand):
        if other.strip().lower() == want_l:
            continue
        for alias in model_aliases(other, brand):
            if len(alias) > len(best) and alias.lower() in t:
                return False
    # Seed list may omit siblings — still reject base when title has Pro/Ultra/etc.
    extender_re = re.compile(
        re.escape(best_l) + r"(?:\s|-)*(" + "|".join(re.escape(s) for s in _MODEL_EXTENDERS) + r")\b"
    )
    if extender_re.search(t):
        return False
    # Reject glued suffixes: "Redmi 13" must not match "Redmi 13C".
    idx = 0
    while True:
        pos = t.find(best_l, idx)
        if pos < 0:
            break
        end = pos + len(best_l)
        if end < len(t) and t[end].isalnum():
            return False
        idx = end
    return True


def product_matches_model(
    product: dict,
    brand: Optional[str],
    model_name: Optional[str],
    model_wc_id: Optional[int] = None,
) -> bool:
    prod_wc = product.get("model_wc_id")
    try:
        prod_wc_int = int(prod_wc) if prod_wc is not None and prod_wc != "" else None
    except (TypeError, ValueError):
        prod_wc_int = None
    try:
        want_wc = int(model_wc_id) if model_wc_id is not None else None
    except (TypeError, ValueError):
        want_wc = None

    # Exact WC model category match — authoritative.
    if want_wc is not None and prod_wc_int == want_wc:
        return True
    # Tagged to a different model category → never show under this model.
    if want_wc is not None and prod_wc_int is not None and prod_wc_int != want_wc:
        return False

    prod_model = (product.get("model") or "").strip()
    want_model = (model_name or "").strip()
    # Assigned to another known model name for this brand → exclude.
    if want_model and prod_model and prod_model.lower() != want_model.lower():
        brand_key = brand or product.get("brand") or ""
        for other in _brand_model_names(brand_key):
            if other.lower() == want_model.lower():
                continue
            if other.lower() == prod_model.lower():
                return False

    if brand and product.get("brand") != brand:
        if not model_name or not title_matches_model(
            product.get("title") or "", model_name, brand or product.get("brand") or ""
        ):
            return False
    if want_model and prod_model.lower() == want_model.lower():
        return True
    if not model_name:
        return False
    if title_matches_model(product.get("title") or "", model_name, brand or product.get("brand") or ""):
        return True
    return False


def filter_by_model(
    products: list[dict],
    brand: Optional[str],
    model: Optional[str],
    model_wc_id: Optional[int],
) -> list[dict]:
    model_name = resolve_model_name(brand, model, model_wc_id)
    if model_name is None and model_wc_id is None:
        return products
    return [p for p in products if product_matches_model(p, brand, model_name, model_wc_id)]
