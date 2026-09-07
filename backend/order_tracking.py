"""Simulated live order tracking — status advances over time from order creation."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

# Manual / terminal statuses must not be overwritten by simulated progress.
TERMINAL_STATUSES = frozenset({"cancelled", "delivered", "collected", "refunded"})
# Customer cancel is blocked only for these (cancelled is idempotent).
CANCEL_BLOCKED_STATUSES = frozenset({"delivered", "collected", "refunded"})

DELIVERY_STEPS: list[tuple[str, str, int]] = [
    ("order_placed", "Order placed", 0),
    ("processing", "Processing", 2),
    ("shipped", "Shipped", 5),
    ("out_for_delivery", "Out for delivery", 15),
    ("delivered", "Delivered", 30),
]

STORE_STEPS: list[tuple[str, str, int]] = [
    ("order_placed", "Order placed", 0),
    ("processing", "Processing", 2),
    ("ready_for_pickup", "Ready for pickup", 8),
    ("collected", "Collected", 20),
]

LOCATIONS: dict[str, str] = {
    "order_placed": "Samphone Warehouse, Lisboa",
    "processing": "Samphone Warehouse, Lisboa",
    "shipped": "Lisboa Distribution Hub",
    "out_for_delivery": "Local courier — your area",
    "delivered": "Delivered to your address",
    "ready_for_pickup": "Samphone Store, Lisboa",
    "collected": "Picked up in store",
}


def _parse_dt(value: str | None) -> datetime:
    if not value:
        return datetime.now(timezone.utc)
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except ValueError:
        return datetime.now(timezone.utc)


def make_tracking_number(order_number: str) -> str:
    digits = "".join(ch for ch in order_number if ch.isdigit())[-8:] or "00000001"
    return f"SAM{digits}PT"


def _steps_for_order(order: dict) -> list[tuple[str, str, int]]:
    if order.get("payment_method") == "store":
        return STORE_STEPS
    return DELIVERY_STEPS


def current_tracking_step(order: dict, now: datetime | None = None) -> tuple[str, int]:
    now = now or datetime.now(timezone.utc)
    created = _parse_dt(order.get("created_at"))
    elapsed_min = max(0, (now - created).total_seconds() / 60)
    steps = _steps_for_order(order)
    current_key = steps[0][0]
    current_idx = 0
    for i, (key, _label, after_min) in enumerate(steps):
        if elapsed_min >= after_min:
            current_key = key
            current_idx = i
    return current_key, current_idx


def build_tracking_events(order: dict, steps: list[tuple[str, str, int]], current_idx: int, created: datetime) -> list[dict]:
    events: list[dict] = []
    for i, (key, label, after_min) in enumerate(steps):
        if i > current_idx:
            break
        at = created + timedelta(minutes=after_min)
        events.append(
            {
                "step": key,
                "label": label,
                "at": at.isoformat(),
                "location": LOCATIONS.get(key, "Samphone"),
            }
        )
    return events


def enrich_order(order: dict, now: datetime | None = None) -> dict:
    now = now or datetime.now(timezone.utc)
    out = dict(order)
    stored_status = str(out.get("status") or "").strip().lower()
    steps = _steps_for_order(out)
    created = _parse_dt(out.get("created_at"))

    tracking_number = out.get("tracking_number") or make_tracking_number(out.get("order_number", ""))
    carrier = out.get("carrier") or ("Samphone Store Pickup" if out.get("payment_method") == "store" else "Samphone Express")

    # Cancelled / refunded (and any other stored terminal) stay frozen.
    if stored_status in {"cancelled", "refunded"}:
        label = "Cancelled" if stored_status == "cancelled" else "Refunded"
        timeline = [
            {
                "step": "order_placed",
                "label": "Order placed",
                "state": "done",
                "at": created.isoformat(),
                "location": LOCATIONS.get("order_placed", "Samphone"),
            },
            {
                "step": stored_status,
                "label": label,
                "state": "current",
                "at": now.isoformat(),
                "location": "Samphone",
            },
        ]
        out.update(
            {
                "status": stored_status,
                "tracking_number": tracking_number,
                "carrier": carrier,
                "estimated_delivery": None,
                "tracking_timeline": timeline,
                "tracking_events": [
                    {k: v for k, v in ev.items() if k != "state"} for ev in timeline
                ],
                "tracking_progress": 0,
            }
        )
        return out

    current_key, current_idx = current_tracking_step(out, now)
    # If DB already has delivered/collected, prefer that over simulation.
    if stored_status in {"delivered", "collected"}:
        for i, (key, _label, _after) in enumerate(steps):
            if key == stored_status:
                current_key, current_idx = key, i
                break

    timeline = []
    for i, (key, label, after_min) in enumerate(steps):
        state = "done" if i < current_idx else ("current" if i == current_idx else "pending")
        at = created + timedelta(minutes=after_min) if i <= current_idx else None
        timeline.append(
            {
                "step": key,
                "label": label,
                "state": state,
                "at": at.isoformat() if at else None,
                "location": LOCATIONS.get(key, "Samphone"),
            }
        )

    last_delivery = steps[-1]
    eta = created + timedelta(minutes=last_delivery[2] + (10 if out.get("payment_method") != "store" else 5))

    out.update(
        {
            "status": current_key,
            "tracking_number": tracking_number,
            "carrier": carrier,
            "estimated_delivery": eta.isoformat(),
            "tracking_timeline": timeline,
            "tracking_events": build_tracking_events(out, steps, current_idx, created),
            "tracking_progress": int(round((current_idx / max(len(steps) - 1, 1)) * 100)),
        }
    )
    return out


def attach_tracking_fields(order: dict) -> dict:
    """Fields stored at order creation (tracking number + carrier)."""
    out = dict(order)
    if not out.get("tracking_number"):
        out["tracking_number"] = make_tracking_number(out.get("order_number", ""))
    if not out.get("carrier"):
        out["carrier"] = "Samphone Store Pickup" if out.get("payment_method") == "store" else "Samphone Express"
    out["status"] = out.get("status") or "order_placed"
    return out
