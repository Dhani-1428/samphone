"""Catalog-trained vocabulary for voice search.

Loads brands, models, and product-type terms from the live WooCommerce MySQL
catalog (and models_cache.json) so Whisper / LLM / weighted search know what
customers can actually buy — without embeddings or a separate semantic stack.
"""

from __future__ import annotations

import logging
import re
import time
from dataclasses import dataclass, field
from difflib import get_close_matches
from typing import Any, Optional

logger = logging.getLogger(__name__)

_VOCAB_TTL_SEC = 3600.0
_cache: tuple[float, "CatalogVocab"] | None = None

# High-value accessory / part phrases that appear across the Samphone catalog.
_PRODUCT_TYPES = (
    "cover",
    "case",
    "soft jelly",
    "silicon soft jelly",
    "jelly",
    "capa",
    "tempered glass",
    "screen protector",
    "privacy glass",
    "full glue glass",
    "uv glass",
    "charger",
    "cable",
    "battery",
    "power bank",
    "earbuds",
    "speaker",
    "display",
    "lcd",
    "oled",
    "camera",
    "lens",
    "charging port",
    "flex cable",
    "back glass",
    "frame",
)


@dataclass
class CatalogVocab:
    brands: list[str] = field(default_factory=list)
    models: list[str] = field(default_factory=list)  # canonical model names
    model_to_brand: dict[str, str] = field(default_factory=dict)  # lower(name) → brand
    categories: list[str] = field(default_factory=list)
    product_types: list[str] = field(default_factory=list)
    # lower alias → canonical model name
    aliases: dict[str, str] = field(default_factory=dict)
    # lower synonym key → expansion terms (for weighted_search)
    dynamic_synonyms: dict[str, list[str]] = field(default_factory=dict)
    loaded_at: float = 0.0
    source_counts: dict[str, int] = field(default_factory=dict)

    @property
    def ready(self) -> bool:
        return bool(self.brands or self.models or self.categories)


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower())


def _add_alias(aliases: dict[str, str], alias: str, canonical: str) -> None:
    key = _norm(alias)
    can = (canonical or "").strip()
    if not key or not can or len(key) < 2:
        return
    # Prefer longer / more specific aliases; don't overwrite with shorter junk.
    prev = aliases.get(key)
    if prev and len(prev) > len(can):
        return
    aliases[key] = can


