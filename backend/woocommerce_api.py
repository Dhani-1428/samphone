"""Read and update products via the WooCommerce REST API (wc/v3)."""
from __future__ import annotations

import json
import logging
import os
import re
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from stock import apply_stock_quantity, validate_purchase_lines
from wc_pricing import extract_wc_prices
from woocommerce_classify import classify, clean_description, is_model_category, nice, phone_brand
from product_variants import extract_color_variants

logger = logging.getLogger(__name__)

# Historically some products used an e-waste logo file as a WC placeholder.
# Do NOT filter by "E-Waste"/"Recycling" in the filename — 50TEK (and others)
# upload real product photos under names like E-Waste-Recycling-Logo-21.png.
BAD_IMAGE_MARKERS = ("woocommerce-placeholder", "DISPLAY-BANNER-SAMPHONE")
CACHE_TTL = int(os.environ.get("WC_CACHE_TTL", "600"))
MODELS_CACHE_TTL = int(os.environ.get("WC_MODELS_CACHE_TTL", "3600"))
LIST_CACHE_TTL = int(os.environ.get("WC_LIST_CACHE_TTL", "120"))
# Keep low — Hostinger/hcdn rate-limits or 403s the IP when too many parallel calls hit.
FETCH_WORKERS = int(os.environ.get("WC_API_FETCH_WORKERS", "2"))
PER_PAGE = int(os.environ.get("WC_API_PER_PAGE", "50"))
SCAN_MAX_PAGES = int(os.environ.get("WC_SCAN_MAX_PAGES", "0"))  # 0 = scan all WC pages (background only)
# User-facing WC HTTP timeout — must stay well under the app AbortController budget.
LIST_GET_TIMEOUT = int(os.environ.get("WC_LIST_GET_TIMEOUT", "8"))
# Full-catalog warm may use a longer per-page timeout (background thread only).
WARM_GET_TIMEOUT = int(os.environ.get("WC_WARM_GET_TIMEOUT", "30"))
# Hard budget for any single /products request that must talk to WooCommerce live.
REQUEST_LIST_BUDGET_SEC = float(os.environ.get("WC_REQUEST_LIST_BUDGET_SEC", "2.5"))
# Never walk the whole catalog on a request thread.
SCAN_PAGES_PER_REQUEST = int(os.environ.get("WC_SCAN_PAGES_PER_REQUEST", "2"))
POOL_CONNECTIONS = int(os.environ.get("WC_HTTP_POOL_CONNECTIONS", "8"))
POOL_MAXSIZE = int(os.environ.get("WC_HTTP_POOL_MAXSIZE", "8"))
PRODUCT_LIST_FIELDS = (
    "id,name,slug,sku,type,on_sale,price,regular_price,sale_price,stock_status,stock_quantity,"
    "manage_stock,average_rating,rating_count,total_sales,categories,images,attributes,meta_data"
)
_BACKEND_DIR = Path(__file__).resolve().parent
MODELS_CACHE_FILE = _BACKEND_DIR / "models_cache.json"
MODELS_SEED_FILE = _BACKEND_DIR / "_scrape" / "models_catalog.json"
CATALOG_CACHE_FILE = _BACKEND_DIR / "_scrape" / "wc_products_cache.json.gz"
# Serve disk snapshot across reloads even if older than CACHE_TTL (refresh in background).
DISK_CACHE_MAX_AGE = int(os.environ.get("WC_DISK_CACHE_MAX_AGE", str(7 * 24 * 3600)))


def _env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


def _store_url() -> str:
    return (
        _env("WOOCOMMERCE_STORE_URL")
        or _env("WC_API_URL")
        or _env("WC_SITE_URL", "https://www.samphone.pt")
    ).rstrip("/")


def _consumer_key() -> str:
    return _env("WOOCOMMERCE_CONSUMER_KEY") or _env("WC_CONSUMER_KEY")


def _consumer_secret() -> str:
    return _env("WOOCOMMERCE_CONSUMER_SECRET") or _env("WC_CONSUMER_SECRET")


def _default_product_image() -> str:
    return (
        _env("WC_DEFAULT_PRODUCT_IMAGE")
        or f"{_store_url().rstrip('/')}/wp-content/uploads/2025/02/DISPLAY-BANNER-SAMPHONE.png"
    )


def _normalize_image_url(url: str) -> str:
    """Force https + www host so Expo Image loads reliably on device."""
    u = (url or "").strip()
    if not u:
        return u
    if u.startswith("//"):
        u = "https:" + u
    u = re.sub(r"^http://", "https://", u, flags=re.I)
    u = re.sub(r"^https://samphone\.pt/", "https://www.samphone.pt/", u, flags=re.I)
    return u


def _is_placeholder_image(url: str) -> bool:
    u = (url or "").lower()
    if not u:
        return True
    return any(
        marker in u
        for marker in (
            "display-banner-samphone",
            "woocommerce-placeholder",
            "placeholder.jpg",
            "placeholder.png",
            "placeholder.webp",
        )
    )


def _extract_image_urls(row: dict) -> list[str]:
    urls: list[str] = []
    for img in row.get("images") or []:
        src = img.get("src") if isinstance(img, dict) else None
        if not src:
            continue
        if any(marker.lower() in src.lower() for marker in BAD_IMAGE_MARKERS):
            continue
        urls.append(_normalize_image_url(src))
    # de-dupe preserve order
    seen: set[str] = set()
    out: list[str] = []
    for u in urls:
        if u and u not in seen:
            seen.add(u)
            out.append(u)
    return out


def _title_image_key(title: str) -> str:
    """Normalize title for sibling image matching (drop grade/panel words)."""
    t = re.sub(r"[^a-z0-9]+", " ", (title or "").lower())
    drop = {
        "soft", "hard", "oled", "incell", "tft", "jk", "gx", "dd", "bk", "mochi", "old",
        "service", "pack", "no", "frame", "with", "copy", "original", "premium",
    }
    parts = [p for p in t.split() if p and p not in drop and len(p) > 1]
    return " ".join(parts[:8])


@dataclass
class CatalogSnapshot:
    products: list[dict]
    by_uuid: dict[str, dict]
    by_wc_id: dict[int, dict]
    by_slug: dict[str, dict]
    loaded_at: float
    load_ms: int = 0


@dataclass
class ScanState:
    matched: list[dict] = field(default_factory=list)
    wc_page: int = 1
    total_pages: int = 1
    wc_total: int = 0
    complete: bool = False
    loaded_at: float = 0.0


