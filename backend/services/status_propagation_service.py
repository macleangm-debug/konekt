"""
Konekt — Status Propagation & Audit Trail Service
Maps internal vendor fulfillment statuses to role-appropriate views.
Provides sales override capability with mandatory notes and audit trail.
"""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STATUS MAPPING
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INTERNAL_STATUSES = [
    "created",
    "pending",
    "confirmed",
    "paid",
    "processing",
    "assigned",
    "acknowledged",
    "accepted",
    "in_production",
    "in_progress",
    "quality_check",
    "ready",
    "ready_for_dispatch",
    "ready_for_pickup",
    "picked_up",
    "dispatched",
    "in_transit",
    "delivered",
    "completed",
    "delayed",
    "cancelled",
]

# Customer sees simplified, safe statuses
CUSTOMER_STATUS_MAP = {
    # Order-level statuses
    "created": "processing",
    "pending": "processing",
    "confirmed": "confirmed",
    "paid": "confirmed",
    "processing": "processing",
    "payment_under_review": "processing",
    "pending_payment_confirmation": "processing",
    "awaiting_payment": "processing",
    "in_review": "processing",
    "approved": "confirmed",
    # Vendor fulfillment statuses
    "assigned": "processing",
    "acknowledged": "processing",
    "accepted": "processing",
    "ready_to_fulfill": "in fulfillment",
    "in_production": "in fulfillment",
    "in_progress": "in fulfillment",
    "work_scheduled": "in fulfillment",
    "quality_check": "in fulfillment",
    "ready": "ready for pickup",
    "ready_for_dispatch": "ready for pickup",
    "ready_for_pickup": "ready for pickup",
    "picked_up": "dispatched",
    "dispatched": "dispatched",
    "in_transit": "dispatched",
    "delivered": "delivered",
    "completed": "completed",
    "fulfilled": "completed",
    "delayed": "delayed",
    "cancelled": "cancelled",
}

# Sales sees full internal + can act
SALES_STATUS_MAP = {
    "created": "created",
    "pending": "pending",
    "confirmed": "confirmed",
    "paid": "paid",
    "processing": "processing",
    "payment_under_review": "payment under review",
    "pending_payment_confirmation": "pending payment",
    "awaiting_payment": "awaiting payment",
    "in_review": "in review",
    "approved": "approved",
    "assigned": "assigned",
    "acknowledged": "acknowledged",
    "accepted": "accepted",
    "ready_to_fulfill": "ready to fulfill",
    "in_production": "in production",
    "in_progress": "in progress",
    "work_scheduled": "work scheduled",
    "quality_check": "quality check",
    "ready": "ready for dispatch",
    "ready_for_dispatch": "ready for dispatch",
    "ready_for_pickup": "ready for pickup",
    "picked_up": "picked up",
    "dispatched": "dispatched",
    "in_transit": "in transit",
    "delivered": "delivered",
    "completed": "completed",
    "fulfilled": "fulfilled",
    "delayed": "delayed",
    "cancelled": "cancelled",
}

# Admin sees everything with raw internal values (human-readable display)
ADMIN_STATUS_MAP = {k: k.replace("_", " ") for k in INTERNAL_STATUSES}

# Vendor sees assigned fulfillment statuses
VENDOR_STATUS_MAP = {
    "assigned": "assigned",
    "acknowledged": "acknowledged",
    "accepted": "accepted",
    "ready_to_fulfill": "ready to fulfill",
    "in_production": "in production",
    "in_progress": "in progress",
    "work_scheduled": "work scheduled",
    "quality_check": "quality check",
    "ready": "ready",
    "ready_for_dispatch": "ready for dispatch",
    "ready_for_pickup": "ready for pickup",
    "picked_up": "picked up",
    "dispatched": "dispatched",
    "in_transit": "in transit",
    "delivered": "delivered",
    "completed": "completed",
    "fulfilled": "fulfilled",
    "delayed": "delayed",
    "cancelled": "cancelled",
}


