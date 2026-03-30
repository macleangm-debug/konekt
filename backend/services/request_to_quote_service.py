def create_quote_from_request(request_doc: dict, vendor_cost: float, margin_percent: float) -> dict:
    margin_amount = round(vendor_cost * (margin_percent / 100.0), 2)
    final_price = round(vendor_cost + margin_amount, 2)
    return {
        "request_id": request_doc.get("id"),
        "customer_user_id": request_doc.get("customer_user_id"),
        "request_type": request_doc.get("request_type"),
        "status": "awaiting_approval",
        "vendor_cost": vendor_cost,
        "margin_percent": margin_percent,
        "margin_amount": margin_amount,
        "selling_price": final_price,
        "details": request_doc.get("details", {})
    }
