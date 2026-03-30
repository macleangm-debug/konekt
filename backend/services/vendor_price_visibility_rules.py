def build_vendor_visible_price_payload(vendor_order: dict) -> dict:
    """Strip Konekt margin/public price. Vendor sees only their own base cost."""
    return {
        "vendor_order_no": vendor_order.get("vendor_order_no"),
        "base_price": vendor_order.get("base_price"),
        "status": vendor_order.get("status"),
        "items": vendor_order.get("items", []),
        "sales_name": vendor_order.get("sales_name"),
        "sales_phone": vendor_order.get("sales_phone"),
        "sales_email": vendor_order.get("sales_email"),
    }
