"""DPD Portugal API settings — read from environment (matches project dotenv pattern)."""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from pydantic import BaseModel, Field


def _env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


class DPDSettings(BaseModel):
    """DPD credentials and label storage. Never commit real values — use .env only."""

    base_url: str = Field(
        default="https://qabusiness.dpd.pt/api/v1/pt",
        description="DPD API base URL",
    )
    username: str = ""
    password: str = ""
    client_id: str = ""
    client_secret: str = ""
    sub_account_code: str = ""
    label_storage_dir: str = "storage/labels"

    # Shipper / sender defaults (Samphone warehouse). Required by DPD payload.
    sender_name: str = "Samphone"
    sender_email: str = ""
    sender_mobile: str = ""
    sender_mobile_code: str = "351"
    sender_phone: str = ""
    sender_phone_code: str = "351"
    shipper_address: str = ""
    shipper_zip_code: str = ""
    shipper_location: str = ""
    shipper_country: str = "PT"

    def configured(self) -> bool:
        """DPD is on when base URL is set and either user/pass or client id/secret."""
        has_user_pass = bool(self.username and self.password)
        has_client = bool(self.client_id and self.client_secret)
        return bool(self.base_url) and (has_user_pass or has_client)

    def absolute_label_dir(self, root: Path | None = None) -> Path:
        path = Path(self.label_storage_dir)
        if path.is_absolute():
            return path
        base = root or Path(__file__).resolve().parents[2]
        return (base / path).resolve()


@lru_cache(maxsize=1)
def get_dpd_settings() -> DPDSettings:
    return DPDSettings(
        base_url=_env("DPD_BASE_URL", "https://qabusiness.dpd.pt/api/v1/pt")
        or "https://qabusiness.dpd.pt/api/v1/pt",
        username=_env("DPD_USERNAME"),
        password=_env("DPD_PASSWORD"),
        client_id=_env("DPD_CLIENT_ID"),
        client_secret=_env("DPD_CLIENT_SECRET"),
        sub_account_code=_env("DPD_SUB_ACCOUNT_CODE"),
        label_storage_dir=_env("DPD_LABEL_STORAGE_DIR", "storage/labels")
        or "storage/labels",
        sender_name=_env("DPD_SENDER_NAME", "Samphone") or "Samphone",
        sender_email=_env("DPD_SENDER_EMAIL")
        or _env("EMAIL_FROM")
        or _env("SUPPORT_EMAIL"),
        sender_mobile=_env("DPD_SENDER_MOBILE"),
        sender_mobile_code=_env("DPD_SENDER_MOBILE_CODE", "351") or "351",
        sender_phone=_env("DPD_SENDER_PHONE"),
        sender_phone_code=_env("DPD_SENDER_PHONE_CODE", "351") or "351",
        shipper_address=_env("DPD_SHIPPER_ADDRESS"),
        shipper_zip_code=_env("DPD_SHIPPER_ZIP_CODE"),
        shipper_location=_env("DPD_SHIPPER_LOCATION"),
        shipper_country=_env("DPD_SHIPPER_COUNTRY", "PT") or "PT",
    )


def clear_dpd_settings_cache() -> None:
    get_dpd_settings.cache_clear()
