"""Canonical Parts vs Accessories taxonomy. Strings come only from these enums."""
from __future__ import annotations

import re
from enum import Enum
from typing import Any


class TopCategory(str, Enum):
    PARTS = "parts"
    ACCESSORIES = "accessories"


class PartsSubcategory(str, Enum):
    SCREENS = "screens"
    BATTERIES = "batteries"
    CHARGING_PORTS = "charging-ports"
    HOUSING = "housing"
    CAMERAS = "cameras"
    SMALL_COMPONENTS = "small-components"


class AccessoriesSubcategory(str, Enum):
    CASES = "cases"
    SCREEN_PROTECTORS = "screen-protectors"
    CHARGERS_CABLES = "chargers-cables"
    AUDIO = "audio"
    HOLDERS = "holders"
    POWER_BANKS = "power-banks"


TOP_VALUES = frozenset(e.value for e in TopCategory)
PARTS_SUB_VALUES = frozenset(e.value for e in PartsSubcategory)
ACCESSORIES_SUB_VALUES = frozenset(e.value for e in AccessoriesSubcategory)

META_TOP = "_samphone_top"
META_SUB = "_samphone_sub"

# WooCommerce / seed labels that already mean consumer add-ons, not repair SKUs.
_GLASS_COVER_LEAVES = frozenset(
    {
        "full glue glass",
        "privacy glass",
        "normal glass",
        "camera lens 3-in-1",
        "camera lens complete",
        "curved full glue glass",
        "smart watch glass",
        "silicon soft jelly",
        "antishock cover",
        "flip cover",
        "ring cover",
        "magsafe cover",
        "design cover",
        "cases & glass",
    }
)

_PARTS_LEAVES = {
    "screen / lcd assembly": PartsSubcategory.SCREENS,
    "battery": PartsSubcategory.BATTERIES,
    "charging port flex": PartsSubcategory.CHARGING_PORTS,
    "back glass / cover": PartsSubcategory.HOUSING,
    "housing / frame": PartsSubcategory.HOUSING,
    "front camera": PartsSubcategory.CAMERAS,
    "rear camera": PartsSubcategory.CAMERAS,
    "camera lens": PartsSubcategory.CAMERAS,
    "speaker / earpiece": PartsSubcategory.SMALL_COMPONENTS,
    "fingerprint flex": PartsSubcategory.SMALL_COMPONENTS,
    "side buttons flex": PartsSubcategory.SMALL_COMPONENTS,
    "main flex": PartsSubcategory.SMALL_COMPONENTS,
    "vibrator motor": PartsSubcategory.SMALL_COMPONENTS,
    "sim tray": PartsSubcategory.SMALL_COMPONENTS,
    "sim reader": PartsSubcategory.SMALL_COMPONENTS,
    "antenna flex": PartsSubcategory.SMALL_COMPONENTS,
    "other part": PartsSubcategory.SMALL_COMPONENTS,
}

_ACCESSORY_LEAVES = {
    "full glue glass": AccessoriesSubcategory.SCREEN_PROTECTORS,
    "privacy glass": AccessoriesSubcategory.SCREEN_PROTECTORS,
    "normal glass": AccessoriesSubcategory.SCREEN_PROTECTORS,
    "curved full glue glass": AccessoriesSubcategory.SCREEN_PROTECTORS,
    "smart watch glass": AccessoriesSubcategory.SCREEN_PROTECTORS,
    "camera lens 3-in-1": AccessoriesSubcategory.SCREEN_PROTECTORS,
    "camera lens complete": AccessoriesSubcategory.SCREEN_PROTECTORS,
    "silicon soft jelly": AccessoriesSubcategory.CASES,
    "antishock cover": AccessoriesSubcategory.CASES,
    "flip cover": AccessoriesSubcategory.CASES,
    "ring cover": AccessoriesSubcategory.CASES,
    "magsafe cover": AccessoriesSubcategory.CASES,
    "design cover": AccessoriesSubcategory.CASES,
    "cases & glass": AccessoriesSubcategory.CASES,
    "adapters": AccessoriesSubcategory.CHARGERS_CABLES,
    "power banks": AccessoriesSubcategory.POWER_BANKS,
    "mobile car support": AccessoriesSubcategory.HOLDERS,
    "smartwatch accessories": AccessoriesSubcategory.HOLDERS,
    "repair tools": AccessoriesSubcategory.HOLDERS,
    "repairing tools": AccessoriesSubcategory.HOLDERS,
}

