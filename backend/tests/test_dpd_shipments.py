"""Unit tests for DPD client + shipment service (mocked HTTP / DB)."""

from __future__ import annotations

import base64
import json
from datetime import date, timedelta
from pathlib import Path
from typing import Any, Optional

import httpx
import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from integrations.dpd.client import DPDClient
from integrations.dpd.config import DPDSettings
from integrations.dpd.exceptions import DPDApiError, DPDAuthError
from integrations.dpd.schemas import (DPDAddress, DPDContact, DPDCountry,
                                      DPDLabelFormat, DPDRecipient, DPDSender,
                                      DPDShipmentRequest, DPDSubAccount)
from services.shipment_service import (CreateShipmentRequest, close_day_batch,
                                       create_shipment_for_order)


@pytest.fixture
def dpd_settings() -> DPDSettings:
    return DPDSettings(
        base_url="https://dpd.test/api/v1/pt",
        username="user",
        password="pass",
        client_id="132",
        client_secret="secret",
        sub_account_code="SUB1",
        label_storage_dir="storage/labels",
        sender_name="Samphone",
        sender_email="ship@samphone.pt",
        sender_mobile="912345678",
        sender_mobile_code="351",
    )


def _sample_payload() -> DPDShipmentRequest:
    return DPDShipmentRequest(
        sub_account=DPDSubAccount(code="SUB1"),
        sender=DPDSender(
            name="Samphone",
            mobile="912345678",
            mobile_code="351",
            email="ship@samphone.pt",
        ),
        recipient=DPDRecipient(name="Cliente"),
        address=DPDAddress(
            country=DPDCountry(id="PT", iso2="PT"),
            address="Rua Teste 1",
            zip_code="1000-001",
            location="Lisboa",
        ),
        contact=DPDContact(
            name="Cliente",
            mobile="912345678",
            mobile_code="351",
            email="cliente@example.com",
        ),
        expedition_date=date.today(),
        encomenda_peso_envio=1.5,
        encomenda_num_volumes=1,
        etiqueta_formato=DPDLabelFormat(id=1),
        pdf_response=True,
    )


class FakeAppDB:
    def __init__(self) -> None:
        self.shipments: list[dict] = []
        self.orders: dict[str, dict] = {
            "ord-1": {
                "id": "ord-1",
                "order_number": "SP1",
                "full_name": "Cliente",
                "address": "Rua",
                "city": "Lisboa",
                "postal_code": "1000-001",
                "phone": "912345678",
            }
        }
        self.tracking_updates: list[tuple] = []

    def get_admin_order(self, order_id: str) -> Optional[dict]:
        return self.orders.get(order_id)

    def insert_shipment(self, shipment: dict) -> dict:
        row = dict(shipment)
        row.setdefault("created_at", "2026-01-01T00:00:00+00:00")
        row.setdefault("updated_at", row["created_at"])
        self.shipments.append(row)
        return row

    def get_shipment_by_order(self, order_id: str) -> Optional[dict]:
        rows = [s for s in self.shipments if s["order_id"] == order_id]
        ok = [s for s in rows if s.get("status") != "error"]
        pick = ok or rows
        return pick[-1] if pick else None

    def update_shipments_status_by_guias(
        self, guia_numbers: list[str], status: str
    ) -> int:
        n = 0
        for s in self.shipments:
            if s.get("num_guia") in guia_numbers:
                s["status"] = status
                n += 1
        return n

    def update_order_tracking(self, order_id: str, **kwargs: Any) -> None:
        self.tracking_updates.append((order_id, kwargs))


@pytest.mark.asyncio
async def test_get_token_success(dpd_settings: DPDSettings):
    async def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path.endswith("/oauth/token")
        return httpx.Response(
            200,
            json={
                "access_token": "tok-abc",
                "expires_in": 3600,
                "token_type": "Bearer",
            },
        )

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(
        transport=transport, base_url=dpd_settings.base_url
    ) as http:
        client = DPDClient(dpd_settings, http_client=http)
        token = await client._get_token()
        assert token == "tok-abc"
        # cached
        token2 = await client._get_token()
        assert token2 == "tok-abc"


