"""Server-side cart/order price recalculation — never trust client amounts."""
from __future__ import annotations

from typing import Any, Callable, Optional

from wholesale import enrich_product_pricing, sanitize_product


async def resolve_product(
    product_id: str,
    *,
    fetch_woo: Optional[Callable] = None,
    fetch_memory: Optional[Callable] = None,
    fetch_mongo: Optional[Callable] = None,
) -> Optional[dict]:
    if fetch_woo:
        doc = await fetch_woo(product_id)
        if doc:
            return doc
    if fetch_memory:
        doc = fetch_memory(product_id)
        if doc:
            return doc
    if fetch_mongo:
        doc = await fetch_mongo(product_id)
        if doc:
            return doc
    return None


def _dealer_tier_for_user(user: Optional[dict]) -> str:
    """enrich_product_pricing expects a tier string, not the user dict."""
    if not user:
        return "standard"
    return str(user.get("dealerTier") or user.get("dealer_tier") or "standard")


def unit_price_for_user(raw_product: dict, user: Optional[dict]) -> dict[str, Any]:
    """Return sanitized display fields + authoritative unit price for this viewer."""
    enriched = enrich_product_pricing(dict(raw_product), _dealer_tier_for_user(user))
    clean = sanitize_product(enriched, user)
    title = (
        str(clean.get("title") or clean.get("name") or raw_product.get("title") or raw_product.get("name") or "")
        .strip()
        or "Product"
    )
    image = ""
    if clean.get("image"):
        image = str(clean.get("image")).strip()
    elif isinstance(clean.get("images"), list) and clean["images"]:
        image = str(clean["images"][0] or "").strip()
    elif raw_product.get("image"):
        image = str(raw_product.get("image")).strip()
    return {
        "product_id": str(clean.get("id") or raw_product.get("id") or ""),
        "title": title,
        "brand": str(clean.get("brand") or ""),
        "price": round(float(clean.get("price") or 0), 2),
        "image": image,
    }


async def recalculate_line_items(
    items: list,
    user: Optional[dict],
    *,
    fetch_product,
) -> tuple[list[dict], float]:
    """
    Rebuild line items from DB prices for the authenticated user role.
    `items` may be pydantic models or dicts with product_id + quantity (+ optional title/image).
    """
    lines: list[dict] = []
    subtotal = 0.0
    for raw in items:
        if hasattr(raw, "model_dump"):
            data = raw.model_dump()
        elif hasattr(raw, "dict"):
            data = raw.dict()
        else:
            data = dict(raw)
        pid = str(data.get("product_id") or "").strip()
        qty = int(data.get("quantity") or 0)
        if not pid or qty < 1:
            raise ValueError("Each item needs product_id and quantity >= 1")
        product = await fetch_product(pid)
        if not product:
            raise ValueError(f"Product not found: {pid}")
        priced = unit_price_for_user(product, user)
        unit = priced["price"]
        line_total = round(unit * qty, 2)
        line = {
            "product_id": pid,
            "title": priced["title"] or str(data.get("title") or "").strip() or "Product",
            "brand": priced["brand"] or str(data.get("brand") or ""),
            "price": unit,
            "quantity": qty,
            "line_total": line_total,
            "image": priced["image"] or str(data.get("image") or "").strip(),
        }
        lines.append(line)
        subtotal += line_total
    return lines, round(subtotal, 2)
