"""Pydantic models mirroring DPD Portugal payloads (Portuguese field names preserved)."""

from __future__ import annotations

from datetime import date, time
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


class DPDCountry(BaseModel):
    id: str = Field(..., min_length=2, max_length=2)
    iso2: Optional[str] = Field(default=None, min_length=2, max_length=2)


class DPDSubAccount(BaseModel):
    code: str = Field(..., max_length=8)


class DPDSender(BaseModel):
    id: Optional[int] = None
    name: str = Field(..., max_length=32)
    phone: Optional[str] = Field(default=None, max_length=9)
    phone_code: Optional[str] = Field(default=None, max_length=4)
    mobile: str = Field(..., max_length=9)
    mobile_code: str = Field(..., max_length=4)
    email: str = Field(..., max_length=50)
    save: bool = False


class DPDShipper(BaseModel):
    name: Optional[str] = Field(default=None, max_length=32)
    address: Optional[str] = Field(default=None, max_length=64)
    zip_code: Optional[str] = Field(default=None, max_length=8)
    location: Optional[str] = Field(default=None, max_length=26)
    country: Optional[DPDCountry] = None


class DPDRecipient(BaseModel):
    id: Optional[int] = None
    name: str = Field(..., max_length=32)
    client_code: Optional[str] = Field(default=None, max_length=10)
    save: bool = False


class DPDAddress(BaseModel):
    id: Optional[int] = None
    country: DPDCountry
    address: str = Field(..., max_length=64)
    zip_code: str = Field(..., max_length=8)
    location: str = Field(..., max_length=26)
    save: bool = False


class DPDContact(BaseModel):
    id: Optional[int] = None
    name: str = Field(..., max_length=32)
    phone: Optional[str] = Field(default=None, max_length=9)
    phone_code: Optional[str] = Field(default=None, max_length=4)
    mobile: str = Field(..., max_length=9)
    mobile_code: str = Field(..., max_length=4)
    email: Optional[str] = Field(default=None, max_length=50)
    save: bool = False


class DPDRecipientPickupStore(BaseModel):
    number: str = Field(..., max_length=7)


class DPDLabelFormat(BaseModel):
    id: int  # 1=A4 one/sheet, 2=A4 two/sheet, 3=4x6 thermal


class DPDShipmentRequest(BaseModel):
    sub_account: DPDSubAccount
    sender: DPDSender
    shipper: Optional[DPDShipper] = None
    recipient: DPDRecipient
    address: DPDAddress
    contact: DPDContact
    destinatario_usar_endereco_pickup: bool = False
    recipient_pickup_store: Optional[DPDRecipientPickupStore] = None
    pickup_store_name: Optional[str] = Field(default=None, max_length=32)
    pickup_store_mobile: Optional[str] = Field(default=None, max_length=9)
    pickup_store_mobile_code: Optional[str] = Field(default=None, max_length=4)
    pickup_store_email: Optional[str] = Field(default=None, max_length=50)
    opcoes_servico_predict_para_entrega: Optional[bool] = None
    encomenda_referencia: Optional[str] = Field(default=None, max_length=16)
    opcoes_servico_codigo_at: Optional[str] = Field(default=None, max_length=11)
    encomenda_observacao: Optional[str] = Field(default=None, max_length=64)
    expedition_date: date
    expedition_time: Optional[time] = None
    encomenda_peso_envio: float
    encomenda_num_volumes: int
    opcoes_servico_enviar_a_cobranca: Optional[bool] = None
    opcoes_servico_montante: Optional[float] = None
    etiqueta_hide_nome: bool = False
    etiqueta_hide_telemovel: bool = False
    etiqueta_hide_email: bool = False
    etiqueta_formato: DPDLabelFormat
    etiqueta_enviar_etiqueta_por_email: bool = False
    zpl_response: Optional[bool] = None
    pdf_response: Optional[bool] = True
    qr_response: Optional[bool] = None

    @field_validator("expedition_date")
    @classmethod
    def expedition_date_not_past(cls, value: date) -> date:
        if value < date.today():
            raise ValueError("expedition_date must be today or a future date")
        return value

    @model_validator(mode="after")
    def pickup_requires_store(self) -> "DPDShipmentRequest":
        if (
            self.destinatario_usar_endereco_pickup
            and self.recipient_pickup_store is None
        ):
            raise ValueError(
                "recipient_pickup_store is required when destinatario_usar_endereco_pickup is True"
            )
        return self


class DPDShipmentResult(BaseModel):
    num_guia: str
    guias_seur: list[Any] = Field(default_factory=list)
    pdf: Optional[str] = None  # base64


class DPDShipmentResponse(BaseModel):
    status_code: int
    message: str
    result: Optional[DPDShipmentResult] = None


class DPDErrorResponse(BaseModel):
    status_code: int
    message: str
    result: None = None
