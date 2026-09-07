"""Extract retail / sale / wholesale prices from WooCommerce REST product rows."""

from __future__ import annotations

from typing import Any, Optional


def _parse_amount(raw: Any) -> Optional[float]:
    if raw in (None, ""):
        return None
    try:
        value = float(raw)
    except (TypeError, ValueError):
        return None
    return value if value > 0 else None


def _meta_map(row: dict) -> dict[str, Any]:
    return {str(m.get("key") or ""): m.get("value") for m in row.get("meta_data") or []}


def extract_wc_prices(row: dict) -> dict[str, Any]:
    """Map WooCommerce price fields to app product pricing."""
    meta = _meta_map(row)

    active = _parse_amount(row.get("price"))
    regular = _parse_amount(row.get("regular_price"))
    sale = _parse_amount(row.get("sale_price"))

    if active is None:
        active = _parse_amount(meta.get("_price"))
    if regular is None:
        regular = _parse_amount(meta.get("_regular_price"))
    if sale is None:
        sale = _parse_amount(meta.get("_sale_price"))

    if row.get("type") == "variable" and active is None:
        active = _parse_amount(row.get("min_price")) or _parse_amount(row.get("max_price"))

    retail = regular or active or sale or 0.0
    if active is None:
        active = sale or regular or 0.0

    on_sale = bool(row.get("on_sale")) or bool(sale and regular and sale < regular)
    price_on_request = active <= 0 and retail <= 0

    wholesale: Optional[float] = None
    if str(meta.get("wholesale_customer_have_wholesale_price") or "").lower() == "yes":
        wholesale = _parse_amount(meta.get("wholesale_customer_wholesale_price"))

    return {
        "price": round(active if not price_on_request else 0.0, 2),
        "regularPrice": round(retail if not price_on_request else 0.0, 2),
        "salePrice": round(sale, 2) if sale else None,
        "on_sale": on_sale,
        "price_on_request": price_on_request,
        "wholesalePrice": round(wholesale, 2) if wholesale else None,
    }
