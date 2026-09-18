#!/usr/bin/env python3
"""Send every Samphone transactional email template to one inbox (for QA)."""
from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

try:
    from dotenv import load_dotenv

    load_dotenv(ROOT / ".env", override=False)
    load_dotenv(ROOT.parent / ".env", override=False)
except ImportError:
    def _load_env(path: Path) -> None:
        if not path.exists():
            return
        for line in path.read_text(errors="ignore").splitlines():
            s = line.strip()
            if not s or s.startswith("#") or "=" not in s:
                continue
            key, _, val = s.partition("=")
            key, val = key.strip(), val.strip().strip('"').strip("'")
            os.environ.setdefault(key, val)

    _load_env(ROOT / ".env")
    _load_env(ROOT.parent / ".env")

TO = (sys.argv[1] if len(sys.argv) > 1 else "sheetal.singh.chauhan@gmail.com").strip().lower()


def _sample_user(*, business: bool) -> dict:
    user = {
        "id": "test-user-sheetal",
        "email": TO,
        "name": "Sheetal Chauhan",
        "accountType": "b2b" if business else "b2c",
        "wholesaleStatus": "pending" if business else "",
        "businessName": "Sheetal Test Unipessoal" if business else "",
        "vatNumber": "PT500000000" if business else "",
        "dealerTier": "bronze",
        "phone": "+351 900 000 000",
        "city": "Lisboa",
    }
    return user


def _sample_order(*, business: bool) -> dict:
    return {
        "id": "TEST-B2B-2001" if business else "TEST-B2C-1001",
        "order_number": "TEST-B2B-2001" if business else "TEST-B2C-1001",
        "customer_email": TO,
        "customer_name": "Sheetal Chauhan",
        "full_name": "Sheetal Chauhan",
        "account_type": "b2b" if business else "b2c",
        "company_name": "Sheetal Test Unipessoal" if business else "",
        "vat_number": "PT500000000" if business else "",
        "subtotal": 29.8,
        "shipping": 3.5,
        "total": 33.3,
        "payment_method": "mbway",
        "language": "en",
        "created_at": "2026-09-18T17:00:00+00:00",
        "items": [
            {
                "title": "iPhone 17 Pro Max Back Cover Black",
                "quantity": 2,
                "price": 14.9,
                "product_id": "test-cover-black",
            }
        ],
    }


def _sample_cart() -> dict:
    return {
        "email": TO,
        "subtotal": 14.9,
        "items": [
            {
                "title": "iPhone 17 Pro Max Tempered Glass",
                "quantity": 1,
                "price": 14.9,
            }
        ],
    }


def _sample_product() -> dict:
    return {
        "id": "test-cover-black",
        "slug": "iphone-17-pro-max-back-cover-black",
        "title": "iPhone 17 Pro Max Back Cover Black",
        "name": "iPhone 17 Pro Max Back Cover Black",
    }


def main() -> int:
    import email_service

    email_service.admin_notify_email = lambda: TO  # type: ignore[method-assign]
    os.environ["ADMIN_NOTIFY_EMAIL"] = TO

    public = _sample_user(business=False)
    business = _sample_user(business=True)
    product = _sample_product()
    jobs: list[tuple[str, object]] = [
        ("welcome (personal)", lambda: email_service.send_welcome_email(public)),
        ("welcome (business / pending)", lambda: email_service.send_wholesale_pending_email(business)),
        ("login (personal)", lambda: email_service.send_login_email(public)),
        ("login (business)", lambda: email_service.send_login_email(business)),
        ("wholesale approved", lambda: email_service.send_wholesale_decision_email(business, approved=True)),
        (
            "wholesale rejected",
            lambda: email_service.send_wholesale_decision_email(
                business, approved=False, reason="Test rejection — ignore this email."
            ),
        ),
        ("admin: public signup", lambda: email_service.send_admin_signup_email(public)),
        ("admin: business application", lambda: email_service.send_admin_business_application_email(business)),
        ("order confirmation (personal)", lambda: email_service.send_order_confirmation_email(_sample_order(business=False))),
        ("order confirmation (business)", lambda: email_service.send_order_confirmation_email(_sample_order(business=True))),
        ("admin: new order", lambda: email_service.send_admin_new_order_email(_sample_order(business=False))),
        ("order cancelled (customer)", lambda: email_service.send_order_cancelled_email(_sample_order(business=False))),
        ("admin: order cancelled", lambda: email_service.send_admin_order_cancelled_email(_sample_order(business=False))),
        ("cart abandonment", lambda: email_service.send_cart_abandonment_email(public, _sample_cart())),
        ("restock subscribed", lambda: email_service.send_restock_subscribed_email(TO, product)),
        ("back in stock", lambda: email_service.send_back_in_stock_email(TO, product)),
        (
            "new arrivals",
            lambda: email_service.send_new_arrivals_email(public, [product]),
        ),
        (
            "generic alert",
            lambda: email_service.send_alert_email(
                public,
                title="Test price drop alert",
                message="This is a test catalog alert. You can ignore it.",
                cta_url="https://www.samphone.eu/new",
                cta_label="Open Samphone",
            ),
        ),
        (
            "MFA / verification code",
            lambda: email_service.send_email(
                TO,
                "Your Samphone verification code",
                "<p>Your verification code is <strong>000000</strong> (test only).</p><p>It expires in 10 minutes.</p>",
                "Your verification code is 000000 (test only). It expires in 10 minutes.",
            ),
        ),
        (
            "contact / lead",
            lambda: email_service.send_email(
                TO,
                "[Samphone] Website contact (test)",
                "<p><strong>Name:</strong> Sheetal Chauhan</p><p><strong>Email:</strong> "
                f"{TO}</p><p><strong>Message:</strong> Test contact form email. Ignore.</p>",
                "Test contact form email. Ignore.",
            ),
        ),
        (
            "newsletter signup",
            lambda: email_service.send_email(
                TO,
                "[Samphone] Newsletter signup (test)",
                f"<p>Test newsletter signup from {TO}.</p>",
                f"Test newsletter signup from {TO}.",
            ),
        ),
        (
            "API error digest",
            lambda: email_service.send_email(
                TO,
                "[Samphone] API error digest (test)",
                "<pre>TEST digest — no real errors.</pre>",
                "TEST digest — no real errors.",
            ),
        ),
    ]

    if not email_service._smtp_configured():
        print("SMTP_USER / SMTP_PASSWORD are not set. Emails were not sent.")
        print("Run this on the VPS (samphone.cloud) where SMTP is configured:")
        print(f"  PYTHONPATH=. python3 scripts/send_all_test_emails.py {TO}")
        return 2

    print(f"Sending {len(jobs)} test emails to {TO} …")
    failed = 0
    for label, fn in jobs:
        try:
            ok = bool(fn())
        except Exception as exc:
            ok = False
            print(f"  FAIL  {label}: {exc}")
        else:
            print(f"  {'OK  ' if ok else 'FAIL'} {label}")
        if not ok:
            failed += 1
    print(f"Done. {len(jobs) - failed} sent, {failed} failed.")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
