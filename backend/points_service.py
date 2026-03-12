from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase


async def get_or_create_points_wallet(db: AsyncIOMotorDatabase, user_id: str, user_email: str | None = None):
    """Get existing points wallet or create a new one for the user"""
    wallet = await db.points_wallets.find_one({"user_id": user_id})
    if wallet:
        return wallet

    doc = {
        "user_id": user_id,
        "user_email": user_email,
        "points_balance": 0,
        "points_earned_total": 0,
        "points_redeemed_total": 0,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    result = await db.points_wallets.insert_one(doc)
    return await db.points_wallets.find_one({"_id": result.inserted_id})


async def add_points(
    db: AsyncIOMotorDatabase,
    *,
    user_id: str,
    user_email: str | None,
    points: int,
    transaction_type: str,
    reference_type: str | None = None,
    reference_id: str | None = None,
    description: str | None = None,
):
    """Add points to a user's wallet and create a transaction record"""
    await get_or_create_points_wallet(db, user_id, user_email)

    now = datetime.now(timezone.utc)

    await db.points_wallets.update_one(
        {"user_id": user_id},
        {
            "$inc": {
                "points_balance": points,
                "points_earned_total": points if points > 0 else 0,
            },
            "$set": {"updated_at": now},
        },
    )

    await db.points_transactions.insert_one(
        {
            "user_id": user_id,
            "user_email": user_email,
            "points": points,
            "transaction_type": transaction_type,
            "reference_type": reference_type,
            "reference_id": reference_id,
            "description": description,
            "created_at": now,
        }
    )


async def redeem_points(
    db: AsyncIOMotorDatabase,
    *,
    user_id: str,
    user_email: str | None,
    points: int,
    reference_type: str | None = None,
    reference_id: str | None = None,
    description: str | None = None,
):
    """Redeem points from a user's wallet"""
    wallet = await get_or_create_points_wallet(db, user_id, user_email)
    if wallet.get("points_balance", 0) < points:
        raise ValueError("Insufficient points balance")

    now = datetime.now(timezone.utc)

    await db.points_wallets.update_one(
        {"user_id": user_id},
        {
            "$inc": {
                "points_balance": -points,
                "points_redeemed_total": points,
            },
            "$set": {"updated_at": now},
        },
    )

    await db.points_transactions.insert_one(
        {
            "user_id": user_id,
            "user_email": user_email,
            "points": -points,
            "transaction_type": "redeemed",
            "reference_type": reference_type,
            "reference_id": reference_id,
            "description": description,
            "created_at": now,
        }
    )
