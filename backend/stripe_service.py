"""Stripe payment helpers — secret key stays server-side only.

Primary flow (Order and Pay):
  PaymentIntent + client-side Payment Element (web) / CardField (native).
  POST /api/payments/stripe/intent → client confirms → order with stripe_payment_intent_id.

Optional fallback:
  Hosted / Embedded Checkout via create_checkout_session (checkout-session endpoints).

Payment methods (Portugal):
  Card, MB WAY, Multibanco — enable in Stripe Dashboard → Payment methods.
  Register Payment Method Domains for Expo web / app hosts if wallets need them.

Ops checklist:
  - Live STRIPE_SECRET_KEY + STRIPE_PUBLISHABLE_KEY must match EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY.
  - Dashboard: enable Card, MB WAY, Multibanco for PT.
  - Dashboard → Settings → Payment method domains: samphone.cloud, localhost (dev), etc.
"""
from __future__ import annotations

import logging
import os
from typing import Any, Optional

import stripe

logger = logging.getLogger(__name__)

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")

STRIPE_PUBLISHABLE_KEY = os.environ.get("STRIPE_PUBLISHABLE_KEY", "")

# Payment Method Domain for Elements / wallets on our hosts.
DEFAULT_PAYMENT_METHOD_DOMAIN_ID = "pmd_1U589OIFNHslwSxOXZgp01zy"  # samphone.cloud
_STRIPE_SYSTEM_PMD_DOMAINS = frozenset({"checkout.stripe.com", "js.stripe.com"})

CHECKOUT_PAYMENT_METHOD_TYPES = ("card", "mb_way", "multibanco")
PAID_APP_METHODS = frozenset({"card", "mbway", "mb_way", "multibanco", "bank"})
# Multibanco / MB WAY may settle asynchronously.
PAID_INTENT_STATUSES = frozenset({"succeeded", "processing"})
REJECTED_INTENT_STATUSES = frozenset(
    {
        "requires_payment_method",
        "canceled",
        "requires_action",
        "requires_confirmation",
        "requires_capture",
    }
)


def stripe_enabled() -> bool:
    return bool(stripe.api_key and STRIPE_PUBLISHABLE_KEY)


def get_publishable_key() -> str:
    return STRIPE_PUBLISHABLE_KEY


def public_api_base() -> str:
    return (
        os.environ.get("PUBLIC_API_URL", "").strip()
        or os.environ.get("API_PUBLIC_URL", "").strip()
        or "https://samphone.cloud"
    ).rstrip("/")


def is_stripe_paid_method(method: str) -> bool:
    return (method or "").strip().lower() in PAID_APP_METHODS


def _amount_cents(amount_eur: float) -> int:
    return max(50, int(round(float(amount_eur) * 100)))


def _meta(email: str, metadata: dict[str, str] | None) -> dict[str, str]:
    meta = {k: str(v) for k, v in (metadata or {}).items() if v is not None}
    if email:
        meta["customer_email"] = email
    return meta


def _normalize_preferred_method(method: str) -> str:
    """Map app payment_method → Stripe preference bucket."""
    m = (method or "").strip().lower()
    if m in {"mbway", "mb_way"}:
        return "mb_way"
    if m in {"bank", "multibanco", "mb"}:
        return "multibanco"
    if m in {"", "card", "auto", "element", "elements", "payment_element"}:
        return "card"
    return m


def _intent_create_params(
    *,
    cents: int,
    email: str,
    metadata: dict[str, str],
    preferred: str,
) -> dict[str, Any]:
    """
    Build PaymentIntent.create kwargs for Payment Element / CardField.

    - card / unset → automatic methods with redirects (shows PT methods when eligible)
    - mbway → ["mb_way","card"]
    - bank/multibanco → ["multibanco","card"]
    """
    params: dict[str, Any] = {
        "amount": cents,
        "currency": "eur",
        "receipt_email": email or None,
        "metadata": metadata,
    }

    if preferred == "mb_way":
        params["payment_method_types"] = ["mb_way", "card"]
    elif preferred == "multibanco":
        params["payment_method_types"] = ["multibanco", "card"]
    else:
        # Payment Element: let Dashboard methods + redirects surface MB WAY / Multibanco.
        params["automatic_payment_methods"] = {
            "enabled": True,
            "allow_redirects": "always",
        }

    return params


