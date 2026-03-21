"""
Payment Timeline Service
Build and manage payment timeline events for invoice payment tracking.
"""
from datetime import datetime, timezone

def build_payment_timeline_event(
    *,
    invoice_id: str,
    invoice_number: str,
    customer_user_id: str = None,
    event_key: str,
    event_label: str,
    status: str,
    note: str = "",
    triggered_by_user_id: str = None,
    triggered_by_role: str = None,
):
    """Build a payment timeline event document."""
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
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }


PAYMENT_TIMELINE_SEQUENCE = [
    {"key": "issued", "label": "Invoice Issued"},
    {"key": "proof_submitted", "label": "Payment Submitted"},
    {"key": "verification", "label": "Verification In Progress"},
    {"key": "confirmed", "label": "Payment Confirmed"},
    {"key": "fulfilled", "label": "Processing / Fulfilled"},
]


async def create_timeline_event(db, event_data: dict):
    """Insert a timeline event into the database."""
    result = await db.payment_timeline.insert_one(event_data)
    return str(result.inserted_id)


async def get_invoice_timeline(db, invoice_id: str):
    """Get all timeline events for an invoice, sorted by creation time."""
    docs = await db.payment_timeline.find(
        {"invoice_id": invoice_id}
    ).sort("created_at", 1).to_list(length=100)
    
    for doc in docs:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    
    return docs


# --- Helper functions for common triggers ---

async def trigger_invoice_issued(db, invoice_id: str, invoice_number: str, customer_user_id: str = None, triggered_by_user_id: str = None):
    """Create timeline event when invoice is issued."""
    event = build_payment_timeline_event(
        invoice_id=invoice_id,
        invoice_number=invoice_number,
        customer_user_id=customer_user_id,
        event_key="issued",
        event_label="Invoice Issued",
        status="active",
        note="Invoice has been issued and is ready for payment",
        triggered_by_user_id=triggered_by_user_id,
        triggered_by_role="admin",
    )
    return await create_timeline_event(db, event)


async def trigger_payment_submitted(db, invoice_id: str, invoice_number: str, customer_user_id: str = None, triggered_by_user_id: str = None, note: str = ""):
    """Create timeline event when payment proof is submitted."""
    event = build_payment_timeline_event(
        invoice_id=invoice_id,
        invoice_number=invoice_number,
        customer_user_id=customer_user_id,
        event_key="proof_submitted",
        event_label="Payment Submitted",
        status="active",
        note=note or "Payment proof has been submitted for verification",
        triggered_by_user_id=triggered_by_user_id,
        triggered_by_role="customer",
    )
    return await create_timeline_event(db, event)


async def trigger_verification_started(db, invoice_id: str, invoice_number: str, customer_user_id: str = None, triggered_by_user_id: str = None):
    """Create timeline event when verification begins."""
    event = build_payment_timeline_event(
        invoice_id=invoice_id,
        invoice_number=invoice_number,
        customer_user_id=customer_user_id,
        event_key="verification",
        event_label="Verification In Progress",
        status="active",
        note="Finance team is reviewing the payment proof",
        triggered_by_user_id=triggered_by_user_id,
        triggered_by_role="admin",
    )
    return await create_timeline_event(db, event)


async def trigger_payment_confirmed(db, invoice_id: str, invoice_number: str, customer_user_id: str = None, triggered_by_user_id: str = None):
    """Create timeline event when payment is confirmed."""
    event = build_payment_timeline_event(
        invoice_id=invoice_id,
        invoice_number=invoice_number,
        customer_user_id=customer_user_id,
        event_key="confirmed",
        event_label="Payment Confirmed",
        status="active",
        note="Payment has been verified and confirmed",
        triggered_by_user_id=triggered_by_user_id,
        triggered_by_role="admin",
    )
    return await create_timeline_event(db, event)


async def trigger_order_fulfilled(db, invoice_id: str, invoice_number: str, customer_user_id: str = None, triggered_by_user_id: str = None, note: str = ""):
    """Create timeline event when order is being processed/fulfilled."""
    event = build_payment_timeline_event(
        invoice_id=invoice_id,
        invoice_number=invoice_number,
        customer_user_id=customer_user_id,
        event_key="fulfilled",
        event_label="Processing / Fulfilled",
        status="active",
        note=note or "Order is being processed or has been fulfilled",
        triggered_by_user_id=triggered_by_user_id,
        triggered_by_role="admin",
    )
    return await create_timeline_event(db, event)
