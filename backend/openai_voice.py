"""OpenAI Whisper STT + shopping-intent LLM parse for voice search."""

from __future__ import annotations

import json
import logging
import os
import re
import time
from typing import Any, Optional

import httpx

import voice_logger

logger = logging.getLogger(__name__)

OPENAI_API_KEY = (os.environ.get("OPENAI_API_KEY") or "").strip()
OPENAI_BASE = (os.environ.get("OPENAI_BASE_URL") or "https://api.openai.com/v1").rstrip("/")
WHISPER_MODEL = (os.environ.get("OPENAI_WHISPER_MODEL") or "whisper-1").strip()
CHAT_MODEL = (os.environ.get("OPENAI_CHAT_MODEL") or "gpt-4o-mini").strip()

PARSE_SYSTEM = """You are an ecommerce search engine for a phone parts and accessories shop (Samphone).

Convert the user's search query into structured filters.

Return ONLY JSON. Never explain anything.

Correct spelling mistakes.
Correct speech recognition mistakes (e.g. "satra" → "17", "iphone" brand → Apple, "hokko"/"hocco" → Hoco).
If the user says Hoco (or misheard Hokko/Hocco), set brand to "Hoco".
Understand synonyms and Indian English / Hinglish (lakh, colour, mobile).
Map Portuguese/Spanish cover words: "capa"/"capas"/"funda" → cover / soft jelly / case.
Normalize prices: "under 800" → priceMax 800; "under one lakh" → priceMax 100000; "below 50 euro" → priceMax 50.

Extract:
- query: cleaned natural search phrase for display and full-text search (include model/color words; exclude filler)
- category
- brand
- product
- model
- color
- size
- material
- fit
- gender
- storage
- ram
- priceMin
- priceMax
- attributes (object)

If the transcript is NOT a product search (filler / noise / greetings / single pronouns like
"you", "thank you", "thanks for watching", "hello", "um", "okay"), return EVERY field as null
and attributes as {}.

If any value is missing use null.
attributes must be an object (empty {} if none).
"""

# Whisper often hallucinates these on silence / short noise — never treat as a search.
_STT_FILLER = frozenset(
    {
        "you",
        "thank you",
        "thanks",
        "thanks for watching",
        "thank you for watching",
        "thanks for listening",
        "bye",
        "goodbye",
        "hello",
        "hi",
        "hey",
        "ok",
        "okay",
        "yes",
        "no",
        "yeah",
        "yep",
        "nope",
        "um",
        "uh",
        "hmm",
        "hm",
        "ah",
        "oh",
        "please",
        "sorry",
        "subscribe",
        "like and subscribe",
        ".",
        "...",
    }
)

# Bias Whisper toward shop vocabulary on short clips (overridden by catalog_vocab).
_WHISPER_PROMPT = "Samphone Hoco iPhone Samsung soft jelly cover glass charger"

# Spoken brand tokens → catalog brand (after STT / rewrite).
_VOICE_BRAND_TOKENS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"\bhoco\b", re.I), "Hoco"),
    (re.compile(r"\bsamsung\b", re.I), "Samsung"),
    (re.compile(r"\bxiaomi\b", re.I), "Xiaomi"),
    (re.compile(r"\bhuawei\b", re.I), "Huawei"),
    (re.compile(r"\bapple\b|\biphone\b|\bipad\b", re.I), "Apple"),
)


def _active_whisper_prompt() -> str:
    try:
        from catalog_vocab import whisper_prompt_snippet

        # Keep prompt short — long prompts slow Whisper and add little accuracy.
        return (whisper_prompt_snippet(max_chars=120) or _WHISPER_PROMPT)[:120]
    except Exception:
        return _WHISPER_PROMPT


def _parse_system_prompt(*, rich: bool = False) -> str:
    base = PARSE_SYSTEM
    if not rich:
        return base
    try:
        from catalog_vocab import llm_catalog_context

        ctx = llm_catalog_context(max_chars=1200)
        if ctx:
            return f"{base}\n\n{ctx}"
    except Exception:
        pass
    return base


