"""Weighted multi-field product search (Amazon / Flipkart style).

Never use exact '=' for free-text search. Keywords match via LIKE across:

  Product Name        100
  SKU                  90
  Category             80
  Brand                70
  Tags                 60
  Description          50   (short + long)
  Attributes           40

Any LLM / user keyword that hits any field includes the product.
Results are sorted by total relevance score (highest first).
Synonym + space/hyphen variants expand the query; fuzzy broadening
runs when few/no hits.
"""

from __future__ import annotations

import re
from typing import Iterable, Optional

# Field weights (higher = more important) — exact values requested by product
WEIGHT_NAME = 100
WEIGHT_SKU = 90
WEIGHT_CATEGORY = 80
WEIGHT_BRAND = 70
WEIGHT_TAGS = 60
WEIGHT_DESCRIPTION = 50
WEIGHT_ATTRIBUTES = 40

# Ranking bonuses (on top of per-keyword field weights)
WEIGHT_PHRASE_BONUS = 200  # full query phrase appears in product name
WEIGHT_MULTI_TOKEN_BONUS = 25  # each extra distinct keyword that hits

# Ecommerce / phone-parts synonyms (lowercase keys → extra LIKE terms)
SYNONYMS: dict[str, list[str]] = {
    "power bank": [
        "powerbank",
        "power-bank",
        "portable charger",
        "power banks",
        "powerbank charger",
        "battery pack",
        "power pack",
    ],
    "powerbank": ["power bank", "power-bank", "portable charger", "battery pack"],
    "portable charger": ["power bank", "powerbank", "power pack"],
    "iphone": ["apple iphone"],
    "samsung": ["galaxy"],
    "earbuds": ["ear buds", "earphones", "earphone", "tws", "wireless earbuds"],
    "earphones": ["earbuds", "ear buds", "earphone", "headphones"],
    "headphones": ["headphone", "headset", "earphones"],
    "charger": ["charging", "wall charger", "adapter", "charge"],
    "cable": ["usb cable", "charging cable", "data cable", "cord"],
    "screen protector": [
        "tempered glass",
        "screen guard",
        "glass protector",
        "protector",
        "uv glass",
        "full glue glass",
    ],
    "tempered glass": [
        "screen protector",
        "screen guard",
        "uv glass",
        "full glue glass",
        "glass protector",
    ],
    "case": [
        "cover",
        "back cover",
        "phone case",
        "protective case",
        "soft jelly",
        "silicon soft jelly",
        "jelly",
        "capa",
    ],
    "cover": [
        "case",
        "back cover",
        "phone case",
        "soft jelly",
        "silicon soft jelly",
        "jelly",
        "design cover",
        "capa",
    ],
    # Portuguese / ES / FR — "capa" must not LIKE-match "capacity" batteries
    "capa": [
        "cover",
        "case",
        "soft jelly",
        "silicon soft jelly",
        "back cover",
        "jelly",
        "design cover",
    ],
    "capas": [
        "cover",
        "case",
        "soft jelly",
        "silicon soft jelly",
        "back cover",
        "jelly",
    ],
    "funda": ["cover", "case", "soft jelly", "silicon soft jelly", "back cover", "capa"],
    "fundas": ["cover", "case", "soft jelly", "silicon soft jelly", "back cover"],
    "coque": ["cover", "case", "soft jelly", "silicon soft jelly"],
    "jelly": ["soft jelly", "silicon soft jelly", "cover", "case", "capa"],
    "soft jelly": ["silicon soft jelly", "jelly", "cover", "case", "capa"],
    "silicon soft jelly": ["soft jelly", "jelly", "cover", "capa"],
    "battery": ["batteries", "replacement battery"],
    "screen": ["display", "lcd", "oled", "digitizer"],
    "display": ["screen", "lcd", "oled"],
    "speaker": ["loudspeaker", "buzzer", "earpiece"],
    "camera": ["cam", "lens"],
    "mobile": ["phone", "smartphone", "handset"],
    "phone": ["mobile", "smartphone"],
    "smartphone": ["phone", "mobile"],
    "colour": ["color"],
    "color": ["colour"],
    "pro max": ["promax", "pro-max"],
    "promax": ["pro max", "pro-max"],
    "satra": ["17", "seventeen"],
    "seventeen": ["17"],
    "sixteen": ["16"],
    "fifteen": ["15"],
    "fourteen": ["14"],
    "thirteen": ["13"],
    "twelve": ["12"],
    "eleven": ["11"],
    "one lakh": ["100000", "1 lakh", "lakh"],
    "lakh": ["100000"],
}