def create_payment_intent(
    amount_eur: float,
    *,
    email: str = "",
    metadata: dict[str, str] | None = None,
    payment_method: str = "",
) -> dict[str, Any]:
    """
    PaymentIntent for Payment Element (web) / CardField (native).

    Returns client_secret for client-side confirmPayment / confirm.
    """
    if not stripe.api_key:
        raise RuntimeError("STRIPE_SECRET_KEY is not configured")

    preferred = _normalize_preferred_method(payment_method)
    cents = _amount_cents(amount_eur)
    meta = _meta(email, metadata)
    params = _intent_create_params(cents=cents, email=email, metadata=meta, preferred=preferred)

    try:
        intent = stripe.PaymentIntent.create(**params)
    except stripe.InvalidRequestError as exc:
        logger.warning(
            "PaymentIntent create with preferred=%s failed (%s); retrying Payment Element defaults",
            preferred,
            exc,
        )
        # Fallback: explicit PT types (compatible with Payment Element).
        fallback = {
            "amount": cents,
            "currency": "eur",
            "receipt_email": email or None,
            "metadata": meta,
            "payment_method_types": list(CHECKOUT_PAYMENT_METHOD_TYPES),
        }
        try:
            intent = stripe.PaymentIntent.create(**fallback)
        except stripe.InvalidRequestError:
            # Last resort: card-only automatic (no redirects).
            intent = stripe.PaymentIntent.create(
                amount=cents,
                currency="eur",
                receipt_email=email or None,
                metadata=meta,
                automatic_payment_methods={"enabled": True, "allow_redirects": "never"},
            )

    # Optional MB WAY expiry when Stripe account supports it (best-effort, non-fatal).
    if preferred == "mb_way" and intent.id:
        try:
            intent = stripe.PaymentIntent.modify(
                intent.id,
                payment_method_options={"mb_way": {"requested_expiry": 5}},
            )
        except stripe.InvalidRequestError:
            pass

    used_types = list(getattr(intent, "payment_method_types", None) or [])
    return {
        "payment_intent_id": intent.id,
        "client_secret": intent.client_secret,
        "clientSecret": intent.client_secret,
        "amount": intent.amount,
        "currency": intent.currency or "eur",
        "payment_method": preferred if preferred in {"card", "mb_way", "multibanco"} else "card",
        "payment_method_types": used_types,
        "status": intent.status,
        "mode": "payment_intent",
    }


def _line_items(amount_cents: int) -> list[dict[str, Any]]:
    return [
        {
            "quantity": 1,
            "price_data": {
                "currency": "eur",
                "unit_amount": amount_cents,
                "product_data": {"name": "Samphone order"},
            },
        }
    ]


def _checkout_locale() -> str:
    return (os.environ.get("STRIPE_CHECKOUT_LOCALE", "pt") or "pt").strip() or "pt"


def _forced_payment_method_types() -> Optional[list[str]]:
    """
    Optional override for Checkout Sessions.
    Empty / 'dynamic' = use Dashboard dynamic methods (recommended).
    Example: STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES=card,mb_way,multibanco
    """
    raw = (os.environ.get("STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES", "dynamic") or "dynamic").strip()
    if not raw or raw.lower() in {"dynamic", "dashboard", "auto", "*"}:
        return None
    types = [t.strip() for t in raw.split(",") if t.strip()]
    return types or None


def payment_method_domain_id() -> str:
    return (
        os.environ.get("STRIPE_PAYMENT_METHOD_DOMAIN_ID", "").strip()
        or DEFAULT_PAYMENT_METHOD_DOMAIN_ID
    )


