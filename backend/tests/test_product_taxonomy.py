from product_taxonomy import assign_taxonomy, validate_taxonomy


def test_parts_not_accessories():
    for title in (
        "iPhone 14 Pro Max Ear Speaker",
        "iPhone 14 Pro Max Flash Light Flex",
        "iPhone 14 Pro Max Vibrater",
        "Touch + LCD OLED iPhone 17 Pro Max",
        "Battery iPhone 17 Pro Max",
        "Charging Port Flex iPhone 17 Pro Max",
    ):
        asg = assign_taxonomy(title=title, category="Phone Parts")
        assert asg["top"] == "parts", title


def test_accessories_not_parts():
    for title in (
        "Silicon Soft Jelly Cover iPhone 14 Pro Max",
        "Tempered Glass iPhone 14 Pro Max",
        "USB-C Cable 1m",
        "Hoco Bluetooth Speaker",
        "MagSafe Case iPhone 17 Pro Max",
    ):
        asg = assign_taxonomy(title=title, category="Phone Parts")
        assert asg["top"] == "accessories", title


def test_validate_rejects_typos():
    try:
        validate_taxonomy("partss", "screens")
        assert False
    except ValueError:
        pass
    try:
        validate_taxonomy("parts", "case")
        assert False
    except ValueError:
        pass
    validate_taxonomy("parts", "screens")
    validate_taxonomy("accessories", "cases")


def test_oem_back_cover_housing_is_parts():
    for title in (
        "iPhone 16 Pro Max Back Cover + Frame Black Titanium",
        "iPhone 16 Pro Max Back Cover With Magnet +wireless Flash Black Titanium",
        "iPhone 16 Pro Max Back Cover With Magnet+wireless Flash White Titanium",
        "iPhone 16 Pro Max Back Cover With Magnet +wireless Flash Natural Titanium",
        "iPhone 16 Pro Max Back Cover+frame Natural Titanium",
        "iPhone 16 Pro Max Back Cover+frame Desert Titanium",
        "iPhone 15 Pro Back Cover + Frame Natural Titanium",
    ):
        asg = assign_taxonomy(title=title, category="Accessories")
        assert asg["top"] == "parts", title
        assert asg["sub"] == "housing", title
    plain = assign_taxonomy(title="Back Cover iPhone 17 Pro Max Black")
    assert plain["top"] == "accessories"


def test_cable_vs_port():
    cable = assign_taxonomy(title="Lightning Cable iPhone")
    port = assign_taxonomy(title="Charging Port Flex iPhone 14")
    assert cable["top"] == "accessories" and cable["sub"] == "chargers-cables"
    assert port["top"] == "parts" and port["sub"] == "charging-ports"