# Filled at runtime from catalog_vocab (brands/models/aliases from MySQL).
DYNAMIC_SYNONYMS: dict[str, list[str]] = {}


def register_dynamic_synonyms(mapping: dict[str, list[str]]) -> None:
    """Merge catalog-trained synonym packs into search expansion."""
    DYNAMIC_SYNONYMS.clear()
    for key, vals in (mapping or {}).items():
        k = normalize_query(str(key))
        if not k:
            continue
        cleaned = [normalize_query(str(v)) for v in (vals or []) if str(v).strip()]
        cleaned = [c for c in cleaned if c and c != k]
        if cleaned:
            DYNAMIC_SYNONYMS[k] = cleaned[:8]


# Tokens that are false-friends as raw LIKE (e.g. capa ⊂ capacity).
# Keep synonym expansions only — never search the raw token.
DROP_RAW_LIKE_TOKENS = frozenset(
    {
        "capa",
        "capas",
    }
)

# Whole-query / word rewrites before search (PT/ES/FR → catalog English).
# At Samphone, spoken "capa" means Silicon Soft Jelly covers (not battery "capacity").
_QUERY_REWRITES: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"\bcapas\b", re.I), "soft jelly"),
    (re.compile(r"\bcapa\b", re.I), "soft jelly"),
    (re.compile(r"\bfundas\b", re.I), "soft jelly"),
    (re.compile(r"\bfunda\b", re.I), "soft jelly"),
    (re.compile(r"\bcoques\b", re.I), "cover"),
    (re.compile(r"\bcoque\b", re.I), "cover"),
    (re.compile(r"\bh[uü]lle\b", re.I), "cover"),
    # Whisper often mishears brand "Hoco" as Hokko / Hocco / etc.
    (re.compile(r"\b(hokko|hocco|hocko|hawko|hoko|ho\s*co)\b", re.I), "Hoco"),
)


def rewrite_shop_query(text: str) -> str:
    """Map spoken/local cover words onto catalog English before LIKE search."""
    out = (text or "").strip()
    if not out:
        return out
    for pat, repl in _QUERY_REWRITES:
        out = pat.sub(repl, out)
    return re.sub(r"\s+", " ", out).strip()


STOPWORDS = frozenset(
    {
        "a",
        "an",
        "the",
        "and",
        "or",
        "for",
        "of",
        "to",
        "in",
        "on",
        "with",
        "my",
        "me",
        "please",
        "want",
        "need",
        "show",
        "find",
        "search",
        "get",
        "buy",
        "looking",
        "under",
        "below",
        "above",
        "than",
        "from",
        "upto",
        "up",
        "rs",
        "rupees",
        "euro",
        "euros",
        "eur",
        "usd",
        "dollar",
        "dollars",
    }
)

# Short trim words — match as-is in titles, never expand into unrelated synonym keys
AMBIGUOUS_TOKENS = frozenset(
    {
        "pro",
        "max",
        "mini",
        "plus",
        "air",
        "se",
        "lite",
        "ultra",
        "fe",
        "neo",
        "edge",
        "note",
        "fold",
        "flip",
        "x",
        "s",
        "a",
        "m",
    }
)

# Phone-line hints — when present with a generation digit, that digit must match the title.
_PHONE_LINE_HINTS = frozenset(
    {
        "iphone",
        "galaxy",
        "samsung",
        "pixel",
        "xiaomi",
        "redmi",
        "poco",
        "oppo",
        "vivo",
        "realme",
        "oneplus",
        "motorola",
        "moto",
        "huawei",
        "honor",
        "nokia",
        "nothing",
        "sony",
        "asus",
        "tecno",
        "infinix",
        "apple",
        "google",
    }
)