def ensure_checkout_payment_method_domains() -> dict[str, Any]:
    """
    Keep the configured Payment Method Domain (+ Stripe hosted domains) enabled.

    Wallet methods on Elements need the page host registered and enabled.
    """
    if not stripe.api_key:
        return {}

    primary_id = payment_method_domain_id()
    info: dict[str, Any] = {
        "payment_method_domain_id": primary_id,
        "domain_name": "",
        "enabled": False,
    }

    try:
        primary = stripe.PaymentMethodDomain.modify(primary_id, enabled=True)
        try:
            primary = stripe.PaymentMethodDomain.validate(primary_id)
        except Exception as exc:
            logger.info("Payment method domain validate skipped (%s): %s", primary_id, exc)
        info["domain_name"] = getattr(primary, "domain_name", "") or ""
        info["enabled"] = bool(getattr(primary, "enabled", False))
    except Exception as exc:
        logger.warning("Could not enable payment method domain %s: %s", primary_id, exc)

    try:
        for domain in stripe.PaymentMethodDomain.list(limit=100).auto_paging_iter():
            name = (getattr(domain, "domain_name", "") or "").strip().lower()
            if name in _STRIPE_SYSTEM_PMD_DOMAINS and not getattr(domain, "enabled", False):
                stripe.PaymentMethodDomain.modify(domain.id, enabled=True)
                logger.info("Re-enabled Stripe system payment method domain %s (%s)", domain.id, name)
    except Exception as exc:
        logger.warning("Could not sync Stripe system payment method domains: %s", exc)

    return info


def _base_checkout_params(
    *,
    email: str,
    metadata: dict[str, str],
    cents: int,
) -> dict[str, Any]:
    """Shared Checkout Session fields that help PT methods surface."""
    return {
        "mode": "payment",
        "customer_email": email or None,
        "metadata": metadata,
        "line_items": _line_items(cents),
        "locale": _checkout_locale(),
        # Helps MB WAY (phone) and PT local methods.
        "phone_number_collection": {"enabled": True},
        "billing_address_collection": "required",
    }


def _create_session(
    params: dict[str, Any],
    *,
    stripe_version: str | None = None,
) -> tuple[Any, list[str], str]:
    """
    Create Checkout Session.
    Prefer Dashboard dynamic methods (no payment_method_types). Stripe then shows
    enabled methods that the shopper is eligible for (PT → MB WAY / Multibanco).
    """
    create_kwargs: dict[str, Any] = {}
    if stripe_version:
        create_kwargs["stripe_version"] = stripe_version

    forced = _forced_payment_method_types()
    warning = ""

    if forced is None:
        try:
            session = stripe.checkout.Session.create(**params, **create_kwargs)
            types = list(session.payment_method_types or [])
            return session, types, warning
        except stripe.InvalidRequestError as exc:
            logger.warning("Dynamic Checkout methods failed (%s); falling back to explicit types", exc)
            warning = str(exc)
            forced = list(CHECKOUT_PAYMENT_METHOD_TYPES)

    # Explicit types fallback / override
    try:
        session = stripe.checkout.Session.create(
            **params,
            payment_method_types=forced,
            **create_kwargs,
        )
        return session, list(session.payment_method_types or forced), warning
    except stripe.InvalidRequestError as exc:
        logger.warning("Checkout with %s failed (%s); retrying card-only", forced, exc)
        session = stripe.checkout.Session.create(
            **params,
            payment_method_types=["card"],
            **create_kwargs,
        )
        return (
            session,
            list(session.payment_method_types or ["card"]),
            "Checkout fell back to cards only. Check Stripe Dashboard payment methods.",
        )


def _pay_page_url(session_id: str) -> str:
    """Branded checkout page on our domain (not checkout.stripe.com)."""
    return f"{public_api_base()}/pay?session_id={session_id}"


