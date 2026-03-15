"""
Affiliate Commission Service
Create commissions ONLY on closed paid business (not on clicks/leads/signups)
"""
from datetime import datetime


async def create_affiliate_commission_on_closed_business(
    db,
    *,
    source_document: str,
    source_document_id: str,
    customer_email: str,
    sale_amount: float,
    affiliate_code: str | None = None,
    affiliate_email: str | None = None,
):
    """
    Create an affiliate commission record when business is closed and paid.
    This should be called ONLY after:
    - Invoice is paid
    - Order is paid and fulfilled
    - NOT on signup, lead, or click
    """
    settings = await db.affiliate_settings.find_one({})
    if not settings or not settings.get("enabled", True):
        return None

    trigger = settings.get("commission_trigger", "business_closed_paid")
    if trigger != "business_closed_paid":
        return None

    # Find the affiliate
    affiliate = None
    if affiliate_email:
        affiliate = await db.affiliates.find_one({"email": affiliate_email, "status": "active"})
    elif affiliate_code:
        affiliate = await db.affiliates.find_one({"promo_code": affiliate_code, "status": "active"})

    if not affiliate:
        return None

    # Check for existing commission to prevent duplicates
    existing = await db.affiliate_commissions.find_one(
        {
            "affiliate_email": affiliate.get("email"),
            "source_document": source_document,
            "source_document_id": source_document_id,
        }
    )
    if existing:
        return existing

    # Calculate commission
    commission_type = settings.get("commission_type", "percentage")
    default_rate = float(settings.get("default_commission_rate", 10) or 0)
    default_fixed = float(settings.get("default_fixed_commission", 0) or 0)
    partner_rate = affiliate.get("commission_rate")

    if commission_type == "fixed":
        commission_amount = float(partner_rate or default_fixed or 0)
        effective_rate = None
    else:
        effective_rate = float(partner_rate if partner_rate is not None else default_rate)
        commission_amount = round(float(sale_amount or 0) * (effective_rate / 100), 2)

    if commission_amount <= 0:
        return None

    doc = {
        "affiliate_email": affiliate.get("email"),
        "affiliate_name": affiliate.get("name"),
        "promo_code": affiliate.get("promo_code"),
        "customer_email": customer_email,
        "source_document": source_document,
        "source_document_id": source_document_id,
        "sale_amount": float(sale_amount or 0),
        "commission_type": commission_type,
        "commission_rate": effective_rate,
        "commission_amount": commission_amount,
        "status": "pending",
        "triggered_by": "business_closed_paid",
        "created_at": datetime.utcnow(),
    }

    result = await db.affiliate_commissions.insert_one(doc)
    return await db.affiliate_commissions.find_one({"_id": result.inserted_id})


async def approve_affiliate_commission(db, commission_id: str):
    """Approve a pending commission"""
    from bson import ObjectId
    await db.affiliate_commissions.update_one(
        {"_id": ObjectId(commission_id)},
        {"$set": {"status": "approved", "approved_at": datetime.utcnow()}},
    )
    return await db.affiliate_commissions.find_one({"_id": ObjectId(commission_id)})