_COMPLEX_LLM_RE = re.compile(
    r"\b("
    r"under|below|above|between|less|more|than|price|euro|euros|€|\$|"
    r"lakh|rupees|rs|usd|dollar|dollars|"
    r"ram|storage|gb|tb|mah|"
    r"cheap|cheapest|expensive|budget|"
    r"color|colour|black|white|blue|red|green|purple|pink|"
    r"with|without|and also"
    r")\b",
    re.I,
)


def needs_llm_parse(text: str) -> bool:
    """True only for complex shopping intent — simple product phrases skip the LLM (~2s)."""
    cleaned = re.sub(r"\s+", " ", (text or "").strip())
    if not cleaned:
        return False
    if _COMPLEX_LLM_RE.search(cleaned):
        return True
    # Long free-form sentences → LLM
    if len(cleaned.split()) >= 8:
        return True
    return False


def _detect_voice_brand(text: str) -> str | None:
    for pat, brand in _VOICE_BRAND_TOKENS:
        if pat.search(text or ""):
            return brand
    return None


def fast_filters_from_transcript(text: str) -> dict[str, Any]:
    """Build search filters without calling the chat LLM."""
    try:
        from weighted_search import rewrite_shop_query

        q = rewrite_shop_query(text) or text
    except Exception:
        q = text
    q = re.sub(r"\s+", " ", (q or "").strip())
    filters = empty_filters(q)
    filters["query"] = q or None
    brand = _detect_voice_brand(q)
    if brand:
        filters["brand"] = brand
        # "Hoco products" / bare "Hoco" → brand-scoped Hoco catalog search.
        if re.fullmatch(r"(?i)hoco(\s+products?)?", q or ""):
            filters["query"] = "Hoco"
            filters["category"] = "Hoco"
    return filters


def is_meaningful_search_query(text: str) -> bool:
    """False for empty / Whisper filler / too-short noise transcripts."""
    cleaned = re.sub(r"\s+", " ", (text or "").strip())
    if not cleaned:
        return False
    low = cleaned.lower().strip(" .,!?;:\"'")
    if not low or low in _STT_FILLER:
        return False
    # Single tiny token with no digit (e.g. "You", "a") is not a product search.
    tokens = [t for t in re.split(r"\s+", low) if t]
    if len(tokens) == 1 and len(tokens[0]) <= 3 and not any(ch.isdigit() for ch in tokens[0]):
        return False
    if len(low) < 2:
        return False
    return True


def filters_have_search_signal(filters: dict[str, Any]) -> bool:
    if not isinstance(filters, dict):
        return False
    for key in (
        "query",
        "category",
        "brand",
        "product",
        "model",
        "color",
        "storage",
        "ram",
        "material",
        "size",
    ):
        val = filters.get(key)
        if val is not None and str(val).strip() and is_meaningful_search_query(str(val)):
            return True
    if filters.get("priceMin") is not None or filters.get("priceMax") is not None:
        return True
    attrs = filters.get("attributes")
    if isinstance(attrs, dict) and any(str(v).strip() for v in attrs.values() if v is not None):
        return True
    return False


def openai_configured() -> bool:
    return bool(OPENAI_API_KEY)


def _headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {OPENAI_API_KEY}"}


def empty_filters(raw: str = "") -> dict[str, Any]:
    return {
        "query": (raw or "").strip() or None,
        "category": None,
        "brand": None,
        "product": None,
        "model": None,
        "color": None,
        "size": None,
        "material": None,
        "fit": None,
        "gender": None,
        "storage": None,
        "ram": None,
        "priceMin": None,
        "priceMax": None,
        "attributes": {},
    }


