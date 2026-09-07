"""Shared product list pagination for catalog endpoints."""
from __future__ import annotations

from typing import Any

DEFAULT_PRODUCT_PAGE = 50
MAX_PRODUCT_PAGE = 50
MODEL_PRODUCT_PAGE = 100


def clamp_page(limit: int | None = None, offset: int | None = None, *, model_query: bool = False) -> tuple[int, int]:
    cap = MODEL_PRODUCT_PAGE if model_query else MAX_PRODUCT_PAGE
    lim = max(1, min(int(limit or DEFAULT_PRODUCT_PAGE), cap))
    off = max(0, int(offset or 0))
    return lim, off


def product_page(items: list, total: int, *, limit: int, offset: int, model_query: bool = False) -> dict:
    lim, off = clamp_page(limit, offset, model_query=model_query)
    return {
        "items": items,
        "total": int(total),
        "limit": lim,
        "offset": off,
        "has_more": off + len(items) < int(total),
    }


def ensure_product_page(result: Any, *, limit: int, offset: int, model_query: bool = False) -> dict:
    """Normalize list or paginated dict responses from catalog backends."""
    lim, off = clamp_page(limit, offset, model_query=model_query)
    if isinstance(result, dict) and isinstance(result.get("items"), list):
        items = result["items"]
        total = int(result.get("total", len(items)))
        return product_page(items, total, limit=lim, offset=int(result.get("offset", off)), model_query=model_query)
    if isinstance(result, list):
        items = result
        return product_page(items, len(items), limit=lim, offset=off, model_query=model_query)
    return product_page([], 0, limit=lim, offset=off, model_query=model_query)
