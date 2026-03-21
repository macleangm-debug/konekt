from datetime import datetime

def build_payment_timeline_event(
    *,
    invoice_id: str,
    invoice_number: str,
    customer_user_id: str | None,
    event_key: str,
    event_label: str,
    status: str,
    note: str = "",
    triggered_by_user_id: str | None = None,
    triggered_by_role: str | None = None,
):
    return {
        "invoice_id": invoice_id,
        "invoice_number": invoice_number,
        "customer_user_id": customer_user_id,
        "event_key": event_key,
        "event_label": event_label,
        "status": status,
        "note": note,
        "triggered_by_user_id": triggered_by_user_id,
        "triggered_by_role": triggered_by_role,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

PAYMENT_TIMELINE_SEQUENCE = [
    {"key": "issued", "label": "Invoice Issued"},
    {"key": "proof_submitted", "label": "Payment Submitted"},
    {"key": "verification", "label": "Verification In Progress"},
    {"key": "confirmed", "label": "Payment Confirmed"},
    {"key": "fulfilled", "label": "Processing / Fulfilled"},
]
