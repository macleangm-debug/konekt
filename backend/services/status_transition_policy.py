"""
Pack 3 — Status Transition Policy
Role-based status transition rules. Single source of truth.
Used by: vendor_orders_routes.py, sales_delivery_override_routes.py, order_ops_routes.py
"""

from services.product_delivery_status_workflow import VENDOR_INTERNAL_STATUSES, SALES_LOGISTICS_STATUSES

# All valid statuses in the system
ALL_STATUSES = set(VENDOR_INTERNAL_STATUSES + SALES_LOGISTICS_STATUSES + [
    "pending", "new", "accepted", "processing", "quality_check",
    "ready", "fulfilled", "cancelled", "issue_reported",
])

# Role → allowed target statuses
ROLE_ALLOWED_STATUSES = {
    "vendor": set(VENDOR_INTERNAL_STATUSES) | {"accepted", "quality_check", "ready", "issue_reported", "processing", "ready_for_pickup"},
    "sales": set(SALES_LOGISTICS_STATUSES),
    "admin": ALL_STATUSES | {"cancelled"},
    "staff": ALL_STATUSES,
}


def can_transition(role: str, current_status: str, new_status: str) -> tuple[bool, str]:
    """
    Check if a role can transition from current_status to new_status.
    Returns (allowed, reason).
    """
    allowed = ROLE_ALLOWED_STATUSES.get(role, set())
    if new_status not in allowed:
        return False, f"Role '{role}' cannot set status '{new_status}'. Allowed: {sorted(allowed)}"

    # Vendor cannot set logistics statuses
    if role == "vendor" and new_status in SALES_LOGISTICS_STATUSES:
        return False, f"Vendor cannot set logistics status '{new_status}'. Sales controls logistics."

    # Sales can only set statuses from ready_for_pickup onwards
    if role == "sales" and new_status in set(VENDOR_INTERNAL_STATUSES) - {"ready_for_pickup"}:
        return False, f"Sales cannot set vendor-internal status '{new_status}'."

    # Prevent backwards transitions for delivery flow
    delivery_flow = VENDOR_INTERNAL_STATUSES + SALES_LOGISTICS_STATUSES
    if current_status in delivery_flow and new_status in delivery_flow:
        current_idx = delivery_flow.index(current_status) if current_status in delivery_flow else -1
        new_idx = delivery_flow.index(new_status) if new_status in delivery_flow else -1
        if new_idx < current_idx and role != "admin":
            return False, f"Cannot move backwards from '{current_status}' to '{new_status}' (admin override required)."

    return True, ""


def normalize_status(status: str) -> str:
    """Normalize legacy status values."""
    mapping = {
        "ready": "ready_for_pickup",
        "shipped": "in_transit",
        "fulfilled": "completed",
    }
    return mapping.get(status, status)
