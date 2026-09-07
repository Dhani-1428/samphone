"""Hourly safety net: find Stripe PaymentIntents that succeeded without an app order.

Usage:
  cd /var/www/myapi && ./venv/bin/python -m jobs.reconcile_payments --hours 48
"""

from __future__ import annotations

import argparse
import logging
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env", override=True)

import stripe

from app_db import get_app_db
from stripe_service import _slack_ops

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("jobs.reconcile_payments")


def reconcile(*, hours: int = 48) -> dict:
    api_key = (os.environ.get("STRIPE_SECRET_KEY") or "").strip()
    if not api_key:
        raise SystemExit("STRIPE_SECRET_KEY is not set")
    stripe.api_key = api_key

    since = int((datetime.now(timezone.utc) - timedelta(hours=hours)).timestamp())
    db = get_app_db()
    orphans: list[dict] = []
    matched = 0
    scanned = 0

    intents = stripe.PaymentIntent.list(
        created={"gte": since},
        limit=100,
    )
    for pi in intents.auto_paging_iter():
        status = (getattr(pi, "status", None) or "").lower()
        if status not in {"succeeded", "processing"}:
            continue
        scanned += 1
        pi_id = pi.id
        order = db.find_order_by_stripe_payment_id(pi_id)
        if order:
            matched += 1
            continue
        amount = int(getattr(pi, "amount", 0) or 0)
        orphans.append(
            {
                "payment_intent_id": pi_id,
                "amount_eur": amount / 100.0,
                "status": status,
                "created": getattr(pi, "created", None),
            }
        )

    if orphans:
        lines = [
            f":rotating_light: reconcile_payments: {len(orphans)} paid Stripe PI(s) without app order (last {hours}h)"
        ]
        for o in orphans[:20]:
            lines.append(
                f"- `{o['payment_intent_id']}` €{o['amount_eur']:.2f} ({o['status']})"
            )
        msg = "\n".join(lines)
        logger.error(msg)
        _slack_ops(msg)
    else:
        logger.info(
            "reconcile_payments ok scanned=%s matched=%s orphans=0 hours=%s",
            scanned,
            matched,
            hours,
        )

    return {
        "ok": True,
        "hours": hours,
        "scanned": scanned,
        "matched": matched,
        "orphans": orphans,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Reconcile Stripe payments vs app orders")
    parser.add_argument("--hours", type=int, default=48)
    args = parser.parse_args()
    result = reconcile(hours=args.hours)
    print(result)


if __name__ == "__main__":
    main()