_MODEL_EXTENDER_HINTS = frozenset(
    {"pro", "max", "plus", "ultra", "mini", "air", "fe", "lite", "plus", "promax"}
)

# Pure storage sizes — never treat as phone generation when alone.
_STORAGE_DIGITS = frozenset({"32", "64", "128", "256", "512", "1024"})


def extract_required_generation_tokens(phrase: str) -> list[str]:
    """
    Generation / model-code tokens that MUST appear in the product title.

    Fixes \"iphone 16 pro max\" matching \"iphone 17 pro max\" via OR on iphone/pro/max.
    """
    norm = normalize_query(phrase or "")
    if not norm:
        return []
    toks = re.findall(r"[a-z0-9]+", norm)
    if not toks:
        return []
    has_phone = bool(set(toks) & _PHONE_LINE_HINTS)
    has_extender = bool(set(toks) & _MODEL_EXTENDER_HINTS)
    required: list[str] = []
    seen: set[str] = set()

    def add(tok: str) -> None:
        t = (tok or "").strip().lower()
        if not t or t in seen:
            return
        seen.add(t)
        required.append(t)

    for i, tok in enumerate(toks):
        nxt = toks[i + 1] if i + 1 < len(toks) else ""
        # Storage units — never required as a model gen.
        if tok in {"gb", "tb", "mm"} or tok.endswith("gb") or tok.endswith("tb"):
            continue
        if nxt in {"gb", "tb", "mm"}:
            continue

        # Model codes: s24, a15, n20, note11-style glued forms already tokenized as note + 11
        if re.fullmatch(r"[a-z]{1,6}\d{1,2}[a-z]?", tok) and not tok.endswith(("gb", "tb")):
            add(tok)
            continue

        # Bare generation digits (16, 17, 13, …), including a lone "17"
        # so 17e / 17 Pro Max stay in results. Skip standalone storage sizes.
        if re.fullmatch(r"\d{1,2}", tok):
            if tok in _STORAGE_DIGITS and not has_phone and not has_extender:
                continue
            add(tok)

    return required


def generation_token_pattern(token: str) -> str:
    """Match a model generation so 17 hits 17e / 17 Pro Max, but not 117 or 170."""
    t = re.sub(r"[^a-z0-9]+", "", (token or "").lower())
    if not t:
        return r"(?!)"
    if t.isdigit():
        return rf"(?<![0-9]){re.escape(t)}(?![0-9])"
    return rf"(?<![a-z0-9]){re.escape(t)}(?![0-9])"


def title_has_required_generations(title: str, required: list[str] | tuple[str, ...] | None) -> bool:
    """True when every required generation/code appears in the title (suffix variants allowed)."""
    if not required:
        return True
    blob = (title or "").lower()
    if not blob:
        return False
    for tok in required:
        if not tok:
            continue
        if not re.search(generation_token_pattern(tok), blob):
            return False
    return True


def mysql_generation_regexp(token: str) -> str:
    """MySQL REGEXP: 17 matches 17e / 17 Pro, not 117 or 170."""
    t = re.sub(r"[^a-z0-9]+", "", (token or "").lower())
    if not t:
        return "."
    if t.isdigit():
        return rf"(^|[^0-9]){re.escape(t)}([^0-9]|$)"
    return rf"(^|[^0-9a-z]){re.escape(t)}([^0-9]|$)"


def normalize_query(text: str) -> str:
    q = (text or "").strip().lower()
    q = q.replace("’", "'").replace("“", '"').replace("”", '"')
    q = re.sub(r"[_\|/]+", " ", q)
    q = re.sub(r"\s+", " ", q)
    return q.strip()


def _word_boundary_contains(haystack: str, needle: str) -> bool:
    if not haystack or not needle:
        return False
    if haystack == needle:
        return True
    return bool(re.search(rf"(?<![a-z0-9]){re.escape(needle)}(?![a-z0-9])", haystack))


