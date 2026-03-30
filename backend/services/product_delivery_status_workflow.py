VENDOR_INTERNAL_STATUSES = [
    "assigned",
    "work_scheduled",
    "in_progress",
    "ready_for_pickup",
]

SALES_LOGISTICS_STATUSES = [
    "picked_up",
    "in_transit",
    "delivered",
    "completed",
]

CUSTOMER_SAFE_MAP = {
    "assigned": "Confirmed",
    "work_scheduled": "In Progress",
    "in_progress": "In Progress",
    "ready_for_pickup": "Ready",
    "picked_up": "Ready",
    "in_transit": "In Transit",
    "delivered": "Delivered",
    "completed": "Completed",
}

def map_customer_status(internal_status: str) -> str:
    return CUSTOMER_SAFE_MAP.get(internal_status, internal_status)
