TOPBAR_NOTIFICATION_EVENTS = {
    "vendor": [
        "vendor_order_assigned",
        "payment_released",
        "status_action_required",
        "order_updated",
        "pickup_coordination",
        "service_milestone_released",
    ]
}

def should_vendor_see_order(order: dict, release_context: dict) -> bool:
    if release_context.get("manual_release"):
        return True
    if release_context.get("credit_approved"):
        return True
    if release_context.get("required_advance_met"):
        return True
    return release_context.get("fully_paid", False)
