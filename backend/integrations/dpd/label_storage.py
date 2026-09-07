"""Persist DPD shipping labels to local disk."""

from __future__ import annotations

import base64
import re
from pathlib import Path

_SAFE_GUIA = re.compile(r"[^A-Za-z0-9._-]+")


def _safe_filename(num_guia: str) -> str:
    cleaned = _SAFE_GUIA.sub("_", (num_guia or "").strip()) or "unknown"
    return f"{cleaned}.pdf"


def save_label(num_guia: str, base64_pdf: str, storage_dir: str) -> str:
    """Decode base64 PDF and write `{storage_dir}/{num_guia}.pdf`. Returns relative path."""
    if not base64_pdf:
        raise ValueError("base64_pdf is required")
    raw = base64_pdf.strip()
    if "," in raw and raw.lower().startswith("data:"):
        raw = raw.split(",", 1)[1]
    try:
        pdf_bytes = base64.b64decode(raw, validate=False)
    except Exception as exc:
        raise ValueError("Invalid base64 PDF payload") from exc
    if not pdf_bytes:
        raise ValueError("Decoded PDF is empty")

    directory = Path(storage_dir)
    directory.mkdir(parents=True, exist_ok=True)
    filename = _safe_filename(num_guia)
    target = directory / filename
    target.write_bytes(pdf_bytes)
    return filename