def create_checkout_session(
    amount_eur: float,
    *,
    email: str = "",
    metadata: dict[str, str] | None = None,
    success_url: str = "",
    cancel_url: str = "",
    return_url: str = "",
    ui_mode: str = "hosted",
) -> dict[str, Any]:
    """
    Create a Checkout Session.

    - ui_mode=hosted (default): classic Stripe page at checkout.stripe.com.
    - ui_mode=embedded / branded: Embedded Checkout on samphone.cloud/pay.
    - ui_mode=elements: returns clientSecret only (no URL) for native/in-app Elements.
    """
    if not stripe.api_key:
        raise RuntimeError("STRIPE_SECRET_KEY is not configured")

    raw_mode = (ui_mode or "hosted").strip().lower()
    if raw_mode in {"embedded", "branded", "samphone"}:
        mode = "embedded"
    elif raw_mode in {"element", "elements", "custom"}:
        mode = "elements"
    else:
        # Default / hosted / stripe_hosted → checkout.stripe.com
        mode = "stripe_hosted"

    pmd = ensure_checkout_payment_method_domains()
    base = public_api_base()
    cents = _amount_cents(amount_eur)
    meta = _meta(email, metadata)
    shared = _base_checkout_params(email=email, metadata=meta, cents=cents)
    pmd_id = pmd.get("payment_method_domain_id") or payment_method_domain_id()
    pmd_name = pmd.get("domain_name") or ""

    if mode in {"embedded", "elements"}:
        ret = (return_url or success_url or "").strip() or (
            f"{base}/api/payments/stripe/return?session_id={{CHECKOUT_SESSION_ID}}"
        )
        dahlia = os.environ.get("STRIPE_API_VERSION", "2026-03-25.dahlia").strip() or "2026-03-25.dahlia"
        last_exc: Exception | None = None
        session = None
        used_types: list[str] = []
        warning = ""
        mode_used = "embedded"
        attempts = (("embedded", None), ("elements", dahlia)) if mode == "embedded" else (("elements", dahlia), ("embedded", None))
        for attempt_mode, version in attempts:
            params = {
                **shared,
                "ui_mode": attempt_mode,
                "return_url": ret,
            }
            try:
                session, used_types, warning = _create_session(params, stripe_version=version)
                mode_used = attempt_mode
                break
            except Exception as exc:
                last_exc = exc
                logger.warning("Checkout ui_mode=%s failed: %s", attempt_mode, exc)
        if session is None:
            raise last_exc or RuntimeError("Checkout session creation failed")
        secret = session.client_secret
        pay_url = _pay_page_url(session.id) if mode == "embedded" else None
        return {
            "checkout_session_id": session.id,
            "sessionId": session.id,
            "session_id": session.id,
            "clientSecret": secret,
            "client_secret": secret,
            "url": pay_url,
            "checkoutUrl": pay_url,
            "checkout_url": pay_url,
            "amount": cents,
            "currency": "eur",
            "mode": "checkout" if mode == "embedded" else "elements",
            "ui_mode": mode_used,
            "payment_method_types": used_types,
            "payment_method_domain_id": pmd_id,
            "payment_method_domain": pmd_name or "samphone.cloud",
            "warning": warning,
            "note": (
                "Embedded Checkout on samphone.cloud/pay. "
                "MB WAY / Multibanco for PT-eligible shoppers."
            ),
        }

    # Classic Stripe-hosted page → checkout.stripe.com
    success = (success_url or "").strip() or (
        f"{base}/api/payments/stripe/return?session_id={{CHECKOUT_SESSION_ID}}"
    )
    cancel = (cancel_url or "").strip() or f"{base}/api/payments/stripe/return?canceled=1"
    params = {
        **shared,
        "success_url": success,
        "cancel_url": cancel,
    }
    session, used_types, warning = _create_session(params)
    url = session.url
    return {
        "checkout_session_id": session.id,
        "sessionId": session.id,
        "session_id": session.id,
        "url": url,
        "checkoutUrl": url,
        "checkout_url": url,
        "amount": cents,
        "currency": "eur",
        "mode": "checkout",
        "ui_mode": "hosted",
        "payment_method_types": used_types,
        "payment_method_domain_id": pmd_id,
        "payment_method_domain": pmd_name,
        "warning": warning,
        "note": (
            "MB WAY and Multibanco appear for Portugal-eligible shoppers (EUR). "
            "Apple Pay and Link are card wallets."
        ),
    }


