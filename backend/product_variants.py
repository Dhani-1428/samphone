"""Extract color variants from WooCommerce product attributes and variations."""
from __future__ import annotations

import hashlib
import re
from typing import Any

COLOR_HEX: dict[str, str] = {
    "black": "#1a1a1a",
    "preto": "#1a1a1a",
    "white": "#f5f5f5",
    "branco": "#f5f5f5",
    "red": "#e53935",
    "vermelho": "#e53935",
    "blue": "#2196f3",
    "azul": "#2196f3",
    "green": "#4caf50",
    "verde": "#4caf50",
    "yellow": "#fdd835",
    "amarelo": "#fdd835",
    "orange": "#ff9800",
    "laranja": "#ff9800",
    "pink": "#f48fb1",
    "rosa": "#f48fb1",
    "purple": "#9c27b0",
    "roxo": "#9c27b0",
    "violet": "#7e57c2",
    "lavender": "#b57edc",
    "brown": "#795548",
    "castanho": "#795548",
    "marrom": "#795548",
    "grey": "#9e9e9e",
    "gray": "#9e9e9e",
    "cinza": "#9e9e9e",
    "silver": "#c0c0c0",
    "prata": "#c0c0c0",
    "gold": "#d4af37",
    "dourado": "#d4af37",
    "beige": "#e8dcc8",
    "bege": "#e8dcc8",
    "cream": "#f5f0e1",
    "creme": "#f5f0e1",
    "navy": "#1a237e",
    "azul-marinho": "#1a237e",
    "turquoise": "#26c6da",
    "turquesa": "#26c6da",
    "mint": "#a5d6a7",
    "coral": "#ff7043",
    "burgundy": "#880e4f",
    "bordeaux": "#880e4f",
    "transparent": "#e8e8e8",
    "clear": "#e8e8e8",
    "multicolor": "#bdbdbd",
    "multicolour": "#bdbdbd",
}


def _normalize_label(label: str) -> str:
    return re.sub(r"\s+", " ", (label or "").strip())


def color_hex_for_label(label: str) -> str:
    raw = _normalize_label(label)
    if not raw:
        return "#bdbdbd"
    key = raw.lower()
    if key in COLOR_HEX:
        return COLOR_HEX[key]
    for token in re.split(r"[\s/\-_,]+", key):
        if token in COLOR_HEX:
            return COLOR_HEX[token]
    digest = hashlib.md5(key.encode("utf-8")).hexdigest()
    return f"#{digest[:6]}"


def _is_color_attribute(name: str, slug: str = "") -> bool:
    n = (name or "").strip().lower()
    s = (slug or "").strip().lower()
    if s in {
        "pa_color",
        "pa_cor",
        "pa_colour",
        "pa_cores",
        "color",
        "colour",
        "colors",
        "cores",
        "cor",
        "choose-color",
        "choose_color",
        "attribute_color",
        "attribute_colours",
    }:
        return True
    if s.startswith("pa_color") or s.startswith("attribute_color") or s.startswith("attribute_cor"):
        return True
    if "choose" in s and "color" in s:
        return True
    compact = re.sub(r"[^a-z]", "", n)
    return any(token in compact for token in ("color", "colour", "cor", "cores"))


def parse_product_attributes_meta(raw: str | None) -> list[dict[str, Any]]:
    """Parse WooCommerce `_product_attributes` PHP-serialized meta into REST-like attrs."""
    text = raw or ""
    if not text:
        return []
    names = re.findall(r's:4:"name";s:\d+:"([^"]+)"', text)
    values = re.findall(r's:5:"value";s:\d+:"([^"]*)"', text)
    out: list[dict[str, Any]] = []
    for name, value in zip(names, values):
        options = [_normalize_label(part) for part in str(value).split("|") if _normalize_label(part)]
        slug = re.sub(r"[^a-z0-9]+", "-", (name or "").lower()).strip("-")
        out.append({"name": name, "slug": slug, "options": options})
    return out


