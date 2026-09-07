"""Structured voice-search debug logging (backend)."""

from __future__ import annotations

import json
import logging
import time
from typing import Any, Optional

logger = logging.getLogger("voice_search")

# Mirror frontend toggle — set VOICE_SEARCH_DEBUG=0 to silence.
import os

DEBUG_VOICE_SEARCH = os.environ.get("VOICE_SEARCH_DEBUG", "1").strip() not in {"0", "false", "False"}


def _emit(lines: list[str]) -> None:
    if not DEBUG_VOICE_SEARCH:
        return
    logger.info("\n🎤 [Voice Search]\n%s", "\n".join(lines))


def _fmt_ms(ms: float) -> str:
    if ms >= 1000:
        return f"{ms / 1000:.2f} sec"
    return f"{int(ms)} ms"


def log_step(
    request_id: str,
    step: str,
    status: str,
    *,
    query: Optional[str] = None,
    elapsed_ms: Optional[float] = None,
    **extra: Any,
) -> None:
    lines = [
        f"RequestID: {request_id}",
        f"Timestamp: {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}",
        f"STEP: {step}",
        f"STATUS: {status}",
    ]
    if query:
        lines.append(f"User Query: {query}")
    if elapsed_ms is not None:
        lines.append(f"Execution Time: {_fmt_ms(elapsed_ms)}")
    for k, v in extra.items():
        if v is None:
            continue
        if isinstance(v, (dict, list)):
            lines.append(f"{k}:\n{json.dumps(v, indent=2, default=str)}")
        else:
            lines.append(f"{k}: {v}")
    _emit(lines)


def log_error(
    request_id: str,
    step: str,
    err: BaseException,
    *,
    response_code: Optional[int] = None,
    retry: Optional[str] = None,
) -> None:
    lines = [
        f"❌ STEP: {step}",
        f"RequestID: {request_id}",
        f"Timestamp: {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}",
        "STATUS: ERROR",
        f"Error: {err}",
    ]
    if response_code is not None:
        lines.append(f"Response Code: {response_code}")
    if retry:
        lines.append(f"Retry: {retry}")
    import traceback

    lines.append("Stack Trace:\n" + traceback.format_exc())
    _emit(lines)


def log_network(
    request_id: str,
    *,
    endpoint: str,
    method: str,
    status_code: int,
    duration_ms: float,
    payload_summary: Optional[str] = None,
    response_summary: Optional[str] = None,
) -> None:
    lines = [
        f"RequestID: {request_id}",
        f"Timestamp: {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}",
        "STEP: Network",
        f"STATUS: {'ERROR' if status_code >= 400 else 'SUCCESS'}",
        f"Endpoint: {endpoint}",
        f"Method: {method}",
        "Headers: Authorization=[REDACTED]",
        f"Payload: {payload_summary or '(binary)'}",
        f"Response Status: {status_code}",
        f"Duration: {_fmt_ms(duration_ms)}",
    ]
    if response_summary:
        lines.append(f"Response: {response_summary}")
    _emit(lines)
