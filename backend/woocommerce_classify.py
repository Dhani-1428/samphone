"""Map WooCommerce product title + categories to Samphone catalog fields."""
from __future__ import annotations

import re
from typing import Any

PHONE_BRANDS = [
    ("IPHONE", "Apple"),
    ("APPLE", "Apple"),
    ("IPAD", "Apple"),
    ("GALAXY", "Samsung"),
    ("SAMSUNG", "Samsung"),
    ("REDMI", "Xiaomi"),
    ("POCO", "Xiaomi"),
    ("XIAOMI", "Xiaomi"),
    ("MI ", "Xiaomi"),
    ("ONEPLUS", "OnePlus"),
    ("HONOR", "Huawei"),
    ("HUAWEI", "Huawei"),
    ("OPPO", "Oppo"),
    ("REALME", "Realme"),
    ("MOTOROLA", "Motorola"),
    ("MOTO ", "Motorola"),
    ("ALCATEL", "Alcatel"),
    ("TCL", "TCL"),
    ("ZTE", "ZTE"),
    ("VIVO", "Vivo"),
    ("NOKIA", "Nokia"),
    ("PIXEL", "Google Pixel"),
    ("LG ", "LG"),
]

GENERIC_PART_CATS = {
    "design cover",
    "camera lens",
    "camera lens complete",
    "antishock cover",
    "curved full glue glass",
    "full glue glass",
    "multi brand",
    "other",
    "normal glass",
    "privacy glass",
    "tempered glass",
    "smart watch glass",
}

TOKEN_FIX = {
    "iphone": "iPhone",
    "ipad": "iPad",
    "tcl": "TCL",
    "zte": "ZTE",
    "lg": "LG",
    "se": "SE",
    "5g": "5G",
    "4g": "4G",
    "3g": "3G",
    "led": "LED",
    "oled": "OLED",
    "lcd": "LCD",
    "sim": "SIM",
    "usb": "USB",
    "pd": "PD",
    "hd": "HD",
    "hdmi": "HDMI",
    "tws": "TWS",
    "bt": "BT",
    "fe": "FE",
    "ip": "IP",
    "mah": "mAh",
    "ii": "II",
    "iii": "III",
    "xs": "XS",
    "xr": "XR",
}


def phone_brand(text: str) -> str:
    up = f" {text.upper()} "
    for kw, brand in PHONE_BRANDS:
        if kw in up:
            return brand
    return "Other"


def firstword(name: str) -> str:
    words = name.strip().split()
    return words[0].title() if words else "Samphone"


WC_CAT_TO_LEAF: dict[str, str] = {
    "full glue glass": "Full Glue Glass",
    "privacy glass": "Privacy Glass",
    "normal glass": "Normal Glass",
    "tempered glass": "Normal Glass",
    "curved full glue glass": "Curved Full Glue Glass",
    "camera lens 3-in-1": "Camera Lens 3-IN-1",
    "camera lens complete": "Camera Lens Complete",
    "camera lens": "Camera Lens",
    "smart watch glass": "Smart Watch Glass",
    "silicon soft jelly": "Silicon Soft Jelly",
    "antishock cover": "Antishock Cover",
    "flip cover": "Flip Cover",
    "ring cover": "Ring Cover",
    "magsafe cover": "Magsafe Cover",
    "design cover": "Design cover",
}


