"""Newest-first model name ranking (mirrors frontend/src/modelSort.ts)."""
from __future__ import annotations

import re


def _iphone_variant_bonus(name: str) -> int:
    n = name.lower()
    if "pro max" in n:
        return 95
    if "pro" in n:
        return 85
    if "plus" in n:
        return 75
    if "air" in n:
        return 65
    if "mini" in n:
        return 55
    return 50


def _galaxy_variant_bonus(name: str) -> int:
    n = name.lower()
    if "ultra" in n:
        return 90
    if "plus" in n or "+" in n:
        return 80
    if "fe" in n:
        return 60
    if "edge" in n:
        return 70
    return 50


def _series_rank(name: str) -> int:
    n = (name or "").lower()

    m = re.search(r"galaxy\s*s\s*(\d{1,2})\b", n)
    if m:
        return 600_000 + int(m.group(1)) * 1000 + _galaxy_variant_bonus(n)

    m = re.search(r"galaxy\s*z\s*(?:fold|flip)\s*(\d{1,2})?", n) or re.search(
        r"galaxy\s*z\s*(\d{1,2})\b", n
    )
    if m:
        gen = int(m.group(1) or 0)
        return 550_000 + gen * 1000 + _galaxy_variant_bonus(n)

    m = re.search(r"galaxy\s*a\s*(\d{1,2})\b", n)
    if m:
        return 500_000 + int(m.group(1)) * 1000 + _galaxy_variant_bonus(n)

    m = re.search(r"galaxy\s*m\s*(\d{1,2})\b", n)
    if m:
        return 480_000 + int(m.group(1)) * 1000 + _galaxy_variant_bonus(n)

    m = re.search(r"galaxy\s*note\s*(\d{1,2})\b", n)
    if m:
        return 520_000 + int(m.group(1)) * 1000 + _galaxy_variant_bonus(n)

    m = re.search(r"ipad(?:\s+pro|\s+air|\s+mini)?[^0-9]*(\d{1,2})", n)
    if m:
        gen = int(m.group(1))
        bonus = 50
        if "pro" in n:
            bonus = 90
        elif "air" in n:
            bonus = 80
        elif "mini" in n:
            bonus = 60
        return 700_000 + gen * 1000 + bonus

    m = re.search(r"(?:redmi|poco)\s*note?\s*(\d{1,2})", n) or re.search(r"(?:redmi|poco)\s*(\d{1,2})", n)
    if m:
        return 400_000 + int(m.group(1)) * 1000

    m = re.search(r"pixel\s*(\d{1,2})\b", n)
    if m:
        return 450_000 + int(m.group(1)) * 1000 + ("pro" in n and 80 or 50)

    m = re.search(r"(?:reno|find)\s*(\d{1,2})\b", n)
    if m:
        return 380_000 + int(m.group(1)) * 1000

    m = re.search(r"(?:oneplus|nord)\s*(\d{1,2})\b", n)
    if m:
        return 370_000 + int(m.group(1)) * 1000

    return 0


def model_rank(name: str) -> int:
    raw = name or ""
    n = raw.lower()

    if re.search(r"iphone\s+se\b", n):
        years = [int(y) for y in re.findall(r"\b(20[1-3]\d)\b", raw)]
        year = max(years) if years else 2016
        gen = max(1, year - 2009)
        return 900_000 + gen * 1000 + 15

    m = re.search(r"iphone\s+(\d{1,2})", n)
    if m:
        return 900_000 + int(m.group(1)) * 1000 + _iphone_variant_bonus(n)

    if re.search(r"iphone\s+xs\s*max", n):
        return 900_000 + 10_000 + 98
    if re.search(r"iphone\s+xs", n):
        return 900_000 + 10_000 + 90
    if re.search(r"iphone\s+xr", n):
        return 900_000 + 10_000 + 85
    if re.search(r"iphone\s+x\b", n):
        return 900_000 + 10_000 + 80

    years = [int(y) for y in re.findall(r"\b(20[1-3]\d)\b", raw)]
    if years:
        return max(years) * 10_000 + _series_rank(n)

    series = _series_rank(n)
    if series > 0:
        return series

    gens = [int(x) for x in re.findall(r"\b(\d{1,2})\b", raw) if 3 <= int(x) <= 99]
    return max(gens) * 1000 if gens else 0
