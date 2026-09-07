"""Email OTP MFA used by the React storefront (`/auth/mfa/verify`)."""
from __future__ import annotations

import logging
import os
import secrets
import time
from typing import Any, Optional

from fastapi import HTTPException

logger = logging.getLogger(__name__)

_CHALLENGES: dict[str, dict[str, Any]] = {}
_TTL_SEC = 600
_MAX_TRIES = 8


def login_mfa_required(user: dict) -> bool:
    if os.environ.get("REQUIRE_LOGIN_MFA", "0") == "1":
        return True
    prefs = user.get("notificationPrefs") or {}
    return bool(prefs.get("mfaEnabled") or prefs.get("mfa_enabled"))


def issue_challenge(email: str, background_tasks) -> dict:
    email_n = (email or "").strip().lower()
    if not email_n:
        raise HTTPException(status_code=400, detail="Email is required for MFA")
    token = secrets.token_urlsafe(32)
    code = f"{secrets.randbelow(1_000_000):06d}"
    _CHALLENGES[token] = {
        "email": email_n,
        "code": code,
        "exp": time.time() + _TTL_SEC,
        "tries": 0,
    }
    background_tasks.add_task(_send_code_email, email_n, code)
    return {
        "mfa_required": True,
        "mfaRequired": True,
        "mfa_token": token,
        "mfaToken": token,
    }


def verify_challenge(mfa_token: str, code: str, email: Optional[str] = None) -> str:
    row = _CHALLENGES.get((mfa_token or "").strip())
    if not row or time.time() > float(row["exp"]):
        _CHALLENGES.pop((mfa_token or "").strip(), None)
        raise HTTPException(status_code=400, detail="MFA session expired. Sign in again.")
    row["tries"] = int(row.get("tries") or 0) + 1
    if row["tries"] > _MAX_TRIES:
        _CHALLENGES.pop(mfa_token, None)
        raise HTTPException(status_code=429, detail="Too many MFA attempts. Sign in again.")
    expected = str(row.get("code") or "")
    got = "".join(ch for ch in (code or "") if ch.isdigit())
    if got != expected:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    stored_email = str(row.get("email") or "")
    if email and email.strip().lower() not in {"", stored_email}:
        raise HTTPException(status_code=400, detail="MFA email mismatch")
    _CHALLENGES.pop(mfa_token, None)
    return stored_email


def _send_code_email(email: str, code: str) -> None:
    try:
        from email_service import send_email

        send_email(
            email,
            "Your Samphone verification code",
            f"<p>Your verification code is <strong>{code}</strong>.</p><p>It expires in 10 minutes.</p>",
            f"Your verification code is {code}. It expires in 10 minutes.",
        )
    except Exception as exc:
        logger.warning("MFA email failed for %s: %s", email, exc)
    if os.environ.get("ENVIRONMENT", "development").lower() not in {"production", "prod"}:
        logger.info("MFA code for %s: %s", email, code)
