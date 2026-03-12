from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
import os
import jwt
import uuid

from affiliate_models import AffiliateCreate

router = APIRouter(prefix="/api/admin/affiliates", tags=["Affiliates"])
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
async def list_affiliates(user: dict = Depends(get_admin_user)):
    """List all affiliates"""
    docs = await db.affiliates.find({}).sort("created_at", -1).to_list(length=500)
    return {"affiliates": [serialize_doc(doc) for doc in docs]}


@router.get("/{affiliate_id}")
async def get_affiliate(affiliate_id: str, user: dict = Depends(get_admin_user)):
    """Get a single affiliate by ID"""
    try:
        doc = await db.affiliates.find_one({"_id": ObjectId(affiliate_id)})
    except:
        doc = await db.affiliates.find_one({"id": affiliate_id})
    
    if not doc:
        raise HTTPException(status_code=404, detail="Affiliate not found")
    return serialize_doc(doc)


@router.post("")
async def create_affiliate(payload: AffiliateCreate, user: dict = Depends(get_admin_user)):
    """Create a new affiliate"""
    existing = await db.affiliates.find_one({"affiliate_code": payload.affiliate_code.upper()})
    if existing:
        raise HTTPException(status_code=400, detail="Affiliate code already exists")

    now = datetime.now(timezone.utc).isoformat()
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["affiliate_code"] = payload.affiliate_code.upper()
    doc["created_at"] = now
    doc["updated_at"] = now

    if not doc.get("affiliate_link"):
        doc["affiliate_link"] = f"/a/{payload.affiliate_code.upper()}"

    result = await db.affiliates.insert_one(doc)
    created = await db.affiliates.find_one({"_id": result.inserted_id})

    return {"message": "Affiliate created", "affiliate": serialize_doc(created)}


@router.patch("/{affiliate_id}")
async def update_affiliate(affiliate_id: str, payload: AffiliateCreate, user: dict = Depends(get_admin_user)):
    """Update an existing affiliate"""
    update_data = payload.model_dump(exclude={"created_at"})
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    try:
        result = await db.affiliates.update_one(
            {"_id": ObjectId(affiliate_id)},
            {"$set": update_data},
        )
    except:
        result = await db.affiliates.update_one(
            {"id": affiliate_id},
            {"$set": update_data},
        )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Affiliate not found")

    try:
        updated = await db.affiliates.find_one({"_id": ObjectId(affiliate_id)})
    except:
        updated = await db.affiliates.find_one({"id": affiliate_id})

    return {"message": "Affiliate updated", "affiliate": serialize_doc(updated)}


@router.delete("/{affiliate_id}")
async def delete_affiliate(affiliate_id: str, user: dict = Depends(get_admin_user)):
    """Delete an affiliate"""
    try:
        result = await db.affiliates.delete_one({"_id": ObjectId(affiliate_id)})
    except:
        result = await db.affiliates.delete_one({"id": affiliate_id})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Affiliate not found")

    return {"message": "Affiliate deleted", "deleted": True}
