"""ProductRepository — read WooCommerce product tables from catalog MySQL."""
from __future__ import annotations

import logging
import re
import time
import uuid
from typing import Any, Optional

from catalog_db import get_catalog_db, table_prefix

logger = logging.getLogger(__name__)

META_KEYS = (
    "_sku",
    "_price",
    "_regular_price",
    "_sale_price",
    "_stock",
    "_stock_status",
    "_manage_stock",
    "_thumbnail_id",
    "_wc_average_rating",
    "_wc_review_count",
    "total_sales",
    "wholesale_customer_wholesale_price",
    "wholesale_customer_have_wholesale_price",
)


class ProductRepository:
    def __init__(self) -> None:
        self.db = get_catalog_db()
        self._cat_cache: tuple[float, list[dict]] | None = None
        self._brand_cache: tuple[float, list[dict]] | None = None
        self._banner_cache: tuple[float, list[dict]] | None = None
        self._site_url: str | None = None
        self._cache_ttl = 300
        self._banner_cache_ttl = 30
        self._published_count: tuple[float, int] | None = None
        self._uuid_index: dict[str, int] | None = None

    def _t(self, name: str) -> str:
        return self.db.t(name)

    def _sql_exclude_orphan_variations(self, alias: str = "p") -> str:
        """
        Hide WooCommerce posts wrongly tagged product_type=variation,
        and Soft Jelly / MagSafe titles published as \"PARENT - Color\" SKUs.
        """
        posts_alias = alias
        return f"""
            AND NOT EXISTS (
              SELECT 1
              FROM `{self._t('term_relationships')}` tr_ov
              INNER JOIN `{self._t('term_taxonomy')}` tt_ov
                ON tt_ov.term_taxonomy_id = tr_ov.term_taxonomy_id
               AND tt_ov.taxonomy = 'product_type'
              INNER JOIN `{self._t('terms')}` t_ov
                ON t_ov.term_id = tt_ov.term_id
              WHERE tr_ov.object_id = {posts_alias}.ID
                AND t_ov.slug = 'variation'
            )
            AND UPPER({posts_alias}.post_title) NOT REGEXP
              'SOFT[[:space:]]+JELLY[[:space:]]*[-–—][[:space:]]+'
            AND UPPER({posts_alias}.post_title) NOT REGEXP
              'MAGSAFE[[:space:]]+COVER[[:space:]]*[-–—][[:space:]]+'
        """

    def site_url(self) -> str:
        if self._site_url:
            return self._site_url
        with self.db.connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"SELECT option_value FROM `{self._t('options')}` "
                    "WHERE option_name IN ('siteurl','home') ORDER BY FIELD(option_name,'siteurl','home') LIMIT 1"
                )
                row = cur.fetchone()
                self._site_url = (row["option_value"] if row else "https://www.samphone.pt").rstrip("/")
        return self._site_url

    def _slides_from_elementor(self, raw: str) -> list[dict]:
        """First image-carousel on the Home page — same slides/order as samphone.pt."""
        import json

        try:
            tree = json.loads(raw or "[]")
        except (TypeError, ValueError):
            return []

        slides: list[dict] = []

        def walk(nodes: Any) -> None:
            if slides:
                return
            if isinstance(nodes, list):
                for node in nodes:
                    walk(node)
                    if slides:
                        return
                return
            if not isinstance(nodes, dict):
                return
            if (nodes.get("widgetType") or "") == "image-carousel":
                for slide in (nodes.get("settings") or {}).get("carousel") or []:
                    if not isinstance(slide, dict):
                        continue
                    url = self._normalize_url(str(slide.get("url") or ""))
                    if not url:
                        continue
                    wc_id = int(slide.get("id") or 0)
                    bust = f"{url}{'&' if '?' in url else '?'}v={wc_id or '1'}"
                    slides.append(
                        {
                            "id": str(wc_id or url.rsplit("/", 1)[-1]),
                            "wc_id": wc_id,
                            "title": "",
                            "image": bust,
                            "image_url": bust,
                            "src": bust,
                            "url": self._normalize_url(str(slide.get("link") or "")),
                            "link": self._normalize_url(str(slide.get("link") or "")),
                        }
                    )
                return
            walk(nodes.get("elements") or [])

        walk(tree)
        return slides

    def _homepage_elementor_slides(self, conn, prefix: str) -> list[dict]:
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT option_value FROM `{prefix}options` WHERE option_name='page_on_front' LIMIT 1"
            )
            row = cur.fetchone() or {}
            page_id = int(str(row.get("option_value") or "0") or 0) or 55
            cur.execute(
                f"""
                SELECT meta_value FROM `{prefix}postmeta`
                WHERE post_id=%s AND meta_key='_elementor_data' LIMIT 1
                """,
                (page_id,),
            )
            meta = cur.fetchone() or {}
        return self._slides_from_elementor(str(meta.get("meta_value") or ""))

    def _fetch_site_banners(self) -> list[dict]:
        """Banners exactly as the live WooCommerce homepage carousel."""
        try:
            from live_mysql import connect_live, live_configured

            if live_configured():
                import os

                prefix = os.environ.get("WP_TABLE_PREFIX", "wp_") or "wp_"
                conn = connect_live(read_only=True)
                try:
                    slides = self._homepage_elementor_slides(conn, prefix)
                    if slides:
                        return slides
                finally:
                    conn.close()
        except Exception:
            logger.warning("Live homepage banners failed — using catalog clone", exc_info=True)

        try:
            with self.db.connect() as conn:
                slides = self._homepage_elementor_slides(conn, table_prefix())
                if slides:
                    return slides
        except Exception:
            logger.exception("Catalog homepage banners failed")
        return []

    def list_home_banners(self, *, limit: int = 8) -> list[dict]:
        """Same header images, same order as https://www.samphone.pt/."""
        now = time.time()
        cap = max(1, min(int(limit or 8), 12))
        if self._banner_cache and now - self._banner_cache[0] < self._banner_cache_ttl:
            return list(self._banner_cache[1][:cap])

        items = self._fetch_site_banners()
        if not items:
            from seed_data import BANNERS

            for i, raw in enumerate(BANNERS[:cap], start=1):
                url = self._normalize_url(raw)
                if not url:
                    continue
                items.append(
                    {
                        "id": f"seed-{i}",
                        "wc_id": 0,
                        "title": "",
                        "image": url,
                        "image_url": url,
                        "src": url,
                        "url": "",
                        "link": "",
                    }
                )

        self._banner_cache = (now, items)
        return list(items[:cap])

    def remember_ids(self, pairs: list[tuple[str, int]]) -> None:
        if not pairs:
            return
        with self.db.connect() as conn:
            with conn.cursor() as cur:
                cur.executemany(
                    """
                    INSERT INTO samphone_id_map (product_uuid, wc_id)
                    VALUES (%s, %s)
                    ON DUPLICATE KEY UPDATE wc_id=VALUES(wc_id)
                    """,
                    [(u, int(w)) for u, w in pairs],
                )

    def wc_id_for_uuid(self, product_uuid: str) -> Optional[int]:
        raw = str(product_uuid or "").strip()
        if self._uuid_index is not None:
            hit = self._uuid_index.get(raw)
            if hit is not None:
                return hit
        with self.db.connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT wc_id FROM samphone_id_map WHERE product_uuid=%s LIMIT 1",
                    (raw,),
                )
                row = cur.fetchone()
                return int(row["wc_id"]) if row else None

    def dashboard_counts(self, *, ttl: float = 60) -> dict[str, int]:
        """Published product / low-stock / out-of-stock totals for the admin dashboard."""
        now = time.time()
        cached = getattr(self, "_dashboard_counts", None)
        if cached and now - cached[0] < ttl:
            return dict(cached[1])
        posts = self._t("posts")
        meta = self._t("postmeta")
        with self.db.connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    SELECT COUNT(*) AS c FROM `{posts}`
                    WHERE post_type='product' AND post_status='publish'
                    """
                )
                total = int((cur.fetchone() or {}).get("c") or 0)
                cur.execute(
                    f"""
                    SELECT COUNT(DISTINCT p.ID) AS c
                    FROM `{posts}` p
                    INNER JOIN `{meta}` st
                      ON st.post_id = p.ID
                     AND st.meta_key = '_stock_status'
                     AND st.meta_value = 'outofstock'
                    WHERE p.post_type='product' AND p.post_status='publish'
                    """
                )
                out = int((cur.fetchone() or {}).get("c") or 0)
                cur.execute(
                    f"""
                    SELECT COUNT(DISTINCT p.ID) AS c
                    FROM `{posts}` p
                    INNER JOIN `{meta}` mg
                      ON mg.post_id = p.ID
                     AND mg.meta_key = '_manage_stock'
                     AND mg.meta_value IN ('yes', '1')
                    INNER JOIN `{meta}` qty
                      ON qty.post_id = p.ID AND qty.meta_key = '_stock'
                    LEFT JOIN `{meta}` st
                      ON st.post_id = p.ID AND st.meta_key = '_stock_status'
                    WHERE p.post_type='product' AND p.post_status='publish'
                      AND COALESCE(st.meta_value, 'instock') <> 'outofstock'
                      AND CAST(IFNULL(NULLIF(qty.meta_value, ''), '0') AS DECIMAL(12,2)) > 0
                      AND CAST(IFNULL(NULLIF(qty.meta_value, ''), '0') AS DECIMAL(12,2)) <= 5
                    """
                )
                low = int((cur.fetchone() or {}).get("c") or 0)
        counts = {
            "total_products": total,
            "low_stock": low,
            "out_of_stock": out,
        }
        self._dashboard_counts = (now, counts)
        return dict(counts)

    def published_count_cached(self, *, ttl: float = 600) -> int:
        now = time.time()
        if self._published_count and now - self._published_count[0] < ttl:
            return self._published_count[1]
        with self.db.connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"SELECT COUNT(*) AS c FROM `{self._t('posts')}` "
                    "WHERE post_type='product' AND post_status='publish'"
                )
                n = int(cur.fetchone()["c"])
        self._published_count = (now, n)
        return n

    def warm_uuid_index(self, *, max_ids: int = 20000) -> int:
        """Build deterministic uuid5 → wc_id map so detail URLs work before first list."""
        with self.db.connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    SELECT ID AS id FROM `{self._t('posts')}`
                    WHERE post_type='product' AND post_status='publish'
                    ORDER BY ID DESC
                    LIMIT %s
                    """,
                    (int(max_ids),),
                )
                ids = [int(r["id"]) for r in cur.fetchall()]
        index = {
            str(uuid.uuid5(uuid.NAMESPACE_URL, f"samphone:{i}")): i for i in ids
        }
        self._uuid_index = index
        self._published_count = (time.time(), len(ids))
        return len(ids)

    def get_default_markup(self) -> float:
        with self.db.connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT setting_value FROM samphone_pricing_settings WHERE setting_key='default_b2c_markup' LIMIT 1"
                )
                row = cur.fetchone()
                if not row:
                    return 1.0
                try:
                    return float(row["setting_value"])
                except (TypeError, ValueError):
                    return 1.0

    def set_default_markup(self, markup: float) -> None:
        with self.db.connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO samphone_pricing_settings (setting_key, setting_value)
                    VALUES ('default_b2c_markup', %s)
                    ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)
                    """,
                    (str(markup),),
                )

    def upsert_b2c_price(
        self,
        product_id: int,
        b2c_price: float | None = None,
        markup: float | None = None,
        *,
        public_price: float | None = None,
        business_price: float | None = None,
        image_url: str | None = None,
        compare_at_price: float | None = None,
    ) -> None:
        """Admin override for public retail. Does not overwrite band-cached public_price unless asked."""
        with self.db.connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO samphone_b2c_pricing
                      (product_id, b2c_price, public_price, business_price, markup, image_url, compare_at_price)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                      b2c_price=COALESCE(VALUES(b2c_price), b2c_price),
                      public_price=COALESCE(VALUES(public_price), public_price),
                      business_price=COALESCE(VALUES(business_price), business_price),
                      markup=COALESCE(VALUES(markup), markup),
                      image_url=COALESCE(VALUES(image_url), image_url),
                      compare_at_price=COALESCE(VALUES(compare_at_price), compare_at_price)
                    """,
                    (
                        int(product_id),
                        b2c_price,
                        public_price,
                        business_price,
                        markup,
                        image_url,
                        compare_at_price,
                    ),
                )

    def clear_b2c_override(self, product_id: int) -> None:
        with self.db.connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE samphone_b2c_pricing
                    SET b2c_price=NULL, compare_at_price=NULL
                    WHERE product_id=%s
                    """,
                    (int(product_id),),
                )

    def set_image_url(self, product_id: int, image_url: str | None) -> None:
        with self.db.connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO samphone_b2c_pricing (product_id, image_url)
                    VALUES (%s, %s)
                    ON DUPLICATE KEY UPDATE image_url=VALUES(image_url)
                    """,
                    (int(product_id), image_url),
                )

    def set_compare_at_price(self, product_id: int, compare_at_price: float | None) -> None:
        with self.db.connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO samphone_b2c_pricing (product_id, compare_at_price)
                    VALUES (%s, %s)
                    ON DUPLICATE KEY UPDATE compare_at_price=VALUES(compare_at_price)
                    """,
                    (int(product_id), compare_at_price),
                )

    def _set_postmeta(self, cur, post_id: int, meta_key: str, meta_value: str) -> None:
        t = self.db.t("postmeta")
        cur.execute(
            f"UPDATE `{t}` SET meta_value=%s WHERE post_id=%s AND meta_key=%s",
            (meta_value, int(post_id), meta_key),
        )
        if cur.rowcount == 0:
            cur.execute(
                f"INSERT INTO `{t}` (post_id, meta_key, meta_value) VALUES (%s,%s,%s)",
                (int(post_id), meta_key, meta_value),
            )

    def update_wc_prices(
        self,
        product_id: int,
        *,
        regular_price: float | None = None,
        sale_price: float | None = None,
        clear_sale: bool = False,
    ) -> None:
        """Write WooCommerce _regular_price / _sale_price / _price (+ wholesale) postmeta on the clone."""
        with self.db.connect() as conn:
            with conn.cursor() as cur:
                if regular_price is not None:
                    reg = f"{float(regular_price):.2f}"
                    self._set_postmeta(cur, product_id, "_regular_price", reg)
                    # Business / B2B price — preferred by catalog_service over plain _price.
                    self._set_postmeta(cur, product_id, "wholesale_customer_wholesale_price", reg)
                if clear_sale:
                    self._set_postmeta(cur, product_id, "_sale_price", "")
                    # Active price becomes regular (or leave existing if regular not set)
                    if regular_price is not None:
                        self._set_postmeta(cur, product_id, "_price", f"{float(regular_price):.2f}")
                    else:
                        cur.execute(
                            f"""
                            SELECT meta_value FROM `{self.db.t('postmeta')}`
                            WHERE post_id=%s AND meta_key='_regular_price' LIMIT 1
                            """,
                            (int(product_id),),
                        )
                        row = cur.fetchone()
                        if row and row.get("meta_value"):
                            self._set_postmeta(cur, product_id, "_price", str(row["meta_value"]))
                elif sale_price is not None:
                    if float(sale_price) > 0:
                        sale = f"{float(sale_price):.2f}"
                        self._set_postmeta(cur, product_id, "_sale_price", sale)
                        self._set_postmeta(cur, product_id, "_price", sale)
                    else:
                        self._set_postmeta(cur, product_id, "_sale_price", "")
                        if regular_price is not None:
                            self._set_postmeta(cur, product_id, "_price", f"{float(regular_price):.2f}")
                elif regular_price is not None:
                    # Only regular changed — keep sale if present and valid
                    cur.execute(
                        f"""
                        SELECT meta_value FROM `{self.db.t('postmeta')}`
                        WHERE post_id=%s AND meta_key='_sale_price' LIMIT 1
                        """,
                        (int(product_id),),
                    )
                    row = cur.fetchone()
                    sale_raw = (row or {}).get("meta_value") or ""
                    try:
                        sale_f = float(str(sale_raw).strip()) if str(sale_raw).strip() else 0.0
                    except (TypeError, ValueError):
                        sale_f = 0.0
                    if sale_f > 0 and sale_f < float(regular_price):
                        self._set_postmeta(cur, product_id, "_price", f"{sale_f:.2f}")
                    else:
                        self._set_postmeta(cur, product_id, "_price", f"{float(regular_price):.2f}")

    def upsert_public_price(
        self,
        product_id: int,
        public_price: float,
        business_price: float | None = None,
    ) -> None:
        """Store computed public retail cache. Never write b2c_price (admin override only)."""
        with self.db.connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO samphone_b2c_pricing
                      (product_id, public_price, business_price)
                    VALUES (%s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                      public_price=VALUES(public_price),
                      business_price=COALESCE(VALUES(business_price), business_price),
                      b2c_price=IF(
                        b2c_price IS NOT NULL
                          AND public_price IS NOT NULL
                          AND ABS(b2c_price - public_price) < 0.005,
                        NULL,
                        b2c_price
                      )
                    """,
                    (int(product_id), float(public_price), business_price),
                )

    def clear_synced_b2c_overrides(self) -> int:
        """Clear b2c_price rows that were copied from public_price by sync (not admin edits)."""
        with self.db.connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE samphone_b2c_pricing
                    SET b2c_price=NULL
                    WHERE b2c_price IS NOT NULL
                      AND public_price IS NOT NULL
                      AND ABS(b2c_price - public_price) < 0.005
                    """
                )
                return int(cur.rowcount or 0)

    def list_public_price_bands(self) -> list[dict]:
        with self.db.connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT cost_min, cost_max, public_price, sort_order
                    FROM samphone_public_price_bands
                    ORDER BY sort_order ASC, cost_min ASC
                    """
                )
                return list(cur.fetchall() or [])

    def _meta_pivot(self, alias: str = "pm") -> str:
        parts = []
        for key in META_KEYS:
            col = key.lstrip("_").replace("-", "_")
            parts.append(
                f"MAX(CASE WHEN {alias}.meta_key=%s THEN {alias}.meta_value END) AS `{col}`"
            )
        # placeholders filled by caller order — easier to hardcode keys in SQL
        return ",\n          ".join(
            f"MAX(CASE WHEN {alias}.meta_key='{key}' THEN {alias}.meta_value END) AS `{self._meta_alias(key)}`"
            for key in META_KEYS
        )

    @staticmethod
    def _meta_alias(key: str) -> str:
        return key.lstrip("_").replace("-", "_")

    def _base_select(self) -> str:
        posts = self._t("posts")
        meta = self._t("postmeta")
        b2c = "samphone_b2c_pricing"
        return f"""
        SELECT
          p.ID AS wc_id,
          p.post_title AS title,
          p.post_name AS slug,
          p.post_content AS description,
          p.post_excerpt AS short_description,
          p.post_date AS created_at,
          p.post_modified AS updated_at,
          {self._meta_pivot('pm')},
          b2c.b2c_price AS override_b2c_price,
          b2c.public_price AS stored_public_price,
          b2c.business_price AS stored_business_price,
          b2c.markup AS override_markup
        FROM `{posts}` p
        LEFT JOIN `{meta}` pm ON pm.post_id = p.ID
          AND pm.meta_key IN ({",".join(["%s"] * len(META_KEYS))})
        LEFT JOIN `{b2c}` b2c ON b2c.product_id = p.ID
        """

    def _meta_key_params(self) -> list[str]:
        return list(META_KEYS)

    def count_products(
        self,
        *,
        q: Optional[str] = None,
        q_any: Optional[list[str]] = None,
        category_slug: Optional[str] = None,
        category_name: Optional[str] = None,
        brand: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        in_stock: Optional[bool] = None,
    ) -> int:
        where, params = self._filters(
            q=q,
            q_any=q_any,
            category_slug=category_slug,
            category_name=category_name,
            brand=brand,
            min_price=min_price,
            max_price=max_price,
            in_stock=in_stock,
        )
        sql = f"""
        SELECT COUNT(DISTINCT p.ID) AS c
        FROM `{self._t('posts')}` p
        LEFT JOIN `{self._t('postmeta')}` pm_price
          ON pm_price.post_id=p.ID AND pm_price.meta_key='_price'
        {self._join_filters(category_slug=category_slug, category_name=category_name, brand=brand)}
        WHERE p.post_type='product' AND p.post_status='publish'
        {where}
        """
        with self.db.connect() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                return int(cur.fetchone()["c"])

    def _join_filters(
        self,
        *,
        category_slug: Optional[str] = None,
        category_name: Optional[str] = None,
        brand: Optional[str] = None,
    ) -> str:
        joins = []
        if category_slug or category_name or brand:
            joins.append(
                f"""
                INNER JOIN `{self._t('term_relationships')}` tr ON tr.object_id = p.ID
                INNER JOIN `{self._t('term_taxonomy')}` tt ON tt.term_taxonomy_id = tr.term_taxonomy_id
                INNER JOIN `{self._t('terms')}` t ON t.term_id = tt.term_id
                """
            )
        return "\n".join(joins)

    def _filters(
        self,
        *,
        q: Optional[str] = None,
        q_any: Optional[list[str]] = None,
        category_slug: Optional[str] = None,
        category_name: Optional[str] = None,
        brand: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        in_stock: Optional[bool] = None,
    ) -> tuple[str, list[Any]]:
        clauses: list[str] = []
        params: list[Any] = []
        if q:
            like = f"%{q.strip()}%"
            clauses.append("AND p.post_title LIKE %s")
            params.append(like)
        if q_any:
            likes = [f"%{t.strip()}%" for t in q_any if t and str(t).strip()]
            if likes:
                clauses.append(
                    "AND (" + " OR ".join(["p.post_title LIKE %s"] * len(likes)) + ")"
                )
                params.extend(likes)
        if category_slug:
            clauses.append("AND tt.taxonomy='product_cat' AND t.slug=%s")
            params.append(category_slug)
        if category_name:
            clauses.append("AND tt.taxonomy='product_cat' AND t.name LIKE %s")
            params.append(f"%{category_name}%")
        if brand:
            # Brand is derived from title/categories — LIKE only, never exact '='
            clauses.append("AND (p.post_title LIKE %s OR (tt.taxonomy='product_cat' AND t.name LIKE %s))")
            params.extend([f"%{brand}%", f"%{brand}%"])
        if min_price is not None:
            clauses.append("AND CAST(pm_price.meta_value AS DECIMAL(12,2)) >= %s")
            params.append(min_price)
        if max_price is not None:
            clauses.append("AND CAST(pm_price.meta_value AS DECIMAL(12,2)) <= %s")
            params.append(max_price)
        if in_stock is True:
            clauses.append(
                f"""
                AND EXISTS (
                  SELECT 1 FROM `{self._t('postmeta')}` st
                  WHERE st.post_id=p.ID AND st.meta_key='_stock_status' AND st.meta_value='instock'
                )
                """
            )
        elif in_stock is False:
            clauses.append(
                f"""
                AND EXISTS (
                  SELECT 1 FROM `{self._t('postmeta')}` st
                  WHERE st.post_id=p.ID AND st.meta_key='_stock_status' AND st.meta_value='outofstock'
                )
                """
            )
        clauses.append(self._sql_exclude_orphan_variations("p"))
        return "\n".join(clauses), params

    def list_product_ids(
        self,
        *,
        q: Optional[str] = None,
        q_any: Optional[list[str]] = None,
        category_slug: Optional[str] = None,
        category_name: Optional[str] = None,
        brand: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        in_stock: Optional[bool] = None,
        sort: str = "date_desc",
        limit: int = 50,
        offset: int = 0,
    ) -> list[int]:
        where, params = self._filters(
            q=q,
            q_any=q_any,
            category_slug=category_slug,
            category_name=category_name,
            brand=brand,
            min_price=min_price,
            max_price=max_price,
            in_stock=in_stock,
        )
        order = {
            "date_desc": "p.ID DESC",
            "date_asc": "p.ID ASC",
            "title_asc": "p.post_title ASC",
            "title_desc": "p.post_title DESC",
            "price_asc": "CAST(pm_price.meta_value AS DECIMAL(12,2)) ASC",
            "price_desc": "CAST(pm_price.meta_value AS DECIMAL(12,2)) DESC",
            "sales_desc": "CAST(IFNULL(pm_sales.meta_value,0) AS UNSIGNED) DESC",
        }.get(sort or "date_desc", "p.ID DESC")

        sales_join = ""
        if sort == "sales_desc":
            sales_join = (
                f"LEFT JOIN `{self._t('postmeta')}` pm_sales "
                "ON pm_sales.post_id=p.ID AND pm_sales.meta_key='total_sales'"
            )

        sql = f"""
        SELECT DISTINCT p.ID AS id
        FROM `{self._t('posts')}` p
        LEFT JOIN `{self._t('postmeta')}` pm_price
          ON pm_price.post_id=p.ID AND pm_price.meta_key='_price'
        {sales_join}
        {self._join_filters(category_slug=category_slug, category_name=category_name, brand=brand)}
        WHERE p.post_type='product' AND p.post_status='publish'
        {where}
        ORDER BY {order}
        LIMIT %s OFFSET %s
        """
        params.extend([int(limit), int(offset)])
        with self.db.connect() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                return [int(r["id"]) for r in cur.fetchall()]

    def search_page(
        self,
        *,
        q: Optional[str] = None,
        q_any: Optional[list[str]] = None,
        category_slug: Optional[str] = None,
        category_name: Optional[str] = None,
        brand: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        in_stock: Optional[bool] = None,
        sort: str = "date_desc",
        limit: int = 50,
        offset: int = 0,
        include_description: bool = False,
    ) -> tuple[int, list[dict]]:
        """Count + page of product rows on a single pooled connection."""
        where, params = self._filters(
            q=q,
            q_any=q_any,
            category_slug=category_slug,
            category_name=category_name,
            brand=brand,
            min_price=min_price,
            max_price=max_price,
            in_stock=in_stock,
        )
        joins = self._join_filters(category_slug=category_slug, category_name=category_name, brand=brand)
        order = {
            "date_desc": "p.ID DESC",
            "date_asc": "p.ID ASC",
            "title_asc": "p.post_title ASC",
            "title_desc": "p.post_title DESC",
            "price_asc": "CAST(pm_price.meta_value AS DECIMAL(12,2)) ASC",
            "price_desc": "CAST(pm_price.meta_value AS DECIMAL(12,2)) DESC",
            "sales_desc": "CAST(IFNULL(pm_sales.meta_value,0) AS UNSIGNED) DESC",
        }.get(sort or "date_desc", "p.ID DESC")
        sales_join = ""
        if sort == "sales_desc":
            sales_join = (
                f"LEFT JOIN `{self._t('postmeta')}` pm_sales "
                "ON pm_sales.post_id=p.ID AND pm_sales.meta_key='total_sales'"
            )
        # Unfiltered list: skip expensive COUNT(*) over 15k+ rows; use cached total.
        unfiltered = not (
            q
            or q_any
            or category_slug
            or category_name
            or brand
            or min_price is not None
            or max_price is not None
            or in_stock is not None
        )
        count_sql = f"""
        SELECT COUNT(DISTINCT p.ID) AS c
        FROM `{self._t('posts')}` p
        LEFT JOIN `{self._t('postmeta')}` pm_price
          ON pm_price.post_id=p.ID AND pm_price.meta_key='_price'
        {joins}
        WHERE p.post_type='product' AND p.post_status='publish'
        {where}
        """
        ids_sql = f"""
        SELECT DISTINCT p.ID AS id
        FROM `{self._t('posts')}` p
        LEFT JOIN `{self._t('postmeta')}` pm_price
          ON pm_price.post_id=p.ID AND pm_price.meta_key='_price'
        {sales_join}
        {joins}
        WHERE p.post_type='product' AND p.post_status='publish'
        {where}
        ORDER BY {order}
        LIMIT %s OFFSET %s
        """
        with self.db.connect() as conn:
            with conn.cursor() as cur:
                if unfiltered:
                    now = time.time()
                    if self._published_count and now - self._published_count[0] < 600:
                        total = self._published_count[1]
                    else:
                        cur.execute(
                            f"SELECT COUNT(*) AS c FROM `{self._t('posts')}` "
                            "WHERE post_type='product' AND post_status='publish'"
                        )
                        total = int(cur.fetchone()["c"])
                        self._published_count = (now, total)
                else:
                    cur.execute(count_sql, params)
                    total = int(cur.fetchone()["c"])
                cur.execute(ids_sql, list(params) + [int(limit), int(offset)])
                ids = [int(r["id"]) for r in cur.fetchall()]
            rows = self._hydrate_products(conn, ids, include_description=include_description)
            if ids:
                # Best-effort uuid map on same connection (no extra TCP).
                try:
                    with conn.cursor() as cur:
                        pairs = [
                            (str(uuid.uuid5(uuid.NAMESPACE_URL, f"samphone:{i}")), i) for i in ids
                        ]
                        if self._uuid_index is not None:
                            for u, i in pairs:
                                self._uuid_index[u] = i
                        cur.executemany(
                            """
                            INSERT INTO samphone_id_map (product_uuid, wc_id)
                            VALUES (%s, %s)
                            ON DUPLICATE KEY UPDATE wc_id=VALUES(wc_id)
                            """,
                            pairs,
                        )
                except Exception:
                    pass
        return total, rows

    def weighted_search_page(
        self,
        *,
        q: str,
        extra_keywords: Optional[list[str]] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        in_stock: Optional[bool] = None,
        limit: int = 50,
        offset: int = 0,
        include_description: bool = False,
        fuzzy: bool = True,
    ) -> tuple[int, list[dict]]:
        """
        Amazon / Flipkart style weighted search.

        Match via LIKE (never '=') across:
          name(100), SKU(90), category(80), brand(70), tags(60),
          short+long description(50), attributes(40).

        Include product if ANY keyword hits ANY field. Sort by relevance DESC.
        Synonyms expand the query; fuzzy broadening runs when hits are scarce.
        """
        from weighted_search import (
            AMBIGUOUS_TOKENS,
            WEIGHT_ATTRIBUTES,
            WEIGHT_BRAND,
            WEIGHT_CATEGORY,
            WEIGHT_DESCRIPTION,
            WEIGHT_MULTI_TOKEN_BONUS,
            WEIGHT_NAME,
            WEIGHT_PHRASE_BONUS,
            WEIGHT_SKU,
            WEIGHT_TAGS,
            build_search_terms,
            fuzzy_variants,
            like_pattern,
            mysql_generation_regexp,
        )

        terms = build_search_terms(q, extra_keywords=extra_keywords)
        expanded = terms["expanded"]
        tokens = terms["tokens"]
        phrase = terms["phrase"]
        score_keywords = terms.get("score_keywords") or list(tokens or [])
        required_tokens = list(terms.get("required_tokens") or [])
        if not expanded and not phrase:
            return self.search_page(
                q=None,
                min_price=min_price,
                max_price=max_price,
                in_stock=in_stock,
                sort="date_desc",
                limit=limit,
                offset=offset,
                include_description=include_description,
            )

        posts = self._t("posts")
        postmeta = self._t("postmeta")
        tr = self._t("term_relationships")
        tt = self._t("term_taxonomy")
        terms_t = self._t("terms")

        # Precompute taxonomy SQL fragments (avoid backslashes inside f-string expressions)
        tax_cat = "taxonomy = 'product_cat'"
        tax_tag = "taxonomy = 'product_tag'"
        tax_attr = "taxonomy LIKE 'pa\\_%%'"
        tax_brand = (
            "taxonomy LIKE 'pa\\_%%brand%%' OR taxonomy = 'product_brand' OR taxonomy = 'pa_brand'"
        )

        def _price_stock_clauses() -> tuple[str, list[Any]]:
            clauses: list[str] = []
            params: list[Any] = []
            if min_price is not None:
                clauses.append("AND CAST(pm_price.meta_value AS DECIMAL(12,2)) >= %s")
                params.append(min_price)
            if max_price is not None:
                clauses.append("AND CAST(pm_price.meta_value AS DECIMAL(12,2)) <= %s")
                params.append(max_price)
            if in_stock is True:
                clauses.append(
                    f"""
                    AND EXISTS (
                      SELECT 1 FROM `{postmeta}` st
                      WHERE st.post_id=p.ID AND st.meta_key='_stock_status' AND st.meta_value='instock'
                    )
                    """
                )
            elif in_stock is False:
                clauses.append(
                    f"""
                    AND EXISTS (
                      SELECT 1 FROM `{postmeta}` st
                      WHERE st.post_id=p.ID AND st.meta_key='_stock_status' AND st.meta_value='outofstock'
                    )
                    """
                )
            return "\n".join(clauses), params

        def _exists_taxonomy(alias: str, tax_cond: str) -> str:
            # Rewrite bare "taxonomy" references to aliased column
            cond = tax_cond.replace("taxonomy", f"tt{alias}.taxonomy")
            return f"""
            EXISTS (
              SELECT 1
              FROM `{tr}` tr{alias}
              INNER JOIN `{tt}` tt{alias}
                ON tt{alias}.term_taxonomy_id = tr{alias}.term_taxonomy_id
              INNER JOIN `{terms_t}` t{alias}
                ON t{alias}.term_id = tt{alias}.term_id
              WHERE tr{alias}.object_id = p.ID
                AND ({cond})
                AND t{alias}.name LIKE %s
            )
            """

        def _field_match_ors(patterns: list[str]) -> tuple[str, list[Any]]:
            parts: list[str] = []
            params: list[Any] = []
            for i, pat in enumerate(patterns):
                a = str(i)
                cat_ex = _exists_taxonomy(a + "c", tax_cat)
                tag_ex = _exists_taxonomy(a + "g", tax_tag)
                attr_ex = _exists_taxonomy(a + "a", tax_attr)
                brand_ex = _exists_taxonomy(a + "b", tax_brand)
                parts.append(
                    "("
                    "p.post_title LIKE %s"
                    " OR IFNULL(pm_sku.meta_value,'') LIKE %s"
                    " OR IFNULL(p.post_excerpt,'') LIKE %s"
                    " OR LEFT(IFNULL(p.post_content,''), 6000) LIKE %s"
                    f" OR {cat_ex}"
                    f" OR {tag_ex}"
                    f" OR {attr_ex}"
                    f" OR {brand_ex}"
                    ")"
                )
                params.extend([pat, pat, pat, pat, pat, pat, pat, pat])
            return "(" + " OR ".join(parts) + ")", params

        def _score_expr(keyword_pats: list[str], phrase_pat: Optional[str]) -> tuple[str, list[Any]]:
            chunks: list[str] = []
            params: list[Any] = []
            if phrase_pat:
                chunks.append(
                    f"(CASE WHEN LOWER(p.post_title) LIKE %s THEN {WEIGHT_PHRASE_BONUS} ELSE 0 END)"
                )
                params.append(phrase_pat)

            for i, pat in enumerate(keyword_pats):
                a = str(i)
                cat_ex = _exists_taxonomy(a + "sc", tax_cat)
                brand_ex = _exists_taxonomy(a + "sb", tax_brand)
                tag_ex = _exists_taxonomy(a + "st", tax_tag)
                attr_ex = _exists_taxonomy(a + "sa", tax_attr)
                chunks.append(
                    "("
                    "CASE "
                    f"WHEN p.post_title LIKE %s THEN {WEIGHT_NAME} "
                    f"WHEN IFNULL(pm_sku.meta_value,'') LIKE %s THEN {WEIGHT_SKU} "
                    f"WHEN {cat_ex} THEN {WEIGHT_CATEGORY} "
                    f"WHEN {brand_ex} THEN {WEIGHT_BRAND} "
                    f"WHEN {tag_ex} THEN {WEIGHT_TAGS} "
                    f"WHEN IFNULL(p.post_excerpt,'') LIKE %s "
                    f"  OR LEFT(IFNULL(p.post_content,''), 6000) LIKE %s "
                    f"  THEN {WEIGHT_DESCRIPTION} "
                    f"WHEN {attr_ex} THEN {WEIGHT_ATTRIBUTES} "
                    "ELSE 0 END"
                    ")"
                )
                params.extend([pat, pat, pat, pat, pat, pat, pat, pat])

            if len(keyword_pats) > 1:
                hit_sum = " + ".join(
                    ["(CASE WHEN p.post_title LIKE %s THEN 1 ELSE 0 END)"] * len(keyword_pats)
                )
                chunks.append(
                    f"(CASE WHEN ({hit_sum}) > 1 THEN (({hit_sum}) - 1) * {WEIGHT_MULTI_TOKEN_BONUS} ELSE 0 END)"
                )
                params.extend(list(keyword_pats))
                params.extend(list(keyword_pats))

            if not chunks:
                return "0", []
            return "(" + " + ".join(chunks) + ")", params

        match_patterns = [like_pattern(t) for t in expanded[:24]]
        score_terms = list(score_keywords[:10]) or list(tokens[:8]) or expanded[:8]
        score_token_patterns = [like_pattern(t) for t in score_terms]
        phrase_pat = like_pattern(phrase) if phrase else None

        def _run(match_pats: list[str], score_pats: list[str], ph_pat: Optional[str]) -> tuple[int, list[int]]:
            if not match_pats:
                return 0, []
            wm, mp = _field_match_ors(match_pats)
            sc, sp = _score_expr(score_pats, ph_pat)
            psql, pparams = _price_stock_clauses()
            exclude_orphans = self._sql_exclude_orphan_variations("p")
            req_sql = ""
            req_params: list[Any] = []
            for tok in required_tokens[:4]:
                req_sql += " AND LOWER(p.post_title) REGEXP %s"
                req_params.append(mysql_generation_regexp(tok))
            frm = f"""
            FROM `{posts}` p
            LEFT JOIN `{postmeta}` pm_price
              ON pm_price.post_id = p.ID AND pm_price.meta_key = '_price'
            LEFT JOIN `{postmeta}` pm_sku
              ON pm_sku.post_id = p.ID AND pm_sku.meta_key = '_sku'
            WHERE p.post_type = 'product' AND p.post_status = 'publish'
              AND {wm}
              {psql}
              {exclude_orphans}
              {req_sql}
            """
            c_sql = f"SELECT COUNT(DISTINCT p.ID) AS c {frm}"
            i_sql = f"""
            SELECT p.ID AS id, {sc} AS relevance
            {frm}
            GROUP BY p.ID
            ORDER BY relevance DESC, p.ID DESC
            LIMIT %s OFFSET %s
            """
            c_params = list(mp) + list(pparams) + list(req_params)
            i_params = list(sp) + list(mp) + list(pparams) + list(req_params) + [int(limit), int(offset)]
            with self.db.connect() as conn:
                with conn.cursor() as cur:
                    cur.execute(c_sql, c_params)
                    total = int(cur.fetchone()["c"])
                    cur.execute(i_sql, i_params)
                    ids = [int(r["id"]) for r in cur.fetchall()]
            return total, ids

        try:
            total, ids = _run(match_patterns, score_token_patterns, phrase_pat)
        except Exception as exc:
            logger.warning("weighted_search_page failed, falling back to title LIKE: %s", exc)
            return self.search_page(
                q=q,
                min_price=min_price,
                max_price=max_price,
                in_stock=in_stock,
                sort="date_desc",
                limit=limit,
                offset=offset,
                include_description=include_description,
            )

        if fuzzy and total < 3 and tokens:
            distinctive: list[str] = []
            for t in tokens[:8]:
                if t in AMBIGUOUS_TOKENS:
                    continue
                if len(t) >= 3 or t.isdigit():
                    distinctive.append(t)
                for fv in fuzzy_variants(t):
                    distinctive.append(fv)
            collapsed = re.sub(r"[\s\-]+", "", phrase or "")
            if collapsed and len(collapsed) >= 4:
                distinctive.append(collapsed)
            seen_d: set[str] = set()
            loose_terms: list[str] = []
            for t in distinctive:
                if t not in seen_d:
                    seen_d.add(t)
                    loose_terms.append(t)
            if loose_terms:
                loose = [like_pattern(t) for t in loose_terms[:10]]
                try:
                    total2, ids2 = _run(loose, loose[:8], phrase_pat)
                    if total2 > total:
                        total, ids = total2, ids2
                        logger.info("weighted_search fuzzy broaden q=%r total=%s", q, total)
                except Exception as exc:
                    logger.debug("weighted_search fuzzy pass skipped: %s", exc)

        with self.db.connect() as conn:
            rows = self._hydrate_products(conn, ids, include_description=include_description)
            if ids:
                try:
                    with conn.cursor() as cur:
                        pairs = [
                            (str(uuid.uuid5(uuid.NAMESPACE_URL, f"samphone:{i}")), i) for i in ids
                        ]
                        if getattr(self, "_uuid_index", None) is not None:
                            for u, i in pairs:
                                self._uuid_index[u] = i
                        cur.executemany(
                            """
                            INSERT INTO samphone_id_map (product_uuid, wc_id)
                            VALUES (%s, %s)
                            ON DUPLICATE KEY UPDATE wc_id=VALUES(wc_id)
                            """,
                            pairs,
                        )
                except Exception:
                    pass
            by_id = {int(r.get("wc_id") or r.get("id")): r for r in rows}
            ordered = [by_id[i] for i in ids if i in by_id]
            return total, ordered if ordered else rows

    def get_products_by_ids(self, ids: list[int], *, include_description: bool = False) -> list[dict]:
        if not ids:
            return []
        with self.db.connect() as conn:
            return self._hydrate_products(conn, ids, include_description=include_description)

    def _hydrate_products(
        self,
        conn,
        ids: list[int],
        *,
        include_description: bool = False,
    ) -> list[dict]:
        if not ids:
            return []
        placeholders = ",".join(["%s"] * len(ids))
        cols = "p.ID AS wc_id, p.post_title AS title, p.post_name AS slug, p.post_date AS created_at, p.post_modified AS updated_at"
        if include_description:
            cols += ", p.post_content AS description, p.post_excerpt AS short_description"
        sql = f"""
        SELECT {cols}
        FROM `{self._t('posts')}` p
        WHERE p.ID IN ({placeholders}) AND p.post_type='product'
        """
        with conn.cursor() as cur:
            cur.execute(sql, [int(i) for i in ids])
            rows = cur.fetchall()
            by_id = {int(r["wc_id"]): dict(r) for r in rows}

            key_ph = ",".join(["%s"] * len(META_KEYS))
            cur.execute(
                f"""
                SELECT post_id, meta_key, meta_value
                FROM `{self._t('postmeta')}`
                WHERE post_id IN ({placeholders}) AND meta_key IN ({key_ph})
                """,
                [int(i) for i in ids] + list(META_KEYS),
            )
            for m in cur.fetchall():
                pid = int(m["post_id"])
                if pid not in by_id:
                    continue
                alias = self._meta_alias(m["meta_key"])
                val = m["meta_value"]
                if alias == "stock_status" and str(by_id[pid].get(alias) or "").lower() == "outofstock":
                    continue
                by_id[pid][alias] = val

            try:
                cur.execute(
                    f"""
                    SELECT product_id, b2c_price, public_price, business_price, markup,
                           image_url, compare_at_price
                    FROM samphone_b2c_pricing
                    WHERE product_id IN ({placeholders})
                    """,
                    [int(i) for i in ids],
                )
            except Exception:
                try:
                    cur.execute(
                        f"""
                        SELECT product_id, b2c_price, public_price, business_price, markup
                        FROM samphone_b2c_pricing
                        WHERE product_id IN ({placeholders})
                        """,
                        [int(i) for i in ids],
                    )
                except Exception:
                    cur.execute(
                        f"""
                        SELECT product_id, b2c_price, markup
                        FROM samphone_b2c_pricing
                        WHERE product_id IN ({placeholders})
                        """,
                        [int(i) for i in ids],
                    )
            for b in cur.fetchall():
                pid = int(b["product_id"])
                if pid in by_id:
                    by_id[pid]["override_b2c_price"] = b["b2c_price"]
                    by_id[pid]["stored_public_price"] = b.get("public_price")
                    by_id[pid]["stored_business_price"] = b.get("business_price")
                    by_id[pid]["override_markup"] = b["markup"]
                    if b.get("image_url"):
                        by_id[pid]["override_image_url"] = b["image_url"]
                    if b.get("compare_at_price") is not None:
                        by_id[pid]["override_compare_at"] = b["compare_at_price"]

        ordered = [by_id[i] for i in ids if i in by_id]
        if not include_description:
            for r in ordered:
                r["description"] = ""
                r["short_description"] = ""
        self._attach_categories(ordered, conn=conn)
        self._attach_color_attributes(ordered, conn=conn)
        self._attach_images(ordered, conn=conn)
        return ordered

    def get_product(self, wc_id: int, *, include_description: bool = True) -> Optional[dict]:
        rows = self.get_products_by_ids([int(wc_id)], include_description=include_description)
        return rows[0] if rows else None

    def resolve_orphan_color_parent(
        self, row: dict, *, include_description: bool = True
    ) -> tuple[Optional[dict], Optional[str]]:
        """
        Map standalone "PARENT - Color" posts (product_type=variation) to the
        real variable parent + color label. Returns (parent_row, color_label).
        """
        if not row:
            return None, None
        if str(row.get("product_type") or "").lower() != "variation":
            return row, None
        title = (row.get("title") or "").strip()
        if " - " not in title:
            return row, None
        base, color = title.rsplit(" - ", 1)
        base = base.strip()
        color = color.strip()
        if not base or not color:
            return row, None
        with self.db.connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    SELECT p.ID
                    FROM `{self._t('posts')}` p
                    INNER JOIN `{self._t('term_relationships')}` tr ON tr.object_id = p.ID
                    INNER JOIN `{self._t('term_taxonomy')}` tt
                      ON tt.term_taxonomy_id = tr.term_taxonomy_id
                     AND tt.taxonomy = 'product_type'
                    INNER JOIN `{self._t('terms')}` t ON t.term_id = tt.term_id
                    WHERE p.post_type = 'product'
                      AND p.post_status = 'publish'
                      AND p.post_title = %s
                      AND t.slug = 'variable'
                    LIMIT 1
                    """,
                    (base,),
                )
                hit = cur.fetchone()
                if not hit:
                    return row, None
                parent_id = int(hit["ID"])
            parents = self._hydrate_products(conn, [parent_id], include_description=include_description)
        if not parents:
            return row, None
        return parents[0], color

    def get_product_by_slug(self, slug: str, *, include_description: bool = True) -> Optional[dict]:
        with self.db.connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"SELECT ID FROM `{self._t('posts')}` WHERE post_name=%s AND post_type='product' LIMIT 1",
                    (slug,),
                )
                row = cur.fetchone()
                if not row:
                    return None
                rows = self._hydrate_products(conn, [int(row["ID"])], include_description=include_description)
        return rows[0] if rows else None

    def _attach_categories(self, rows: list[dict], *, conn=None) -> None:
        if not rows:
            return
        ids = [int(r["wc_id"]) for r in rows]
        placeholders = ",".join(["%s"] * len(ids))
        sql = f"""
        SELECT tr.object_id AS product_id, t.term_id, t.name, t.slug, tt.taxonomy
        FROM `{self._t('term_relationships')}` tr
        JOIN `{self._t('term_taxonomy')}` tt ON tt.term_taxonomy_id = tr.term_taxonomy_id
        JOIN `{self._t('terms')}` t ON t.term_id = tt.term_id
        WHERE tr.object_id IN ({placeholders})
          AND (
            tt.taxonomy IN ('product_cat','product_tag','product_type','pa_color','pa_storage')
            OR tt.taxonomy LIKE 'pa\\_%%'
          )
        """

        def _run(c) -> list:
            with c.cursor() as cur:
                cur.execute(sql, ids)
                return cur.fetchall()

        if conn is not None:
            links = _run(conn)
        else:
            with self.db.connect() as c:
                links = _run(c)

        buckets: dict[int, list[dict]] = {i: [] for i in ids}
        for link in links:
            buckets[int(link["product_id"])].append(
                {
                    "wc_id": int(link["term_id"]),
                    "name": link["name"] or "",
                    "slug": link["slug"] or "",
                    "taxonomy": link["taxonomy"],
                }
            )
        for r in rows:
            cats = buckets.get(int(r["wc_id"]), [])
            r["categories"] = [c for c in cats if c["taxonomy"] == "product_cat"]
            r["tags"] = [c for c in cats if c["taxonomy"] == "product_tag"]
            r["pa_terms"] = [c for c in cats if str(c.get("taxonomy") or "").startswith("pa_")]
            r["attributes"] = [c for c in cats if str(c.get("taxonomy") or "").startswith("pa_")]
            types = [c["name"] for c in cats if c["taxonomy"] == "product_type"]
            r["product_type"] = (types[0] if types else "simple").lower()

    def _attach_color_attributes(self, rows: list[dict], *, conn=None) -> None:
        """Build REST-like color attributes + variation rows for color circles."""
        if not rows:
            return
        from product_variants import attributes_from_pa_terms, parse_product_attributes_meta

        ids = [int(r["wc_id"]) for r in rows]
        placeholders = ",".join(["%s"] * len(ids))

        def _run(c) -> tuple[dict[int, str], dict[int, list[dict]], dict[int, str]]:
            attr_meta: dict[int, str] = {}
            variations_by_parent: dict[int, list[dict]] = {i: [] for i in ids}
            thumb_guid: dict[int, str] = {}
            with c.cursor() as cur:
                cur.execute(
                    f"""
                    SELECT post_id, meta_value
                    FROM `{self._t('postmeta')}`
                    WHERE post_id IN ({placeholders}) AND meta_key='_product_attributes'
                    """,
                    ids,
                )
                for row in cur.fetchall():
                    attr_meta[int(row["post_id"])] = row.get("meta_value") or ""

                # Variations for variable parents (and any parent that has children).
                cur.execute(
                    f"""
                    SELECT ID, post_parent, post_status
                    FROM `{self._t('posts')}`
                    WHERE post_parent IN ({placeholders})
                      AND post_type='product_variation'
                      AND post_status IN ('publish','private')
                    """,
                    ids,
                )
                var_rows = cur.fetchall()
                var_ids = [int(v["ID"]) for v in var_rows]
                parent_of = {int(v["ID"]): int(v["post_parent"]) for v in var_rows}
                if not var_ids:
                    return attr_meta, variations_by_parent, thumb_guid

                vph = ",".join(["%s"] * len(var_ids))
                cur.execute(
                    f"""
                    SELECT post_id, meta_key, meta_value
                    FROM `{self._t('postmeta')}`
                    WHERE post_id IN ({vph})
                      AND (
                        meta_key LIKE 'attribute\\_%%'
                        OR meta_key IN ('_thumbnail_id','_stock_status','_price')
                      )
                    """,
                    var_ids,
                )
                meta_by_var: dict[int, dict[str, str]] = {vid: {} for vid in var_ids}
                thumb_ids: list[int] = []
                for m in cur.fetchall():
                    vid = int(m["post_id"])
                    key = str(m["meta_key"] or "")
                    val = "" if m.get("meta_value") is None else str(m["meta_value"])
                    meta_by_var[vid][key] = val
                    if key == "_thumbnail_id" and val.isdigit():
                        thumb_ids.append(int(val))

                attached_file: dict[int, str] = {}
                if thumb_ids:
                    tph = ",".join(["%s"] * len(thumb_ids))
                    cur.execute(
                        f"SELECT ID, guid FROM `{self._t('posts')}` WHERE ID IN ({tph})",
                        thumb_ids,
                    )
                    for t in cur.fetchall():
                        thumb_guid[int(t["ID"])] = (t.get("guid") or "").strip()
                    cur.execute(
                        f"""
                        SELECT post_id, meta_value
                        FROM `{self._t('postmeta')}`
                        WHERE post_id IN ({tph}) AND meta_key='_wp_attached_file'
                        """,
                        thumb_ids,
                    )
                    for t in cur.fetchall():
                        attached_file[int(t["post_id"])] = (t.get("meta_value") or "").strip()

                uploads = f"{self.site_url().rstrip('/')}/wp-content/uploads/"
                for vid, meta in meta_by_var.items():
                    parent = parent_of.get(vid)
                    if parent is None:
                        continue
                    attrs = []
                    for key, val in meta.items():
                        if not key.startswith("attribute_") or not val:
                            continue
                        slug = key[len("attribute_") :]
                        attrs.append({"name": slug.replace("-", " ").replace("_", " ").title(), "option": val})
                    thumb = meta.get("_thumbnail_id") or ""
                    image = None
                    if thumb.isdigit():
                        tid = int(thumb)
                        file_path = attached_file.get(tid) or ""
                        src = ""
                        if file_path.startswith("http"):
                            src = file_path
                        elif file_path:
                            src = uploads + file_path.lstrip("/")
                        elif thumb_guid.get(tid) and "wp-content/uploads" in thumb_guid[tid]:
                            src = thumb_guid[tid]
                        if src:
                            image = {"src": src}
                    variations_by_parent.setdefault(parent, []).append(
                        {
                            "id": vid,
                            "attributes": attrs,
                            "image": image,
                            "stock_status": meta.get("_stock_status") or "instock",
                        }
                    )
            return attr_meta, variations_by_parent, thumb_guid

        if conn is not None:
            attr_meta, variations_by_parent, _ = _run(conn)
        else:
            with self.db.connect() as c:
                attr_meta, variations_by_parent, _ = _run(c)

        for r in rows:
            wc_id = int(r["wc_id"])
            attrs = parse_product_attributes_meta(attr_meta.get(wc_id))
            pa_attrs = attributes_from_pa_terms(r.get("pa_terms") or [])
            # Prefer explicit meta options; merge pa_* that aren't already covered.
            have = {(a.get("slug") or "").lower() for a in attrs}
            for pa in pa_attrs:
                slug = (pa.get("slug") or "").lower()
                if slug not in have:
                    attrs.append(pa)
            r["attributes"] = attrs
            r["variations"] = variations_by_parent.get(wc_id) or []

    def _attach_images(self, rows: list[dict], *, conn=None) -> None:
        if not rows:
            return

        def _run(c) -> tuple[dict[int, str], dict[int, list[str]]]:
            thumbs: dict[int, str] = {}
            thumb_ids = []
            for r in rows:
                tid = r.get("thumbnail_id")
                if tid and str(tid).isdigit():
                    thumb_ids.append(int(tid))
            with c.cursor() as cur:
                if thumb_ids:
                    placeholders = ",".join(["%s"] * len(thumb_ids))
                    cur.execute(
                        f"SELECT ID, guid FROM `{self._t('posts')}` WHERE ID IN ({placeholders})",
                        thumb_ids,
                    )
                    for row in cur.fetchall():
                        thumbs[int(row["ID"])] = self._normalize_url(row.get("guid") or "")

                ids = [int(r["wc_id"]) for r in rows]
                placeholders = ",".join(["%s"] * len(ids))
                galleries: dict[int, list[str]] = {i: [] for i in ids}
                cur.execute(
                    f"""
                    SELECT post_id, meta_value FROM `{self._t('postmeta')}`
                    WHERE meta_key='_product_image_gallery' AND post_id IN ({placeholders})
                    """,
                    ids,
                )
                gallery_meta = cur.fetchall()
                gallery_ids: list[int] = []
                map_product_gallery: dict[int, list[int]] = {}
                for g in gallery_meta:
                    pid = int(g["post_id"])
                    raw = (g.get("meta_value") or "").strip()
                    gids = [int(x) for x in raw.split(",") if x.strip().isdigit()]
                    map_product_gallery[pid] = gids
                    gallery_ids.extend(gids)
                gallery_urls: dict[int, str] = {}
                if gallery_ids:
                    uniq = list(dict.fromkeys(gallery_ids))
                    ph = ",".join(["%s"] * len(uniq))
                    cur.execute(f"SELECT ID, guid FROM `{self._t('posts')}` WHERE ID IN ({ph})", uniq)
                    for row in cur.fetchall():
                        gallery_urls[int(row["ID"])] = self._normalize_url(row.get("guid") or "")
                for pid, gids in map_product_gallery.items():
                    galleries[pid] = [gallery_urls[i] for i in gids if i in gallery_urls and gallery_urls[i]]
            return thumbs, galleries

        if conn is not None:
            thumbs, galleries = _run(conn)
        else:
            with self.db.connect() as c:
                thumbs, galleries = _run(c)

        for r in rows:
            urls: list[str] = []
            tid = r.get("thumbnail_id")
            if tid and str(tid).isdigit():
                u = thumbs.get(int(tid))
                if u:
                    urls.append(u)
            for u in galleries.get(int(r["wc_id"]), []):
                if u and u not in urls:
                    urls.append(u)
            r["image_urls"] = urls

    def _normalize_url(self, url: str) -> str:
        u = (url or "").strip()
        if not u:
            return u
        if u.startswith("//"):
            u = "https:" + u
        u = re.sub(r"^http://", "https://", u, flags=re.I)
        u = re.sub(r"^https://samphone\.pt/", "https://www.samphone.pt/", u, flags=re.I)
        return u

    def list_categories(self) -> list[dict]:
        now = time.time()
        if self._cat_cache and now - self._cat_cache[0] < self._cache_ttl:
            return list(self._cat_cache[1])
        sql = f"""
        SELECT t.term_id AS id, t.name, t.slug, tt.count, tt.parent
        FROM `{self._t('terms')}` t
        JOIN `{self._t('term_taxonomy')}` tt ON tt.term_id = t.term_id
        WHERE tt.taxonomy='product_cat' AND tt.count > 0
        ORDER BY t.name ASC
        """
        with self.db.connect() as conn:
            with conn.cursor() as cur:
                cur.execute(sql)
                rows = [
                    {
                        "wc_id": int(r["id"]),
                        "name": r["name"],
                        "slug": r["slug"],
                        "count": int(r["count"] or 0),
                        "parent": int(r["parent"] or 0),
                    }
                    for r in cur.fetchall()
                ]
        self._cat_cache = (now, rows)
        return list(rows)

    def list_brands_from_titles(self, *, limit: int = 100) -> list[dict]:
        """Approximate brands from known phone brand keywords in titles (cached)."""
        now = time.time()
        if self._brand_cache and now - self._brand_cache[0] < self._cache_ttl:
            return list(self._brand_cache[1])
        from woocommerce_classify import PHONE_BRANDS

        brands: list[dict] = []
        with self.db.connect() as conn:
            with conn.cursor() as cur:
                for kw, brand in PHONE_BRANDS:
                    cur.execute(
                        f"""
                        SELECT COUNT(*) AS c FROM `{self._t('posts')}`
                        WHERE post_type='product' AND post_status='publish'
                          AND post_title LIKE %s
                        """,
                        (f"%{kw.strip()}%",),
                    )
                    c = int(cur.fetchone()["c"])
                    if c > 0:
                        brands.append({"name": brand, "keyword": kw.strip(), "count": c})
        # de-dupe by brand name keep max count
        merged: dict[str, dict] = {}
        for b in brands:
            prev = merged.get(b["name"])
            if not prev or b["count"] > prev["count"]:
                merged[b["name"]] = b
        out = sorted(merged.values(), key=lambda x: (-x["count"], x["name"]))[:limit]
        self._brand_cache = (now, out)
        return list(out)

    def related_product_ids(self, wc_id: int, *, limit: int = 12) -> list[int]:
        # Same product_cat terms, exclude self
        sql = f"""
        SELECT tr2.object_id AS id, COUNT(*) AS shared
        FROM `{self._t('term_relationships')}` tr
        JOIN `{self._t('term_taxonomy')}` tt ON tt.term_taxonomy_id = tr.term_taxonomy_id
          AND tt.taxonomy='product_cat'
        JOIN `{self._t('term_relationships')}` tr2 ON tr2.term_taxonomy_id = tr.term_taxonomy_id
        JOIN `{self._t('posts')}` p ON p.ID = tr2.object_id
          AND p.post_type='product' AND p.post_status='publish'
        WHERE tr.object_id = %s AND tr2.object_id != %s
          {self._sql_exclude_orphan_variations("p")}
        GROUP BY tr2.object_id
        ORDER BY shared DESC, tr2.object_id DESC
        LIMIT %s
        """
        with self.db.connect() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, (int(wc_id), int(wc_id), int(limit)))
                return [int(r["id"]) for r in cur.fetchall()]


_repo: ProductRepository | None = None


def get_product_repository() -> ProductRepository:
    global _repo
    if _repo is None:
        _repo = ProductRepository()
    return _repo