def _coerce_filters(data: Any, fallback_query: str) -> dict[str, Any]:
    base = empty_filters(fallback_query)
    if not isinstance(data, dict):
        return base
    out = dict(base)
    for key in (
        "query",
        "category",
        "brand",
        "product",
        "model",
        "color",
        "size",
        "material",
        "fit",
        "gender",
        "storage",
        "ram",
    ):
        val = data.get(key)
        if val is None or val == "":
            out[key] = None
        else:
            out[key] = str(val).strip() or None
    for key in ("priceMin", "priceMax"):
        val = data.get(key)
        if val is None or val == "":
            out[key] = None
        else:
            try:
                out[key] = float(val)
            except (TypeError, ValueError):
                out[key] = None
    attrs = data.get("attributes")
    out["attributes"] = attrs if isinstance(attrs, dict) else {}
    if not out.get("query"):
        out["query"] = (fallback_query or "").strip() or None
    return out


def _extract_json_object(text: str) -> Optional[dict]:
    raw = (text or "").strip()
    if not raw:
        return None
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{[\s\S]*\}", raw)
    if not match:
        return None
    try:
        parsed = json.loads(match.group(0))
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        return None


async def transcribe_audio(
    audio_bytes: bytes,
    *,
    filename: str = "voice.m4a",
    content_type: str = "audio/m4a",
    language: Optional[str] = None,
    request_id: str = "VS_UNKNOWN",
) -> str:
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not configured")
    if not audio_bytes:
        raise ValueError("Empty audio")

    voice_logger.log_step(
        request_id,
        "Speech To Text",
        "START",
        Audio_Length=f"{len(audio_bytes)} bytes",
        Model_Name=WHISPER_MODEL,
        Language=language or "auto",
        File_Name=filename,
        Content_Type=content_type,
    )

    data: dict[str, str] = {"model": WHISPER_MODEL}
    if language:
        lang = language.strip().lower()
        if "-" in lang:
            lang = lang.split("-", 1)[0]
        if len(lang) == 2:
            data["language"] = lang
    data["prompt"] = _active_whisper_prompt()

    # Apple uploads often as audio/x-m4a — Whisper prefers audio/mp4 for m4a/aac.
    ct = (content_type or "").strip().lower() or "audio/m4a"
    name = filename or "voice.m4a"
    if "m4a" in ct or "aac" in ct or name.lower().endswith((".m4a", ".aac", ".mp4")):
        ct = "audio/mp4"
    elif name.lower().endswith(".wav") or "wav" in ct:
        ct = "audio/wav"
    files = {"file": (name if "." in name else f"{name}.m4a", audio_bytes, ct)}
    timeout = httpx.Timeout(25.0, connect=8.0)
    started = time.perf_counter()
    async with httpx.AsyncClient(timeout=timeout) as client:
        res = await client.post(
            f"{OPENAI_BASE}/audio/transcriptions",
            headers=_headers(),
            data=data,
            files=files,
        )
    elapsed_ms = (time.perf_counter() - started) * 1000

    voice_logger.log_network(
        request_id,
        endpoint=f"{OPENAI_BASE}/audio/transcriptions",
        method="POST",
        status_code=res.status_code,
        duration_ms=elapsed_ms,
        payload_summary=f"model={WHISPER_MODEL} file={name} bytes={len(audio_bytes)} ct={ct}",
        response_summary=(res.text[:500] if res.status_code >= 400 else res.text[:300]),
    )

    if res.status_code >= 400:
        voice_logger.log_error(
            request_id,
            "Speech To Text",
            RuntimeError(f"Speech-to-text failed ({res.status_code})"),
            response_code=res.status_code,
        )
        logger.warning("Whisper failed status=%s body=%s", res.status_code, res.text[:400])
        raise RuntimeError(f"Speech-to-text failed ({res.status_code})")
    payload = res.json()
    text = (payload.get("text") or "").strip()
    if not text:
        voice_logger.log_error(
            request_id,
            "Speech To Text",
            ValueError("Empty transcript"),
        )
        logger.warning("Whisper returned empty text payload=%s", payload)
        raise ValueError("Empty transcript")
    try:
        from catalog_vocab import correct_transcript_fast

        grounded = correct_transcript_fast(text)
        if grounded and grounded != text:
            voice_logger.log_step(
                request_id,
                "Catalog Grounding",
                "SUCCESS",
                Original=text,
                Grounded=grounded,
            )
            text = grounded
    except Exception as exc:
        logger.debug("catalog correct_transcript skipped: %s", exc)
    if not is_meaningful_search_query(text):
        voice_logger.log_error(
            request_id,
            "Speech To Text",
            ValueError(f"Filler/noise transcript rejected: {text!r}"),
        )
        raise ValueError("Empty transcript")

    voice_logger.log_step(
        request_id,
        "Speech To Text",
        "SUCCESS",
        query=text,
        elapsed_ms=elapsed_ms,
        Transcript=f'"{text}"',
        Confidence=payload.get("confidence"),
        Model_Name=WHISPER_MODEL,
    )
    return text


