from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
import os
import jwt

router = APIRouter(prefix="/api/admin/affiliate-commissions", tags=["Affiliate Commissions"])
security = HTTPBearer(auto_error=False)

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'konekt')]

JWT_SECRET = os.environ.get('JWT_SECRET', 'konekt-secret-key-2024')
JWT_ALGORITHM = "HS256"


def serialize_doc(doc):
    if doc is None:
        return None
    if "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc


async def get_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        role = user.get("role", "customer")
        if role not in ["admin", "sales", "marketing", "production"]:
            raise HTTPException(status_code=403, detail="Admin access required")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.get("")
async def list_affiliate_commissions(
    affiliate_id: str = None,
    status: str = None,
    user: dict = Depends(get_admin_user),
):
    """List affiliate commissions with optional filters"""
    query = {}
    if affiliate_id:
        query["affiliate_id"] = affiliate_id
    if status:
        query["status"] = status

    docs = await db.affiliate_commissions.find(query).sort("created_at", -1).to_list(length=500)
    return {"commissions": [serialize_doc(doc) for doc in docs]}


@router.post("/{commission_id}/approve")
async def approve_affiliate_commission(commission_id: str, user: dict = Depends(get_admin_user)):
    """Approve a pending commission"""
    now = datetime.now(timezone.utc).isoformat()

    try:
        commission = await db.affiliate_commissions.find_one({"_id": ObjectId(commission_id)})
    except:
        commission = await db.affiliate_commissions.find_one({"id": commission_id})
    
    if not commission:
        raise HTTPException(status_code=404, detail="Commission not found")

    try:
        await db.affiliate_commissions.update_one(
            {"_id": ObjectId(commission_id)},
            {"$set": {"status": "approved", "updated_at": now}},
        )
        updated = await db.affiliate_commissions.find_one({"_id": ObjectId(commission_id)})
    except:
        await db.affiliate_commissions.update_one(
            {"id": commission_id},
            {"$set": {"status": "approved", "updated_at": now}},
        )
        updated = await db.affiliate_commissions.find_one({"id": commission_id})

    return {"message": "Commission approved", "commission": serialize_doc(updated)}


@router.post("/{commission_id}/mark-paid")
async def mark_affiliate_commission_paid(commission_id: str, user: dict = Depends(get_admin_user)):
    """Mark a commission as paid"""
    now = datetime.now(timezone.utc).isoformat()

    try:
        commission = await db.affiliate_commissions.find_one({"_id": ObjectId(commission_id)})
    except:
        commission = await db.affiliate_commissions.find_one({"id": commission_id})

    if not commission:
        raise HTTPException(status_code=404, detail="Commission not found")

    try:
        await db.affiliate_commissions.update_one(
            {"_id": ObjectId(commission_id)},
            {"$set": {"status": "paid", "paid_at": now, "updated_at": now}},
        )
        updated = await db.affiliate_commissions.find_one({"_id": ObjectId(commission_id)})
    except:
        await db.affiliate_commissions.update_one(
            {"id": commission_id},
            {"$set": {"status": "paid", "paid_at": now, "updated_at": now}},
        )
        updated = await db.affiliate_commissions.find_one({"id": commission_id})

    return {"message": "Commission marked as paid", "commission": serialize_doc(updated)}
