from datetime import datetime, timezone


def calculate_affiliate_commission(order_total: float, commission_type: str, commission_value: float) -> float:
    """Calculate affiliate commission based on order total and commission settings"""
    order_total = float(order_total or 0)
    commission_value = float(commission_value or 0)

    if commission_type == "fixed":
        return round(commission_value, 2)

    # percentage commission
    return round(order_total * (commission_value / 100), 2)


async def create_affiliate_commission(
    db,
    *,
    affiliate: dict,
    order: dict,
):
    """Create a commission record for an affiliate from an order"""
    existing = await db.affiliate_commissions.find_one(
        {
            "affiliate_id": str(affiliate["_id"]),
            "order_id": str(order["_id"]),
        }
    )
    if existing:
        return existing

    commission_amount = calculate_affiliate_commission(
        float(order.get("total", 0)),
        affiliate.get("commission_type", "percentage"),
        float(affiliate.get("commission_value", 10)),
    )

    now = datetime.now(timezone.utc)

    doc = {
        "affiliate_id": str(affiliate["_id"]),
        "affiliate_code": affiliate.get("affiliate_code"),
        "affiliate_email": affiliate.get("email"),
        "order_id": str(order["_id"]),
        "order_number": order.get("order_number"),
        "customer_email": order.get("customer_email"),
        "order_total": float(order.get("total", 0)),
        "commission_type": affiliate.get("commission_type", "percentage"),
        "commission_value": float(affiliate.get("commission_value", 10)),
        "commission_amount": commission_amount,
        "status": "pending",
        "created_at": now,
        "updated_at": now,
    }

    result = await db.affiliate_commissions.insert_one(doc)
    return await db.affiliate_commissions.find_one({"_id": result.inserted_id})
