from __future__ import annotations

"""Website-only FastAPI routes (storefront admin PATCH, MFA, leads)."""

import logging
from typing import Any, Callable, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field

import data_store
import mfa
from security_hardening import rate_limit, reject_honeypot
from user_discounts import is_discount_active, validate_discount_payload
from wholesale import is_business_account, user_public_wholesale

logger = logging.getLogger(__name__)


class MfaVerifyBody(BaseModel):
    mfa_token: str = Field(min_length=8)
    code: str = Field(min_length=4, max_length=12)
    email: Optional[str] = None


class MfaSetupBody(BaseModel):
    enabled: bool = True


class ContactLeadBody(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    subject: Optional[str] = ""
    message: str = Field(min_length=1, max_length=5000)
    website: Optional[str] = ""


class NewsletterBody(BaseModel):
    email: EmailStr
    website: Optional[str] = ""


class RepairLeadBody(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    phone: str = Field(min_length=5, max_length=40)
    device: Optional[str] = ""
    services: Optional[list[str]] = None
    urgency: Optional[str] = ""
    notes: Optional[str] = ""
    total: Optional[float] = None
    website: Optional[str] = ""


class TradeInLeadBody(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    phone: str = Field(min_length=5, max_length=40)
    brand: Optional[str] = ""
    model: Optional[str] = ""
    condition: Optional[str] = ""
    age_years: Optional[float] = None
    estimate: Optional[float] = None
    code: Optional[str] = ""
    website: Optional[str] = ""


class AdminUserPatchBody(BaseModel):
    wholesaleStatus: Optional[str] = None
    wholesale_status: Optional[str] = None
    isWholesale: Optional[bool] = None
    accountDiscountPercent: Optional[float] = None
    account_discount_percent: Optional[float] = None
    discountPercent: Optional[float] = None
    discount_percent: Optional[float] = None
    personalPricing: Optional[list[Any]] = None
    personal_pricing: Optional[list[Any]] = None
    dealerTier: Optional[str] = None
    dealer_tier: Optional[str] = None
    reason: Optional[str] = None


def _pct(body: AdminUserPatchBody) -> Optional[float]:
    for raw in (
        body.accountDiscountPercent,
        body.account_discount_percent,
        body.discountPercent,
        body.discount_percent,
    ):
        if raw is None:
            continue
        try:
            val = float(raw)
        except (TypeError, ValueError):
            continue
        if val < 0:
            continue
        return min(100.0, val)
    return None


def _rules(body: AdminUserPatchBody) -> Optional[list]:
    if body.personalPricing is not None:
        return body.personalPricing
    if body.personal_pricing is not None:
        return body.personal_pricing
    return None


def discounts_to_website_fields(rows: list[dict]) -> dict:
    account_pct = None
    rules: list[dict] = []
    for row in rows:
        if not is_discount_active(row):
            continue
        applies = (row.get("applies_to") or row.get("appliesTo") or "all").lower()
        dtype = (row.get("discount_type") or row.get("discountType") or "").lower()
        try:
            val = float(row.get("discount_value") or row.get("discountValue") or 0)
        except (TypeError, ValueError):
            continue
        if applies == "all" and dtype == "percentage" and account_pct is None:
            account_pct = val
            continue
        rule: dict[str, Any] = {}
        if dtype == "percentage":
            rule["percent"] = val
        elif dtype == "fixed":
            rule["fixedEur"] = val
        targets = row.get("target_ids") or row.get("targetIds") or []
        if isinstance(targets, str):
            targets = [targets]
        first = str(targets[0]).strip() if targets else ""
        if applies == "product" and first:
            if first.isdigit():
                rule["wooProductId"] = int(first)
            else:
                rule["productId"] = first
        if applies == "category" and first:
            rule["categoryId"] = first
            rule["categorySlug"] = first
            rule["categoryName"] = first
        if rule:
            rules.append(rule)
    out: dict[str, Any] = {
        "personalPricing": rules,
        "personal_pricing": rules,
    }
    if account_pct is not None:
        out["accountDiscountPercent"] = account_pct
        out["account_discount_percent"] = account_pct
    return out


async def enrich_website_user(user: dict, mongo_db) -> dict:
    public = user_public_wholesale(user) if user.get("id") else dict(user)
    uid = str(public.get("id") or user.get("id") or "")
    if uid:
        try:
            rows = await data_store.list_user_discounts(uid, mongo_db)
        except Exception:
            rows = []
        public.update(discounts_to_website_fields(rows))
    return public


def _rule_to_discount_payload(rule: Any) -> Optional[dict]:
    if not isinstance(rule, dict):
        return None
    percent = rule.get("percent")
    fixed = rule.get("fixedEur") or rule.get("fixed_eur")
    product_id = rule.get("productId") or rule.get("product_id")
    woo_id = rule.get("wooProductId") or rule.get("woo_product_id")
    category = (
        rule.get("categorySlug")
        or rule.get("category_slug")
        or rule.get("categoryId")
        or rule.get("category_id")
        or rule.get("categoryName")
        or rule.get("category_name")
    )
    if percent is not None and float(percent) > 0:
        payload = {
            "discount_type": "percentage",
            "discount_value": float(percent),
            "reason": "Website admin personal pricing",
            "is_active": True,
        }
    elif fixed is not None and float(fixed) > 0:
        payload = {
            "discount_type": "fixed",
            "discount_value": float(fixed),
            "reason": "Website admin personal pricing",
            "is_active": True,
        }
    else:
        return None
    if product_id or woo_id:
        payload["applies_to"] = "product"
        payload["target_ids"] = [str(woo_id or product_id)]
    elif category:
        payload["applies_to"] = "category"
        payload["target_ids"] = [str(category)]
    else:
        payload["applies_to"] = "all"
    return payload


def register_website_routes(
    api_router: APIRouter,
    *,
    get_current_user: Callable,
    get_current_admin: Callable,
    create_token: Callable,
    mongo_db,
) -> None:
    async def _send_lead(subject: str, html: str, text: str) -> None:
        try:
            from email_service import admin_notify_email, send_email

            send_email(admin_notify_email(), subject, html, text)
        except Exception as exc:
            logger.warning("Lead email failed (%s): %s", subject, exc)

    @api_router.post("/auth/mfa/verify")
    async def website_mfa_verify(body: MfaVerifyBody, request: Request):
        rate_limit(request, "auth_mfa_verify", limit=20, window_sec=60)
        email = mfa.verify_challenge(body.mfa_token, body.code, body.email)
        user = await data_store.find_user(email, mongo_db)
        if not user:
            raise HTTPException(status_code=400, detail="User not found")
        return {"access_token": create_token(email), "user": user_public_wholesale(user)}

    @api_router.post("/auth/mfa/setup")
    async def website_mfa_setup(body: MfaSetupBody, current=Depends(get_current_user)):
        prefs = dict(current.get("notificationPrefs") or {})
        prefs["mfaEnabled"] = bool(body.enabled)
        email = (current.get("email") or "").strip().lower()
        updated = await data_store.update_user(email, {"notificationPrefs": prefs}, mongo_db)
        return {"ok": True, "mfaEnabled": bool(body.enabled), "user": user_public_wholesale(updated or current)}

    @api_router.post("/leads/contact")
    @api_router.post("/contact")
    async def website_contact(body: ContactLeadBody, request: Request, background_tasks: BackgroundTasks):
        reject_honeypot(body.website)
        rate_limit(request, "lead_contact", limit=8, window_sec=60)
        subject = (body.subject or "Website contact").strip() or "Website contact"
        html = (
            f"<p><strong>Name:</strong> {body.name}</p>"
            f"<p><strong>Email:</strong> {body.email}</p>"
            f"<p><strong>Subject:</strong> {subject}</p>"
            f"<p>{body.message}</p>"
        )
        background_tasks.add_task(_send_lead, f"Contact: {subject}", html, body.message)
        return {"ok": True}

    @api_router.post("/leads/newsletter")
    @api_router.post("/newsletter")
    async def website_newsletter(body: NewsletterBody, request: Request, background_tasks: BackgroundTasks):
        reject_honeypot(body.website)
        rate_limit(request, "lead_newsletter", limit=10, window_sec=60)
        html = f"<p>Newsletter signup: {body.email}</p>"
        background_tasks.add_task(_send_lead, "Newsletter signup", html, str(body.email))
        return {"ok": True}

    @api_router.post("/leads/repair")
    async def website_repair(body: RepairLeadBody, request: Request, background_tasks: BackgroundTasks):
        reject_honeypot(body.website)
        rate_limit(request, "lead_repair", limit=8, window_sec=60)
        services = ", ".join(body.services or [])
        text = (
            f"{body.name} / {body.phone}\n{body.device}\n{services}\n"
            f"{body.urgency}\n€{body.total}\n{body.notes}"
        )
        background_tasks.add_task(_send_lead, "Repair booking", f"<pre>{text}</pre>", text)
        return {"ok": True}

    @api_router.post("/leads/trade-in")
    async def website_trade_in(body: TradeInLeadBody, request: Request, background_tasks: BackgroundTasks):
        reject_honeypot(body.website)
        rate_limit(request, "lead_tradein", limit=8, window_sec=60)
        text = (
            f"{body.name} / {body.phone}\n{body.brand} {body.model}\n"
            f"{body.condition} / {body.age_years}y\n€{body.estimate}\n{body.code}"
        )
        background_tasks.add_task(_send_lead, "Trade-in request", f"<pre>{text}</pre>", text)
        return {"ok": True}

    async def _patch_admin_user(user_id: str, body: AdminUserPatchBody, admin: dict):
        user = await data_store.find_user_by_id(user_id, mongo_db)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        status = (body.wholesaleStatus or body.wholesale_status or "").strip().lower()
        if status == "approved":
            if not is_business_account(user):
                raise HTTPException(
                    status_code=400,
                    detail="Personal accounts stay B2C. Only business registrations from the shop or app can be approved as B2B.",
                )
            user = await data_store.approve_wholesale(user_id, admin.get("id"), mongo_db) or user
        elif status == "rejected":
            user = await data_store.reject_wholesale(
                user_id, admin.get("id"), body.reason or "Rejected from website admin", mongo_db
            ) or user
        elif status == "suspended":
            user = await data_store.suspend_wholesale(user_id, admin.get("id"), mongo_db) or user

        replace_pricing = _pct(body) is not None or _rules(body) is not None
        if replace_pricing:
            existing = await data_store.list_user_discounts(user_id, mongo_db)
            for row in existing:
                rid = row.get("id")
                if rid:
                    await data_store.delete_user_discount(user_id, rid, mongo_db)
            payloads: list[dict] = []
            pct = _pct(body)
            if pct is not None and pct > 0:
                payloads.append(
                    {
                        "discount_type": "percentage",
                        "discount_value": pct,
                        "applies_to": "all",
                        "reason": "Website account discount",
                        "is_active": True,
                    }
                )
            for rule in _rules(body) or []:
                mapped = _rule_to_discount_payload(rule)
                if mapped:
                    payloads.append(mapped)
            for raw in payloads:
                try:
                    data = validate_discount_payload(raw, partial=False)
                except ValueError as exc:
                    raise HTTPException(status_code=400, detail=str(exc)) from exc
                await data_store.create_user_discount(
                    user_id, data, created_by=admin.get("id"), mongo_db=mongo_db
                )

        latest = await data_store.find_user_by_id(user_id, mongo_db) or user
        return await enrich_website_user(latest, mongo_db)

    @api_router.patch("/admin/users/{user_id}")
    async def website_patch_admin_user(
        user_id: str,
        body: AdminUserPatchBody,
        admin=Depends(get_current_admin),
    ):
        return await _patch_admin_user(user_id, body, admin)

    @api_router.patch("/admin/wholesale-requests/{user_id}")
    async def website_patch_wholesale_request(
        user_id: str,
        body: AdminUserPatchBody,
        admin=Depends(get_current_admin),
    ):
        return await _patch_admin_user(user_id, body, admin)
