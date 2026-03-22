from datetime import datetime

PRODUCT_STATUS_MAP = {
    "order_received": {"external": "Order Received", "next": "Payment Pending"},
    "payment_pending": {"external": "Payment Pending", "next": "Payment Verification"},
    "payment_verification": {"external": "Payment Under Verification", "next": "Order Confirmed"},
    "confirmed": {"external": "Order Confirmed", "next": "Preparing Your Order"},
    "sourcing": {"external": "Preparing Your Order", "next": "Packed"},
    "packed": {"external": "Packed", "next": "Dispatched"},
    "dispatched": {"external": "Dispatched", "next": "Delivered"},
    "delivered": {"external": "Delivered", "next": "Completed"},
    "completed": {"external": "Completed", "next": None},
}

SERVICE_STATUS_MAP = {
    "request_received": {"external": "Request Received", "next": "Under Review"},
    "under_review": {"external": "Under Review", "next": "Quote in Preparation"},
    "quote_in_preparation": {"external": "Quote in Preparation", "next": "Quote Sent"},
    "quote_sent": {"external": "Quote Sent", "next": "Approved"},
    "approved": {"external": "Approved", "next": "Payment Pending"},
    "payment_pending": {"external": "Payment Pending", "next": "Payment Confirmed"},
    "payment_confirmed": {"external": "Payment Confirmed", "next": "Scheduled"},
    "scheduled": {"external": "Scheduled", "next": "In Progress"},
    "in_progress": {"external": "In Progress", "next": "Final Review"},
    "final_review": {"external": "Final Review", "next": "Completed"},
    "completed": {"external": "Completed", "next": None},
}

def translate_status(item_type: str, internal_status: str):
    if item_type == "product":
        meta = PRODUCT_STATUS_MAP.get(internal_status, {"external": "In Progress", "next": None})
    else:
        meta = SERVICE_STATUS_MAP.get(internal_status, {"external": "In Progress", "next": None})
    return {
        "item_type": item_type,
        "internal_status": internal_status,
        "external_status": meta["external"],
        "next_step": meta["next"],
        "translated_at": datetime.utcnow().isoformat(),
    }
