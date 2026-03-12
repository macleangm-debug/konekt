from datetime import datetime, timezone
from points_service import add_points
from referral_reward_service import calculate_referral_points


async def process_referral_reward_for_paid_order(db, order: dict):
    """Process referral reward when an order is paid"""
    customer_email = order.get("customer_email")
    if not customer_email:
        return

    user = await db.users.find_one({"email": customer_email})
    if not user:
        return

    referred_by_code = user.get("referred_by_code")
    if not referred_by_code:
        return

    referrer = await db.users.find_one({"referral_code": referred_by_code})
    if not referrer:
        return

    settings = await db.referral_settings.find_one({}) or {}

    if not settings.get("enabled", True):
        return

    trigger_event = settings.get("trigger_event", "every_paid_order")
    if trigger_event != "every_paid_order":
        # Only handle every_paid_order trigger for now
        return

    # Check if we already rewarded this order
    existing_tx = await db.referral_transactions.find_one(
        {
            "referrer_email": referrer.get("email"),
            "referred_email": customer_email,
            "order_id": str(order["_id"]),
        }
    )
    if existing_tx:
        return

    points = calculate_referral_points(settings, float(order.get("total", 0)))
    if points <= 0:
        return

    # Add points to referrer's wallet
    await add_points(
        db,
        user_id=str(referrer["_id"]) if "_id" in referrer else referrer.get("id"),
        user_email=referrer.get("email"),
        points=points,
        transaction_type="referral_reward",
        reference_type="order",
        reference_id=str(order["_id"]),
        description=f"Referral reward for order {order.get('order_number')}",
    )

    # Record the referral transaction
    await db.referral_transactions.insert_one(
        {
            "referrer_user_id": str(referrer["_id"]) if "_id" in referrer else referrer.get("id"),
            "referrer_email": referrer.get("email"),
            "referred_user_id": str(user["_id"]) if "_id" in user else user.get("id"),
            "referred_email": customer_email,
            "order_id": str(order["_id"]),
            "order_number": order.get("order_number"),
            "order_total": order.get("total", 0),
            "reward_points": points,
            "status": "credited",
            "trigger_event": "paid_order",
            "created_at": datetime.now(timezone.utc),
        }
    )

    print(f"Referral reward: {points} points credited to {referrer.get('email')} for order {order.get('order_number')}")
