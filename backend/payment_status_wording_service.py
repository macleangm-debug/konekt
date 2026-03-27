"""
Payment Status Wording Service
Provides customer-facing, admin-facing status labels
"""


def get_customer_payment_status_label(payment_status: str, has_proof: bool = False) -> str:
    """
    Returns a clean customer-facing label.
    If proof has been submitted, never show 'Awaiting Payment'.
    """
    mapping = {
        "pending_payment": "Awaiting Payment",
        "awaiting_payment_proof": "Awaiting Payment",
        "pending": "Awaiting Payment",
        "under_review": "Payment Under Review",
        "awaiting_review": "Payment Under Review",
        "payment_under_review": "Payment Under Review",
        "pending_payment_confirmation": "Payment Under Review",
        "paid": "Paid in Full",
        "approved": "Paid in Full",
        "partially_paid": "Partially Paid",
        "proof_rejected": "Payment Rejected",
        "rejected": "Payment Rejected",
        "payment_rejected": "Payment Rejected",
    }
    label = mapping.get(payment_status, payment_status or "-")

    # Override: if proof was submitted, never say "Awaiting Payment"
    if has_proof and label == "Awaiting Payment":
        label = "Payment Under Review"

    return label


def get_admin_order_status_label(status: str) -> str:
    """
    Admin-facing order fulfillment statuses.
    'awaiting_release' is removed for go-live flow.
    """
    mapping = {
        "new": "New",
        "assigned": "Assigned",
        "work_scheduled": "Work Scheduled",
        "in_progress": "In Progress",
        "quality_check": "Quality Check",
        "ready": "Ready",
        "completed": "Completed",
        "cancelled": "Cancelled",
        "processing": "In Progress",
        "shipped": "Shipped",
        "delivered": "Completed",
        "fulfilled": "Completed",
        "ready_to_fulfill": "Assigned",
        "awaiting_release": "New",
    }
    return mapping.get(status, (status or "New").replace("_", " ").title())
