"""Public B2C band tables — accessories vs phone parts."""
from wholesale import map_public_retail_price, sanitize_product


def test_accessory_examples():
    acc = {"category": "Accessories", "leaf_category": "Silicon Soft Jelly"}
    assert map_public_retail_price(0.99, acc) == 4.90
    assert map_public_retail_price(1.90, acc) == 4.90
    assert map_public_retail_price(55, acc) == 89.90
    assert map_public_retail_price(90, acc) == 129.90
    assert map_public_retail_price(91, acc) == 91.0


def test_parts_examples():
    part = {"category": "Phone Parts", "leaf_category": "Battery"}
    assert map_public_retail_price(2.50, part) == 4.90
    assert map_public_retail_price(8, part) == 14.90
    assert map_public_retail_price(40, part) == 54.90
    assert map_public_retail_price(41, part) == 41.0


def test_override_wins():
    acc = {
        "category": "Accessories",
        "b2c_override": True,
        "stored_b2c_override": 12.0,
        "b2b_price": 0.99,
        "wholesalePrice": 0.99,
        "apiPrice": 0.99,
    }
    out = sanitize_product(acc, None)
    assert out["retailPrice"] == 12.0
    assert "wholesalePrice" not in out


def test_guest_maps_cost_not_woo_public():
    acc = {
        "category": "Accessories",
        "leaf_category": "Hoco",
        "b2b_price": 0.99,
        "wholesalePrice": 0.99,
        "stored_public_price": 0.99,
        "retailPrice": 0.99,
        "price": 0.99,
    }
    out = sanitize_product(acc, None)
    assert out["price"] == 4.90
    assert out["retailPrice"] == 4.90


def test_b2b_keeps_wholesale():
    acc = {
        "category": "Accessories",
        "b2b_price": 0.99,
        "wholesalePrice": 0.99,
        "role": "skip",
    }
    user = {
        "role": "customer",
        "accountType": "b2b",
        "isWholesale": True,
        "wholesaleStatus": "approved",
        "id": "1",
    }
    out = sanitize_product(acc, user)
    assert out["price"] == 0.99
    assert out["wholesalePrice"] == 0.99
    assert out["retailPrice"] == 4.90