async def parse_search_query(text: str, *, request_id: str = "VS_UNKNOWN") -> dict[str, Any]:
    cleaned = re.sub(r"\s+", " ", (text or "").strip())
    if not cleaned or not is_meaningful_search_query(cleaned):
        return empty_filters("")

    try:
        from catalog_vocab import correct_transcript_fast

        cleaned = correct_transcript_fast(cleaned) or cleaned
    except Exception:
        pass

    # Fast path: skip chat LLM for simple product phrases (biggest latency win).
    if not needs_llm_parse(cleaned):
        filters = fast_filters_from_transcript(cleaned)
        voice_logger.log_step(
            request_id,
            "LLM Filter Extraction",
            "SUCCESS",
            query=cleaned,
            elapsed_ms=0,
            Parsed_JSON=filters,
            Model_Used="fast-path",
            Note="Skipped LLM — simple product query",
        )
        return filters

    if not OPENAI_API_KEY:
        return fast_filters_from_transcript(cleaned)

    body = {
        "model": CHAT_MODEL,
        "temperature": 0,
        "max_tokens": 180,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": _parse_system_prompt(rich=False)},
            {"role": "user", "content": cleaned},
        ],
    }
    timeout = httpx.Timeout(20.0, connect=8.0)
    started = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            res = await client.post(
                f"{OPENAI_BASE}/chat/completions",
                headers={**_headers(), "Content-Type": "application/json"},
                json=body,
            )
        elapsed_ms = (time.perf_counter() - started) * 1000
        voice_logger.log_network(
            request_id,
            endpoint=f"{OPENAI_BASE}/chat/completions",
            method="POST",
            status_code=res.status_code,
            duration_ms=elapsed_ms,
            payload_summary=f"model={CHAT_MODEL} transcript_len={len(cleaned)}",
            response_summary=res.text[:800],
        )
        if res.status_code >= 400:
            voice_logger.log_error(
                request_id,
                "LLM Filter Extraction",
                RuntimeError(f"LLM parse failed ({res.status_code})"),
                response_code=res.status_code,
            )
            logger.warning("LLM parse failed status=%s body=%s", res.status_code, res.text[:400])
            return fast_filters_from_transcript(cleaned)
        content = (((res.json().get("choices") or [{}])[0].get("message") or {}).get("content")) or ""
        parsed = _extract_json_object(content)
        if parsed is None:
            voice_logger.log_step(
                request_id,
                "LLM Filter Extraction",
                "ERROR",
                elapsed_ms=elapsed_ms,
                Invalid_JSON=content[:2000],
                Raw_AI_Response=content[:2000],
            )
            return fast_filters_from_transcript(cleaned)

        # Do not force-fill query with filler like "You" when the LLM left it null.
        filters = _coerce_filters(parsed, "")
        q = filters.get("query")
        if q and not is_meaningful_search_query(str(q)):
            filters["query"] = None
        if not filters_have_search_signal(filters):
            if is_meaningful_search_query(cleaned):
                filters["query"] = cleaned
            else:
                voice_logger.log_step(
                    request_id,
                    "LLM Filter Extraction",
                    "SUCCESS",
                    query=cleaned,
                    elapsed_ms=elapsed_ms,
                    Raw_AI_Response=content[:2000],
                    Parsed_JSON=filters,
                    Model_Used=CHAT_MODEL,
                    Note="No product search signal — treating as empty",
                )
                return empty_filters("")
        try:
            from catalog_vocab import ground_filters

            filters = ground_filters(filters)
        except Exception as exc:
            logger.debug("ground_filters skipped: %s", exc)
        voice_logger.log_step(
            request_id,
            "LLM Filter Extraction",
            "SUCCESS",
            query=filters.get("query") or cleaned,
            elapsed_ms=elapsed_ms,
            Raw_AI_Response=content[:2000],
            Parsed_JSON=filters,
            Model_Used=CHAT_MODEL,
        )
        return filters
    except Exception as exc:
        voice_logger.log_error(request_id, "LLM Filter Extraction", exc)
        logger.warning("LLM parse error: %s", exc)
        return fast_filters_from_transcript(cleaned)


