"""Expo Push Notification sender + preference helpers."""
from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request
from typing import Any, Optional

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

# Preference keys stored per user (JSON on users.notification_prefs or push prefs table).
PREF_DEFAULTS = {
    "orderUpdates": True,
    "promotions": True,
    "newArrivals": True,
    "restock": True,
    "push": True,
    "cartReminders": True,
}


def kind_to_pref(kind: str) -> Optional[str]:
    """Map notification kind → preference flag that must be enabled."""
    k = (kind or "").strip().lower()
    if k.startswith("order") or k in {"wholesale_approved", "wholesale_rejected", "wholesale_suspended"}:
        return "orderUpdates"
    if k in {"new_product", "new_arrival"}:
        return "newArrivals"
    if k in {"promotion", "discount", "personal_discount"}:
        return "promotions"
    if k in {"restock", "back_in_stock"}:
        return "restock"
    if k in {"cart_abandon", "cart_reminder"}:
        return "cartReminders"
    if k in {"wholesale_submitted", "wholesale_request"}:
        return "orderUpdates"
    return "push"


def prefs_allow(prefs: Optional[dict], kind: str) -> bool:
    p = {**PREF_DEFAULTS, **(prefs or {})}
    if not p.get("push", True):
        return False
    flag = kind_to_pref(kind)
    if flag is None:
        return True
    return bool(p.get(flag, True))


def prefs_allow_email(prefs: Optional[dict], kind: str) -> bool:
    """Email opt-in is independent of the mobile push master switch."""
    p = {**PREF_DEFAULTS, **(prefs or {})}
    flag = kind_to_pref(kind)
    if flag is None or flag == "push":
        return True
    return bool(p.get(flag, True))


def _chunk(items: list, size: int = 100):
    for i in range(0, len(items), size):
        yield items[i : i + size]


def send_expo_push(
    tokens: list[str],
    *,
    title: str,
    body: str,
    data: Optional[dict[str, Any]] = None,
    sound: str = "default",
) -> int:
    """
    Send Expo push messages. Returns number of tickets accepted (best-effort).
    Invalid / empty tokens are skipped.
    """
    cleaned = []
    seen = set()
    for t in tokens:
        tok = (t or "").strip()
        if not tok or tok in seen:
            continue
        # Expo tokens look like ExponentPushToken[xxx]
        if not (tok.startswith("ExponentPushToken[") or tok.startswith("ExpoPushToken[")):
            # Still try — some builds use FCM tokens via Expo
            pass
        seen.add(tok)
        cleaned.append(tok)

    if not cleaned:
        return 0

    sent = 0
    payload_data = data or {}
    for batch in _chunk(cleaned, 100):
        messages = [
            {
                "to": tok,
                "title": title,
                "body": body,
                "sound": sound,
                "data": payload_data,
                "priority": "high",
                "channelId": "samphone-default",
            }
            for tok in batch
        ]
        try:
            req = urllib.request.Request(
                EXPO_PUSH_URL,
                data=json.dumps(messages).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Accept-Encoding": "gzip, deflate",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=20) as resp:
                raw = resp.read().decode("utf-8", errors="replace")
            try:
                parsed = json.loads(raw)
                tickets = parsed.get("data") or []
                sent += sum(1 for t in tickets if (t or {}).get("status") == "ok")
            except Exception:
                sent += len(batch)
            logger.info("Expo push batch size=%s accepted~%s title=%r", len(batch), sent, title)
        except urllib.error.HTTPError as exc:
            logger.error("Expo push HTTP error: %s %s", exc.code, exc.read()[:300])
        except Exception as exc:
            logger.error("Expo push failed: %s", exc)
    return sent


def notify_user_devices(
    *,
    tokens: list[str],
    prefs: Optional[dict],
    kind: str,
    title: str,
    body: str,
    data: Optional[dict[str, Any]] = None,
) -> int:
    if not prefs_allow(prefs, kind):
        logger.debug("Push skipped by prefs kind=%s", kind)
        return 0
    payload = {"kind": kind, **(data or {})}
    return send_expo_push(tokens, title=title, body=body, data=payload)
