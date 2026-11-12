"""Real product photos vs WooCommerce / banner placeholders."""
from __future__ import annotations

from typing import Any

PLACEHOLDER_MARKERS = (
    "woocommerce-placeholder",
    "display-banner-samphone",
    "placeholder.jpg",
    "placeholder.png",
    "placeholder.webp",
)


def is_placeholder_image(url: str | None) -> bool:
    u = (url or "").strip().lower()
    if not u:
        return True
    return any(marker in u for marker in PLACEHOLDER_MARKERS)


def image_src(value: Any) -> str:
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, dict):
        return str(value.get("src") or "").strip()
    return ""


def real_image_urls(values: Any) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    for value in values or []:
        src = image_src(value)
        if not src or is_placeholder_image(src) or src in seen:
            continue
        seen.add(src)
        out.append(src)
    return out


def product_has_real_image(product: dict[str, Any] | None) -> bool:
    if not product:
        return False
    img = str(product.get("image") or "").strip()
    if img and not is_placeholder_image(img):
        return True
    return bool(real_image_urls(product.get("images") or []))
