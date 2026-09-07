import os

os.environ.setdefault("USE_MEMORY", "1")
os.environ.setdefault("USE_CATALOG_MYSQL", "0")
os.environ.setdefault("USE_APP_MYSQL", "0")
os.environ.setdefault("JWT_SECRET", "website-test-secret-please-change-32")
os.environ.setdefault("JWT_ALGORITHM", "HS256")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
os.environ.setdefault("ADMIN_EMAIL", "admin@example.com")
os.environ.setdefault("ADMIN_PASSWORD", "adminpass12")
os.environ.setdefault("CORS_ALLOW_ORIGINS", "http://localhost:5173")

from fastapi.testclient import TestClient

from server import app
import os as _os

client = TestClient(app)
ADMIN_LOGIN_EMAIL = _os.environ.get("ADMIN_EMAIL", "admin@example.com")
ADMIN_LOGIN_PASSWORD = _os.environ.get("ADMIN_PASSWORD", "adminpass12")


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json().get("ok") is True


def test_register_login_me():
    email = "siteuser@example.com"
    password = "password12"
    r = client.post("/api/auth/register", json={"email": email, "password": password, "name": "Site"})
    assert r.status_code == 200, r.text
    token = r.json()["access_token"]
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == email
    login = client.post("/api/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200
    assert login.json().get("access_token")


def test_contact_lead():
    r = client.post(
        "/api/leads/contact",
        json={"name": "Ana", "email": "ana@example.com", "subject": "Help", "message": "Need a screen"},
    )
    assert r.status_code == 200
    assert r.json().get("ok") is True


def test_newsletter_lead():
    r = client.post("/api/leads/newsletter", json={"email": "news@example.com"})
    assert r.status_code == 200


def test_mfa_verify_rejects_bad_token():
    r = client.post("/api/auth/mfa/verify", json={"mfa_token": "not-a-real-token-value", "code": "000000"})
    assert r.status_code == 400


def test_admin_login_and_patch_user():
    login = client.post("/api/auth/admin-login", json={"email": ADMIN_LOGIN_EMAIL, "password": ADMIN_LOGIN_PASSWORD})
    assert login.status_code == 200, login.text
    admin_token = login.json()["access_token"]
    created = client.post(
        "/api/auth/register",
        json={
            "email": "dealer@example.com",
            "password": "password12",
            "name": "Dealer",
            "account_type": "b2b",
            "business_name": "Fix Shop",
        },
    )
    assert created.status_code == 200, created.text
    user_id = created.json()["user"]["id"]
    patched = client.patch(
        f"/api/admin/users/{user_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"wholesaleStatus": "approved", "accountDiscountPercent": 10},
    )
    assert patched.status_code == 200, patched.text
    assert patched.json().get("wholesaleStatus") == "approved"
    assert patched.json().get("accountDiscountPercent") == 10


def test_notification_prefs_and_stock_alerts():
    email = "alerts@example.com"
    password = "password12"
    created = client.post(
        "/api/auth/register",
        json={"email": email, "password": password, "name": "Alerts"},
    )
    assert created.status_code == 200, created.text
    token = created.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    prefs = client.get("/api/notifications/prefs", headers=headers)
    assert prefs.status_code == 200, prefs.text
    body = prefs.json()
    assert body.get("restock") is True
    assert body.get("newArrivals") is True
    assert body.get("promotions") is True
    assert body.get("orderUpdates") is True

    patched = client.patch(
        "/api/notifications/prefs",
        headers=headers,
        json={"promotions": False, "restock": True, "newArrivals": True, "orders": True},
    )
    assert patched.status_code == 200, patched.text
    assert patched.json().get("promotions") is False
    assert patched.json().get("orders") is True

    wait = client.post("/api/notify-stock", json={"product_id": "sku-test-1", "email": email})
    assert wait.status_code == 200, wait.text

    listed = client.get("/api/stock-alerts", headers=headers)
    assert listed.status_code == 200, listed.text
    alerts = listed.json().get("items") or []
    assert any(a.get("product_id") == "sku-test-1" for a in alerts)

    removed = client.delete("/api/stock-alerts/sku-test-1", headers=headers)
    assert removed.status_code == 200, removed.text
    empty = client.get("/api/stock-alerts", headers=headers)
    assert empty.json().get("items") == []


def test_public_and_business_account_emails(monkeypatch):
    captured: list[dict] = []

    def fake_send(to, subject, html_body, text_body=""):
        captured.append({"to": to, "subject": subject, "html": html_body})
        return True

    monkeypatch.setattr("email_service.send_email", fake_send)
    from email_service import send_login_email, send_welcome_email

    captured.clear()
    send_welcome_email({"email": "public@example.com", "name": "Ana", "accountType": "b2c"})
    assert captured
    html_body = captured[0]["html"]
    assert captured[0]["subject"] == "Welcome to Samphone!"
    assert "Welcome to Samphone!" in html_body
    assert "Go to My Account" in html_body
    assert "YOUR SAMPHONE ACCOUNT" in html_body
    assert "Ready to start shopping?" in html_body
    assert "MOBILE PARTS" in html_body
    assert "geral@samphone.pt" in html_body
    assert "+351 937 119 295" in html_body
    assert "/account" in html_body
    assert "Official correspondence" not in html_body
    assert "Hey Ana" not in html_body

    captured.clear()
    send_welcome_email(
        {
            "email": "biz@example.com",
            "name": "Carlos",
            "accountType": "b2b",
            "businessName": "Fix Shop",
            "wholesaleStatus": "pending",
        }
    )
    assert captured
    biz_html = captured[0]["html"]
    assert captured[0]["subject"] == "Welcome to Samphone Business!"
    assert "Welcome to Samphone" in biz_html
    assert "Business!" in biz_html
    assert "Go to Business Account" in biz_html
    assert "Your Business Account Gives You More" in biz_html
    assert "geral@samphone.pt" in biz_html
    assert "online store for businesses" in biz_html
    assert "Official correspondence" not in biz_html
    assert "Dear Carlos" not in biz_html

    captured.clear()
    send_login_email({"email": "public@example.com", "name": "Ana", "accountType": "b2c"})
    assert "welcome back" in captured[0]["html"].lower()
    assert "#FDB136" in captured[0]["html"]

    captured.clear()
    send_login_email(
        {
            "email": "biz@example.com",
            "name": "Carlos",
            "accountType": "b2b",
            "businessName": "Fix Shop",
        }
    )
    assert "Dear Carlos" in captured[0]["html"]
    assert "confirmation of sign-in" in captured[0]["subject"].lower()
    assert "Official correspondence" in captured[0]["html"]


def test_order_confirmation_is_single_template_per_account(monkeypatch):
    captured: list[dict] = []

    def fake_send(to, subject, html_body, text_body=""):
        captured.append({"to": to, "subject": subject, "html": html_body})
        return True

    monkeypatch.setattr("email_service.send_email", fake_send)
    from email_service import send_order_confirmation_email

    b2c_order = {
        "customer_email": "john@example.com",
        "customer_name": "John Smith",
        "account_type": "b2c",
        "order_number": "SP25051342",
        "payment_method": "card",
        "subtotal": 151.86,
        "created_at": "2026-05-13T10:00:00+00:00",
        "items": [{"title": "Screen", "sku": "SCR-1", "quantity": 1, "price": 79.9, "line_total": 79.9}],
    }
    captured.clear()
    send_order_confirmation_email(b2c_order)
    assert len(captured) == 1
    html_b2c = captured[0]["html"]
    assert "Thank you for your order!" in html_b2c
    assert "Hi John" in html_b2c
    assert "What happens next?" in html_b2c
    assert "Easy Returns" in html_b2c
    assert "VAT Number" not in html_b2c
    assert "Business Pricing" not in html_b2c
    assert "login to your business account" not in html_b2c
    assert "Go to Business Account" not in html_b2c

    b2b_order = {
        "customer_email": "ops@techfix.pt",
        "customer_name": "Carlos",
        "account_type": "b2b",
        "accountType": "b2b",
        "company_name": "TechFix Solutions Lda",
        "vat_number": "PT515123456",
        "order_number": "BSP25051342",
        "payment_method": "multibanco",
        "subtotal": 1033.07,
        "created_at": "2026-05-13T10:00:00+00:00",
        "items": [{"title": "Battery pack", "sku": "BAT-1", "quantity": 25, "price": 12.0, "line_total": 300.0}],
    }
    captured.clear()
    send_order_confirmation_email(b2b_order)
    assert len(captured) == 1
    html_b2b = captured[0]["html"]
    assert "Thank you for your order!" in html_b2b
    assert "TechFix Solutions Lda" in html_b2b
    assert "VAT Number" in html_b2b
    assert "QUANTITY" in html_b2b
    assert "Business Pricing" in html_b2b
    assert "Important information" in html_b2b
    assert "What happens next?" not in html_b2b
    assert "Easy Returns" not in html_b2b
    assert "Hi John" not in html_b2b
