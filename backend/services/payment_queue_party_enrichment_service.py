"""
Pack 5 — Payment Queue Party Enrichment Service (Hardened)
Uses payer_customer_separation_service for consistent resolution.
"""
from services.payer_customer_separation_service import resolve_customer_name, resolve_payer_name


def resolve_payment_queue_customer_name(row: dict, linked_invoice=None, linked_order=None, linked_checkout=None) -> str:
    """Resolve customer name using the centralized separation service."""
    # Try row first, then linked docs
    for doc in [row, linked_order, linked_invoice, linked_checkout]:
        if doc:
            name = resolve_customer_name(doc)
            if name and name != "-":
                return name
    return row.get("customer_email") or "-"


def resolve_payment_queue_payer_name(row: dict, proof=None, submission=None) -> str:
    """Resolve payer name using the centralized separation service."""
    return resolve_payer_name(row, proof=proof, submission=submission)


def apply_payment_queue_party_fields(row: dict, linked_invoice=None, linked_order=None, linked_checkout=None, proof=None, submission=None) -> dict:
    """Apply SEPARATED customer_name and payer_name to a payment queue row."""
    row["customer_name"] = resolve_payment_queue_customer_name(row, linked_invoice, linked_order, linked_checkout)
    row["payer_name"] = resolve_payment_queue_payer_name(row, proof, submission)
    return row
