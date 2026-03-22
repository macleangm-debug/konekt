from datetime import datetime
import os
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
import jwt
from commission_trigger_service import get_payout_progress

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


@router.get("/dashboard/summary")
async def affiliate_summary(user: dict = Depends(get_user)):
    """Get affiliate dashboard summary with earnings and commissions"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    email = user.get("email")
    affiliate = await db.affiliates.find_one({"email": email})
    if not affiliate:
        raise HTTPException(status_code=404, detail="Affiliate account not found")

    commissions = await db.affiliate_commissions.find({
        "$or": [
            {"affiliate_code": affiliate.get("affiliate_code")},
            {"affiliate_email": email}
        ]
    }).sort("created_at", -1).to_list(length=300)

    total_sales = sum(float(x.get("sale_value", 0) or x.get("sale_amount", 0) or 0) for x in commissions)
    total_commission = sum(float(x.get("commission", 0) or x.get("commission_amount", 0) or 0) for x in commissions)
    pending_commission = sum(float(x.get("commission", 0) or x.get("commission_amount", 0) or 0) for x in commissions if x.get("status") == "pending")
    paid_commission = sum(float(x.get("commission", 0) or x.get("commission_amount", 0) or 0) for x in commissions if x.get("status") == "paid")

    # Get base URL from environment or use default
    base_url = os.environ.get("REACT_APP_BACKEND_URL", "https://konekt.app")

    return {
        "affiliate_code": affiliate.get("affiliate_code") or affiliate.get("promo_code"),
        "name": affiliate.get("name"),
        "email": affiliate.get("email"),
        "country": affiliate.get("country"),
        "total_sales": round(total_sales, 2),
        "total_commission": round(total_commission, 2),
        "pending_commission": round(pending_commission, 2),
        "paid_commission": round(paid_commission, 2),
        "share_link": affiliate.get("referral_link") or f"{base_url}/?ref={affiliate.get('affiliate_code') or affiliate.get('promo_code')}",
        "commissions": [
            {
                "order_id": x.get("order_id") or x.get("source_document"),
                "sale_value": x.get("sale_value", 0) or x.get("sale_amount", 0),
                "commission": x.get("commission", 0) or x.get("commission_amount", 0),
                "status": x.get("status", "pending"),
                "created_at": x.get("created_at"),
            }
            for x in commissions
        ],
    }


@router.get("/payout-progress")
async def affiliate_payout_progress(user: dict = Depends(get_user)):
    """Get payout progress - how much more needed to reach threshold"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    user_id = user.get("id")
    progress = await get_payout_progress(db, user_id, "affiliate")
    return progress


@router.get("/recent-earnings")
async def affiliate_recent_earnings(user: dict = Depends(get_user)):
    """Get recent commission earnings for 'You just earned' notifications"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    user_id = user.get("id")
    
    # Fetch commissions created in the last 24 hours for this user
    from datetime import timedelta
    cutoff = datetime.utcnow() - timedelta(hours=24)
    
    recent = await db.commission_records.find({
        "beneficiary_user_id": user_id,
        "created_at": {"$gte": cutoff}
    }).sort("created_at", -1).to_list(length=10)
    
    return [
        {
            "id": str(r.get("_id", "")),
            "amount": r.get("amount", 0),
            "currency": r.get("currency", "TZS"),
            "commission_type": r.get("beneficiary_type", "affiliate"),
            "status": r.get("status", "pending"),
            "created_at": r.get("created_at"),
        }
        for r in recent
    ]
