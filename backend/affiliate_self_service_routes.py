"""
Affiliate Self-Service Routes
Self-service dashboard for affiliates
"""
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
import jwt
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/affiliate-self", tags=["Affiliate Self Service"])
security = HTTPBearer(auto_error=False)

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

JWT_SECRET = os.environ.get('JWT_SECRET', 'konekt-secret-key-2024')


def serialize_doc(doc):
    if doc is None:
        return None
    doc = dict(doc)
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


async def get_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get authenticated user"""
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        return user
    except Exception:
        return None


@router.get("/dashboard")
async def get_affiliate_dashboard(user: dict = Depends(get_user)):
    """Get affiliate dashboard data for the current user"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    user_email = user.get("email")
    
    affiliate = await db.affiliates.find_one({"email": user_email})
    if not affiliate:
        raise HTTPException(status_code=404, detail="Affiliate profile not found")
    
    # Get commissions
    commissions = await db.affiliate_commissions.find(
        {"affiliate_id": str(affiliate["_id"])}
    ).sort("created_at", -1).to_list(length=500)
    
    # Get payouts
    payouts = await db.affiliate_payout_requests.find(
        {"affiliate_email": user_email}
    ).sort("created_at", -1).to_list(length=200)
    
    # Calculate stats
    total_commission = sum(float(item.get("commission_amount", 0) or 0) for item in commissions)
    paid_commission = sum(float(item.get("commission_amount", 0) or 0) for item in commissions if item.get("status") == "paid")
    approved_commission = sum(float(item.get("commission_amount", 0) or 0) for item in commissions if item.get("status") == "approved")
    pending_commission = sum(float(item.get("commission_amount", 0) or 0) for item in commissions if item.get("status") == "pending")
    
    result = serialize_doc(affiliate)
    result["stats"] = {
        "total_commission": round(total_commission, 2),
        "paid_commission": round(paid_commission, 2),
        "approved_commission": round(approved_commission, 2),
        "pending_commission": round(pending_commission, 2),
        "sales_count": len(commissions),
    }
    result["commissions"] = [serialize_doc(doc) for doc in commissions]
    result["payouts"] = [serialize_doc(doc) for doc in payouts]
    
    return result


@router.post("/payout-request")
async def create_affiliate_self_payout_request(payload: dict, user: dict = Depends(get_user)):
    """Create a payout request for the current affiliate"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    user_email = user.get("email")
    
    affiliate = await db.affiliates.find_one({"email": user_email})
    if not affiliate:
        raise HTTPException(status_code=404, detail="Affiliate profile not found")
    
    now = datetime.utcnow()
    doc = {
        "affiliate_id": str(affiliate["_id"]),
        "affiliate_email": user_email,
        "requested_amount": float(payload.get("requested_amount", 0) or 0),
        "notes": payload.get("notes"),
        "status": "requested",
        "created_at": now,
        "updated_at": now,
    }
    
    result = await db.affiliate_payout_requests.insert_one(doc)
    created = await db.affiliate_payout_requests.find_one({"_id": result.inserted_id})
    
    return serialize_doc(created)
