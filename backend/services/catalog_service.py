"""Catalog service — MySQL WooCommerce products as the app catalog source of truth."""
from __future__ import annotations

import logging
import time
import uuid
from typing import Any, Optional

from catalog_db import get_catalog_db
from catalog_pagination import clamp_page, product_page
from catalog_sort import sort_products
from repositories.product_repository import get_product_repository
from stock import UNMANAGED_IN_STOCK_QTY, normalize_stock
from wholesale import (
    can_see_business_pricing,
    enrich_product_pricing,
    is_accessory_for_public_pricing,
    map_public_retail_price,
    sanitize_products,
)
from woocommerce_classify import classify, clean_description, nice, phone_brand

logger = logging.getLogger(__name__)

# Home screen category rows: (key, title, see-all group, filter kwargs)
HOME_RAIL_SECTIONS: tuple[tuple[str, str, str, dict[str, str]], ...] = (
    ("repair-tools", "Repair Tools", "Repairing Tools", {"category_group": "Repairing Tools"}),
    ("memory-cards", "Memory Cards", "Cards", {"category_group": "Cards"}),
    ("adapters", "Adapters", "Chargers", {"leaf_category": "Adapters"}),
    ("car-support", "Mobile Car Support", "Mobile Car", {"category_group": "Mobile Car"}),
    ("magsafe-covers", "MagSafe Covers", "Original Accessories", {"q": "magsafe"}),
    ("wireless-headsets", "Wireless Headsets", "Headphones", {"category_group": "Headphones"}),
    ("power-bank", "Power Bank", "Powerbanks", {"category_group": "Powerbanks"}),
    ("cables", "Cables", "Cables", {"category_group": "Cables"}),
    ("screen-protectors", "Screen Protectors", "Original Accessories", {"q": "tempered glass"}),
    ("phone-cases", "Phone Cases", "Original Accessories", {"q": "phone case"}),
    ("chargers", "Chargers", "Chargers", {"category_group": "Chargers"}),
)

_PREVIEW_KEYS = (
    "id",
    "wc_id",
    "slug",
    "title",
    "category",
    "brand",
    "subcategory",
    "model",
    "model_wc_id",
    "part_type",
    "leaf_category",
    "sku",
    "price",
    "regularPrice",
    "salePrice",
    "on_sale",
    "wholesalePrice",
    "b2b_price",
    "b2c_price",
    "retailPrice",
    "compareAtPrice",
    "image",
    "images",
    "best_seller",
    "new_arrival",
    "rating",
    "reviews",
    "in_stock",
    "stock_quantity",
    "permalink",
    "created_at",
)


def _preview_product(product: dict) -> dict:
    """Drop descriptions/attributes so Home rails stay small."""
    out = {k: product.get(k) for k in _PREVIEW_KEYS if k in product}
    images = product.get("images") or []
    if isinstance(images, list) and images:
        out["images"] = [images[0]]
        out.setdefault("image", images[0])
    elif product.get("image"):
        out["image"] = product.get("image")
        out["images"] = [product.get("image")]
    return out


def _stable_id(wc_id: int) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"samphone:{int(wc_id)}"))


def _parse_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None or value == "":
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _parse_int(value: Any, default: int = 0) -> int:
    try:
        if value is None or value == "":
            return default
        return int(float(value))
    except (TypeError, ValueError):
        return default


def _iso_dt(value: Any) -> str | None:
    if value is None or value == "":
        return None
    try:
        from datetime import datetime, timezone

        if isinstance(value, datetime):
            dt = value if value.tzinfo else value.replace(tzinfo=timezone.utc)
            return dt.isoformat()
        raw = str(value).strip()
        if not raw or raw.startswith("0000"):
            return None
        return raw
    except Exception:
        return None


def _is_new_arrival(created_at: Any, *, days: int = 365) -> bool:
    """True when the product is recent. Missing dates stay eligible so just-added items are not dropped."""
    if created_at is None or created_at == "":
        return True
    try:
        from datetime import datetime, timedelta, timezone

        if isinstance(created_at, datetime):
            dt = created_at
        else:
            raw = str(created_at).strip().replace("Z", "+00:00")
            if " " in raw and "T" not in raw:
                raw = raw.replace(" ", "T", 1)
            dt = datetime.fromisoformat(raw[:19])
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt >= now - timedelta(days=days)
    except Exception:
        return True


