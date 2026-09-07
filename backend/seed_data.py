import json
from pathlib import Path

_ROOT = Path(__file__).parent

# Full catalog generated from the live samphone.pt WooCommerce store
# (see _scrape/gen_seed.py). Each product carries: id, title, category, brand,
# subcategory, model, part_type, price, image, images, best_seller, new_arrival,
# rating, reviews, description, specs, variants, in_stock.
_PRODUCTS_PATH = _ROOT / "products_seed.json"
if _PRODUCTS_PATH.exists():
    with open(_PRODUCTS_PATH, "r", encoding="utf-8") as _f:
        try:
            PRODUCTS = json.load(_f)
        except json.JSONDecodeError as exc:
            import logging

            logging.getLogger(__name__).error("products_seed.json invalid (%s) — using empty seed", exc)
            PRODUCTS = []
else:
    PRODUCTS = []

_MODELS_PATH = _ROOT / "_scrape" / "models_catalog.json"
if not _MODELS_PATH.exists():
    _MODELS_PATH = _ROOT / "models_catalog.json"
MODELS = json.load(open(_MODELS_PATH, encoding="utf-8")) if _MODELS_PATH.exists() else []

# Homepage promo banners — same files/order as samphone.pt Elementor carousel
_SITE_UPLOADS = "https://www.samphone.pt/wp-content/uploads/"
BANNERS = [
    _SITE_UPLOADS + "2026/08/banner-1.png",
    _SITE_UPLOADS + "2026/08/ban-2.png",
    _SITE_UPLOADS + "2026/08/ban-3.png",
    _SITE_UPLOADS + "2026/07/BAN-2.png",
    _SITE_UPLOADS + "2026/06/BAN-B2.png",
]