def verify_payment_intent(payment_intent_id: str, expected_amount_eur: float) -> bool:
    return verify_stripe_payment(payment_intent_id, expected_amount_eur)


def refund_payment_intent(
    payment_intent_id: str,
    *,
    reason: str = "requested_by_customer",
) -> dict[str, Any]:
    """Refund a PaymentIntent (or cancel it if it was never captured)."""
    if not stripe.api_key:
        raise RuntimeError("STRIPE_SECRET_KEY is not configured")
    raw = (payment_intent_id or "").strip()
    if not raw:
        raise ValueError("missing payment_intent_id")

    if raw.startswith("cs_"):
        session = stripe.checkout.Session.retrieve(raw)
        pi = getattr(session, "payment_intent", None)
        raw = str(pi or "").strip()
        if not raw:
            raise ValueError("checkout session has no payment intent")

    intent = stripe.PaymentIntent.retrieve(raw)
    status = (intent.status or "").strip().lower()
    amount = int(getattr(intent, "amount", 0) or 0)
    refunded = int(getattr(intent, "amount_refunded", 0) or 0)
    if refunded and amount and refunded >= amount:
        return {
            "ok": True,
            "status": "already_refunded",
            "payment_intent_id": raw,
        }
    if status in {"canceled", "cancelled"}:
        return {
            "ok": True,
            "status": "already_canceled",
            "payment_intent_id": raw,
        }

    try:
        refund = stripe.Refund.create(payment_intent=raw, reason=reason)
        return {
            "ok": True,
            "refund_id": refund.id,
            "status": refund.status,
            "payment_intent_id": raw,
        }
    except stripe.InvalidRequestError as exc:
        msg = str(exc).lower()
        if "already been refunded" in msg or "has already been refunded" in msg:
            return {
                "ok": True,
                "status": "already_refunded",
                "payment_intent_id": raw,
            }
        if status in {"processing", "requires_capture", "requires_confirmation", "requires_action"}:
            canceled = stripe.PaymentIntent.cancel(raw)
            return {
                "ok": True,
                "status": "canceled_intent",
                "payment_intent_id": raw,
                "intent_status": getattr(canceled, "status", None),
            }
        raise


def verify_stripe_payment(payment_id: str, expected_amount_eur: float) -> bool:
    """
    True when a PaymentIntent or Checkout Session covers the expected EUR amount.

    PaymentIntent: accept succeeded or processing (Multibanco / MB WAY delayed settlement).
    Reject requires_payment_method, canceled, requires_action, and other incomplete states.
    """
    if not stripe.api_key:
        return False
    raw = (payment_id or "").strip()
    if not raw:
        return False
    expected = _amount_cents(expected_amount_eur)
    try:
        if raw.startswith("cs_"):
            session = stripe.checkout.Session.retrieve(raw)
            paid = (session.payment_status or "") == "paid" or (session.status or "") == "complete"
            amount = int(session.amount_total or 0)
            return bool(paid and amount == expected)

        intent = stripe.PaymentIntent.retrieve(raw)
        status = (intent.status or "").strip().lower()
        amount = int(intent.amount or 0)
        if amount != expected:
            logger.info(
                "Stripe intent %s amount mismatch: got %s expected %s",
                raw[:24],
                amount,
                expected,
            )
            return False
        if status in PAID_INTENT_STATUSES:
            return True
        if status in REJECTED_INTENT_STATUSES:
            logger.info("Stripe intent %s rejected status=%s", raw[:24], status)
            return False
        logger.info("Stripe intent %s unaccepted status=%s", raw[:24], status)
        return False
    except Exception as exc:
        logger.warning("Stripe verify failed for %s: %s", raw[:20], exc)
        return False