@pytest.mark.asyncio
async def test_get_token_failure(dpd_settings: DPDSettings):
    async def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            404,
            json={"status_code": 404, "message": "bad credentials", "result": None},
        )

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(
        transport=transport, base_url=dpd_settings.base_url
    ) as http:
        client = DPDClient(dpd_settings, http_client=http)
        with pytest.raises(DPDAuthError):
            await client._get_token()


@pytest.mark.asyncio
async def test_request_refreshes_token_on_401(dpd_settings: DPDSettings):
    state = {"tokens": 0, "calls": 0}

    async def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/oauth/token"):
            state["tokens"] += 1
            return httpx.Response(
                200,
                json={"access_token": f"tok-{state['tokens']}", "expires_in": 3600},
            )
        state["calls"] += 1
        auth = request.headers.get("Authorization", "")
        if auth == "Bearer tok-1":
            return httpx.Response(401, json={"message": "expired"})
        assert auth == "Bearer tok-2"
        return httpx.Response(200, json={"ok": True})

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(
        transport=transport, base_url=dpd_settings.base_url
    ) as http:
        client = DPDClient(dpd_settings, http_client=http)
        # seed first token
        await client._get_token()
        assert client._token == "tok-1"
        resp = await client._request("GET", "/ping")
        assert resp.status_code == 200
        assert state["tokens"] == 2
        assert client._token == "tok-2"


@pytest.mark.asyncio
async def test_create_shipment_service_success(
    dpd_settings: DPDSettings, tmp_path: Path
):
    dpd_settings.label_storage_dir = str(tmp_path)
    pdf_b64 = base64.b64encode(b"%PDF-1.4 test").decode()

    async def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/oauth/token"):
            return httpx.Response(200, json={"access_token": "tok", "expires_in": 3600})
        assert "registarExpedicao" in request.url.path
        body = json.loads(request.content.decode())
        assert body["sub_account"]["code"] == "SUB1"
        assert body["pdf_response"] is True
        return httpx.Response(
            200,
            json={
                "status_code": 200,
                "message": "ok",
                "result": {
                    "num_guia": "G123",
                    "guias_seur": ["G123"],
                    "pdf": pdf_b64,
                },
            },
        )

    transport = httpx.MockTransport(handler)
    db = FakeAppDB()
    async with httpx.AsyncClient(
        transport=transport, base_url=dpd_settings.base_url
    ) as http:
        client = DPDClient(dpd_settings, http_client=http)
        result = await create_shipment_for_order(
            CreateShipmentRequest(
                order_id="ord-1",
                recipient_name="Cliente Teste",
                recipient_address="Rua A 1",
                recipient_zip_code="1000-001",
                recipient_city="Lisboa",
                recipient_phone="912345678",
                recipient_email="c@example.com",
                weight_kg=1.2,
                num_volumes=1,
            ),
            client,
            settings=dpd_settings,
            app_db=db,
        )

    assert result.num_guia == "G123"
    assert result.status == "created"
    assert result.label_url == "/api/shipments/ord-1/label"
    assert (tmp_path / "G123.pdf").is_file()
    assert db.shipments[-1]["num_guia"] == "G123"
    assert db.tracking_updates[-1][0] == "ord-1"


@pytest.mark.asyncio
async def test_create_shipment_422_maps_to_http_422(
    dpd_settings: DPDSettings, tmp_path: Path
):
    dpd_settings.label_storage_dir = str(tmp_path)

    async def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/oauth/token"):
            return httpx.Response(200, json={"access_token": "tok", "expires_in": 3600})
        return httpx.Response(
            200,
            json={
                "status_code": 422,
                "message": "Campo obrigatorio em falta",
                "result": None,
            },
        )

    transport = httpx.MockTransport(handler)
    db = FakeAppDB()
    async with httpx.AsyncClient(
        transport=transport, base_url=dpd_settings.base_url
    ) as http:
        client = DPDClient(dpd_settings, http_client=http)
        with pytest.raises(HTTPException) as ei:
            await create_shipment_for_order(
                CreateShipmentRequest(
                    order_id="ord-1",
                    recipient_name="Cliente",
                    recipient_address="Rua",
                    recipient_zip_code="1000",
                    recipient_city="Lisboa",
                    recipient_phone="912345678",
                    weight_kg=1.0,
                ),
                client,
                settings=dpd_settings,
                app_db=db,
            )
    assert ei.value.status_code == 422
    assert "Invalid shipment" in ei.value.detail
    assert db.shipments[-1]["status"] == "error"


