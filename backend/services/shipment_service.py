"""Shipment service — maps app requests to DPD and persists results in MySQL."""

from __future__ import annotations

import asyncio
import logging
import re
import uuid
from datetime import date
from typing import Any, Optional

from fastapi import HTTPException
from pydantic import BaseModel, Field, field_validator

from app_db import get_app_db
from integrations.dpd.client import DPDClient
from integrations.dpd.config import DPDSettings, get_dpd_settings
from integrations.dpd.exceptions import DPDApiError, DPDAuthError
from integrations.dpd.label_storage import save_label
from integrations.dpd.schemas import (
    DPDAddress,
    DPDContact,
    DPDCountry,
    DPDLabelFormat,
    DPDRecipient,
    DPDSender,
    DPDShipmentRequest,
    DPDShipper,
    DPDSubAccount,
)

logger = logging.getLogger(__name__)

_PHONE_DIGITS = re.compile(r"\D+")


class CreateShipmentRequest(BaseModel):
    order_id: str = Field(..., min_length=1, max_length=64)
    recipient_name: str = Field(..., max_length=32)
    recipient_address: str = Field(..., max_length=64)
    recipient_zip_code: str = Field(..., max_length=8)
    recipient_city: str = Field(..., max_length=26)
    recipient_country: str = Field(default="PT", min_length=2, max_length=2)
    recipient_phone: str = Field(..., max_length=20)
    recipient_email: Optional[str] = Field(default=None, max_length=50)
    weight_kg: float = Field(..., gt=0)
    num_volumes: int = Field(default=1, ge=1)
    cod_enabled: bool = False
    cod_amount: Optional[float] = None
    reference: Optional[str] = Field(default=None, max_length=16)
    instructions: Optional[str] = Field(default=None, max_length=64)
    expedition_date: Optional[date] = None
    label_format: int = Field(default=1, ge=1, le=3)

    @field_validator("expedition_date")
    @classmethod
    def expedition_date_not_past(cls, value: Optional[date]) -> Optional[date]:
        if value is not None and value < date.today():
            raise ValueError("expedition_date must be today or a future date")
        return value


class CloseDayRequest(BaseModel):
    guia_numbers: list[str] = Field(..., min_length=1)


class ShipmentResponse(BaseModel):
    id: str
    order_id: str
    num_guia: Optional[str] = None
    label_url: Optional[str] = None
    status: str
    carrier: str = "dpd"


def _digits(value: str, max_len: int = 9) -> str:
    return _PHONE_DIGITS.sub("", value or "")[-max_len:]


def _split_phone(raw: str, default_code: str = "351") -> tuple[str, str]:
    digits = _PHONE_DIGITS.sub("", raw or "")
    if digits.startswith("00"):
        digits = digits[2:]
    if len(digits) > 9 and digits.startswith(default_code):
        local = digits[len(default_code) :]
        return default_code, local[-9:]
    if len(digits) > 9:
        return digits[:-9][-4:] or default_code, digits[-9:]
    return default_code, digits[-9:]


def _sender_email(settings: DPDSettings) -> str:
    raw = (settings.sender_email or "").strip()
    if "<" in raw and ">" in raw:
        raw = raw.split("<", 1)[1].split(">", 1)[0].strip()
    return raw[:50]


def _label_url(order_id: str) -> str:
    return f"/api/shipments/{order_id}/label"


def shipment_to_response(row: dict) -> ShipmentResponse:
    order_id = row.get("order_id") or ""
    label_path = row.get("label_path")
    return ShipmentResponse(
        id=row["id"],
        order_id=order_id,
        num_guia=row.get("num_guia"),
        label_url=_label_url(order_id) if label_path else None,
        status=row.get("status") or "created",
        carrier=row.get("carrier") or "dpd",
    )


def _map_dpd_http_error(exc: DPDApiError) -> HTTPException:
    code = int(exc.status_code or 500)
    if code == 422:
        return HTTPException(status_code=422, detail="Invalid shipment data")
    if code == 404:
        return HTTPException(
            status_code=404, detail="Shipment rejected by shipping provider"
        )
    if code in (401, 403):
        return HTTPException(status_code=502, detail="Shipping provider auth error")
    if code >= 500:
        return HTTPException(status_code=502, detail="Shipping provider error")
    return HTTPException(status_code=502, detail="Shipping provider error")


