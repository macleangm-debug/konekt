def build_promotional_request(blank_item: dict, customization: dict, quantity: int, source_channel: str, customer_ref: dict) -> dict:
    return {
        "request_type": "promo_custom",
        "source_channel": source_channel,
        "customer_user_id": customer_ref.get("customer_user_id"),
        "guest_email": customer_ref.get("guest_email"),
        "guest_name": customer_ref.get("guest_name"),
        "title": f"Promotional Request - {blank_item.get('name')}",
        "status": "submitted",
        "details": {
            "blank_item_id": blank_item.get("id"),
            "blank_item_name": blank_item.get("name"),
            "quantity": quantity,
            "customization": customization,
        }
    }

def build_promotional_sample_request(blank_item: dict, customization: dict, source_channel: str, customer_ref: dict) -> dict:
    return {
        "request_type": "promo_sample",
        "source_channel": source_channel,
        "customer_user_id": customer_ref.get("customer_user_id"),
        "guest_email": customer_ref.get("guest_email"),
        "guest_name": customer_ref.get("guest_name"),
        "title": f"Sample Request - {blank_item.get('name')}",
        "status": "submitted",
        "details": {
            "blank_item_id": blank_item.get("id"),
            "blank_item_name": blank_item.get("name"),
            "quantity": 1,
            "customization": customization,
            "is_sample": True
        }
    }
