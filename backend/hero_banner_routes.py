from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import jwt
import uuid

from hero_banner_models import HeroBannerCreate, HeroBannerUpdate

router = APIRouter(prefix="/api/hero-banners", tags=["Hero Banners"])
security = HTTPBearer(auto_error=False)

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'konekt')]

JWT_SECRET = os.environ.get('JWT_SECRET', 'konekt-secret-key-2024')
JWT_ALGORITHM = "HS256"


def serialize_doc(doc):
    """Convert MongoDB document to dict with string id"""
    if doc is None:
        return None
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


async def get_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get user and verify they have admin/staff role"""
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


@router.get("/active")
async def list_active_hero_banners():
    """Get all active hero banners for the frontend carousel"""
    now = datetime.now(timezone.utc).isoformat()

    # Find active banners within date range
    query = {"is_active": True}
    
    docs = await db.hero_banners.find(query).sort("position", 1).to_list(length=20)
    
    # Filter by date range in Python (more flexible with optional dates)
    result = []
    for doc in docs:
        starts_at = doc.get("starts_at")
        ends_at = doc.get("ends_at")
        
        # Check start date
        if starts_at and starts_at > now:
            continue
        # Check end date
        if ends_at and ends_at < now:
            continue
            
        result.append(serialize_doc(doc))
    
    return {"banners": result}


@router.get("/admin")
async def list_all_hero_banners(user: dict = Depends(get_admin_user)):
    """Get all hero banners for admin management"""
    docs = await db.hero_banners.find({}).sort("position", 1).to_list(length=100)
    return {"banners": [serialize_doc(doc) for doc in docs]}


@router.post("/admin")
async def create_hero_banner(payload: HeroBannerCreate, user: dict = Depends(get_admin_user)):
    """Create a new hero banner"""
    now = datetime.now(timezone.utc).isoformat()

    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now
    doc["updated_at"] = now
    doc["created_by"] = user.get("id")

    result = await db.hero_banners.insert_one(doc)
    created = await db.hero_banners.find_one({"_id": result.inserted_id})

    return {"message": "Hero banner created", "banner": serialize_doc(created)}


@router.patch("/admin/{banner_id}")
async def update_hero_banner(banner_id: str, payload: HeroBannerUpdate, user: dict = Depends(get_admin_user)):
    """Update an existing hero banner"""
    # Build update dict with only provided fields
    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    # Try to find by ObjectId first, then by string id
    try:
        result = await db.hero_banners.update_one(
            {"_id": ObjectId(banner_id)},
            {"$set": update_data}
        )
    except:
        result = await db.hero_banners.update_one(
            {"id": banner_id},
            {"$set": update_data}
        )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Hero banner not found")

    # Fetch updated document
    try:
        updated = await db.hero_banners.find_one({"_id": ObjectId(banner_id)})
    except:
        updated = await db.hero_banners.find_one({"id": banner_id})

    return {"message": "Hero banner updated", "banner": serialize_doc(updated)}


@router.delete("/admin/{banner_id}")
async def delete_hero_banner(banner_id: str, user: dict = Depends(get_admin_user)):
    """Delete a hero banner"""
    # Try to find by ObjectId first, then by string id
    try:
        banner = await db.hero_banners.find_one({"_id": ObjectId(banner_id)})
        if banner:
            await db.hero_banners.delete_one({"_id": ObjectId(banner_id)})
    except:
        banner = await db.hero_banners.find_one({"id": banner_id})
        if banner:
            await db.hero_banners.delete_one({"id": banner_id})

    if not banner:
        raise HTTPException(status_code=404, detail="Hero banner not found")

    return {"message": "Hero banner deleted", "deleted": True}