def build_dpd_payload(
    request: CreateShipmentRequest,
    settings: DPDSettings,
) -> DPDShipmentRequest:
    country = (request.recipient_country or "PT").upper()[:2]
    country_obj = DPDCountry(id=country, iso2=country)
    mobile_code, mobile = _split_phone(
        request.recipient_phone, settings.sender_mobile_code or "351"
    )
    if not mobile:
        raise HTTPException(status_code=422, detail="recipient_phone is required")

    sender_mobile = _digits(settings.sender_mobile) or mobile
    sender_phone = _digits(settings.sender_phone) or None
    email = _sender_email(settings)
    if not email:
        raise HTTPException(
            status_code=502,
            detail="Shipping sender email is not configured (DPD_SENDER_EMAIL)",
        )

    shipper = None
    if (
        settings.shipper_address
        or settings.shipper_zip_code
        or settings.shipper_location
    ):
        shipper = DPDShipper(
            name=(settings.sender_name or "Samphone")[:32],
            address=(settings.shipper_address or "")[:64] or None,
            zip_code=(settings.shipper_zip_code or "")[:8] or None,
            location=(settings.shipper_location or "")[:26] or None,
            country=DPDCountry(
                id=(settings.shipper_country or "PT")[:2],
                iso2=(settings.shipper_country or "PT")[:2],
            ),
        )

    expedition = request.expedition_date or date.today()
    return DPDShipmentRequest(
        sub_account=DPDSubAccount(code=settings.sub_account_code[:8]),
        sender=DPDSender(
            name=(settings.sender_name or "Samphone")[:32],
            phone=sender_phone,
            phone_code=settings.sender_phone_code or None,
            mobile=sender_mobile[:9],
            mobile_code=(settings.sender_mobile_code or "351")[:4],
            email=email,
            save=False,
        ),
        shipper=shipper,
        recipient=DPDRecipient(name=request.recipient_name[:32], save=False),
        address=DPDAddress(
            country=country_obj,
            address=request.recipient_address[:64],
            zip_code=request.recipient_zip_code[:8],
            location=request.recipient_city[:26],
            save=False,
        ),
        contact=DPDContact(
            name=request.recipient_name[:32],
            mobile=mobile[:9],
            mobile_code=mobile_code[:4],
            email=(request.recipient_email or None),
            save=False,
        ),
        encomenda_referencia=(request.reference or None),
        encomenda_observacao=(request.instructions or None),
        expedition_date=expedition,
        encomenda_peso_envio=float(request.weight_kg),
        encomenda_num_volumes=int(request.num_volumes),
        opcoes_servico_enviar_a_cobranca=True if request.cod_enabled else None,
        opcoes_servico_montante=(
            float(request.cod_amount)
            if request.cod_enabled and request.cod_amount is not None
            else None
        ),
        etiqueta_formato=DPDLabelFormat(id=int(request.label_format)),
        pdf_response=True,
    )


async def create_shipment_for_order(
    request: CreateShipmentRequest,
    dpd_client: DPDClient,
    *,
    settings: DPDSettings | None = None,
    app_db: Any = None,
) -> ShipmentResponse:
    settings = settings or get_dpd_settings()
    db = app_db or get_app_db()

    if not settings.configured() or not settings.sub_account_code:
        has_user_pass = bool(settings.username and settings.password)
        has_client = bool(settings.client_id and settings.client_secret)
        missing = []
        if not settings.base_url:
            missing.append("DPD_BASE_URL")
        if not has_user_pass and not has_client:
            missing.extend(
                [
                    "DPD_USERNAME+DPD_PASSWORD",
                    "or DPD_CLIENT_ID+DPD_CLIENT_SECRET",
                ]
            )
        if not settings.sub_account_code:
            missing.append("DPD_SUB_ACCOUNT_CODE")
        logger.error("DPD not configured; missing %s", ",".join(missing) or "credentials")
        raise HTTPException(
            status_code=503,
            detail=(
                "Shipping provider is not configured "
                f"(missing {', '.join(missing) or 'DPD credentials'})"
            ),
        )

    order = await _load_order(request.order_id, db)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    try:
        payload = build_dpd_payload(request, settings)
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    try:
        dpd_response = await dpd_client.create_shipment(payload)
    except DPDAuthError as exc:
        logger.error("DPD auth error for order %s: %s", request.order_id, exc)
        _persist_error_shipment(
            db, request.order_id, {"error": str(exc), "type": "auth"}
        )
        raise HTTPException(
            status_code=502, detail="Shipping provider auth error"
        ) from exc
    except DPDApiError as exc:
        logger.error(
            "DPD API error for order %s: status=%s message=%s",
            request.order_id,
            exc.status_code,
            exc.message,
        )
        _persist_error_shipment(
            db,
            request.order_id,
            {"status_code": exc.status_code, "message": exc.message},
        )
        raise _map_dpd_http_error(exc) from exc

    result = dpd_response.result
    if not result or not result.num_guia:
        logger.error(
            "DPD success without num_guia for order %s: %s",
            request.order_id,
            dpd_response,
        )
        _persist_error_shipment(db, request.order_id, dpd_response.model_dump())
        raise HTTPException(status_code=502, detail="Shipping provider error")

    label_path = None
    if result.pdf:
        label_path = save_label(
            result.num_guia,
            result.pdf,
            str(settings.absolute_label_dir()),
        )

    shipment_id = str(uuid.uuid4())
    row = db.insert_shipment(
        {
            "id": shipment_id,
            "order_id": request.order_id,
            "carrier": "dpd",
            "num_guia": result.num_guia,
            "label_path": label_path,
            "status": "created",
            "raw_response": dpd_response.model_dump(mode="json"),
        }
    )
    try:
        db.update_order_tracking(
            request.order_id,
            tracking_number=result.num_guia,
            carrier="dpd",
        )
    except Exception as exc:
        logger.warning(
            "Failed to update order tracking for %s: %s", request.order_id, exc
        )

    return shipment_to_response(row)


