"""Catalog backend — products always from MySQL clone (never WooCommerce REST)."""
from __future__ import annotations

import os


def _flag(name: str, default: str = "0") -> bool:
    return os.environ.get(name, default).strip() == "1"


def get_woo_db():
    """
    Historical name kept for server.py compatibility.

    Products always come from the cloned WooCommerce MySQL database
    (u552904336_samappdb). Live WooCommerce REST is not used for catalog.
    """
    from services.catalog_service import get_catalog_service

    if _flag("USE_WOOCOMMERCE", "0") and not _flag("USE_CATALOG_MYSQL", "1"):
        # Legacy flag kept for clarity in logs; REST catalog is disabled.
        import logging

        logging.getLogger(__name__).warning(
            "USE_WOOCOMMERCE=1 ignored — products are served from catalog MySQL only"
        )

    return get_catalog_service()
