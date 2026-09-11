"""Production security helpers: rate limits, lockout, CORS, headers, safe errors."""
from __future__ import annotations

import os
import time
import logging
from collections import defaultdict, deque
from threading import Lock
from typing import Deque, Optional

from fastapi import HTTPException, Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

logger = logging.getLogger("security")

# --- CORS ---
DEFAULT_CORS_ORIGINS = (
    "https://www.samphone.pt,"
    "https://samphone.pt,"
    "https://staging.samphone.pt,"
    "https://samphone.eu,"
    "https://www.samphone.eu,"
    "https://samphone.cloud,"
    "https://www.samphone.cloud,"
    "http://localhost:8081,"
    "http://localhost:19006,"
    "http://localhost:5173,"
    "http://localhost:4173,"
    "http://127.0.0.1:8081,"
    "http://127.0.0.1:19006,"
    "http://127.0.0.1:5173,"
    "http://127.0.0.1:4173"
)


def cors_origins() -> list[str]:
    raw = os.environ.get("CORS_ALLOW_ORIGINS", DEFAULT_CORS_ORIGINS).strip()
    if raw == "*":
        logger.warning("CORS_ALLOW_ORIGINS=* is insecure — restrict in production")
        return ["*"]
    origins = [o.strip() for o in raw.split(",") if o.strip()]
    return origins or list(DEFAULT_CORS_ORIGINS.split(","))


# --- Rate limiting (in-memory; use Redis in multi-instance prod) ---
class RateLimiter:
    def __init__(self) -> None:
        self._hits: dict[str, Deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def check(self, key: str, *, limit: int, window_sec: float) -> None:
        now = time.monotonic()
        with self._lock:
            q = self._hits[key]
            while q and now - q[0] > window_sec:
                q.popleft()
            if len(q) >= limit:
                raise HTTPException(
                    status_code=429,
                    detail="Too many requests. Please try again later.",
                )
            q.append(now)


rate_limiter = RateLimiter()


def _first_ip(value: str) -> str:
    return (value or "").split(",")[0].strip()


def client_ip(request: Request) -> str:
    for header in ("x-vercel-forwarded-for", "x-real-ip", "x-forwarded-for", "cf-connecting-ip"):
        ip = _first_ip(request.headers.get(header) or "")
        if ip:
            return ip
    if request.client:
        return request.client.host or "unknown"
    return "unknown"


def rate_limit(request: Request, bucket: str, *, limit: int, window_sec: float) -> None:
    rate_limiter.check(f"{bucket}:{client_ip(request)}", limit=limit, window_sec=window_sec)


def auth_attempt_limit(
    request: Request,
    email: str,
    *,
    bucket: str,
    per_account: int = 8,
    per_ip: int = 80,
    window_sec: float = 60,
) -> None:
    """Limit by account first so a shared proxy IP cannot lock every shopper."""
    ident = (email or "").strip().lower()[:180]
    if ident:
        rate_limiter.check(f"{bucket}:acct:{ident}", limit=per_account, window_sec=window_sec)
    rate_limit(request, f"{bucket}_ip", limit=per_ip, window_sec=window_sec)


# --- Login lockout ---
class LoginLockout:
    def __init__(self, *, max_failures: int = 5, lock_sec: float = 900) -> None:
        self.max_failures = max_failures
        self.lock_sec = lock_sec
        self._failures: dict[str, list[float]] = defaultdict(list)
        self._lock = Lock()

    def _prune(self, key: str, now: float) -> None:
        self._failures[key] = [t for t in self._failures[key] if now - t < self.lock_sec]

    def assert_allowed(self, key: str) -> None:
        now = time.monotonic()
        with self._lock:
            self._prune(key, now)
            if len(self._failures[key]) >= self.max_failures:
                raise HTTPException(
                    status_code=429,
                    detail="Account temporarily locked after too many failed attempts. Try again later.",
                )

    def record_failure(self, key: str) -> None:
        now = time.monotonic()
        with self._lock:
            self._prune(key, now)
            self._failures[key].append(now)

    def clear(self, key: str) -> None:
        with self._lock:
            self._failures.pop(key, None)


login_lockout = LoginLockout()


# --- Safe client errors ---
def safe_http_error(
    status: int,
    public_detail: str,
    exc: Optional[BaseException] = None,
    *,
    log_msg: str = "",
) -> HTTPException:
    if exc is not None:
        logger.exception("%s: %s", log_msg or public_detail, exc)
    elif log_msg:
        logger.error("%s", log_msg)
    return HTTPException(status_code=status, detail=public_detail)


# --- Honeypot (bots fill hidden fields) ---
def reject_honeypot(value: Optional[str]) -> None:
    if value and str(value).strip():
        raise HTTPException(status_code=400, detail="Invalid request")


# --- Security headers middleware ---
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault(
            "Permissions-Policy",
            "camera=(), microphone=(self), geolocation=()",
        )
        # HSTS only meaningful over HTTPS; harmless on HTTP clients that ignore it
        if os.environ.get("ENABLE_HSTS", "1") == "1":
            response.headers.setdefault(
                "Strict-Transport-Security",
                "max-age=31536000; includeSubDomains",
            )
        # API responses: tight CSP (JSON-first app)
        response.headers.setdefault(
            "Content-Security-Policy",
            "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
        )
        # Hide framework fingerprinting
        if "server" in response.headers:
            del response.headers["server"]
        return response


def production_mode() -> bool:
    return os.environ.get("ENVIRONMENT", os.environ.get("ENV", "development")).lower() in {
        "production",
        "prod",
    }
