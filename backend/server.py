from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
# override=True so .env changes apply after uvicorn reload (parent env can be stale).
load_dotenv(ROOT_DIR / ".env", override=True)

from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Request, BackgroundTasks, UploadFile, File, Form
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import os
import logging
import time
from urllib.parse import unquote
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
from jose import JWTError, jwt
import secrets

from seed_data import PRODUCTS, MODELS
import data_store
import memory_store
import translate_service
from app_db import get_app_db
from openai_voice import (
    filters_to_product_params,
    filters_have_search_signal,
    is_meaningful_search_query,
    openai_configured,
    parse_search_query,
    transcribe_audio,
)
import voice_logger
from wholesale import (
    default_wholesale_user_fields,
    enrich_product_pricing,
    is_wholesale_approved,
    sanitize_product,
    sanitize_products,
    user_public_wholesale,
)
from localization import normalize_language, tr
from woocommerce_client import get_woo_db
from security_hardening import (
    SecurityHeadersMiddleware,
    auth_attempt_limit,
    cors_origins,
    login_lockout,
    production_mode,
    rate_limit,
    reject_honeypot,
    safe_http_error,
)
from order_pricing import recalculate_line_items
from shipments_api import register_shipment_routes

USE_MEMORY = os.environ.get("USE_MEMORY", "0") == "1"
USE_APP_MYSQL = os.environ.get("USE_APP_MYSQL", "0") == "1"
USE_WOOCOMMERCE = os.environ.get("USE_WOOCOMMERCE", "0") == "1"
USE_CATALOG_MYSQL = os.environ.get("USE_CATALOG_MYSQL", "1") == "1"
WC_WARM_ON_STARTUP = os.environ.get("WC_WARM_ON_STARTUP", "0") == "1"

# None = unknown, True = reachable, False = fall back to products_seed.json
_CATALOG_MYSQL_LIVE: Optional[bool] = None

mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
client = None
db = None

if data_store.uses_mongo():
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get("DB_NAME", "samphone")]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = os.environ['JWT_ALGORITHM']
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ['ACCESS_TOKEN_EXPIRE_MINUTES'])

security = HTTPBearer(auto_error=False)

_prod = production_mode()
app = FastAPI(
    docs_url=None if _prod else "/docs",
    redoc_url=None if _prod else "/redoc",
    openapi_url=None if _prod else "/openapi.json",
)
api_router = APIRouter(prefix="/api")

if not JWT_SECRET or JWT_SECRET in {"dev-secret-change-in-production", "change-me-in-production", "secret"}:
    logging.getLogger(__name__).warning(
        "JWT_SECRET is weak or default — set a long random value before production"
    )

FRONTEND_ASSETS = (ROOT_DIR.parent / "frontend" / "assets").resolve()
EXPO_PORTS = frozenset({8081, 8085, 19000, 19001})


def _normalize_asset_path(asset_path: str) -> str:
    p = (asset_path or "").replace("\\", "/").lstrip("/")
    while p.startswith("./"):
        p = p[2:]
    if p.startswith("assets/"):
        p = p[7:]
    return p


def _resolve_frontend_asset(asset_path: str) -> Path | None:
    if not FRONTEND_ASSETS.is_dir():
        return None
    rel = _normalize_asset_path(unquote(asset_path or ""))
    if not rel or ".." in rel.split("/"):
        return None
    candidate = (FRONTEND_ASSETS / rel).resolve()
    if not str(candidate).startswith(str(FRONTEND_ASSETS)):
        return None
    return candidate if candidate.is_file() else None


def _frontend_asset_response(asset_path: str) -> FileResponse:
    resolved = _resolve_frontend_asset(asset_path)
    if not resolved:
        raise HTTPException(status_code=404, detail="Asset not found")
    return FileResponse(resolved)


@app.get("/pay")
@app.get("/pay/")
async def branded_stripe_pay(session_id: str = ""):
    """Branded Embedded Checkout — browser shows samphone.cloud, not checkout.stripe.com."""
    import stripe_service

    sid = (session_id or "").strip()
    if not sid:
        return HTMLResponse(
            "<!doctype html><html><body style='font-family:system-ui;padding:32px;text-align:center'>"
            "<h1>Checkout</h1><p>Missing session. Return to the Samphone app and try again.</p>"
            "</body></html>",
            status_code=400,
        )
    try:
        html = await asyncio.to_thread(stripe_service.render_pay_page_html, sid)
    except Exception as exc:
        logging.getLogger(__name__).warning("Branded pay page failed for %s: %s", sid[:24], exc)
        return HTMLResponse(
            "<!doctype html><html><body style='font-family:system-ui;padding:32px;text-align:center'>"
            "<h1>Checkout unavailable</h1><p>This payment link expired or is invalid. "
            "Return to the Samphone app and try again.</p></body></html>",
            status_code=410,
        )
    return HTMLResponse(html)


@app.get("/assets")
@app.get("/assets/")
async def serve_frontend_asset_expo(request: Request):
    """Expo bundle format: /assets/?unstable_path=.%2Fassets%2Fimages%2Ficon.png"""
    unstable = request.query_params.get("unstable_path")
    if unstable:
        return _frontend_asset_response(unstable)
    raise HTTPException(status_code=404, detail="Asset not found")


@app.get("/assets/{asset_path:path}")
async def serve_frontend_asset(asset_path: str):
    """Serve Expo static assets (e.g. icon.png) when requests hit the API host."""
    return _frontend_asset_response(asset_path)


@app.get("/favicon.ico")
async def favicon():
    icon = _resolve_frontend_asset("images/favicon.png") or _resolve_frontend_asset("images/icon.png")
    if not icon:
        raise HTTPException(status_code=404, detail="Favicon not found")
    return FileResponse(icon)


def sort_catalog_products(
    docs: list[dict],
    *,
    category: Optional[str] = None,
    category_group: Optional[str] = None,
    leaf_category: Optional[str] = None,
    model: Optional[str] = None,
    model_wc_id: Optional[int] = None,
) -> list[dict]:
    from catalog_sort import sort_products

    return sort_products(
        docs,
        category=category,
        category_group=category_group,
        leaf_category=leaf_category,
        model=model,
        model_wc_id=model_wc_id,
    )


def _enable_memory_catalog_fallback(reason: str) -> None:
    """Serve local products_seed.json when remote catalog MySQL is unavailable."""
    global USE_MEMORY, _CATALOG_MYSQL_LIVE
    _CATALOG_MYSQL_LIVE = False
    os.environ["USE_MEMORY"] = "1"
    data_store.USE_MEMORY = True
    USE_MEMORY = True
    globals()["USE_MEMORY"] = True
    try:
        if ADMIN_PASSWORD:
            memory_store.seed_admin_user(ADMIN_EMAIL, hash_password(ADMIN_PASSWORD))
    except Exception:
        pass
    try:
        if memory_store.seed_meta(SEED_VERSION):
            logger.info(
                "Local seed catalog ready: %s products (%s)",
                len(PRODUCTS),
                SEED_VERSION,
            )
    except Exception as exc:
        logger.warning("Could not mark memory seed meta: %s", exc)
    logger.warning(
        "Catalog MySQL unavailable — using local products_seed.json. Reason: %s",
        reason,
    )


def _woo_catalog_enabled() -> bool:
    """True when catalog MySQL is configured and not marked unreachable."""
    global _CATALOG_MYSQL_LIVE
    if _CATALOG_MYSQL_LIVE is False:
        return False
    try:
        return bool(get_woo_db().configured())
    except Exception:
        return False


async def _mongo_products_page(query: dict, *, limit: int, offset: int, viewer):
    """Same catalog as GET /products when Woo MySQL is off but Mongo still has items."""
    if db is None:
        return None
    from catalog_pagination import product_page

    lim = max(1, min(int(limit or 50), 200))
    off = max(0, int(offset or 0))
    docs = await db.products.find(query, {"_id": 0}).skip(off).limit(lim).to_list(lim)
    if not docs:
        return None
    total = await db.products.count_documents(query)
    return product_page(sanitize_products(docs, viewer), total, limit=lim, offset=off)


def _is_catalog_connectivity_error(exc: BaseException) -> bool:
    msg = str(exc).lower()
    if "access denied" in msg or "can't connect" in msg or "timed out" in msg:
        return True
    if "max_connections_per_hour" in msg or "gone away" in msg:
        return True
    name = type(exc).__name__
    return name in {"OperationalError", "InterfaceError", "TimeoutError"}


# ---------------- Models ----------------
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: Optional[str] = ""
    account_type: Optional[str] = "b2c"  # b2c | b2b
    business_name: Optional[str] = ""
    vat_number: Optional[str] = ""
    company_address: Optional[str] = ""
    business_type: Optional[str] = ""
    phone: Optional[str] = ""
    address: Optional[str] = ""
    city: Optional[str] = ""
    postal_code: Optional[str] = ""
    language: Optional[str] = "en"
    # Honeypot — bots fill this; humans leave empty
    website: Optional[str] = ""


class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    business_name: Optional[str] = None
    vat_number: Optional[str] = None
    company_address: Optional[str] = None
    business_type: Optional[str] = None
    language: Optional[str] = None


class WholesaleRejectBody(BaseModel):
    reason: str = Field(min_length=1, max_length=500)


class WholesaleApproveBody(BaseModel):
    dealer_tier: Optional[str] = "bronze"
    """Optional extra % off business prices after approval (creates a user discount)."""
    discount_percent: Optional[float] = None
    """all | category — ignored when discount_percent is empty."""
    applies_to: Optional[str] = "all"
    """Category names when applies_to is category."""
    categories: Optional[List[str]] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)
    website: Optional[str] = ""


class ClerkSyncBody(BaseModel):
    """Exchange a Clerk session JWT for an app JWT (keeps business pricing in sync)."""
    clerk_token: str = Field(min_length=20)
    name: Optional[str] = ""
    email: Optional[str] = ""
    account_type: Optional[str] = "b2c"
    business_name: Optional[str] = ""
    vat_number: Optional[str] = ""
    company_address: Optional[str] = ""
    business_type: Optional[str] = ""
    phone: Optional[str] = ""
    address: Optional[str] = ""
    city: Optional[str] = ""
    postal_code: Optional[str] = ""
    country: Optional[str] = ""
    # When true (default), email the user on sign-in for this Clerk session (logout → login).
    notify_login: Optional[bool] = True


class ClerkBootstrapBody(BaseModel):
    """Create a Clerk user via Backend API when frontend signup is stuck on a ghost email reservation."""
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: Optional[str] = ""
    unsafe_metadata: Optional[dict] = None


class OrderItem(BaseModel):
    product_id: str
    title: Optional[str] = ""
    brand: Optional[str] = ""
    # Client price is ignored — server recalculates from catalog + user role
    price: Optional[float] = None
    quantity: int = Field(ge=1, le=999)
    image: Optional[str] = ""


class OrderCreate(BaseModel):
    items: List[OrderItem] = Field(min_length=1)
    # Client subtotal ignored — recalculated server-side
    subtotal: Optional[float] = None
    full_name: str = Field(min_length=1, max_length=200)
    phone: str = Field(min_length=5, max_length=40)
    address: str = Field(min_length=1, max_length=500)
    city: str = Field(min_length=1, max_length=120)
    postal_code: str = Field(min_length=1, max_length=32)
    country: Optional[str] = ""
    company_name: Optional[str] = ""
    vat_number: Optional[str] = ""
    shipping_method: Optional[str] = ""
    notes: Optional[str] = ""
    payment_method: str  # "delivery" | "store" | "card" | "mbway" | "multibanco"
    stripe_payment_intent_id: Optional[str] = None
    stripe_checkout_session_id: Optional[str] = None


class StripeLineItem(BaseModel):
    product_id: str
    quantity: int = Field(ge=1, le=999)


class StripePaymentIntentCreate(BaseModel):
    """Amount is computed server-side from items + authenticated user pricing."""
    items: List[StripeLineItem] = Field(min_length=1)
    email: str = ""
    order_ref: str = Field(default="", max_length=120)
    # Preferred method for PaymentIntent: card | mbway | multibanco/bank (optional)
    payment_method: Optional[str] = ""
    success_url: Optional[str] = ""
    cancel_url: Optional[str] = ""
    return_url: Optional[str] = ""
    # Checkout fallback only: hosted = checkout.stripe.com; elements/embedded = clientSecret
    ui_mode: Optional[str] = "hosted"
    # Legacy field — ignored if present (clients must not set charge amount)
    amount: Optional[float] = None


class StockLine(BaseModel):
    product_id: str
    quantity: int = Field(ge=1, le=999)


class StockPurchase(BaseModel):
    items: List[StockLine] = Field(min_length=1)


class StockNotify(BaseModel):
    product_id: str
    email: EmailStr
    website: Optional[str] = ""


class StockUpdate(BaseModel):
    stock_quantity: Optional[int] = Field(default=None, ge=0)
    retailPrice: Optional[float] = None
    regularPrice: Optional[float] = None
    b2c_price: Optional[float] = None
    dealerOnly: Optional[bool] = None
    dealer_only: Optional[bool] = None
    moq: Optional[float] = None
    min_order_qty: Optional[float] = None


class AdminProductEdit(BaseModel):
    stock_quantity: Optional[int] = Field(default=None, ge=0)
    regular_price: Optional[float] = Field(default=None, ge=0)
    sale_price: Optional[float] = Field(default=None, ge=0)
    clear_sale: bool = False
    b2c_price: Optional[float] = Field(default=None, ge=0)
    clear_b2c: bool = False
    compare_at_price: Optional[float] = Field(default=None, ge=0)
    image_url: Optional[str] = Field(default=None, max_length=1024)
    clear_image: bool = False


class AdminProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=400)
    sku: Optional[str] = Field(default="", max_length=120)
    description: Optional[str] = Field(default="", max_length=8000)
    b2b_price: Optional[float] = Field(default=None, ge=0)
    regular_price: Optional[float] = Field(default=None, ge=0)
    b2c_price: Optional[float] = Field(default=None, ge=0)
    image_url: Optional[str] = Field(default="", max_length=1024)
    stock_quantity: Optional[int] = Field(default=None, ge=0)