def part_leaf_category(up: str, categories: list[str]) -> str | None:
    """UI section label for glass/cover parts (matches frontend modelGroups)."""
    if "CURVED FULL GLUE" in up or ("CURVED" in up and "FULL GLUE" in up):
        return "Curved Full Glue Glass"

    for cat in sorted(categories, key=lambda c: len(c or ""), reverse=True):
        key = cat.strip().lower()
        if key in WC_CAT_TO_LEAF:
            return WC_CAT_TO_LEAF[key]

    if "FULL GLUE GLASS" in up or " FULL GLUE " in up:
        return "Full Glue Glass"
    if "PRIVACY GLASS" in up:
        return "Privacy Glass"
    if "NORMAL GLASS" in up or "TEMPERED GLASS" in up:
        return "Normal Glass"
    if "CAMERA LENS 3" in up or "3-IN-1" in up and "LENS" in up:
        return "Camera Lens 3-IN-1"
    if "LENS COMPLETE" in up or "CAMERA LENS COMPLETE" in up:
        return "Camera Lens Complete"
    if "SMART WATCH GLASS" in up or "SMARTWATCH GLASS" in up:
        return "Smart Watch Glass"
    if "SILICON SOFT JELLY" in up or "SOFT JELLY" in up:
        return "Silicon Soft Jelly"
    if "ANTISHOCK" in up:
        return "Antishock Cover"
    if "FLIP COVER" in up:
        return "Flip Cover"
    if "RING COVER" in up:
        return "Ring Cover"
    if "MAGSAFE" in up:
        return "Magsafe Cover"
    if "DESIGN COVER" in up:
        return "Design cover"
    return None


def part_type(up: str, categories: list[str] | None = None) -> str:
    glass_leaf = part_leaf_category(up, categories or [])
    if glass_leaf:
        return glass_leaf
    if any(k in up for k in ["TOUCH+LCD", "TOUCH + LCD", " LCD", "OLED", "DISPLAY", "SCREEN ASSEMBLY", "TOUCH SCREEN", "TFT", "INCELL"]):
        return "Screen / LCD Assembly"
    if "BATTERY" in up:
        return "Battery"
    if "FRONT CAMERA" in up or "SELFIE" in up:
        return "Front Camera"
    if "CAMERA LENS" in up or ("LENS" in up and "CAMERA" in up) or up.strip().endswith("LENS"):
        return "Camera Lens"
    if "CAMERA" in up:
        return "Rear Camera"
    if "CHARGING" in up or "CHARGE FLEX" in up or "USB FLEX" in up or "DOCK" in up:
        return "Charging Port Flex"
    if any(k in up for k in ["SPEAKER", "BUZZER", "EARPIECE", "RINGER", "LOUD"]):
        return "Speaker / Earpiece"
    if "SIM TRAY" in up or "SIM CARD TRAY" in up:
        return "SIM Tray"
    if "SIM READER" in up or "SIM CARD READER" in up or "SIM FLEX" in up:
        return "SIM Reader"
    if any(k in up for k in ["FINGER FLEX", "FINGERPRINT FLEX"]) or (
        "FINGER" in up and "FINGER PRINT" not in up and "GLASS" not in up
    ):
        return "Fingerprint Flex"
    if any(k in up for k in ["POWER+VOLUME", "POWER + VOLUME", "POWER FLEX", "VOLUME FLEX", "SIDE BUTTON", "SIDE KEY", "ON/OFF"]):
        return "Side Buttons Flex"
    if "MAIN FLEX" in up or "MOTHERBOARD FLEX" in up or "MAINBOARD" in up:
        return "Main Flex"
    if "VIBRAT" in up or ("MOTOR" in up and "GLASS" not in up):
        return "Vibrator Motor"
    if any(k in up for k in ["BACK COVER", "BACK GLASS", "BATTERY COVER", "REAR COVER"]):
        return "Back Glass / Cover"
    if "FRAME" in up or "MIDDLE" in up or "HOUSING" in up:
        return "Housing / Frame"
    if "ANTENNA" in up:
        return "Antenna Flex"
    return "Other Part"


def nice(s: str) -> str:
    words = s.split()
    out: list[str] = []
    for w in words:
        lw = w.lower()
        if lw in TOKEN_FIX:
            out.append(TOKEN_FIX[lw])
        elif w.isdigit() or (len(w) > 1 and w[0].isalpha() and w[1:].isdigit()) or (
            len(w) >= 2 and w[-1] in "gGtT" and w[:-1].isdigit()
        ):
            out.append(w.upper())
        elif re.match(r"^[a-zA-Z]\d", w):
            out.append(w.upper())
        else:
            out.append(w.capitalize())
    return " ".join(out)


