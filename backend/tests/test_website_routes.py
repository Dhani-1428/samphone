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