def _synonym_key_matches(key: str, norm: str) -> bool:
    """Match synonym keys without short-token false positives (pro ⊂ screen protector)."""
    if not key or not norm:
        return False
    if key == norm:
        return True
    if norm in AMBIGUOUS_TOKENS:
        return False
    if len(norm) <= 3 and " " not in norm:
        return False
    return _word_boundary_contains(norm, key)


def _plural_variants(token: str) -> list[str]:
    out = [token]
    if len(token) > 3 and token.endswith("ies"):
        out.append(token[:-3] + "y")
    elif len(token) > 3 and token.endswith("es"):
        out.append(token[:-2])
    elif len(token) > 2 and token.endswith("s") and not token.endswith("ss"):
        out.append(token[:-1])
    elif len(token) > 2 and not token.endswith("s"):
        out.append(token + "s")
    return out


def _space_variants(phrase: str) -> list[str]:
    """power bank ↔ powerbank ↔ power-bank"""
    p = phrase.strip()
    if not p:
        return []
    out = [p]
    collapsed = re.sub(r"[\s\-]+", "", p)
    dashed = re.sub(r"\s+", "-", p)
    spaced = re.sub(r"[\-]+", " ", p)
    for v in (collapsed, dashed, spaced):
        if v and v != p:
            out.append(v)
    return out


def expand_synonyms(phrase: str) -> list[str]:
    """Return phrase + synonym / fuzzy surface forms (deduped, lowercased)."""
    norm = normalize_query(rewrite_shop_query(phrase))
    if not norm:
        return []
    found: list[str] = []
    seen: set[str] = set()

    def add(term: str) -> None:
        t = normalize_query(term)
        if not t or t in seen:
            return
        if t in DROP_RAW_LIKE_TOKENS:
            return
        seen.add(t)
        found.append(t)

    add(norm)
    for v in _space_variants(norm):
        add(v)

    for key in sorted(SYNONYMS.keys(), key=len, reverse=True):
        if not _synonym_key_matches(key, normalize_query(phrase)) and not _synonym_key_matches(key, norm):
            continue
        if key not in DROP_RAW_LIKE_TOKENS:
            add(key)
        for syn in SYNONYMS[key]:
            add(syn)
            for v in _space_variants(syn):
                add(v)

    for key in sorted(DYNAMIC_SYNONYMS.keys(), key=len, reverse=True):
        if not _synonym_key_matches(key, norm):
            continue
        if key not in DROP_RAW_LIKE_TOKENS:
            add(key)
        for syn in DYNAMIC_SYNONYMS[key]:
            add(syn)
            for v in _space_variants(syn):
                add(v)

    for tok in re.findall(r"[a-z0-9]+", norm):
        if tok in STOPWORDS:
            continue
        if tok in DROP_RAW_LIKE_TOKENS:
            continue
        add(tok)
        if tok in AMBIGUOUS_TOKENS:
            continue
        for v in _plural_variants(tok):
            add(v)
        if tok in SYNONYMS:
            for syn in SYNONYMS[tok]:
                if tok == "iphone" and syn == "apple":
                    add("apple iphone")
                    continue
                add(syn)
                for v in _space_variants(syn):
                    add(v)

    # Also expand from original phrase tokens (capa → cover pack) before rewrite wipe
    for tok in re.findall(r"[a-z0-9]+", normalize_query(phrase)):
        if tok in SYNONYMS:
            for syn in SYNONYMS[tok]:
                add(syn)
                for v in _space_variants(syn):
                    add(v)

    return found


def tokenize_keywords(text: str, *, max_tokens: int = 12) -> list[str]:
    """Significant search tokens from a user/LLM query (no stopwords)."""
    norm = normalize_query(rewrite_shop_query(text))
    if not norm:
        return []
    tokens: list[str] = []
    seen: set[str] = set()
    for tok in re.findall(r"[a-z0-9]+", norm):
        if tok in STOPWORDS or len(tok) < 2:
            continue
        if tok in DROP_RAW_LIKE_TOKENS:
            continue
        if tok in seen:
            continue
        seen.add(tok)
        tokens.append(tok)
        if len(tokens) >= max_tokens:
            break
    return tokens