def load_catalog_vocab(*, force: bool = False) -> CatalogVocab:
    """Build / return cached catalog vocabulary from MySQL + models cache."""
    global _cache
    now = time.time()
    if not force and _cache and now - _cache[0] < _VOCAB_TTL_SEC:
        return _cache[1]

    vocab = CatalogVocab(loaded_at=now, product_types=list(_PRODUCT_TYPES))
    brands: list[str] = []
    models: list[str] = []
    model_to_brand: dict[str, str] = {}
    categories: list[str] = []
    aliases: dict[str, str] = {}
    dyn: dict[str, list[str]] = {}

    try:
        from woocommerce_classify import PHONE_BRANDS

        # Product-line keywords should stay as product names (iphone → iPhone), not collapse to brand-only.
        _PRODUCT_LINE = {
            "IPHONE": "iPhone",
            "IPAD": "iPad",
            "GALAXY": "Galaxy",
            "PIXEL": "Pixel",
            "REDMI": "Redmi",
            "POCO": "POCO",
            "MI": "Mi",
            "MOTO": "Moto",
        }
        for _kw, brand in PHONE_BRANDS:
            if brand and brand not in brands:
                brands.append(brand)
            if brand:
                _add_alias(aliases, brand, brand)
            kw = (_kw or "").strip()
            if not kw:
                continue
            pretty = _PRODUCT_LINE.get(kw.upper().strip())
            if pretty:
                _add_alias(aliases, kw, pretty)
            else:
                _add_alias(aliases, kw, brand)
    except Exception as exc:
        logger.debug("PHONE_BRANDS load skipped: %s", exc)

    # Always keep accessory brand Hoco + common Whisper misspellings.
    if "Hoco" not in brands:
        brands.insert(0, "Hoco")
    _add_alias(aliases, "Hoco", "Hoco")
    for miss in ("hokko", "hocco", "hocko", "hawko", "hoko"):
        _add_alias(aliases, miss, "Hoco")

    try:
        from services.catalog_service import get_catalog_service

        svc = get_catalog_service()
        # Brands with product counts from titles
        for row in svc.list_brands() or []:
            name = (row.get("name") or "").strip()
            if name and name not in brands:
                brands.append(name)
            if name:
                _add_alias(aliases, name, name)

        model_rows, _ = svc._load_models()
        # Prefer higher-count models for prompts (still index all aliases).
        ranked = sorted(
            model_rows or [],
            key=lambda m: int(m.get("count") or 0),
            reverse=True,
        )
        for row in ranked:
            name = (row.get("name") or "").strip()
            brand = (row.get("brand") or "").strip()
            if not name:
                continue
            models.append(name)
            model_to_brand[_norm(name)] = brand
            _add_alias(aliases, name, name)
            try:
                from model_match import model_aliases

                for a in model_aliases(name, brand):
                    _add_alias(aliases, a, name)
                    # Synonym expansions: alias → canonical (+ brand)
                    key = _norm(a)
                    extras = [name]
                    if brand and brand.lower() not in name.lower():
                        extras.append(f"{brand} {name}")
                    dyn.setdefault(key, [])
                    for e in extras:
                        if e.lower() not in {x.lower() for x in dyn[key]}:
                            dyn[key].append(e)
            except Exception:
                pass

        for cat in svc.list_categories() or []:
            cname = (cat.get("name") or "").strip()
            if cname and cname not in categories:
                categories.append(cname)
            # Short category names that look like product types
            low = _norm(cname)
            if low and 3 <= len(low) <= 40 and low not in {_norm(p) for p in _PRODUCT_TYPES}:
                if any(
                    t in low
                    for t in (
                        "glass",
                        "cover",
                        "case",
                        "battery",
                        "charger",
                        "cable",
                        "screen",
                        "display",
                        "speaker",
                        "camera",
                        "lens",
                        "flex",
                        "frame",
                        "earbuds",
                        "power",
                    )
                ):
                    vocab.product_types.append(cname)
    except Exception as exc:
        logger.warning("catalog vocab DB load failed: %s", exc)

    # De-dupe product types (preserve order)
    seen_pt: set[str] = set()
    pts: list[str] = []
    for p in vocab.product_types:
        k = _norm(p)
        if k and k not in seen_pt:
            seen_pt.add(k)
            pts.append(p)
    vocab.product_types = pts

    # Cap model list for memory; aliases still cover the rest via top N + brands.
    vocab.brands = brands
    vocab.models = models[:2500]
    vocab.model_to_brand = model_to_brand
    vocab.categories = categories[:800]
    vocab.aliases = aliases
    vocab.dynamic_synonyms = dyn
    vocab.source_counts = {
        "brands": len(vocab.brands),
        "models": len(models),
        "models_indexed": len(vocab.models),
        "categories": len(vocab.categories),
        "aliases": len(vocab.aliases),
        "product_types": len(vocab.product_types),
        "dynamic_synonyms": len(vocab.dynamic_synonyms),
    }

    try:
        from weighted_search import register_dynamic_synonyms

        # Only register compact synonym packs for frequent aliases (avoid huge OR clauses).
        compact: dict[str, list[str]] = {}
        for key, vals in list(dyn.items())[:400]:
            if len(key) >= 3:
                compact[key] = vals[:4]
        for pt in vocab.product_types[:40]:
            compact.setdefault(_norm(pt), []).append(pt)
        register_dynamic_synonyms(compact)
    except Exception as exc:
        logger.debug("dynamic synonyms register skipped: %s", exc)

    _cache = (now, vocab)
    logger.info(
        "Catalog voice vocab ready: brands=%s models=%s aliases=%s cats=%s",
        vocab.source_counts.get("brands"),
        vocab.source_counts.get("models"),
        vocab.source_counts.get("aliases"),
        vocab.source_counts.get("categories"),
    )
    return vocab


