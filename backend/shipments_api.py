"""Shipment API routes — React Native talks to these; never to DPD directly."""
from __future__ import annotations

from typing import Any

from fastapi import Depends
from fastapi.responses import FileResponse

from integrations.dpd.client import DPDClient, get_dpd_client
from services.shipment_service import (
    CloseDayRequest,
    CreateShipmentRequest,
    ShipmentResponse,
    close_day_batch,
    create_shipment_for_order,
    get_shipment_by_order,
    resolve_label_file,
)


def register_shipment_routes(
    api_router: Any,
    *,
    get_current_user,
    get_current_admin,
) -> None:
    """Attach shipment routes to the main `/api` router with project auth deps."""

    @api_router.post(
        "/shipments",
        response_model=ShipmentResponse,
        responses={
            422: {"description": "Validation / invalid shipment data"},
            404: {"description": "Order not found or rejected by provider"},
            503: {"description": "Shipping provider not configured"},
            502: {"description": "Shipping provider error"},
        },
    )
    async def create_shipment(
        body: CreateShipmentRequest,
        _user=Depends(get_current_user),
        dpd: DPDClient = Depends(get_dpd_client),
    ):
        return await create_shipment_for_order(body, dpd)

    @api_router.post(
        "/shipments/close-day",
        responses={
            403: {"description": "Admin access required"},
            422: {"description": "Invalid body"},
            503: {"description": "Shipping provider not configured"},
            502: {"description": "Shipping provider error"},
        },
    )
    async def close_day(
        body: CloseDayRequest,
        _admin=Depends(get_current_admin),
        dpd: DPDClient = Depends(get_dpd_client),
    ):
        return await close_day_batch(body.guia_numbers, dpd)

    @api_router.get(
        "/shipments/{order_id}",
        response_model=ShipmentResponse,
        responses={404: {"description": "Shipment not found"}},
    )
    async def get_shipment(order_id: str, _user=Depends(get_current_user)):
        return await get_shipment_by_order(order_id)

    @api_router.get(
        "/shipments/{order_id}/label",
        responses={404: {"description": "Label not found"}},
    )
    async def get_shipment_label(order_id: str, _user=Depends(get_current_user)):
        path, num_guia = await resolve_label_file(order_id)
        return FileResponse(
            path,
            media_type="application/pdf",
            filename=f"{num_guia}.pdf",
        )
