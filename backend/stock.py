"""Product stock helpers — single source of truth for catalog inventory."""

from __future__ import annotations

# When WooCommerce / seed has no tracked quantity but item is in stock,
# allow large orders until the product is marked out of stock.
UNMANAGED_IN_STOCK_QTY = 9999


def normalize_stock(product: dict) -> dict:
    """Normalize inventory fields.

    - manage_stock=True → use real stock_quantity
    - manage_stock=False / missing and in stock → high cap (not the old 25 limit)
    - out of stock → 0
    """
    p = product
    managed = bool(p.get("manage_stock") or p.get("stock_tracked"))
    if managed:
        p["manage_stock"] = True
        p["stock_tracked"] = True
        p["stock_quantity"] = max(0, int(p.get("stock_quantity") or 0))
    elif p.get("in_stock") is False:
        p["stock_quantity"] = 0
    else:
        existing = p.get("stock_quantity")
        try:
            existing_n = int(existing) if existing is not None else None
        except (TypeError, ValueError):
            existing_n = None
        # Keep a real tracked qty if present (avoid wiping admin edits to 9999).
        if existing_n is not None and 0 <= existing_n < UNMANAGED_IN_STOCK_QTY:
            p["manage_stock"] = True
            p["stock_tracked"] = True
            p["stock_quantity"] = existing_n
        else:
            # In stock without quantity tracking (or seed data) — allow until OOS.
            p["stock_quantity"] = UNMANAGED_IN_STOCK_QTY
    p["in_stock"] = int(p.get("stock_quantity") or 0) > 0
    return p


def apply_stock_quantity(product: dict, quantity: int) -> dict:
    product["stock_quantity"] = max(0, int(quantity))
    product["in_stock"] = product["stock_quantity"] > 0
    product["manage_stock"] = True
    product["stock_tracked"] = True
    return product


def validate_purchase_lines(products_by_id: dict[str, dict], lines: list[dict]) -> None:
    errors: list[str] = []
    for line in lines:
        pid = str(line.get("product_id") or "")
        qty = int(line.get("quantity") or 0)
        if qty <= 0:
            errors.append("Invalid quantity")
            continue
        product = products_by_id.get(pid)
        if not product:
            errors.append(f"Product not found: {pid}")
            continue
        available = int(product.get("stock_quantity") or 0)
        if available < qty:
            title = product.get("title") or pid
            errors.append(f"Insufficient stock for {title} (available: {available})")
    if errors:
        raise ValueError(errors[0])
