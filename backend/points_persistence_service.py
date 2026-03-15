from datetime import datetime


async def apply_points_discount_to_document(
    db,
    *,
    customer_email: str,
    document_type: str,
    document_id: str,
    requested_points: int,
    subtotal: float,
):
    user = await db.users.find_one({"email": customer_email})
    if not user:
        return {
            "applied_points": 0,
            "discount_value": 0,
            "remaining_points": 0,
        }

    points_balance = int(user.get("credit_balance", 0) or 0)
    requested_points = max(0, int(requested_points or 0))
    subtotal = max(0, float(subtotal or 0))

    usable_points = min(points_balance, requested_points, int(subtotal))
    discount_value = usable_points  # 1 point = 1 TZS

    if usable_points <= 0:
        return {
            "applied_points": 0,
            "discount_value": 0,
            "remaining_points": points_balance,
        }

    remaining_points = points_balance - usable_points
    now = datetime.utcnow()

    await db.users.update_one(
        {"email": customer_email},
        {"$set": {"credit_balance": remaining_points, "updated_at": now}},
    )

    await db.referral_points_transactions.insert_one(
        {
            "customer_email": customer_email,
            "type": "redeem",
            "points": -usable_points,
            "description": f"Redeemed on {document_type} {document_id}",
            "document_type": document_type,
            "document_id": document_id,
            "created_at": now,
        }
    )

    return {
        "applied_points": usable_points,
        "discount_value": discount_value,
        "remaining_points": remaining_points,
    }


async def award_points_to_customer(
    db,
    *,
    customer_email: str,
    points: int,
    description: str,
    document_type: str | None = None,
    document_id: str | None = None,
):
    points = max(0, int(points or 0))
    if points <= 0 or not customer_email:
        return

    user = await db.users.find_one({"email": customer_email})
    if not user:
        return

    current_balance = int(user.get("credit_balance", 0) or 0)
    new_balance = current_balance + points
    now = datetime.utcnow()

    await db.users.update_one(
        {"email": customer_email},
        {"$set": {"credit_balance": new_balance, "updated_at": now}},
    )

    await db.referral_points_transactions.insert_one(
        {
            "customer_email": customer_email,
            "type": "earn",
            "points": points,
            "description": description,
            "document_type": document_type,
            "document_id": document_id,
            "created_at": now,
        }
    )
