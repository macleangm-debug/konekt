"""
First Order Discount Routes
API endpoints for capturing and validating first-order discounts.
"""
import os
from datetime import datetime
from fastapi import APIRouter, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/first-order-discount", tags=["First Order Discount"])

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


async def is_first_order_eligible(email: str):
    """Check if email is eligible for first-order discount"""
    email = (email or "").strip().lower()
    if not email:
        return False, "missing_email"

    existing_order = await db.orders.find_one({
        "customer_email": email,
        "status": {"$in": ["pending", "paid", "completed", "processing", "delivered"]},
    })
    if existing_order:
        return False, "existing_order"

    redeemed = await db.first_order_discount_redemptions.find_one({
        "email": email,
        "status": {"$in": ["issued", "redeemed"]},
    })
    if redeemed:
        return False, "already_issued"

    return True, "eligible"


@router.post("/capture")
async def capture_first_order_discount(payload: dict):
    """
    Capture email for first-order discount.
    Issues 5% discount (not 10%) with minimum order threshold.
    """
    email = (payload.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    eligible, reason = await is_first_order_eligible(email)

    if not eligible:
        # Still save the capture for analytics
        await db.discount_lead_captures.update_one(
            {"email": email},
            {"$set": {
                "email": email,
                "source": "first_order_popup",
                "eligible": False,
                "reason": reason,
                "updated_at": datetime.utcnow(),
            }, "$setOnInsert": {"created_at": datetime.utcnow()}},
            upsert=True
        )
        return {
            "ok": True,
            "eligible": False,
            "reason": reason,
            "message": "Thank you for your interest. Check our promotions for other offers.",
        }

    # Create first-order offer with SAFE defaults (5%, not 10%)
    from datetime import timedelta
    now = datetime.utcnow()
    code_seed = email.split('@')[0][:6].upper().replace('.', '').replace('-', '')
    code = f"WELCOME-{code_seed}"

    offer_doc = {
        "email": email,
        "code": code,
        "discount_percent": float(payload.get("discount_percent", 5) or 5),
        "minimum_order_amount": float(payload.get("minimum_order_amount", 50000) or 50000),
        "currency": payload.get("currency", "TZS"),
        "eligible_product_groups": payload.get("eligible_product_groups", ["promotional_products", "office_supplies"]),
        "eligible_service_groups": payload.get("eligible_service_groups", ["printing_branding", "creative_services"]),
        "status": "issued",
        "issued_at": now,
        "expires_at": now + timedelta(days=14),
        "created_at": now,
        "updated_at": now,
    }

    await db.first_order_discount_redemptions.insert_one(offer_doc)

    return {
        "ok": True,
        "eligible": True,
        "message": "First-order discount offer issued.",
        "offer": {
            "code": code,
            "discount_percent": offer_doc["discount_percent"],
            "minimum_order_amount": offer_doc["minimum_order_amount"],
            "currency": offer_doc["currency"],
            "expires_at": offer_doc["expires_at"].isoformat(),
        },
    }


@router.post("/validate")
async def validate_first_order_discount(payload: dict):
    """Validate if first-order discount code can be applied"""
    code = (payload.get("code") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    subtotal = float(payload.get("subtotal_amount", 0) or 0)

    offer = await db.first_order_discount_redemptions.find_one({
        "code": code,
        "email": email,
        "status": "issued",
    })

    if not offer:
        return {"valid": False, "reason": "offer_not_found"}

    if offer.get("expires_at") and datetime.utcnow() > offer["expires_at"]:
        return {"valid": False, "reason": "offer_expired"}

    if subtotal < float(offer.get("minimum_order_amount", 0) or 0):
        return {
            "valid": False, 
            "reason": "minimum_order_not_met",
            "minimum_required": offer.get("minimum_order_amount"),
        }

    return {
        "valid": True,
        "discount_percent": float(offer.get("discount_percent", 0)),
        "discount_amount": round(subtotal * (offer.get("discount_percent", 0) / 100), 2),
    }


@router.post("/redeem")
async def redeem_first_order_discount(payload: dict):
    """Mark discount as redeemed after successful order"""
    code = (payload.get("code") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    order_id = payload.get("order_id")

    result = await db.first_order_discount_redemptions.update_one(
        {"code": code, "email": email, "status": "issued"},
        {"$set": {
            "status": "redeemed",
            "redeemed_at": datetime.utcnow(),
            "order_id": order_id,
            "updated_at": datetime.utcnow(),
        }}
    )

    if result.modified_count == 0:
        return {"ok": False, "reason": "offer_not_found_or_already_redeemed"}

    return {"ok": True, "message": "Discount redeemed successfully"}
