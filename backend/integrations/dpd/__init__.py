"""DPD Portugal shipping integration."""

from integrations.dpd.client import DPDClient, close_dpd_client, get_dpd_client
from integrations.dpd.config import DPDSettings, get_dpd_settings
from integrations.dpd.exceptions import DPDApiError, DPDAuthError

__all__ = [
    "DPDApiError",
    "DPDAuthError",
    "DPDClient",
    "DPDSettings",
    "close_dpd_client",
    "get_dpd_client",
    "get_dpd_settings",
]
