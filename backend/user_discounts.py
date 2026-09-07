"""Per-user personal pricing discounts (admin-assigned, viewer-only)."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

DISCOUNT_TYPES = frozenset({"percentage", "fixed"})
APPLIES_TO = frozenset({"all", "category", "product"})


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _parse_dt(value: Any) -> Optional[datetime]:
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        dt = value
    else:
        text = str(value).strip().replace("Z", "+00:00")
        try:
            dt = datetime.fromisoformat(text)
        except ValueError:
            return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def is_discount_active(row: dict, now: Optional[datetime] = None) -> bool:
    if not row.get("is_active", True):
        return False
    at = now or _now()
    starts = _parse_dt(row.get("starts_at") or row.get("startsAt"))
    expires = _parse_dt(row.get("expires_at") or row.get("expiresAt"))
    if starts and starts > at:
        return False
    if expires and expires <= at:
        return False
    return True


def validate_discount_payload(body: dict, *, partial: bool = False) -> dict[str, Any]:
    """Normalize and validate create/update body. Raises ValueError on bad input."""
    out: dict[str, Any] = {}

    if "discount_type" in body or "discountType" in body or not partial:
        dtype = (body.get("discount_type") or body.get("discountType") or "").strip().lower()
        if dtype not in DISCOUNT_TYPES:
            raise ValueError('discount_type must be "percentage" or "fixed"')
        out["discount_type"] = dtype

    if "discount_value" in body or "discountValue" in body or not partial:
        raw = body.get("discount_value", body.get("discountValue"))
        try:
            value = float(raw)
        except (TypeError, ValueError):
            raise ValueError("discount_value must be a number") from None
        dtype = out.get("discount_type") or (body.get("discount_type") or body.get("discountType") or "").strip().lower()
        if value <= 0:
            raise ValueError("discount_value must be greater than 0")
        if dtype == "percentage" and value > 100:
            raise ValueError("percentage discount_value cannot exceed 100")
        out["discount_value"] = round(value, 2)

    if "applies_to" in body or "appliesTo" in body or not partial:
        applies = (body.get("applies_to") or body.get("appliesTo") or "all").strip().lower()
        if applies not in APPLIES_TO:
            raise ValueError('applies_to must be "all", "category", or "product"')
        out["applies_to"] = applies
    else:
        applies = None

    if "target_ids" in body or "targetIds" in body or (not partial and out.get("applies_to", "all") != "all"):
        targets = body.get("target_ids", body.get("targetIds"))
        applies_final = out.get("applies_to") or applies or "all"
        if applies_final == "all":
            out["target_ids"] = None
        else:
            if not isinstance(targets, list) or not targets:
                raise ValueError("target_ids required when applies_to is category or product")
            cleaned = [str(x).strip() for x in targets if str(x).strip()]
            if not cleaned:
                raise ValueError("target_ids required when applies_to is category or product")
            out["target_ids"] = cleaned

    if "reason" in body:
        reason = body.get("reason")
        out["reason"] = (str(reason).strip() if reason is not None else None) or None

    if "is_active" in body or "isActive" in body:
        out["is_active"] = bool(body.get("is_active", body.get("isActive")))

    if "starts_at" in body or "startsAt" in body or not partial:
        starts = body.get("starts_at", body.get("startsAt"))
        if starts in (None, "") and not partial:
            out["starts_at"] = _now()
        elif starts not in (None, ""):
            dt = _parse_dt(starts)
            if not dt:
                raise ValueError("invalid starts_at")
            out["starts_at"] = dt

    if "expires_at" in body or "expiresAt" in body:
        expires = body.get("expires_at", body.get("expiresAt"))
        if expires in (None, ""):
            out["expires_at"] = None
        else:
            dt = _parse_dt(expires)
            if not dt:
                raise ValueError("invalid expires_at")
            out["expires_at"] = dt

    starts = out.get("starts_at")
    expires = out.get("expires_at")
    if starts and expires and expires <= starts:
        raise ValueError("expires_at must be after starts_at")

    return out


def discount_matches_product(discount: dict, product: dict) -> bool:
    applies = (discount.get("applies_to") or discount.get("appliesTo") or "all").lower()
    if applies == "all":
        return True
    targets = discount.get("target_ids") or discount.get("targetIds") or []
    if not targets:
        return False
    target_set = {str(t).strip().lower() for t in targets if str(t).strip()}

    if applies == "product":
        pid = str(product.get("id") or "").strip().lower()
        wc = str(product.get("wc_id") or "").strip().lower()
        return bool(pid and pid in target_set) or bool(wc and wc in target_set)

    # category: match category, leaf, part_type, subcategory
    fields = [
        product.get("category"),
        product.get("leaf_category"),
        product.get("part_type"),
        product.get("subcategory"),
        product.get("category_group"),
    ]
    for f in fields:
        if f and str(f).strip().lower() in target_set:
            return True
    return False


def compute_discounted_price(base: float, discount: dict) -> float:
    dtype = (discount.get("discount_type") or discount.get("discountType") or "").lower()
    try:
        value = float(discount.get("discount_value") or discount.get("discountValue") or 0)
    except (TypeError, ValueError):
        return base
    if base <= 0 or value <= 0:
        return base
    if dtype == "percentage":
        return max(0.0, round(base * (1.0 - value / 100.0), 2))
    if dtype == "fixed":
        return max(0.0, round(base - value, 2))
    return base


def best_discounted_price(base: float, discounts: list[dict], product: dict) -> float:
    best = base
    for d in discounts:
        if not is_discount_active(d):
            continue
        if not discount_matches_product(d, product):
            continue
        best = min(best, compute_discounted_price(base, d))
    return best


def apply_user_discounts_to_product(product: dict, discounts: Optional[list[dict]]) -> dict:
    """
    Mutate product price for the authenticated viewer only.
    Sets regularPrice to the pre-discount amount when a discount applies (for silent strikethrough).
    Never attaches discount metadata to the product payload.
    """
    if not discounts:
        return product
    try:
        base = float(product.get("price") or 0)
    except (TypeError, ValueError):
        return product
    if base <= 0:
        return product
    final = best_discounted_price(base, discounts, product)
    if final < base - 0.001:
        # Preserve a compare-at for UI strikethrough without naming the feature.
        if product.get("regularPrice") is None or float(product.get("regularPrice") or 0) < base:
            product["regularPrice"] = round(base, 2)
        product["price"] = round(final, 2)
        if product.get("retailPrice") is not None:
            product["retailPrice"] = round(final, 2)
        if product.get("wholesalePrice") is not None:
            # Keep wholesalePrice as pre-discount for business "you save" vs public retail only;
            # charged amount is `price`.
            pass
    return product


def row_to_public(row: dict, *, include_reason: bool = False) -> dict:
    """Serialize discount for API. Customer payloads omit reason."""
    targets = row.get("target_ids")
    if isinstance(targets, str):
        import json

        try:
            targets = json.loads(targets)
        except Exception:
            targets = None
    out = {
        "id": row.get("id"),
        "user_id": row.get("user_id") or row.get("userId"),
        "discount_type": row.get("discount_type") or row.get("discountType"),
        "discount_value": float(row.get("discount_value") or row.get("discountValue") or 0),
        "applies_to": row.get("applies_to") or row.get("appliesTo") or "all",
        "target_ids": targets,
        "is_active": bool(row.get("is_active", row.get("isActive", True))),
        "starts_at": _iso(row.get("starts_at") or row.get("startsAt")),
        "expires_at": _iso(row.get("expires_at") or row.get("expiresAt")),
        "created_by": row.get("created_by") or row.get("createdBy"),
        "created_at": _iso(row.get("created_at") or row.get("createdAt")),
        "updated_at": _iso(row.get("updated_at") or row.get("updatedAt")),
    }
    if include_reason:
        out["reason"] = row.get("reason")
    return out


def row_to_customer(row: dict) -> dict:
    """Minimal shape for the owning customer's session (no reason)."""
    full = row_to_public(row, include_reason=False)
    return {
        "id": full["id"],
        "discountType": full["discount_type"],
        "discountValue": full["discount_value"],
        "appliesTo": full["applies_to"],
        "targetIds": full["target_ids"],
        "startsAt": full["starts_at"],
        "expiresAt": full["expires_at"],
    }


def _iso(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()
    return str(value)