def map_status_for_role(internal_status: str, role: str) -> str:
    """Map an internal status to the appropriate display for a given role."""
    s = (internal_status or "").lower()
    if role == "admin":
        return ADMIN_STATUS_MAP.get(s, s)
    elif role == "sales":
        return SALES_STATUS_MAP.get(s, s)
    elif role == "customer":
        return CUSTOMER_STATUS_MAP.get(s, s)
    elif role == "vendor":
        return VENDOR_STATUS_MAP.get(s, s)
    return s


def get_status_options_for_role(role: str) -> list:
    """Return the list of statuses a role can see/set."""
    if role == "admin":
        return INTERNAL_STATUSES
    elif role == "sales":
        return INTERNAL_STATUSES  # Sales can set any internal status
    elif role == "vendor":
        return ["acknowledged", "in_production", "ready", "delayed"]  # Vendor can only update within their scope
    return []


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# AUDIT TRAIL
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SOURCE_LABELS = [
    "vendor_update",
    "sales_follow_up",
    "admin_adjustment",
    "vendor_confirmed",
    "system_auto",
]


def build_audit_entry(
    previous_status: str,
    new_status: str,
    updated_by: str,
    role: str,
    note: str = "",
    source: str = "system_auto",
) -> dict:
    """Build a standardized audit trail entry for status changes."""
    from datetime import datetime, timezone
    return {
        "previous_status": previous_status,
        "new_status": new_status,
        "updated_by": updated_by,
        "role": role,
        "note": note,
        "source": source,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


async def record_status_change(db, collection: str, doc_id: str, previous_status: str, new_status: str, updated_by: str, role: str, note: str = "", source: str = "system_auto"):
    """Record a status change with full audit trail and fire notifications."""
    entry = build_audit_entry(previous_status, new_status, updated_by, role, note, source)

    # Update the document status and push to audit trail
    from bson import ObjectId
    filter_q = {}
    try:
        filter_q = {"_id": ObjectId(doc_id)}
    except Exception:
        filter_q = {"$or": [{"id": doc_id}, {"vendor_order_no": doc_id}, {"order_number": doc_id}]}

    result = await db[collection].update_one(
        filter_q,
        {
            "$set": {
                "status": new_status,
                "fulfillment_state": new_status,
                "last_status_update": entry["timestamp"],
                "last_updated_by": updated_by,
            },
            "$push": {"status_audit_trail": entry},
        },
    )

    # Fire in-app notifications on meaningful transitions
    try:
        from services.in_app_notification_service import notify_on_status_change
        # Resolve order context for notifications
        doc = await db[collection].find_one(filter_q, {"_id": 0, "order_number": 1, "order_id": 1, "id": 1, "customer_id": 1, "vendor_id": 1, "vendor_order_no": 1, "assigned_sales_id": 1})
        if doc:
            order_id = doc.get("order_id") or doc.get("id") or doc_id
            order_number = doc.get("order_number") or ""
            # For vendor_orders, resolve the parent order's order_number if needed
            if collection == "vendor_orders" and not order_number and doc.get("order_id"):
                parent = await db.orders.find_one({"id": doc["order_id"]}, {"_id": 0, "order_number": 1, "customer_id": 1, "assigned_sales_id": 1})
                if parent:
                    order_number = parent.get("order_number", "")
                    if not doc.get("customer_id"):
                        doc["customer_id"] = parent.get("customer_id")
                    if not doc.get("assigned_sales_id"):
                        doc["assigned_sales_id"] = parent.get("assigned_sales_id")

            await notify_on_status_change(
                db=db,
                new_status=new_status,
                order_number=order_number,
                order_id=order_id,
                customer_id=doc.get("customer_id", ""),
                vendor_id=doc.get("vendor_id", ""),
                vendor_order_no=doc.get("vendor_order_no", ""),
                assigned_sales_id=doc.get("assigned_sales_id", ""),
                source_role=role,
                previous_status=previous_status,
            )
    except Exception as e:
        import logging
        logging.getLogger("status_propagation").warning("Notification fire failed: %s", str(e))

    return result.modified_count > 0, entry
