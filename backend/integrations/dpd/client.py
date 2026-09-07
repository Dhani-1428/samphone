"""Async HTTP client for DPD Portugal Business API."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, AsyncIterator, Optional

import httpx
from tenacity import (retry, retry_if_exception, stop_after_attempt,
                      wait_exponential)

from integrations.dpd.config import DPDSettings, get_dpd_settings
from integrations.dpd.exceptions import DPDApiError, DPDAuthError
from integrations.dpd.schemas import DPDShipmentRequest, DPDShipmentResponse

logger = logging.getLogger(__name__)

# Conservative TTL when DPD omits expires_in (token refresh before typical 1h expiry).
_DEFAULT_TOKEN_TTL = timedelta(minutes=50)
_RETRYABLE_HTTP = {500, 502, 503, 504}


def _is_retryable_dpd_error(exc: BaseException) -> bool:
    if isinstance(exc, DPDApiError):
        return exc.status_code in _RETRYABLE_HTTP
    if isinstance(exc, httpx.HTTPStatusError):
        return exc.response.status_code in _RETRYABLE_HTTP
    return isinstance(exc, (httpx.TransportError, httpx.TimeoutException))


class DPDClient:
    def __init__(
        self,
        settings: DPDSettings | None = None,
        *,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        self.settings = settings or get_dpd_settings()
        self._owns_client = http_client is None
        self._http = http_client or httpx.AsyncClient(
            base_url=self.settings.base_url.rstrip("/"),
            timeout=httpx.Timeout(60.0, connect=15.0),
        )
        self._token: Optional[str] = None
        self._token_expiry: Optional[datetime] = None

    async def aclose(self) -> None:
        if self._owns_client:
            await self._http.aclose()

    def _token_valid(self) -> bool:
        if not self._token or not self._token_expiry:
            return False
        return datetime.now(timezone.utc) < self._token_expiry

    def clear_token(self) -> None:
        self._token = None
        self._token_expiry = None

    async def _get_token(self) -> str:
        if self._token_valid():
            return self._token  # type: ignore[return-value]

        if not self.settings.configured():
            raise DPDAuthError("DPD credentials are not configured")

        has_user_pass = bool(self.settings.username and self.settings.password)
        data: dict[str, str] = {
            "grant_type": "password" if has_user_pass else "client_credentials",
        }
        if self.settings.username:
            data["username"] = self.settings.username
        if self.settings.password:
            data["password"] = self.settings.password
        if self.settings.client_id:
            data["client_id"] = self.settings.client_id
        if self.settings.client_secret:
            data["client_secret"] = self.settings.client_secret
        try:
            response = await self._http.post(
                "/oauth/token",
                data=data,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
        except httpx.HTTPError as exc:
            raise DPDAuthError(f"DPD token request failed: {exc}") from exc

        body: Any
        try:
            body = response.json()
        except Exception:
            body = {}

        if response.status_code != 200 or not isinstance(body, dict):
            msg = ""
            if isinstance(body, dict):
                msg = str(
                    body.get("message")
                    or body.get("error_description")
                    or body.get("error")
                    or ""
                )
            raise DPDAuthError(msg or f"DPD auth failed (HTTP {response.status_code})")

        token = body.get("access_token") or body.get("token") or body.get("result")
        if isinstance(token, dict):
            token = token.get("access_token") or token.get("token")
        if not token or not isinstance(token, str):
            raise DPDAuthError("DPD auth response missing access_token")

        expires_in = body.get("expires_in")
        if expires_in is None and isinstance(body.get("result"), dict):
            expires_in = body["result"].get("expires_in")
        try:
            ttl = (
                timedelta(seconds=int(expires_in))
                if expires_in is not None
                else _DEFAULT_TOKEN_TTL
            )
        except (TypeError, ValueError):
            ttl = _DEFAULT_TOKEN_TTL
        # Refresh a bit early
        if ttl > timedelta(minutes=2):
            ttl -= timedelta(minutes=1)

        self._token = token
        self._token_expiry = datetime.now(timezone.utc) + ttl
        return token

    async def _request(self, method: str, path: str, **kwargs: Any) -> httpx.Response:
        token = await self._get_token()
        headers = dict(kwargs.pop("headers", None) or {})
        headers["Authorization"] = f"Bearer {token}"
        response = await self._http.request(method, path, headers=headers, **kwargs)

        if response.status_code == 401:
            self.clear_token()
            token = await self._get_token()
            headers["Authorization"] = f"Bearer {token}"
            response = await self._http.request(method, path, headers=headers, **kwargs)
            if response.status_code == 401:
                raise DPDAuthError("DPD authorization failed after token refresh")

        return response

    @retry(
        reraise=True,
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=0.5, min=0.5, max=4),
        retry=retry_if_exception(_is_retryable_dpd_error),
    )
    async def create_shipment(self, payload: DPDShipmentRequest) -> DPDShipmentResponse:
        body = payload.model_dump(exclude_none=True, by_alias=True, mode="json")
        response = await self._request(
            "POST", "/expedition/registarExpedicao", json=body
        )

        try:
            data = response.json()
        except Exception as exc:
            raise DPDApiError(
                f"Invalid JSON from DPD (HTTP {response.status_code})",
                status_code=response.status_code,
            ) from exc

        api_status = data.get("status_code") if isinstance(data, dict) else None
        if response.status_code != 200 or api_status != 200:
            message = ""
            if isinstance(data, dict):
                message = str(data.get("message") or "")
            status = int(api_status or response.status_code or 500)
            raise DPDApiError(
                message or "DPD shipment creation failed", status_code=status
            )

        return DPDShipmentResponse.model_validate(data)

    async def close_day(
        self, guias: list[str], pdf_base64_response: bool = False
    ) -> dict:
        response = await self._request(
            "POST",
            "/expedition/fechoApi",
            json={"guias": guias, "pdf_base64_response": pdf_base64_response},
        )
        try:
            data = response.json()
        except Exception as exc:
            raise DPDApiError(
                f"Invalid JSON from DPD close-day (HTTP {response.status_code})",
                status_code=response.status_code,
            ) from exc
        if not isinstance(data, dict):
            raise DPDApiError(
                "Unexpected DPD close-day response", status_code=response.status_code
            )
        api_status = data.get("status_code")
        if response.status_code != 200 or (
            api_status is not None and api_status != 200
        ):
            raise DPDApiError(
                str(data.get("message") or "DPD close-day failed"),
                status_code=int(api_status or response.status_code or 500),
            )
        return data


_dpd_client: DPDClient | None = None


async def get_dpd_client() -> AsyncIterator[DPDClient]:
    """FastAPI dependency — shared singleton client for the process lifetime."""
    global _dpd_client
    if _dpd_client is None:
        _dpd_client = DPDClient()
    yield _dpd_client


async def close_dpd_client() -> None:
    global _dpd_client
    if _dpd_client is not None:
        await _dpd_client.aclose()
        _dpd_client = None
