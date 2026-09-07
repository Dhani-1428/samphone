"""Samphone backend API regression tests — v11 notify-stock + OOS + regressions."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://hoco-parts-hub.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def test_user():
    unique = uuid.uuid4().hex[:8]
    return {
        "email": f"TEST_user_{unique}@samphone.pt",
        "password": "test1234",
        "name": "TEST User",
    }


@pytest.fixture(scope="session")
def spec_user():
    # exact credentials named in the review request
    return {"email": "test@samphone.pt", "password": "test1234", "name": "Test User"}


@pytest.fixture(scope="session")
def auth_token(api_client, test_user):
    r = api_client.post(f"{API}/auth/register", json=test_user, timeout=30)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    body = r.json()
    assert "access_token" in body and body["user"]["email"] == test_user["email"].lower()
    return body["access_token"]


# ---------- Health ----------
class TestHealth:
    def test_root(self, api_client):
        r = api_client.get(f"{API}/", timeout=15)
        assert r.status_code == 200
        assert "Samphone" in r.json().get("message", "")


# ---------- Auth ----------
class TestAuth:
    def test_register_duplicate(self, api_client, test_user, auth_token):
        r = api_client.post(f"{API}/auth/register", json=test_user, timeout=30)
        assert r.status_code == 400

    def test_login_success(self, api_client, test_user, auth_token):
        r = api_client.post(f"{API}/auth/login",
                            json={"email": test_user["email"], "password": test_user["password"]}, timeout=30)
        assert r.status_code == 200
        assert "access_token" in r.json()

    def test_login_wrong_password(self, api_client, test_user, auth_token):
        r = api_client.post(f"{API}/auth/login",
                            json={"email": test_user["email"], "password": "wrongpw"}, timeout=30)
        assert r.status_code == 400

    def test_me_without_token(self, api_client):
        r = api_client.get(f"{API}/auth/me", timeout=15)
        assert r.status_code in (401, 403)

    def test_me_with_token(self, api_client, auth_token, test_user):
        r = api_client.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {auth_token}"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["email"] == test_user["email"].lower()

    def test_spec_user_register_or_login(self, api_client, spec_user):
        """Ensure the named test@samphone.pt / test1234 account is usable."""
        reg = api_client.post(f"{API}/auth/register", json=spec_user, timeout=30)
        assert reg.status_code in (200, 400)  # 400 if already exists
        login = api_client.post(f"{API}/auth/login",
                                json={"email": spec_user["email"], "password": spec_user["password"]}, timeout=30)
        assert login.status_code == 200, login.text
        body = login.json()
        assert body["access_token"]
        assert body["user"]["email"] == spec_user["email"].lower()


# ---------- Catalog / Products (v5) ----------
class TestCatalogV5:
    def test_list_products_count(self, api_client):
        r = api_client.get(f"{API}/products", params={"limit": 2000}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        # v6 expects ~982 products
        assert len(data) >= 900, f"expected ~982 products, got {len(data)}"
        p = data[0]
        for key in ("id", "title", "brand", "price", "category"):
            assert key in p
        assert "_id" not in p

    def test_filter_category_phone_parts(self, api_client):
        r = api_client.get(f"{API}/products", params={"category": "Phone Parts", "limit": 1000}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert len(data) > 0
        assert all(p["category"] == "Phone Parts" for p in data)

    def test_filter_category_hoco(self, api_client):
        r = api_client.get(f"{API}/products", params={"category": "Hoco", "limit": 1000}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert len(data) > 0
        assert all(p["category"] == "Hoco" for p in data)

    def test_filter_category_accessories(self, api_client):
        r = api_client.get(f"{API}/products", params={"category": "Accessories", "limit": 1000}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert len(data) > 0
        assert all(p["category"] == "Accessories" for p in data)

    def test_filter_brand_apple(self, api_client):
        r = api_client.get(f"{API}/products", params={"brand": "Apple", "limit": 1000}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert len(data) > 0
        assert all(p["brand"] == "Apple" for p in data)

    def test_phone_parts_apple_have_model_and_part_type(self, api_client):
        r = api_client.get(f"{API}/products",
                           params={"category": "Phone Parts", "brand": "Apple", "limit": 1000}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert len(data) > 0, "expected Apple Phone Parts"
        with_model = [p for p in data if p.get("model")]
        with_pt = [p for p in data if p.get("part_type")]
        assert len(with_model) == len(data), f"missing model on {len(data)-len(with_model)} Apple parts"
        assert len(with_pt) == len(data), f"missing part_type on {len(data)-len(with_pt)} Apple parts"
        models = {p["model"] for p in data}
        part_types = {p["part_type"] for p in data}
        assert len(models) >= 2, f"expected multiple Apple models, got {models}"
        assert len(part_types) >= 2, f"expected multiple part_types, got {part_types}"

    def test_phone_parts_brands_with_data(self, api_client):
        # brands documented in test_credentials.md that must have parts
        expected = ["Apple", "Samsung", "Xiaomi", "Oppo", "Huawei", "Google Pixel"]
        missing = []
        for br in expected:
            r = api_client.get(f"{API}/products",
                               params={"category": "Phone Parts", "brand": br, "limit": 1000}, timeout=30)
            if r.status_code != 200 or len(r.json()) == 0:
                missing.append(br)
        assert not missing, f"brands with no Phone Parts data: {missing}"

    def test_filter_subcategory(self, api_client):
        # discover a subcategory from accessories
        r = api_client.get(f"{API}/products", params={"category": "Accessories", "limit": 1000}, timeout=30)
        assert r.status_code == 200
        subs = {p.get("subcategory") for p in r.json() if p.get("subcategory")}
        assert subs, "no subcategories on Accessories"
        sub = next(iter(subs))
        r2 = api_client.get(f"{API}/products", params={"subcategory": sub, "limit": 1000}, timeout=30)
        assert r2.status_code == 200
        assert all(p["subcategory"] == sub for p in r2.json())

    def test_filter_best_seller(self, api_client):
        r = api_client.get(f"{API}/products", params={"best_seller": "true", "limit": 1000}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert len(data) > 0
        assert all(p.get("best_seller") is True for p in data)

    def test_filter_new_arrival(self, api_client):
        r = api_client.get(f"{API}/products", params={"new_arrival": "true", "limit": 1000}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert len(data) > 0
        assert all(p.get("new_arrival") is True for p in data)

    def test_search_query(self, api_client):
        r = api_client.get(f"{API}/products", params={"q": "hoco", "limit": 1000}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_get_product_by_id(self, api_client):
        all_p = api_client.get(f"{API}/products", params={"limit": 5}, timeout=30).json()
        pid = all_p[0]["id"]
        r = api_client.get(f"{API}/products/{pid}", timeout=15)
        assert r.status_code == 200 and r.json()["id"] == pid

    def test_get_product_not_found(self, api_client):
        r = api_client.get(f"{API}/products/does-not-exist-xyz", timeout=15)
        assert r.status_code == 404


# ---------- v6 Leaf categories (Shop by Category) ----------
class TestLeafCategoriesV6:
    def test_leaf_antishock_cover(self, api_client):
        r = api_client.get(f"{API}/products", params={"leaf_category": "Antishock Cover", "limit": 1000}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 24, f"expected 24 Antishock Cover, got {len(data)}"
        assert all(p.get("leaf_category") == "Antishock Cover" for p in data)

    def test_leaf_speakers(self, api_client):
        r = api_client.get(f"{API}/products", params={"leaf_category": "Speakers", "limit": 1000}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert len(data) > 0
        assert all(p.get("leaf_category") == "Speakers" for p in data)

    def test_leaf_type_c_cables(self, api_client):
        r = api_client.get(f"{API}/products", params={"leaf_category": "Type-C Cables", "limit": 1000}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert len(data) > 0
        assert all(p.get("leaf_category") == "Type-C Cables" for p in data)

    def test_leaf_power_banks(self, api_client):
        r = api_client.get(f"{API}/products", params={"leaf_category": "Power Banks", "limit": 1000}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert len(data) > 0
        assert all(p.get("leaf_category") == "Power Banks" for p in data)

    def test_leaf_invalid_returns_empty(self, api_client):
        r = api_client.get(f"{API}/products", params={"leaf_category": "NoSuchCategoryXYZ", "limit": 100}, timeout=30)
        assert r.status_code == 200
        assert r.json() == []

    def test_all_36_leaf_categories_have_products(self, api_client):
        expected = [
            "Full Glue Glass", "Privacy Glass", "Curved Full Glue Glass",
            "Camera Lens 3-IN-1", "Camera Lens Complete", "Smart Watch Glass",
            "Silicon Soft Jelly", "Antishock Cover", "Flip Cover", "Ring Cover",
            "Magsafe cover", "Design cover",
            "Adapters", "Lightning Chargers", "Type-C Chargers", "Micro-USB Chargers", "Wireless Charger",
            "Lightning Cables", "Type-C Cables", "Micro Cables", "Internet Cables", "HDMI Cables",
            "Wireless Headset", "Headphones", "Earphones", "Neck Earphone", "Speakers", "Microphone", "Audio Cable",
            "Smartwatches", "Smartwatch Accessories",
            "Power Banks", "Mobile Car Support", "Original Accessories", "Hoco Beauty Care", "Other Hoco Accessories",
        ]
        assert len(expected) == 36
        empty = []
        for lc in expected:
            r = api_client.get(f"{API}/products", params={"leaf_category": lc, "limit": 1000}, timeout=30)
            if r.status_code != 200 or len(r.json()) == 0:
                empty.append(lc)
        assert not empty, f"leaf_categories with no products: {empty}"


# ---------- Orders ----------
class TestOrders:
    def test_create_order_requires_auth(self, api_client):
        r = api_client.post(f"{API}/orders", json={}, timeout=15)
        assert r.status_code in (401, 403, 422)

    def test_create_and_list_order(self, api_client, auth_token):
        products = api_client.get(f"{API}/products", params={"limit": 5}, timeout=30).json()
        p = products[0]
        payload = {
            "items": [{
                "product_id": p["id"], "title": p["title"], "brand": p["brand"],
                "price": p["price"], "quantity": 2, "image": p.get("image", ""),
            }],
            "subtotal": p["price"] * 2,
            "full_name": "TEST Buyer", "phone": "+351911111111",
            "address": "Rua Test 1", "city": "Lisbon", "postal_code": "1000-001",
            "payment_method": "delivery",
        }
        headers = {"Authorization": f"Bearer {auth_token}"}
        r = api_client.post(f"{API}/orders", json=payload, headers=headers, timeout=30)
        assert r.status_code == 200, r.text
        order = r.json()
        assert order["order_number"].startswith("SP")
        assert order["status"] == "confirmed"
        assert "_id" not in order

        time.sleep(0.5)
        r2 = api_client.get(f"{API}/orders", headers=headers, timeout=30)
        assert r2.status_code == 200
        assert any(o["order_number"] == order["order_number"] for o in r2.json())



# ---------- v11 Stock notifications + OOS ----------
class TestStockV11:
    def _find_oos(self, api_client):
        r = api_client.get(f"{API}/products", params={"limit": 2000}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        oos = [p for p in data if p.get("in_stock") is False]
        return data, oos

    def test_products_still_around_982(self, api_client):
        data, _ = self._find_oos(api_client)
        assert len(data) >= 900, f"expected ~982 products, got {len(data)}"

    def test_some_products_out_of_stock(self, api_client):
        data, oos = self._find_oos(api_client)
        # spec says ~81/982 seeded with in_stock=False
        assert len(oos) >= 10, f"expected many out-of-stock products, got {len(oos)}"

    def test_referenced_oos_product_id_if_present(self, api_client):
        pid = "02f5841e-e9ae-4d67-b733-9113cd49eaaf"
        r = api_client.get(f"{API}/products/{pid}", timeout=15)
        # Product may have been re-seeded with a different id; accept 404 gracefully
        if r.status_code == 200:
            assert r.json().get("in_stock") is False, "referenced product should be OOS"

    def test_notify_stock_success(self, api_client):
        _, oos = self._find_oos(api_client)
        assert oos, "need at least one OOS product to test notify"
        pid = oos[0]["id"]
        r = api_client.post(
            f"{API}/notify-stock",
            json={"product_id": pid, "email": "TEST_notify1@samphone.pt"},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("ok") is True

    def test_notify_stock_idempotent_upsert(self, api_client):
        _, oos = self._find_oos(api_client)
        pid = oos[0]["id"]
        payload = {"product_id": pid, "email": "TEST_notify_dup@samphone.pt"}
        r1 = api_client.post(f"{API}/notify-stock", json=payload, timeout=15)
        assert r1.status_code == 200 and r1.json().get("ok") is True
        # second call same email+product should also succeed (upsert, no error)
        r2 = api_client.post(f"{API}/notify-stock", json=payload, timeout=15)
        assert r2.status_code == 200 and r2.json().get("ok") is True

    def test_notify_stock_invalid_email_400(self, api_client):
        _, oos = self._find_oos(api_client)
        pid = oos[0]["id"]
        for bad in ["not-an-email", "foo@", "bar.com", ""]:
            r = api_client.post(
                f"{API}/notify-stock",
                json={"product_id": pid, "email": bad},
                timeout=15,
            )
            assert r.status_code == 400, f"expected 400 for {bad!r}, got {r.status_code}: {r.text}"