def build_search_terms(
    q: Optional[str] = None,
    *,
    extra_keywords: Optional[Iterable[str]] = None,
) -> dict[str, list[str]]:
    """
    Build match terms for weighted SQL/Python search.

    Returns:
      phrase: full normalized query (phrase-in-title bonus)
      tokens: primary keyword tokens from the query
      expanded: all LIKE terms (tokens + synonyms + LLM extras) — OR across fields
      score_keywords: terms used for weighted scoring (tokens + multi-word phrases)
    """
    raw = normalize_query(q or "")
    raw_toks = set(re.findall(r"[a-z0-9]+", raw))
    # Spoken PT/ES "capa" alone → prefer Soft Jelly covers (Samphone catalog default case type)
    cover_voice = frozenset({"capa", "capas", "funda", "fundas", "coque", "jelly"})
    prefer_soft_jelly = bool(raw_toks & cover_voice) and not (
        raw_toks - cover_voice - STOPWORDS - {"para", "de", "do", "da", "um", "uma", "the", "a", "an"}
    )

    phrase = normalize_query(rewrite_shop_query(q or ""))
    if prefer_soft_jelly:
        phrase = "soft jelly"
    tokens = tokenize_keywords(phrase)
    expanded: list[str] = []
    seen: set[str] = set()

    def add_all(terms: Iterable[str]) -> None:
        for t in terms:
            n = normalize_query(t)
            if not n or n in seen or n in STOPWORDS:
                continue
            if n in DROP_RAW_LIKE_TOKENS:
                continue
            if len(n) < 2:
                continue
            seen.add(n)
            expanded.append(n)

    if phrase:
        add_all(expand_synonyms(phrase))
    if raw:
        add_all(expand_synonyms(raw))
    for tok in tokens:
        add_all(expand_synonyms(tok))
    if extra_keywords:
        for kw in extra_keywords:
            if not kw:
                continue
            add_all(expand_synonyms(str(kw)))
    if prefer_soft_jelly or (raw_toks & cover_voice):
        add_all(
            [
                "silicon soft jelly",
                "soft jelly",
                "jelly",
                "cover",
                "case",
                "back cover",
            ]
        )

    expanded.sort(key=lambda s: (-len(s), s))
    expanded = expanded[:48]

    score_keywords: list[str] = []
    sk_seen: set[str] = set()

    def add_score(term: str) -> None:
        t = normalize_query(term)
        if not t or t in sk_seen or t in STOPWORDS:
            return
        if t in DROP_RAW_LIKE_TOKENS:
            return
        if len(t) < 2:
            return
        sk_seen.add(t)
        score_keywords.append(t)

    if prefer_soft_jelly:
        add_score("silicon soft jelly")
        add_score("soft jelly")
        add_score("jelly")
    if phrase:
        add_score(phrase)
    for tok in tokens:
        add_score(tok)
    if phrase and " " in phrase:
        add_score(re.sub(r"[\s\-]+", "", phrase))
    if not score_keywords:
        score_keywords = list(expanded[:6])

    return {
        "phrase": phrase,
        "tokens": tokens,
        "expanded": expanded,
        "score_keywords": score_keywords,
        "required_tokens": extract_required_generation_tokens(phrase or raw),
    }


def like_pattern(term: str) -> str:
    """Safe LIKE pattern — strip user wildcards, wrap with % for substring match."""
    t = re.sub(r"[%_\\]+", "", (term or "").strip())
    if not t:
        return "%"
    return f"%{t}%"


def fuzzy_variants(token: str) -> list[str]:
    """Light typo / prefix variants when exact phrase has few hits."""
    t = normalize_query(token)
    if not t or t in AMBIGUOUS_TOKENS or len(t) < 4:
        return []
    out: list[str] = []
    # Prefix (power → power…)
    if len(t) >= 5:
        out.append(t[: max(4, len(t) - 1)])
    # Drop one interior char (common STT slip)
    if len(t) >= 5:
        mid = len(t) // 2
        out.append(t[:mid] + t[mid + 1 :])
    return [x for x in out if len(x) >= 3]


