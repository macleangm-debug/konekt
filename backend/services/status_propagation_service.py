"""
Konekt — Status Propagation & Audit Trail Service
Maps internal vendor fulfillment statuses to role-appropriate views.
Provides sales override capability with mandatory notes and audit trail.
"""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STATUS MAPPING
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INTERNAL_STATUSES = [
    "assigned",
    "acknowledged",
    "in_production",
    "ready",
    "dispatched",
    "delivered",
    "delayed",
    "cancelled",
]

# Customer sees simplified, safe statuses
CUSTOMER_STATUS_MAP = {
    "assigned": "processing",
    "acknowledged": "processing",
    "in_production": "in fulfillment",
    "ready": "in fulfillment",
    "dispatched": "dispatched",
    "delivered": "delivered",
    "delayed": "delayed",
    "cancelled": "cancelled",
}

# Sales sees full internal + can act
SALES_STATUS_MAP = {
    "assigned": "assigned",
    "acknowledged": "acknowledged",
    "in_production": "in production",
    "ready": "ready for dispatch",
    "dispatched": "dispatched",
    "delivered": "delivered",
    "delayed": "delayed",
    "cancelled": "cancelled",
}

# Admin sees everything with raw internal values
ADMIN_STATUS_MAP = {k: k for k in INTERNAL_STATUSES}

# Vendor sees assigned fulfillment statuses
VENDOR_STATUS_MAP = {
    "assigned": "assigned",
    "acknowledged": "acknowledged",
    "in_production": "in production",
    "ready": "ready",
    "dispatched": "dispatched",
    "delivered": "delivered",
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
    """Record a status change with full audit trail."""
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
    return result.modified_count > 0, entry