def model_of(name: str, categories: list[str], brand: str) -> str:
    for cat in categories:
        if cat.strip().lower() not in GENERIC_PART_CATS and cat.strip().upper() != "MULTI BRAND":
            if any(ch.isdigit() for ch in cat) or phone_brand(cat) != "Other":
                return cat.strip()
    nm = name.upper()
    for stop in [
        "DESIGN COVER",
        "CAMERA LENS",
        "BACK COVER",
        "POWER+VOLUME",
        "SIM TRAY",
        "TOUCH+LCD",
        "MAIN FLEX",
        "FINGER FLEX",
        "LCD",
        "BATTERY",
        "ANTISHOCK",
        "FULL GLUE",
    ]:
        idx = nm.find(stop)
        if idx > 0:
            return name[:idx].strip()
    return name.strip()


def classify(name: str, categories: list[str]) -> dict[str, Any]:
    name = name.strip()
    up = f" {name.upper()} "
    catup = " | ".join(categories).upper()
    is_hoco = "HOCO" in catup or up.strip().startswith("HOCO")

    if "REPAIR TOOLS" in catup:
        return {"category": "Repair Tools", "brand": firstword(name), "subcategory": "Repair Tools", "leaf_category": "REPAIR TOOLS"}
    if is_hoco:
        if "POWER BANK" in up:
            sub = "Power Banks"
        elif "CABLE" in up:
            sub = "Cables"
        elif any(k in up for k in ["EARPHONE", "HEADSET", "HEADPHONE", "SPEAKER", "BUDS", "AUDIO", "MIC "]):
            sub = "Audio"
        elif any(k in up for k in ["CAR", "HOLDER", "MOUNT", "SUPPORT"]):
            sub = "Car Accessories"
        elif any(k in up for k in ["CASE", "COVER", "PROTECT", "FILM", "GUARDIAN", "SHADOW SERIES", "SILICONE", "BAND", "STRAP", "GLASS"]):
            sub = "Cases"
        else:
            sub = "Chargers"
        return {"category": "Hoco", "brand": "Hoco", "subcategory": sub, "leaf_category": sub.upper()}

    glass_cover_leaf = part_leaf_category(up, categories)
    wc_part_cats = set(WC_CAT_TO_LEAF.keys())
    if glass_cover_leaf and any(c.strip().lower() in wc_part_cats for c in categories):
        b = phone_brand(name)
        if b == "Other":
            b = phone_brand(catup)
        model = nice(model_of(name, categories, b))
        return {
            "category": "Phone Parts",
            "brand": b,
            "subcategory": b,
            "model": model,
            "part_type": glass_cover_leaf,
            "leaf_category": glass_cover_leaf,
        }

    if any(k in catup for k in ["SMARTWATCH", "SMART WATCH", "APPLE WATCH", "WATCH CHARGER"]):
        return {"category": "Smartwatches", "brand": firstword(name), "subcategory": "Smartwatches", "leaf_category": "SMARTWATCHES"}
    if "SIM CARD" in catup or "MEMORY" in catup or " SIM " in up:
        return {"category": "Cards", "brand": firstword(name), "subcategory": "SIM/Memory", "leaf_category": "SIM/MEMORY"}
    if "SMARTPHONES" in catup:
        b = phone_brand(name)
        if b == "Other":
            b = firstword(name)
        return {"category": "Smartphones", "brand": b, "subcategory": "Smartphones", "leaf_category": "SMARTPHONES"}

    # Complete devices (shop Smartphones page) — detect before Phone Parts keywords.
    try:
        from category_groups import is_smartphone_title

        if is_smartphone_title(name):
            b = phone_brand(name)
            if b == "Other":
                b = firstword(name)
            return {
                "category": "Smartphones",
                "brand": b,
                "subcategory": "Smartphones",
                "leaf_category": "SMARTPHONES",
            }
    except Exception:
        pass

    part_kw = [
        "GALAXY",
        "IPHONE",
        " G ",
        " MINI",
        " PRO",
        " PLUS",
        "REDMI",
        "XIAOMI",
        "POCO",
        "TCL",
        "ZTE",
        "ALCATEL",
        "OPPO",
        "REALME",
        "HUAWEI",
        "HONOR",
        "VIVO",
        "NOKIA",
        "PIXEL",
        "ONEPLUS",
        "MOTOROLA",
        "DESIGN COVER",
        "CAMERA LENS",
        "ANTISHOCK",
        "FULL GLUE GLASS",
        "CURVED",
        "LENS COMPLETE",
    ]
    if any(k in catup for k in part_kw) or any(
        k in up
        for k in [
            "DESIGN COVER",
            "CAMERA LENS",
            "FLIP COVER",
            "RING COVER",
            "PRIVACY GLASS",
            "NORMAL GLASS",
            "FULL GLUE",
            "ANTISHOCK",
            "MAGSAFE",
            "SOFT JELLY",
            "OLED",
            "LCD",
            "DISPLAY",
            "BATTERY",
        ]
    ):
        b = phone_brand(name)
        if b == "Other":
            b = phone_brand(catup)
        model = nice(model_of(name, categories, b))
        pt = part_type(up, categories)
        return {
            "category": "Phone Parts",
            "brand": b,
            "subcategory": b,
            "model": model,
            "part_type": pt,
            "leaf_category": pt,
        }

    if any(k in catup for k in ["SPEAKER", "HEADSET", "EARPHONE", "HEADPHONE", "MICROPHONE", "AUDIO CABLE", "NECK EARPHONE"]):
        return {"category": "Accessories", "brand": firstword(name), "subcategory": "Audio", "leaf_category": "AUDIO"}
    if "POWER BANK" in catup or "POWER BANK" in up:
        return {"category": "Accessories", "brand": firstword(name), "subcategory": "Power Banks", "leaf_category": "POWER BANKS"}
    if any(k in catup for k in ["CAR SUPPORT", "MOBILE CAR", "CAR CHARGER"]) or " CAR " in up:
        return {"category": "Accessories", "brand": firstword(name), "subcategory": "Car Accessories", "leaf_category": "CAR ACCESSORIES"}
    if any(k in catup for k in ["CABLE", "CHARGER", "ADAPTER"]):
        return {"category": "Accessories", "brand": firstword(name), "subcategory": "Charging", "leaf_category": "CHARGING"}
    if any(k in catup for k in ["GLASS", "SCREEN"]):
        return {"category": "Accessories", "brand": firstword(name), "subcategory": "Screen Protection", "leaf_category": "SCREEN PROTECTION"}
    if "COVER" in catup or "CASE" in catup:
        return {"category": "Accessories", "brand": firstword(name), "subcategory": "Cases", "leaf_category": "CASES"}
    return {"category": "Multi-Brand", "brand": firstword(name), "subcategory": "Multi-Brand", "leaf_category": "MULTI-BRAND"}


