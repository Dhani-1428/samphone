"""Lightweight backend i18n with fallback to English."""
from __future__ import annotations

SUPPORTED_LANGS = (
    "en",
    "pt",
    "fr",
    "es",
    "nl",
    "hi",
    "pa",
    "ur",
    "de",
    "it",
    "tr",
    "ar",
    "bn",
    "ru",
    "zh",
    "ja",
    "ko",
)

ALIASES = {
    "en-us": "en",
    "en-gb": "en",
    "pt-pt": "pt",
    "pt-br": "pt",
    "fr-ca": "fr",
    "es-es": "es",
    "es-mx": "es",
    "es-ar": "es",
    "fr-fr": "fr",
    "nl-nl": "nl",
    "hi-in": "hi",
    "pa-in": "pa",
    "ur-pk": "ur",
    "de-de": "de",
    "it-it": "it",
    "tr-tr": "tr",
    "ar-sa": "ar",
    "bn-bd": "bn",
    "ru-ru": "ru",
    "zh-cn": "zh",
    "zh-tw": "zh",
    "ja-jp": "ja",
    "ko-kr": "ko",
}

STRINGS: dict[str, dict[str, str]] = {
    "order.confirmed.title": {
        "en": "Order confirmed",
        "pt": "Encomenda confirmada",
        "fr": "Commande confirmee",
        "es": "Pedido confirmado",
        "nl": "Bestelling bevestigd",
    },
    "order.cancelled.title": {
        "en": "Order cancelled",
        "pt": "Encomenda cancelada",
        "fr": "Commande annulee",
        "es": "Pedido cancelado",
        "nl": "Bestelling geannuleerd",
    },
    "order.new.title": {
        "en": "New order",
        "pt": "Nova encomenda",
        "fr": "Nouvelle commande",
        "es": "Nuevo pedido",
        "nl": "Nieuwe bestelling",
    },
    "order.field.number": {"en": "Order number", "pt": "Numero da encomenda"},
    "order.field.total": {"en": "Total", "pt": "Total"},
    "order.field.subtotal": {"en": "Subtotal", "pt": "Subtotal"},
    "order.field.payment": {"en": "Payment", "pt": "Pagamento"},
    "order.field.items": {"en": "Items", "pt": "Artigos"},
    "order.field.delivery_address": {"en": "Delivery address", "pt": "Morada de entrega"},
    "order.field.customer": {"en": "Customer", "pt": "Cliente"},
    "order.items.qty_each": {"en": "Qty: {qty} · {price} each", "pt": "Qtd: {qty} · {price} cada"},
    "order.action.view_mine": {"en": "View my order", "pt": "Ver a minha encomenda"},
    "order.action.view_all": {"en": "View orders", "pt": "Ver encomendas"},
    "email.order.confirmed.subject": {"en": "Order confirmed — {order_number}", "pt": "Encomenda confirmada — {order_number}"},
    "email.order.cancelled.subject": {"en": "Order cancelled — {order_number}", "pt": "Encomenda cancelada — {order_number}"},
    "email.order.new.subject": {"en": "New order — {order_number} ({total})", "pt": "Nova encomenda — {order_number} ({total})"},
    "push.order.confirmed.body": {
        "en": "Your order {order_number} ({subtotal}) is confirmed.",
        "pt": "A sua encomenda {order_number} ({subtotal}) foi confirmada.",
    },
    "push.order.cancelled.body": {
        "en": "Your order {order_number} has been cancelled.",
        "pt": "A sua encomenda {order_number} foi cancelada.",
    },
    "notify.wholesale.submitted.title": {"en": "Application submitted", "pt": "Candidatura enviada"},
    "notify.wholesale.submitted.body": {
        "en": "Your wholesale application has been submitted and is under review. Business prices will appear after admin approval.",
        "pt": "A sua candidatura de revenda foi enviada e esta em revisao. Os precos de empresa aparecem apos aprovacao do admin.",
    },
    "notify.wholesale.approved.title": {"en": "Wholesale approved", "pt": "Revenda aprovada"},
    "notify.wholesale.approved.body": {
        "en": "Your wholesale account has been approved ({tier} tier).",
        "pt": "A sua conta de revenda foi aprovada (nivel {tier}).",
    },
    "notify.wholesale.rejected.title": {"en": "Wholesale rejected", "pt": "Revenda rejeitada"},
    "notify.wholesale.suspended.title": {"en": "Wholesale suspended", "pt": "Revenda suspensa"},
    "notify.wholesale.suspended.body": {
        "en": "Your wholesale pricing has been suspended. You will see retail prices until re-approved.",
        "pt": "Os seus precos de revenda foram suspensos. Vai ver precos de retalho ate nova aprovacao.",
    },
}


def normalize_language(lang: str | None) -> str:
    raw = (lang or "").strip().lower()
    if not raw:
        return "en"
    short = ALIASES.get(raw, raw.split("-")[0])
    return short if short in SUPPORTED_LANGS else "en"


def is_supported_language(lang: str | None) -> bool:
    return normalize_language(lang) in SUPPORTED_LANGS


def tr(lang: str | None, key: str, **kwargs) -> str:
    code = normalize_language(lang)
    by_lang = STRINGS.get(key, {})
    template = by_lang.get(code) or by_lang.get("en") or key
    if kwargs:
        try:
            return template.format(**kwargs)
        except Exception:
            return template
    return template
