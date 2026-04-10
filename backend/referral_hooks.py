"""
Referral Reward Hooks — Tier-aware, purchase-triggered only.

Rewards are funded ONLY from the distribution margin layer.
Only the REFERRER gets rewarded when the referred user's payment is verified.
"""
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
import logging

logger = logging.getLogger("referral_hooks")


def _money(value):
    return Decimal(str(value or 0)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


async def _get_referral_settings(db):
    """Get referral settings from admin settings hub commercial section."""
    hub = await db.admin_settings.find_one({"key": "settings_hub"}, {"_id": 0})
    commercial = {}
    if hub and hub.get("value"):
        commercial = hub["value"].get("commercial", {})
    return {
        "referral_pct": float(commercial.get("referral_pct", 10)),
        "max_wallet_usage_pct": float(commercial.get("max_wallet_usage_pct", 30)),
        "referral_min_order_amount": float(commercial.get("referral_min_order_amount", 0)),
        "referral_max_reward_per_order": float(commercial.get("referral_max_reward_per_order", 0)),
    }


async def calculate_tier_aware_referral_reward(db, order: dict) -> float:
    """
    Calculate referral reward dynamically from the resolved margin tier.
    Uses the canonical margin engine to get the actual distributable margin
    per item, then applies referral_pct to that pool.
    """
    from services.margin_engine import resolve_margin_rule_for_price, get_split_settings

    settings = await _get_referral_settings(db)
    split = await get_split_settings(db)
    referral_pct = Decimal(str(split.get("referral_share_pct", settings["referral_pct"])))

    if referral_pct <= 0:
        return 0.0

    total_referral_reward = Decimal("0")
    items = order.get("items", [])

    for item in items:
        vendor_price = float(
            item.get("vendor_price") or item.get("partner_cost") or item.get("unit_price") or item.get("price") or 0
        )
        quantity = int(item.get("quantity") or item.get("qty") or 1)
        product_id = item.get("product_id") or item.get("sku")
        group_id = item.get("group_id") or item.get("category")

        if vendor_price <= 0:
            continue

        # Resolve the actual margin rule for this item's price point
        rule = await resolve_margin_rule_for_price(db, vendor_price, product_id=product_id, group_id=group_id)
        distributable_margin_pct = Decimal(str(rule.get("distributable_margin_pct", 10)))

        # Calculate the distributable margin amount for this item
        vp = _money(vendor_price)
        dist_value = _money(vp * distributable_margin_pct / Decimal("100"))

        # Referral reward = referral_pct% OF the distributable pool
        item_reward = _money(dist_value * referral_pct / Decimal("100"))
        total_referral_reward += item_reward * quantity

    # Apply max cap if configured
    max_cap = settings.get("referral_max_reward_per_order", 0)
    if max_cap and max_cap > 0:
        total_referral_reward = min(total_referral_reward, Decimal(str(max_cap)))

    return float(total_referral_reward)


async def process_referral_reward_on_payment(db, order: dict):
    """
    Process referral reward when payment is verified/approved.
    Only the REFERRER gets rewarded. Triggered once per order.
    Reward is funded from the distribution margin layer.
    """
    customer_email = order.get("customer_email")
    customer_id = order.get("customer_id")
    order_id = order.get("id") or str(order.get("_id", ""))
    order_number = order.get("order_number", "")
    order_total = float(order.get("total_amount") or order.get("total") or 0)

    if not customer_email and not customer_id:
        return

    # Find the customer user
    user = None
    if customer_id:
        user = await db.users.find_one({"id": customer_id})
    if not user and customer_email:
        user = await db.users.find_one({"email": customer_email})
    if not user:
        return

    # Check if user was referred
    referred_by_code = user.get("referred_by_code") or user.get("referral_code_used")
    referred_by_id = user.get("referred_by")
    if not referred_by_code and not referred_by_id:
        return

    # Find the referrer
    referrer = None
    if referred_by_id:
        referrer = await db.users.find_one({"id": referred_by_id})
    if not referrer and referred_by_code:
        referrer = await db.users.find_one({"referral_code": referred_by_code})
    if not referrer:
        return

    # Anti-abuse: prevent self-referral
    referrer_id = referrer.get("id") or str(referrer.get("_id", ""))
    user_id = user.get("id") or str(user.get("_id", ""))
    if referrer_id == user_id:
        logger.warning(f"Self-referral blocked: {user_id}")
        return

    # Check if we already rewarded this order
    existing_tx = await db.referral_transactions.find_one({
        "referrer_id": referrer_id,
        "order_id": order_id,
        "status": "credited",
    })
    if existing_tx:
        return

    # Get referral settings
    settings = await _get_referral_settings(db)

    # Check minimum order amount
    min_amount = settings.get("referral_min_order_amount", 0)
    if min_amount > 0 and order_total < min_amount:
        logger.info(f"Order {order_number} below min referral amount ({order_total} < {min_amount})")
        return

    # Calculate tier-aware reward from distribution margin
    reward_amount = await calculate_tier_aware_referral_reward(db, order)
    if reward_amount <= 0:
        return

    now = datetime.now(timezone.utc)

    # Credit the referrer's wallet (credit_balance on users collection)
    await db.users.update_one(
        {"id": referrer_id},
        {"$inc": {"credit_balance": reward_amount}}
    )

    # Record the referral transaction
    await db.referral_transactions.insert_one({
        "referrer_id": referrer_id,
        "referrer_email": referrer.get("email", ""),
        "referrer_name": referrer.get("full_name", ""),
        "referred_user_id": user_id,
        "referred_email": customer_email or user.get("email", ""),
        "referred_name": user.get("full_name", ""),
        "order_id": order_id,
        "order_number": order_number,
        "order_total": order_total,
        "reward_amount": reward_amount,
        "reward_source": "distribution_margin",
        "status": "credited",
        "trigger_event": "payment_verified",
        "created_at": now,
        "credited_at": now,
    })

    # Send in-app notification to referrer
    try:
        from services.in_app_notification_service import create_in_app_notification
        await create_in_app_notification(
            db,
            event_key="referral_reward",
            recipient_user_id=referrer_id,
            recipient_role="customer",
            entity_type="referral",
            entity_id=order_id,
            order_id=order_id,
            context={
                "order_number": order_number,
                "reward_amount": f"{int(reward_amount):,}",
                "referred_name": user.get("full_name", ""),
            },
            skip_pref_check=True,
        )
    except Exception as e:
        logger.warning(f"Failed to send referral reward notification: {e}")

    logger.info(
        f"Referral reward: TZS {reward_amount:,.0f} credited to {referrer.get('email')} "
        f"for order {order_number} (tier-aware, distribution-margin funded)"
    )


async def process_welcome_bonus_on_payment(db, order: dict):
    """
    Process welcome bonus for a referred user on their first purchase.
    Campaign-based: disabled by default, margin-safe, anti-stacking.
    """
    settings = await _get_referral_settings(db)

    # Get welcome bonus settings from admin hub
    hub = await db.admin_settings.find_one({"key": "settings_hub"}, {"_id": 0})
    commercial = {}
    if hub and hub.get("value"):
        commercial = hub["value"].get("commercial", {})

    # Check if welcome bonus is enabled
    if not commercial.get("welcome_bonus_enabled", False):
        return

    # Check trigger event
    trigger = commercial.get("welcome_bonus_trigger_event", "payment_verified")
    if trigger != "payment_verified":
        return

    customer_email = order.get("customer_email")
    customer_id = order.get("customer_id")
    order_id = order.get("id") or str(order.get("_id", ""))
    order_number = order.get("order_number", "")
    order_total = float(order.get("total_amount") or order.get("total") or 0)

    if not customer_email and not customer_id:
        return

    # Find the customer
    user = None
    if customer_id:
        user = await db.users.find_one({"id": customer_id})
    if not user and customer_email:
        user = await db.users.find_one({"email": customer_email})
    if not user:
        return

    user_id = user.get("id") or str(user.get("_id", ""))

    # Must be a referred user
    referred_by = user.get("referred_by") or user.get("referred_by_code") or user.get("referral_code_used")
    if not referred_by:
        return

    # First purchase only check
    first_only = commercial.get("welcome_bonus_first_purchase_only", True)
    if first_only:
        existing_bonus = await db.welcome_bonus_transactions.find_one({
            "user_id": user_id, "status": "credited"
        })
        if existing_bonus:
            return

    # Anti-stacking: check if referral reward was already applied to this order
    stack_with_referral = commercial.get("welcome_bonus_stack_with_referral", False)
    if not stack_with_referral:
        ref_tx = await db.referral_transactions.find_one({
            "referred_user_id": user_id, "order_id": order_id, "status": "credited"
        })
        if ref_tx:
            logger.info(f"Welcome bonus blocked: referral reward already applied to order {order_number}, stacking disabled")
            return

    # Calculate bonus amount (margin-safe)
    bonus_type = commercial.get("welcome_bonus_type", "fixed")
    bonus_value = float(commercial.get("welcome_bonus_value", 5000))
    bonus_max_cap = float(commercial.get("welcome_bonus_max_cap", 10000))

    if bonus_type == "fixed":
        bonus_amount = bonus_value
    elif bonus_type == "percentage":
        # Calculate from distributable margin (tier-aware)
        bonus_amount = await calculate_tier_aware_referral_reward(db, order)
        # Apply the percentage to the referral-calculated amount
        bonus_amount = float(_money(Decimal(str(bonus_amount)) * Decimal(str(bonus_value)) / Decimal("100")))
    else:
        bonus_amount = bonus_value

    # Apply max cap
    if bonus_max_cap > 0:
        bonus_amount = min(bonus_amount, bonus_max_cap)

    if bonus_amount <= 0:
        return

    # Margin safety: ensure bonus doesn't exceed distributable margin
    from services.margin_engine import resolve_margin_rule_for_price, get_split_settings
    total_dist_margin = Decimal("0")
    for item in order.get("items", []):
        vp = float(item.get("vendor_price") or item.get("partner_cost") or item.get("unit_price") or item.get("price") or 0)
        qty = int(item.get("quantity") or item.get("qty") or 1)
        if vp <= 0:
            continue
        rule = await resolve_margin_rule_for_price(db, vp)
        dp_pct = Decimal(str(rule.get("distributable_margin_pct", 10)))
        total_dist_margin += _money(Decimal(str(vp)) * dp_pct / Decimal("100")) * qty

    if Decimal(str(bonus_amount)) > total_dist_margin:
        bonus_amount = float(total_dist_margin)
        if bonus_amount <= 0:
            return

    now = datetime.now(timezone.utc)

    # Credit the user's wallet
    await db.users.update_one(
        {"id": user_id},
        {"$inc": {"credit_balance": bonus_amount}}
    )

    # Record the welcome bonus transaction
    await db.welcome_bonus_transactions.insert_one({
        "user_id": user_id,
        "user_email": user.get("email", ""),
        "order_id": order_id,
        "order_number": order_number,
        "bonus_amount": bonus_amount,
        "bonus_type": bonus_type,
        "bonus_source": "distribution_margin",
        "status": "credited",
        "trigger_event": "payment_verified",
        "created_at": now,
    })

    # Send notification
    try:
        from services.in_app_notification_service import create_in_app_notification
        await create_in_app_notification(
            db,
            event_key="welcome_bonus",
            recipient_user_id=user_id,
            recipient_role="customer",
            entity_type="bonus",
            entity_id=order_id,
            context={"bonus_amount": f"{int(bonus_amount):,}"},
            skip_pref_check=True,
        )
    except Exception as e:
        logger.warning(f"Failed to send welcome bonus notification: {e}")

    logger.info(f"Welcome bonus: TZS {bonus_amount:,.0f} credited to {user.get('email')} for order {order_number}")