def get_checkout_session(session_id: str) -> Optional[dict[str, Any]]:
    """Session status — matches Stripe sample `/session-status` shape."""
    raw = (session_id or "").strip()
    if not raw or not stripe.api_key:
        return None
    session = stripe.checkout.Session.retrieve(
        raw,
        expand=["payment_intent"],
    )
    pi = session.payment_intent
    pi_id = None
    pi_status = None
    if isinstance(pi, str):
        pi_id = pi
    elif pi is not None:
        pi_id = getattr(pi, "id", None)
        pi_status = getattr(pi, "status", None)
    return {
        "checkout_session_id": session.id,
        "sessionId": session.id,
        "session_id": session.id,
        "status": session.status,
        "payment_status": session.payment_status,
        "amount": session.amount_total,
        "currency": session.currency,
        "payment_intent": pi_id,
        "payment_intent_id": pi_id,
        "payment_intent_status": pi_status,
        "url": session.url or _pay_page_url(session.id),
        "clientSecret": session.client_secret,
        "client_secret": session.client_secret,
        "payment_method_types": list(session.payment_method_types or []),
    }


def render_pay_page_html(session_id: str) -> str:
    """HTML for Embedded Checkout on our branded domain."""
    raw = (session_id or "").strip()
    if not raw or not stripe.api_key:
        raise ValueError("Missing checkout session")
    session = stripe.checkout.Session.retrieve(raw)
    secret = getattr(session, "client_secret", None)
    if not secret:
        raise ValueError("Checkout session has no client secret (use Embedded Checkout)")
    if (session.status or "") not in {"open", "complete"}:
        raise ValueError(f"Checkout session is {session.status or 'unavailable'}")
    pk = get_publishable_key()
    if not pk:
        raise RuntimeError("STRIPE_PUBLISHABLE_KEY is not configured")
    # Escape for embedding in JS string literals
    safe_pk = pk.replace("\\", "\\\\").replace("'", "\\'")
    safe_secret = str(secret).replace("\\", "\\\\").replace("'", "\\'")
    return f"""<!doctype html>
<html lang="pt">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Samphone Checkout</title>
  <script src="https://js.stripe.com/v3/"></script>
  <style>
    :root {{ color-scheme: light; }}
    body {{
      margin: 0;
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      background: linear-gradient(165deg, #0b1c2c 0%, #12324a 45%, #0b1c2c 100%);
      min-height: 100vh;
      color: #102033;
    }}
    .wrap {{
      max-width: 520px;
      margin: 0 auto;
      padding: 28px 16px 48px;
    }}
    .brand {{
      color: #f3d27a;
      font-size: 1.35rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-align: center;
      margin-bottom: 8px;
    }}
    .sub {{
      color: rgba(255,255,255,0.72);
      text-align: center;
      font-size: 0.95rem;
      margin: 0 0 22px;
    }}
    #checkout {{
      background: #fff;
      border-radius: 16px;
      padding: 8px;
      box-shadow: 0 18px 50px rgba(0,0,0,0.28);
      min-height: 320px;
    }}
    .err {{
      background: #fff;
      color: #8a1f1f;
      border-radius: 12px;
      padding: 16px;
      text-align: center;
    }}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="brand">SAMPHONE</div>
    <p class="sub">Pagamento seguro</p>
    <div id="checkout"></div>
  </div>
  <script>
    (async function () {{
      const el = document.getElementById('checkout');
      try {{
        const stripe = Stripe('{safe_pk}');
        const checkout = await stripe.initEmbeddedCheckout({{
          clientSecret: '{safe_secret}'
        }});
        checkout.mount('#checkout');
      }} catch (e) {{
        el.innerHTML = '<div class="err">Não foi possível carregar o checkout. Feche e tente novamente.</div>';
        console.error(e);
      }}
    }})();
  </script>
</body>
</html>"""


def webhook_secret_configured() -> bool:
    return bool((os.environ.get("STRIPE_WEBHOOK_SECRET") or "").strip())


