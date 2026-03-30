def can_vendor_create_product(vendor_profile: dict) -> bool:
    return vendor_profile.get("products_capability_status") == "approved"

def can_vendor_create_service(vendor_profile: dict) -> bool:
    return vendor_profile.get("services_capability_status") == "approved"

def can_vendor_create_promo(vendor_profile: dict) -> bool:
    return vendor_profile.get("promo_capability_status") == "approved"

def listing_requires_review(vendor_profile: dict) -> bool:
    return vendor_profile.get("listing_moderation_mode") == "review_required"
