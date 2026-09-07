"""Transactional email via Gmail SMTP (or any SMTP provider)."""
from __future__ import annotations

import html
import logging
import os
import smtplib
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any
from localization import normalize_language, tr

logger = logging.getLogger(__name__)

SITE_NAME = "Samphone"
SITE_URL = os.environ.get("SITE_URL", "https://samphone.pt").rstrip("/")
SUPPORT_EMAIL = os.environ.get("SUPPORT_EMAIL", "support@samphone.pt")
# Default admin inbox for business applications / signup alerts.
DEFAULT_ADMIN_NOTIFY_EMAIL = "samphone.pt@gmail.com"


def admin_notify_email() -> str:
    """Inbox for new-signup / wholesale alerts (always prefer ADMIN_NOTIFY_EMAIL)."""
    return (
        os.environ.get("ADMIN_NOTIFY_EMAIL", "").strip()
        or DEFAULT_ADMIN_NOTIFY_EMAIL
        or os.environ.get("SUPPORT_EMAIL", "").strip()
        or os.environ.get("SMTP_USER", "").strip()
    )


def _smtp_configured() -> bool:
    return bool(os.environ.get("SMTP_USER", "").strip() and os.environ.get("SMTP_PASSWORD", "").strip())


def _from_address() -> str:
    return os.environ.get("EMAIL_FROM", os.environ.get("SMTP_USER", "noreply@samphone.pt")).strip()


