from datetime import datetime
import os
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
import jwt

router = APIRouter(prefix="/api/affiliate", tags=["Affiliate Dashboard"])
security = HTTPBearer(auto_error=False)

# Database connection
client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
db = client[os.environ.get('DB_NAME', 'konekt')]

JWT_SECRET = os.environ.get('JWT_SECRET', 'konekt-secret-key-2024')


async def get_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        return user
    except Exception:
        return None


@router.get("/me")
async def get_affiliate_dashboard(user: dict = Depends(get_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_email = user.get("email")

    affiliate = await db.affiliates.find_one({"email": user_email})
    if not affiliate:
        raise HTTPException(status_code=404, detail="Affiliate profile not found")

    commissions = await db.affiliate_commissions.find({"affiliate_email": user_email}).to_list(length=500)
    payouts = await db.affiliate_payout_requests.find({"affiliate_email": user_email}).sort("created_at", -1).to_list(length=200)

    total_earned = sum(float(c.get("commission_amount", 0) or 0) for c in commissions)
    total_approved = sum(float(c.get("commission_amount", 0) or 0) for c in commissions if c.get("status") == "approved")
    total_paid = sum(float(c.get("amount", 0) or 0) for c in payouts if c.get("status") == "paid")
    payable_balance = max(0, total_approved - total_paid)

    return {
        "profile": {
            "name": affiliate.get("name"),
            "email": affiliate.get("email"),
            "status": affiliate.get("status"),
            "commission_rate": affiliate.get("commission_rate", 0),
            "promo_code": affiliate.get("promo_code"),
            "referral_link": affiliate.get("referral_link"),
        },
        "summary": {
            "total_earned": total_earned,
            "total_approved": total_approved,
            "total_paid": total_paid,
            "payable_balance": payable_balance,
        },
        "commissions": [
            {
                "id": str(c["_id"]),
                "source_document": c.get("source_document"),
                "sale_amount": c.get("sale_amount"),
                "commission_amount": c.get("commission_amount"),
                "status": c.get("status"),
                "created_at": c.get("created_at"),
            }
            for c in commissions
        ],
        "payout_requests": [
            {
                "id": str(p["_id"]),
                "amount": p.get("amount"),
                "status": p.get("status"),
                "created_at": p.get("created_at"),
            }
            for p in payouts
        ],
    }


@router.post("/me/payout-request")
async def create_payout_request(payload: dict, user: dict = Depends(get_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_email = user.get("email")

    amount = float(payload.get("amount", 0) or 0)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid amount")

    affiliate = await db.affiliates.find_one({"email": user_email})
    if not affiliate:
        raise HTTPException(status_code=404, detail="Affiliate profile not found")

    commissions = await db.affiliate_commissions.find({"affiliate_email": user_email, "status": "approved"}).to_list(length=500)
    payouts = await db.affiliate_payout_requests.find({"affiliate_email": user_email, "status": "paid"}).to_list(length=500)

    total_approved = sum(float(c.get("commission_amount", 0) or 0) for c in commissions)
    total_paid = sum(float(p.get("amount", 0) or 0) for p in payouts)
    payable_balance = max(0, total_approved - total_paid)

    if amount > payable_balance:
        raise HTTPException(status_code=400, detail="Amount exceeds payable balance")

    doc = {
        "affiliate_email": user_email,
        "affiliate_name": affiliate.get("name"),
        "amount": amount,
        "status": "pending",
        "created_at": datetime.utcnow(),
    }

    result = await db.affiliate_payout_requests.insert_one(doc)
    created = await db.affiliate_payout_requests.find_one({"_id": result.inserted_id})

    created["id"] = str(created["_id"])
    del created["_id"]
    return created
