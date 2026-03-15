import os
from fastapi import APIRouter, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorClient
from points_redemption_service import calculate_points_redemption

router = APIRouter(prefix="/api/customer/points-checkout", tags=["Points Checkout"])

# Database connection
client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
db = client[os.environ.get('DB_NAME', 'konekt')]


@router.post("/preview")
async def preview_points_usage(payload: dict, request: Request):
    user_email = getattr(request.state, "user_email", None)
    if not user_email:
        raise HTTPException(status_code=401, detail="Unauthorized")

    subtotal = float(payload.get("subtotal", 0) or 0)
    requested_points = int(payload.get("requested_points", 0) or 0)

    user = await db.users.find_one({"email": user_email})
    points_balance = int(user.get("credit_balance", 0) or 0) if user else 0

    result = calculate_points_redemption(points_balance, requested_points, subtotal)
    return {
        "points_balance": points_balance,
        **result,
        "new_subtotal": max(0, subtotal - result["discount_value"]),
    }