async def close_day_batch(
    guia_numbers: list[str],
    dpd_client: DPDClient,
    *,
    app_db: Any = None,
) -> dict:
    db = app_db or get_app_db()
    guias = [g.strip() for g in guia_numbers if g and str(g).strip()]
    if not guias:
        raise HTTPException(status_code=422, detail="guia_numbers is required")
    try:
        result = await dpd_client.close_day(guias, pdf_base64_response=False)
    except DPDAuthError as exc:
        logger.error("DPD close-day auth error: %s", exc)
        raise HTTPException(
            status_code=502, detail="Shipping provider auth error"
        ) from exc
    except DPDApiError as exc:
        logger.error("DPD close-day error: %s %s", exc.status_code, exc.message)
        raise _map_dpd_http_error(exc) from exc

    updated = db.update_shipments_status_by_guias(guias, "closed")
    return {"updated": updated, "dpd": result}


async def get_shipment_by_order(
    order_id: str, *, app_db: Any = None
) -> ShipmentResponse:
    db = app_db or get_app_db()
    row = db.get_shipment_by_order(order_id)
    if not row:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return shipment_to_response(row)


async def resolve_label_file(
    order_id: str, *, app_db: Any = None, settings: DPDSettings | None = None
):
    settings = settings or get_dpd_settings()
    db = app_db or get_app_db()
    row = db.get_shipment_by_order(order_id)
    if not row or not row.get("label_path"):
        raise HTTPException(status_code=404, detail="Label not found")
    label_dir = settings.absolute_label_dir()
    path = (label_dir / row["label_path"]).resolve()
    if not str(path).startswith(str(label_dir.resolve())) or not path.is_file():
        raise HTTPException(status_code=404, detail="Label not found")
    return path, row.get("num_guia") or order_id


async def _load_order(order_id: str, db: Any) -> Optional[dict]:
    raw = (order_id or "").strip()
    if not raw:
        return None
    try:
        row = db.get_admin_order(raw)
        if row:
            return row
    except Exception as exc:
        logger.warning("Order lookup failed for %s: %s", raw, exc)

    # Website / WooCommerce orders (ids like wc-52512) live in the catalog clone.
    if raw.startswith("wc-") or raw.isdigit():
        try:
            from woocommerce_client import get_woo_db

            woo = get_woo_db()
            if woo.configured():
                return await asyncio.to_thread(woo.get_woocommerce_order, raw)
        except Exception as exc:
            logger.warning("Website order lookup failed for %s: %s", raw, exc)
    return None


def _persist_error_shipment(db: Any, order_id: str, raw: Any) -> None:
    try:
        db.insert_shipment(
            {
                "id": str(uuid.uuid4()),
                "order_id": order_id,
                "carrier": "dpd",
                "num_guia": None,
                "label_path": None,
                "status": "error",
                "raw_response": raw,
            }
        )
    except Exception as exc:
        logger.warning("Failed to persist error shipment for %s: %s", order_id, exc)