def _best_field_score(
    needle: str,
    *,
    title_l: str,
    sku_l: str,
    brand_l: str,
    cat_l: str,
    tag_l: str,
    desc_l: str,
    attr_l: str,
) -> int:
    """Highest field weight where needle appears (substring / LIKE semantics)."""
    if not needle:
        return 0
    if needle in title_l:
        return WEIGHT_NAME
    if needle in sku_l:
        return WEIGHT_SKU
    if needle in cat_l:
        return WEIGHT_CATEGORY
    if needle in brand_l:
        return WEIGHT_BRAND
    if needle in tag_l:
        return WEIGHT_TAGS
    if needle in desc_l:
        return WEIGHT_DESCRIPTION
    if needle in attr_l:
        return WEIGHT_ATTRIBUTES
    return 0


def score_product_text(
    *,
    title: str = "",
    sku: str = "",
    categories: Iterable[str] = (),
    brand: str = "",
    tags: Iterable[str] = (),
    short_description: str = "",
    description: str = "",
    attributes: Iterable[str] = (),
    phrase: str = "",
    tokens: Optional[list[str]] = None,
    expanded: Optional[list[str]] = None,
    score_keywords: Optional[list[str]] = None,
) -> int:
    """
    Python-side weighted score (memory store / semantic hybrid / post-rank).

    For each keyword: add the max field weight where it matches.
    Include product if any keyword hits (caller filters with product_matches_any).
    """
    built = None
    if not expanded and phrase:
        built = build_search_terms(phrase)
        expanded = built["expanded"]
        score_keywords = built["score_keywords"]
        tokens = built["tokens"]
    terms = list(expanded or [])
    if not terms and not phrase:
        return 0

    title_l = (title or "").lower()
    sku_l = (sku or "").lower()
    brand_l = (brand or "").lower()
    cat_l = " ".join(str(c).lower() for c in categories)
    tag_l = " ".join(str(t).lower() for t in tags)
    desc_l = f"{short_description or ''} {description or ''}".lower()
    attr_l = " ".join(str(a).lower() for a in attributes)

    score = 0
    if phrase and phrase in title_l:
        score += WEIGHT_PHRASE_BONUS

    keywords = list(score_keywords or [])
    if not keywords:
        keywords = list(tokens or tokenize_keywords(phrase))
    if not keywords:
        keywords = terms[:12]

    matched = 0
    for kw in keywords:
        variants = expand_synonyms(kw)[:10] if kw not in AMBIGUOUS_TOKENS else [kw]
        best = 0
        for v in variants:
            best = max(
                best,
                _best_field_score(
                    v,
                    title_l=title_l,
                    sku_l=sku_l,
                    brand_l=brand_l,
                    cat_l=cat_l,
                    tag_l=tag_l,
                    desc_l=desc_l,
                    attr_l=attr_l,
                ),
            )
            if best >= WEIGHT_NAME:
                break
        if best > 0:
            matched += 1
            score += best

    if matched > 1:
        score += (matched - 1) * WEIGHT_MULTI_TOKEN_BONUS

    # Synonym-only hit (e.g. title has "powerbank", query was "power bank")
    if score == 0:
        for v in terms:
            hit = _best_field_score(
                v,
                title_l=title_l,
                sku_l=sku_l,
                brand_l=brand_l,
                cat_l=cat_l,
                tag_l=tag_l,
                desc_l=desc_l,
                attr_l=attr_l,
            )
            if hit:
                return hit
    return score


def product_matches_any(
    *,
    title: str = "",
    sku: str = "",
    categories: Iterable[str] = (),
    brand: str = "",
    tags: Iterable[str] = (),
    short_description: str = "",
    description: str = "",
    attributes: Iterable[str] = (),
    expanded: list[str],
    required_tokens: Optional[list[str]] = None,
) -> bool:
    """Include product if ANY expanded keyword appears in ANY searchable field."""
    if required_tokens and not title_has_required_generations(title, required_tokens):
        return False
    blob = " ".join(
        [
            title or "",
            sku or "",
            brand or "",
            " ".join(str(c) for c in categories),
            " ".join(str(t) for t in tags),
            short_description or "",
            description or "",
            " ".join(str(a) for a in attributes),
        ]
    ).lower()
    return any(v in blob for v in expanded if v)