_AUDIO_ACCESSORY_RE = re.compile(
    r"bluetooth\s*speaker|bt\s*speaker|portable\s*speaker|\bsoundbar\b|"
    r"\bearphones?\b|\bheadset\b|\bearbuds\b|\btws\b|handsfree|neck earphone",
    re.I,
)
_HOUSING_RE = re.compile(
    r"back\s*glass|rear\s*glass|\bhousing\b|\bchassis\b|middle\s*frame|"
    r"back\s*cover\s*\+?\s*frame|back\s*cover.{0,48}(frame|magnet|wireless\s*flash|\bflash\b)|"
    r"(frame|magnet).{0,24}back\s*cover",
    re.I,
)
_CASE_RE = re.compile(
    r"soft\s*jelly|magsafe\s*(cover|case)|antishock|flip\s*cover|ring\s*cover|design\s*cover|"
    r"\bcase\b|\bcapa\b|\bcapinha\b|back\s*cover|rear\s*cover",
    re.I,
)
_GLASS_RE = re.compile(
    r"tempered\s*glass|privacy\s*glass|full\s*glue|curved\s*full\s*glue|"
    r"normal\s*glass|smart\s*watch\s*glass|screen\s*protect|pel[ií]cula",
    re.I,
)
_CHARGER_CABLE_RE = re.compile(
    r"\bcharger\b|\bcarregador\b|\badapter\b|\badaptador\b|power\s*bank|"
    r"usb[-\s]*c\s*cable|lightning\s*cable|data\s*cable|charging\s*cable|\bcable\b|\bcabo\b",
    re.I,
)
_HOLDER_RE = re.compile(r"\bholder\b|\bmount\b|car\s*support|popsocket", re.I)
_POWER_BANK_RE = re.compile(r"power\s*bank", re.I)
_PORT_FLEX_RE = re.compile(
    r"charging\s*(port|flex|board)|charge\s*flex|usb\s*flex|dock\s*flex|\bflex\b",
    re.I,
)
_SCREEN_RE = re.compile(r"\b(lcd|oled|incell|tft|digitizer|display|touch\s*\+|screen\s*assembly)\b", re.I)
_BATTERY_RE = re.compile(r"\bbattery\b", re.I)
_CAMERA_RE = re.compile(r"front\s*camera|rear\s*camera|back\s*camera|camera\s*module|\bcamera\s*lens\b", re.I)
_SMALL_RE = re.compile(
    r"earpiece|ear[\s-]*speaker|loud[\s-]*speaker|\bspeaker\b|buzzer|ringer|"
    r"vibrat(?:or|er|ion)|taptic|sim\s*tray|sim\s*reader|fingerprint|"
    r"side\s*button|antenna|\bmic\b|microphone|proximity",
    re.I,
)
_LENS_ADDON_RE = re.compile(r"3[\s-]*in[\s-]*1|lens\s*complete|camera\s*lens\s*complete", re.I)


def validate_taxonomy(top: str, sub: str) -> None:
    if top not in TOP_VALUES:
        raise ValueError(f"Invalid top-level category: {top!r}")
    if top == TopCategory.PARTS.value and sub not in PARTS_SUB_VALUES:
        raise ValueError(f"Invalid Parts subcategory: {sub!r}")
    if top == TopCategory.ACCESSORIES.value and sub not in ACCESSORIES_SUB_VALUES:
        raise ValueError(f"Invalid Accessories subcategory: {sub!r}")


def current_seed_top(category: str | None) -> str | None:
    cat = (category or "").strip()
    if not cat:
        return None
    if cat == "Phone Parts":
        return TopCategory.PARTS.value
    return TopCategory.ACCESSORIES.value


