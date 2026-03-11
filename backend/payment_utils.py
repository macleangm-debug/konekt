"""
Payment utility functions
"""
from datetime import datetime
from typing import Optional


def normalize_currency(currency: Optional[str]) -> str:
    return (currency or "TZS").upper()


def make_payment_reference(prefix: str, document_number: str) -> str:
    clean_doc = document_number.replace(" ", "").replace("/", "-")
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    return f"{prefix}-{clean_doc}-{timestamp}"[:60]


def serialize_doc(doc):
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


def payment_allowed_for_order(order: dict) -> bool:
    return order.get("status") not in {"cancelled", "delivered"} and order.get("payment_status") != "paid"


def payment_allowed_for_invoice(invoice: dict) -> bool:
    return invoice.get("status") not in {"paid", "cancelled"}