def attributes_from_pa_terms(terms: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Group product attribute taxonomy terms (pa_*) into REST-like attributes."""
    by_tax: dict[str, dict[str, Any]] = {}
    for term in terms or []:
        tax = str(term.get("taxonomy") or "")
        if not tax.startswith("pa_"):
            continue
        bucket = by_tax.setdefault(
            tax,
            {
                "name": tax.replace("pa_", "").replace("-", " ").title(),
                "slug": tax,
                "options": [],
            },
        )
        label = _normalize_label(str(term.get("name") or ""))
        if label and label not in bucket["options"]:
            bucket["options"].append(label)
    return list(by_tax.values())


def _variant_image_url(raw: Any) -> str:
    u = ""
    if isinstance(raw, str):
        u = raw.strip()
    elif isinstance(raw, dict):
        u = str(raw.get("src") or raw.get("url") or "").strip()
    if not u:
        return ""
    if u.startswith("//"):
        u = "https:" + u
    u = re.sub(r"^http://", "https://", u, flags=re.I)
    u = re.sub(r"^https://samphone\.pt/", "https://www.samphone.pt/", u, flags=re.I)
    return u


def extract_color_variants(row: dict[str, Any], variations: list[dict[str, Any]] | None = None) -> list[dict[str, Any]]:
    by_label: dict[str, dict[str, Any]] = {}

    def upsert(label: str) -> dict[str, Any]:
        text = _normalize_label(label)
        key = re.sub(r"[^a-z0-9]+", "", text.lower())
        if not key:
            return {}
        prev = by_label.get(key)
        if prev:
            return prev
        entry = {"label": text, "color": color_hex_for_label(text)}
        by_label[key] = entry
        return entry

    for attr in row.get("attributes") or []:
        if not _is_color_attribute(str(attr.get("name") or ""), str(attr.get("slug") or "")):
            continue
        for opt in attr.get("options") or []:
            upsert(str(opt))

    if variations:
        for var in variations:
            for attr in var.get("attributes") or []:
                if not _is_color_attribute(str(attr.get("name") or ""), str(attr.get("slug") or "")):
                    continue
                entry = upsert(str(attr.get("option") or ""))
                if not entry:
                    continue
                img = _variant_image_url(var.get("image"))
                if img:
                    entry["image"] = img
                if var.get("id"):
                    try:
                        entry["wc_variation_id"] = int(var["id"])
                    except (TypeError, ValueError):
                        pass
                entry["in_stock"] = str(var.get("stock_status") or "").lower() == "instock"

    gallery: list[str] = []
    for img in row.get("images") or []:
        src = _variant_image_url(img)
        if src and src not in gallery:
            gallery.append(src)
    if gallery:
        for i, entry in enumerate(by_label.values()):
            if entry.get("image"):
                continue
            label_key = re.sub(r"[^a-z0-9]+", "", entry["label"].lower())
            named = next(
                (
                    u
                    for u in gallery
                    if label_key and len(label_key) >= 3 and label_key in re.sub(r"[^a-z0-9]+", "", u.lower())
                ),
                None,
            )
            if named:
                entry["image"] = named
            elif i < len(gallery):
                entry["image"] = gallery[i]

    return list(by_label.values())


# Extra multi-word / catalog color labels beyond COLOR_HEX keys.
_EXTRA_COLOR_LABELS = (
    "sea green",
    "pista green",
    "light pink",
    "light purple",
    "baby pink",
    "dark purple",
    "deep blue",
    "cosmic orange",
    "desert titanium",
    "natural titanium",
    "white titanium",
    "black titanium",
    "space black",
    "midnight",
    "starlight",
    "sierra blue",
    "alpine green",
    "graphite",
)

_COLOR_LABELS_SORTED: tuple[str, ...] = tuple(
    sorted(
        {*(COLOR_HEX.keys()), *_EXTRA_COLOR_LABELS},
        key=len,
        reverse=True,
    )
)

_COVER_TITLE_HINTS = (
    "soft jelly",
    "magsafe",
    "mag safe",
    "antishock",
    "anti shock",
    "flip cover",
    "ring cover",
    "design cover",
)

_COVER_LEAF_HINTS = frozenset(
    {
        "silicon soft jelly",
        "magsafe cover",
        "magsafe cover",
        "antishock cover",
        "flip cover",
        "ring cover",
        "design cover",
    }
)


def is_known_color_label(label: str) -> bool:
    raw = _normalize_label(label).lower()
    if not raw:
        return False
    if raw in COLOR_HEX or raw in {c.lower() for c in _EXTRA_COLOR_LABELS}:
        return True
    # Single-token colors already covered; allow "Light Pink" style via sorted labels.
    return any(raw == c for c in _COLOR_LABELS_SORTED)


def normalize_cover_base_key(title: str) -> str:
    t = (title or "").lower()
    t = t.replace("silicone", "silicon")
    t = t.replace("mag safe", "magsafe")
    t = re.sub(r"[^a-z0-9]+", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def split_title_color(title: str) -> tuple[str, str | None]:
    """
    Split \"IPHONE 11 SOFT JELLY - Red\" or \"… MAGSAFE COVER Transparent\"
    into (base_title, color_label).
    """
    raw = _normalize_label(title)
    if not raw:
        return "", None

    # Pattern: BASE - Color
    if " - " in raw:
        base, color = raw.rsplit(" - ", 1)
        color = _normalize_label(color)
        if base and color and is_known_color_label(color):
            return base.strip(), color

    low = raw.lower()
    for color in _COLOR_LABELS_SORTED:
        suffix = f" {color}"
        if low.endswith(suffix):
            base = raw[: -len(color)].rstrip(" -–—\t")
            if base and len(base) >= 8:
                # Title-case label for display; keep known spelling from catalog when possible.
                # Prefer canonical display: Black, Sea Green, Transparent.
                label = " ".join(part.capitalize() for part in color.split())
                return base.strip(), label
    return raw, None


def is_color_cover_product(product: dict[str, Any]) -> bool:
    title = (product.get("title") or "").lower()
    leaf = (product.get("leaf_category") or product.get("part_type") or "").strip().lower()
    if leaf in _COVER_LEAF_HINTS:
        return True
    return any(h in title for h in _COVER_TITLE_HINTS)


def _product_image(product: dict[str, Any]) -> str:
    img = (product.get("image") or "").strip()
    if img:
        return img
    images = product.get("images") or []
    if images:
        return str(images[0] or "").strip()
    return ""


def _variant_rank(product: dict[str, Any]) -> tuple[int, int, int, int]:
    """Higher is better when choosing the group parent card."""
    cvs = product.get("color_variants") or []
    with_img = sum(1 for v in cvs if v.get("image"))
    ptype = str(product.get("product_type") or "").lower()
    is_variable = 1 if ptype == "variable" else 0
    has_img = 1 if _product_image(product) else 0
    return (with_img, is_variable, len(cvs), has_img)


def _merge_cover_color_group(
    members: list[tuple[dict[str, Any], str | None]],
) -> dict[str, Any]:
    # Prefer parent with real variation images, then variable type, then more colors.
    ranked = sorted(
        members,
        key=lambda mc: (
            0 if mc[1] is None else 1,
            -_variant_rank(mc[0])[0],
            -_variant_rank(mc[0])[1],
            -_variant_rank(mc[0])[2],
            -_variant_rank(mc[0])[3],
        ),
    )
    parent, parent_color = ranked[0]
    out = dict(parent)

    base_title, _ = split_title_color(str(parent.get("title") or ""))
    out["title"] = base_title or out.get("title")

    by_label: dict[str, dict[str, Any]] = {}

    def upsert_variant(entry: dict[str, Any]) -> None:
        label = _normalize_label(str(entry.get("label") or ""))
        if not label:
            return
        key = label.lower()
        prev = by_label.get(key) or {
            "label": label,
            "color": color_hex_for_label(label),
        }
        if entry.get("image") and (
            not prev.get("image") or entry.get("wc_variation_id") or entry.get("wc_product_id")
        ):
            prev["image"] = entry["image"]
        if entry.get("wc_variation_id") and not prev.get("wc_variation_id"):
            prev["wc_variation_id"] = entry["wc_variation_id"]
        if entry.get("wc_product_id") and not prev.get("wc_product_id"):
            prev["wc_product_id"] = entry["wc_product_id"]
        if entry.get("in_stock") is not None:
            prev["in_stock"] = bool(entry.get("in_stock"))
        prev["label"] = prev.get("label") or label
        prev["color"] = prev.get("color") or color_hex_for_label(label)
        by_label[key] = prev

    # SKU photos from titles first so MagSafe Black/Blue/Purple keep their own shots.
    for prod, color in members:
        if not color:
            continue
        label = _normalize_label(color)
        entry: dict[str, Any] = {
            "label": label,
            "color": color_hex_for_label(label),
        }
        img = _product_image(prod)
        if img:
            entry["image"] = img
        try:
            wid = int(prod.get("wc_id") or 0)
        except (TypeError, ValueError):
            wid = 0
        if wid:
            entry["wc_product_id"] = wid
        if prod.get("in_stock") is not None:
            entry["in_stock"] = bool(prod.get("in_stock"))
        upsert_variant(entry)

    for prod, _color in members:
        for v in prod.get("color_variants") or []:
            upsert_variant(dict(v))

    variants = list(by_label.values())
    if variants:
        out["color_variants"] = variants
        out["variants"] = [v["label"] for v in variants]
        urls: list[str] = []
        for v in variants:
            u = str(v.get("image") or "").strip()
            if u and u not in urls:
                urls.append(u)
        if urls:
            parent_imgs = [str(u) for u in (out.get("images") or []) if u and str(u) not in urls]
            out["images"] = urls + parent_imgs
            out["image"] = urls[0]
    return out


def collapse_color_variant_products(products: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    One card per model for Soft Jelly / MagSafe (etc.): merge color SKUs into
    color_variants with dots + per-color images. Removes duplicate color cards.
    """
    if not products:
        return products

    groups: dict[str, list[tuple[dict[str, Any], str | None]]] = {}
    order: list[str] = []
    passthrough: list[dict[str, Any]] = []

    for product in products:
        if not is_color_cover_product(product):
            passthrough.append(product)
            continue
        title = str(product.get("title") or "")
        base, color = split_title_color(title)
        key = normalize_cover_base_key(base or title)
        if not key:
            passthrough.append(product)
            continue
        if key not in groups:
            order.append(key)
            groups[key] = []
        groups[key].append((product, color))

    collapsed_by_key = {k: _merge_cover_color_group(groups[k]) for k in order}
    if not passthrough:
        return [collapsed_by_key[k] for k in order]

    # Rebuild using original sequence: first time we see a cover base key → collapsed card.
    seen_keys: set[str] = set()
    out: list[dict[str, Any]] = []
    for product in products:
        if not is_color_cover_product(product):
            out.append(product)
            continue
        title = str(product.get("title") or "")
        base, _color = split_title_color(title)
        key = normalize_cover_base_key(base or title)
        if key in seen_keys:
            continue
        seen_keys.add(key)
        out.append(collapsed_by_key[key])
    return out


def merge_sibling_color_variants(primary: dict[str, Any], siblings: list[dict[str, Any]]) -> dict[str, Any]:
    """Keep the PDP product id, but attach per-color images from sibling cover SKUs."""
    if not primary:
        return primary
    title = str(primary.get("title") or "")
    base, _color = split_title_color(title)
    want = normalize_cover_base_key(base or title)
    pool: list[dict[str, Any]] = [primary]
    seen = {int(primary.get("wc_id") or 0)}
    for product in siblings or []:
        other_title = str(product.get("title") or "")
        other_base, _ = split_title_color(other_title)
        other_key = normalize_cover_base_key(other_base or other_title)
        if want and other_key != want:
            continue
        wid = 0
        try:
            wid = int(product.get("wc_id") or 0)
        except (TypeError, ValueError):
            wid = 0
        if wid and wid in seen:
            continue
        if wid:
            seen.add(wid)
        pool.append(product)
    collapsed = collapse_color_variant_products(pool)
    match = primary
    for product in collapsed:
        other_title = str(product.get("title") or "")
        other_base, _ = split_title_color(other_title)
        if normalize_cover_base_key(other_base or other_title) == want:
            match = product
            break
        try:
            if int(product.get("wc_id") or 0) == int(primary.get("wc_id") or 0):
                match = product
                break
        except (TypeError, ValueError):
            pass
    out = dict(primary)
    variants = list(match.get("color_variants") or [])
    if not variants:
        return out
    out["color_variants"] = variants
    out["variants"] = [str(v.get("label") or "") for v in variants if v.get("label")]
    images = [str(u) for u in (out.get("images") or []) if u]
    for variant in variants:
        url = str(variant.get("image") or "").strip()
        if url and url not in images:
            images.append(url)
    if images:
        out["images"] = images
        if not out.get("image"):
            out["image"] = images[0]
    return out