def whisper_prompt_snippet(max_chars: int = 220) -> str:
    """Short Whisper bias prompt from real catalog brands/models/types."""
    vocab = load_catalog_vocab()
    # Lead with high-confusion brands Whisper often misspells (Hoco→Hokko).
    parts: list[str] = ["Samphone", "Hoco", "iPhone", "Samsung"]
    for b in vocab.brands[:12]:
        if _norm(b) not in {_norm(p) for p in parts}:
            parts.append(b)
    # Top models by appearing first in ranked list (already count-sorted at load)
    for m in vocab.models[:18]:
        short = m
        if len(short) > 28:
            short = short[:28]
        parts.append(short)
    parts.extend(vocab.product_types[:10])
    text = " ".join(parts)
    if len(text) > max_chars:
        text = text[: max_chars - 1].rsplit(" ", 1)[0]
    return text or "Samphone Hoco iPhone Samsung cover glass charger battery"


def llm_catalog_context(max_chars: int = 3500) -> str:
    """Compact brand/model/product-type list for the LLM system prompt."""
    vocab = load_catalog_vocab()
    brands = ", ".join(vocab.brands[:30]) or "(none)"
    types = ", ".join(vocab.product_types[:40]) or "(none)"
    # Sample popular models
    models = ", ".join(vocab.models[:80]) or "(none)"
    block = (
        "VALID CATALOG (from Samphone product DB — map speech to these when possible):\n"
        f"Brands: {brands}\n"
        f"Product types: {types}\n"
        f"Popular models: {models}\n"
        "If the user names a model/brand that fuzzy-matches the list, use the catalog spelling."
    )
    if len(block) > max_chars:
        return block[: max_chars - 1]
    return block


def correct_transcript_fast(text: str) -> str:
    """Cheap grounding for the hot voice path — no fuzzy scan of 5k aliases."""
    raw = re.sub(r"\s+", " ", (text or "").strip())
    if not raw:
        return raw
    try:
        from weighted_search import rewrite_shop_query

        raw = rewrite_shop_query(raw) or raw
    except Exception:
        pass
    # Exact whole-phrase alias only (O(1) dict lookup)
    try:
        vocab = load_catalog_vocab()
        hit = vocab.aliases.get(_norm(raw))
        if hit:
            return hit
        # Token-level brand aliases (e.g. lone "hoco" → Hoco)
        tokens = raw.split()
        changed = False
        out_tokens: list[str] = []
        for tok in tokens:
            key = _norm(tok)
            if key in vocab.aliases and key in {_norm(b) for b in vocab.brands}:
                can = vocab.aliases[key]
                if can != tok:
                    changed = True
                out_tokens.append(can)
            else:
                out_tokens.append(tok)
        if changed:
            return " ".join(out_tokens)
    except Exception:
        pass
    return raw


def correct_transcript(text: str) -> str:
    """Map STT tokens to nearest catalog brand/model aliases (lightweight grounding)."""
    raw = correct_transcript_fast(text)
    if not raw:
        return raw
    vocab = load_catalog_vocab()
    if not vocab.aliases:
        return raw

    low = _norm(raw)
    # Prefer longer aliases (full model names) over short brand tokens.
    alias_keys = sorted(vocab.aliases.keys(), key=len, reverse=True)
    for key in alias_keys:
        if len(key) < 4 and key not in {"ipad", "poco", "moto"}:
            # Skip tiny brand fragments unless exact whole-query match.
            if key != low:
                continue
        if key == low or f" {key} " in f" {low} ":
            can = vocab.aliases[key]
            return re.sub(re.escape(key), can, raw, count=1, flags=re.I)

    keys = list(vocab.aliases.keys())
    windows: list[str] = [low]
    tokens = low.split()
    for n in (4, 3, 2):
        if len(tokens) < n:
            continue
        for i in range(len(tokens) - n + 1):
            windows.append(" ".join(tokens[i : i + n]))

    for win in windows:
        if len(win) < 4:
            continue
        hits = get_close_matches(win, keys, n=1, cutoff=0.88)
        if not hits:
            continue
        can = vocab.aliases[hits[0]]
        if win == low:
            return can
        return re.sub(re.escape(win), can, raw, count=1, flags=re.I)

    return raw