def construct_webhook_event(payload: bytes, sig_header: str):
    """Verify Stripe-Signature and return the Event object."""
    secret = (os.environ.get("STRIPE_WEBHOOK_SECRET") or "").strip()
    if not secret:
        raise RuntimeError("STRIPE_WEBHOOK_SECRET is not configured")
    if not sig_header:
        raise ValueError("Missing Stripe-Signature header")
    return stripe.Webhook.construct_event(payload, sig_header, secret)


def _slack_ops(text: str) -> None:
    url = (os.environ.get("SLACK_OPS_WEBHOOK_URL") or "").strip()
    if not url:
        return
    try:
        import json
        import urllib.request

        req = urllib.request.Request(
            url,
            data=json.dumps({"text": text}).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        urllib.request.urlopen(req, timeout=10)
    except Exception as exc:
        logger.warning("Slack ops notify failed: %s", exc)


def handle_webhook_event(event: Any) -> dict[str, Any]:
    """
    Safety-net handler for Stripe events.
    Orders are normally created by the app after confirm; this keeps status in sync
    and alerts when Stripe paid but no order row exists.
    """
    from app_db import get_app_db

    etype = getattr(event, "type", None) or (event.get("type") if isinstance(event, dict) else "")
    data_obj = getattr(event, "data", None)
    obj = getattr(data_obj, "object", None) if data_obj is not None else None
    if obj is None and isinstance(event, dict):
        obj = (event.get("data") or {}).get("object") or {}

    def _g(o: Any, key: str, default=None):
        if isinstance(o, dict):
            return o.get(key, default)
        return getattr(o, key, default)

    db = get_app_db()
    result: dict[str, Any] = {"type": etype, "handled": True}

    if etype == "payment_intent.succeeded":
        pi_id = str(_g(obj, "id") or "")
        amount = int(_g(obj, "amount") or 0)
        order = db.find_order_by_stripe_payment_id(pi_id) if pi_id else None
        if order:
            result["order_id"] = order.get("id")
            result["order_number"] = order.get("order_number")
            logger.info("Stripe PI %s matched order %s", pi_id, order.get("order_number"))
        else:
            msg = (
                f":warning: Stripe paid but no app order — PI `{pi_id}` "
                f"amount={amount / 100:.2f} EUR"
            )
            logger.error(msg)
            _slack_ops(msg)
            result["orphan"] = True
        return result

    if etype == "payment_intent.payment_failed":
        pi_id = str(_g(obj, "id") or "")
        order = db.find_order_by_stripe_payment_id(pi_id) if pi_id else None
        if order and (order.get("status") or "") not in {"refunded", "cancelled", "delivered"}:
            db.update_order_status_by_id(order["id"], "payment_failed")
            result["order_id"] = order["id"]
            result["status"] = "payment_failed"
        return result

    if etype == "checkout.session.completed":
        cs_id = str(_g(obj, "id") or "")
        pi = _g(obj, "payment_intent")
        pi_id = str(pi or "")
        paid = (_g(obj, "payment_status") or "") == "paid" or (_g(obj, "status") or "") == "complete"
        order = None
        if cs_id:
            order = db.find_order_by_stripe_payment_id(cs_id)
        if not order and pi_id:
            order = db.find_order_by_stripe_payment_id(pi_id)
        if order:
            result["order_id"] = order.get("id")
            result["order_number"] = order.get("order_number")
        elif paid:
            msg = (
                f":warning: Stripe Checkout paid but no app order — "
                f"session `{cs_id}` PI `{pi_id}`"
            )
            logger.error(msg)
            _slack_ops(msg)
            result["orphan"] = True
        return result

    if etype == "charge.refunded":
        pi = _g(obj, "payment_intent")
        pi_id = str(pi or "")
        order = db.find_order_by_stripe_payment_id(pi_id) if pi_id else None
        if order:
            db.update_order_status_by_id(order["id"], "refunded")
            result["order_id"] = order["id"]
            result["status"] = "refunded"
        return result

    result["handled"] = False
    return result