@pytest.mark.asyncio
async def test_create_shipment_404_maps_to_http_404(
    dpd_settings: DPDSettings, tmp_path: Path
):
    dpd_settings.label_storage_dir = str(tmp_path)

    async def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/oauth/token"):
            return httpx.Response(200, json={"access_token": "tok", "expires_in": 3600})
        return httpx.Response(
            200,
            json={"status_code": 404, "message": "Regra de negocio", "result": None},
        )

    transport = httpx.MockTransport(handler)
    db = FakeAppDB()
    async with httpx.AsyncClient(
        transport=transport, base_url=dpd_settings.base_url
    ) as http:
        client = DPDClient(dpd_settings, http_client=http)
        with pytest.raises(HTTPException) as ei:
            await create_shipment_for_order(
                CreateShipmentRequest(
                    order_id="ord-1",
                    recipient_name="Cliente",
                    recipient_address="Rua",
                    recipient_zip_code="1000",
                    recipient_city="Lisboa",
                    recipient_phone="912345678",
                    weight_kg=1.0,
                ),
                client,
                settings=dpd_settings,
                app_db=db,
            )
    assert ei.value.status_code == 404


def test_expedition_date_rejects_past():
    with pytest.raises(ValidationError):
        DPDShipmentRequest(
            sub_account=DPDSubAccount(code="SUB1"),
            sender=DPDSender(
                name="Samphone",
                mobile="912345678",
                mobile_code="351",
                email="ship@samphone.pt",
            ),
            recipient=DPDRecipient(name="Cliente"),
            address=DPDAddress(
                country=DPDCountry(id="PT"),
                address="Rua",
                zip_code="1000",
                location="Lisboa",
            ),
            contact=DPDContact(name="Cliente", mobile="912345678", mobile_code="351"),
            expedition_date=date.today() - timedelta(days=1),
            encomenda_peso_envio=1.0,
            encomenda_num_volumes=1,
            etiqueta_formato=DPDLabelFormat(id=1),
        )


@pytest.mark.asyncio
async def test_close_day_batch_updates_status(dpd_settings: DPDSettings):
    async def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/oauth/token"):
            return httpx.Response(200, json={"access_token": "tok", "expires_in": 3600})
        assert "fechoApi" in request.url.path
        return httpx.Response(
            200, json={"status_code": 200, "message": "ok", "result": {}}
        )

    transport = httpx.MockTransport(handler)
    db = FakeAppDB()
    db.shipments.append(
        {
            "id": "s1",
            "order_id": "ord-1",
            "carrier": "dpd",
            "num_guia": "G1",
            "label_path": "G1.pdf",
            "status": "created",
            "raw_response": None,
        }
    )
    async with httpx.AsyncClient(
        transport=transport, base_url=dpd_settings.base_url
    ) as http:
        client = DPDClient(dpd_settings, http_client=http)
        out = await close_day_batch(["G1"], client, app_db=db)
    assert out["updated"] == 1
    assert db.shipments[0]["status"] == "closed"


@pytest.mark.asyncio
async def test_create_shipment_client_raises_on_5xx_exhausted(
    dpd_settings: DPDSettings,
):
    async def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/oauth/token"):
            return httpx.Response(200, json={"access_token": "tok", "expires_in": 3600})
        return httpx.Response(
            200,
            json={"status_code": 500, "message": "fail", "result": None},
        )

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(
        transport=transport, base_url=dpd_settings.base_url
    ) as http:
        client = DPDClient(dpd_settings, http_client=http)
        with pytest.raises(DPDApiError) as ei:
            await client.create_shipment(_sample_payload())
    assert ei.value.status_code == 500
