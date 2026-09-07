"""Translate catalog text with persistent on-disk cache."""
from __future__ import annotations

import json
import re
from pathlib import Path

import requests

ROOT = Path(__file__).parent
CACHE_PATH = ROOT / "translation_cache.json"
_cache: dict[str, str] = {}

# Google Translate / MyMemory language codes
LANG_CODES: dict[str, str] = {
    "en": "en",
    "pt": "pt",
    "fr": "fr",
    "es": "es",
    "nl": "nl",
    "hi": "hi",
    "pa": "pa",
    "ur": "ur",
    "de": "de",
    "it": "it",
    "ro": "ro",
    "pl": "pl",
    "tr": "tr",
    "ar": "ar",
    "zh": "zh-CN",
    "zh-cn": "zh-CN",
    "ja": "ja",
    "ko": "ko",
    "ru": "ru",
}


def _normalize_target(target: str) -> str:
    key = (target or "pt").strip().lower()
    return LANG_CODES.get(key, key)


def _load() -> None:
    global _cache
    if CACHE_PATH.exists():
        try:
            _cache = json.loads(CACHE_PATH.read_text(encoding="utf-8"))
        except Exception:
            _cache = {}


def _save() -> None:
    try:
        CACHE_PATH.write_text(json.dumps(_cache, ensure_ascii=False), encoding="utf-8")
    except Exception:
        pass


_load()


def _google_translate(text: str, target: str) -> str:
    try:
        from deep_translator import GoogleTranslator

        code = _normalize_target(target)
        result = GoogleTranslator(source="auto", target=code).translate(text[:4500])
        return result or ""
    except Exception:
        return ""


def _mymemory_translate(text: str, target: str) -> str:
    try:
        code = _normalize_target(target)
        r = requests.get(
            "https://api.mymemory.translated.net/get",
            params={"q": text[:500], "langpair": f"en|{code}"},
            timeout=15,
        )
        r.raise_for_status()
        return r.json().get("responseData", {}).get("translatedText", "") or ""
    except Exception:
        return ""


def translate_text(text: str, target: str = "pt") -> str:
    if not text or not str(text).strip():
        return text
    code = _normalize_target(target)
    if code in ("en",):
        return text
    key = f"{code}:{text}"
    if key in _cache:
        return _cache[key]
    translated = _google_translate(text, code) or _mymemory_translate(text, code) or text
    _cache[key] = translated
    if len(_cache) % 10 == 0:
        _save()
    return translated


def translate_batch(texts: list[str], target: str = "pt") -> list[str]:
    from concurrent.futures import ThreadPoolExecutor

    if not texts:
        return []
    # Deduplicate while preserving order — avoids repeated API calls in one batch.
    seen: dict[str, int] = {}
    unique: list[str] = []
    for t in texts:
        if t not in seen:
            seen[t] = len(unique)
            unique.append(t)
    with ThreadPoolExecutor(max_workers=min(8, len(unique))) as pool:
        translated_unique = list(pool.map(lambda t: translate_text(t, target), unique))
    return [translated_unique[seen[t]] for t in texts]


def clean_description(text: str) -> str:
    if not text:
        return ""
    cleaned = re.sub(r"\s*Add to Wishlist\s*", " ", text, flags=re.I)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned
