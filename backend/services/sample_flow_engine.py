SAMPLE_FLOW = [
    "requested",
    "quoted",
    "quote_approved",
    "invoiced",
    "payment_submitted",
    "sent",
    "delivered",
    "approved",
]

def create_sample_quote_from_request(request_doc: dict, vendor_cost: float, margin_percent: float) -> dict:
    margin_amount = round(vendor_cost * (margin_percent / 100.0), 2)
    final_price = round(vendor_cost + margin_amount, 2)
    return {
        "request_id": request_doc.get("id"),
        "type": "promo_sample",
        "status": "awaiting_approval",
        "vendor_cost": vendor_cost,
        "margin_percent": margin_percent,
        "margin_amount": margin_amount,
        "selling_price": final_price,
        "sample_stage": "quoted",
    }

def create_actual_order_quote_from_approved_sample(sample_workflow: dict, actual_vendor_cost: float, margin_percent: float) -> dict:
    margin_amount = round(actual_vendor_cost * (margin_percent / 100.0), 2)
    final_price = round(actual_vendor_cost + margin_amount, 2)
    return {
        "sample_workflow_id": sample_workflow.get("id"),
        "type": "promo_custom",
        "status": "awaiting_approval",
        "vendor_cost": actual_vendor_cost,
        "margin_percent": margin_percent,
        "margin_amount": margin_amount,
        "selling_price": final_price,
        "created_from_sample_approval": True
    }

def can_progress_to_actual_order(sample_workflow: dict) -> bool:
    return (
        sample_workflow.get("sample_status") == "approved"
        or sample_workflow.get("approved_by_sales_override")
        or sample_workflow.get("approved_by_admin_override")
    )
