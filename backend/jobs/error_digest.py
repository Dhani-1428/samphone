"""Optional morning digest of recent API errors from journalctl.

Usage:
  cd /var/www/myapi && ./venv/bin/python -m jobs.error_digest
"""

from __future__ import annotations

import logging
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env", override=True)

from stripe_service import _slack_ops

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("jobs.error_digest")


def main() -> None:
    since = os.environ.get("ERROR_DIGEST_SINCE", "24 hours ago")
    try:
        raw = subprocess.check_output(
            [
                "journalctl",
                "-u",
                "myapi.service",
                "--since",
                since,
                "-p",
                "err",
                "--no-pager",
                "-n",
                "80",
            ],
            text=True,
            stderr=subprocess.STDOUT,
        )
    except Exception as exc:
        logger.warning("journalctl failed: %s", exc)
        return

    lines = [ln for ln in raw.splitlines() if ln.strip() and "No entries" not in ln]
    if not lines:
        logger.info("error_digest: no errors since %s", since)
        return

    body = "\n".join(lines[-40:])
    msg = f":mag: myapi error digest ({len(lines)} lines since {since})\n```{body[-3500:]}```"
    logger.info("error_digest sending %s lines", len(lines))
    _slack_ops(msg)
    # Also email admin if SMTP is available
    try:
        from email_service import send_email

        to_addr = (
            os.environ.get("ADMIN_NOTIFY_EMAIL")
            or os.environ.get("ADMIN_EMAIL")
            or ""
        ).strip()
        if to_addr:
            send_email(
                to_addr,
                f"[Samphone] API error digest ({len(lines)})",
                f"<pre>{body[-8000:]}</pre>",
                body[-8000:],
            )
    except Exception as exc:
        logger.info("email digest skipped: %s", exc)


if __name__ == "__main__":
    main()
