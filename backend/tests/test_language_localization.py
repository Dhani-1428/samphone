from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from localization import normalize_language, tr
from server import _build_user_from_register, _order_notify_data, UserCreate
from wholesale import user_public_wholesale


def test_normalize_locale_variants():
    assert normalize_language("pt-PT") == "pt"
    assert normalize_language("es-MX") == "es"
    assert normalize_language("fr-FR") == "fr"
    assert normalize_language("zh-CN") == "zh"


def test_unknown_language_falls_back_to_en():
    assert normalize_language("xx-YY") == "en"
    assert tr("xx-YY", "order.confirmed.title") == "Order confirmed"


def test_register_builder_persists_normalized_language():
    body = UserCreate(
        email="langtest@example.com",
        password="test12345",
        name="Lang Test",
        language="pt-PT",
    )
    user = _build_user_from_register(body)
    assert user["language"] == "pt"


def test_user_public_returns_normalized_language():
    user = {
        "id": "u1",
        "email": "u@example.com",
        "name": "U",
        "role": "customer",
        "language": "es-MX",
    }
    pub = user_public_wholesale(user)
    assert pub["language"] == "es"


def test_order_notify_data_keeps_language_and_neutral_numbers():
    order = {
        "id": "o1",
        "order_number": "SP1",
        "subtotal": 12.5,
        "status": "order_placed",
        "language": "fr-FR",
        "items": [
            {
                "product_id": "p1",
                "title": "Battery",
                "image": "https://example.com/p.jpg",
                "price": 2.5,
                "quantity": 5,
                "line_total": 12.5,
            }
        ],
    }
    data = _order_notify_data(order)
    assert data["language"] == "fr"
    assert data["subtotal"] == 12.5
    assert data["items"][0]["line_total"] == 12.5