def filters_to_product_params(
    filters: dict[str, Any],
    *,
    bar_query: Optional[str] = None,
    request_id: str = "VS_UNKNOWN",
) -> dict[str, Any]:
    """Map LLM filters onto GET /products params for weighted multi-field search.

    Text keywords are folded into `q` (Amazon-style). Brand/category are soft hints.
    Model is included in `q` rather than the hard model-browse param so relevance
    search runs instead of exact model-page collection.
    """
    try:
        from catalog_vocab import ground_filters

        filters = ground_filters(filters)
    except Exception:
        pass

    q_parts: list[str] = []
    bar = (bar_query or "").strip()
    primary = bar or (filters.get("query") or "")
    if primary:
        q_parts.append(str(primary).strip())

    def _append_unique(value: Any) -> None:
        if value is None or value == "":
            return
        text = str(value).strip()
        if not text:
            return
        blob = " ".join(q_parts).lower()
        if text.lower() in blob:
            return
        q_parts.append(text)

    for key in (
        "product",
        "model",
        "color",
        "storage",
        "ram",
        "size",
        "material",
        "fit",
        "gender",
    ):
        _append_unique(filters.get(key))

    attrs = filters.get("attributes")
    if isinstance(attrs, dict):
        for v in attrs.values():
            _append_unique(v)

    # Boost with catalog-matched terms (trained from product DB).
    try:
        from catalog_vocab import extra_keywords_for_query

        seed = " ".join(q_parts)
        for extra in extra_keywords_for_query(seed)[:8]:
            _append_unique(extra)
    except Exception:
        pass

    params: dict[str, Any] = {}
    q = " ".join(p for p in q_parts if p).strip()
    if q and is_meaningful_search_query(q):
        params["q"] = q

    brand = filters.get("brand")
    if brand:
        params["brand"] = str(brand).strip()
        _append_unique(brand)
        q = " ".join(p for p in q_parts if p).strip()
        if q and is_meaningful_search_query(q):
            params["q"] = q
        elif "q" in params and not is_meaningful_search_query(str(params["q"])):
            params.pop("q", None)

    category = (filters.get("category") or "").strip()
    cat_l = category.lower()
    if cat_l in {"mobile", "smartphone", "smartphones", "phone", "phones"}:
        params["category"] = "Smartphones"
    elif cat_l in {"accessories", "accessory"}:
        params["category"] = "Accessories"
    elif cat_l in {"parts", "phone parts", "spare parts"}:
        params["category"] = "Phone Parts"
    elif category:
        params["category"] = category

    if filters.get("priceMin") is not None:
        params["min_price"] = float(filters["priceMin"])
    if filters.get("priceMax") is not None:
        params["max_price"] = float(filters["priceMax"])

    api_lines = [f"{k}={v}" for k, v in params.items()]
    voice_logger.log_step(
        request_id,
        "Search Request",
        "SUCCESS",
        Filters_Received=filters,
        Generated_Search_Payload=params,
        Generated_API_Filters="\n".join(api_lines) if api_lines else "(none)",
    )
    return params