def clean_description(html: str) -> str:
    if not html:
        return ""
    text = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"\s*Add to Wishlist\s*", " ", text, flags=re.I)
    return re.sub(r"\s+", " ", text).strip()


# WooCommerce category names that are accessories/parts groups, not phone models.
GENERIC_MODEL_CATS = {
    "full glue glass",
    "privacy glass",
    "antishock cover",
    "flip cover",
    "ring cover",
    "magsafe cover",
    "design cover",
    "repair tools",
    "multi brand",
    "power banks",
    "mobile car support",
    "adapters",
    "headphones",
    "earphones",
    "speakers",
    "wireless headset",
    "lightning chargers",
    "type-c chargers",
    "micro-usb chargers",
    "wireless charger",
    "lightning cables",
    "type-c cables",
    "micro cables",
    "internet cables",
    "hdmi cables",
    "neck earphone",
    "microphone",
    "audio cable",
    "smartwatches",
    "smartwatch accessories",
    "original accessories",
    "hoco beauty care",
    "other hoco accessories",
    "i phone parts",
    "silicon soft jelly",
    "curved full glue glass",
    "camera lens 3-in-1",
    "camera lens complete",
    "smart watch glass",
    "accessories",
    "cards",
    "hoco",
    "50,000 mah",
    "camera lens",
    "tempered glass",
    "normal glass",
}


def is_model_category(name: str, count: int) -> bool:
    if count < 0:
        return False
    if name.strip().lower() in GENERIC_MODEL_CATS:
        return False
    b = phone_brand(name)
    if b != "Other":
        return True
    return bool(re.search(r"\d", name)) and len(name) >= 6
