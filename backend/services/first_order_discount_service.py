"""
First Order Discount Service
Determines whether a user is really new and whether the discount can apply safely.
"""
from datetime import datetime, timedelta


async def is_first_order_discount_eligible(
    db,
    *,
    email: str,
):
    """
    Check if email is eligible for first-order discount.
    "New user" means:
    - No completed order exists for that email
    - No first-order reward has already been issued/redeemed
    """
    email = (email or "").strip().lower()
    if not email:
        return {
            "eligible": False,
            "reason": "missing_email",
        }

    # Check for existing customer
    existing_customer = await db.customers.find_one({"email": email})
    
    # Check for existing orders
    existing_order = await db.orders.find_one({
        "customer_email": email,
        "status": {"$in": ["pending", "paid", "completed", "processing", "delivered"]},
    })
    
    # Check for already-redeemed discount
    redeemed_discount = await db.first_order_discount_redemptions.find_one({
        "email": email,
        "status": {"$in": ["issued", "redeemed"]},
    })

    if existing_order:
        return {"eligible": False, "reason": "existing_order"}

    if redeemed_discount:
        return {"eligible": False, "reason": "already_issued_or_redeemed"}

    return {
        "eligible": True,
        "reason": "first_order_candidate",
        "existing_customer": bool(existing_customer),
    }


async def create_first_order_discount_offer(
    db,
    *,
    email: str,
    discount_percent: float = 5,
    minimum_order_amount: float = 50000,
    currency: str = "TZS",
    valid_days: int = 14,
    eligible_product_groups: list = None,
    eligible_service_groups: list = None,
):
    """
    Create a controlled first-order discount offer.
    Default: 5% (not 10%) with minimum order threshold.
    """
    now = datetime.utcnow()
    email_clean = (email or "").strip().lower()
    code_seed = email_clean.split('@')[0][:6].upper().replace('.', '').replace('-', '')
    code = f"WELCOME-{code_seed}"

    doc = {
        "email": email_clean,
        "code": code,
        "discount_percent": float(discount_percent or 5),
        "minimum_order_amount": float(minimum_order_amount or 50000),
        "currency": currency,
        "eligible_product_groups": eligible_product_groups or ["promotional_products", "office_supplies"],
        "eligible_service_groups": eligible_service_groups or ["printing_branding", "creative_services"],
        "status": "issued",
        "issued_at": now,
        "expires_at": now + timedelta(days=valid_days),
        "created_at": now,
        "updated_at": now,
    }

    await db.first_order_discount_redemptions.insert_one(doc)
    return doc


async def validate_first_order_discount_for_checkout(
    db,
    *,
    code: str,
    email: str,
    subtotal_amount: float,
    product_groups: list = None,
    service_groups: list = None,
):
    """
    Validate if first-order discount can be applied at checkout.
    """
    offer = await db.first_order_discount_redemptions.find_one({
        "code": code,
        "email": (email or "").strip().lower(),
        "status": "issued",
    })

    if not offer:
        return {"valid": False, "reason": "offer_not_found"}

    # Check expiry
    if offer.get("expires_at") and datetime.utcnow() > offer["expires_at"]:
        return {"valid": False, "reason": "offer_expired"}

    # Check minimum order
    if subtotal_amount < float(offer.get("minimum_order_amount", 0) or 0):
        return {"valid": False, "reason": "minimum_order_not_met", 
                "minimum_required": offer.get("minimum_order_amount")}

    # Check product group eligibility
    eligible_product_groups = offer.get("eligible_product_groups", [])
    if eligible_product_groups and product_groups:
        if not any(x in eligible_product_groups for x in product_groups):
            return {"valid": False, "reason": "product_group_not_eligible"}

    # Check service group eligibility
    eligible_service_groups = offer.get("eligible_service_groups", [])
    if eligible_service_groups and service_groups:
        if not any(x in eligible_service_groups for x in service_groups):
            return {"valid": False, "reason": "service_group_not_eligible"}

    return {
        "valid": True,
        "discount_percent": float(offer.get("discount_percent", 0) or 0),
        "code": offer.get("code"),
        "expires_at": offer.get("expires_at"),
    }
