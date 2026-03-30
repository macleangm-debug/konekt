def can_vendor_update_status(status: str) -> bool:
    return status in {"assigned", "work_scheduled", "in_progress", "ready_for_pickup"}

def can_sales_update_status(status: str) -> bool:
    return status in {"ready_for_pickup", "picked_up", "in_transit", "delivered", "completed"}

def next_sales_logistics_statuses(current_status: str):
    flow = ["ready_for_pickup", "picked_up", "in_transit", "delivered", "completed"]
    if current_status not in flow:
        return []
    idx = flow.index(current_status)
    return flow[idx + 1:]
