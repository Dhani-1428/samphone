from catalog_images import is_placeholder_image, product_has_real_image, real_image_urls


def test_placeholder_urls():
    assert is_placeholder_image("")
    assert is_placeholder_image("https://www.samphone.pt/wp-content/uploads/woocommerce-placeholder.png")
    assert is_placeholder_image("https://www.samphone.pt/wp-content/uploads/2025/02/DISPLAY-BANNER-SAMPHONE.png")
    assert not is_placeholder_image("https://cdn.tudo4mobile.com/covers/iphone-11-purple.jpg")


def test_real_image_urls_drops_placeholders():
    urls = real_image_urls(
        [
            "https://www.samphone.pt/wp-content/uploads/woocommerce-placeholder.png",
            {"src": "https://cdn.example.com/sim-tray.jpg"},
            {"src": "https://cdn.example.com/sim-tray.jpg"},
        ]
    )
    assert urls == ["https://cdn.example.com/sim-tray.jpg"]


def test_product_has_real_image():
    assert not product_has_real_image({"image": "", "images": []})
    assert not product_has_real_image(
        {"image": "https://x/woocommerce-placeholder.png", "images": ["https://x/woocommerce-placeholder.png"]}
    )
    assert product_has_real_image({"image": "https://cdn.example.com/cover.jpg", "images": []})
    assert product_has_real_image(
        {"image": "https://x/woocommerce-placeholder.png", "images": ["https://cdn.example.com/cover.jpg"]}
    )
