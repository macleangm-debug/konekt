from affiliate_service import create_affiliate_commission


async def process_affiliate_commission_for_paid_order(db, order: dict):
    """Process affiliate commission when an order is paid"""
    affiliate_code = order.get("affiliate_code")
    if not affiliate_code:
        return

    affiliate = await db.affiliates.find_one(
        {"affiliate_code": affiliate_code, "is_active": True}
    )
    if not affiliate:
        return

    await create_affiliate_commission(db, affiliate=affiliate, order=order)
    print(f"Affiliate commission created for {affiliate.get('email')} from order {order.get('order_number')}")