def ground_filters(filters: dict[str, Any]) -> dict[str, Any]:
    """Canonicalize brand/model/query fields against the catalog vocab."""
    out = dict(filters or {})
    vocab = load_catalog_vocab()
    if not vocab.ready:
        return out

    def canon_model(value: Any) -> Optional[str]:
        if value is None or value == "":
            return None
        text = str(value).strip()
        if not text:
            return None
        low = _norm(text)
        if low in vocab.aliases:
            return vocab.aliases[low]
        keys = list(vocab.aliases.keys())
        hits = get_close_matches(low, keys, n=1, cutoff=0.88)
        if hits:
            return vocab.aliases[hits[0]]
        return text

    def canon_brand(value: Any) -> Optional[str]:
        if value is None or value == "":
            return None
        text = str(value).strip()
        if not text:
            return None
        low = _norm(text)
        for b in vocab.brands:
            if _norm(b) == low:
                return b
        hits = get_close_matches(low, [_norm(b) for b in vocab.brands], n=1, cutoff=0.85)
        if hits:
            for b in vocab.brands:
                if _norm(b) == hits[0]:
                    return b
        return text

    if out.get("model"):
        out["model"] = canon_model(out.get("model"))
        mlow = _norm(str(out["model"] or ""))
        if mlow in vocab.model_to_brand and not out.get("brand"):
            out["brand"] = vocab.model_to_brand[mlow]

    if out.get("brand"):
        out["brand"] = canon_brand(out.get("brand"))

    if out.get("query"):
        out["query"] = correct_transcript_fast(str(out["query"]))

    # Force brand=Hoco when transcript/query clearly means Hoco (incl. Whisper "Hokko").
    qlow = _norm(str(out.get("query") or ""))
    blow = _norm(str(out.get("brand") or ""))
    if re.search(r"\bhoco\b", qlow) or blow in {"hokko", "hocco", "hocko", "hawko", "hoko", "hoco"}:
        out["brand"] = "Hoco"
        if blow in {"hokko", "hocco", "hocko", "hawko", "hoko"}:
            out["brand"] = "Hoco"
        if re.fullmatch(r"hoco(\s+products?)?", qlow or ""):
            out["query"] = "Hoco"
            if not out.get("category"):
                out["category"] = "Hoco"

    if out.get("product"):
        # Prefer catalog product-type spelling
        pl = _norm(str(out["product"]))
        for pt in vocab.product_types:
            if _norm(pt) == pl or pl in _norm(pt) or _norm(pt) in pl:
                out["product"] = pt
                break

    return out


def extra_keywords_for_query(text: str) -> list[str]:
    """Catalog terms to boost weighted search for a free-text / voice query."""
    vocab = load_catalog_vocab()
    low = _norm(text)
    if not low:
        return []
    out: list[str] = []
    seen: set[str] = set()

    def add(v: str) -> None:
        k = _norm(v)
        if not k or k in seen:
            return
        seen.add(k)
        out.append(v)

    for key, can in vocab.aliases.items():
        if len(key) >= 3 and (key in low or key == low):
            add(can)
            brand = vocab.model_to_brand.get(_norm(can))
            if brand:
                add(brand)
            if len(out) >= 12:
                break

    for pt in vocab.product_types:
        if _norm(pt) in low:
            add(pt)

    return out