class WooCommerceAPI:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._models_cache: tuple[float, list[dict], dict[int, dict]] | None = None
        self._stats_cache: tuple[float, dict] | None = None
        self._catalog_cache: CatalogSnapshot | None = None
        self._categories_cache: tuple[float, list[dict]] | None = None
        self._live_by_uuid: dict[str, dict] = {}
        self._live_by_wc_id: dict[int, dict] = {}
        self._live_by_slug: dict[str, dict] = {}
        self._pass_rate_estimate: float | None = None
        self._valid_catalog_total: int | None = None
        self._list_page_cache: dict[str, tuple[float, dict[str, Any]]] = {}
        self._scan_states: dict[str, ScanState] = {}
        self._warm_scheduled = False
        self._catalog_building = False
        self._session = requests.Session()
        adapter = HTTPAdapter(
            pool_connections=POOL_CONNECTIONS,
            pool_maxsize=max(POOL_MAXSIZE, FETCH_WORKERS + 2),
            max_retries=Retry(total=0, redirect=False),
        )
        self._session.mount("https://", adapter)
        self._session.mount("http://", adapter)
        self._refresh_auth()
        self._load_disk_catalog()

    def _refresh_auth(self) -> None:
        self._session.auth = (_consumer_key(), _consumer_secret())
        self._session.headers.update({"User-Agent": "SamphoneApp/1.0"})

    def configured(self) -> bool:
        return bool(_store_url() and _consumer_key() and _consumer_secret())

    def _api(self, path: str) -> str:
        return f"{_store_url()}/wp-json/wc/v3{path}"

    def _header_int(self, headers: dict[str, str], name: str, default: int = 0) -> int:
        for key in (name, name.lower()):
            raw = headers.get(key)
            if raw is not None:
                try:
                    return int(raw)
                except (TypeError, ValueError):
                    break
        return default

    def _get(
        self,
        path: str,
        *,
        params: Optional[dict] = None,
        timeout: int | None = None,
    ) -> tuple[Any, dict[str, str]]:
        started = time.perf_counter()
        timeout = LIST_GET_TIMEOUT if timeout is None else timeout
        for attempt in range(2):
            response = self._session.get(self._api(path), params=params or {}, timeout=timeout)
            if response.status_code == 401 and attempt == 0:
                self._refresh_auth()
                continue
            response.raise_for_status()
            ms = int((time.perf_counter() - started) * 1000)
            logger.info(
                "WC GET %s status=%s bytes=%s ms=%s attempt=%s",
                path,
                response.status_code,
                len(response.content or b""),
                ms,
                attempt + 1,
            )
            return response.json(), dict(response.headers)
        response.raise_for_status()
        return response.json(), dict(response.headers)

    def _put(self, path: str, payload: dict) -> dict:
        response = self._session.put(self._api(path), json=payload, timeout=60)
        if not response.ok:
            try:
                detail = response.json().get("message", response.text)
            except Exception:
                detail = response.text
            raise RuntimeError(detail)
        return response.json()

    def _paginate(self, path: str, *, params: Optional[dict] = None) -> list[dict]:
        base = dict(params or {})
        base.setdefault("per_page", PER_PAGE)
        page = 1
        rows: list[dict] = []
        total_pages = 1
        while page <= total_pages:
            base["page"] = page
            data, headers = self._get(path, params=base)
            if not data:
                break
            rows.extend(data)
            total_pages = self._header_int(headers, "X-WP-TotalPages", page)
            logger.info("WooCommerce API %s page %s/%s (+%s)", path, page, total_pages, len(data))
            page += 1
        return rows

    def _paginate_parallel(self, path: str, *, params: Optional[dict] = None, timeout: int | None = None) -> list[dict]:
        base = dict(params or {})
        base.setdefault("per_page", PER_PAGE)
        base["page"] = 1
        page_timeout = WARM_GET_TIMEOUT if timeout is None else timeout
        first, headers = self._get(path, params=base, timeout=page_timeout)
        if not first:
            return []
        total_pages = self._header_int(headers, "X-WP-TotalPages", 1)
        rows = list(first)
        if total_pages <= 1:
            return rows

        def fetch_page(page: int) -> list[dict]:
            page_params = dict(base)
            page_params["page"] = page
            data, _ = self._get(path, params=page_params, timeout=page_timeout)
            return data or []

        workers = max(1, min(FETCH_WORKERS, total_pages - 1))
        with ThreadPoolExecutor(max_workers=workers) as pool:
            futures = {pool.submit(fetch_page, p): p for p in range(2, total_pages + 1)}
            for future in as_completed(futures):
                page = futures[future]
                try:
                    rows.extend(future.result())
                    logger.info("WooCommerce API %s page %s/%s done", path, page, total_pages)
                except Exception as exc:
                    logger.warning("WooCommerce API page %s failed: %s", page, exc)
                    raise
        return rows

    def _catalog_cache_ready(self) -> bool:
        # Any in-memory snapshot is servable; TTL only controls background refresh.
        return bool(self._catalog_cache)

    def _catalog_needs_refresh(self) -> bool:
        snap = self._catalog_cache
        if not snap:
            return True
        return time.time() - snap.loaded_at >= CACHE_TTL

    def _snapshot_from_products(self, products: list[dict], *, loaded_at: float, load_ms: int = 0) -> CatalogSnapshot:
        by_uuid = {p["id"]: p for p in products}
        by_wc_id = {int(p["wc_id"]): p for p in products if p.get("wc_id") is not None}
        by_slug = {p["slug"]: p for p in products if p.get("slug")}
        return CatalogSnapshot(
            products=products,
            by_uuid=by_uuid,
            by_wc_id=by_wc_id,
            by_slug=by_slug,
            loaded_at=loaded_at,
            load_ms=load_ms,
        )

    def _load_disk_catalog(self) -> None:
        path = CATALOG_CACHE_FILE
        if not path.exists():
            return
        try:
            import gzip

            age = time.time() - path.stat().st_mtime
            if age > DISK_CACHE_MAX_AGE:
                logger.info("Skipping stale disk catalog cache (age=%ss)", int(age))
                return
            with gzip.open(path, "rt", encoding="utf-8") as fh:
                payload = json.load(fh)
            products = payload.get("products") if isinstance(payload, dict) else payload
            if not isinstance(products, list) or not products:
                return
            loaded_at = float(payload.get("loaded_at") or path.stat().st_mtime) if isinstance(payload, dict) else path.stat().st_mtime
            self._catalog_cache = self._snapshot_from_products(products, loaded_at=loaded_at)
            logger.info(
                "Loaded WooCommerce catalog from disk: %s products (age=%ss)",
                len(products),
                int(time.time() - loaded_at),
            )
        except Exception as exc:
            logger.warning("Could not load disk catalog cache: %s", exc)

    def _save_disk_catalog(self, snap: CatalogSnapshot) -> None:
        path = CATALOG_CACHE_FILE
        try:
            import gzip

            path.parent.mkdir(parents=True, exist_ok=True)
            tmp = path.with_suffix(path.suffix + ".tmp")
            payload = {"loaded_at": snap.loaded_at, "products": snap.products}
            with gzip.open(tmp, "wt", encoding="utf-8") as fh:
                json.dump(payload, fh, ensure_ascii=False, separators=(",", ":"))
            tmp.replace(path)
            logger.info("Wrote WooCommerce catalog disk cache (%s products)", len(snap.products))
        except Exception as exc:
            logger.warning("Could not write disk catalog cache: %s", exc)

    def _schedule_catalog_warm(self) -> None:
        if not self._catalog_needs_refresh() or self._warm_scheduled:
            return
        self._warm_scheduled = True

        def _run() -> None:
            try:
                # Keep serving existing/disk snapshot while a fresh fetch runs.
                self._ensure_catalog(force=True)
                count = len(self._catalog_cache.products) if self._catalog_cache else 0
                logger.info("WooCommerce catalog warm finished (%s products)", count)
            except Exception as exc:
                logger.warning("Background catalog warm failed: %s", exc)
            finally:
                self._warm_scheduled = False

        threading.Thread(target=_run, daemon=True, name="wc-catalog-warm").start()

    def warm_catalog(self) -> dict[str, Any]:
        snap = self._ensure_catalog(force=True)
        return {
            "ok": True,
            "products": len(snap.products),
            "load_ms": snap.load_ms,
            "cached_until": snap.loaded_at + CACHE_TTL,
        }

    def health(self) -> dict[str, Any]:
        if not self.configured():
            return {
                "ok": False,
                "configured": False,
                "error": "Set WOOCOMMERCE_STORE_URL, WOOCOMMERCE_CONSUMER_KEY, WOOCOMMERCE_CONSUMER_SECRET",
            }
        try:
            _, headers = self._get("/products", params={"per_page": 1, "status": "publish"})
            total = self._header_int(headers, "X-WP-Total")
            snap = self._catalog_cache
            return {
                "ok": True,
                "configured": True,
                "store_url": _store_url(),
                "published_products": total,
                "catalog_cached": bool(snap),
                "catalog_products": len(snap.products) if snap else 0,
                "catalog_age_sec": int(time.time() - snap.loaded_at) if snap else None,
                "source": "woocommerce_rest",
            }
        except Exception as exc:
            return {"ok": False, "configured": True, "error": str(exc), "source": "woocommerce_rest"}

    def stats(self) -> dict[str, Any]:
        now = time.time()
        if self._stats_cache and now - self._stats_cache[0] < CACHE_TTL:
            return self._stats_cache[1]
        _, headers = self._get("/products", params={"per_page": 1, "status": "publish"})
        products = self._header_int(headers, "X-WP-Total")
        categories = len(self._paginate("/products/categories"))
        models, _ = self._load_models()
        snap = self._catalog_cache
        out = {
            "published_products": products,
            "product_categories": categories,
            "phone_models": len(models),
            "catalog_cached": len(snap.products) if snap else 0,
            "uploads_base_url": f"{_store_url()}/wp-content/uploads/",
            "source": "woocommerce_rest",
        }
        self._stats_cache = (now, out)
        return out

    def _read_models_file(self) -> tuple[list[dict], dict[int, dict]] | None:
        for path in (MODELS_CACHE_FILE, MODELS_SEED_FILE):
            if not path.is_file():
                continue
            try:
                raw = json.loads(path.read_text(encoding="utf-8"))
                if not isinstance(raw, list) or not raw:
                    continue
                models: list[dict] = []
                model_ids: dict[int, dict] = {}
                for row in raw:
                    entry = dict(row)
                    entry["wc_id"] = int(entry["wc_id"])
                    entry["count"] = int(entry.get("count") or 0)
                    models.append(entry)
                    model_ids[entry["wc_id"]] = entry
                models.sort(key=lambda m: (m.get("brand", ""), m.get("name", "")))
                logger.info("Loaded %s phone models from %s", len(models), path.name)
                return models, model_ids
            except Exception as exc:
                logger.warning("Failed to read models file %s: %s", path, exc)
        return None

    def _write_models_cache(self, models: list[dict]) -> None:
        try:
            MODELS_CACHE_FILE.write_text(json.dumps(models, ensure_ascii=False), encoding="utf-8")
        except Exception as exc:
            logger.warning("Failed to write models cache: %s", exc)

    def _refresh_models_async(self) -> None:
        def run() -> None:
            try:
                self._fetch_models_from_api()
            except Exception as exc:
                logger.warning("Background model refresh failed: %s", exc)

        threading.Thread(target=run, daemon=True).start()

    def _fetch_models_from_api(self) -> tuple[list[dict], dict[int, dict]]:
        models: list[dict] = []
        model_ids: dict[int, dict] = {}
        for row in self._paginate_parallel("/products/categories"):
            name = (row.get("name") or "").strip()
            count = int(row.get("count") or 0)
            if not is_model_category(name, count):
                continue
            brand = phone_brand(name)
            entry = {
                "wc_id": int(row["id"]),
                "brand": brand,
                "name": name,
                "slug": row.get("slug") or "",
                "count": count,
            }
            models.append(entry)
            model_ids[entry["wc_id"]] = entry

        models.sort(key=lambda m: (m["brand"], m["name"]))
        now = time.time()
        self._models_cache = (now, models, model_ids)
        self._write_models_cache(models)
        logger.info("WooCommerce model index refreshed from API: %s models", len(models))
        return models, model_ids

    def _load_models(self) -> tuple[list[dict], dict[int, dict]]:
        now = time.time()
        if self._models_cache and now - self._models_cache[0] < MODELS_CACHE_TTL:
            return self._models_cache[1], self._models_cache[2]

        file_models = self._read_models_file()
        if file_models:
            models, model_ids = file_models
            self._models_cache = (now, models, model_ids)
            self._refresh_models_async()
            return models, model_ids

        return self._fetch_models_from_api()

    def list_models(self, brand: Optional[str] = None) -> list[dict]:
        models, _ = self._load_models()
        if brand:
            return [m for m in models if m["brand"].lower() == brand.lower()]
        return models

    def brand_models(self, brand: str) -> list[dict]:
        from model_sort import model_rank

        items = []
        for m in self.list_models(brand):
            row = dict(m)
            row["count"] = int(m.get("count") or 0)
            items.append(row)
        items.sort(key=lambda m: (-model_rank(m["name"]), m["name"]))
        return items

    def list_categories(self, parent: Optional[int] = None) -> list[dict]:
        now = time.time()
        if parent is None and self._categories_cache and now - self._categories_cache[0] < CACHE_TTL:
            return self._categories_cache[1]

        rows = self._paginate_parallel("/products/categories")
        if parent is not None:
            rows = [r for r in rows if int(r.get("parent") or 0) == parent]
        out = [
            {
                "wc_id": int(r["id"]),
                "name": r.get("name") or "",
                "slug": r.get("slug") or "",
                "parent": int(r.get("parent") or 0),
                "count": int(r.get("count") or 0),
            }
            for r in rows
        ]
        out.sort(key=lambda r: r["name"])
        if parent is None:
            self._categories_cache = (now, out)
        return out

    def _product_price(self, row: dict) -> float:
        return float(extract_wc_prices(row).get("price") or 0)

    def _prepare_products(self, products: list[dict], user: Optional[dict]) -> list[dict]:
        from stock import normalize_stock
        from wholesale import enrich_product_pricing, sanitize_products

        tier = (user or {}).get("dealerTier") or "standard"
        enriched = [enrich_product_pricing(normalize_stock(dict(p)), tier) for p in products]
        return sanitize_products(enriched, user)

    def _product_stock(self, row: dict) -> tuple[int, bool]:
        from stock import UNMANAGED_IN_STOCK_QTY

        status = str(row.get("stock_status") or "instock").lower()
        if row.get("manage_stock"):
            qty = max(0, int(row.get("stock_quantity") or 0))
            return qty, qty > 0
        if status == "instock":
            # No WC quantity tracking — allow orders until marked out of stock.
            return UNMANAGED_IN_STOCK_QTY, True
        return 0, False

    def _build_product_doc(self, row: dict, model_ids: dict[int, dict], *, include_description: bool = False) -> Optional[dict]:
        wc_id = int(row["id"])
        title_raw = (row.get("name") or "").strip()
        if not title_raw:
            return None

        categories = [
            {"wc_id": int(c["id"]), "name": c.get("name") or "", "slug": c.get("slug") or ""}
            for c in row.get("categories") or []
        ]
        cat_names = [c["name"] for c in categories]
        meta_cls = classify(title_raw, cat_names)

        model_name = ""
        model_wc_id = None
        for c in categories:
            cid = int(c["wc_id"])
            if cid in model_ids:
                model_name = model_ids[cid]["name"]
                model_wc_id = cid
                break

        brand = meta_cls.get("brand") or phone_brand(title_raw)
        if brand == "Other" and model_name and model_wc_id:
            brand = model_ids[model_wc_id]["brand"]
        if brand == "Other":
            brand = phone_brand(" ".join(cat_names))

        price = self._product_price(row)
        pricing = extract_wc_prices(row)
        price_on_request = bool(pricing.get("price_on_request"))
        if price_on_request:
            price = 0.0

        images = _extract_image_urls(row)
        if not images:
            images = [_normalize_image_url(_default_product_image())]

        color_variants = extract_color_variants(row)
        variant_labels = [v["label"] for v in color_variants]

        stock_quantity, in_stock = self._product_stock(row)
        title = nice(title_raw)
        sku = row.get("sku") or ""
        rating = round(float(row.get("average_rating") or 0), 1)
        reviews = int(row.get("rating_count") or 0)
        total_sales = int(row.get("total_sales") or 0)

        description = ""
        if include_description:
            content = row.get("description") or row.get("short_description") or ""
            description = clean_description(content) or f"{title} — available at Samphone, Lisboa."

        return {
            "id": str(uuid.uuid5(uuid.NAMESPACE_URL, f"samphone:{wc_id}")),
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
            "sku": sku,
            "price": round(price, 2),
            "regularPrice": pricing.get("regularPrice", round(price, 2)),
            "salePrice": pricing.get("salePrice"),
            "on_sale": bool(pricing.get("on_sale")),
            "price_on_request": price_on_request,
            **({"wholesalePrice": pricing["wholesalePrice"]} if pricing.get("wholesalePrice") else {}),
            "image": images[0],
            "images": images,
            "best_seller": False,
            "new_arrival": False,
            "rating": rating,
            "reviews": reviews,
            "description": description,
            "specs": {
                "Condition": "New",
                "Brand": brand,
                **({"SKU": sku} if sku else {}),
            },
            # Country of Origin is intentionally omitted from public specs.
            "color_variants": color_variants,
            "variants": variant_labels,
            "product_type": row.get("type") or "simple",
            "in_stock": in_stock,
            "stock_quantity": stock_quantity,
            "manage_stock": bool(row.get("manage_stock")),
            "_total_sales": total_sales,
        }

    def _assign_promo_flags(self, products: list[dict]) -> None:
        if not products:
            return
        by_sales = sorted(products, key=lambda p: int(p.get("_total_sales") or 0), reverse=True)
        for p in by_sales[:24]:
            p["best_seller"] = True
        by_new = sorted(products, key=lambda p: int(p.get("wc_id") or 0), reverse=True)
        for p in by_new[:24]:
            p["new_arrival"] = True

    def _enrich_missing_images(self, products: list[dict]) -> None:
        """Fill products that have no WooCommerce image using similar catalog items."""
        by_model_leaf: dict[tuple[Any, str], str] = {}
        by_model_part: dict[tuple[Any, str], str] = {}
        by_model: dict[Any, str] = {}
        by_title_key: dict[str, str] = {}
        by_brand_leaf: dict[tuple[str, str], str] = {}

        def remember(bucket: dict, key: Any, url: str) -> None:
            if key is None or key == ("",) or key == "":
                return
            if isinstance(key, tuple) and not any(key):
                return
            bucket.setdefault(key, url)

        for p in products:
            img = _normalize_image_url(p.get("image") or "")
            if not img or _is_placeholder_image(img):
                continue
            p["image"] = img
            imgs = [_normalize_image_url(u) for u in (p.get("images") or [img]) if u]
            p["images"] = imgs or [img]
            model_key = p.get("model_wc_id") or (p.get("model") or "").strip().lower()
            leaf = (p.get("leaf_category") or "").strip().lower()
            part = (p.get("part_type") or "").strip().lower()
            brand = (p.get("brand") or "").strip().lower()
            remember(by_model_leaf, (model_key, leaf), img)
            remember(by_model_part, (model_key, part), img)
            remember(by_model, model_key, img)
            remember(by_brand_leaf, (brand, leaf), img)
            tk = _title_image_key(p.get("title") or "")
            if tk:
                remember(by_title_key, tk, img)

        filled = 0
        for p in products:
            img = p.get("image") or ""
            if img and not _is_placeholder_image(img):
                p["image"] = _normalize_image_url(img)
                p["images"] = [_normalize_image_url(u) for u in (p.get("images") or [img]) if u] or [p["image"]]
                continue
            model_key = p.get("model_wc_id") or (p.get("model") or "").strip().lower()
            leaf = (p.get("leaf_category") or "").strip().lower()
            part = (p.get("part_type") or "").strip().lower()
            brand = (p.get("brand") or "").strip().lower()
            candidate = (
                by_model_leaf.get((model_key, leaf))
                or by_model_part.get((model_key, part))
                or by_title_key.get(_title_image_key(p.get("title") or ""))
                or by_model.get(model_key)
                or by_brand_leaf.get((brand, leaf))
            )
            if candidate:
                p["image"] = candidate
                p["images"] = [candidate]
                filled += 1
            else:
                fallback = _normalize_image_url(_default_product_image())
                p["image"] = fallback
                p["images"] = [fallback]
        if filled:
            logger.info("Enriched images for %s products from similar catalog items", filled)

    def _apply_catalog_images(self, products: list[dict]) -> None:
        """When catalog is warm, replace placeholders using the enriched snapshot."""
        snap = self._catalog_cache
        if not snap or not products:
            self._enrich_missing_images(products)
            return
        filled = 0
        for p in products:
            if not _is_placeholder_image(p.get("image") or ""):
                p["image"] = _normalize_image_url(p.get("image") or "")
                continue
            cached = None
            wc_id = p.get("wc_id")
            if wc_id is not None:
                cached = snap.by_wc_id.get(int(wc_id))
            if not cached and p.get("id"):
                cached = snap.by_uuid.get(str(p["id"]))
            if cached and not _is_placeholder_image(cached.get("image") or ""):
                p["image"] = cached["image"]
                p["images"] = list(cached.get("images") or [cached["image"]])
                filled += 1
        if filled:
            logger.debug("Applied catalog images to %s live/scan products", filled)
        still = [p for p in products if _is_placeholder_image(p.get("image") or "")]
        if still:
            self._enrich_missing_images(products)

    def _strip_internal(self, products: list[dict]) -> list[dict]:
        out = []
        for p in products:
            doc = dict(p)
            doc.pop("_total_sales", None)
            out.append(doc)
        return out

    def _build_catalog_snapshot(self) -> CatalogSnapshot:
        started = time.time()
        _, model_ids = self._load_models()
        # Request only list fields — full WC product payloads are huge and slow to parse.
        raw_products = self._paginate_parallel(
            "/products",
            params=self._product_list_params({"status": "publish"}),
            timeout=WARM_GET_TIMEOUT,
        )

        products: list[dict] = []
        for row in raw_products:
            doc = self._build_product_doc(row, model_ids)
            if doc:
                products.append(doc)

        self._enrich_missing_images(products)
        self._assign_promo_flags(products)
        products = self._strip_internal(products)

        by_uuid = {p["id"]: p for p in products}
        by_wc_id = {int(p["wc_id"]): p for p in products}
        by_slug = {p["slug"]: p for p in products if p.get("slug")}

        load_ms = int((time.time() - started) * 1000)
        logger.info("WooCommerce REST catalog cached: %s products in %sms", len(products), load_ms)
        snap = CatalogSnapshot(
            products=products,
            by_uuid=by_uuid,
            by_wc_id=by_wc_id,
            by_slug=by_slug,
            loaded_at=time.time(),
            load_ms=load_ms,
        )
        self._save_disk_catalog(snap)
        return snap

    def _invalidate_list_caches(self) -> None:
        self._list_page_cache.clear()
        self._scan_states.clear()

    def _ensure_catalog(self, force: bool = False) -> CatalogSnapshot:
        # Prefer serving whatever we have; refresh happens in the background.
        if self._catalog_cache and not force:
            if time.time() - self._catalog_cache.loaded_at >= CACHE_TTL:
                self._schedule_catalog_warm()
            return self._catalog_cache

        with self._lock:
            if self._catalog_cache and not force:
                return self._catalog_cache
            if self._catalog_building:
                should_build = False
            else:
                should_build = True
                self._catalog_building = True
                if force:
                    # Keep serving the previous snapshot until the new one is ready.
                    self._invalidate_list_caches()

        if not should_build:
            # Another thread is building — serve existing snapshot if present.
            # NEVER block a request thread for minutes waiting on a full WC warm.
            if self._catalog_cache:
                return self._catalog_cache
            raise RuntimeError("Catalog warm in progress")

        try:
            # Build without holding the lock so product APIs stay responsive.
            snap = self._build_catalog_snapshot()
            with self._lock:
                self._catalog_cache = snap
                self._invalidate_list_caches()
                return snap
        finally:
            with self._lock:
                self._catalog_building = False

    def _remember_live(self, doc: dict) -> None:
        self._live_by_uuid[doc["id"]] = doc
        self._live_by_wc_id[int(doc["wc_id"])] = doc
        if doc.get("slug"):
            self._live_by_slug[doc["slug"]] = doc

    def _lookup_product(
        self,
        *,
        product_id: Optional[str] = None,
        wc_id: Optional[int] = None,
        slug: Optional[str] = None,
    ) -> Optional[dict]:
        if product_id:
            doc = self._live_by_uuid.get(product_id)
            if doc:
                return doc
        if wc_id is not None:
            doc = self._live_by_wc_id.get(int(wc_id))
            if doc:
                return doc
        if slug:
            doc = self._live_by_slug.get(slug)
            if doc:
                return doc
        snap = self._catalog_cache
        if snap:
            if product_id and product_id in snap.by_uuid:
                return snap.by_uuid[product_id]
            if wc_id is not None and int(wc_id) in snap.by_wc_id:
                return snap.by_wc_id[int(wc_id)]
            if slug and slug in snap.by_slug:
                return snap.by_slug[slug]
        if product_id:
            import memory_store

            seed = memory_store.get_product(product_id)
            if seed:
                wc = seed.get("wc_id")
                if wc:
                    fetched = self._fetch_single_product(int(wc), include_description=True)
                    if fetched:
                        return fetched
                return seed
        if wc_id is not None:
            return self._fetch_single_product(int(wc_id))
        return None

    def _fetch_single_product(self, wc_id: int, *, include_description: bool = False) -> Optional[dict]:
        try:
            row, _ = self._get(f"/products/{wc_id}")
        except Exception as exc:
            logger.warning("WooCommerce product %s fetch failed: %s", wc_id, exc)
            return None
        _, model_ids = self._load_models()
        doc = self._build_product_doc(row, model_ids, include_description=include_description)
        if doc:
            self._remember_live(doc)
        return doc

    def _match_regex(self, value: str, pattern: str) -> bool:
        return bool(re.search(pattern, value or "", re.I))

    def _apply_post_filters(
        self,
        products: list[dict],
        *,
        q: Optional[str] = None,
        category: Optional[str] = None,
        brand: Optional[str] = None,
        subcategory: Optional[str] = None,
        model: Optional[str] = None,
        model_wc_id: Optional[int] = None,
        leaf_category: Optional[str] = None,
        category_group: Optional[str] = None,
        in_stock: Optional[bool] = None,
        skip_q: bool = False,
    ) -> list[dict]:
        from category_groups import (
            filter_by_group,
            filter_by_leaf,
            is_accessory_product,
            normalize_group_title,
            resolve_group_title,
        )
        from model_match import filter_by_model

        out = products
        if category:
            if category == "Accessories":
                out = [p for p in out if is_accessory_product(p)]
            elif category == "Cards":
                from category_groups import is_cards_product

                out = [p for p in out if is_cards_product(p)]
            else:
                out = [p for p in out if p.get("category") == category]
        if brand and model_wc_id is None:
            out = [p for p in out if p.get("brand") == brand]
        if subcategory:
            out = [p for p in out if p.get("subcategory") == subcategory]
        if model_wc_id is not None or model:
            out = filter_by_model(out, brand, model, model_wc_id)
        if leaf_category:
            out = filter_by_leaf(out, leaf_category)
        if category_group:
            out = filter_by_group(out, normalize_group_title(category_group) or category_group)
        if in_stock is not None:
            out = [p for p in out if bool(p.get("in_stock")) == in_stock]
        if q and not skip_q:
            group_title = resolve_group_title(q)
            if group_title:
                out = filter_by_group(out, group_title)
            else:
                from weighted_search import build_search_terms, product_matches_any

                terms = build_search_terms(q)
                expanded = terms.get("expanded") or [q.strip().lower()]
                required = terms.get("required_tokens") or []
                out = [
                    p
                    for p in out
                    if product_matches_any(
                        title=str(p.get("title") or p.get("name") or ""),
                        sku=str(p.get("sku") or ""),
                        categories=[
                            str(p.get("category") or ""),
                            str(p.get("subcategory") or ""),
                            str(p.get("leaf_category") or ""),
                        ],
                        brand=str(p.get("brand") or ""),
                        attributes=[str(p.get("model") or ""), str(p.get("part_type") or "")],
                        expanded=expanded,
                        required_tokens=required,
                    )
                ]
        return out

    def _needs_post_filter_scan(
        self,
        *,
        q: Optional[str] = None,
        category: Optional[str] = None,
        subcategory: Optional[str] = None,
        model: Optional[str] = None,
        model_wc_id: Optional[int] = None,
        leaf_category: Optional[str] = None,
        category_group: Optional[str] = None,
    ) -> bool:
        from category_groups import resolve_group_title

        if category or subcategory or leaf_category or category_group:
            return True
        if model and model_wc_id is None:
            return True
        if q and resolve_group_title(q):
            return True
        return False

    def _wc_page_cap(self, total_pages: int) -> int:
        if SCAN_MAX_PAGES <= 0:
            return total_pages
        return min(total_pages, SCAN_MAX_PAGES)

    def _list_cache_key(self, **kwargs: Any) -> str:
        payload = {k: v for k, v in sorted(kwargs.items()) if v is not None and v != ""}
        return json.dumps(payload, sort_keys=True, default=str)

    def _list_cache_get(self, key: str) -> Optional[dict[str, Any]]:
        row = self._list_page_cache.get(key)
        if not row:
            return None
        loaded_at, data = row
        if time.time() - loaded_at > LIST_CACHE_TTL:
            self._list_page_cache.pop(key, None)
            return None
        return data

    def _list_cache_set(self, key: str, data: dict[str, Any]) -> None:
        self._list_page_cache[key] = (time.time(), data)
        if len(self._list_page_cache) > 256:
            oldest = min(self._list_page_cache, key=lambda k: self._list_page_cache[k][0])
            self._list_page_cache.pop(oldest, None)

    def _scan_cache_key(self, **kwargs: Any) -> str:
        return self._list_cache_key(**kwargs)

    def _product_list_params(self, params: dict[str, Any]) -> dict[str, Any]:
        out = dict(params)
        out["_fields"] = PRODUCT_LIST_FIELDS
        return out

    def _estimate_valid_total(self, wc_total: int, matched: int, raw_seen: int) -> int:
        if raw_seen > 0:
            rate = matched / raw_seen
            self._pass_rate_estimate = rate
            estimated = max(matched, int(wc_total * rate))
            return estimated
        if self._pass_rate_estimate:
            return max(matched, int(wc_total * self._pass_rate_estimate))
        return wc_total

    def _resolve_list_total(self, *, wc_total: int, matched: list[dict], raw_seen: int, full_scan: bool) -> int:
        if full_scan:
            self._valid_catalog_total = len(matched)
            return len(matched)
        if self._valid_catalog_total:
            return max(len(matched), self._valid_catalog_total)
        return self._estimate_valid_total(wc_total, len(matched), raw_seen)

    def _rows_to_products(self, rows: list[dict], model_ids: dict[int, dict]) -> list[dict]:
        products: list[dict] = []
        for row in rows:
            doc = self._build_product_doc(row, model_ids)
            if doc:
                self._remember_live(doc)
                products.append(doc)
        self._apply_catalog_images(products)
        return products

    def _wc_list_params(
        self,
        *,
        q: Optional[str] = None,
        brand: Optional[str] = None,
        model: Optional[str] = None,
        model_wc_id: Optional[int] = None,
        category: Optional[str] = None,
        category_group: Optional[str] = None,
        leaf_category: Optional[str] = None,
        in_stock: Optional[bool] = None,
        best_seller: Optional[bool] = None,
        new_arrival: Optional[bool] = None,
        per_page: int,
        page: int,
    ) -> dict:
        from catalog_sort import wc_price_order

        params: dict[str, Any] = {"status": "publish", "per_page": per_page, "page": page}
        if q:
            params["search"] = q
        elif model_wc_id is not None:
            params["category"] = str(model_wc_id)
        elif brand:
            params["search"] = brand
        if in_stock:
            params["stock_status"] = "instock"
        if best_seller:
            params["orderby"] = "popularity"
            params["order"] = "desc"
        elif new_arrival:
            params["orderby"] = "date"
            params["order"] = "desc"
        else:
            price_order = wc_price_order(
                category=category,
                category_group=category_group,
                leaf_category=leaf_category,
                model=model,
                model_wc_id=model_wc_id,
                best_seller=best_seller,
                new_arrival=new_arrival,
            )
            if price_order:
                params["orderby"], params["order"] = price_order
        return params

    def _filter_products_wc_direct(
        self,
        *,
        q: Optional[str] = None,
        category: Optional[str] = None,
        brand: Optional[str] = None,
        model: Optional[str] = None,
        model_wc_id: Optional[int] = None,
        category_group: Optional[str] = None,
        leaf_category: Optional[str] = None,
        in_stock: Optional[bool] = None,
        best_seller: Optional[bool] = None,
        new_arrival: Optional[bool] = None,
        limit: int,
        offset: int,
        user: Optional[dict] = None,
    ) -> dict[str, Any]:
        from catalog_pagination import clamp_page, product_page
        from catalog_sort import sort_products

        lim, off = clamp_page(limit, offset, model_query=model_wc_id is not None or bool(model))
        cache_key = self._list_cache_key(
            mode="direct-v2",
            q=q,
            category=category,
            brand=brand,
            model=model,
            model_wc_id=model_wc_id,
            category_group=category_group,
            leaf_category=leaf_category,
            in_stock=in_stock,
            best_seller=best_seller,
            new_arrival=new_arrival,
            limit=lim,
            offset=off,
        )
        cached = self._list_cache_get(cache_key)
        if cached:
            cached = dict(cached)
            cached["items"] = self._prepare_products(cached.get("items") or [], user)
            return cached

        _, model_ids = self._load_models()
        wc_per_page = min(lim, PER_PAGE)
        wc_page = (off // wc_per_page) + 1
        matched: list[dict] = []
        wc_total = 0
        page = wc_page
        # At most one extra WC page — keep request under REQUEST_LIST_BUDGET_SEC.
        max_extra_pages = 1
        deadline = time.perf_counter() + REQUEST_LIST_BUDGET_SEC
        started = time.perf_counter()

        while len(matched) < lim and page <= wc_page + max_extra_pages:
            if time.perf_counter() >= deadline:
                logger.warning(
                    "WC direct list budget exceeded after %sms (matched=%s)",
                    int((time.perf_counter() - started) * 1000),
                    len(matched),
                )
                break
            params = self._wc_list_params(
                q=q,
                brand=brand,
                model=model,
                model_wc_id=model_wc_id,
                category=category,
                category_group=category_group,
                leaf_category=leaf_category,
                in_stock=in_stock,
                best_seller=best_seller,
                new_arrival=new_arrival,
                per_page=wc_per_page,
                page=page,
            )
            data, headers = self._get(
                "/products",
                params=self._product_list_params(params),
                timeout=LIST_GET_TIMEOUT,
            )
            if page == wc_page:
                wc_total = self._header_int(headers, "X-WP-Total")
            if not data:
                break

            batch = self._rows_to_products(data or [], model_ids)
            batch = self._apply_post_filters(
                batch,
                brand=brand,
                model=model,
                model_wc_id=model_wc_id,
                leaf_category=leaf_category,
                in_stock=in_stock,
                skip_q=bool(q),
            )
            matched.extend(batch)
            if len(matched) >= lim:
                break
            page += 1

        matched = sort_products(
            matched,
            category=category,
            category_group=category_group,
            leaf_category=leaf_category,
            model=model,
            model_wc_id=model_wc_id,
        )
        page_items = matched[:lim]
        result = product_page(
            self._prepare_products(page_items, user),
            wc_total,
            limit=lim,
            offset=off,
            model_query=model_wc_id is not None or bool(model),
        )
        logger.info(
            "WC direct list done ms=%s items=%s total=%s q=%r brand=%r",
            int((time.perf_counter() - started) * 1000),
            len(page_items),
            wc_total,
            q,
            brand,
        )
        self._list_cache_set(cache_key, {**result, "items": list(page_items)})
        return result

    def _filter_products_scan(
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
        in_stock: Optional[bool] = None,
        limit: int,
        offset: int,
        user: Optional[dict] = None,
    ) -> dict[str, Any]:
        from catalog_pagination import clamp_page, product_page
        from catalog_sort import sort_products, wc_price_order

        lim, off = clamp_page(limit, offset, model_query=model_wc_id is not None or bool(model))
        need = off + lim
        scan_key = self._scan_cache_key(
            mode="scan",
            q=q,
            category=category,
            brand=brand,
            subcategory=subcategory,
            model=model,
            model_wc_id=model_wc_id,
            leaf_category=leaf_category,
            category_group=category_group,
            in_stock=in_stock,
        )
        now = time.time()
        state = self._scan_states.get(scan_key)
        if state and now - state.loaded_at > LIST_CACHE_TTL:
            self._scan_states.pop(scan_key, None)
            state = None
        if state is None:
            state = ScanState(loaded_at=now)
            self._scan_states[scan_key] = state

        _, model_ids = self._load_models()
        params: dict[str, Any] = {"status": "publish", "per_page": PER_PAGE}
        if q:
            from category_groups import resolve_group_title

            if not resolve_group_title(q):
                params["search"] = q
        elif category_group:
            from category_groups import group_wc_search_term

            term = group_wc_search_term(category_group)
            if term:
                params["search"] = term
        elif leaf_category:
            from category_groups import leaf_wc_search_term

            term = leaf_wc_search_term(leaf_category)
            if term:
                params["search"] = term
        price_order = wc_price_order(
            category=category,
            category_group=category_group,
            leaf_category=leaf_category,
            model=model,
            model_wc_id=model_wc_id,
        )
        if price_order and not params.get("search"):
            params["orderby"], params["order"] = price_order

        pages_this_request = 0
        max_pages_per_request = max(1, SCAN_PAGES_PER_REQUEST)
        deadline = time.perf_counter() + REQUEST_LIST_BUDGET_SEC
        started = time.perf_counter()

        while (
            len(state.matched) < need
            and not state.complete
            and pages_this_request < max_pages_per_request
            and state.wc_page <= self._wc_page_cap(state.total_pages)
        ):
            if time.perf_counter() >= deadline:
                logger.warning(
                    "WC scan budget exceeded after %sms (matched=%s page=%s)",
                    int((time.perf_counter() - started) * 1000),
                    len(state.matched),
                    state.wc_page,
                )
                break
            params["page"] = state.wc_page
            data, headers = self._get(
                "/products",
                params=self._product_list_params(params),
                timeout=LIST_GET_TIMEOUT,
            )
            if state.wc_page == 1:
                state.wc_total = self._header_int(headers, "X-WP-Total")
                state.total_pages = self._header_int(headers, "X-WP-TotalPages", 1)
            if not data:
                state.complete = True
                break

            batch = self._rows_to_products(data, model_ids)
            state.matched.extend(
                self._apply_post_filters(
                    batch,
                    q=q,
                    category=category,
                    brand=brand,
                    subcategory=subcategory,
                    model=model,
                    model_wc_id=model_wc_id,
                    leaf_category=leaf_category,
                    category_group=category_group,
                    in_stock=in_stock,
                )
            )
            if state.wc_page >= self._wc_page_cap(state.total_pages):
                state.complete = True
            else:
                state.wc_page += 1
            pages_this_request += 1

        state.loaded_at = now
        if len(self._scan_states) > 64:
            oldest = min(self._scan_states, key=lambda k: self._scan_states[k].loaded_at)
            self._scan_states.pop(oldest, None)

        matched = sort_products(
            state.matched,
            category=category,
            category_group=category_group,
            leaf_category=leaf_category,
            model=model,
            model_wc_id=model_wc_id,
        )
        total = len(matched) if state.complete else self._estimate_valid_total(
            state.wc_total,
            len(matched),
            state.wc_page * PER_PAGE,
        )
        if state.complete:
            self._valid_catalog_total = len(matched)
        page_items = matched[off : off + lim]
        return product_page(
            self._prepare_products(page_items, user),
            total,
            limit=lim,
            offset=off,
            model_query=model_wc_id is not None or bool(model),
        )

    def _filter_products_for_model(
        self,
        *,
        brand: Optional[str] = None,
        model: Optional[str] = None,
        model_wc_id: Optional[int] = None,
        leaf_category: Optional[str] = None,
        in_stock: Optional[bool] = None,
        best_seller: Optional[bool] = None,
        new_arrival: Optional[bool] = None,
        limit: int = 48,
        offset: int = 0,
        user: Optional[dict] = None,
    ) -> dict[str, Any]:
        """Model page fallback while catalog warms: WC category id, then name search."""
        from model_match import model_aliases, resolve_model_name

        # Prefer WooCommerce model category id (reliable) over free-text search.
        if model_wc_id is not None:
            try:
                page = self._filter_products_wc_direct(
                    brand=brand,
                    model=model,
                    model_wc_id=model_wc_id,
                    leaf_category=leaf_category,
                    in_stock=in_stock,
                    best_seller=best_seller,
                    new_arrival=new_arrival,
                    limit=limit,
                    offset=offset,
                    user=user,
                )
                if int(page.get("total") or 0) > 0 or page.get("items"):
                    return page
            except Exception as exc:
                logger.warning("WooCommerce model category list failed: %s", exc)

        _, model_ids = self._load_models()
        model_name = resolve_model_name(brand, model, model_wc_id)
        if not model_name and model_wc_id is not None and model_wc_id in model_ids:
            model_name = model_ids[model_wc_id].get("name") or ""

        # Shorter aliases search better than full "Samsung Galaxy … (X200/X205)" strings.
        aliases = list(model_aliases(model_name or "", brand or "")) if model_name else []
        search_candidates = []
        for term in aliases:
            if term and term not in search_candidates:
                search_candidates.append(term)
        if model_name and model_name not in search_candidates:
            search_candidates.append(model_name)

        for search_term in search_candidates[:4]:
            try:
                page = self._filter_products_wc_direct(
                    q=search_term,
                    brand=brand,
                    model=model,
                    model_wc_id=model_wc_id,
                    leaf_category=leaf_category,
                    in_stock=in_stock,
                    best_seller=best_seller,
                    new_arrival=new_arrival,
                    limit=limit,
                    offset=offset,
                    user=user,
                )
                if int(page.get("total") or 0) > 0 or page.get("items"):
                    return page
            except Exception as exc:
                logger.warning("WooCommerce model search %r failed: %s", search_term, exc)

        return self._filter_products_wc_direct(
            brand=brand,
            model=model,
            model_wc_id=model_wc_id,
            leaf_category=leaf_category,
            in_stock=in_stock,
            best_seller=best_seller,
            new_arrival=new_arrival,
            limit=limit,
            offset=offset,
            user=user,
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
    ) -> dict[str, Any]:
        started = time.perf_counter()
        mode = "unknown"
        try:
            # Warm catalog is the fast path for all listings (search/category/model).
            # Never call WooCommerce live when we already have a snapshot in memory.
            if self._catalog_cache_ready():
                mode = "cached"
                return self._filter_products_cached(
                    q=q,
                    category=category,
                    brand=brand,
                    subcategory=subcategory,
                    model=model,
                    model_wc_id=model_wc_id,
                    leaf_category=leaf_category,
                    category_group=category_group,
                    best_seller=best_seller,
                    new_arrival=new_arrival,
                    in_stock=in_stock,
                    limit=limit,
                    offset=offset,
                    user=user,
                )

            # Home carousels: prefer flagged catalog / seed so sections never go empty
            # when WooCommerce direct calls fail or return unflagged rows.
            if best_seller or new_arrival:
                if self._catalog_cache_ready():
                    mode = "cached-carousel"
                    return self._filter_products_cached(
                        q=q,
                        category=category,
                        brand=brand,
                        subcategory=subcategory,
                        model=model,
                        model_wc_id=model_wc_id,
                        leaf_category=leaf_category,
                        category_group=category_group,
                        best_seller=best_seller,
                        new_arrival=new_arrival,
                        in_stock=in_stock,
                        limit=limit,
                        offset=offset,
                        user=user,
                    )
                self._schedule_catalog_warm()
                mode = "direct-carousel"
                try:
                    page = self._filter_products_wc_direct(
                        q=q,
                        category=category,
                        brand=brand,
                        model=model,
                        model_wc_id=model_wc_id,
                        category_group=category_group,
                        leaf_category=leaf_category,
                        in_stock=in_stock,
                        best_seller=best_seller,
                        new_arrival=new_arrival,
                        limit=limit,
                        offset=offset,
                        user=user,
                    )
                    if page.get("items"):
                        return page
                except Exception as exc:
                    logger.warning("WooCommerce carousel list failed: %s — using seed catalog", exc)
                mode = "seed-carousel"
                return self._seed_fallback_page(
                    q=q,
                    category=category,
                    brand=brand,
                    subcategory=subcategory,
                    model=model,
                    model_wc_id=model_wc_id,
                    leaf_category=leaf_category,
                    category_group=category_group,
                    best_seller=best_seller,
                    new_arrival=new_arrival,
                    limit=limit,
                    offset=offset,
                    user=user,
                )

            if (model_wc_id is not None or model) and not q and not category and not subcategory and not category_group:
                # Prefer the warm catalog — WC ?search= fails on many Samsung/Apple names
                # with parentheses / slash codes, while filter_by_model matches reliably.
                if self._catalog_cache_ready():
                    mode = "cached-model"
                    return self._filter_products_cached(
                        q=None,
                        category=None,
                        brand=brand,
                        subcategory=None,
                        model=model,
                        model_wc_id=model_wc_id,
                        leaf_category=leaf_category,
                        category_group=None,
                        best_seller=best_seller,
                        new_arrival=new_arrival,
                        in_stock=in_stock,
                        limit=limit,
                        offset=offset,
                        user=user,
                    )
                mode = "model-live"
                self._schedule_catalog_warm()
                try:
                    return self._filter_products_for_model(
                        brand=brand,
                        model=model,
                        model_wc_id=model_wc_id,
                        leaf_category=leaf_category,
                        in_stock=in_stock,
                        best_seller=best_seller,
                        new_arrival=new_arrival,
                        limit=limit,
                        offset=offset,
                        user=user,
                    )
                except Exception as exc:
                    logger.warning("Model live list failed: %s — seed fallback", exc)
                    mode = "seed-model"
                    return self._seed_fallback_page(
                        brand=brand,
                        model=model,
                        model_wc_id=model_wc_id,
                        leaf_category=leaf_category,
                        best_seller=best_seller,
                        new_arrival=new_arrival,
                        limit=limit,
                        offset=offset,
                        user=user,
                    )

            if self._needs_post_filter_scan(
                q=q,
                category=category,
                subcategory=subcategory,
                model=model,
                model_wc_id=model_wc_id,
                leaf_category=leaf_category,
                category_group=category_group,
            ):
                if self._catalog_cache_ready():
                    mode = "cached-scan"
                    return self._filter_products_cached(
                        q=q,
                        category=category,
                        brand=brand,
                        subcategory=subcategory,
                        model=model,
                        model_wc_id=model_wc_id,
                        leaf_category=leaf_category,
                        category_group=category_group,
                        best_seller=best_seller,
                        new_arrival=new_arrival,
                        in_stock=in_stock,
                        limit=limit,
                        offset=offset,
                        user=user,
                    )
                # Cold start: never walk 15k products on the request thread.
                # Fetch at most SCAN_PAGES_PER_REQUEST WC pages under a hard time budget,
                # then fall back to seed so the app stays responsive while warm finishes.
                self._schedule_catalog_warm()
                mode = "bounded-scan"
                try:
                    page = self._filter_products_scan(
                        q=q,
                        category=category,
                        brand=brand,
                        subcategory=subcategory,
                        model=model,
                        model_wc_id=model_wc_id,
                        leaf_category=leaf_category,
                        category_group=category_group,
                        in_stock=in_stock,
                        limit=limit,
                        offset=offset,
                        user=user,
                    )
                    if page.get("items"):
                        return page
                except Exception as exc:
                    logger.warning("Bounded WC scan failed: %s — seed fallback", exc)
                mode = "seed-scan"
                return self._seed_fallback_page(
                    q=q,
                    category=category,
                    brand=brand,
                    subcategory=subcategory,
                    model=model,
                    model_wc_id=model_wc_id,
                    leaf_category=leaf_category,
                    category_group=category_group,
                    best_seller=best_seller,
                    new_arrival=new_arrival,
                    limit=limit,
                    offset=offset,
                    user=user,
                )

            try:
                mode = "wc-direct"
                return self._filter_products_wc_direct(
                    q=q,
                    category=category,
                    brand=brand,
                    model=model,
                    model_wc_id=model_wc_id,
                    category_group=category_group,
                    leaf_category=leaf_category,
                    in_stock=in_stock,
                    best_seller=best_seller,
                    new_arrival=new_arrival,
                    limit=limit,
                    offset=offset,
                    user=user,
                )
            except Exception as exc:
                logger.warning("WooCommerce direct product list failed: %s — using seed catalog", exc)
                mode = "seed-direct"
                return self._seed_fallback_page(
                    q=q,
                    category=category,
                    brand=brand,
                    subcategory=subcategory,
                    model=model,
                    model_wc_id=model_wc_id,
                    leaf_category=leaf_category,
                    category_group=category_group,
                    best_seller=best_seller,
                    new_arrival=new_arrival,
                    limit=limit,
                    offset=offset,
                    user=user,
                )
        finally:
            logger.info(
                "filter_products mode=%s total_ms=%s q=%r brand=%r category=%r group=%r leaf=%r",
                mode,
                int((time.perf_counter() - started) * 1000),
                q,
                brand,
                category,
                category_group,
                leaf_category,
            )

    def _filter_products_cached(
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
        limit: int = 48,
        offset: int = 0,
        user: Optional[dict] = None,
    ) -> dict[str, Any]:
        from catalog_pagination import clamp_page, product_page
        from catalog_sort import sort_products

        started = time.perf_counter()
        # Never trigger a full remote catalog build on a request thread.
        snap = self._catalog_cache
        if not snap:
            raise RuntimeError("Catalog snapshot not ready")
        out = self._apply_post_filters(
            snap.products,
            q=q,
            category=category,
            brand=brand,
            subcategory=subcategory,
            model=model,
            model_wc_id=model_wc_id,
            leaf_category=leaf_category,
            category_group=category_group,
            in_stock=in_stock,
        )
        if best_seller is not None:
            out = [p for p in out if bool(p.get("best_seller")) == best_seller]
        if new_arrival is not None:
            out = [p for p in out if bool(p.get("new_arrival")) == new_arrival]

        out = sort_products(
            out,
            category=category,
            category_group=category_group,
            leaf_category=leaf_category,
            model=model,
            model_wc_id=model_wc_id,
        )

        lim, off = clamp_page(limit, offset, model_query=model_wc_id is not None or bool(model))
        total = len(out)
        page = self._prepare_products(out[off : off + lim], user)
        result = product_page(page, total, limit=lim, offset=off, model_query=model_wc_id is not None or bool(model))
        logger.info(
            "Cached catalog page ms=%s items=%s/%s filters=%s",
            int((time.perf_counter() - started) * 1000),
            len(page),
            total,
            {
                "q": q,
                "category": category,
                "brand": brand,
                "leaf": leaf_category,
                "group": category_group,
                "model": model or model_wc_id,
            },
        )
        return result

    def _seed_fallback_page(
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
        limit: int = 50,
        offset: int = 0,
        user: Optional[dict] = None,
    ) -> dict[str, Any]:
        import memory_store

        self._schedule_catalog_warm()
        return memory_store.filter_products_page(
            q=q,
            category=category,
            brand=brand,
            subcategory=subcategory,
            model=model,
            model_wc_id=model_wc_id,
            leaf_category=leaf_category,
            category_group=category_group,
            best_seller=best_seller,
            new_arrival=new_arrival,
            limit=limit,
            offset=offset,
            user=user,
        )

    def list_products(
        self,
        *,
        q: Optional[str] = None,
        category: Optional[str] = None,
        brand: Optional[str] = None,
        subcategory: Optional[str] = None,
        model: Optional[str] = None,
        model_wc_id: Optional[int] = None,
        leaf_category: Optional[str] = None,
        in_stock: Optional[bool] = None,
        limit: int = 48,
        offset: int = 0,
        user: Optional[dict] = None,
    ) -> dict[str, Any]:
        return self.filter_products(
            q=q,
            category=category,
            brand=brand,
            subcategory=subcategory,
            model=model,
            model_wc_id=model_wc_id,
            leaf_category=leaf_category,
            in_stock=in_stock,
            limit=limit,
            offset=offset,
            user=user,
        )

    def _enrich_product_detail(self, base: dict) -> dict:
        wc_id = int(base["wc_id"])
        try:
            row = self._get(f"/products/{wc_id}")[0]
        except Exception:
            from stock import normalize_stock

            return normalize_stock(dict(base))
        doc = dict(base)
        pricing = extract_wc_prices(row)
        doc["price"] = pricing["price"]
        doc["regularPrice"] = pricing["regularPrice"]
        doc["salePrice"] = pricing.get("salePrice")
        doc["on_sale"] = bool(pricing.get("on_sale"))
        doc["price_on_request"] = bool(pricing.get("price_on_request"))
        if pricing.get("wholesalePrice"):
            doc["wholesalePrice"] = pricing["wholesalePrice"]
        content = row.get("description") or row.get("short_description") or ""
        doc["description"] = clean_description(content) or f"{doc['title']} — available at Samphone, Lisboa."
        images = _extract_image_urls(row)
        if images:
            doc["images"] = images
            doc["image"] = images[0]
        elif not _is_placeholder_image(doc.get("image") or ""):
            # Keep a real catalog/live image when WC gallery is empty.
            doc["image"] = _normalize_image_url(doc.get("image") or "")
            doc["images"] = [_normalize_image_url(u) for u in (doc.get("images") or [doc["image"]]) if u] or [doc["image"]]
        else:
            fallback = _normalize_image_url(_default_product_image())
            doc["image"] = fallback
            doc["images"] = [fallback]
        qty, in_stock = self._product_stock(row)
        doc["stock_quantity"] = qty
        doc["in_stock"] = in_stock
        doc["manage_stock"] = bool(row.get("manage_stock"))
        if str(row.get("type") or "").lower() == "variable":
            try:
                variations = self._paginate(f"/products/{wc_id}/variations", params={"per_page": 100})
                color_variants = extract_color_variants(row, variations)
                if color_variants:
                    doc["color_variants"] = color_variants
                    doc["variants"] = [v["label"] for v in color_variants]
            except Exception:
                logger.debug("Could not load variations for wc_id=%s", wc_id, exc_info=True)
        from wholesale import enrich_product_pricing

        return enrich_product_pricing(doc)

    def get_product(self, wc_id: int, *, enrich: bool = True) -> Optional[dict]:
        doc = self._lookup_product(wc_id=wc_id)
        if not doc:
            try:
                data, _ = self._get(f"/products/{int(wc_id)}")
                row = data if isinstance(data, dict) else (data[0] if isinstance(data, list) and data else None)
                if row:
                    _, model_ids = self._load_models()
                    doc = self._build_product_doc(row, model_ids, include_description=True)
                    if doc:
                        self._remember_live(doc)
            except Exception:
                logger.debug("Direct WC product fetch failed for wc_id=%s", wc_id, exc_info=True)
                return None
        if not doc:
            return None
        return self._enrich_product_detail(doc) if enrich else dict(doc)

    def get_product_by_slug(self, slug: str, *, enrich: bool = True) -> Optional[dict]:
        doc = self._lookup_product(slug=slug)
        if not doc:
            try:
                data, _ = self._get("/products", params={"slug": slug, "per_page": 1, "status": "publish"})
            except Exception:
                return None
            if data:
                _, model_ids = self._load_models()
                doc = self._build_product_doc(data[0], model_ids, include_description=True)
                if doc:
                    self._remember_live(doc)
        if not doc:
            return None
        return self._enrich_product_detail(doc) if enrich else dict(doc)

    def get_product_by_uuid(self, product_id: str, *, enrich: bool = True) -> Optional[dict]:
        from stock import normalize_stock

        doc = self._lookup_product(product_id=product_id)
        if not doc:
            import memory_store

            return memory_store.get_product(product_id)
        if not enrich:
            return normalize_stock(dict(doc))
        try:
            return self._enrich_product_detail(doc)
        except Exception:
            logger.debug("Product detail enrich failed for %s; using cached row", product_id, exc_info=True)
            return normalize_stock(dict(doc))

    def _patch_cached_product(self, product: dict) -> None:
        self._remember_live(product)
        snap = self._catalog_cache
        if not snap:
            return
        wc_id = int(product["wc_id"])
        snap.by_uuid[product["id"]] = product
        snap.by_wc_id[wc_id] = product
        if product.get("slug"):
            snap.by_slug[product["slug"]] = product
        for idx, row in enumerate(snap.products):
            if row.get("id") == product["id"]:
                snap.products[idx] = product
                break

    def _push_stock_to_woocommerce(self, wc_id: int, stock_quantity: int) -> None:
        payload = {
            "manage_stock": True,
            "stock_quantity": max(0, int(stock_quantity)),
            "stock_status": "instock" if stock_quantity > 0 else "outofstock",
        }
        self._put(f"/products/{wc_id}", payload)

    def update_product_stock(self, product_id: str, stock_quantity: int) -> Optional[dict]:
        product = self._lookup_product(product_id=product_id)
        if not product:
            return None
        qty = max(0, int(stock_quantity))
        self._push_stock_to_woocommerce(int(product["wc_id"]), qty)
        updated = dict(product)
        apply_stock_quantity(updated, qty)
        updated["manage_stock"] = True
        self._patch_cached_product(updated)
        return updated

    def decrement_stock(self, lines: list[dict]) -> list[dict]:
        products_by_id: dict[str, dict] = {}
        for line in lines:
            pid = str(line.get("product_id") or "")
            if not pid:
                continue
            product = self._lookup_product(product_id=pid)
            if product:
                products_by_id[pid] = product
        validate_purchase_lines(products_by_id, lines)

        updated: list[dict] = []
        for line in lines:
            pid = str(line.get("product_id") or "")
            qty = int(line.get("quantity") or 0)
            product = products_by_id[pid]
            new_qty = max(0, int(product.get("stock_quantity") or 0) - qty)
            self._push_stock_to_woocommerce(int(product["wc_id"]), new_qty)
            patched = dict(product)
            apply_stock_quantity(patched, new_qty)
            patched["manage_stock"] = True
            self._patch_cached_product(patched)
            products_by_id[pid] = patched
            updated.append(
                {"product_id": pid, "stock_quantity": patched["stock_quantity"], "in_stock": patched["in_stock"]}
            )
        return updated

    def list_admin_products(self, q: Optional[str] = None, limit: int = 80, offset: int = 0) -> dict:
        from catalog_pagination import clamp_page

        if self._catalog_cache and time.time() - self._catalog_cache.loaded_at < CACHE_TTL:
            snap = self._catalog_cache
            out = snap.products
            if q:
                out = [
                    p
                    for p in out
                    if any(
                        self._match_regex(str(p.get(field) or ""), q)
                        for field in ("title", "brand", "sku", "id", "category")
                    )
                ]
            total = len(out)
            lim, off = clamp_page(limit, offset)
            page = out[off : off + lim]
            return {
                "total": total,
                "items": [
                    {
                        "id": p.get("id"),
                        "title": p.get("title"),
                        "brand": p.get("brand"),
                        "sku": p.get("sku"),
                        "price": p.get("price"),
                        "image": p.get("image"),
                        "stock_quantity": int(p.get("stock_quantity") or 0),
                        "in_stock": bool(p.get("in_stock")),
                    }
                    for p in page
                ],
            }

        lim, off = clamp_page(limit, offset)
        wc_per_page = max(lim, min(PER_PAGE, 100))
        wc_page = (off // wc_per_page) + 1
        params: dict[str, Any] = {"status": "publish", "per_page": wc_per_page, "page": wc_page}
        if q:
            params["search"] = q
        data, headers = self._get("/products", params=params)
        total = self._header_int(headers, "X-WP-Total")
        _, model_ids = self._load_models()
        products = self._rows_to_products(data or [], model_ids)
        slice_start = off % wc_per_page
        page = products[slice_start : slice_start + lim]
        return {
            "total": total,
            "items": [
                {
                    "id": p.get("id"),
                    "title": p.get("title"),
                    "brand": p.get("brand"),
                    "sku": p.get("sku"),
                    "price": p.get("price"),
                    "image": p.get("image"),
                    "stock_quantity": int(p.get("stock_quantity") or 0),
                    "in_stock": bool(p.get("in_stock")),
                }
                for p in page
            ],
        }

    def admin_stats(self) -> dict:
        if self._catalog_cache and time.time() - self._catalog_cache.loaded_at < CACHE_TTL:
            products = self._catalog_cache.products
            low_stock = sum(1 for p in products if int(p.get("stock_quantity") or 0) <= 5)
            out_of_stock = sum(1 for p in products if not p.get("in_stock"))
            total_products = len(products)
        else:
            _, headers = self._get("/products", params={"per_page": 1, "status": "publish"})
            total_products = self._header_int(headers, "X-WP-Total")
            _, oos_headers = self._get(
                "/products",
                params={"per_page": 1, "status": "publish", "stock_status": "outofstock"},
            )
            out_of_stock = self._header_int(oos_headers, "X-WP-Total")
            low_stock = None
        return {
            "total_orders": 0,
            "total_revenue": 0,
            "total_customers": 0,
            "total_products": total_products,
            "low_stock": low_stock,
            "out_of_stock": out_of_stock,
            "source": "woocommerce_rest",
        }


_woo_api: WooCommerceAPI | None = None


def get_woo_api() -> WooCommerceAPI:
    global _woo_api
    if _woo_api is None:
        _woo_api = WooCommerceAPI()
    return _woo_api