class VoiceParseBody(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    language: Optional[str] = None


class TranslateBody(BaseModel):
    texts: List[str]
    target: str = "pt"


class SavedCartItem(BaseModel):
    product_id: str
    title: str = ""
    brand: str = ""
    price: float = 0
    quantity: int = Field(ge=1)
    image: str = ""


class SavedCartUpsert(BaseModel):
    items: List[SavedCartItem]
    subtotal: float = 0


# ---------------- Auth utils ----------------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(pw: str, hashed: str) -> bool:
    try:
        if not pw or not hashed:
            return False
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_token(email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": email, "exp": expire}, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _clerk_issuer() -> str:
    return (
        os.environ.get("CLERK_JWT_ISSUER", "").strip().rstrip("/")
        or "https://positive-perch-42.clerk.accounts.dev"
    )


def _clerk_secret() -> str:
    secret = os.environ.get("CLERK_SECRET_KEY", "").strip()
    if not secret:
        raise HTTPException(status_code=503, detail="CLERK_SECRET_KEY not configured")
    return secret


def _clerk_headers() -> dict:
    return {
        "Authorization": f"Bearer {_clerk_secret()}",
        "User-Agent": "samphone-backend/1.0",
        "Content-Type": "application/json",
    }


def _clerk_find_users_by_email(email: str) -> list:
    import requests

    email = (email or "").strip().lower()
    if not email or "@" not in email:
        return []
    resp = requests.get(
        "https://api.clerk.com/v1/users",
        headers=_clerk_headers(),
        params={"email_address": [email], "limit": 10},
        timeout=15,
    )
    if resp.status_code >= 400:
        raise HTTPException(status_code=503, detail="Clerk user lookup failed")
    data = resp.json()
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and isinstance(data.get("data"), list):
        return data["data"]
    return []


def _clerk_delete_users_by_email(email: str) -> int:
    """Best-effort Clerk user delete for GDPR account removal."""
    import requests

    users = _clerk_find_users_by_email(email)
    deleted = 0
    for row in users:
        uid = (row.get("id") or "").strip()
        if not uid:
            continue
        resp = requests.delete(
            f"https://api.clerk.com/v1/users/{uid}",
            headers=_clerk_headers(),
            timeout=15,
        )
        if resp.status_code < 400 or resp.status_code == 404:
            deleted += 1
        else:
            logger.warning("Clerk delete user %s failed: HTTP %s", uid, resp.status_code)
    return deleted


def _clerk_email_from_user(clerk_user: dict) -> str:
    emails = clerk_user.get("email_addresses") or []
    primary_id = clerk_user.get("primary_email_address_id")
    email = ""
    for row in emails:
        if not isinstance(row, dict):
            continue
        addr = (row.get("email_address") or "").strip().lower()
        if row.get("id") == primary_id or not email:
            email = addr
            if row.get("id") == primary_id:
                break
    return email


def _clerk_phone_from_user(clerk_user: dict) -> str:
    phones = clerk_user.get("phone_numbers") or []
    primary_phone_id = clerk_user.get("primary_phone_number_id")
    phone = ""
    for row in phones:
        if not isinstance(row, dict):
            continue
        num = (row.get("phone_number") or "").strip()
        if row.get("id") == primary_phone_id or not phone:
            phone = num
            if row.get("id") == primary_phone_id:
                break
    return phone


def _clerk_admin_row(clerk_user: dict) -> Optional[dict]:
    email = _clerk_email_from_user(clerk_user)
    phone = _clerk_phone_from_user(clerk_user)
    if not email:
        digits = "".join(ch for ch in phone if ch.isdigit())
        email = f"{digits}@phone.users.samphone.cloud" if digits else ""
    if not email:
        return None
    unsafe = clerk_user.get("unsafe_metadata") if isinstance(clerk_user.get("unsafe_metadata"), dict) else {}
    public = clerk_user.get("public_metadata") if isinstance(clerk_user.get("public_metadata"), dict) else {}
    account = str(unsafe.get("accountType") or public.get("accountType") or "b2c").strip().lower()
    if account not in {"b2b", "b2c"}:
        account = "b2c"
    first = (clerk_user.get("first_name") or "").strip()
    last = (clerk_user.get("last_name") or "").strip()
    name = f"{first} {last}".strip() or email.split("@")[0]
    business_name = str(unsafe.get("businessName") or unsafe.get("business_name") or "")
    vat_number = str(unsafe.get("vatNumber") or unsafe.get("vat_number") or "")
    from wholesale import match_temporary_clerk_b2c

    guest = match_temporary_clerk_b2c(email=email, phone=phone)
    if guest:
        account = "b2c"
        business_name = ""
        vat_number = ""
        if guest.get("email"):
            email = str(guest["email"]).strip().lower()
        if guest.get("name") and not (first or last):
            name = str(guest["name"])
    created = clerk_user.get("created_at")
    created_iso = ""
    if isinstance(created, (int, float)) and created > 0:
        created_iso = datetime.fromtimestamp(float(created) / 1000.0, tz=timezone.utc).isoformat()
    return {
        "id": clerk_user.get("id") or email,
        "clerk_id": clerk_user.get("id"),
        "email": email,
        "name": name,
        "phone": phone or str(unsafe.get("phone") or ""),
        "role": "customer",
        "accountType": account,
        "businessName": business_name,
        "vatNumber": vat_number,
        "wholesaleStatus": None if account == "b2c" else (unsafe.get("wholesaleStatus") or "pending"),
        "isWholesale": False,
        "source": "clerk",
        "created_at": created_iso,
        "createdAt": created_iso,
    }


def _clerk_list_admin_users(max_users: int = 1500) -> list[dict]:
    import requests

    secret = os.environ.get("CLERK_SECRET_KEY", "").strip()
    if not secret:
        return []
    out: list[dict] = []
    offset = 0
    page = 100
    while len(out) < max_users:
        try:
            resp = requests.get(
                "https://api.clerk.com/v1/users",
                headers=_clerk_headers(),
                params={"limit": page, "offset": offset, "order_by": "-created_at"},
                timeout=20,
            )
        except Exception:
            logger.exception("Clerk list users failed")
            break
        if resp.status_code >= 400:
            logger.warning("Clerk list users HTTP %s: %s", resp.status_code, (resp.text or "")[:240])
            break
        raw = resp.json()
        if isinstance(raw, list):
            batch = raw
        elif isinstance(raw, dict):
            nested = raw.get("data") or raw.get("users") or raw.get("items")
            batch = nested if isinstance(nested, list) else []
        else:
            batch = []
        if not batch:
            break
        for cu in batch:
            if isinstance(cu, dict):
                row = _clerk_admin_row(cu)
                if row:
                    out.append(row)
        if len(batch) < page:
            break
        offset += page
    return out


def _merge_admin_users(app_users: list[dict], clerk_users: list[dict]) -> list[dict]:
    by_email: dict[str, dict] = {}
    for row in clerk_users:
        email = str(row.get("email") or "").strip().lower()
        if email:
            by_email[email] = dict(row)
    for row in app_users:
        merged = dict(row)
        email = str(merged.get("email") or "").strip().lower()
        if email and email in by_email:
            clerk = by_email[email]
            from wholesale import is_business_account

            merged.setdefault("clerk_id", clerk.get("clerk_id"))
            if is_business_account(merged) or is_business_account(clerk):
                merged["accountType"] = "b2b"
                merged["businessName"] = merged.get("businessName") or clerk.get("businessName") or ""
                merged["vatNumber"] = merged.get("vatNumber") or clerk.get("vatNumber") or ""
                merged["wholesaleStatus"] = merged.get("wholesaleStatus") or clerk.get("wholesaleStatus")
            elif not str(merged.get("accountType") or "").strip():
                merged["accountType"] = clerk.get("accountType") or "b2c"
            merged["source"] = merged.get("source") or "clerk"
            by_email[email] = merged
        elif email:
            merged.setdefault("source", "app")
            by_email[email] = merged
        else:
            merged.setdefault("source", "app")
            by_email[str(merged.get("id") or len(by_email))] = merged
    return list(by_email.values())


def _verify_clerk_session_token(token: str) -> dict:
    """Verify Clerk session JWT via JWKS, then load the user from Clerk Backend API."""
    import requests
    from jose import jwt as jose_jwt

    issuer = _clerk_issuer()
    try:
        jwks_resp = requests.get(
            f"{issuer}/.well-known/jwks.json",
            timeout=10,
            headers={"User-Agent": "samphone-backend/1.0"},
        )
        jwks_resp.raise_for_status()
        jwks = jwks_resp.json()
    except Exception as exc:
        raise safe_http_error(503, "Authentication service unavailable", exc, log_msg="Clerk JWKS") from exc

    try:
        headers = jose_jwt.get_unverified_header(token)
        kid = headers.get("kid")
        key = next((k for k in jwks.get("keys") or [] if k.get("kid") == kid), None)
        if not key:
            raise HTTPException(status_code=401, detail="Invalid Clerk token key")
        claims = jose_jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            issuer=issuer,
            options={"verify_aud": False},
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise safe_http_error(401, "Invalid session", exc, log_msg="Clerk JWT decode") from exc

    user_id = (claims.get("sub") or "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="Clerk token missing subject")

    secret = os.environ.get("CLERK_SECRET_KEY", "").strip()
    if not secret:
        raise HTTPException(status_code=503, detail="CLERK_SECRET_KEY not configured")

    try:
        user_resp = requests.get(
            f"https://api.clerk.com/v1/users/{user_id}",
            headers={
                "Authorization": f"Bearer {secret}",
                "User-Agent": "samphone-backend/1.0",
            },
            timeout=15,
        )
        if user_resp.status_code == 404:
            raise HTTPException(status_code=401, detail="Clerk user not found")
        user_resp.raise_for_status()
        clerk_user = user_resp.json()
    except HTTPException:
        raise
    except Exception as exc:
        raise safe_http_error(401, "Invalid session", exc, log_msg="Clerk user lookup") from exc

    emails = clerk_user.get("email_addresses") or []
    primary_id = clerk_user.get("primary_email_address_id")
    email = ""
    for row in emails:
        if row.get("id") == primary_id or not email:
            email = (row.get("email_address") or "").strip().lower()
            if row.get("id") == primary_id:
                break
    phones = clerk_user.get("phone_numbers") or []
    primary_phone_id = clerk_user.get("primary_phone_number_id")
    phone = ""
    for row in phones:
        if row.get("id") == primary_phone_id or not phone:
            phone = (row.get("phone_number") or "").strip()
            if row.get("id") == primary_phone_id:
                break
    if not email or "@" not in email:
        digits = "".join(ch for ch in phone if ch.isdigit())
        if digits:
            email = f"{digits}@phone.users.samphone.cloud"
        else:
            raise HTTPException(status_code=400, detail="Clerk user has no email")

    first = (clerk_user.get("first_name") or "").strip()
    last = (clerk_user.get("last_name") or "").strip()
    full_name = f"{first} {last}".strip()
    unsafe = clerk_user.get("unsafe_metadata") or {}
    if not isinstance(unsafe, dict):
        unsafe = {}
    return {
        "email": email,
        "name": full_name,
        "clerk_id": user_id,
        "sid": (claims.get("sid") or "").strip(),
        "unsafe_metadata": unsafe,
        "phone": phone,
    }


# One login-notification email per Clerk session id (logout → new session → new email).
_login_email_clerk_sids: dict[str, float] = {}
_LOGIN_EMAIL_SID_TTL_SEC = 7 * 24 * 3600
_LOGIN_EMAIL_NOSID_COOLDOWN_SEC = 3600


def _clerk_login_email_due(sid: str, email: str = "") -> bool:
    """Return True once per Clerk session so token refreshes do not spam the user."""
    now = time.time()
    stale = [k for k, ts in _login_email_clerk_sids.items() if now - ts > _LOGIN_EMAIL_SID_TTL_SEC]
    for k in stale:
        _login_email_clerk_sids.pop(k, None)
    key = (sid or "").strip()
    if not key:
        key = f"email:{(email or '').strip().lower()}"
        prev = _login_email_clerk_sids.get(key)
        if prev and now - prev < _LOGIN_EMAIL_NOSID_COOLDOWN_SEC:
            return False
        _login_email_clerk_sids[key] = now
        return True
    if key in _login_email_clerk_sids:
        return False
    _login_email_clerk_sids[key] = now
    return True


def _app_mysql_enabled() -> bool:
    return data_store.app_mysql_enabled()


async def _load_user_by_email(email: str) -> Optional[dict]:
    return await data_store.find_user(email, db)


async def _attach_active_discounts(user: Optional[dict]) -> Optional[dict]:
    """Attach active personal discounts for authenticated pricing only. Guests stay None."""
    if not user or not user.get("id"):
        return user
    try:
        rows = await data_store.list_active_user_discounts(user["id"], db)
    except Exception:
        rows = []
    out = dict(user)
    out["_active_discounts"] = rows
    return out


_admin_user_cache: dict[str, tuple[float, dict]] = {}
_ADMIN_USER_CACHE_TTL = 45.0


def _email_from_access_token(token: str) -> str:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return str(payload.get("sub") or "").strip().lower()
    except JWTError:
        clerk = _verify_clerk_session_token(token)
        return str(clerk.get("email") or "").strip().lower()


async def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if creds is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        email = _email_from_access_token(creds.credentials)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token")
    email_key = (email or "").strip().lower()
    cached = _admin_user_cache.get(email_key)
    if cached and (time.time() - cached[0]) < _ADMIN_USER_CACHE_TTL and cached[1].get("role") == "admin":
        return cached[1]
    try:
        user = await _load_user_by_email(email)
    except Exception as exc:
        msg = str(exc)
        if "max_connections_per_hour" in msg or "1226" in msg:
            # Serve cached admin identity during Hostinger quota blips.
            if cached and cached[1].get("role") == "admin":
                return cached[1]
            raise HTTPException(
                status_code=503,
                detail="Database temporarily unavailable (Hostinger hourly connection quota). Try again later.",
            ) from exc
        raise
    if not user:
        if is_admin_email(email):
            try:
                pwd_hash = hash_password(ADMIN_PASSWORD or secrets.token_urlsafe(24))
                user = await data_store.seed_admin_user(email, pwd_hash, db)
            except Exception:
                user = None
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
    public = user_public_wholesale(user)
    if is_admin_email(email):
        public = _elevate_clerk_admin({**public, "email": email})
    # Admin polls don't need personal-discount lookups (extra MySQL round-trips).
    if public.get("role") == "admin":
        _admin_user_cache[email_key] = (time.time(), public)
        return public
    return await _attach_active_discounts(public)


async def get_optional_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if creds is None:
        return None
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email = payload.get("sub")
    except JWTError:
        return None
    user = await _load_user_by_email(email)
    if not user:
        return None
    return await _attach_active_discounts(user_public_wholesale(user))


async def require_wholesale_approval(current=Depends(get_current_user)):
    if not is_wholesale_approved(current):
        raise HTTPException(status_code=403, detail="Wholesale approval required")
    return current


async def get_current_admin(current=Depends(get_current_user)):
    if current.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current


def user_public(user: dict) -> dict:
    return user_public_wholesale(user)


# ---------------- Auth routes ----------------
def _send_welcome_email_task(user: dict) -> None:
    try:
        from email_service import send_welcome_email

        send_welcome_email(user)
    except Exception as exc:
        logger.warning("Welcome email failed for %s: %s", user.get("email"), exc)


def _send_wholesale_pending_email_task(user: dict) -> None:
    try:
        from email_service import send_wholesale_pending_email

        send_wholesale_pending_email(user)
    except Exception as exc:
        logger.warning("Wholesale pending email failed for %s: %s", user.get("email"), exc)


def _notify_admin_wholesale_pending(user_or_email) -> None:
    """Push a wholesale approval alert into the admin notifications feed + device push."""
    if isinstance(user_or_email, dict):
        user = user_or_email
        email = (user.get("email") or "").strip().lower()
        name = (user.get("name") or "").strip()
        business = (user.get("businessName") or user.get("business_name") or "").strip()
        who = business or name or email or "Someone"
        msg = f"{who} applied for a business account ({email}) — review in Wholesale"
    else:
        email = (user_or_email or "").strip().lower()
        msg = f"Business signup awaiting approval: {email}"
        who = email or "Someone"
    try:
        if _app_mysql_enabled():
            get_app_db().add_admin_notification("wholesale_request", msg)
        elif USE_MEMORY:
            memory_store.add_admin_notification("wholesale_request", msg)
    except Exception:
        logger.debug("Could not add admin wholesale notification for %s", email, exc_info=True)

    # Best-effort device push (sync wrapper — fire-and-forget via thread).
    try:
        import threading
        from notify import push_admin_alert

        def _run():
            import asyncio

            try:
                asyncio.run(
                    push_admin_alert(
                        "wholesale_request",
                        "Business application",
                        msg,
                        data={"route": "/admin/wholesale"},
                    )
                )
            except Exception:
                logger.debug("Admin push failed", exc_info=True)

        threading.Thread(target=_run, daemon=True).start()
    except Exception:
        logger.debug("Could not schedule admin push", exc_info=True)


def _send_admin_signup_email_task(user: dict) -> None:
    try:
        from email_service import send_admin_signup_email

        send_admin_signup_email(user)
    except Exception as exc:
        logger.warning("Admin signup email failed for %s: %s", user.get("email"), exc)


def _send_admin_business_application_email_task(user: dict) -> None:
    try:
        from email_service import send_admin_business_application_email

        ok = send_admin_business_application_email(user)
        if not ok:
            logger.warning(
                "Admin business-application email did not send for %s",
                user.get("email"),
            )
    except Exception as exc:
        logger.warning("Admin business-application email failed for %s: %s", user.get("email"), exc)


def _alert_admins_of_business_application(
    background_tasks: BackgroundTasks,
    user: dict,
    *,
    in_app: bool = True,
) -> None:
    """Email samphone.pt@gmail.com + optional in-app admin notification."""
    if user.get("role") == "admin":
        return
    background_tasks.add_task(_send_admin_business_application_email_task, dict(user))
    if in_app:
        _notify_admin_wholesale_pending(user)


def _send_wholesale_decision_email_task(user: dict, *, approved: bool, reason: str = "") -> None:
    try:
        from email_service import send_wholesale_decision_email

        send_wholesale_decision_email(user, approved=approved, reason=reason)
    except Exception as exc:
        logger.warning("Wholesale decision email failed for %s: %s", user.get("email"), exc)


def _send_login_email_task(user: dict) -> None:
    try:
        from email_service import send_login_email

        send_login_email(user)
    except Exception as exc:
        logger.warning("Login email failed for %s: %s", user.get("email"), exc)


def _is_business_signup(body: UserCreate) -> bool:
    account = (body.account_type or "").strip().lower()
    return account == "b2b" or bool((body.business_name or "").strip() or (body.vat_number or "").strip())


def _build_user_from_register(body: UserCreate) -> dict:
    has_business = _is_business_signup(body)
    user = {
        "id": str(uuid.uuid4()),
        "email": body.email.lower(),
        "name": body.name or body.email.split("@")[0],
        "hashed_password": hash_password(body.password),
        "role": "customer",
        "created_at": datetime.now(timezone.utc).isoformat(),
        **default_wholesale_user_fields(),
        "accountType": "b2b" if has_business else "b2c",
        "businessName": (body.business_name or "").strip(),
        "vatNumber": (body.vat_number or "").strip(),
        "companyAddress": (body.company_address or "").strip(),
        "businessType": (body.business_type or "").strip(),
        "phone": (body.phone or "").strip(),
        "address": (body.address or "").strip(),
        "city": (body.city or "").strip(),
        "postal_code": (body.postal_code or "").strip(),
        "language": normalize_language(body.language),
    }
    if has_business:
        user["accountType"] = "b2b"
        user["isWholesale"] = False
        user["wholesaleStatus"] = "pending"
    else:
        user["accountType"] = "b2c"
        user["wholesaleStatus"] = None
        user["isWholesale"] = False
    return _elevate_clerk_admin(user)


def _queue_signup_emails(background_tasks: BackgroundTasks, user: dict, *, pending_notice: bool) -> None:
    if user.get("role") == "admin":
        return
    if pending_notice and (user.get("accountType") == "b2b" or user.get("wholesaleStatus") == "pending"):
        # Applicant confirmation + dedicated admin business-application email.
        background_tasks.add_task(_send_wholesale_pending_email_task, dict(user))
        background_tasks.add_task(_send_admin_business_application_email_task, dict(user))
    else:
        background_tasks.add_task(_send_welcome_email_task, dict(user))
        background_tasks.add_task(_send_admin_signup_email_task, dict(user))


def _reload_admin_credentials() -> tuple[str, str, set[str]]:
    """Re-read admin inbox/password from .env so login always matches the file on disk."""
    load_dotenv(ROOT_DIR / ".env", override=True)
    email = os.environ.get("ADMIN_EMAIL", "samphone.pt@gmail.com").strip().lower()
    password = os.environ.get("ADMIN_PASSWORD", "").strip()
    return email, password, {email} if email else set()


ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_EMAILS = _reload_admin_credentials()
# Same inbox as ADMIN_EMAIL — kept for env compatibility; only ADMIN_EMAIL is the login.
CLERK_ADMIN_EMAIL = os.environ.get("CLERK_ADMIN_EMAIL", ADMIN_EMAIL).strip().lower() or ADMIN_EMAIL

if not ADMIN_PASSWORD:
    logging.getLogger(__name__).warning(
        "ADMIN_PASSWORD is not set — /auth/admin-login will reject all attempts"
    )


def is_admin_email(email: str | None) -> bool:
    return (email or "").strip().lower() in ADMIN_EMAILS


def _elevate_clerk_admin(user: dict) -> dict:
    """Elevate the allowlisted admin inbox to a full admin account."""
    if not is_admin_email(user.get("email")):
        return user
    user = dict(user)
    user["role"] = "admin"
    user["accountType"] = "b2b"
    user["isWholesale"] = True
    user["wholesaleStatus"] = "approved"
    if not (user.get("businessName") or "").strip():
        user["businessName"] = "Samphone"
    return user


@api_router.post("/auth/register")
async def register(body: UserCreate, request: Request, background_tasks: BackgroundTasks):
    reject_honeypot(body.website)
    email = body.email.lower()
    auth_attempt_limit(request, email, bucket="auth_register", per_account=5, per_ip=40)
    if email == ADMIN_EMAIL:
        raise HTTPException(status_code=400, detail="This email is reserved for admin login")
    existing = await data_store.find_user(email, db)
    if existing:
        # Never overwrite password for an existing account (account-takeover vector).
        raise HTTPException(status_code=400, detail="Email already registered")

    user = _build_user_from_register(body)
    await data_store.insert_user(user, db)
    pending_notice = user.get("role") != "admin" and (
        user.get("accountType") == "b2b" or user.get("wholesaleStatus") == "pending"
    )
    _queue_signup_emails(background_tasks, user, pending_notice=pending_notice)
    token = create_token(user["email"])
    return {"access_token": token, "user": user_public(user)}


@api_router.post("/auth/login")
async def login(body: UserLogin, request: Request, background_tasks: BackgroundTasks):
    global ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_EMAILS
    reject_honeypot(body.website)
    ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_EMAILS = _reload_admin_credentials()
    email = body.email.strip().lower()
    from wholesale import match_temporary_clerk_b2c

    guest_login = match_temporary_clerk_b2c(email=email, phone="")
    if is_admin_email(email):
        rate_limit(request, "auth_login_ip", limit=80, window_sec=60)
        login_lockout.clear(f"login:{email}")
    elif guest_login:
        login_lockout.clear(f"login:{email}")
        rate_limit(request, "auth_login_ip", limit=80, window_sec=60)
    else:
        auth_attempt_limit(request, email, bucket="auth_login", per_account=8, per_ip=80)
    password = body.password.strip()
    lock_key = f"login:{email}"
    if not is_admin_email(email) and not guest_login:
        login_lockout.assert_allowed(lock_key)

    # Single admin inbox — same credentials as /auth/admin-login.
    if email == ADMIN_EMAIL and ADMIN_PASSWORD:
        if password != ADMIN_PASSWORD:
            login_lockout.record_failure(lock_key)
            raise HTTPException(status_code=400, detail="Incorrect email or password")
        login_lockout.clear(lock_key)
        user = await data_store.seed_admin_user(email, hash_password(ADMIN_PASSWORD), db)
        if not user:
            raise HTTPException(status_code=500, detail="Admin user not available")
        user = {**user, "role": "admin", "email": email}
        background_tasks.add_task(_send_login_email_task, dict(user))
        token = create_token(email)
        return {"access_token": token, "user": user_public(user)}

    user = await data_store.find_user(email, db)
    authenticated = bool(user and verify_password(password, user["hashed_password"]))
    is_new_signup = False
    became_wholesale_pending = False

    # Existing WooCommerce / WordPress customers (wp_users) can sign in with
    # their website password without registering again in the app.
    if not authenticated:
        from wp_auth import authenticate_wp_user, wp_profile_to_app_user

        wp_profile = await asyncio.to_thread(authenticate_wp_user, email, password)
        if not wp_profile:
            wp_profile = await asyncio.to_thread(authenticate_wp_user, body.email.strip(), password)
        if wp_profile:
            bcrypt_hash = hash_password(password)
            if user:
                updates = {"hashed_password": bcrypt_hash}
                if not (user.get("name") or "").strip():
                    updates["name"] = wp_profile.get("name") or user.get("name") or ""
                if not (user.get("phone") or "").strip() and wp_profile.get("phone"):
                    updates["phone"] = wp_profile["phone"]
                if wp_profile.get("is_wholesale_role") and user.get("accountType") != "b2b":
                    updates["accountType"] = "b2b"
                    updates["businessName"] = user.get("businessName") or wp_profile.get("businessName") or ""
                    if not user.get("wholesaleStatus"):
                        updates["wholesaleStatus"] = "pending"
                        updates["isWholesale"] = False
                        became_wholesale_pending = True
                user = await data_store.update_user(email, updates, db) or {**user, **updates}
            else:
                user = wp_profile_to_app_user(wp_profile, hashed_password=bcrypt_hash)
                user["email"] = email or user["email"]
                await data_store.insert_user(user, db)
                user = await data_store.find_user(user["email"], db) or user
                is_new_signup = True
            authenticated = True

    if not authenticated or not user:
        login_lockout.record_failure(lock_key)
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    login_lockout.clear(lock_key)
    elevated = _elevate_clerk_admin(user)
    if elevated.get("role") != user.get("role") or elevated.get("wholesaleStatus") != user.get("wholesaleStatus"):
        user = await data_store.update_user(
            email,
            {
                "role": elevated.get("role"),
                "accountType": elevated.get("accountType"),
                "isWholesale": elevated.get("isWholesale"),
                "wholesaleStatus": elevated.get("wholesaleStatus"),
                "businessName": elevated.get("businessName"),
            },
            db,
        ) or elevated
    else:
        user = elevated

    if is_new_signup and user.get("role") != "admin":
        pending_notice = user.get("accountType") == "b2b" or user.get("wholesaleStatus") == "pending"
        _queue_signup_emails(background_tasks, user, pending_notice=pending_notice)
    elif became_wholesale_pending and user.get("role") != "admin":
        _queue_signup_emails(background_tasks, user, pending_notice=True)
        _notify_admin_wholesale_pending(user)
    else:
        background_tasks.add_task(_send_login_email_task, dict(user))
    import mfa as mfa_mod

    if mfa_mod.login_mfa_required(user):
        return mfa_mod.issue_challenge(user["email"], background_tasks)
    token = create_token(user["email"])
    return {"access_token": token, "user": user_public(user)}


@api_router.post("/auth/admin-login")
async def admin_login(body: UserLogin, request: Request):
    """Dedicated admin login — password from ADMIN_PASSWORD env only."""
    global ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_EMAILS
    reject_honeypot(body.website)
    ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_EMAILS = _reload_admin_credentials()
    email = body.email.strip().lower()
    if is_admin_email(email):
        rate_limit(request, "auth_admin_login_ip", limit=80, window_sec=60)
        login_lockout.clear(f"admin_login:{email}")
        login_lockout.clear(f"login:{email}")
    else:
        auth_attempt_limit(request, email, bucket="auth_admin_login", per_account=12, per_ip=40)
    password = body.password.strip()
    lock_key = f"admin_login:{email}"
    if not is_admin_email(email):
        login_lockout.assert_allowed(lock_key)
    if not ADMIN_PASSWORD:
        raise HTTPException(status_code=503, detail="Admin login is not configured (ADMIN_PASSWORD)")
    if email != ADMIN_EMAIL:
        login_lockout.record_failure(lock_key)
        raise HTTPException(
            status_code=400,
            detail=f"Wrong admin email. Use: {ADMIN_EMAIL}",
        )
    if password != ADMIN_PASSWORD:
        login_lockout.record_failure(lock_key)
        raise HTTPException(status_code=400, detail="Incorrect admin password")
    login_lockout.clear(lock_key)
    try:
        user = await data_store.seed_admin_user(email, hash_password(ADMIN_PASSWORD), db)
    except Exception as exc:
        logger.exception("Admin seed failed for %s: %s", email, exc)
        raise HTTPException(status_code=500, detail="Admin user not available") from exc
    if not user:
        raise HTTPException(status_code=500, detail="Admin user not available")
    user = {**user, "role": "admin", "email": email}
    token = create_token(email)
    return {"access_token": token, "user": user_public(user)}


@api_router.post("/auth/clerk-sync")
async def clerk_sync(body: ClerkSyncBody, request: Request, background_tasks: BackgroundTasks):
    """
    Verify Clerk session JWT and issue an app JWT so product APIs apply business pricing.
    Creates / upgrades the app user as B2B when Clerk metadata (or body) says business.
    Allowlisted ADMIN_EMAIL becomes a full admin session (Google / Clerk password OK).
    """
    global ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_EMAILS
    rate_limit(request, "auth_clerk_sync", limit=120, window_sec=60)
    clerk = _verify_clerk_session_token(body.clerk_token.strip())
    email = clerk["email"]
    ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_EMAILS = _reload_admin_credentials()

    # Allowlisted admin inbox — Clerk already verified the email (incl. Google OAuth).
    if is_admin_email(email):
        pwd_hash = hash_password(ADMIN_PASSWORD or secrets.token_urlsafe(24))
        try:
            user = await data_store.seed_admin_user(email, pwd_hash, db)
        except Exception as exc:
            logger.exception("Admin seed via clerk-sync failed for %s: %s", email, exc)
            raise HTTPException(status_code=500, detail="Admin user not available") from exc
        if not user:
            raise HTTPException(status_code=500, detail="Admin user not available")
        user = {
            **user,
            "role": "admin",
            "email": email,
            "accountType": "b2b",
            "isWholesale": True,
            "wholesaleStatus": "approved",
            "name": (clerk.get("name") or user.get("name") or "Admin"),
        }
        try:
            user = await data_store.update_user(
                email,
                {
                    "role": "admin",
                    "accountType": "b2b",
                    "isWholesale": True,
                    "wholesaleStatus": "approved",
                    "name": user.get("name"),
                },
                db,
            ) or user
        except Exception:
            pass
        token = create_token(email)
        return {"access_token": token, "user": user_public(user)}

    meta = clerk.get("unsafe_metadata") or {}
    phone = (body.phone or clerk.get("phone") or meta.get("phone") or "").strip()
    from wholesale import match_temporary_clerk_b2c

    guest = match_temporary_clerk_b2c(email=email, phone=phone) or match_temporary_clerk_b2c(
        email=str(body.email or "").strip().lower(),
        phone=phone,
    )
    if guest:
        login_lockout.clear(f"login:{email}")
        if guest.get("email"):
            login_lockout.clear(f"login:{guest['email']}")
            email = str(guest["email"]).strip().lower()
        if guest.get("phone"):
            phone = str(guest["phone"])
        account_type = "b2c"
        business_name = ""
        vat_number = ""
        business_type = ""
        has_business = False
        display_name = (
            (body.name or "").strip()
            or str(guest.get("name") or "").strip()
            or clerk.get("name")
            or email.split("@")[0]
        )
    else:
        account_type = (body.account_type or meta.get("accountType") or "b2c")
        account_type = str(account_type).strip().lower()
        business_name = (body.business_name or meta.get("businessName") or "").strip()
        vat_number = (body.vat_number or meta.get("vatNumber") or "").strip()
        business_type = (body.business_type or meta.get("businessType") or "").strip()
        display_name = (
            (body.name or "").strip()
            or str(meta.get("displayName") or "").strip()
            or clerk.get("name")
            or email.split("@")[0]
        )
        has_business = account_type == "b2b" or bool(business_name or vat_number)

    existing = await data_store.find_user(email, db)
    send_pending = False
    is_new_signup = False
    if existing:
        updates: dict = {
            "name": display_name or existing.get("name") or email.split("@")[0],
            "phone": phone or existing.get("phone") or "",
        }
        if (body.address or "").strip():
            updates["address"] = body.address.strip()
        if (body.city or "").strip():
            updates["city"] = body.city.strip()
        if (body.postal_code or "").strip():
            updates["postal_code"] = body.postal_code.strip()
        if has_business:
            status = (existing.get("wholesaleStatus") or "").strip().lower()
            updates["accountType"] = "b2b"
            updates["businessName"] = business_name or existing.get("businessName") or ""
            updates["vatNumber"] = vat_number or existing.get("vatNumber") or ""
            updates["businessType"] = business_type or existing.get("businessType") or ""
            updates["companyAddress"] = (body.company_address or "").strip() or existing.get("companyAddress") or ""
            if status not in {"approved", "suspended"}:
                updates["isWholesale"] = False
                updates["wholesaleStatus"] = "pending"
                send_pending = status != "pending"
        elif guest:
            updates.update(
                {
                    "accountType": "b2c",
                    "isWholesale": False,
                    "wholesaleStatus": None,
                    "businessName": "",
                    "vatNumber": "",
                    "businessType": "",
                }
            )
        elevated = _elevate_clerk_admin({**existing, **updates})
        if elevated.get("role") == "admin":
            updates.update(
                {
                    "role": "admin",
                    "accountType": elevated.get("accountType"),
                    "isWholesale": elevated.get("isWholesale"),
                    "wholesaleStatus": elevated.get("wholesaleStatus"),
                    "businessName": elevated.get("businessName"),
                }
            )
            send_pending = False
        user = await data_store.update_user(email, updates, db) or {**existing, **updates}
    else:
        fake_body = UserCreate(
            email=email,
            password=secrets.token_urlsafe(24),
            name=display_name,
            account_type="b2b" if has_business else "b2c",
            business_name=business_name,
            vat_number=vat_number,
            company_address=(body.company_address or "").strip(),
            business_type=business_type,
            phone=phone,
        )
        user = _build_user_from_register(fake_body)
        await data_store.insert_user(user, db)
        is_new_signup = True
        send_pending = user.get("role") != "admin" and (
            user.get("accountType") == "b2b" or user.get("wholesaleStatus") == "pending"
        )

    if send_pending:
        _queue_signup_emails(background_tasks, user, pending_notice=True)
        # insert_user already notifies for brand-new B2B rows; only alert on upgrades.
        if existing:
            _notify_admin_wholesale_pending(user)
    elif is_new_signup:
        # New personal (B2C) account via Clerk — welcome user + notify admin inbox.
        _queue_signup_emails(background_tasks, user, pending_notice=False)
    elif body.notify_login is not False and user.get("role") != "admin":
        # Returning user after logout / new Clerk session — security sign-in notice.
        if _clerk_login_email_due(clerk.get("sid") or "", email):
            background_tasks.add_task(_send_login_email_task, dict(user))

    token = create_token(user["email"])
    return {"access_token": token, "user": user_public(user)}


@api_router.get("/auth/clerk-email-status")
async def clerk_email_status(email: str):
    """
    Check whether an email already has a real Clerk User on this Development instance.
    Incomplete client signups can block create-account even when Users is empty — this tells them apart.
    """
    email = (email or "").strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Valid email required")
    try:
        users = _clerk_find_users_by_email(email)
    except HTTPException:
        raise
    except Exception as exc:
        raise safe_http_error(503, "Authentication service unavailable", exc, log_msg="Clerk email status") from exc
    return {
        "email": email,
        "exists": len(users) > 0,
        "instance": _clerk_issuer(),
        "user_count": len(users),
    }


@api_router.post("/auth/clerk-bootstrap")
async def clerk_bootstrap(body: ClerkBootstrapBody):
    """
    Create a Clerk user via Backend API when frontend signup reports email taken
    but no User exists (stuck incomplete SignUp reservation).
    Client should then sign in with the same password.
    """
    import requests

    email = str(body.email).strip().lower()
    password = (body.password or "").strip()
    if email == ADMIN_EMAIL:
        raise HTTPException(status_code=400, detail="This email is reserved for admin login")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    existing = _clerk_find_users_by_email(email)
    if existing:
        return {"created": False, "exists": True, "email": email}

    display = (body.name or "").strip() or email.split("@")[0]
    parts = display.split(None, 1)
    first = parts[0][:50] if parts else "User"
    last = parts[1][:50] if len(parts) > 1 else ""
    payload = {
        "email_address": [email],
        "password": password,
        "first_name": first,
        "last_name": last,
        "skip_password_checks": False,
        "skip_password_requirement": False,
    }
    if isinstance(body.unsafe_metadata, dict) and body.unsafe_metadata:
        payload["unsafe_metadata"] = body.unsafe_metadata

    resp = requests.post(
        "https://api.clerk.com/v1/users",
        headers=_clerk_headers(),
        json=payload,
        timeout=20,
    )
    if resp.status_code >= 400:
        detail = resp.text[:400]
        try:
            detail = resp.json()
        except Exception:
            pass
        raise HTTPException(status_code=400, detail=detail)
    data = resp.json()
    return {
        "created": True,
        "exists": False,
        "email": email,
        "clerk_id": data.get("id"),
    }


@api_router.get("/auth/me")
async def me(current=Depends(get_current_user)):
    from website_routes import enrich_website_user

    raw = {k: v for k, v in current.items() if not str(k).startswith("_")}
    return await enrich_website_user(raw, db)


@api_router.api_route("/auth/export", methods=["GET", "HEAD"])
async def export_account(current=Depends(get_current_user)):
    """GDPR data export: profile + orders."""
    profile = {k: v for k, v in current.items() if not str(k).startswith("_")}
    orders = []
    try:
        orders = await data_store.list_orders(current["id"], db)
    except Exception as exc:
        logger.warning("Account export orders failed for %s: %s", current.get("id"), exc)
        orders = []
    return {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "user": profile,
        "orders": orders,
    }


@api_router.delete("/auth/account")
async def delete_account(current=Depends(get_current_user)):
    """Real account delete: anonymise user, drop Clerk + push tokens, keep orders."""
    if (current.get("role") or "") == "admin":
        raise HTTPException(status_code=403, detail="Admin accounts cannot be deleted this way")
    email = (current.get("email") or "").strip().lower()
    user_id = current.get("id")
    if not email or not user_id:
        raise HTTPException(status_code=400, detail="Account is incomplete")

    clerk_deleted = 0
    try:
        if os.environ.get("CLERK_SECRET_KEY"):
            clerk_deleted = await asyncio.to_thread(_clerk_delete_users_by_email, email)
    except Exception as exc:
        logger.warning("Clerk account delete failed for %s: %s", email, exc)

    try:
        await data_store.delete_push_tokens_for_user(user_id, db)
    except Exception as exc:
        logger.warning("Push token cleanup failed for %s: %s", user_id, exc)

    anonymized = await data_store.anonymize_user(email, db)
    if not anonymized:
        raise HTTPException(status_code=404, detail="User not found")
    _admin_user_cache.pop(email, None)
    return {"ok": True, "deleted": True, "clerk_deleted": clerk_deleted}


@api_router.patch("/auth/profile")
async def update_profile(
    body: UserProfileUpdate,
    background_tasks: BackgroundTasks,
    current=Depends(get_current_user),
):
    email = current["email"]
    updates: dict = {}
    if body.name is not None:
        updates["name"] = body.name.strip() or current.get("name", "")
    if body.phone is not None:
        updates["phone"] = body.phone.strip()
    if body.address is not None:
        updates["address"] = body.address.strip()
    if body.city is not None:
        updates["city"] = body.city.strip()
    if body.postal_code is not None:
        updates["postal_code"] = body.postal_code.strip()
    if body.business_name is not None:
        updates["businessName"] = body.business_name.strip()
    if body.vat_number is not None:
        updates["vatNumber"] = body.vat_number.strip()
    if body.company_address is not None:
        updates["companyAddress"] = body.company_address.strip()
    if body.business_type is not None:
        updates["businessType"] = body.business_type.strip()
    if body.language is not None:
        updates["language"] = normalize_language(body.language)

    # Promote personal → business when business fields are supplied.
    prev_status = (current.get("wholesaleStatus") or "").strip().lower()
    next_business = (updates.get("businessName") if "businessName" in updates else current.get("businessName")) or ""
    next_vat = (updates.get("vatNumber") if "vatNumber" in updates else current.get("vatNumber")) or ""
    became_pending = False
    if (next_business or next_vat) and current.get("accountType") != "b2b":
        updates["accountType"] = "b2b"
        if current.get("wholesaleStatus") not in {"approved", "suspended"}:
            updates["wholesaleStatus"] = "pending"
            updates["isWholesale"] = False
            became_pending = prev_status != "pending"
    elif (next_business or next_vat) and current.get("accountType") == "b2b":
        if current.get("wholesaleStatus") not in {"approved", "suspended"} and prev_status != "pending":
            updates["wholesaleStatus"] = "pending"
            updates["isWholesale"] = False
            became_pending = True

    user = await data_store.update_user(email, updates, db)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if became_pending and user.get("role") != "admin":
        _queue_signup_emails(background_tasks, user, pending_notice=True)
        _notify_admin_wholesale_pending(user)

    return user_public(user)


# ---------------- Voice search (STT + LLM filters → existing /products) ----------------
def _voice_request_id(request: Request) -> str:
    rid = (request.headers.get("x-voice-request-id") or "").strip()
    if rid:
        return rid
    return f"VS_{int(time.time())}"


@api_router.get("/voice/status")
async def voice_status(request: Request):
    rid = _voice_request_id(request)
    voice_logger.log_step(rid, "Voice Status", "START")
    configured = openai_configured()
    vocab_counts: dict = {}
    try:
        from catalog_vocab import load_catalog_vocab

        vocab_counts = dict(load_catalog_vocab().source_counts)
    except Exception:
        pass
    voice_logger.log_step(
        rid,
        "Voice Status",
        "SUCCESS",
        openaiConfigured=configured,
        CatalogVocab=vocab_counts,
    )
    return {
        "openaiConfigured": configured,
        "catalogVocab": vocab_counts,
    }


def _voice_response_payload(*, transcript: str, filters: dict, request_id: str) -> dict:
    raw = dict(filters or {})
    raw.pop("_meta", None)
    if not filters_have_search_signal(raw):
        return {
            "transcript": transcript,
            "displayQuery": "",
            "filters": raw,
            "productParams": {},
            "requestId": request_id,
            "empty": True,
        }
    display = (raw.get("query") or "").strip()
    if not is_meaningful_search_query(display):
        # Prefer structured fields over a filler transcript
        display = " ".join(
            str(raw[k]).strip()
            for k in ("brand", "product", "model", "color", "storage")
            if raw.get(k)
        ).strip() or (transcript if is_meaningful_search_query(transcript) else "")
    product_params = filters_to_product_params(
        raw,
        bar_query=display if is_meaningful_search_query(display) else None,
        request_id=request_id,
    )
    # Never ship filler q=You to the catalog
    q = str(product_params.get("q") or "").strip()
    if q and not is_meaningful_search_query(q):
        product_params.pop("q", None)
    if not product_params:
        return {
            "transcript": transcript,
            "displayQuery": "",
            "filters": raw,
            "productParams": {},
            "requestId": request_id,
            "empty": True,
        }
    return {
        "transcript": transcript,
        "displayQuery": display or q,
        "filters": raw,
        "productParams": product_params,
        "requestId": request_id,
        "empty": False,
    }


@api_router.post("/voice/transcribe")
async def voice_transcribe(
    request: Request,
    file: UploadFile = File(...),
    language: Optional[str] = Form(None),
):
    """Upload recorded audio → OpenAI Whisper transcript."""
    rate_limit(request, "voice_transcribe", limit=15, window_sec=60)
    rid = _voice_request_id(request)
    if not openai_configured():
        voice_logger.log_error(
            rid,
            "Audio Upload",
            RuntimeError("OPENAI_API_KEY missing"),
            response_code=503,
        )
        raise HTTPException(status_code=503, detail="Voice search is not configured (OPENAI_API_KEY)")
    raw = await file.read()
    voice_logger.log_step(
        rid,
        "Audio Upload",
        "SUCCESS",
        File_Name=file.filename,
        File_Size=f"{len(raw)} bytes",
        Content_Type=file.content_type,
    )
    if not raw:
        voice_logger.log_error(rid, "Audio Upload", ValueError("Empty audio upload"), response_code=400)
        raise HTTPException(status_code=400, detail="Empty audio upload")
    # Cap ~30s of compressed speech (~3MB generous)
    if len(raw) > 3_500_000:
        voice_logger.log_error(rid, "Audio Upload", ValueError("Audio too large"), response_code=413)
        raise HTTPException(status_code=413, detail="Audio too large — keep recording under 30 seconds")
    try:
        transcript = await transcribe_audio(
            raw,
            filename=file.filename or "voice.m4a",
            content_type=file.content_type or "audio/m4a",
            language=language,
            request_id=rid,
        )
    except ValueError as exc:
        voice_logger.log_error(rid, "Speech To Text", exc, response_code=400)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        voice_logger.log_error(rid, "Speech To Text", exc, response_code=502)
        logger.warning("voice_transcribe failed: %s", exc)
        raise HTTPException(status_code=502, detail="Speech-to-text failed") from exc
    return {
        "transcript": transcript,
        "requestId": rid,
    }


@api_router.post("/voice/parse")
async def voice_parse(request: Request, body: VoiceParseBody):
    """Convert spoken/typed shopping language into structured catalog filters."""
    rate_limit(request, "voice_parse", limit=30, window_sec=60)
    rid = _voice_request_id(request)
    text = (body.text or "").strip()
    if not is_meaningful_search_query(text):
        voice_logger.log_error(rid, "Speech To Text", ValueError("Empty transcript"), response_code=400)
        raise HTTPException(status_code=400, detail="Empty transcript")
    filters = await parse_search_query(text, request_id=rid)
    payload = _voice_response_payload(transcript=text, filters=filters, request_id=rid)
    if payload.get("empty"):
        raise HTTPException(status_code=400, detail="Empty transcript")
    return payload


@api_router.post("/voice/search")
async def voice_search(
    request: Request,
    file: Optional[UploadFile] = File(None),
    text: Optional[str] = Form(None),
    language: Optional[str] = Form(None),
):
    """
    One-shot: audio and/or text → transcript + LLM filters + params for GET /products.
    Does not run catalog search itself — client calls existing /products with productParams.
    """
    rate_limit(request, "voice_search", limit=15, window_sec=60)
    rid = _voice_request_id(request)
    voice_logger.log_step(rid, "Voice Search Pipeline", "START")
    transcript = (text or "").strip()
    if file is not None:
        if not openai_configured():
            voice_logger.log_error(
                rid,
                "Audio Upload",
                RuntimeError("OPENAI_API_KEY missing"),
                response_code=503,
            )
            raise HTTPException(status_code=503, detail="Voice search is not configured (OPENAI_API_KEY)")
        raw = await file.read()
        voice_logger.log_step(
            rid,
            "Audio Upload",
            "SUCCESS",
            File_Name=file.filename,
            File_Size=f"{len(raw)} bytes",
            Content_Type=file.content_type,
            Upload_URL=str(request.url),
        )
        if not raw:
            voice_logger.log_error(rid, "Audio Upload", ValueError("Empty audio upload"), response_code=400)
            raise HTTPException(status_code=400, detail="Empty audio upload")
        if len(raw) > 3_500_000:
            voice_logger.log_error(rid, "Audio Upload", ValueError("Audio too large"), response_code=413)
            raise HTTPException(status_code=413, detail="Audio too large — keep recording under 30 seconds")
        try:
            transcript = await transcribe_audio(
                raw,
                filename=file.filename or "voice.m4a",
                content_type=file.content_type or "audio/m4a",
                language=language,
                request_id=rid,
            )
        except ValueError as exc:
            voice_logger.log_error(rid, "Speech To Text", exc, response_code=400)
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except Exception as exc:
            voice_logger.log_error(rid, "Speech To Text", exc, response_code=502)
            logger.warning("voice_search STT failed: %s", exc)
            raise HTTPException(status_code=502, detail="Speech-to-text failed") from exc

    if not transcript:
        voice_logger.log_error(rid, "Speech To Text", ValueError("Empty transcript"), response_code=400)
        raise HTTPException(status_code=400, detail="Empty transcript")
    if not is_meaningful_search_query(transcript):
        voice_logger.log_error(
            rid,
            "Speech To Text",
            ValueError(f"Filler transcript rejected: {transcript!r}"),
            response_code=400,
        )
        raise HTTPException(status_code=400, detail="Empty transcript")

    filters = await parse_search_query(transcript, request_id=rid)
    payload = _voice_response_payload(transcript=transcript, filters=filters, request_id=rid)
    if payload.get("empty"):
        voice_logger.log_error(rid, "Speech To Text", ValueError("Empty transcript"), response_code=400)
        raise HTTPException(status_code=400, detail="Empty transcript")
    voice_logger.log_step(
        rid,
        "Voice Search Pipeline",
        "SUCCESS",
        query=transcript,
        Transcript=transcript,
        Filters=payload.get("filters"),
        Product_Params=payload.get("productParams"),
    )
    return payload


# ---------------- Product routes ----------------
@api_router.get("/products")
async def list_products(
    request: Request,
    q: Optional[str] = None,
    category: Optional[str] = None,
    brand: Optional[str] = None,
    subcategory: Optional[str] = None,
    model: Optional[str] = None,
    model_wc_id: Optional[int] = None,
    leaf_category: Optional[str] = None,
    category_group: Optional[str] = None,
    best_seller: Optional[bool] = None,
    new_arrival: Optional[bool] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort: str = "date_desc",
    limit: int = 50,
    offset: int = 0,
    viewer=Depends(get_optional_user),
):
    started = time.perf_counter()
    if q:
        rate_limit(request, "products_search", limit=60, window_sec=60)
    logger.info(
        "Request received GET /products limit=%s offset=%s q=%r brand=%r category=%r group=%r leaf=%r min=%s max=%s",
        limit,
        offset,
        q,
        brand,
        category,
        category_group,
        leaf_category,
        min_price,
        max_price,
    )
    if _woo_catalog_enabled():
        woo = get_woo_db()
        route_started = time.perf_counter()
        try:
            result = await asyncio.to_thread(
                woo.filter_products,
                q=q,
                category=category,
                brand=brand,
                subcategory=subcategory,
                model=model,
                model_wc_id=model_wc_id,
                leaf_category=leaf_category,
                category_group=category_group,
                best_seller=best_seller,
                new_arrival=new_arrival,
                min_price=min_price,
                max_price=max_price,
                sort=sort or "date_desc",
                limit=limit,
                offset=offset,
                user=viewer,
            )
        except Exception as exc:
            if _is_catalog_connectivity_error(exc):
                _enable_memory_catalog_fallback(str(exc))
            else:
                raise
        else:
            globals()["_CATALOG_MYSQL_LIVE"] = True
            logger.info(
                "WooCommerce filter finished in %sms",
                int((time.perf_counter() - route_started) * 1000),
            )
            from catalog_pagination import ensure_product_page

            ser_started = time.perf_counter()
            page = ensure_product_page(
                result,
                limit=limit,
                offset=offset,
                model_query=model_wc_id is not None or bool(model),
            )
            logger.info(
                "Serialization done in %sms items=%s total=%s has_more=%s total_request_ms=%s",
                int((time.perf_counter() - ser_started) * 1000),
                len(page.get("items") or []),
                page.get("total"),
                page.get("has_more"),
                int((time.perf_counter() - started) * 1000),
            )
            accept = (request.headers.get("accept") or "").lower()
            if "text/html" in accept and "application/json" not in accept:
                from catalog_html import render_products_page

                return HTMLResponse(render_products_page(page))
            return page
    if USE_MEMORY:
        return memory_store.filter_products_page(
            q=q,
            category=category,
            brand=brand,
            subcategory=subcategory,
            model=model,
            model_wc_id=model_wc_id,
            leaf_category=leaf_category,
            category_group=category_group,
            best_seller=best_seller,
            new_arrival=new_arrival,
            limit=limit,
            offset=offset,
            user=viewer,
        )
    from catalog_pagination import product_page

    query = {}
    if category:
        query["category"] = category
    if brand:
        query["brand"] = brand
    if subcategory:
        query["subcategory"] = subcategory
    model_name = None
    if model_wc_id is not None or model:
        from model_match import filter_by_model, resolve_model_name

        model_name = resolve_model_name(brand, model, model_wc_id)
    if leaf_category:
        from category_groups import filter_by_leaf

        docs = await db.products.find(query, {"_id": 0}).to_list(50000)
        docs = sort_catalog_products(
            sanitize_products(filter_by_leaf(docs, leaf_category), viewer),
            leaf_category=leaf_category,
        )
        return product_page(docs[offset : offset + limit], len(docs), limit=limit, offset=offset)
    if category_group:
        from category_groups import filter_by_group, normalize_group_title

        docs = await db.products.find(query, {"_id": 0}).to_list(50000)
        grouped = filter_by_group(docs, normalize_group_title(category_group) or category_group)
        docs = sort_catalog_products(
            sanitize_products(grouped, viewer),
            category_group=category_group,
        )
        return product_page(docs[offset : offset + limit], len(docs), limit=limit, offset=offset)
    if best_seller is not None:
        query["best_seller"] = best_seller
    if new_arrival is not None:
        query["new_arrival"] = new_arrival
    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"brand": {"$regex": q, "$options": "i"}},
            {"category": {"$regex": q, "$options": "i"}},
            {"subcategory": {"$regex": q, "$options": "i"}},
            {"model": {"$regex": q, "$options": "i"}},
            {"sku": {"$regex": q, "$options": "i"}},
            {"leaf_category": {"$regex": q, "$options": "i"}},
            {"part_type": {"$regex": q, "$options": "i"}},
        ]
    docs = await db.products.find(query, {"_id": 0}).to_list(50000)
    if model_name is not None or model_wc_id is not None:
        from model_match import filter_by_model

        docs = filter_by_model(docs, brand, model, model_wc_id)
    docs = sort_catalog_products(
        sanitize_products(docs, viewer),
        category=category,
        category_group=category_group,
        leaf_category=leaf_category,
        model=model,
        model_wc_id=model_wc_id,
    )
    return product_page(docs[offset : offset + limit], len(docs), limit=limit, offset=offset)


@api_router.get("/brands/{brand}/models")
async def list_brand_models(brand: str):
    if _woo_catalog_enabled():
        return await asyncio.to_thread(get_woo_db().brand_models, brand)
    return memory_store.brand_models(brand)


@api_router.get("/products-search")
async def search_products(
    q: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    brand: Optional[str] = None,
    category: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort: str = "date_desc",
    viewer=Depends(get_optional_user),
):
    if _woo_catalog_enabled():
        woo = get_woo_db()
        return await asyncio.to_thread(
            woo.filter_products,
            q=q,
            brand=brand,
            category=category,
            min_price=min_price,
            max_price=max_price,
            sort=sort,
            limit=limit,
            offset=offset,
            user=viewer,
        )
    if USE_MEMORY:
        return memory_store.filter_products_page(
            q=q,
            brand=brand,
            category=category,
            limit=limit,
            offset=offset,
            user=viewer,
        )
    raise HTTPException(status_code=503, detail="Catalog MySQL not configured")


@api_router.get("/products/{product_id}")
async def get_product(product_id: str, viewer=Depends(get_optional_user)):
    if _woo_catalog_enabled():
        woo = get_woo_db()

        def _load():
            try:
                return woo.get_product_by_uuid(product_id, enrich=True, user=viewer)
            except TypeError:
                doc = woo.get_product_by_uuid(product_id, enrich=True)
                return sanitize_product(doc, viewer) if doc else None

        try:
            doc = await asyncio.to_thread(_load)
        except Exception as exc:
            if _is_catalog_connectivity_error(exc):
                _enable_memory_catalog_fallback(str(exc))
                doc = memory_store.get_product(product_id, viewer)
                if doc:
                    return doc
                raise HTTPException(status_code=404, detail="Product not found") from exc
            raise
        if doc:
            return doc
        doc = memory_store.get_product(product_id, viewer)
        if doc:
            return doc
        raise HTTPException(status_code=404, detail="Product not found")
    if USE_MEMORY:
        doc = memory_store.get_product(product_id, viewer)
    else:
        doc = await db.products.find_one({"id": product_id}, {"_id": 0})
        if doc:
            from stock import normalize_stock

            doc = sanitize_product(normalize_stock(dict(doc)), viewer)
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")
    return doc


@api_router.get("/categories")
async def list_categories(_viewer=Depends(get_optional_user)):
    if _woo_catalog_enabled():
        woo = get_woo_db()
        if hasattr(woo, "list_categories"):
            return {"items": await asyncio.to_thread(woo.list_categories)}
        raise HTTPException(status_code=501, detail="Categories require catalog MySQL")
    if USE_MEMORY:
        return {"items": memory_store.list_categories()}
    raise HTTPException(status_code=503, detail="Catalog MySQL not configured")


@api_router.get("/brands")
async def list_brands(_viewer=Depends(get_optional_user)):
    if _woo_catalog_enabled():
        woo = get_woo_db()
        if hasattr(woo, "list_brands"):
            return {"items": await asyncio.to_thread(woo.list_brands)}
        raise HTTPException(status_code=501, detail="Brands require catalog MySQL")
    if USE_MEMORY:
        return {"items": memory_store.list_brands()}
    raise HTTPException(status_code=503, detail="Catalog MySQL not configured")


@api_router.get("/banners")
async def list_banners(limit: int = 8, _viewer=Depends(get_optional_user)):
    """Home header / hero carousel. APK calls this on launch."""
    lim = max(1, min(int(limit or 8), 12))
    if _woo_catalog_enabled():
        woo = get_woo_db()
        if hasattr(woo, "list_banners"):
            items = await asyncio.to_thread(woo.list_banners, limit=lim)
            return JSONResponse(
                content={"items": items, "banners": items},
                headers={"Cache-Control": "public, max-age=30, must-revalidate"},
            )
    from seed_data import BANNERS

    items = []
    for i, raw in enumerate(BANNERS[:lim], start=1):
        url = str(raw or "").strip()
        if not url:
            continue
        items.append(
            {
                "id": f"seed-{i}",
                "wc_id": 0,
                "title": "",
                "image": url,
                "image_url": url,
                "src": url,
                "url": "",
                "link": "",
            }
        )
    return JSONResponse(
        content={"items": items, "banners": items},
        headers={"Cache-Control": "public, max-age=30, must-revalidate"},
    )


@api_router.get("/featured")
async def featured_products(limit: int = 50, viewer=Depends(get_optional_user)):
    if _woo_catalog_enabled():
        woo = get_woo_db()
        if hasattr(woo, "featured_products"):
            return await asyncio.to_thread(woo.featured_products, limit=limit, user=viewer)
        return await asyncio.to_thread(woo.filter_products, best_seller=True, limit=limit, offset=0, user=viewer)
    if USE_MEMORY:
        return memory_store.filter_products_page(best_seller=True, limit=limit, offset=0, user=viewer)
    page = await _mongo_products_page({"best_seller": True}, limit=limit, offset=0, viewer=viewer)
    if page and page.get("items"):
        return page
    page = await _mongo_products_page({}, limit=limit, offset=0, viewer=viewer)
    if page:
        return page
    raise HTTPException(status_code=503, detail="Catalog MySQL not configured")


@api_router.get("/new-arrivals")
async def new_arrivals(limit: int = 50, viewer=Depends(get_optional_user)):
    if _woo_catalog_enabled():
        woo = get_woo_db()
        if hasattr(woo, "new_arrivals"):
            return await asyncio.to_thread(woo.new_arrivals, limit=limit, user=viewer)
        return await asyncio.to_thread(woo.filter_products, new_arrival=True, limit=limit, offset=0, user=viewer)
    if USE_MEMORY:
        return memory_store.filter_products_page(new_arrival=True, limit=limit, offset=0, user=viewer)
    page = await _mongo_products_page({"new_arrival": True}, limit=limit, offset=0, viewer=viewer)
    if page and page.get("items"):
        return page
    page = await _mongo_products_page({}, limit=limit, offset=0, viewer=viewer)
    if page:
        return page
    raise HTTPException(status_code=503, detail="Catalog MySQL not configured")


_home_rails_cache: dict[str, tuple[float, dict]] = {}


def _home_rails_cache_bucket(viewer: Optional[dict]) -> str:
    if not viewer:
        return "public"
    if is_wholesale_approved(viewer) or (viewer.get("role") or "") == "admin":
        return "b2b"
    return "user"


@api_router.api_route("/home-rails", methods=["GET", "HEAD"])
async def home_rails(
    request: Request,
    part: str = "all",
    limit: int = 8,
    viewer=Depends(get_optional_user),
):
    """Cached Home rails — one response instead of 7 /products calls."""
    if not _woo_catalog_enabled():
        if USE_MEMORY:
            payload = memory_store.home_rails(part=part, limit=limit, user=viewer)
            return JSONResponse(content=payload, headers={"Cache-Control": "public, max-age=30"})
        part_key = (part or "all").strip().lower()
        if part_key not in {"all", "priority", "sections"}:
            part_key = "all"
        lim = max(1, min(int(limit or 8), 24))
        best = await _mongo_products_page({"best_seller": True}, limit=lim, offset=0, viewer=viewer)
        if not best or not best.get("items"):
            best = await _mongo_products_page({}, limit=lim, offset=0, viewer=viewer)
        fresh = await _mongo_products_page({"new_arrival": True}, limit=lim, offset=0, viewer=viewer)
        best_items = (best or {}).get("items") or []
        fresh_items = (fresh or {}).get("items") or best_items
        if best_items or fresh_items:
            payload = {
                "part": part_key,
                "limit": lim,
                "best": best_items if part_key in {"all", "priority"} else [],
                "fresh": fresh_items if part_key in {"all", "priority"} else [],
                "sections": [],
            }
            return JSONResponse(content=payload, headers={"Cache-Control": "public, max-age=30"})
        raise HTTPException(status_code=503, detail="Catalog MySQL not configured")
    part_key = (part or "all").strip().lower()
    if part_key not in {"all", "priority", "sections"}:
        part_key = "all"
    lim = max(1, min(int(limit or 8), 24))
    bucket = _home_rails_cache_bucket(viewer)
    ttl = 60.0 if bucket != "public" else 180.0
    cache_key = f"{part_key}:{lim}:{bucket}"
    now = time.time()
    cached = _home_rails_cache.get(cache_key)
    if cached and now - cached[0] < ttl:
        payload = cached[1]
    else:
        woo = get_woo_db()
        payload = await asyncio.to_thread(woo.home_rails, part=part_key, limit=lim, user=viewer)
        _home_rails_cache[cache_key] = (now, payload)
        if len(_home_rails_cache) > 24:
            stale = sorted(_home_rails_cache.items(), key=lambda kv: kv[1][0])
            for key, _ in stale[:12]:
                _home_rails_cache.pop(key, None)
    headers = {
        "Cache-Control": f"{'private' if bucket != 'public' else 'public'}, max-age={int(ttl)}"
    }
    return JSONResponse(content=payload, headers=headers)


@api_router.get("/related/{product_id}")
async def related_products(product_id: str, limit: int = 12, viewer=Depends(get_optional_user)):
    if _woo_catalog_enabled():
        woo = get_woo_db()
        if hasattr(woo, "related_products"):
            items = await asyncio.to_thread(woo.related_products, product_id, limit=limit, user=viewer)
            return {"items": items}
        raise HTTPException(status_code=501, detail="Related products require catalog MySQL")
    if USE_MEMORY:
        return {"items": memory_store.related_products(product_id, limit=limit, user=viewer)}
    raise HTTPException(status_code=503, detail="Catalog MySQL not configured")


class B2CPriceBody(BaseModel):
    b2c_price: Optional[float] = None
    markup: Optional[float] = None


class B2CMarkupBody(BaseModel):
    markup: float = Field(gt=0)


@api_router.post("/admin/products/{product_id}/b2c-price")
async def admin_set_b2c_price(product_id: str, body: B2CPriceBody, _admin=Depends(get_current_admin)):
    from repositories.product_repository import get_product_repository

    woo = get_woo_db()
    doc = await asyncio.to_thread(woo.get_product_by_uuid, product_id, False)
    if not doc or not doc.get("wc_id"):
        raise HTTPException(status_code=404, detail="Product not found")
    repo = get_product_repository()
    await asyncio.to_thread(repo.upsert_b2c_price, int(doc["wc_id"]), body.b2c_price, body.markup)
    return await asyncio.to_thread(woo.get_product_by_uuid, product_id, True, _admin)


@api_router.post("/admin/pricing/markup")
async def admin_set_default_markup(body: B2CMarkupBody, _admin=Depends(get_current_admin)):
    from repositories.product_repository import get_product_repository

    repo = get_product_repository()
    await asyncio.to_thread(repo.set_default_markup, float(body.markup))
    return {"ok": True, "markup": float(body.markup)}


@api_router.get("/admin/pricing/public-bands")
async def admin_public_price_bands(_admin=Depends(get_current_admin)):
    from repositories.product_repository import get_product_repository
    from wholesale import PUBLIC_PRICE_BANDS

    repo = get_product_repository()
    try:
        rows = await asyncio.to_thread(repo.list_public_price_bands)
    except Exception:
        rows = []
    if not rows:
        rows = [
            {"cost_min": lo, "cost_max": hi, "public_price": pub, "sort_order": i}
            for i, (lo, hi, pub) in enumerate(PUBLIC_PRICE_BANDS)
        ]
    return {"items": rows, "applies_to": "accessories_public_only"}


@api_router.post("/admin/pricing/sync-public-prices")
async def admin_sync_public_prices(_admin=Depends(get_current_admin)):
    """Persist accessory public_price columns from band table / PUBLIC_PRICE_BANDS."""
    woo = get_woo_db()
    if not hasattr(woo, "sync_accessory_public_prices"):
        raise HTTPException(status_code=501, detail="Catalog MySQL required")
    return await asyncio.to_thread(woo.sync_accessory_public_prices)


# ---------------- Catalog MySQL routes (u552904336_samappdb) ----------------
def _woo_or_503():
    woo = get_woo_db()
    if not woo.configured():
        raise HTTPException(
            status_code=503,
            detail="Catalog MySQL not configured. Set CATALOG_MYSQL_* / DB_* in backend/.env",
        )
    return woo


@api_router.get("/woo/health")
def woo_health():
    return get_woo_db().health()


@api_router.post("/woo/warm")
def woo_warm_cache():
    woo = _woo_or_503()
    try:
        return woo.warm_catalog()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@api_router.get("/woo/stats")
def woo_stats():
    woo = _woo_or_503()
    try:
        return woo.stats()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@api_router.get("/woo/categories")
def woo_categories(parent: Optional[int] = None):
    woo = _woo_or_503()
    try:
        return {"items": woo.list_categories(parent=parent), "source": "catalog_mysql"}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@api_router.get("/woo/models")
def woo_models(brand: Optional[str] = None):
    woo = _woo_or_503()
    try:
        return {"items": woo.list_models(brand=brand), "source": "catalog_mysql"}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@api_router.get("/woo/brands/{brand}/models")
def woo_brand_models(brand: str):
    woo = _woo_or_503()
    try:
        return woo.list_models(brand=brand)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@api_router.get("/woo/products")
def woo_list_products(
    q: Optional[str] = None,
    category: Optional[str] = None,
    brand: Optional[str] = None,
    subcategory: Optional[str] = None,
    model: Optional[str] = None,
    model_wc_id: Optional[int] = None,
    leaf_category: Optional[str] = None,
    in_stock: Optional[bool] = None,
    limit: int = 48,
    offset: int = 0,
    viewer=Depends(get_optional_user),
):
    woo = _woo_or_503()
    try:
        result = woo.list_products(
            q=q,
            category=category,
            brand=brand,
            subcategory=subcategory,
            model=model,
            model_wc_id=model_wc_id,
            leaf_category=leaf_category,
            in_stock=in_stock,
            limit=min(limit, 200),
            offset=offset,
        )
        result["items"] = sanitize_products(result["items"], viewer)
        return result
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@api_router.get("/woo/products/slug/{slug}")
def woo_get_product_by_slug(slug: str, viewer=Depends(get_optional_user)):
    woo = _woo_or_503()
    try:
        doc = woo.get_product_by_slug(slug)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")
    return sanitize_product(doc, viewer)


@api_router.get("/woo/products/{wc_id}")
def woo_get_product(wc_id: int, viewer=Depends(get_optional_user)):
    woo = _woo_or_503()
    try:
        doc = woo.get_product(wc_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")
    return sanitize_product(doc, viewer)


@api_router.post("/stock/purchase")
async def purchase_stock(body: StockPurchase, request: Request, current=Depends(get_current_user)):
    """Decrement stock — authenticated only. Prefer /orders which also decrements."""
    rate_limit(request, "stock_purchase", limit=10, window_sec=60)
    lines = [i.model_dump() if hasattr(i, "model_dump") else i.dict() for i in body.items]
    if not lines:
        raise HTTPException(status_code=400, detail="No items")
    if _woo_catalog_enabled():
        try:
            updated = await asyncio.to_thread(get_woo_db().decrement_stock, lines)
            return {"ok": True, "updated": updated}
        except ValueError as e:
            raise HTTPException(status_code=400, detail="Insufficient stock") from e
        except Exception as exc:
            raise safe_http_error(502, "Stock update failed", exc, log_msg="stock purchase") from exc
    if USE_MEMORY:
        try:
            updated = memory_store.decrement_stock(lines)
            return {"ok": True, "updated": updated}
        except ValueError as e:
            raise HTTPException(status_code=400, detail="Insufficient stock") from e
    raise HTTPException(status_code=501, detail="Stock purchase requires WooCommerce or USE_MEMORY=1")


@api_router.get("/admin/products")
async def admin_list_products(
    q: Optional[str] = None,
    limit: int = 80,
    offset: int = 0,
    sort: str = "date_desc",
    _admin=Depends(get_current_admin),
):
    def _list_admin_catalog():
        if _woo_catalog_enabled():
            fn = getattr(get_woo_db(), "list_admin_products", None)
            if callable(fn):
                try:
                    return fn(q=q, limit=limit, offset=offset, sort=sort or "date_desc")
                except TypeError:
                    return fn(q=q, limit=limit, offset=offset)
            return get_woo_db().filter_products(
                q=q,
                limit=limit,
                offset=offset,
                sort=sort or "date_desc",
                user={"role": "admin", "accountType": "b2b", "isWholesale": True, "wholesaleStatus": "approved"},
            )
        if USE_MEMORY:
            try:
                return memory_store.list_admin_products(q=q, limit=limit, offset=offset, sort=sort or "date_desc")
            except TypeError:
                return memory_store.list_admin_products(q=q, limit=limit, offset=offset)
        raise HTTPException(status_code=501, detail="Admin stock requires WooCommerce or USE_MEMORY=1")

    return await asyncio.to_thread(_list_admin_catalog)


@api_router.get("/admin/products/{product_id}")
async def admin_get_product(product_id: str, _admin=Depends(get_current_admin)):
    if _woo_catalog_enabled():
        doc = await asyncio.to_thread(get_woo_db().get_admin_product, product_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Product not found")
        return doc
    raise HTTPException(status_code=501, detail="Admin product requires WooCommerce")


def _queue_restock_if_available(background_tasks: BackgroundTasks, product_id: str, product: Optional[dict]) -> None:
    qty = 0
    in_stock = False
    if product:
        in_stock = bool(product.get("in_stock"))
        try:
            qty = int(product.get("stock_quantity") or 0)
        except (TypeError, ValueError):
            qty = 0
    if not (in_stock or qty > 0):
        return

    async def _run() -> None:
        from jobs.alert_emails import process_restock_for_product

        await process_restock_for_product(product_id)

    background_tasks.add_task(_run)


@api_router.patch("/admin/products/{product_id}")
async def admin_update_stock(
    product_id: str,
    body: StockUpdate,
    background_tasks: BackgroundTasks,
    _admin=Depends(get_current_admin),
):
    b2c = body.b2c_price if body.b2c_price is not None else body.retailPrice
    wholesale = body.regularPrice
    price_edit = b2c is not None or wholesale is not None
    if _woo_catalog_enabled() and price_edit and hasattr(get_woo_db(), "update_product_admin"):
        try:
            updated = await asyncio.to_thread(
                get_woo_db().update_product_admin,
                product_id,
                stock_quantity=body.stock_quantity,
                regular_price=wholesale,
                b2c_price=b2c,
            )
        except Exception as exc:
            raise HTTPException(status_code=502, detail=str(exc))
        if not updated:
            raise HTTPException(status_code=404, detail="Product not found")
        _queue_restock_if_available(background_tasks, product_id, updated)
        return updated
    if body.stock_quantity is None:
        raise HTTPException(status_code=400, detail="No product fields to update")
    if _woo_catalog_enabled():
        try:
            updated = await asyncio.to_thread(get_woo_db().update_product_stock, product_id, body.stock_quantity)
        except Exception as exc:
            raise HTTPException(status_code=502, detail=str(exc))
        if not updated:
            raise HTTPException(status_code=404, detail="Product not found")
        _queue_restock_if_available(background_tasks, product_id, updated)
        return updated
    if USE_MEMORY:
        updated = memory_store.update_product_stock(product_id, body.stock_quantity)
        if not updated:
            raise HTTPException(status_code=404, detail="Product not found")
        _queue_restock_if_available(background_tasks, product_id, updated)
        return updated
    raise HTTPException(status_code=501, detail="Admin stock requires WooCommerce or USE_MEMORY=1")


@api_router.put("/admin/products/{product_id}/edit")
async def admin_edit_product(
    product_id: str,
    body: AdminProductEdit,
    background_tasks: BackgroundTasks,
    _admin=Depends(get_current_admin),
):
    """Update price, sale, public override, image, and/or stock for a catalog product."""
    if not _woo_catalog_enabled():
        raise HTTPException(status_code=501, detail="Catalog MySQL required for product edits")

    woo = get_woo_db()
    if not hasattr(woo, "update_product_admin"):
        raise HTTPException(status_code=501, detail="Catalog service missing update_product_admin")
    try:
        updated = await asyncio.to_thread(
            woo.update_product_admin,
            product_id,
            stock_quantity=body.stock_quantity,
            regular_price=body.regular_price,
            sale_price=body.sale_price,
            clear_sale=body.clear_sale,
            b2c_price=body.b2c_price,
            clear_b2c=body.clear_b2c,
            compare_at_price=body.compare_at_price,
            image_url=body.image_url,
            clear_image=body.clear_image,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    if not updated:
        raise HTTPException(status_code=404, detail="Product not found")
    if body.stock_quantity is not None:
        _queue_restock_if_available(background_tasks, product_id, updated)
    return updated


@api_router.post("/admin/products")
async def admin_create_product(body: AdminProductCreate, _admin=Depends(get_current_admin)):
    if not _woo_catalog_enabled():
        raise HTTPException(status_code=501, detail="Catalog MySQL required to add products")
    woo = get_woo_db()
    if not hasattr(woo, "create_product_admin"):
        raise HTTPException(status_code=501, detail="Product create is not available")
    b2b = body.b2b_price if body.b2b_price is not None else body.regular_price
    try:
        created = await asyncio.to_thread(
            woo.create_product_admin,
            name=body.name,
            sku=body.sku or "",
            regular_price=b2b,
            b2c_price=body.b2c_price,
            image_url=body.image_url or "",
            description=body.description or "",
            stock_quantity=body.stock_quantity,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return created


@api_router.delete("/admin/products/{product_id}")
async def admin_delete_product(product_id: str, _admin=Depends(get_current_admin)):
    if not _woo_catalog_enabled():
        raise HTTPException(status_code=501, detail="Catalog MySQL required to delete products")
    woo = get_woo_db()
    if not hasattr(woo, "delete_product_admin"):
        raise HTTPException(status_code=501, detail="Product delete is not available")
    try:
        ok = await asyncio.to_thread(woo.delete_product_admin, product_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    if not ok:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"ok": True}


@api_router.post("/admin/products/{product_id}/image")
async def admin_upload_product_image(
    product_id: str,
    request: Request,
    file: UploadFile = File(...),
    _admin=Depends(get_current_admin),
):
    """Upload a product image override (served from /uploads/products/)."""
    if not _woo_catalog_enabled():
        raise HTTPException(status_code=501, detail="Catalog MySQL required")
    woo = get_woo_db()
    doc = await asyncio.to_thread(woo.get_product_by_uuid, product_id, False)
    if not doc or not doc.get("wc_id"):
        raise HTTPException(status_code=404, detail="Product not found")

    content_type = (file.content_type or "").lower()
    ext = ".jpg"
    if "png" in content_type:
        ext = ".png"
    elif "webp" in content_type:
        ext = ".webp"
    elif "gif" in content_type:
        ext = ".gif"
    elif "jpeg" in content_type or "jpg" in content_type:
        ext = ".jpg"
    else:
        name = (file.filename or "").lower()
        if name.endswith(".png"):
            ext = ".png"
        elif name.endswith(".webp"):
            ext = ".webp"
        elif name.endswith(".gif"):
            ext = ".gif"

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large (max 8MB)")

    upload_dir = ROOT_DIR / "uploads" / "products"
    upload_dir.mkdir(parents=True, exist_ok=True)
    fname = f"{int(doc['wc_id'])}_{int(time.time())}{ext}"
    dest = upload_dir / fname
    dest.write_bytes(data)

    base = str(request.base_url).rstrip("/")
    image_url = f"{base}/uploads/products/{fname}"
    await asyncio.to_thread(woo.update_product_admin, product_id, image_url=image_url)
    updated = await asyncio.to_thread(woo.get_product_by_uuid, product_id, True, _admin)
    return {"ok": True, "image_url": image_url, "product": updated}


@api_router.get("/admin/stats")
async def admin_stats(_admin=Depends(get_current_admin)):
    if USE_MEMORY or _app_mysql_enabled():
        stats = await data_store.admin_stats(db)
        if _woo_catalog_enabled():
            try:
                woo_stats = await asyncio.to_thread(get_woo_db().admin_stats)
                # Catalog stock figures still come from WooCommerce clone.
                stats["total_products"] = woo_stats.get("total_products", stats.get("total_products", 0))
                stats["low_stock"] = woo_stats.get("low_stock", stats.get("low_stock", 0))
                stats["out_of_stock"] = woo_stats.get("out_of_stock", stats.get("out_of_stock", 0))
            except Exception:
                pass
        return stats
    if _woo_catalog_enabled():
        # No app order store — return catalog stats with zero app orders.
        stats = await asyncio.to_thread(get_woo_db().admin_stats)
        stats["total_orders"] = 0
        stats["total_revenue"] = 0
        stats["total_customers"] = 0
        return stats
    raise HTTPException(status_code=501, detail="Admin stats require WooCommerce, app MySQL, or USE_MEMORY=1")


@api_router.get("/admin/orders")
async def admin_list_orders(
    limit: int = 2000,
    source: Optional[str] = None,
    _admin=Depends(get_current_admin),
):
    """List app orders and live WooCommerce website orders (newest first)."""
    fetch_limit = max(1, min(int(limit or 2000), 5000))
    source_norm = (source or "").strip().lower()
    if source_norm in {"website", "woocommerce", "wc"}:
        source_norm = "website"
    elif source_norm not in {"", "all", "app"}:
        source_norm = ""

    app_rows: list[dict] = []
    website_rows: list[dict] = []

    if source_norm in {"", "all", "app"}:
        if USE_MEMORY or _app_mysql_enabled():
            try:
                raw_app = await data_store.list_all_orders(limit=fetch_limit, mongo_db=db)
                for o in raw_app:
                    row = dict(o)
                    row.setdefault("source", "app")
                    app_rows.append(row)
            except Exception as exc:
                logger.warning("Failed to load app orders: %s", exc)
        elif source_norm == "app":
            raise HTTPException(status_code=501, detail="Admin orders require app MySQL or USE_MEMORY=1")

    if source_norm in {"", "all", "website"}:
        try:
            woo = get_woo_db()
            if woo.configured():
                website_rows = await asyncio.to_thread(woo.list_woocommerce_orders, fetch_limit)
                for row in website_rows:
                    # Normalize for the Admin Orders UI filter tabs.
                    if row.get("source") in {"woocommerce", "wc"}:
                        row["source"] = "website"
        except Exception as exc:
            logger.warning("Failed to load website orders: %s", exc)

    if source_norm == "app":
        merged = app_rows
    elif source_norm == "website":
        merged = website_rows
    else:
        merged = app_rows + website_rows

    def _sort_key(o: dict):
        raw = str(o.get("created_at") or "").strip()
        if not raw:
            return datetime.min.replace(tzinfo=timezone.utc)
        try:
            dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        except ValueError:
            return datetime.min.replace(tzinfo=timezone.utc)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt

    merged.sort(key=_sort_key, reverse=True)  # newest → oldest
    items = merged[:fetch_limit]
    return {
        "items": items,
        "counts": {
            "all": len(app_rows) + len(website_rows),
            "website": len(website_rows),
            "app": len(app_rows),
        },
        "source": source_norm or "all",
    }


@api_router.get("/admin/orders/{order_id}")
async def admin_get_order(order_id: str, _admin=Depends(get_current_admin)):
    raw_id = (order_id or "").strip()
    if USE_MEMORY or _app_mysql_enabled():
        doc = await data_store.get_admin_order(raw_id, db)
        if doc:
            row = dict(doc)
            row.setdefault("source", "app")
            return row

    # WooCommerce website orders use ids like wc-50903
    try:
        woo = get_woo_db()
        if woo.configured():
            wc_doc = await asyncio.to_thread(woo.get_woocommerce_order, raw_id)
            if wc_doc:
                if wc_doc.get("source") in {"woocommerce", "wc"}:
                    wc_doc["source"] = "website"
                return wc_doc
    except Exception as exc:
        logger.warning("Failed to load website order %s: %s", raw_id, exc)

    raise HTTPException(status_code=404, detail="Order not found")


@api_router.get("/admin/users")
async def admin_list_users(_admin=Depends(get_current_admin)):
    app_users: list[dict] = []
    if USE_MEMORY or _app_mysql_enabled():
        try:
            from website_routes import enrich_website_user

            rows = await data_store.list_users(db)
            app_users = [await enrich_website_user(row, db) for row in rows]
        except Exception:
            logger.exception("Admin list app users failed")
            app_users = []
    clerk_users = await asyncio.to_thread(_clerk_list_admin_users)
    merged = _merge_admin_users(app_users, clerk_users)
    if not merged and not app_users and not clerk_users:
        if not (USE_MEMORY or _app_mysql_enabled()):
            raise HTTPException(status_code=501, detail="Admin users require app MySQL, Clerk, or USE_MEMORY=1")
    return merged


@api_router.get("/admin/users/search")
async def admin_search_users(q: str = "", limit: int = 2000, _admin=Depends(get_current_admin)):
    if USE_MEMORY or _app_mysql_enabled():
        fetch = max(1, min(int(limit or 2000), 5000))
        return await data_store.search_users(q=q, limit=fetch, mongo_db=db)
    raise HTTPException(status_code=501, detail="Admin users require app MySQL or USE_MEMORY=1")


@api_router.get("/admin/users/website")
@api_router.get("/admin/customers/website")
async def admin_list_website_customers(
    q: str = "",
    limit: int = 2000,
    offset: int = 0,
    _admin=Depends(get_current_admin),
):
    """
    WooCommerce / WordPress customers from the catalog MySQL clone (`wp_users`).
    Same DB as products — no extra env keys. Optional later: live sync if the clone lags.
    """
    from wp_auth import list_website_customers

    result = await asyncio.to_thread(
        list_website_customers,
        q=q,
        limit=limit,
        offset=offset,
    )
    items = list(result.get("items") or [])

    # Annotate which website customers already have an app account (same email).
    app_emails: set[str] = set()
    if USE_MEMORY or _app_mysql_enabled():
        try:
            app_users = await data_store.list_users(db)
            app_emails = {(u.get("email") or "").strip().lower() for u in app_users if u.get("email")}
        except Exception:
            logger.debug("Could not load app users for website-customer overlay", exc_info=True)
    for row in items:
        email = (row.get("email") or "").strip().lower()
        row["has_app_account"] = bool(email and email in app_emails)

    result["items"] = items
    return result


@api_router.get("/admin/users/{user_id}/discounts")
async def admin_list_user_discounts(user_id: str, _admin=Depends(get_current_admin)):
    from user_discounts import row_to_public

    if not (USE_MEMORY or _app_mysql_enabled()):
        raise HTTPException(status_code=501, detail="User discounts require app MySQL or USE_MEMORY=1")
    user = await data_store.find_user_by_id(user_id, db)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    rows = await data_store.list_user_discounts(user_id, db)
    return {"items": [row_to_public(r, include_reason=True) for r in rows]}


class UserDiscountBody(BaseModel):
    discount_type: Optional[str] = None
    discountType: Optional[str] = None
    discount_value: Optional[float] = None
    discountValue: Optional[float] = None
    applies_to: Optional[str] = None
    appliesTo: Optional[str] = None
    target_ids: Optional[List[str]] = None
    targetIds: Optional[List[str]] = None
    reason: Optional[str] = None
    is_active: Optional[bool] = None
    isActive: Optional[bool] = None
    starts_at: Optional[str] = None
    startsAt: Optional[str] = None
    expires_at: Optional[str] = None
    expiresAt: Optional[str] = None


@api_router.post("/admin/users/{user_id}/discounts")
async def admin_create_user_discount(
    user_id: str,
    body: UserDiscountBody,
    background_tasks: BackgroundTasks,
    admin=Depends(get_current_admin),
):
    from user_discounts import row_to_public, validate_discount_payload

    if not (USE_MEMORY or _app_mysql_enabled()):
        raise HTTPException(status_code=501, detail="User discounts require app MySQL or USE_MEMORY=1")
    user = await data_store.find_user_by_id(user_id, db)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    try:
        data = validate_discount_payload(body.model_dump(exclude_none=True), partial=False)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    row = await data_store.create_user_discount(user_id, data, created_by=admin.get("id"), mongo_db=db)
    public = row_to_public(row, include_reason=True)

    async def _discount_push():
        from notify import notify_user

        dtype = public.get("discount_type")
        val = public.get("discount_value")
        label = f"{val}%" if dtype == "percentage" else f"€{val}"
        await notify_user(
            user_id,
            "personal_discount",
            "New discount for you",
            f"You received a {label} discount on Samphone.",
            data={"route": "/home"},
            mongo_db=db,
        )

    background_tasks.add_task(_discount_push)
    return public


@api_router.patch("/admin/users/{user_id}/discounts/{discount_id}")
async def admin_update_user_discount(
    user_id: str,
    discount_id: str,
    body: UserDiscountBody,
    _admin=Depends(get_current_admin),
):
    from user_discounts import row_to_public, validate_discount_payload

    if not (USE_MEMORY or _app_mysql_enabled()):
        raise HTTPException(status_code=501, detail="User discounts require app MySQL or USE_MEMORY=1")
    try:
        data = validate_discount_payload(body.model_dump(exclude_none=True), partial=True)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
    row = await data_store.update_user_discount(user_id, discount_id, data, mongo_db=db)
    if not row:
        raise HTTPException(status_code=404, detail="Discount not found")
    return row_to_public(row, include_reason=True)


@api_router.delete("/admin/users/{user_id}/discounts/{discount_id}")
async def admin_delete_user_discount(
    user_id: str,
    discount_id: str,
    _admin=Depends(get_current_admin),
):
    if not (USE_MEMORY or _app_mysql_enabled()):
        raise HTTPException(status_code=501, detail="User discounts require app MySQL or USE_MEMORY=1")
    ok = await data_store.delete_user_discount(user_id, discount_id, mongo_db=db)
    if not ok:
        raise HTTPException(status_code=404, detail="Discount not found")
    return {"ok": True}


@api_router.get("/admin/wholesale-requests")
async def admin_wholesale_requests(status: Optional[str] = None, _admin=Depends(get_current_admin)):
    if not (USE_MEMORY or _app_mysql_enabled()):
        raise HTTPException(status_code=501, detail="Wholesale admin requires app MySQL or USE_MEMORY=1")

    rows = await data_store.list_wholesale_requests(status=status, mongo_db=db)
    status_norm = (status or "").strip().lower()
    for row in rows:
        row.setdefault("source", "app")

    # Merge Ultimate Member–approved website dealers (live shop, then clone).
    if status_norm in {"", "approved"}:
        from wp_auth import list_um_approved_dealers

        try:
            website_dealers = await asyncio.to_thread(list_um_approved_dealers)
        except Exception:
            logger.warning("Could not load UM-approved dealers", exc_info=True)
            website_dealers = []

        seen_emails = {
            (r.get("email") or "").strip().lower()
            for r in rows
            if (r.get("email") or "").strip()
        }
        for dealer in website_dealers:
            email = (dealer.get("email") or "").strip().lower()
            if email and email in seen_emails:
                continue
            if email:
                seen_emails.add(email)
            dealer.setdefault("source", "website")
            rows.append(dealer)

    def _wholesale_sort_key(row: dict):
        raw = str(row.get("approvedAt") or row.get("created_at") or "").strip()
        if not raw:
            return datetime.min.replace(tzinfo=timezone.utc)
        try:
            dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        except ValueError:
            return datetime.min.replace(tzinfo=timezone.utc)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt

    rows.sort(key=_wholesale_sort_key, reverse=True)
    from website_routes import enrich_website_user

    enriched = []
    for row in rows:
        try:
            enriched.append(await enrich_website_user(row, db))
        except Exception:
            enriched.append(row)
    return enriched


@api_router.get("/admin/pricing-tiers")
async def admin_pricing_tiers(_admin=Depends(get_current_admin)):
    from wholesale import list_pricing_tiers

    return {"items": list_pricing_tiers()}


@api_router.post("/admin/wholesale/{user_id}/approve")
async def admin_approve_wholesale(
    user_id: str,
    background_tasks: BackgroundTasks,
    body: WholesaleApproveBody = WholesaleApproveBody(),
    admin=Depends(get_current_admin),
):
    if USE_MEMORY or _app_mysql_enabled():
        from wholesale import is_business_account, normalize_dealer_tier

        existing = await data_store.find_user_by_id(user_id, db)
        if existing and not is_business_account(existing):
            raise HTTPException(
                status_code=400,
                detail="Personal accounts stay B2C. Only business registrations from the shop or app can be approved as B2B.",
            )
        tier = normalize_dealer_tier(body.dealer_tier)
        row = await data_store.approve_wholesale(user_id, admin["id"], db, dealer_tier=tier)
        if not row:
            raise HTTPException(status_code=404, detail="User not found")

        discount_row = None
        pct = body.discount_percent
        if pct is not None and float(pct) > 0:
            from user_discounts import row_to_public, validate_discount_payload

            applies = (body.applies_to or "all").strip().lower()
            if applies not in {"all", "category"}:
                applies = "all"
            cats = [str(c).strip() for c in (body.categories or []) if str(c).strip()]
            try:
                payload = validate_discount_payload(
                    {
                        "discount_type": "percentage",
                        "discount_value": float(pct),
                        "applies_to": applies,
                        "target_ids": cats if applies == "category" else None,
                        "reason": "Assigned on wholesale approval",
                        "is_active": True,
                    }
                )
            except ValueError as exc:
                raise HTTPException(status_code=400, detail=str(exc)) from exc
            discount_row = await data_store.create_user_discount(
                user_id, payload, created_by=admin.get("id"), mongo_db=db
            )
            if discount_row:
                discount_row = row_to_public(discount_row)

        user = await data_store.find_user(row.get("email") or "", db)
        if user:
            background_tasks.add_task(_send_wholesale_decision_email_task, dict(user), approved=True)

        async def _approved_push():
            from notify import notify_user

            await notify_user(
                user_id,
                "wholesale_approved",
                "Wholesale approved",
                "Your business account is approved — wholesale prices are now unlocked.",
                data={"route": "/home"},
                mongo_db=db,
                persist=False,
            )
            if discount_row:
                dtype = discount_row.get("discount_type")
                val = discount_row.get("discount_value")
                label = f"{val}%" if dtype == "percentage" else f"€{val}"
                await notify_user(
                    user_id,
                    "personal_discount",
                    "Welcome discount",
                    f"You also received a {label} discount.",
                    data={"route": "/home"},
                    mongo_db=db,
                )

        background_tasks.add_task(_approved_push)

        out = dict(row)
        if discount_row:
            out["discount"] = discount_row
        return out
    raise HTTPException(status_code=501, detail="Wholesale admin requires app MySQL or USE_MEMORY=1")


@api_router.post("/admin/wholesale/{user_id}/reject")
async def admin_reject_wholesale(
    user_id: str,
    body: WholesaleRejectBody,
    background_tasks: BackgroundTasks,
    admin=Depends(get_current_admin),
):
    if USE_MEMORY or _app_mysql_enabled():
        row = await data_store.reject_wholesale(user_id, admin["id"], body.reason, db)
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        user = await data_store.find_user(row.get("email") or "", db)
        if user:
            background_tasks.add_task(
                _send_wholesale_decision_email_task,
                dict(user),
                approved=False,
                reason=body.reason or "",
            )

        async def _rejected_push():
            from notify import notify_user

            await notify_user(
                user_id,
                "wholesale_rejected",
                "Wholesale application update",
                "Your business application was not approved. Check the app for details.",
                data={"route": "/account"},
                mongo_db=db,
                persist=False,
            )

        background_tasks.add_task(_rejected_push)
        return row
    raise HTTPException(status_code=501, detail="Wholesale admin requires app MySQL or USE_MEMORY=1")


@api_router.post("/admin/wholesale/{user_id}/suspend")
async def admin_suspend_wholesale(user_id: str, admin=Depends(get_current_admin)):
    if USE_MEMORY or _app_mysql_enabled():
        row = await data_store.suspend_wholesale(user_id, admin["id"], db)
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        return row
    raise HTTPException(status_code=501, detail="Wholesale admin requires app MySQL or USE_MEMORY=1")


@api_router.get("/notifications")
async def list_user_notifications(current=Depends(get_current_user)):
    if USE_MEMORY or _app_mysql_enabled():
        return await data_store.list_notifications(current["id"], db)
    raise HTTPException(status_code=501, detail="Notifications require app MySQL or USE_MEMORY=1")


@api_router.post("/notifications/{note_id}/read")
async def read_notification(note_id: str, current=Depends(get_current_user)):
    if USE_MEMORY or _app_mysql_enabled():
        ok = await data_store.mark_notification_read(note_id, current["id"], db)
        if not ok:
            raise HTTPException(status_code=404, detail="Notification not found")
        return {"ok": True}
    raise HTTPException(status_code=501, detail="Notifications require app MySQL or USE_MEMORY=1")


class PushTokenBody(BaseModel):
    token: str = Field(min_length=10, max_length=512)
    platform: Optional[str] = ""


class NotificationPrefsBody(BaseModel):
    orderUpdates: Optional[bool] = None
    orders: Optional[bool] = None
    promotions: Optional[bool] = None
    newArrivals: Optional[bool] = None
    restock: Optional[bool] = None
    push: Optional[bool] = None
    cartReminders: Optional[bool] = None


class AdminBroadcastBody(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    message: str = Field(min_length=1, max_length=500)
    kind: Optional[str] = "promotion"  # promotion | new_product
    route: Optional[str] = "/home"


@api_router.post("/push/register")
async def register_push_token(body: PushTokenBody, current=Depends(get_current_user)):
    if not (USE_MEMORY or _app_mysql_enabled()):
        raise HTTPException(status_code=501, detail="Push requires app MySQL or USE_MEMORY=1")
    await data_store.upsert_push_token(
        current["id"], body.token.strip(), (body.platform or "").strip(), db
    )
    return {"ok": True}


@api_router.post("/push/unregister")
async def unregister_push_token(body: PushTokenBody, current=Depends(get_current_user)):
    if not (USE_MEMORY or _app_mysql_enabled()):
        raise HTTPException(status_code=501, detail="Push requires app MySQL or USE_MEMORY=1")
    await data_store.delete_push_token(body.token.strip(), current["id"], db)
    return {"ok": True}


@api_router.get("/notifications/prefs")
async def get_notification_prefs(current=Depends(get_current_user)):
    from push_service import PREF_DEFAULTS

    prefs = {**PREF_DEFAULTS, **(current.get("notificationPrefs") or {})}
    prefs["orders"] = bool(prefs.get("orderUpdates", True))
    return prefs


@api_router.patch("/notifications/prefs")
async def update_notification_prefs(body: NotificationPrefsBody, current=Depends(get_current_user)):
    from push_service import PREF_DEFAULTS

    if not (USE_MEMORY or _app_mysql_enabled()):
        raise HTTPException(status_code=501, detail="Prefs require app MySQL or USE_MEMORY=1")
    current_prefs = {**PREF_DEFAULTS, **(current.get("notificationPrefs") or {})}
    patch = body.model_dump(exclude_none=True)
    if "orders" in patch:
        patch["orderUpdates"] = patch.pop("orders")
    next_prefs = {**current_prefs, **patch}
    user = await data_store.update_user(current["email"], {"notificationPrefs": next_prefs}, db)
    prefs = {**PREF_DEFAULTS, **((user or {}).get("notificationPrefs") or next_prefs)}
    prefs["orders"] = bool(prefs.get("orderUpdates", True))
    return prefs


@api_router.post("/admin/broadcast")
async def admin_broadcast(body: AdminBroadcastBody, admin=Depends(get_current_admin)):
    """Notify all customers about a new product or promotion."""
    if not (USE_MEMORY or _app_mysql_enabled()):
        raise HTTPException(status_code=501, detail="Broadcast requires app MySQL or USE_MEMORY=1")
    from notify import broadcast_customers

    kind = (body.kind or "promotion").strip().lower()
    if kind not in {"promotion", "new_product"}:
        kind = "promotion"
    result = await broadcast_customers(
        kind,
        body.title.strip(),
        body.message.strip(),
        data={"route": (body.route or "/home").strip() or "/home"},
        mongo_db=db,
    )
    logger.info("Admin %s broadcast kind=%s → %s", admin.get("email"), kind, result)
    return {"ok": True, **result}


@api_router.get("/admin/notifications")
async def admin_notifications(_admin=Depends(get_current_admin)):
    if USE_MEMORY or _app_mysql_enabled():
        return await data_store.list_notifications("admin", db)
    raise HTTPException(status_code=501, detail="Notifications require app MySQL or USE_MEMORY=1")


@api_router.post("/admin/notifications/{note_id}/read")
async def admin_read_notification(note_id: str, _admin=Depends(get_current_admin)):
    """Mark an admin feed notification read (stored under user_id='admin')."""
    if USE_MEMORY or _app_mysql_enabled():
        ok = await data_store.mark_notification_read(note_id, "admin", db)
        if not ok:
            raise HTTPException(status_code=404, detail="Notification not found")
        return {"ok": True}
    raise HTTPException(status_code=501, detail="Notifications require app MySQL or USE_MEMORY=1")


# ---------------- Stripe payments ----------------
@api_router.get("/payments/stripe/config")
async def stripe_config():
    import stripe_service

    if not stripe_service.stripe_enabled():
        raise HTTPException(status_code=503, detail="Stripe is not configured")
    return {
        "publishable_key": stripe_service.get_publishable_key(),
        # Primary: PaymentIntent + Payment Element / CardField
        "intent_available": True,
        "intent_path": "/api/payments/stripe/intent",
        "mode": "payment_intent",
        # Optional fallback: hosted / embedded Checkout Session
        "checkout_available": True,
        "checkout_path": "/api/payments/stripe/checkout-session",
        "payment_methods": ["card", "mb_way", "multibanco"],
    }


async def _fetch_product_for_pricing(product_id: str):
    if _woo_catalog_enabled():
        return await asyncio.to_thread(get_woo_db().get_product_by_uuid, product_id, enrich=False)
    if USE_MEMORY:
        return memory_store.get_product(product_id, None)
    if db is not None:
        return await db.products.find_one({"id": product_id}, {"_id": 0})
    return None


@api_router.post("/payments/stripe/intent")
async def stripe_create_intent(
    body: StripePaymentIntentCreate,
    request: Request,
    current=Depends(get_current_user),
):
    """
    Create a PaymentIntent for in-app Payment Element (web) or CardField (native).
    Client confirms with Stripe.js / @stripe/stripe-react-native, then posts the order
    with stripe_payment_intent_id for server-side verify.
    """
    import stripe_service

    rate_limit(request, "stripe_intent", limit=10, window_sec=60)
    if not stripe_service.stripe_enabled():
        raise HTTPException(status_code=503, detail="Stripe is not configured")
    try:
        _lines, subtotal = await recalculate_line_items(
            body.items,
            current,
            fetch_product=_fetch_product_for_pricing,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if subtotal <= 0:
        raise HTTPException(status_code=400, detail="Invalid cart total")
    email = (body.email or current.get("email") or "").strip()
    meta = {
        "user_id": str(current.get("id") or ""),
        "server_subtotal": f"{subtotal:.2f}",
    }
    if body.order_ref:
        meta["order_ref"] = body.order_ref.strip()
    try:
        result = await asyncio.to_thread(
            stripe_service.create_payment_intent,
            subtotal,
            email=email,
            metadata=meta,
            payment_method=(body.payment_method or "").strip(),
        )
    except Exception as exc:
        raise safe_http_error(502, "Payment setup failed", exc, log_msg="stripe intent") from exc

    # Stable shape for Expo Payment Element / CardField clients
    return {
        "client_secret": result.get("client_secret") or result.get("clientSecret"),
        "clientSecret": result.get("clientSecret") or result.get("client_secret"),
        "payment_intent_id": result.get("payment_intent_id"),
        "amount": result.get("amount"),
        "currency": result.get("currency") or "eur",
        "payment_method": result.get("payment_method"),
        "payment_method_types": result.get("payment_method_types") or [],
        "status": result.get("status"),
        "mode": "payment_intent",
    }

@api_router.post("/payments/stripe/checkout")
@api_router.post("/payments/stripe/checkout-session")
@api_router.post("/payments/stripe/create-checkout-session")
async def stripe_create_checkout(
    body: StripePaymentIntentCreate,
    request: Request,
    current=Depends(get_current_user),
):
    """
    Optional Checkout Session fallback (Order and Pay primary path is PaymentIntent).
    Default ui_mode=hosted → returns `url` (checkout.stripe.com).
    ui_mode=elements/embedded → clientSecret / branded /pay page.
    """
    import stripe_service

    rate_limit(request, "stripe_checkout", limit=10, window_sec=60)
    if not stripe_service.stripe_enabled():
        raise HTTPException(status_code=503, detail="Stripe is not configured")
    try:
        _lines, subtotal = await recalculate_line_items(
            body.items,
            current,
            fetch_product=_fetch_product_for_pricing,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if subtotal <= 0:
        raise HTTPException(status_code=400, detail="Invalid cart total")
    email = (body.email or current.get("email") or "").strip()
    meta = {
        "user_id": str(current.get("id") or ""),
        "server_subtotal": f"{subtotal:.2f}",
    }
    if body.order_ref:
        meta["order_ref"] = body.order_ref.strip()
    try:
        result = await asyncio.to_thread(
            stripe_service.create_checkout_session,
            subtotal,
            email=email,
            metadata=meta,
            success_url=(body.success_url or "").strip(),
            cancel_url=(body.cancel_url or "").strip(),
            return_url=(body.return_url or "").strip(),
            ui_mode=(body.ui_mode or "hosted").strip(),
        )
    except Exception as exc:
        raise safe_http_error(502, "Checkout setup failed", exc, log_msg="stripe checkout") from exc

    if result.get("ui_mode") == "hosted" and not result.get("url"):
        raise HTTPException(status_code=502, detail="Stripe did not return a checkout URL")
    if result.get("ui_mode") == "elements" and not result.get("clientSecret"):
        raise HTTPException(status_code=502, detail="Stripe did not return a client secret")
    return result


@api_router.get("/payments/stripe/checkout/{session_id}")
async def stripe_checkout_status(session_id: str, current=Depends(get_current_user)):
    """Poll Checkout Session status by path id."""
    import stripe_service

    if not stripe_service.stripe_enabled():
        raise HTTPException(status_code=503, detail="Stripe is not configured")
    try:
        doc = await asyncio.to_thread(stripe_service.get_checkout_session, session_id)
    except Exception as exc:
        raise safe_http_error(502, "Checkout lookup failed", exc, log_msg="stripe checkout status") from exc
    if not doc:
        raise HTTPException(status_code=404, detail="Checkout session not found")
    return doc


@api_router.get("/payments/stripe/session-status")
async def stripe_session_status(session_id: str, current=Depends(get_current_user)):
    """Poll Checkout Session status (Stripe sample query shape)."""
    return await stripe_checkout_status(session_id, current)


@api_router.get("/payments/stripe/return", response_class=HTMLResponse)
async def stripe_checkout_return(session_id: str = "", canceled: str = ""):
    """Landing page after Stripe Checkout (Expo Go / in-app browser)."""
    if canceled in {"1", "true", "yes"}:
        title = "Payment cancelled"
        body = "You can close this window and return to the Samphone app."
    else:
        title = "Payment received"
        body = "You can close this window and return to the Samphone app to finish your order."
    return HTMLResponse(
        f"""<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title></head>
<body style="font-family:system-ui,sans-serif;padding:32px;text-align:center">
<h1>{title}</h1><p>{body}</p>
</body></html>"""
    )


@api_router.post("/payments/stripe/webhook")
async def stripe_webhook(request: Request):
    """Stripe live webhook — signature verified with STRIPE_WEBHOOK_SECRET."""
    import stripe
    import stripe_service

    if not stripe_service.webhook_secret_configured():
        raise HTTPException(status_code=503, detail="Stripe webhook is not configured")
    payload = await request.body()
    sig = request.headers.get("stripe-signature") or ""
    try:
        event = await asyncio.to_thread(
            stripe_service.construct_webhook_event, payload, sig
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except stripe.SignatureVerificationError as exc:
        raise HTTPException(status_code=400, detail="Invalid Stripe signature") from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    try:
        result = await asyncio.to_thread(stripe_service.handle_webhook_event, event)
    except Exception as exc:
        raise safe_http_error(500, "Webhook handling failed", exc, log_msg="stripe webhook") from exc
    return {"ok": True, **result}


# ---------------- Order routes ----------------
def _order_items_summary(order: dict, limit: int = 3) -> str:
    titles = [
        str(i.get("title") or i.get("name") or "Product").strip() or "Product"
        for i in (order.get("items") or [])
    ]
    if not titles:
        return ""
    shown = titles[:limit]
    extra = len(titles) - len(shown)
    text = ", ".join(shown)
    if extra > 0:
        text += f" +{extra} more"
    return text


def _order_notify_data(order: dict) -> dict:
    """Push/deep-link payload with line items for the app order UI."""
    items = []
    for i in order.get("items") or []:
        qty = int(i.get("quantity") or 1)
        try:
            price = float(i.get("price") or 0)
        except (TypeError, ValueError):
            price = 0.0
        try:
            line_total = float(i["line_total"]) if i.get("line_total") is not None else round(price * qty, 2)
        except (TypeError, ValueError, KeyError):
            line_total = round(price * qty, 2)
        items.append(
            {
                "product_id": str(i.get("product_id") or ""),
                "title": str(i.get("title") or i.get("name") or "Product").strip() or "Product",
                "image": str(i.get("image") or ""),
                "price": price,
                "quantity": qty,
                "line_total": line_total,
            }
        )
    return {
        "route": "/account/orders",
        "orderId": order.get("id"),
        "orderNumber": order.get("order_number"),
        "subtotal": float(order.get("subtotal") or 0),
        "status": order.get("status"),
        "language": normalize_language(order.get("language")),
        "items": items,
    }


@api_router.post("/orders")
async def create_order(
    body: OrderCreate,
    request: Request,
    background_tasks: BackgroundTasks,
    current=Depends(get_current_user),
):
    from order_tracking import attach_tracking_fields, enrich_order
    import stripe_service

    rate_limit(request, "create_order", limit=10, window_sec=60)

    try:
        priced_items, server_subtotal = await recalculate_line_items(
            body.items,
            current,
            fetch_product=_fetch_product_for_pricing,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if stripe_service.is_stripe_paid_method(body.payment_method):
        pay_id = (
            (body.stripe_payment_intent_id or "").strip()
            or (body.stripe_checkout_session_id or "").strip()
        )
        if not pay_id:
            raise HTTPException(
                status_code=400,
                detail="Card / MB WAY / Multibanco requires a paid Stripe intent or checkout session",
            )
        ok = await asyncio.to_thread(
            stripe_service.verify_stripe_payment,
            pay_id,
            server_subtotal,
        )
        if not ok:
            raise HTTPException(status_code=402, detail="Payment not completed or amount mismatch")

    stock_lines = [{"product_id": i["product_id"], "quantity": i["quantity"]} for i in priced_items]
    if _woo_catalog_enabled():
        try:
            await asyncio.to_thread(get_woo_db().decrement_stock, stock_lines)
        except ValueError:
            raise HTTPException(status_code=400, detail="Insufficient stock")
        except Exception as exc:
            raise safe_http_error(502, "Stock update failed", exc, log_msg="order stock") from exc

    from email_service import _is_business_account as _email_is_business

    is_b2b = _email_is_business(current) or bool((body.company_name or "").strip() or (body.vat_number or "").strip())
    order_prefix = "BSP" if is_b2b else "SP"
    company_name = (body.company_name or "").strip() or (current.get("businessName") or current.get("business_name") or "").strip()
    vat_number = (body.vat_number or "").strip() or (current.get("vatNumber") or current.get("vat_number") or "").strip()
    order = attach_tracking_fields(
        {
            "id": str(uuid.uuid4()),
            "order_number": order_prefix + datetime.now().strftime("%y%m%d") + str(uuid.uuid4().int)[:5],
            "user_id": current["id"],
            "customer_email": current.get("email", ""),
            "customer_name": current.get("name", ""),
            "account_type": "b2b" if is_b2b else "b2c",
            "accountType": "b2b" if is_b2b else "b2c",
            "items": priced_items,
            "subtotal": server_subtotal,
            "full_name": body.full_name.strip(),
            "phone": body.phone.strip(),
            "address": body.address.strip(),
            "city": body.city.strip(),
            "postal_code": body.postal_code.strip(),
            "country": (body.country or "").strip(),
            "company_name": company_name,
            "businessName": company_name,
            "vat_number": vat_number,
            "vatNumber": vat_number,
            "shipping_method": (body.shipping_method or "").strip(),
            "notes": (body.notes or "").strip(),
            "payment_method": body.payment_method,
            "stripe_payment_intent_id": body.stripe_payment_intent_id
            or body.stripe_checkout_session_id,
            "status": "order_placed",
            "language": normalize_language(current.get("language")),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    if USE_MEMORY or _app_mysql_enabled():
        order = await data_store.insert_order_without_stock(order, db)
        await data_store.mark_cart_converted(current["id"], current.get("email", ""), db)
    else:
        await db.orders.insert_one(order)
        order.pop("_id", None)
        await data_store.mark_cart_converted(current["id"], current.get("email", ""), db)
        order = enrich_order(order)

    async def _order_push():
        from notify import notify_user

        summary = _order_items_summary(order)
        lang = normalize_language(order.get("language"))
        subtotal = f"€{float(order.get('subtotal') or 0):.2f}"
        body = tr(lang, "push.order.confirmed.body", order_number=order.get("order_number"), subtotal=subtotal)
        if summary:
            body = f"{body} {summary}"
        await notify_user(
            current["id"],
            "order_placed",
            tr(lang, "order.confirmed.title"),
            body,
            data=_order_notify_data(order),
            mongo_db=db,
        )

    def _order_emails():
        try:
            from email_service import send_admin_new_order_email, send_order_confirmation_email

            send_order_confirmation_email(order)
            send_admin_new_order_email(order)
        except Exception as exc:
            logger.warning("Order confirmation emails failed for %s: %s", order.get("order_number"), exc)

    background_tasks.add_task(_order_push)
    background_tasks.add_task(_order_emails)
    return order


@api_router.post("/orders/{order_id}/cancel")
async def cancel_order(
    order_id: str,
    background_tasks: BackgroundTasks,
    current=Depends(get_current_user),
):
    from order_tracking import CANCEL_BLOCKED_STATUSES

    if not (USE_MEMORY or _app_mysql_enabled() or db is not None):
        raise HTTPException(status_code=501, detail="Order cancel requires app storage")

    existing = await data_store.get_order(order_id, current["id"], db)
    if not existing:
        raise HTTPException(status_code=404, detail="Order not found")

    status = str(existing.get("status") or "").strip().lower()
    if status == "cancelled":
        return existing
    if status in CANCEL_BLOCKED_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Order cannot be cancelled (status: {status})",
        )

    refundable = status in {
        "processing",
        "pending",
        "paid",
        "confirmed",
        "placed",
        "order_placed",
    }
    pi = (existing.get("stripe_payment_intent_id") or existing.get("stripe_checkout_session_id") or "").strip()
    if refundable and pi:
        import stripe_service

        if not os.environ.get("STRIPE_SECRET_KEY"):
            raise HTTPException(status_code=503, detail="Stripe is not configured for refunds")
        try:
            await asyncio.to_thread(stripe_service.refund_payment_intent, pi)
        except Exception as exc:
            msg = str(exc).lower()
            if "already been refunded" in msg or "already_refunded" in msg or "no such" in msg:
                logger.info("Stripe refund skipped for order %s: %s", order_id, exc)
            else:
                logger.warning("Stripe refund failed for order %s: %s", order_id, exc)
                raise HTTPException(status_code=502, detail="Payment refund failed") from exc

    updated = await data_store.update_order_status(order_id, current["id"], "cancelled", db)
    if not updated:
        raise HTTPException(status_code=404, detail="Order not found")

    async def _cancel_push():
        from notify import notify_user

        summary = _order_items_summary(updated)
        lang = normalize_language(updated.get("language"))
        body = tr(lang, "push.order.cancelled.body", order_number=updated.get("order_number"))
        if summary:
            body = f"{body} {summary}"
        await notify_user(
            current["id"],
            "order_cancelled",
            tr(lang, "order.cancelled.title"),
            body,
            data=_order_notify_data(updated),
            mongo_db=db,
        )

    def _cancel_emails():
        try:
            from email_service import send_admin_order_cancelled_email, send_order_cancelled_email

            send_order_cancelled_email(updated)
            send_admin_order_cancelled_email(updated)
        except Exception as exc:
            logger.warning("Order cancel emails failed for %s: %s", updated.get("order_number"), exc)

    background_tasks.add_task(_cancel_push)
    background_tasks.add_task(_cancel_emails)
    return updated


@api_router.get("/orders")
async def list_orders(current=Depends(get_current_user)):
    try:
        if USE_MEMORY or _app_mysql_enabled():
            return await data_store.list_orders(current["id"], db)
        docs = await db.orders.find({"user_id": current["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
        from order_tracking import enrich_order

        return [enrich_order(d) for d in docs]
    except HTTPException:
        raise
    except Exception as exc:
        msg = str(exc)
        if "max_connections_per_hour" in msg or "1226" in msg:
            raise HTTPException(
                status_code=503,
                detail="Database temporarily unavailable (Hostinger hourly connection quota). Try again later.",
            ) from exc
        raise


@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, current=Depends(get_current_user)):
    if USE_MEMORY or _app_mysql_enabled():
        doc = await data_store.get_order(order_id, current["id"], db)
        if not doc:
            raise HTTPException(status_code=404, detail="Order not found")
        return doc
    doc = await db.orders.find_one({"id": order_id, "user_id": current["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")
    from order_tracking import enrich_order

    return enrich_order(doc)


@api_router.post("/notify-stock")
async def notify_stock(body: StockNotify, request: Request, background_tasks: BackgroundTasks):
    reject_honeypot(body.website)
    rate_limit(request, "notify_stock", limit=10, window_sec=60)
    email = str(body.email).strip().lower()
    await data_store.upsert_stock_notification(body.product_id, email, db)
    from jobs.alert_emails import confirm_restock_signup

    background_tasks.add_task(confirm_restock_signup, body.product_id, email)
    return {"ok": True}


@api_router.get("/stock-alerts")
async def list_stock_alerts(current=Depends(get_current_user)):
    email = str(current.get("email") or "").strip().lower()
    rows = await data_store.list_stock_notifications(email, db)
    from jobs.alert_emails import _product_title, resolve_product_sync

    items = []
    for row in rows:
        pid = str(row.get("product_id") or "")
        product = resolve_product_sync(pid) if pid else None
        items.append(
            {
                "product_id": pid,
                "email": email,
                "title": _product_title(product) if product else pid,
                "created_at": row.get("created_at"),
            }
        )
    return {"items": items}


@api_router.delete("/stock-alerts/{product_id}")
async def delete_stock_alert(product_id: str, current=Depends(get_current_user)):
    email = str(current.get("email") or "").strip().lower()
    ok = await data_store.delete_stock_notification(product_id, email, db)
    if not ok:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"ok": True}


@api_router.put("/cart")
async def upsert_cart(body: SavedCartUpsert, current=Depends(get_current_user)):
    items = [i.dict() for i in body.items]
    await data_store.upsert_saved_cart(
        current["id"],
        current.get("email", ""),
        items,
        body.subtotal,
        db,
    )
    return {"ok": True, "items": len(items)}


@api_router.delete("/cart")
async def delete_cart(current=Depends(get_current_user)):
    await data_store.clear_saved_cart(current["id"], db)
    return {"ok": True}


@api_router.post("/translate")
async def translate_texts(body: TranslateBody):
    import asyncio

    target = normalize_language(body.target)
    cleaned = [translate_service.clean_description(t) if t else "" for t in body.texts]
    texts = await asyncio.to_thread(translate_service.translate_batch, cleaned, target)
    return {"texts": texts}


@api_router.get("/app/health")
def app_db_health():
    return get_app_db().health()


@api_router.get("/health")
def api_health():
    """Lightweight production readiness probe (no secrets)."""
    from live_mysql import live_configured
    from integrations.dpd.config import get_dpd_settings
    import stripe_service

    catalog_ok = False
    published = None
    try:
        if _woo_catalog_enabled():
            h = get_woo_db().health()
            catalog_ok = bool(h.get("ok") or h.get("configured"))
            published = h.get("published_products")
    except Exception:
        catalog_ok = False
    dpd = get_dpd_settings()
    return {
        "ok": True,
        "environment": os.environ.get("ENVIRONMENT", "development"),
        "catalog_ok": catalog_ok,
        "published_products": published,
        "live_sync_configured": live_configured(),
        "stripe_configured": bool(os.environ.get("STRIPE_SECRET_KEY")),
        "clerk_configured": bool(os.environ.get("CLERK_SECRET_KEY")),
        "dpd_configured": bool(dpd.configured() and dpd.sub_account_code),
        "webhook_configured": stripe_service.webhook_secret_configured(),
    }


@api_router.get("/")
async def root():
    return {"message": "Samphone API"}


register_shipment_routes(
    api_router,
    get_current_user=get_current_user,
    get_current_admin=get_current_admin,
)
from website_routes import register_website_routes

register_website_routes(
    api_router,
    get_current_user=get_current_user,
    get_current_admin=get_current_admin,
    create_token=create_token,
    mongo_db=db,
)
app.include_router(api_router)

# Admin-uploaded product image overrides
_uploads_dir = ROOT_DIR / "uploads"
_uploads_dir.mkdir(parents=True, exist_ok=True)
from fastapi.staticfiles import StaticFiles

app.mount("/uploads", StaticFiles(directory=str(_uploads_dir)), name="uploads")

@app.middleware("http")
async def log_request_timing(request: Request, call_next):
    started = time.perf_counter()
    response = await call_next(request)
    ms = int((time.perf_counter() - started) * 1000)
    path = request.url.path
    if path.startswith("/api/"):
        logger.info("HTTP %s %s -> %s in %sms", request.method, path, response.status_code, ms)
        response.headers["X-Response-Time-Ms"] = str(ms)
    return response


app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=500)

_cors = cors_origins()
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_cors,
    allow_origin_regex=r"https://([a-z0-9-]+\.)*(vercel\.app|samphone\.eu|samphone\.cloud|samphone\.pt)",
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Voice-Request-Id", "X-Requested-With"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


## SEED_VERSION = "v5-brands"
## SEED_VERSION = "v6-categories"
SEED_VERSION = "v8-samphone-full"


@app.on_event("startup")
async def seed():
    port = int(os.environ.get("BACKEND_PORT", os.environ.get("PORT", "8006")))
    if port in EXPO_PORTS:
        logger.error(
            "Backend is on port %s — same as Expo Metro! Use port 8006 for API: "
            "python -m uvicorn server:app --host 0.0.0.0 --port 8006 --reload",
            port,
        )
    if not FRONTEND_ASSETS.is_dir():
        logger.warning("Frontend assets folder missing: %s", FRONTEND_ASSETS)

    if USE_CATALOG_MYSQL or get_woo_db().configured():
        async def _warm_catalog() -> None:
            try:
                woo = get_woo_db()
                if hasattr(woo, "db") and hasattr(woo.db, "ensure_app_tables"):
                    await asyncio.to_thread(woo.db.ensure_app_tables)
                info = await asyncio.to_thread(woo.warm_catalog)
                global _CATALOG_MYSQL_LIVE
                _CATALOG_MYSQL_LIVE = True
                logger.info(
                    "Catalog ready (%s): %s products in %sms",
                    info.get("source") or "catalog",
                    info.get("products"),
                    info.get("load_ms"),
                )
            except Exception as exc:
                logger.warning("Catalog warm failed: %s", exc)
                if _is_catalog_connectivity_error(exc):
                    _enable_memory_catalog_fallback(str(exc))

        asyncio.create_task(_warm_catalog())
        logger.info("Catalog source: MySQL clone (USE_CATALOG_MYSQL=1, WooCommerce REST disabled)")

    if os.environ.get("SYNC_CATALOG_ON_STARTUP", "0") == "1":
        async def _sync_loop() -> None:
            from jobs.sync_catalog import sync_catalog_tick

            await asyncio.sleep(30)
            tick = 0
            # Full public-band remap about once per day (every ~288 ticks at 5 min).
            public_every = max(1, int(os.environ.get("SYNC_PUBLIC_PRICES_EVERY_TICKS", "288")))
            while True:
                try:
                    tick += 1
                    result = await asyncio.to_thread(
                        sync_catalog_tick,
                        refresh_public_prices=(tick % public_every == 0),
                    )
                    logger.info("Catalog sync tick: %s", result)
                except Exception as exc:
                    logger.warning("Catalog sync tick failed: %s", exc)
                await asyncio.sleep(int(os.environ.get("SYNC_CATALOG_INTERVAL_SEC", "300")))

        asyncio.create_task(_sync_loop())

    if USE_APP_MYSQL and get_app_db().configured():
        ok = await asyncio.to_thread(get_app_db().probe_startup)
        if ok:
            try:
                if ADMIN_PASSWORD:
                    await asyncio.to_thread(get_app_db().seed_admin_user, ADMIN_EMAIL, hash_password(ADMIN_PASSWORD))
                health = await asyncio.to_thread(get_app_db().health)
                logger.info("App MySQL ready: %s users, %s orders", health.get("users"), health.get("orders"))
            except Exception as exc:
                logger.warning("App MySQL post-probe setup deferred: %s", exc)
        else:
            # Dev/local fallback so auth/wholesale still work when Hostinger blocks this IP.
            _enable_memory_catalog_fallback(
                "App MySQL probe failed — check Hostinger remote MySQL + IP allowlist"
            )

    async def _cart_abandonment_loop() -> None:
        """Periodic abandoned-cart reminders. Skipped in local/dev unless explicitly enabled."""
        from cart_email_jobs import abandoned_cart_emails_enabled, process_abandoned_cart_emails

        if not abandoned_cart_emails_enabled():
            logger.info(
                "Abandoned-cart email job disabled "
                "(set ENABLE_ABANDONED_CART_EMAILS=1 to enable)"
            )
            return

        await asyncio.sleep(120)
        backoff_sec = 3600
        while True:
            try:
                if USE_APP_MYSQL:
                    app = get_app_db()
                    if not app.configured() or not app.is_runtime_ready():
                        logger.info("Abandoned-cart job skipped — App MySQL unavailable")
                        await asyncio.sleep(backoff_sec)
                        continue
                await process_abandoned_cart_emails(None)
                backoff_sec = 3600
            except Exception as exc:
                msg = str(exc)
                # DNS / Hostinger remote MySQL blips — back off and avoid log spam
                if any(
                    s in msg
                    for s in (
                        "getaddrinfo failed",
                        "Can't connect to MySQL",
                        "timed out",
                        "Connection refused",
                        "Name or service not known",
                    )
                ):
                    backoff_sec = min(backoff_sec * 2, 6 * 3600)
                    logger.warning(
                        "Abandoned-cart email job: MySQL unreachable (%s). "
                        "Retrying in %ss. For local/dev set ENABLE_ABANDONED_CART_EMAILS=0.",
                        msg.split("\n")[0][:160],
                        backoff_sec,
                    )
                else:
                    logger.warning("Abandoned-cart email job failed: %s", exc)
                    backoff_sec = 3600
            await asyncio.sleep(backoff_sec)

    asyncio.create_task(_cart_abandonment_loop())

    async def _alert_email_loop() -> None:
        from jobs.alert_emails import process_alert_emails

        await asyncio.sleep(90)
        interval = max(60, int(os.environ.get("ALERT_EMAIL_INTERVAL_SEC", "900")))
        while True:
            try:
                result = await process_alert_emails(None)
                logger.info("Alert email job: %s", result)
            except Exception as exc:
                logger.warning("Alert email job failed: %s", exc)
            await asyncio.sleep(interval)

    asyncio.create_task(_alert_email_loop())

    if USE_MEMORY and not _woo_catalog_enabled():
        if ADMIN_PASSWORD:
            memory_store.seed_admin_user(ADMIN_EMAIL, hash_password(ADMIN_PASSWORD))
            logger.info("Admin user seeded for %s (password from ADMIN_PASSWORD env)", ADMIN_EMAIL)
        else:
            logger.warning("ADMIN_PASSWORD unset — skipping memory admin seed")
        if memory_store.seed_meta(SEED_VERSION):
            logger.info(f"Memory catalog ready: {len(PRODUCTS)} products, {len(MODELS)} models ({SEED_VERSION})")
        return
    elif USE_MEMORY and _woo_catalog_enabled():
        if ADMIN_PASSWORD:
            memory_store.seed_admin_user(ADMIN_EMAIL, hash_password(ADMIN_PASSWORD))
        logger.info("USE_MEMORY=1 set but catalog MySQL is active — using MySQL for products")
        return
    if _app_mysql_enabled():
        return
    if not data_store.uses_mongo() or db is None:
        return
    meta = await db.meta.find_one({"_id": "seed"})
    if not meta or meta.get("version") != SEED_VERSION:
        await db.products.delete_many({})
        await db.products.insert_many([enrich_product_pricing(dict(p)) for p in PRODUCTS])
        await db.meta.update_one({"_id": "seed"}, {"$set": {"version": SEED_VERSION}}, upsert=True)
        logger.info(f"Seeded {len(PRODUCTS)} products ({SEED_VERSION})")


@app.on_event("shutdown")
async def shutdown_db_client():
    try:
        from integrations.dpd.client import close_dpd_client

        await close_dpd_client()
    except Exception:
        pass
    if client:
        client.close()
