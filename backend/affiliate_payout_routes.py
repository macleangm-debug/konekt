from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
import os
import jwt
import uuid

from affiliate_commission_models import AffiliatePayoutRequestCreate

router = APIRouter(prefix="/api/affiliate-payouts", tags=["Affiliate Payouts"])
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


@router.get("/admin")
async def list_affiliate_payouts(status: str = None, user: dict = Depends(get_admin_user)):
    """List all affiliate payout requests"""
    query = {}
    if status:
        query["status"] = status
    docs = await db.affiliate_payout_requests.find(query).sort("created_at", -1).to_list(length=500)
    return {"payouts": [serialize_doc(doc) for doc in docs]}


@router.post("/admin")
async def create_affiliate_payout_request(payload: AffiliatePayoutRequestCreate, user: dict = Depends(get_admin_user)):
    """Create a payout request"""
    now = datetime.now(timezone.utc).isoformat()

    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["status"] = "requested"
    doc["created_at"] = now
    doc["updated_at"] = now
    doc["requested_by"] = user.get("email")

    result = await db.affiliate_payout_requests.insert_one(doc)
    created = await db.affiliate_payout_requests.find_one({"_id": result.inserted_id})

    return {"message": "Payout request created", "payout": serialize_doc(created)}


@router.post("/admin/{payout_id}/approve")
async def approve_affiliate_payout(payout_id: str, user: dict = Depends(get_admin_user)):
    """Approve a payout request"""
    now = datetime.now(timezone.utc).isoformat()

    try:
        payout = await db.affiliate_payout_requests.find_one({"_id": ObjectId(payout_id)})
    except:
        payout = await db.affiliate_payout_requests.find_one({"id": payout_id})

    if not payout:
        raise HTTPException(status_code=404, detail="Payout request not found")

    try:
        await db.affiliate_payout_requests.update_one(
            {"_id": ObjectId(payout_id)},
            {"$set": {"status": "approved", "approved_by": user.get("email"), "updated_at": now}},
        )
        updated = await db.affiliate_payout_requests.find_one({"_id": ObjectId(payout_id)})
    except:
        await db.affiliate_payout_requests.update_one(
            {"id": payout_id},
            {"$set": {"status": "approved", "approved_by": user.get("email"), "updated_at": now}},
        )
        updated = await db.affiliate_payout_requests.find_one({"id": payout_id})

    return {"message": "Payout approved", "payout": serialize_doc(updated)}


@router.post("/admin/{payout_id}/mark-paid")
async def mark_affiliate_payout_paid(payout_id: str, user: dict = Depends(get_admin_user)):
    """Mark a payout as paid"""
    now = datetime.now(timezone.utc).isoformat()

    try:
        payout = await db.affiliate_payout_requests.find_one({"_id": ObjectId(payout_id)})
    except:
        payout = await db.affiliate_payout_requests.find_one({"id": payout_id})

    if not payout:
        raise HTTPException(status_code=404, detail="Payout request not found")

    try:
        await db.affiliate_payout_requests.update_one(
            {"_id": ObjectId(payout_id)},
            {"$set": {"status": "paid", "paid_at": now, "paid_by": user.get("email"), "updated_at": now}},
        )
        updated = await db.affiliate_payout_requests.find_one({"_id": ObjectId(payout_id)})
    except:
        await db.affiliate_payout_requests.update_one(
            {"id": payout_id},
            {"$set": {"status": "paid", "paid_at": now, "paid_by": user.get("email"), "updated_at": now}},
        )
        updated = await db.affiliate_payout_requests.find_one({"id": payout_id})

    return {"message": "Payout marked as paid", "payout": serialize_doc(updated)}
