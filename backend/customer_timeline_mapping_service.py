"""
Customer Timeline Mapping Service
Maps internal vendor/system statuses to clean customer-facing labels.
Customer must NEVER see vendor-internal wording.
"""


# Flow-specific step definitions
PRODUCT_STEPS = ["Ordered", "Confirmed", "In Progress", "Quality Check", "Ready", "Completed"]
SERVICE_STEPS = ["Requested", "Scheduled", "In Progress", "Review", "Completed"]
PROMO_STEPS = ["Submitted", "Processing", "Active", "Completed"]


def _get_steps(source_type: str) -> list:
    t = (source_type or "product").lower()
    if t in ("service", "creative_service"):
        return SERVICE_STEPS
    elif t in ("promo", "promotion", "campaign"):
        return PROMO_STEPS
    return PRODUCT_STEPS


# Internal status → customer-facing step index
_PRODUCT_MAP = {
    "pending": 0, "new": 0, "processing": 0, "created": 0,
    "payment_approved": 1, "paid": 1, "confirmed": 1, "assigned": 1,
    "ready_to_fulfill": 1, "accepted": 1,
    "work_scheduled": 2, "in_progress": 2,
    "quality_check": 3,
    "ready": 4, "shipped": 4,
    "completed": 5, "delivered": 5, "fulfilled": 5,
}

_SERVICE_MAP = {
    "pending": 0, "new": 0, "created": 0, "submitted": 0,
    "confirmed": 1, "scheduled": 1, "work_scheduled": 1, "assigned": 1,
    "accepted": 1, "payment_approved": 1, "paid": 1,
    "ready_to_fulfill": 1,
    "in_progress": 2, "processing": 2,
    "review": 3, "quality_check": 3, "ready": 3,
    "completed": 4, "delivered": 4, "fulfilled": 4,
}

_PROMO_MAP = {
    "pending": 0, "new": 0, "created": 0, "submitted": 0,
    "processing": 1, "in_progress": 1, "assigned": 1, "payment_approved": 1,
    "paid": 1, "accepted": 1, "ready_to_fulfill": 1, "work_scheduled": 1,
    "active": 2, "ready": 2, "quality_check": 2,
    "completed": 3, "delivered": 3, "fulfilled": 3,
}


def _get_map(source_type: str) -> dict:
    t = (source_type or "product").lower()
    if t in ("service", "creative_service"):
        return _SERVICE_MAP
    elif t in ("promo", "promotion", "campaign"):
        return _PROMO_MAP
    return _PRODUCT_MAP


def get_customer_timeline(source_type: str, internal_status: str) -> dict:
    """
    Returns customer-safe timeline info:
    {
        "steps": ["Ordered", "Confirmed", ...],
        "current_index": 2,
        "current_label": "In Progress",
        "description": "..."
    }
    """
    steps = _get_steps(source_type)
    status_map = _get_map(source_type)
    idx = status_map.get(internal_status, 0)
    idx = max(0, min(idx, len(steps) - 1))

    label = steps[idx]

    descriptions = {
        "Ordered": "Your order has been placed and is being reviewed.",
        "Confirmed": "Your order is confirmed and being prepared.",
        "In Progress": "Your order is actively being worked on.",
        "Quality Check": "Final quality checks are underway.",
        "Ready": "Your order is ready for delivery.",
        "Completed": "Your order has been completed. Thank you!",
        "Requested": "Your service request has been received.",
        "Scheduled": "Your service has been scheduled.",
        "Review": "Your service is under final review.",
        "Submitted": "Your submission has been received.",
        "Processing": "Your submission is being processed.",
        "Active": "Your promotion is now active.",
    }

    return {
        "steps": steps,
        "current_index": idx,
        "current_label": label,
        "description": descriptions.get(label, "Processing your order."),
    }


def map_customer_status_label(source_type: str, internal_status: str) -> str:
    """Returns just the customer-facing label for a given internal status."""
    info = get_customer_timeline(source_type, internal_status)
    return info["current_label"]
