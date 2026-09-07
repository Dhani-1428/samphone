"""DPD Portugal API exceptions."""


class DPDAuthError(Exception):
    """OAuth or authorization failure talking to DPD."""


class DPDApiError(Exception):
    """Non-success business/API response from DPD."""

    def __init__(self, message: str, status_code: int = 500) -> None:
        self.status_code = int(status_code)
        self.message = message or "DPD API error"
        super().__init__(self.message)
