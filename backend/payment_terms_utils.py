"""
Konekt Payment Terms Utilities
Calculate due dates and resolve payment terms from customer profiles
"""
from datetime import datetime, timedelta, timezone


PAYMENT_TERM_LABELS = {
    "due_on_receipt": "Due on Receipt",
    "7_days": "Net 7",
    "14_days": "Net 14",
    "30_days": "Net 30",
    "50_upfront_50_delivery": "50% Upfront / 50% on Delivery",
    "advance_payment": "Advance Payment Required",
    "credit_account": "Credit Account",
    "custom": "Custom Terms",
}


def calculate_due_date(issue_date: datetime, payment_term_type: str, payment_term_days: int = 0):
    """Calculate the due date based on payment term type"""
    if issue_date is None:
        issue_date = datetime.now(timezone.utc)

    if payment_term_type == "7_days":
        return issue_date + timedelta(days=7)

    if payment_term_type == "14_days":
        return issue_date + timedelta(days=14)

    if payment_term_type == "30_days":
        return issue_date + timedelta(days=30)

    if payment_term_type == "custom" and payment_term_days > 0:
        return issue_date + timedelta(days=payment_term_days)

    if payment_term_type in {"due_on_receipt", "advance_payment"}:
        return issue_date

    # For credit_account and 50_upfront_50_delivery, return None (no fixed due date)
    return None


def resolve_payment_terms(customer: dict | None):
    """
    Resolve payment terms from a customer record.
    Returns a dictionary with all payment term fields.
    """
    customer = customer or {}
    payment_term_type = customer.get("payment_term_type", "due_on_receipt")
    payment_term_days = int(customer.get("payment_term_days", 0) or 0)
    payment_term_label = customer.get("payment_term_label") or PAYMENT_TERM_LABELS.get(
        payment_term_type,
        "Due on Receipt",
    )
    payment_term_notes = customer.get("payment_term_notes")

    return {
        "payment_term_type": payment_term_type,
        "payment_term_days": payment_term_days,
        "payment_term_label": payment_term_label,
        "payment_term_notes": payment_term_notes,
    }


def get_payment_term_display(payment_term_type: str, payment_term_days: int = 0) -> str:
    """Get a human-readable display string for a payment term"""
    if payment_term_type == "custom" and payment_term_days > 0:
        return f"Net {payment_term_days}"
    return PAYMENT_TERM_LABELS.get(payment_term_type, "Due on Receipt")