def assign_taxonomy(
    *,
    title: str = "",
    leaf: str = "",
    part_type: str = "",
    category: str = "",
    wc_categories: list[str] | None = None,
) -> dict[str, Any]:
    """
    Decide Parts vs Accessories from title + existing Woo/seed labels.
    Does not write to the database.
    """
    name = title or ""
    hay = " ".join(
        [name, leaf, part_type, category, " ".join(wc_categories or [])]
    ).strip()
    leaf_l = (leaf or part_type or "").strip().lower()
    ambiguous = False
    reason = "title"

    if _POWER_BANK_RE.search(name):
        top, sub, reason = TopCategory.ACCESSORIES, AccessoriesSubcategory.POWER_BANKS, "power-bank"
    elif _AUDIO_ACCESSORY_RE.search(name) and not re.search(
        r"ear[\s-]*speaker|earpiece|loud[\s-]*speaker", name, re.I
    ):
        top, sub, reason = TopCategory.ACCESSORIES, AccessoriesSubcategory.AUDIO, "audio-accessory"
    elif _GLASS_RE.search(name) and not _SCREEN_RE.search(name):
        top, sub, reason = TopCategory.ACCESSORIES, AccessoriesSubcategory.SCREEN_PROTECTORS, "screen-protector"
    elif _LENS_ADDON_RE.search(name):
        top, sub, reason = TopCategory.ACCESSORIES, AccessoriesSubcategory.SCREEN_PROTECTORS, "lens-addon"
    elif _HOUSING_RE.search(name):
        top, sub, reason = TopCategory.PARTS, PartsSubcategory.HOUSING, "housing"
    elif _CASE_RE.search(name) and not _SCREEN_RE.search(name):
        top, sub, reason = TopCategory.ACCESSORIES, AccessoriesSubcategory.CASES, "case-cover"
    elif _HOLDER_RE.search(name) and not _PORT_FLEX_RE.search(name):
        top, sub, reason = TopCategory.ACCESSORIES, AccessoriesSubcategory.HOLDERS, "holder"
    elif _CHARGER_CABLE_RE.search(name) and not _PORT_FLEX_RE.search(name) and not _BATTERY_RE.search(name):
        top, sub, reason = TopCategory.ACCESSORIES, AccessoriesSubcategory.CHARGERS_CABLES, "charger-cable"
    elif leaf_l in _ACCESSORY_LEAVES:
        top, sub, reason = TopCategory.ACCESSORIES, _ACCESSORY_LEAVES[leaf_l], "leaf-accessory"
    elif leaf_l in _GLASS_COVER_LEAVES:
        top, sub, reason = TopCategory.ACCESSORIES, AccessoriesSubcategory.CASES, "glass-cover-leaf"
    elif _SCREEN_RE.search(name) and not _GLASS_RE.search(name):
        top, sub, reason = TopCategory.PARTS, PartsSubcategory.SCREENS, "screen"
    elif _BATTERY_RE.search(name) and not _POWER_BANK_RE.search(name):
        top, sub, reason = TopCategory.PARTS, PartsSubcategory.BATTERIES, "battery"
    elif _PORT_FLEX_RE.search(name) and not _CHARGER_CABLE_RE.search(name):
        top, sub, reason = TopCategory.PARTS, PartsSubcategory.CHARGING_PORTS, "charging-port-flex"
        if _CHARGER_CABLE_RE.search(name):
            ambiguous = True
    elif _CHARGER_CABLE_RE.search(name) and _PORT_FLEX_RE.search(name):
        top, sub, reason = TopCategory.PARTS, PartsSubcategory.CHARGING_PORTS, "flex-over-cable"
        ambiguous = True
    elif _CAMERA_RE.search(name) and not _LENS_ADDON_RE.search(name):
        top, sub, reason = TopCategory.PARTS, PartsSubcategory.CAMERAS, "camera"
    elif _SMALL_RE.search(name) and not _AUDIO_ACCESSORY_RE.search(name):
        top, sub, reason = TopCategory.PARTS, PartsSubcategory.SMALL_COMPONENTS, "small-part"
    elif leaf_l in _PARTS_LEAVES:
        top, sub, reason = TopCategory.PARTS, _PARTS_LEAVES[leaf_l], "leaf-part"
    elif (category or "").strip() == "Phone Parts":
        top, sub, reason = TopCategory.PARTS, PartsSubcategory.SMALL_COMPONENTS, "seed-phone-parts"
        ambiguous = True
    else:
        top, sub, reason = TopCategory.ACCESSORIES, AccessoriesSubcategory.HOLDERS, "fallback-accessories"
        ambiguous = True

    validate_taxonomy(top.value, sub.value)
    stored = current_seed_top(category)
    return {
        "top": top.value,
        "sub": sub.value,
        "reason": reason,
        "ambiguous": ambiguous,
        "stored_top": stored,
        "mismatch": stored is not None and stored != top.value,
        "missing_stored": stored is None,
        "title": name,
        "hay": hay[:200],
    }


def api_category_for_top(top: str) -> str:
    return "Phone Parts" if top == TopCategory.PARTS.value else "Accessories"