def send_email(to: str, subject: str, html_body: str, text_body: str = "") -> bool:
    recipient = (to or "").strip().lower()
    if not recipient or "@" not in recipient:
        return False
    if not _smtp_configured():
        logger.warning("SMTP not configured — skipped email to %s (%s)", recipient, subject)
        return False

    plain = text_body.strip() or _html_to_plain(html_body)
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = _from_address()
    msg["To"] = recipient
    msg.attach(MIMEText(plain, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    host = os.environ.get("SMTP_HOST", "smtp.gmail.com").strip()
    port = int(os.environ.get("SMTP_PORT", "587"))
    user = os.environ.get("SMTP_USER", "").strip()
    password = os.environ.get("SMTP_PASSWORD", "").replace(" ", "").strip()

    try:
        with smtplib.SMTP(host, port, timeout=30) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(user, password)
            # Envelope sender must be the authenticated mailbox (Gmail rejects display-name From).
            server.sendmail(user, [recipient], msg.as_string())
        logger.info("Email sent to %s: %s", recipient, subject)
        return True
    except smtplib.SMTPAuthenticationError as exc:
        logger.error(
            "SMTP login failed for %s — use a Gmail App Password (16 chars), not the normal password. Error: %s",
            user,
            exc,
        )
        return False
    except Exception as exc:
        logger.error("Failed to send email to %s (%s): %s", recipient, subject, exc)
        return False


def _html_to_plain(html_body: str) -> str:
    import re

    text = re.sub(r"<br\s*/?>", "\n", html_body, flags=re.I)
    text = re.sub(r"</p>", "\n\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    return html.unescape(text).strip()


def _layout(title: str, body_html: str) -> str:
    return f"""<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Segoe UI,Arial,sans-serif;width:100% !important;-webkit-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#f4f6fb;padding:24px 0;">
    <tr><td align="center" style="padding:0 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
        <tr><td style="background:#3F61AA;padding:28px 24px;">
          <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800;">{html.escape(SITE_NAME)}</h1>
        </td></tr>
        <tr><td style="padding:28px 24px;color:#1a1a2e;font-size:15px;line-height:1.6;">
          {body_html}
        </td></tr>
        <tr><td style="padding:20px 24px;background:#f7f8fc;color:#6b7280;font-size:12px;">
          Questions? Reply to this email or contact us at
          <a href="mailto:{html.escape(SUPPORT_EMAIL)}" style="color:#3F61AA;">{html.escape(SUPPORT_EMAIL)}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""


def _detail_row(label: str, value: str) -> str:
    if not (value or "").strip():
        return ""
    return (
        f'<tr><td style="padding:8px 12px;color:#6b7280;width:140px;vertical-align:top;">{html.escape(label)}</td>'
        f'<td style="padding:8px 12px;color:#111827;font-weight:600;">{html.escape(value.strip())}</td></tr>'
    )


def send_welcome_email(user: dict) -> bool:
    """Personal (B2C) welcome. Business accounts use send_wholesale_pending_email instead."""
    name = (user.get("name") or "there").strip()
    email_addr = (user.get("email") or "").strip()
    rows = [
        _detail_row("Name", user.get("name", "")),
        _detail_row("Email", email_addr),
        _detail_row("Phone", user.get("phone", "")),
        _detail_row("Address", user.get("address", "")),
        _detail_row("City", user.get("city", "")),
        _detail_row("Postal code", user.get("postal_code", "")),
    ]

    details_table = (
        '<table width="100%" cellpadding="0" cellspacing="0" '
        'style="background:#f7f8fc;border-radius:8px;margin:20px 0;">'
        + "".join(rows)
        + "</table>"
    )

    body = f"""
      <h2 style="margin:0 0 12px;color:#111827;font-size:22px;">Welcome to {html.escape(SITE_NAME)}, {html.escape(name)}!</h2>
      <p style="margin:0 0 8px;color:#374151;">
        Thank you for creating your account. We are glad to have you with us.
        Here is a summary of the details you provided:
      </p>
      {details_table}
      <p style="margin:24px 0 0;color:#374151;">
        Browse our catalog of phone parts and accessories anytime in the Samphone app.
      </p>
      <p style="margin:24px 0 0;">
        <a href="{html.escape(SITE_URL)}" style="display:inline-block;background:#FDB136;color:#1a1a2e;
          text-decoration:none;font-weight:800;padding:14px 28px;border-radius:8px;">
          Start shopping
        </a>
      </p>
    """
    subject = f"Welcome to {SITE_NAME} — your account is ready"
    return send_email(email_addr, subject, _layout(subject, body))


def send_wholesale_pending_email(user: dict) -> bool:
    """Professional notice that a business account is awaiting admin approval."""
    email_addr = (user.get("email") or "").strip()
    if not email_addr:
        return False
    name = (user.get("name") or "there").strip()
    business = (user.get("businessName") or user.get("business_name") or "").strip()
    vat = (user.get("vatNumber") or user.get("vat_number") or "").strip()
    biz_type = (user.get("businessType") or user.get("business_type") or "").strip()
    phone = (user.get("phone") or "").strip()

    details_table = (
        '<table width="100%" cellpadding="0" cellspacing="0" '
        'style="background:#f7f8fc;border-radius:8px;margin:20px 0;">'
        + _detail_row("Contact name", name)
        + _detail_row("Email", email_addr)
        + _detail_row("Phone", phone)
        + _detail_row("Business name", business)
        + _detail_row("VAT number", vat)
        + _detail_row("Business type", biz_type)
        + _detail_row("Status", "Pending approval")
        + "</table>"
    )

    body = f"""
      <h2 style="margin:0 0 12px;color:#111827;font-size:22px;">
        Your business account is under review
      </h2>
      <p style="margin:0 0 12px;color:#374151;">
        Dear {html.escape(name)},
      </p>
      <p style="margin:0 0 12px;color:#374151;">
        Thank you for registering with <strong>{html.escape(SITE_NAME)}</strong> as a business partner.
        We have received your wholesale application and our team is carefully reviewing your details.
      </p>
      <p style="margin:0 0 12px;color:#374151;">
        Please allow some time for this process. You will receive a second email from us as soon as
        your account has been approved. Until then, business pricing remains locked for security
        and compliance reasons.
      </p>
      {details_table}
      <p style="margin:16px 0 0;color:#374151;">
        You may continue browsing our catalog in the Samphone app. Once approved, wholesale prices
        will appear automatically when you sign in.
      </p>
      <p style="margin:24px 0 0;color:#374151;">
        If you have any questions in the meantime, reply to this message or contact us at
        <a href="mailto:{html.escape(SUPPORT_EMAIL)}" style="color:#3F61AA;">{html.escape(SUPPORT_EMAIL)}</a>.
      </p>
      <p style="margin:28px 0 0;color:#111827;font-weight:700;">
        Kind regards,<br/>
        The {html.escape(SITE_NAME)} Team
      </p>
    """
    subject = f"Your {SITE_NAME} business account is pending approval"
    return send_email(email_addr, subject, _layout(subject, body))

def send_admin_business_application_email(user: dict) -> bool:
    """
    Notify samphone.pt@gmail.com that someone applied for a business/wholesale account.
    """
    admin_to = admin_notify_email()
    if not admin_to:
        logger.warning("No admin notify address — skipped business application email")
        return False

    email_addr = (user.get("email") or "").strip()
    name = (user.get("name") or "").strip() or "Unknown"
    business = (user.get("businessName") or user.get("business_name") or "").strip()
    vat = (user.get("vatNumber") or user.get("vat_number") or "").strip()
    company_addr = (user.get("companyAddress") or user.get("company_address") or "").strip()
    biz_type = (user.get("businessType") or user.get("business_type") or "").strip()
    phone = (user.get("phone") or "").strip()
    when = datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M UTC")
    who = business or name

    details_table = (
        '<table width="100%" cellpadding="0" cellspacing="0" '
        'style="background:#f7f8fc;border-radius:8px;margin:20px 0;">'
        + _detail_row("Applicant name", name)
        + _detail_row("Email", email_addr)
        + _detail_row("Phone", phone)
        + _detail_row("Business name", business or "—")
        + _detail_row("VAT / NIF", vat or "—")
        + _detail_row("Business type", biz_type or "—")
        + _detail_row("Company address", company_addr or "—")
        + _detail_row("Applied at", when)
        + _detail_row("Status", "Pending approval")
        + "</table>"
    )

    body = f"""
      <h2 style="margin:0 0 12px;color:#111827;font-size:22px;">
        Business account application
      </h2>
      <p style="margin:0 0 12px;color:#374151;">
        <strong>{html.escape(who)}</strong> is applying for a
        <strong>business / wholesale</strong> account on {html.escape(SITE_NAME)}.
      </p>
      <p style="margin:0 0 8px;color:#374151;">
        Open the admin app → <strong>Wholesale</strong> to approve or reject this request.
        Business prices stay locked until you approve.
      </p>
      {details_table}
      <p style="margin:20px 0 0;">
        <a href="{html.escape(SITE_URL)}" style="display:inline-block;background:#FDB136;color:#1a1a2e;
          text-decoration:none;font-weight:800;padding:14px 28px;border-radius:8px;">
          Open Samphone
        </a>
      </p>
    """
    subject = f"[Samphone] Business application — {who} ({email_addr or 'no email'})"
    return send_email(admin_to, subject, _layout(subject, body))


def send_admin_signup_email(user: dict) -> bool:
    """Notify admin whenever a new public or business account is created."""
    account_type = (user.get("accountType") or user.get("account_type") or "b2c").strip().lower()
    is_business = account_type == "b2b" or bool(
        user.get("businessName") or user.get("business_name") or user.get("vatNumber") or user.get("vat_number")
    )
    # Business applicants get the dedicated wholesale application email instead.
    if is_business or (user.get("wholesaleStatus") or "").strip().lower() == "pending":
        return send_admin_business_application_email(user)

    admin_to = admin_notify_email()
    if not admin_to:
        logger.warning("ADMIN_NOTIFY_EMAIL / SUPPORT_EMAIL not set — skipped admin signup email")
        return False

    email_addr = (user.get("email") or "").strip()
    name = (user.get("name") or "").strip()
    kind_label = "Public (personal)"
    when = datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M UTC")

    rows = [
        _detail_row("Account type", kind_label),
        _detail_row("Name", name),
        _detail_row("Email", email_addr),
        _detail_row("Phone", user.get("phone", "")),
        _detail_row("Signed up at", when),
    ]

    details_table = (
        '<table width="100%" cellpadding="0" cellspacing="0" '
        'style="background:#f7f8fc;border-radius:8px;margin:20px 0;">'
        + "".join(rows)
        + "</table>"
    )
    action_note = (
        "<p style='margin:16px 0 0;color:#374151;'>No wholesale approval is required for public accounts.</p>"
    )
    body = f"""
      <h2 style="margin:0 0 12px;color:#111827;font-size:22px;">New {html.escape(SITE_NAME)} signup</h2>
      <p style="margin:0 0 8px;color:#374151;">
        A new <strong>{html.escape(kind_label)}</strong> account was created.
      </p>
      {details_table}
      {action_note}
    """
    subject = f"[Samphone] New public signup — {email_addr or name or 'user'}"
    return send_email(admin_to, subject, _layout(subject, body))


def send_wholesale_decision_email(user: dict, *, approved: bool, reason: str = "") -> bool:
    """Email the business customer when wholesale is approved or rejected."""
    email_addr = (user.get("email") or "").strip()
    if not email_addr:
        return False
    name = (user.get("name") or "there").strip()
    tier = (user.get("dealerTier") or user.get("dealer_tier") or "bronze").strip().title()
    business = (user.get("businessName") or user.get("business_name") or "").strip()
    if approved:
        details = (
            '<table width="100%" cellpadding="0" cellspacing="0" '
            'style="background:#f7f8fc;border-radius:8px;margin:20px 0;">'
            + _detail_row("Account email", email_addr)
            + _detail_row("Business name", business)
            + _detail_row("Pricing tier", tier)
            + _detail_row("Status", "Approved")
            + "</table>"
        )
        body = f"""
          <h2 style="margin:0 0 12px;color:#111827;font-size:22px;">
            Your wholesale account has been approved
          </h2>
          <p style="margin:0 0 12px;color:#374151;">
            Dear {html.escape(name)},
          </p>
          <p style="margin:0 0 12px;color:#374151;">
            We are pleased to inform you that your business application with
            <strong>{html.escape(SITE_NAME)}</strong> has been approved.
          </p>
          <p style="margin:0 0 12px;color:#374151;">
            You now have full access to wholesale pricing in the Samphone app.
            Sign in with your account to view business prices and place orders at your partner rates.
          </p>
          {details}
          <p style="margin:24px 0 0;">
            <a href="{html.escape(SITE_URL)}" style="display:inline-block;background:#FDB136;color:#1a1a2e;
              text-decoration:none;font-weight:800;padding:14px 28px;border-radius:8px;">
              Open Samphone &amp; view business prices
            </a>
          </p>
          <p style="margin:24px 0 0;color:#374151;">
            Welcome to the {html.escape(SITE_NAME)} partner network. We look forward to working with you.
          </p>
          <p style="margin:28px 0 0;color:#111827;font-weight:700;">
            Kind regards,<br/>
            The {html.escape(SITE_NAME)} Team
          </p>
        """
        subject = f"Approved — your {SITE_NAME} wholesale account is now active"
    else:
        reason_html = html.escape((reason or "Your application could not be approved at this time.").strip())
        body = f"""
          <h2 style="margin:0 0 12px;color:#111827;font-size:22px;">
            Update on your wholesale application
          </h2>
          <p style="margin:0 0 12px;color:#374151;">
            Dear {html.escape(name)},
          </p>
          <p style="margin:0 0 12px;color:#374151;">
            Thank you for your interest in becoming a {html.escape(SITE_NAME)} business partner.
            After reviewing your application, we are unable to approve wholesale access at this time.
          </p>
          <p style="margin:16px 0;padding:12px 16px;background:#f7f8fc;border-radius:8px;color:#374151;">
            <strong>Reason:</strong> {reason_html}
          </p>
          <p style="margin:16px 0 0;color:#374151;">
            You can still shop with us at retail prices in the Samphone app.
            If you believe this decision was made in error, or if you would like to provide
            additional information, please contact us at
            <a href="mailto:{html.escape(SUPPORT_EMAIL)}" style="color:#3F61AA;">{html.escape(SUPPORT_EMAIL)}</a>.
          </p>
          <p style="margin:28px 0 0;color:#111827;font-weight:700;">
            Kind regards,<br/>
            The {html.escape(SITE_NAME)} Team
          </p>
        """
        subject = f"Update on your {SITE_NAME} wholesale application"
    return send_email(email_addr, subject, _layout(subject, body))

def send_login_email(user: dict) -> bool:
    """Notify the user whenever they sign in (including after logout / reinstall)."""
    name = (user.get("name") or "there").strip()
    email_addr = (user.get("email") or "").strip()
    if not email_addr:
        return False
    when = datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M UTC")
    body = f"""
      <h2 style="margin:0 0 12px;color:#111827;font-size:22px;">Welcome back, {html.escape(name)}!</h2>
      <p style="margin:0 0 8px;color:#374151;">
        You just signed in to your {html.escape(SITE_NAME)} account.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0"
        style="background:#f7f8fc;border-radius:8px;margin:20px 0;">
        {_detail_row("Email", email_addr)}
        {_detail_row("Signed in at", when)}
      </table>
      <p style="margin:16px 0 0;color:#374151;">
        If this was you, no action is needed. If you did not sign in, change your password
        and contact us at
        <a href="mailto:{html.escape(SUPPORT_EMAIL)}" style="color:#3F61AA;">{html.escape(SUPPORT_EMAIL)}</a>.
      </p>
      <p style="margin:24px 0 0;">
        <a href="{html.escape(SITE_URL)}" style="display:inline-block;background:#FDB136;color:#1a1a2e;
          text-decoration:none;font-weight:800;padding:14px 28px;border-radius:8px;">
          Open {html.escape(SITE_NAME)}
        </a>
      </p>
    """
    subject = f"New sign-in to your {SITE_NAME} account"
    return send_email(email_addr, subject, _layout(subject, body))


def _format_money(amount: Any) -> str:
    try:
        return f"€{float(amount):.2f}"
    except (TypeError, ValueError):
        return "€0.00"


def send_cart_abandonment_email(user: dict, cart: dict) -> bool:
    email_addr = (user.get("email") or cart.get("email") or "").strip()
    name = (user.get("name") or email_addr.split("@")[0] or "there").strip()
    items = cart.get("items") or []
    if not email_addr or not items:
        return False

    lines_html = ""
    lines_plain: list[str] = []
    for item in items:
        title = (item.get("title") or "Product").strip()
        qty = int(item.get("quantity") or 1)
        price = _format_money(item.get("price"))
        line_total = _format_money(float(item.get("price") or 0) * qty)
        lines_html += (
            f'<tr><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;">'
            f'<div style="font-weight:700;color:#111827;">{html.escape(title)}</div>'
            f'<div style="color:#6b7280;font-size:13px;margin-top:4px;">Qty: {qty} · {price} each</div>'
            f'</td><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;text-align:right;'
            f'font-weight:700;color:#111827;">{line_total}</td></tr>'
        )
        lines_plain.append(f"- {title} x{qty} ({line_total})")

    subtotal = _format_money(cart.get("subtotal"))
    cart_url = f"{SITE_URL}/cart"

    body = f"""
      <h2 style="margin:0 0 12px;color:#111827;font-size:22px;">Hi {html.escape(name)}, your cart is waiting</h2>
      <p style="margin:0 0 20px;color:#374151;">
        You left some great items in your cart. They are still reserved for you — complete your order before they sell out.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
        {lines_html}
        <tr><td style="padding:16px 0 0;font-weight:800;font-size:16px;color:#111827;">Subtotal</td>
        <td style="padding:16px 0 0;text-align:right;font-weight:800;font-size:16px;color:#3F61AA;">{subtotal}</td></tr>
      </table>
      <p style="margin:28px 0 0;">
        <a href="{html.escape(cart_url)}" style="display:inline-block;background:#3F61AA;color:#ffffff;
          text-decoration:none;font-weight:800;padding:14px 28px;border-radius:8px;">
          Complete my order
        </a>
      </p>
      <p style="margin:20px 0 0;color:#6b7280;font-size:13px;">
        Need help? Our team is happy to assist you with your order.
      </p>
    """

    plain = (
        f"Hi {name},\n\n"
        "You left items in your Samphone cart:\n\n"
        + "\n".join(lines_plain)
        + f"\n\nSubtotal: {subtotal}\n\n"
        f"Complete your order: {cart_url}\n"
    )
    subject = f"Your {SITE_NAME} cart is waiting — {len(items)} item{'s' if len(items) != 1 else ''} inside"
    return send_email(email_addr, subject, _layout(subject, body), plain)


def _payment_method_label(method: str, lang: str = "en") -> str:
    key = (method or "").strip().lower()
    val = {
        "card": {"en": "Card (Stripe)", "pt": "Cartao (Stripe)"},
        "store": {"en": "Store pickup", "pt": "Levantamento em loja"},
        "delivery": {"en": "Cash on delivery", "pt": "Pagamento na entrega"},
        "cod": {"en": "Cash on delivery", "pt": "Pagamento na entrega"},
    }.get(key, method or "—")
    if isinstance(val, dict):
        return val.get(normalize_language(lang), val.get("en", "—"))
    return str(val)


def _api_public_base() -> str:
    return (
        os.environ.get("API_PUBLIC_URL", "").strip()
        or os.environ.get("PUBLIC_API_URL", "").strip()
        or SITE_URL
    ).rstrip("/")


def _absolute_media_url(url: str) -> str:
    u = (url or "").strip()
    if not u:
        return ""
    if u.startswith("http://") or u.startswith("https://"):
        return u
    base = _api_public_base()
    return f"{base}{u}" if u.startswith("/") else f"{base}/{u}"


def _product_page_url(product_id: str) -> str:
    pid = (product_id or "").strip()
    if not pid:
        return SITE_URL
    tmpl = os.environ.get("PRODUCT_PAGE_URL", "").strip() or f"{SITE_URL}/product/{{id}}"
    return tmpl.replace("{id}", pid)


def _order_items_html_plain(order: dict, lang: str = "en") -> tuple[str, list[str]]:
    """HTML + plain lines: image (linked), title, qty, unit price, line total; ends with subtotal row separately."""
    lines_html = ""
    lines_plain: list[str] = []
    for item in order.get("items") or []:
        title = (item.get("title") or item.get("name") or "Product").strip() or "Product"
        qty = int(item.get("quantity") or 1)
        unit = float(item.get("price") or 0)
        line_total_val = item.get("line_total")
        try:
            line_total_f = float(line_total_val) if line_total_val is not None else unit * qty
        except (TypeError, ValueError):
            line_total_f = unit * qty
        price = _format_money(unit)
        line_total = _format_money(line_total_f)
        pid = str(item.get("product_id") or item.get("id") or "").strip()
        product_url = _product_page_url(pid)
        img = _absolute_media_url(str(item.get("image") or ""))
        title_esc = html.escape(title)
        if img:
            img_html = (
                f'<a href="{html.escape(product_url)}" style="display:inline-block;line-height:0;">'
                f'<img src="{html.escape(img)}" alt="{title_esc}" width="64" height="64" '
                f'style="display:block;width:64px;height:64px;object-fit:cover;border-radius:8px;border:1px solid #e5e7eb;"/>'
                f"</a>"
            )
        else:
            img_html = (
                f'<div style="width:64px;height:64px;border-radius:8px;background:#f3f4f6;'
                f'border:1px solid #e5e7eb;"></div>'
            )
        title_html = (
            f'<a href="{html.escape(product_url)}" style="color:#111827;text-decoration:none;font-weight:700;">'
            f"{title_esc}</a>"
            if pid
            else f'<span style="font-weight:700;color:#111827;">{title_esc}</span>'
        )
        lines_html += f"""
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;vertical-align:top;width:76px;">{img_html}</td>
          <td style="padding:12px 8px;border-bottom:1px solid #e5e7eb;vertical-align:top;">
            <div style="margin:0 0 4px;">{title_html}</div>
            <div style="color:#6b7280;font-size:13px;">{html.escape(tr(lang, "order.items.qty_each", qty=qty, price=price))}</div>
          </td>
          <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;text-align:right;vertical-align:top;
            font-weight:700;color:#111827;white-space:nowrap;">{line_total}</td>
        </tr>
        """
        lines_plain.append(f"- {title} x{qty} @ {price} = {line_total}" + (f" ({product_url})" if pid else ""))
    return lines_html, lines_plain


def _order_items_table(order: dict, lang: str = "en", *, total_label: str | None = None) -> str:
    items_html, _ = _order_items_html_plain(order, lang)
    total = _format_money(order.get("subtotal"))
    total_label = total_label or tr(lang, "order.field.subtotal")
    if not items_html.strip():
        return f'<p style="margin:0;color:#6b7280;">No items</p>'
    return f"""
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
        {items_html}
        <tr>
          <td colspan="2" style="padding:16px 0 0;font-weight:800;font-size:16px;color:#111827;">{html.escape(total_label)}</td>
          <td style="padding:16px 0 0;text-align:right;font-weight:800;font-size:16px;color:#3F61AA;">{total}</td>
        </tr>
      </table>
    """


def _order_address_block(order: dict) -> tuple[str, str]:
    name = (order.get("full_name") or order.get("customer_name") or "").strip()
    phone = (order.get("phone") or "").strip()
    address = (order.get("address") or "").strip()
    city = (order.get("city") or "").strip()
    postal = (order.get("postal_code") or "").strip()
    city_line = " ".join(p for p in (postal, city) if p).strip()
    html_parts = []
    plain_parts = []
    if name:
        html_parts.append(html.escape(name))
        plain_parts.append(name)
    if address:
        html_parts.append(html.escape(address))
        plain_parts.append(address)
    if city_line:
        html_parts.append(html.escape(city_line))
        plain_parts.append(city_line)
    if phone:
        html_parts.append(html.escape(phone))
        plain_parts.append(phone)
    if not html_parts:
        return "—", "—"
    return "<br>".join(html_parts), "\n".join(plain_parts)


def send_order_confirmation_email(order: dict) -> bool:
    """Customer: Order confirmed with number, items (image/title/qty/price), total, payment, address."""
    email_addr = (order.get("customer_email") or "").strip()
    if not email_addr:
        return False
    lang = normalize_language(order.get("language"))
    name = (order.get("customer_name") or order.get("full_name") or email_addr.split("@")[0] or "there").strip()
    order_number = (order.get("order_number") or order.get("id") or "").strip()
    total = _format_money(order.get("subtotal"))
    payment = _payment_method_label(str(order.get("payment_method") or ""), lang)
    _, items_plain = _order_items_html_plain(order, lang)
    items_table = _order_items_table(order, lang)
    addr_html, addr_plain = _order_address_block(order)
    orders_url = f"{SITE_URL}/account/orders"

    body = f"""
      <h2 style="margin:0 0 12px;color:#111827;font-size:22px;">{html.escape(tr(lang, "order.confirmed.title"))}</h2>
      <p style="margin:0 0 20px;color:#374151;">
        Hi {html.escape(name)}, thanks for your order. We’ve received it and will start processing shortly.
      </p>
      {_detail_row(tr(lang, "order.field.number"), order_number)}
      {_detail_row(tr(lang, "order.field.total"), total)}
      {_detail_row(tr(lang, "order.field.payment"), payment)}
      <p style="margin:20px 0 8px;color:#6b7280;font-size:13px;font-weight:700;text-transform:uppercase;">{html.escape(tr(lang, "order.field.items"))}</p>
      {items_table}
      <p style="margin:20px 0 8px;color:#6b7280;font-size:13px;font-weight:700;text-transform:uppercase;">{html.escape(tr(lang, "order.field.delivery_address"))}</p>
      <p style="margin:0 0 20px;color:#374151;line-height:1.5;">{addr_html}</p>
      <p style="margin:28px 0 0;">
        <a href="{html.escape(orders_url)}" style="display:inline-block;background:#3F61AA;color:#ffffff;
          text-decoration:none;font-weight:800;padding:14px 28px;border-radius:8px;">
          {html.escape(tr(lang, "order.action.view_mine"))}
        </a>
      </p>
    """
    plain = (
        f"Order confirmed\n\nHi {name},\n\n"
        f"Order number: {order_number}\nTotal: {total}\nPayment: {payment}\n\n"
        "Items:\n" + "\n".join(items_plain) + f"\nSubtotal: {total}\n\nDelivery address:\n{addr_plain}\n\n"
        f"View order: {orders_url}\n"
    )
    subject = tr(lang, "email.order.confirmed.subject", order_number=order_number)
    return send_email(email_addr, subject, _layout(subject, body), plain)


def send_admin_new_order_email(order: dict) -> bool:
    """Admin: New order alert with the same item details as the customer confirmation."""
    admin = admin_notify_email()
    if not admin:
        logger.warning("ADMIN_NOTIFY_EMAIL not set — skipped admin new-order email")
        return False
    lang = normalize_language(order.get("language"))
    order_number = (order.get("order_number") or order.get("id") or "").strip()
    total = _format_money(order.get("subtotal"))
    payment = _payment_method_label(str(order.get("payment_method") or ""), lang)
    customer = (order.get("customer_email") or "").strip() or "—"
    customer_name = (order.get("customer_name") or order.get("full_name") or "").strip() or "—"
    _, items_plain = _order_items_html_plain(order, lang)
    items_table = _order_items_table(order, lang)
    addr_html, addr_plain = _order_address_block(order)

    body = f"""
      <h2 style="margin:0 0 12px;color:#111827;font-size:22px;">{html.escape(tr(lang, "order.new.title"))}</h2>
      <p style="margin:0 0 20px;color:#374151;">A customer just placed an order on {html.escape(SITE_NAME)}.</p>
      {_detail_row(tr(lang, "order.field.number"), order_number)}
      {_detail_row(tr(lang, "order.field.customer"), f"{customer_name} <{customer}>")}
      {_detail_row(tr(lang, "order.field.total"), total)}
      {_detail_row(tr(lang, "order.field.payment"), payment)}
      <p style="margin:20px 0 8px;color:#6b7280;font-size:13px;font-weight:700;text-transform:uppercase;">{html.escape(tr(lang, "order.field.items"))}</p>
      {items_table}
      <p style="margin:20px 0 8px;color:#6b7280;font-size:13px;font-weight:700;text-transform:uppercase;">{html.escape(tr(lang, "order.field.delivery_address"))}</p>
      <p style="margin:0;color:#374151;line-height:1.5;">{addr_html}</p>
    """
    plain = (
        f"New order {order_number}\n\nCustomer: {customer_name} <{customer}>\n"
        f"Total: {total}\nPayment: {payment}\n\nItems:\n"
        + "\n".join(items_plain)
        + f"\nSubtotal: {total}\n\nDelivery address:\n{addr_plain}\n"
    )
    subject = tr(lang, "email.order.new.subject", order_number=order_number, total=total)
    return send_email(admin, subject, _layout(subject, body), plain)


def send_order_cancelled_email(order: dict) -> bool:
    lang = normalize_language(order.get("language"))
    """Customer: Order cancelled with the same item breakdown as confirmation."""
    email_addr = (order.get("customer_email") or "").strip()
    if not email_addr:
        return False
    name = (order.get("customer_name") or order.get("full_name") or email_addr.split("@")[0] or "there").strip()
    order_number = (order.get("order_number") or order.get("id") or "").strip()
    total = _format_money(order.get("subtotal"))
    payment = _payment_method_label(str(order.get("payment_method") or ""), lang)
    _, items_plain = _order_items_html_plain(order, lang)
    items_table = _order_items_table(order, lang)
    addr_html, addr_plain = _order_address_block(order)
    orders_url = f"{SITE_URL}/account/orders"

    body = f"""
      <h2 style="margin:0 0 12px;color:#111827;font-size:22px;">{html.escape(tr(lang, "order.cancelled.title"))}</h2>
      <p style="margin:0 0 20px;color:#374151;">
        Hi {html.escape(name)}, your order <strong>{html.escape(order_number)}</strong> has been cancelled.
      </p>
      {_detail_row(tr(lang, "order.field.number"), order_number)}
      {_detail_row(tr(lang, "order.field.total"), total)}
      {_detail_row(tr(lang, "order.field.payment"), payment)}
      <p style="margin:20px 0 8px;color:#6b7280;font-size:13px;font-weight:700;text-transform:uppercase;">{html.escape(tr(lang, "order.field.items"))}</p>
      {items_table}
      <p style="margin:20px 0 8px;color:#6b7280;font-size:13px;font-weight:700;text-transform:uppercase;">{html.escape(tr(lang, "order.field.delivery_address"))}</p>
      <p style="margin:0 0 20px;color:#374151;line-height:1.5;">{addr_html}</p>
      <p style="margin:0 0 20px;color:#374151;">
        If you didn’t request this or need help, reply to this email or contact {html.escape(SUPPORT_EMAIL)}.
      </p>
      <p style="margin:28px 0 0;">
        <a href="{html.escape(orders_url)}" style="display:inline-block;background:#3F61AA;color:#ffffff;
          text-decoration:none;font-weight:800;padding:14px 28px;border-radius:8px;">
          {html.escape(tr(lang, "order.action.view_all"))}
        </a>
      </p>
    """
    plain = (
        f"Hi {name},\n\nYour order {order_number} has been cancelled.\n"
        f"Total: {total}\nPayment: {payment}\n\nItems:\n"
        + "\n".join(items_plain)
        + f"\nSubtotal: {total}\n\nDelivery address:\n{addr_plain}\n\n"
        f"View orders: {orders_url}\n"
    )
    subject = tr(lang, "email.order.cancelled.subject", order_number=order_number)
    return send_email(email_addr, subject, _layout(subject, body), plain)


def send_admin_order_cancelled_email(order: dict) -> bool:
    lang = normalize_language(order.get("language"))
    """Admin: Order cancelled alert with item breakdown."""
    admin = admin_notify_email()
    if not admin:
        logger.warning("ADMIN_NOTIFY_EMAIL not set — skipped admin order-cancelled email")
        return False
    order_number = (order.get("order_number") or order.get("id") or "").strip()
    total = _format_money(order.get("subtotal"))
    payment = _payment_method_label(str(order.get("payment_method") or ""), lang)
    customer = (order.get("customer_email") or "").strip() or "—"
    customer_name = (order.get("customer_name") or order.get("full_name") or "").strip() or "—"
    _, items_plain = _order_items_html_plain(order, lang)
    items_table = _order_items_table(order, lang)
    addr_html, addr_plain = _order_address_block(order)

    body = f"""
      <h2 style="margin:0 0 12px;color:#111827;font-size:22px;">{html.escape(tr(lang, "order.cancelled.title"))}</h2>
      <p style="margin:0 0 20px;color:#374151;">An order was cancelled on {html.escape(SITE_NAME)}.</p>
      {_detail_row(tr(lang, "order.field.number"), order_number)}
      {_detail_row(tr(lang, "order.field.customer"), f"{customer_name} <{customer}>")}
      {_detail_row(tr(lang, "order.field.total"), total)}
      {_detail_row(tr(lang, "order.field.payment"), payment)}
      <p style="margin:20px 0 8px;color:#6b7280;font-size:13px;font-weight:700;text-transform:uppercase;">{html.escape(tr(lang, "order.field.items"))}</p>
      {items_table}
      <p style="margin:20px 0 8px;color:#6b7280;font-size:13px;font-weight:700;text-transform:uppercase;">{html.escape(tr(lang, "order.field.delivery_address"))}</p>
      <p style="margin:0;color:#374151;line-height:1.5;">{addr_html}</p>
    """
    plain = (
        f"Order cancelled — {order_number}\n"
        f"Customer: {customer_name} <{customer}>\nTotal: {total}\nPayment: {payment}\n\nItems:\n"
        + "\n".join(items_plain)
        + f"\nSubtotal: {total}\n\nDelivery address:\n{addr_plain}\n"
    )
    subject = tr(lang, "email.order.cancelled.subject", order_number=order_number)
    return send_email(admin, subject, _layout(subject, body), plain)


def _product_url(product: dict | None = None, product_id: str = "") -> str:
    pid = str((product or {}).get("id") or product_id or "").strip()
    slug = str((product or {}).get("slug") or "p").strip() or "p"
    if pid:
        return f"{SITE_URL}/product/{slug}/{pid}"
    return f"{SITE_URL}/new"


def send_alert_email(
    user: dict,
    *,
    title: str,
    message: str,
    cta_url: str = "",
    cta_label: str = "View on Samphone",
) -> bool:
    email_addr = (user.get("email") or "").strip()
    if not email_addr:
        return False
    name = (user.get("name") or email_addr.split("@")[0] or "there").strip()
    link = (cta_url or SITE_URL).strip() or SITE_URL
    body = f"""
      <h2 style="margin:0 0 12px;color:#111827;font-size:22px;">{html.escape(title)}</h2>
      <p style="margin:0 0 16px;color:#374151;">Hi {html.escape(name)},</p>
      <p style="margin:0 0 20px;color:#374151;white-space:pre-wrap;">{html.escape(message)}</p>
      <p style="margin:0;">
        <a href="{html.escape(link)}" style="display:inline-block;background:#3F61AA;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:700;">
          {html.escape(cta_label)}
        </a>
      </p>
    """
    plain = f"{title}\n\nHi {name},\n\n{message}\n\n{link}\n"
    return send_email(email_addr, f"{SITE_NAME}: {title}", _layout(title, body), plain)


def send_restock_subscribed_email(email: str, product: dict | None = None) -> bool:
    title = (product or {}).get("title") or (product or {}).get("name") or "this product"
    url = _product_url(product)
    body = f"""
      <h2 style="margin:0 0 12px;color:#111827;font-size:22px;">We'll email you when it's back</h2>
      <p style="margin:0 0 16px;color:#374151;">
        You're on the restock list for <strong>{html.escape(str(title))}</strong>.
        We'll send an email as soon as it's available again.
      </p>
      <p style="margin:0;">
        <a href="{html.escape(url)}" style="color:#3F61AA;font-weight:700;">View product</a>
      </p>
    """
    plain = f"We'll email you when {title} is back in stock.\n{url}\n"
    return send_email(email, f"{SITE_NAME}: Restock alert saved", _layout("Restock alert saved", body), plain)


def send_back_in_stock_email(email: str, product: dict | None = None) -> bool:
    title = (product or {}).get("title") or (product or {}).get("name") or "A product you wanted"
    url = _product_url(product)
    body = f"""
      <h2 style="margin:0 0 12px;color:#111827;font-size:22px;">Back in stock</h2>
      <p style="margin:0 0 16px;color:#374151;">
        <strong>{html.escape(str(title))}</strong> is available again on {html.escape(SITE_NAME)}.
      </p>
      <p style="margin:0;">
        <a href="{html.escape(url)}" style="display:inline-block;background:#3F61AA;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:700;">
          Shop now
        </a>
      </p>
    """
    plain = f"{title} is back in stock.\n{url}\n"
    return send_email(email, f"{SITE_NAME}: {title} is back in stock", _layout("Back in stock", body), plain)


def send_new_arrivals_email(user: dict, products: list[dict]) -> bool:
    names = [
        str(p.get("title") or p.get("name") or "").strip()
        for p in (products or [])
        if str(p.get("title") or p.get("name") or "").strip()
    ]
    listed = ", ".join(names[:8]) if names else "new products"
    extra = f" and {len(names) - 8} more" if len(names) > 8 else ""
    return send_alert_email(
        user,
        title="New products have arrived",
        message=f"Just added to the Samphone catalog: {listed}{extra}.",
        cta_url=f"{SITE_URL}/new",
        cta_label="See new arrivals",
    )
