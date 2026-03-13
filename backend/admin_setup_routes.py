"""
Admin Setup Routes
Seed/setup pages for industries, sources, and other configuration
"""
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from bson import ObjectId
import os
import jwt
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/setup", tags=["Admin Setup"])
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


async def get_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify admin user"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        role = user.get("role", "customer")
        if role not in ["admin", "super_admin", "sales", "marketing", "production", "finance"]:
            raise HTTPException(status_code=403, detail="Admin access required")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# Industries
@router.get("/industries")
async def get_industries(user: dict = Depends(get_admin_user)):
    """Get all industries"""
    docs = await db.setup_industries.find({}).sort("name", 1).to_list(length=300)
    return [serialize_doc(doc) for doc in docs]


@router.post("/industries")
async def create_industry(payload: dict, user: dict = Depends(get_admin_user)):
    """Create a new industry"""
    now = datetime.utcnow()
    
    doc = {
        "name": payload.get("name"),
        "created_at": now,
    }
    result = await db.setup_industries.insert_one(doc)
    created = await db.setup_industries.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.delete("/industries/{industry_id}")
async def delete_industry(industry_id: str, user: dict = Depends(get_admin_user)):
    """Delete an industry"""
    result = await db.setup_industries.delete_one({"_id": ObjectId(industry_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Industry not found")
    return {"deleted": True}


# Sources
@router.get("/sources")
async def get_sources(user: dict = Depends(get_admin_user)):
    """Get all lead sources"""
    docs = await db.setup_sources.find({}).sort("name", 1).to_list(length=300)
    return [serialize_doc(doc) for doc in docs]


@router.post("/sources")
async def create_source(payload: dict, user: dict = Depends(get_admin_user)):
    """Create a new lead source"""
    now = datetime.utcnow()
    
    doc = {
        "name": payload.get("name"),
        "created_at": now,
    }
    result = await db.setup_sources.insert_one(doc)
    created = await db.setup_sources.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.delete("/sources/{source_id}")
async def delete_source(source_id: str, user: dict = Depends(get_admin_user)):
    """Delete a lead source"""
    result = await db.setup_sources.delete_one({"_id": ObjectId(source_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Source not found")
    return {"deleted": True}


# Payment Terms
@router.get("/payment-terms")
async def get_payment_terms(user: dict = Depends(get_admin_user)):
    """Get all payment terms"""
    docs = await db.setup_payment_terms.find({}).sort("days", 1).to_list(length=100)
    return [serialize_doc(doc) for doc in docs]


@router.post("/payment-terms")
async def create_payment_term(payload: dict, user: dict = Depends(get_admin_user)):
    """Create a new payment term"""
    now = datetime.utcnow()
    
    doc = {
        "name": payload.get("name"),
        "days": int(payload.get("days", 0)),
        "created_at": now,
    }
    result = await db.setup_payment_terms.insert_one(doc)
    created = await db.setup_payment_terms.find_one({"_id": result.inserted_id})
    return serialize_doc(created)