class CatalogService:
    """Drop-in replacement for WooCommerce REST catalog methods used by server.py."""

    def __init__(self) -> None:
        self.repo = get_product_repository()
        self.db = get_catalog_db()
        self._models_cache: tuple[float, list[dict], dict[int, dict]] | None = None
        self._markup_cache: tuple[float, float] | None = None

    def _default_markup(self) -> float:
        now = time.time()
        if self._markup_cache and now - self._markup_cache[0] < 600:
            return self._markup_cache[1]
        value = self.repo.get_default_markup()
        self._markup_cache = (now, value)
        return value

    def configured(self) -> bool:
        return self.db.configured()

    def health(self) -> dict[str, Any]:
        return self.db.health()

    def warm_catalog(self) -> dict[str, Any]:
        started = time.time()
        self.db.ensure_app_tables()
        # Warm cheap caches so first product request does not open extra sockets.
        try:
            self._default_markup()
            self.repo.site_url()
            self._load_models()
            indexed = self.repo.warm_uuid_index()
            logger.info("Catalog uuid index warmed: %s products", indexed)
        except Exception as exc:
            logger.warning("Catalog warm cache skipped: %s", exc)
        vocab_info: dict[str, Any] = {}
        try:
            from catalog_vocab import load_catalog_vocab

            vocab = load_catalog_vocab(force=True)
            vocab_info = dict(vocab.source_counts)
            logger.info("Voice search trained on catalog vocab: %s", vocab_info)
        except Exception as exc:
            logger.warning("Catalog voice vocab warm skipped: %s", exc)
        h = self.health()
        return {
            "ok": bool(h.get("ok")),
            "products": h.get("published_products") or 0,
            "load_ms": int((time.time() - started) * 1000),
            "source": "catalog_mysql",
            "hint": h.get("hint"),
            "error": h.get("error"),
            "voice_vocab": vocab_info,
        }

    def stats(self) -> dict[str, Any]:
        h = self.health()
        cats = self.repo.list_categories()
        models, _ = self._load_models()
        return {
            "published_products": h.get("published_products") or 0,
            "product_categories": len(cats),
            "phone_models": len(models),
            "catalog_cached": h.get("published_products") or 0,
            "source": "catalog_mysql",
        }

    def admin_stats(self) -> dict[str, Any]:
        counts = self.repo.dashboard_counts()
        h = self.health()
        return {
            "total_products": counts.get("total_products") or h.get("published_products") or 0,
            "low_stock": counts.get("low_stock") or 0,
            "out_of_stock": counts.get("out_of_stock") or 0,
            "published_products": h.get("published_products") or 0,
            "source": "catalog_mysql",
        }

    def _load_models(self) -> tuple[list[dict], dict[int, dict]]:
        now = time.time()
        if self._models_cache and now - self._models_cache[0] < 3600:
            return self._models_cache[1], self._models_cache[2]
        # Prefer disk models cache used by the REST layer if present.
        try:
            from pathlib import Path
            import json

            for path in (
                Path(__file__).resolve().parent.parent / "models_cache.json",
                Path(__file__).resolve().parent.parent / "_scrape" / "models_catalog.json",
            ):
                if not path.is_file():
                    continue
                raw = json.loads(path.read_text(encoding="utf-8"))
                if not isinstance(raw, list) or not raw:
                    continue
                models = []
                model_ids: dict[int, dict] = {}
                for row in raw:
                    entry = dict(row)
                    entry["wc_id"] = int(entry["wc_id"])
                    entry["count"] = int(entry.get("count") or 0)
                    models.append(entry)
                    model_ids[entry["wc_id"]] = entry
                models.sort(key=lambda m: (m.get("brand", ""), m.get("name", "")))
                self._models_cache = (now, models, model_ids)
                return models, model_ids
        except Exception as exc:
            logger.warning("Could not load models cache: %s", exc)

        # Fallback: leaf product_cat terms with moderate counts as models
        cats = self.repo.list_categories()
        models = []
        model_ids: dict[int, dict] = {}
        for c in cats:
            if c["parent"] and 1 <= c["count"] <= 500:
                brand = phone_brand(c["name"])
                entry = {
                    "wc_id": c["wc_id"],
                    "name": c["name"],
                    "slug": c["slug"],
                    "brand": brand,
                    "count": c["count"],
                }
                models.append(entry)
                model_ids[c["wc_id"]] = entry
        self._models_cache = (now, models, model_ids)
        return models, model_ids

    def brand_models(self, brand: str) -> list[dict]:
        models, _ = self._load_models()
        b = (brand or "").strip().lower()
        if not b or b == "all":
            return models
        return [m for m in models if (m.get("brand") or "").strip().lower() == b]

    def _row_to_product(self, row: dict, model_ids: dict[int, dict], *, include_description: bool = False) -> Optional[dict]:
        wc_id = int(row["wc_id"])
        title_raw = (row.get("title") or "").strip()
        if not title_raw:
            return None

        categories = row.get("categories") or []
        cat_names = [c.get("name") or "" for c in categories]
        meta_cls = classify(title_raw, cat_names)

        model_name = ""
        model_wc_id = None
        for c in categories:
            cid = int(c.get("wc_id") or 0)
            if cid in model_ids:
                model_name = model_ids[cid]["name"]
                model_wc_id = cid
                break

        brand = meta_cls.get("brand") or phone_brand(title_raw)
        if brand == "Other" and model_name and model_wc_id:
            brand = model_ids[model_wc_id]["brand"]
        if brand == "Other":
            brand = phone_brand(" ".join(cat_names))

        # B2B source of truth = WooCommerce _price / wholesale meta
        ww = (row.get("wholesale_customer_wholesale_price") or "").strip()
        b2b = _parse_float(ww) if ww else 0.0
        if b2b <= 0:
            b2b = _parse_float(row.get("price"))
        if b2b <= 0:
            b2b = _parse_float(row.get("regular_price"))

        regular = _parse_float(row.get("regular_price"), b2b)
        sale = _parse_float(row.get("sale_price"), 0.0) or None
        on_sale = bool(sale and sale > 0 and sale < regular)

        # B2C (public): live accessory bands by default.
        # Do not trust stored_public_price — it goes stale when bands change.
        # Do not treat sync-filled b2c_price (== public_price) as an admin override.
        override_b2c = row.get("override_b2c_price")
        stored_public = row.get("stored_public_price")
        override_markup = row.get("override_markup")
        pricing_hint = {
            "category": meta_cls.get("category", "Multi-Brand"),
            "part_type": meta_cls.get("part_type", ""),
            "leaf_category": meta_cls.get("leaf_category", ""),
        }
        b2c_override = False
        manual_b2c = None
        if override_b2c is not None and str(override_b2c).strip() != "":
            try:
                ov = float(override_b2c)
            except (TypeError, ValueError):
                ov = 0.0
            if ov > 0:
                sp = None
                if stored_public is not None and str(stored_public).strip() != "":
                    try:
                        sp = float(stored_public)
                    except (TypeError, ValueError):
                        sp = None
                # Honor admin override only when it clearly differs from the band cache.
                # Sync used to copy public→b2c (equal values) and locked stale prices.
                # Orphan b2c-only rows are also ignored so bands always apply.
                if sp is not None and abs(ov - sp) >= 0.005:
                    manual_b2c = round(ov, 2)
                    b2c_override = True
        if b2c_override and manual_b2c is not None:
            b2c = manual_b2c
        else:
            markup = float(override_markup) if override_markup not in (None, "") else None
            if markup is None:
                markup = self._default_markup()
            if markup and markup != 1.0:
                b2c = round(b2b * float(markup), 2)
            else:
                b2c = map_public_retail_price(b2b, pricing_hint)
        manage = str(row.get("manage_stock") or "").lower() in {"yes", "1", "true"}
        stock_status = str(row.get("stock_status") or "instock").lower()
        if manage:
            qty = max(0, _parse_int(row.get("stock")))
            in_stock = qty > 0
        else:
            qty = UNMANAGED_IN_STOCK_QTY if stock_status == "instock" else 0
            in_stock = stock_status == "instock"

        images = [u for u in (row.get("image_urls") or []) if u]
        if not images:
            images = [f"{self.repo.site_url()}/wp-content/uploads/woocommerce-placeholder.png"]
        override_img = str(row.get("override_image_url") or "").strip()
        if override_img:
            images = [override_img] + [u for u in images if u != override_img]

        from product_variants import extract_color_variants

        color_variants = extract_color_variants(
            {
                "attributes": row.get("attributes") or [],
                "images": [{"src": u} for u in images],
            },
            row.get("variations") or None,
        )
        variant_labels = [v["label"] for v in color_variants]

        title = nice(title_raw)
        description = ""
        if include_description:
            content = row.get("description") or row.get("short_description") or ""
            description = clean_description(content) or f"{title} — available at Samphone, Lisboa."

        compare_at = None
        raw_compare = row.get("override_compare_at")
        if raw_compare is not None and str(raw_compare).strip() != "":
            try:
                ca = float(raw_compare)
                if ca > 0:
                    compare_at = round(ca, 2)
            except (TypeError, ValueError):
                compare_at = None

        doc = {
            "id": _stable_id(wc_id),
            "wc_id": wc_id,
            "slug": row.get("slug") or "",
            "title": title,
            "category": meta_cls.get("category", "Multi-Brand"),
            "brand": brand,
            "subcategory": meta_cls.get("subcategory", brand),
            "model": model_name or meta_cls.get("model", ""),
            "model_wc_id": model_wc_id,
            "part_type": meta_cls.get("part_type", ""),
            "leaf_category": meta_cls.get("leaf_category", ""),
            "sku": row.get("sku") or "",
            "price": round(b2b, 2),
            "regularPrice": round(regular, 2),
            "salePrice": round(sale, 2) if sale else None,
            "on_sale": on_sale or (compare_at is not None and b2c_override and manual_b2c is not None and compare_at > manual_b2c),
            "wholesalePrice": round(b2b, 2),
            "b2b_price": round(b2b, 2),
            "b2c_price": round(b2c, 2),
            "b2c_override": b2c_override,
            "retailPrice": round(b2c, 2),
            "compareAtPrice": compare_at,
            "image": images[0],
            "images": images,
            "image_override": bool(override_img),
            "best_seller": _parse_int(row.get("total_sales")) >= 5,
            # Recent catalog items — used by home New Arrivals + filters.
            "new_arrival": _is_new_arrival(row.get("updated_at") or row.get("created_at")),
            "created_at": _iso_dt(row.get("created_at") or row.get("updated_at")),
            "rating": round(_parse_float(row.get("wc_average_rating")), 1),
            "reviews": _parse_int(row.get("wc_review_count")),
            "description": description,
            "permalink": f"{self.repo.site_url()}/product/{row.get('slug') or wc_id}/",
            "product_type": row.get("product_type") or "simple",
            "manage_stock": manage,
            "stock_tracked": manage,
            "stock_quantity": qty,
            "in_stock": in_stock,
            "categories": categories,
            "attributes": row.get("attributes") or [],
            "color_variants": color_variants,
            "variants": variant_labels,
            # Never include Country of Origin on public product pages.
            "specs": {
                "Condition": "New",
                "Brand": brand,
                **({"Model": model_name} if model_name else {}),
                **({"SKU": row.get("sku")} if row.get("sku") else {}),
                **({"Type": meta_cls.get("leaf_category") or meta_cls.get("part_type")}
                   if (meta_cls.get("leaf_category") or meta_cls.get("part_type")) else {}),
            },
        }
        return normalize_stock(doc)

    def _prepare(self, products: list[dict], user: Optional[dict]) -> list[dict]:
        tier = (user or {}).get("dealerTier") or "standard"
        enriched = []
        for p in products:
            e = enrich_product_pricing(dict(p), tier)
            # Only force DB B2C when an admin explicitly overrode the price.
            if p.get("b2c_override") and p.get("b2c_price"):
                e["retailPrice"] = float(p["b2c_price"])
                if not can_see_business_pricing(user):
                    e["price"] = float(p["b2c_price"])
            # Admin sale compare-at → strikethrough for public shoppers.
            if p.get("compareAtPrice") and float(p["compareAtPrice"]) > 0:
                e["regularPrice"] = float(p["compareAtPrice"])
                e["on_sale"] = True
                if p.get("b2c_override") and p.get("b2c_price"):
                    e["salePrice"] = float(p["b2c_price"])
            if p.get("b2b_price") is not None:
                e["wholesalePrice"] = float(p["b2b_price"])
                e["apiPrice"] = float(p["b2b_price"])
                if can_see_business_pricing(user):
                    e["price"] = float(p["b2b_price"])
                elif not p.get("b2c_override"):
                    # Public: always map live bands from business cost.
                    mapped = map_public_retail_price(float(p["b2b_price"]), p)
                    e["retailPrice"] = mapped
                    e["b2c_price"] = mapped
                    e["price"] = mapped
            enriched.append(e)
        return sanitize_products(enriched, user)

    def sync_accessory_public_prices(self, *, batch_size: int = 200, max_products: int = 5000) -> dict[str, Any]:
        """
        Write public_price (+ business_price snapshot) into samphone_b2c_pricing
        for accessory products. Business accounts still use live DB/wholesale cost.
        """
        self.db.ensure_app_tables()
        cleared = 0
        try:
            cleared = self.repo.clear_synced_b2c_overrides()
        except Exception as exc:
            logger.warning("Could not clear synced b2c overrides: %s", exc)
        written = 0
        skipped = 0
        offset = 0
        _, model_ids = self._load_models()
        while offset < max_products:
            ids = self.repo.list_product_ids(limit=batch_size, offset=offset)
            if not ids:
                break
            rows = self.repo.get_products_by_ids(ids, include_description=False)
            for row in rows:
                doc = self._row_to_product(row, model_ids, include_description=False)
                if not doc:
                    skipped += 1
                    continue
                if not is_accessory_for_public_pricing(doc):
                    skipped += 1
                    continue
                business = float(doc.get("b2b_price") or doc.get("wholesalePrice") or 0)
                if business <= 0:
                    skipped += 1
                    continue
                # Always remap from live DB cost so new bands (e.g. 50–90) apply.
                public = map_public_retail_price(business, doc)
                if public <= 0:
                    skipped += 1
                    continue
                self.repo.upsert_public_price(int(doc["wc_id"]), public, business_price=business)
                written += 1
            offset += len(ids)
            if len(ids) < batch_size:
                break
        return {"ok": True, "written": written, "skipped": skipped, "cleared_synced_overrides": cleared}

    def _hydrate_docs(self, rows: list[dict], model_ids: dict[int, dict]) -> list[dict]:
        products = []
        for row in rows:
            doc = self._row_to_product(row, model_ids)
            if doc:
                products.append(doc)
        return products

    def _collect_model_products(
        self,
        *,
        brand: Optional[str],
        model: Optional[str],
        model_wc_id: Optional[int],
        in_stock: Optional[bool] = None,
    ) -> list[dict]:
        """
        Full model catalog: every product in the WC model category, plus
        title-matched accessories/parts, then filter + parts-first sort.
        """
        from model_match import filter_by_model, model_aliases, resolve_model_name

        _, model_ids = self._load_models()
        by_wc: dict[int, dict] = {}

        category_slug = None
        if model_wc_id is not None:
            m = model_ids.get(int(model_wc_id))
            if m and m.get("slug"):
                category_slug = m["slug"]

        model_name = resolve_model_name(brand, model, model_wc_id) or (model or "")

        # 1) All products tagged with this model category
        if category_slug:
            _total, rows = self.repo.search_page(
                category_slug=category_slug,
                in_stock=in_stock,
                sort="date_desc",
                limit=500,
                offset=0,
                include_description=False,
            )
            for doc in self._hydrate_docs(rows, model_ids):
                # Prefer the requested model when a product sits in multiple model terms.
                if model_wc_id is not None:
                    doc["model_wc_id"] = int(model_wc_id)
                    if model_name:
                        doc["model"] = model_name
                by_wc[int(doc["wc_id"])] = doc

        # 2) Title search with short aliases (catches accessories not in model term)
        aliases = list(model_aliases(model_name, brand or "")) if model_name else []
        # Prefer shorter distinctive aliases for LIKE (avoid "Apple iPhone 17 Pro Max" only)
        search_terms: list[str] = []
        for alias in sorted(aliases, key=len):
            a = alias.strip()
            if len(a) < 4:
                continue
            if a.lower() not in {t.lower() for t in search_terms}:
                search_terms.append(a)
            if len(search_terms) >= 3:
                break
        if model_name and model_name.strip() and model_name.strip().lower() not in {t.lower() for t in search_terms}:
            search_terms.insert(0, model_name.strip())

        for term in search_terms[:2]:
            _total, rows = self.repo.search_page(
                q=term,
                in_stock=in_stock,
                sort="date_desc",
                limit=400,
                offset=0,
                include_description=False,
            )
            for doc in self._hydrate_docs(rows, model_ids):
                wc = int(doc["wc_id"])
                if wc not in by_wc:
                    by_wc[wc] = doc

        products = list(by_wc.values())
        # Model match is authoritative — do not drop by brand equality
        # (many titles omit "Apple"/"Samsung").
        products = filter_by_model(products, brand, model, model_wc_id)
        from product_variants import collapse_color_variant_products

        products = collapse_color_variant_products(products)
        return sort_products(
            products,
            model=model or model_name,
            model_wc_id=model_wc_id,
        )

    def filter_products(
        self,
        *,
        q: Optional[str] = None,
        category: Optional[str] = None,
        brand: Optional[str] = None,
        subcategory: Optional[str] = None,
        model: Optional[str] = None,
        model_wc_id: Optional[int] = None,
        leaf_category: Optional[str] = None,
        category_group: Optional[str] = None,
        best_seller: Optional[bool] = None,
        new_arrival: Optional[bool] = None,
        in_stock: Optional[bool] = None,
        limit: int = 50,
        offset: int = 0,
        user: Optional[dict] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        sort: str = "date_desc",
        preview: bool = False,
        **_extra: Any,
    ) -> dict[str, Any]:
        started = time.perf_counter()
        lim, off = clamp_page(limit, offset, model_query=model_wc_id is not None or bool(model))

        # Model pages: collect full set, parts first then accessories, then paginate.
        if model_wc_id is not None or model:
            products = self._collect_model_products(
                brand=brand,
                model=model,
                model_wc_id=model_wc_id,
                in_stock=in_stock,
            )
            if best_seller is not None:
                products = [p for p in products if bool(p.get("best_seller")) == best_seller]
            total = len(products)
            page = products[off : off + lim]
            page_items = self._prepare(page, user)
            if preview:
                page_items = [_preview_product(p) for p in page_items]
            logger.info(
                "Catalog MySQL model ms=%s items=%s/%s brand=%r model=%r wc=%s parts_first=1",
                int((time.perf_counter() - started) * 1000),
                len(page_items),
                total,
                brand,
                model,
                model_wc_id,
            )
            return product_page(
                page_items,
                total,
                limit=lim,
                offset=off,
                model_query=True,
            )

        from category_groups import (
            SMARTPHONE_WC_SEARCH_ANY,
            filter_by_group,
            filter_by_leaf,
            group_wc_search_term,
            group_wc_search_terms,
            is_smartphone_product,
            leaf_wc_search_term,
            leaf_wc_search_terms,
        )
        from catalog_sort import is_accessories_list_context

        category_name = None
        category_slug = None
        search = (q or "").strip() or None
        search_any: list[str] | None = None
        smartphones_tab = (category or "").strip().lower() == "smartphones"

        if leaf_category:
            any_terms = leaf_wc_search_terms(leaf_category)
            if any_terms and len(any_terms) > 1:
                search_any = any_terms
                # Keep explicit user search as an AND constraint when present.
                search = (q or "").strip() or None
            else:
                hint = leaf_wc_search_term(leaf_category) or leaf_category
                search = search or hint
        elif category_group:
            any_terms = group_wc_search_terms(category_group)
            if any_terms and len(any_terms) > 1:
                search_any = any_terms
                search = (q or "").strip() or None
            else:
                hint = group_wc_search_term(category_group) or category_group
                search = search or hint
        elif smartphones_tab:
            # Do not rely on WooCommerce category name "Smartphones" (often SMARTPHONES /
            # brand leaves). Scan titles then keep complete devices only.
            search_any = list(SMARTPHONE_WC_SEARCH_ANY)
            search = (q or "").strip() or None
        elif category:
            category_name = category

        if best_seller:
            sort = "sales_desc"
        elif new_arrival:
            sort = "date_desc"
        elif smartphones_tab:
            # Phones tab: costly → cheaper.
            sort = "price_desc"
        elif is_accessories_list_context(
            category=category,
            category_group=category_group,
            leaf_category=leaf_category,
        ):
            # All accessory category/group/leaf pages: cheapest → costliest.
            sort = "price_asc"

        needs_post = bool(leaf_category or category_group or subcategory or brand or smartphones_tab)
        # Text search: Amazon/Flipkart-style weighted multi-field LIKE scoring.
        use_weighted = bool((q or "").strip()) and not (model_wc_id is not None or model)
        search_q = (q or "").strip()

        if use_weighted:
            needs_post = bool(leaf_category or category_group or subcategory or smartphones_tab)

        if needs_post and not use_weighted:
            # Charger/cable leaves need a wide candidate pool before title post-filter.
            fetch_limit = max(lim * 20, 800) if search_any else max(lim * 10, 250)
            fetch_offset = 0
        elif use_weighted and needs_post:
            fetch_limit = max(lim * 10, 400)
            fetch_offset = 0
        elif use_weighted:
            fetch_limit = lim
            fetch_offset = off
        else:
            fetch_limit = lim
            fetch_offset = off

        extra_keywords: list[str] = []
        if brand and use_weighted:
            extra_keywords.append(brand)
        if category and use_weighted and not smartphones_tab:
            extra_keywords.append(category)
        if subcategory and use_weighted:
            extra_keywords.append(subcategory)
        if leaf_category and use_weighted:
            extra_keywords.append(leaf_category)
        if use_weighted:
            # LLM / voice filters passed through **_extra
            for key in ("product", "color", "storage", "ram", "material", "size"):
                val = _extra.get(key)
                if val:
                    extra_keywords.append(str(val))
            try:
                from catalog_vocab import extra_keywords_for_query

                extra_keywords.extend(extra_keywords_for_query(search_q)[:12])
            except Exception:
                pass

        if use_weighted:
            total, rows = self.repo.weighted_search_page(
                q=search_q,
                extra_keywords=extra_keywords or None,
                min_price=min_price,
                max_price=max_price,
                in_stock=in_stock,
                limit=fetch_limit,
                offset=fetch_offset,
                include_description=False,
                fuzzy=True,
            )
        else:
            total, rows = self.repo.search_page(
                q=search,
                q_any=search_any,
                category_slug=category_slug,
                category_name=category_name,
                brand=None,
                min_price=min_price,
                max_price=max_price,
                in_stock=in_stock,
                sort=sort,
                limit=fetch_limit,
                offset=fetch_offset,
                include_description=False,
            )
        _, model_ids = self._load_models()
        products = self._hydrate_docs(rows, model_ids)

        # Hard filter: query generation (e.g. iPhone 16) must appear in the title.
        if use_weighted and search_q:
            try:
                from weighted_search import build_search_terms, title_has_required_generations

                req = build_search_terms(search_q).get("required_tokens") or []
                if req:
                    before = len(products)
                    products = [
                        p
                        for p in products
                        if title_has_required_generations(str(p.get("title") or ""), req)
                    ]
                    if len(products) != before and not needs_post:
                        total = max(total - (before - len(products)), len(products))
            except Exception:
                pass

        from product_variants import collapse_color_variant_products

        before_collapse = len(products)
        products = collapse_color_variant_products(products)
        if len(products) != before_collapse and (needs_post or use_weighted):
            # Counts shrink when color SKUs merge into one parent card.
            if needs_post:
                total = len(products) if not use_weighted else max(int(total) - (before_collapse - len(products)), len(products))
            elif not needs_post:
                total = max(int(total) - (before_collapse - len(products)), len(products))

        if needs_post or (use_weighted and brand):
            if leaf_category:
                products = filter_by_leaf(products, leaf_category)
            if category_group:
                products = filter_by_group(products, category_group)
            if smartphones_tab:
                products = [p for p in products if is_smartphone_product(p)]
            # Soft brand filter when searching: prefer matches, do not require exact '='.
            if brand and not use_weighted:
                bl = brand.strip().lower()
                products = [p for p in products if (p.get("brand") or "").strip().lower() == bl]
            elif brand and use_weighted:
                bl = brand.strip().lower()
                preferred = [p for p in products if (p.get("brand") or "").strip().lower() == bl]
                others = [p for p in products if (p.get("brand") or "").strip().lower() != bl]
                if preferred:
                    products = preferred + others
            if subcategory and not use_weighted:
                sl = subcategory.strip().lower()
                products = [p for p in products if (p.get("subcategory") or "").strip().lower() == sl]
            if best_seller is not None:
                products = [p for p in products if bool(p.get("best_seller")) == best_seller]
            if new_arrival is not None:
                products = [p for p in products if bool(p.get("new_arrival")) == new_arrival]
            if needs_post:
                if not use_weighted:
                    products = sort_products(
                        products,
                        category=category,
                        category_group=category_group,
                        leaf_category=leaf_category,
                    )
                total = len(products)
                products = products[off : off + lim]
            else:
                # Weighted + soft brand: keep SQL relevance total; only reorder this page.
                products = products[:lim]
        else:
            # Promo home sections: SQL already sorted (sales_desc / date_desc).
            # Keep that order — do not re-sort by price or shrink the short page.
            if use_weighted:
                # Preserve relevance ranking from weighted_search_page.
                pass
            elif best_seller or new_arrival:
                pass
            elif sort in {"title_asc", "title_desc", "price_asc", "price_desc", "sales_desc", "date_asc", "date_desc"}:
                # Explicit SQL sort (e.g. admin stock A→Z) — do not re-rank in Python.
                if best_seller is not None:
                    products = [p for p in products if bool(p.get("best_seller")) == best_seller]
                if new_arrival is not None:
                    products = [p for p in products if bool(p.get("new_arrival")) == new_arrival]
            else:
                if best_seller is not None:
                    products = [p for p in products if bool(p.get("best_seller")) == best_seller]
                if new_arrival is not None:
                    products = [p for p in products if bool(p.get("new_arrival")) == new_arrival]
                products = sort_products(
                    products,
                    category=category,
                    category_group=category_group,
                    leaf_category=leaf_category,
                )

        page_items = self._prepare(products[:lim], user)
        if preview:
            page_items = [_preview_product(p) for p in page_items]
        logger.info(
            "Catalog MySQL filter ms=%s items=%s/%s q=%r brand=%r leaf=%r group=%r sort=%s",
            int((time.perf_counter() - started) * 1000),
            len(page_items),
            total,
            q,
            brand,
            leaf_category,
            category_group,
            sort,
        )
        return product_page(page_items, total, limit=lim, offset=off, model_query=False)

    def _expand_pdp_color_variants(self, doc: dict, model_ids: dict[int, dict]) -> dict:
        """Attach sibling cover photos so PDP color dots can switch the main image."""
        from product_variants import is_color_cover_product, merge_sibling_color_variants, split_title_color

        if not doc:
            return doc
        variants = list(doc.get("color_variants") or [])
        if variants and all(v.get("image") for v in variants):
            return doc
        if not variants and not is_color_cover_product(doc):
            return doc
        title = str(doc.get("title") or "")
        base, _color = split_title_color(title)
        query = (base or title).strip()
        if len(query) < 8:
            return doc
        try:
            _total, rows = self.repo.search_page(
                q=query,
                limit=80,
                offset=0,
                include_description=False,
            )
        except Exception:
            logger.debug("PDP color expand search failed for %s", query, exc_info=True)
            return doc
        siblings = self._hydrate_docs(rows, model_ids)
        return merge_sibling_color_variants(doc, siblings)

    def get_product_by_uuid(self, product_id: str, enrich: bool = True, user: Optional[dict] = None) -> Optional[dict]:
        wc_id = None
        raw = str(product_id or "").strip()
        if raw.isdigit():
            wc_id = int(raw)
        elif raw.startswith("wc-") and raw[3:].isdigit():
            wc_id = int(raw[3:])
        else:
            try:
                wc_id = self.repo.wc_id_for_uuid(raw)
            except Exception:
                wc_id = None
        if wc_id is None:
            return None
        row = self.repo.get_product(wc_id, include_description=True)
        if not row:
            return None
        preferred_variant = None
        try:
            resolved, color = self.repo.resolve_orphan_color_parent(row, include_description=True)
            if resolved is not None:
                row = resolved
                preferred_variant = color
        except Exception:
            preferred_variant = None
        _, model_ids = self._load_models()
        doc = self._row_to_product(row, model_ids, include_description=True)
        if not doc:
            return None
        if preferred_variant:
            doc["preferred_variant"] = preferred_variant
        doc = self._expand_pdp_color_variants(doc, model_ids)
        if enrich:
            return self._prepare([doc], user)[0]
        return doc

    def get_product_by_slug(self, slug: str, user: Optional[dict] = None) -> Optional[dict]:
        row = self.repo.get_product_by_slug(slug, include_description=True)
        if not row:
            return None
        _, model_ids = self._load_models()
        doc = self._row_to_product(row, model_ids, include_description=True)
        if not doc:
            return None
        doc = self._expand_pdp_color_variants(doc, model_ids)
        return self._prepare([doc], user)[0]

    def list_categories(self) -> list[dict]:
        return self.repo.list_categories()

    def list_brands(self) -> list[dict]:
        return self.repo.list_brands_from_titles()

    def list_banners(self, *, limit: int = 8) -> list[dict]:
        return self.repo.list_home_banners(limit=limit)

    def related_products(self, product_id: str, *, limit: int = 12, user: Optional[dict] = None) -> list[dict]:
        doc = self.get_product_by_uuid(product_id, enrich=False)
        if not doc or not doc.get("wc_id"):
            return []
        ids = self.repo.related_product_ids(int(doc["wc_id"]), limit=limit)
        _, model_ids = self._load_models()
        rows = self.repo.get_products_by_ids(ids)
        products = [self._row_to_product(r, model_ids) for r in rows]
        products = [p for p in products if p]
        return self._prepare(products, user)

    def featured_products(self, *, limit: int = 50, user: Optional[dict] = None) -> dict[str, Any]:
        return self.filter_products(best_seller=True, limit=limit, offset=0, user=user, sort="sales_desc")

    def new_arrivals(self, *, limit: int = 50, user: Optional[dict] = None) -> dict[str, Any]:
        """Newest published products by Woo ID — not a calendar/new_arrival flag."""
        cap = max(1, int(limit or 50))
        newest = self.filter_products(limit=cap, offset=0, user=user, sort="date_desc")
        items = list(newest.get("items") or [])
        for p in items:
            p["new_arrival"] = True
        newest["items"] = items
        return newest

    def home_rails(
        self,
        *,
        part: str = "all",
        limit: int = 8,
        user: Optional[dict] = None,
    ) -> dict[str, Any]:
        """One payload for Home: best sellers, new arrivals, and category rows."""
        part_key = (part or "all").strip().lower()
        if part_key not in {"all", "priority", "sections"}:
            part_key = "all"
        lim = max(1, min(int(limit or 8), 24))

        def _items(**kwargs: Any) -> list[dict]:
            page = self.filter_products(
                preview=True,
                user=user,
                limit=lim,
                offset=0,
                **kwargs,
            )
            return list(page.get("items") or [])

        payload: dict[str, Any] = {
            "part": part_key,
            "limit": lim,
            "best": [],
            "fresh": [],
            "sections": [],
        }
        if part_key in {"all", "priority"}:
            payload["best"] = _items(best_seller=True, sort="sales_desc")
            payload["fresh"] = _items(sort="date_desc")
        if part_key in {"all", "sections"}:
            sections: list[dict[str, Any]] = []
            for key, title, group, query in HOME_RAIL_SECTIONS:
                sections.append(
                    {
                        "key": key,
                        "title": title,
                        "category_group": group,
                        "items": _items(**query),
                    }
                )
            payload["sections"] = sections
        return payload

    def list_admin_products(self, q: Optional[str] = None, limit: int = 50, offset: int = 0) -> dict[str, Any]:
        result = self.filter_products(
            q=q,
            limit=limit,
            offset=offset,
            sort="title_asc",
            user={"role": "admin", "accountType": "b2b", "isWholesale": True, "wholesaleStatus": "approved"},
        )
        # Admin UI must show real DB quantities — never the shop-side 9999 unmanaged cap.
        # Also guarantee both business + public prices for the Public/Business toggle.
        for p in result.get("items") or []:
            managed = bool(p.get("manage_stock") or p.get("stock_tracked"))
            qty = int(p.get("stock_quantity") or 0)
            if managed:
                p["stock_tracked"] = True
                p["manage_stock"] = True
                p["stock_quantity"] = max(0, qty if qty < UNMANAGED_IN_STOCK_QTY else 0)
                p["in_stock"] = p["stock_quantity"] > 0
            elif qty >= UNMANAGED_IN_STOCK_QTY:
                # Untracked WooCommerce stock (manage_stock=no). Don't fake "0" in the editor.
                p["stock_quantity"] = None
                p["stock_tracked"] = False
            else:
                p["stock_tracked"] = True
                p["stock_quantity"] = qty

            biz = 0.0
            for key in ("wholesalePrice", "b2b_price", "apiPrice", "price"):
                try:
                    v = float(p.get(key) or 0)
                except (TypeError, ValueError):
                    v = 0.0
                if v > 0:
                    biz = v
                    break
            pub = 0.0
            for key in ("retailPrice", "b2c_price"):
                try:
                    v = float(p.get(key) or 0)
                except (TypeError, ValueError):
                    v = 0.0
                if v > 0:
                    pub = v
                    break
            if biz > 0 and pub <= 0:
                if p.get("b2c_override") and p.get("b2c_price"):
                    try:
                        pub = float(p["b2c_price"])
                    except (TypeError, ValueError):
                        pub = map_public_retail_price(biz, p)
                else:
                    pub = map_public_retail_price(biz, p)
            if biz > 0:
                p["wholesalePrice"] = round(biz, 2)
                p["b2b_price"] = round(biz, 2)
                p["price"] = round(biz, 2)
            if pub > 0:
                p["retailPrice"] = round(pub, 2)
                p["b2c_price"] = round(pub, 2)
        return result

    def _map_wc_order_status(self, status: str) -> str:
        s = (status or "").replace("wc-", "").strip().lower()
        mapping = {
            "pending": "order_placed",
            "processing": "processing",
            "on-hold": "processing",
            "completed": "delivered",
            "cancelled": "order_placed",
            "refunded": "order_placed",
            "failed": "order_placed",
            "checkout-draft": "order_placed",
        }
        return mapping.get(s, "order_placed")

    def _guid_urls_for_attachment_ids(self, cur, attachment_ids: list[int]) -> dict[int, str]:
        uniq = [i for i in dict.fromkeys(int(x) for x in attachment_ids if int(x) > 0)]
        if not uniq:
            return {}
        ph = ",".join(["%s"] * len(uniq))
        cur.execute(
            f"SELECT ID, guid FROM `{self.db.t('posts')}` WHERE ID IN ({ph})",
            tuple(uniq),
        )
        out: dict[int, str] = {}
        for row in cur.fetchall() or []:
            url = self.repo._normalize_url(row.get("guid") or "")
            if url:
                out[int(row["ID"])] = url
        return out

    def _images_for_order_lines(
        self,
        cur,
        *,
        product_ids: list[int],
        variation_ids: list[int],
        titles: list[str],
    ) -> tuple[dict[int, str], dict[str, str]]:
        """
        Resolve catalog images for WooCommerce order lines.
        Prefer variation thumbnail, then product thumbnail / admin override,
        then match by product name.
        """
        by_id: dict[int, str] = {}
        by_title: dict[str, str] = {}
        lookup_ids = [i for i in dict.fromkeys([*variation_ids, *product_ids]) if i > 0]

        if lookup_ids:
            ph = ",".join(["%s"] * len(lookup_ids))
            cur.execute(
                f"""
                SELECT post_id, meta_value
                FROM `{self.db.t('postmeta')}`
                WHERE meta_key = '_thumbnail_id'
                  AND post_id IN ({ph})
                """,
                tuple(lookup_ids),
            )
            thumb_of: dict[int, int] = {}
            for row in cur.fetchall() or []:
                raw = str(row.get("meta_value") or "").strip()
                if raw.isdigit() and int(raw) > 0:
                    thumb_of[int(row["post_id"])] = int(raw)
            urls = self._guid_urls_for_attachment_ids(cur, list(thumb_of.values()))
            for pid, tid in thumb_of.items():
                url = urls.get(tid) or ""
                if url:
                    by_id[pid] = url

            try:
                cur.execute(
                    f"""
                    SELECT product_id, image_url
                    FROM samphone_b2c_pricing
                    WHERE product_id IN ({ph})
                      AND image_url IS NOT NULL AND image_url != ''
                    """,
                    tuple(lookup_ids),
                )
                for row in cur.fetchall() or []:
                    url = self.repo._normalize_url(row.get("image_url") or "")
                    pid = int(row["product_id"])
                    if url:
                        by_id[pid] = url
            except Exception:
                logger.debug("samphone_b2c_pricing image overlay skipped", exc_info=True)

        needles = []
        seen_titles: set[str] = set()
        for title in titles:
            key = (title or "").strip()
            if not key:
                continue
            low = key.lower()
            if low in seen_titles:
                continue
            seen_titles.add(low)
            needles.append(key)
            if " - " in key:
                base = key.split(" - ", 1)[0].strip()
                if base and base.lower() not in seen_titles:
                    seen_titles.add(base.lower())
                    needles.append(base)
        if needles:
            ph = ",".join(["%s"] * len(needles))
            cur.execute(
                f"""
                SELECT p.ID, p.post_title, pm.meta_value AS thumbnail_id
                FROM `{self.db.t('posts')}` p
                LEFT JOIN `{self.db.t('postmeta')}` pm
                  ON pm.post_id = p.ID AND pm.meta_key = '_thumbnail_id'
                WHERE p.post_type IN ('product', 'product_variation')
                  AND p.post_status IN ('publish', 'private', 'draft')
                  AND p.post_title IN ({ph})
                """,
                tuple(needles),
            )
            title_rows = cur.fetchall() or []
            t_ids = [
                int(str(row.get("thumbnail_id") or "").strip())
                for row in title_rows
                if str(row.get("thumbnail_id") or "").strip().isdigit()
                and int(str(row.get("thumbnail_id") or "").strip()) > 0
            ]
            urls = self._guid_urls_for_attachment_ids(cur, t_ids)
            for row in title_rows:
                title_l = (row.get("post_title") or "").strip().lower()
                raw = str(row.get("thumbnail_id") or "").strip()
                url = urls.get(int(raw)) if raw.isdigit() else ""
                if url and title_l and title_l not in by_title:
                    by_title[title_l] = url
                pid = int(row["ID"])
                if url and pid not in by_id:
                    by_id[pid] = url

        return by_id, by_title

    def _woocommerce_orders_connection(self):
        """Prefer live WooCommerce so Admin Orders is not stuck on a stale clone."""
        from contextlib import contextmanager

        @contextmanager
        def _cm():
            live_conn = None
            try:
                from live_mysql import connect_live, live_configured

                if live_configured():
                    live_conn = connect_live(read_only=True)
            except Exception:
                logger.warning("Live website orders unavailable — using catalog clone", exc_info=True)
                live_conn = None
            if live_conn is not None:
                try:
                    yield live_conn
                finally:
                    live_conn.close()
                return
            with self.db.connect() as conn:
                yield conn

        return _cm()

    def list_woocommerce_orders(self, limit: int = 200) -> list[dict]:
        """List WooCommerce HPOS orders from the live shop (fallback: catalog clone)."""
        orders_t = self.db.t("wc_orders")
        addr_t = self.db.t("wc_order_addresses")
        items_t = self.db.t("woocommerce_order_items")
        meta_t = self.db.t("woocommerce_order_itemmeta")
        out: list[dict] = []
        with self._woocommerce_orders_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    SELECT o.id, o.status, o.currency, o.total_amount, o.customer_id,
                           o.billing_email, o.date_created_gmt, o.payment_method,
                           o.payment_method_title, o.transaction_id
                    FROM `{orders_t}` o
                    WHERE o.type = 'shop_order'
                      AND o.status NOT IN ('trash', 'auto-draft')
                    ORDER BY o.date_created_gmt DESC
                    LIMIT %s
                    """,
                    (int(limit),),
                )
                rows = cur.fetchall() or []
                if not rows:
                    return []
                order_ids = [int(r["id"]) for r in rows]
                placeholders = ",".join(["%s"] * len(order_ids))

                cur.execute(
                    f"""
                    SELECT order_id, address_type, first_name, last_name, company,
                           address_1, address_2, city, state, postcode, country, email, phone
                    FROM `{addr_t}`
                    WHERE order_id IN ({placeholders})
                    """,
                    tuple(order_ids),
                )
                addr_by_order: dict[int, dict] = {}
                for a in cur.fetchall() or []:
                    oid = int(a["order_id"])
                    bucket = addr_by_order.setdefault(oid, {})
                    bucket[a.get("address_type") or "billing"] = a

                cur.execute(
                    f"""
                    SELECT order_item_id, order_item_name, order_id
                    FROM `{items_t}`
                    WHERE order_id IN ({placeholders}) AND order_item_type = 'line_item'
                    """,
                    tuple(order_ids),
                )
                item_rows = cur.fetchall() or []
                item_ids = [int(i["order_item_id"]) for i in item_rows]
                meta_by_item: dict[int, dict] = {}
                if item_ids:
                    iph = ",".join(["%s"] * len(item_ids))
                    cur.execute(
                        f"""
                        SELECT order_item_id, meta_key, meta_value
                        FROM `{meta_t}`
                        WHERE order_item_id IN ({iph})
                          AND meta_key IN ('_qty', '_line_total', '_product_id', '_variation_id')
                        """,
                        tuple(item_ids),
                    )
                    for m in cur.fetchall() or []:
                        mid = int(m["order_item_id"])
                        meta_by_item.setdefault(mid, {})[m["meta_key"]] = m["meta_value"]

                items_by_order: dict[int, list] = {}
                product_ids: list[int] = []
                variation_ids: list[int] = []
                titles: list[str] = []
                pending_lines: list[tuple[int, dict]] = []
                for it in item_rows:
                    oid = int(it["order_id"])
                    mid = int(it["order_item_id"])
                    meta = meta_by_item.get(mid, {})
                    try:
                        qty = int(float(meta.get("_qty") or 1))
                    except (TypeError, ValueError):
                        qty = 1
                    try:
                        line_total = float(meta.get("_line_total") or 0)
                    except (TypeError, ValueError):
                        line_total = 0.0
                    unit = round(line_total / qty, 2) if qty else line_total
                    try:
                        pid = int(float(meta.get("_product_id") or 0))
                    except (TypeError, ValueError):
                        pid = 0
                    try:
                        vid = int(float(meta.get("_variation_id") or 0))
                    except (TypeError, ValueError):
                        vid = 0
                    title = it.get("order_item_name") or "Item"
                    if pid:
                        product_ids.append(pid)
                    if vid:
                        variation_ids.append(vid)
                    titles.append(title)
                    pending_lines.append(
                        (
                            oid,
                            {
                                "product_id": str(pid or ""),
                                "variation_id": str(vid or ""),
                                "title": title,
                                "quantity": qty,
                                "price": unit,
                                "image": "",
                                "_pid": pid,
                                "_vid": vid,
                            },
                        )
                    )

                by_id, by_title = self._images_for_order_lines(
                    cur,
                    product_ids=product_ids,
                    variation_ids=variation_ids,
                    titles=titles,
                )
                for oid, line in pending_lines:
                    pid = int(line.pop("_pid") or 0)
                    vid = int(line.pop("_vid") or 0)
                    title_l = (line.get("title") or "").strip().lower()
                    base_l = title_l.split(" - ", 1)[0].strip() if " - " in title_l else title_l
                    image = (
                        (vid and by_id.get(vid))
                        or (pid and by_id.get(pid))
                        or by_title.get(title_l)
                        or by_title.get(base_l)
                        or ""
                    )
                    line["image"] = image
                    items_by_order.setdefault(oid, []).append(line)

                for r in rows:
                    oid = int(r["id"])
                    addrs = addr_by_order.get(oid, {})
                    bill = addrs.get("billing") or addrs.get("shipping") or {}
                    ship = addrs.get("shipping") or bill
                    name = f"{(bill.get('first_name') or '').strip()} {(bill.get('last_name') or '').strip()}".strip()
                    email = (r.get("billing_email") or bill.get("email") or "").strip()
                    created = r.get("date_created_gmt")
                    created_iso = created.isoformat() + "Z" if hasattr(created, "isoformat") else str(created or "")
                    try:
                        total = float(r.get("total_amount") or 0)
                    except (TypeError, ValueError):
                        total = 0.0
                    status_raw = str(r.get("status") or "")
                    pay = str(r.get("payment_method") or "delivery")
                    if pay in {"cod", "bacs", ""}:
                        pay = "delivery"
                    items = items_by_order.get(oid, [])
                    out.append(
                        {
                            "id": f"wc-{oid}",
                            "wc_order_id": oid,
                            "order_number": f"#{oid}",
                            "user_id": str(r.get("customer_id") or ""),
                            "customer_email": email,
                            "customer_name": name or email or "Customer",
                            "items": items,
                            "subtotal": round(total, 2),
                            "full_name": name,
                            "phone": (bill.get("phone") or "") or "",
                            "address": (ship.get("address_1") or bill.get("address_1") or "") or "",
                            "city": (ship.get("city") or bill.get("city") or "") or "",
                            "postal_code": (ship.get("postcode") or bill.get("postcode") or "") or "",
                            "payment_method": pay,
                            "payment_method_title": r.get("payment_method_title") or "",
                            "status": self._map_wc_order_status(status_raw),
                            "wc_status": status_raw.replace("wc-", ""),
                            "source": "woocommerce",
                            "created_at": created_iso,
                            "currency": r.get("currency") or "EUR",
                        }
                    )
        return out

    def get_woocommerce_order(self, order_id: str) -> Optional[dict]:
        raw = str(order_id or "").strip()
        if raw.startswith("wc-"):
            raw = raw[3:]
        try:
            oid = int(raw)
        except (TypeError, ValueError):
            return None
        # Prefer direct lookup so older/newer orders outside a small LIMIT still resolve.
        for row in self.list_woocommerce_orders(limit=5000):
            if int(row.get("wc_order_id") or 0) == oid:
                return row
        return None

    def update_product_stock(self, product_id: str, stock_quantity: int) -> Optional[dict]:
        doc = self.get_product_by_uuid(product_id, enrich=False)
        if not doc:
            return None
        wc_id = int(doc["wc_id"])
        qty = max(0, int(stock_quantity))
        status = "instock" if qty > 0 else "outofstock"
        meta_t = self.db.t("postmeta")
        with self.db.connect() as conn:
            with conn.cursor() as cur:
                # wp_postmeta has no unique (post_id, meta_key) — collapse duplicates first.
                for key in ("_stock", "_stock_status", "_manage_stock"):
                    cur.execute(
                        f"""
                        SELECT meta_id FROM `{meta_t}`
                        WHERE post_id=%s AND meta_key=%s
                        ORDER BY meta_id ASC
                        """,
                        (wc_id, key),
                    )
                    ids = [int(r["meta_id"]) for r in (cur.fetchall() or [])]
                    if len(ids) > 1:
                        placeholders = ",".join(["%s"] * (len(ids) - 1))
                        cur.execute(
                            f"DELETE FROM `{meta_t}` WHERE meta_id IN ({placeholders})",
                            ids[1:],
                        )
                self.repo._set_postmeta(cur, wc_id, "_stock", str(qty))
                self.repo._set_postmeta(cur, wc_id, "_stock_status", status)
                self.repo._set_postmeta(cur, wc_id, "_manage_stock", "yes")
        return self.get_product_by_uuid(
            product_id,
            enrich=True,
            user={
                "role": "admin",
                "accountType": "b2b",
                "isWholesale": True,
                "wholesaleStatus": "approved",
            },
        )

    def update_product_admin(
        self,
        product_id: str,
        *,
        stock_quantity: int | None = None,
        regular_price: float | None = None,
        sale_price: float | None = None,
        clear_sale: bool = False,
        b2c_price: float | None = None,
        clear_b2c: bool = False,
        compare_at_price: float | None = None,
        image_url: str | None = None,
        clear_image: bool = False,
    ) -> Optional[dict]:
        """Admin edits: stock, WC prices, public override/sale, image override."""
        doc = self.get_product_by_uuid(product_id, enrich=False)
        if not doc:
            return None
        wc_id = int(doc["wc_id"])

        if stock_quantity is not None:
            self.update_product_stock(product_id, int(stock_quantity))

        price_touch = regular_price is not None or sale_price is not None or clear_sale
        if price_touch:
            self.repo.update_wc_prices(
                wc_id,
                regular_price=regular_price,
                sale_price=sale_price,
                clear_sale=clear_sale,
            )
            # Mirror business / sale price onto the live WooCommerce site.
            # Sync from live is SELECT-only; this is the only live write path (price meta / REST).
            try:
                from live_mysql import push_business_price_to_site

                live_result = push_business_price_to_site(
                    wc_id,
                    regular_price=regular_price,
                    sale_price=sale_price,
                    clear_sale=clear_sale,
                )
                if not live_result.get("ok"):
                    logger.warning(
                        "Live WooCommerce price push incomplete for wc_id=%s: %s",
                        wc_id,
                        live_result,
                    )
            except Exception:
                logger.exception("Live WooCommerce price push failed for wc_id=%s", wc_id)

        if clear_b2c:
            self.repo.clear_b2c_override(wc_id)
        elif b2c_price is not None or compare_at_price is not None:
            self.repo.upsert_b2c_price(
                wc_id,
                b2c_price=float(b2c_price) if b2c_price is not None else None,
                compare_at_price=float(compare_at_price) if compare_at_price is not None else None,
            )

        if clear_sale:
            self.repo.set_compare_at_price(wc_id, None)

        if clear_image:
            self.repo.set_image_url(wc_id, None)
        elif image_url is not None:
            url = str(image_url).strip()
            self.repo.set_image_url(wc_id, url or None)

        return self.get_product_by_uuid(
            product_id,
            enrich=True,
            user={
                "role": "admin",
                "accountType": "b2b",
                "isWholesale": True,
                "wholesaleStatus": "approved",
            },
        )

    def create_product_admin(
        self,
        *,
        name: str,
        sku: str = "",
        regular_price: float | None = None,
        b2c_price: float | None = None,
        image_url: str = "",
        description: str = "",
        stock_quantity: int | None = None,
    ) -> dict:
        from live_mysql import create_via_woocommerce_rest

        created = create_via_woocommerce_rest(
            name=name,
            sku=sku,
            regular_price=regular_price,
            image_url=image_url,
            description=description,
            stock_quantity=stock_quantity,
        )
        if not created.get("ok"):
            raise RuntimeError(created.get("error") or created.get("reason") or "Could not create product")
        wc_id = int(created.get("wc_id") or 0)
        if wc_id and b2c_price is not None:
            self.repo.upsert_b2c_price(wc_id, b2c_price=float(b2c_price))
        if wc_id and (image_url or "").strip():
            self.repo.set_image_url(wc_id, image_url.strip())
        product = created.get("product") or {}
        images = product.get("images") or []
        src = ""
        if isinstance(images, list) and images:
            first = images[0]
            if isinstance(first, dict):
                src = str(first.get("src") or "")
        local = self.get_product_by_uuid(str(wc_id), enrich=True, user={
            "role": "admin",
            "accountType": "b2b",
            "isWholesale": True,
            "wholesaleStatus": "approved",
        }) if wc_id else None
        if local:
            return local
        return {
            "id": str(wc_id),
            "wc_id": wc_id,
            "title": product.get("name") or name,
            "sku": product.get("sku") or sku,
            "image": src or image_url,
            "b2b_price": regular_price,
            "wholesalePrice": regular_price,
            "b2c_price": b2c_price,
            "retailPrice": b2c_price,
            "stock_quantity": stock_quantity,
        }

    def delete_product_admin(self, product_id: str) -> bool:
        from live_mysql import delete_via_woocommerce_rest

        doc = self.get_product_by_uuid(product_id, enrich=False)
        wc_id = int((doc or {}).get("wc_id") or 0)
        if not wc_id:
            try:
                wc_id = int(product_id)
            except (TypeError, ValueError):
                wc_id = 0
        if not wc_id:
            return False
        result = delete_via_woocommerce_rest(wc_id, force=True)
        if not result.get("ok"):
            raise RuntimeError(result.get("error") or result.get("reason") or "Could not delete product")
        return True

    def decrement_stock(self, lines: list[dict]) -> list[dict]:
        updated = []
        for line in lines:
            pid = line.get("product_id")
            qty = int(line.get("quantity") or 0)
            doc = self.get_product_by_uuid(str(pid), enrich=False)
            if not doc:
                continue
            new_qty = max(0, int(doc.get("stock_quantity") or 0) - qty)
            u = self.update_product_stock(str(pid), new_qty)
            if u:
                updated.append(u)
        return updated


_service: CatalogService | None = None


def get_catalog_service() -> CatalogService:
    global _service
    if _service is None:
        _service = CatalogService()
    return _service
