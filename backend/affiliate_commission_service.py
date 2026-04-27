"""
Affiliate Commission Service
Create commissions ONLY on closed paid business (not on clicks/leads/signups)
With fraud guard protection and campaign override support
"""
from datetime import datetime
from affiliate_fraud_guard import affiliate_conversion_allowed


async def create_affiliate_commission_on_closed_business(
    db,
    *,
    source_document: str,
    source_document_id: str,
    customer_email: str,
    sale_amount: float,
    affiliate_code: str | None = None,
    affiliate_email: str | None = None,
    campaign_id: str | None = None,
    campaign_name: str | None = None,
    campaign_commission_override: dict | None = None,
):
    """
    Create an affiliate commission record when business is closed and paid.
    This should be called ONLY after:
    - Invoice is paid
    - Order is paid and fulfilled
    - NOT on signup, lead, or click

    Honours `products.promo_blocks.affiliate=true` — line totals for products
    blocked on the affiliate pool are excluded from `sale_amount` before
    commission is computed (since their distributable affiliate share was
    already given away as a customer discount).

    Includes fraud protection and campaign override support.
    """
    # Read settings — prefer Settings Hub, fallback to legacy affiliate_settings collection
    from services.settings_resolver import get_affiliate_settings as get_hub_affiliate
    from services.promo_blocks_service import compute_eligible_amount, resolve_order_items
    hub_affiliate = await get_hub_affiliate(db)

    settings = await db.affiliate_settings.find_one({})
    if not settings:
        settings = {}
    # Merge: hub takes precedence for defaults
    if not settings.get("enabled", True):
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

    # Fraud guard check
    allowed, reason = await affiliate_conversion_allowed(
        db,
        affiliate_email=affiliate.get("email"),
        customer_email=customer_email,
        source_document=source_document,
        source_document_id=source_document_id,
    )
    if not allowed:
        return None

    # Calculate commission — resolve rate from hub first, then legacy settings
    commission_type = settings.get("commission_type", "percentage")
    default_rate = float(hub_affiliate.get("default_affiliate_commission_percent") or settings.get("default_commission_rate", 10) or 0)
    default_fixed = float(settings.get("default_fixed_commission", 0) or 0)
    partner_rate = affiliate.get("commission_rate")

    # Handle campaign commission overrides
    if campaign_commission_override:
        mode = campaign_commission_override.get("mode")
        if mode == "no_commission":
            return None
        if mode == "override_rate":
            partner_rate = float(campaign_commission_override.get("override_rate", 0) or 0)

    if commission_type == "fixed":
        commission_amount = float(partner_rate or default_fixed or 0)
        effective_rate = None
        eligible_amount = float(sale_amount or 0)
        blocked_pids: list[str] = []
    else:
        # Subtract blocked-line amounts before percentage commission is applied.
        order_id_for_lookup = None
        invoice_id_for_lookup = None
        if (source_document or "").lower() == "order":
            order_id_for_lookup = source_document_id
        elif (source_document or "").lower() == "invoice":
            invoice_id_for_lookup = source_document_id
        items = await resolve_order_items(
            db,
            order_id=order_id_for_lookup,
            invoice_id=invoice_id_for_lookup,
        )
        if items:
            eligible_amount, blocked_pids = await compute_eligible_amount(
                db, items, "affiliate"
            )
            if eligible_amount <= 0 and blocked_pids:
                # Every line was blocked → no commission payable.
                return None
        else:
            eligible_amount = float(sale_amount or 0)
            blocked_pids = []

        effective_rate = float(partner_rate if partner_rate is not None else default_rate)
        commission_amount = round(eligible_amount * (effective_rate / 100), 2)

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
        "eligible_amount": float(eligible_amount),
        "blocked_product_ids": blocked_pids,
        "commission_type": commission_type,
        "commission_rate": effective_rate,
        "commission_amount": commission_amount,
        "status": "pending",
        "triggered_by": "business_closed_paid",
        "campaign_id": campaign_id,
        "campaign_name": campaign_name,
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
