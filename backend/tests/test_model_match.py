from model_match import product_matches_model, title_conflicts_with_brand, title_matches_model


def test_iphone_page_rejects_xiaomi_17_pro_max():
    assert title_conflicts_with_brand("Xiaomi 17 Pro Max Back Cover Green", "iPhone")
    assert title_conflicts_with_brand("Xiaomi 17 Pro Max Back Cover Green", "Apple")
    assert not title_matches_model("Xiaomi 17 Pro Max Back Cover Green", "iPhone 17 Pro Max", "Apple")
    assert title_matches_model("iPhone 17 Pro Max Back Cover Black", "iPhone 17 Pro Max", "Apple")
    assert not product_matches_model(
        {"title": "Xiaomi 17 Pro Max Back Cover Purple", "brand": "Xiaomi"},
        "Apple",
        "iPhone 17 Pro Max",
        None,
    )
    assert product_matches_model(
        {"title": "iPhone 17 Pro Max Back Cover Black", "brand": "Apple"},
        "Apple",
        "iPhone 17 Pro Max",
        None,
    )


def test_xiaomi_page_rejects_iphone():
    assert not product_matches_model(
        {"title": "iPhone 17 Pro Max Back Cover Black", "brand": "Apple"},
        "Xiaomi",
        "Xiaomi 17 Pro Max",
        None,
    )
    assert product_matches_model(
        {"title": "Xiaomi 17 Pro Max Back Cover Green", "brand": "Xiaomi"},
        "Xiaomi",
        "Xiaomi 17 Pro Max",
        None,
    )
