"""
Customer Maintenance Routes
Maintenance request tracking for customers
"""
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from bson import ObjectId
import os
import jwt
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/customer/maintenance-requests", tags=["Customer Maintenance"])
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
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        return user
    except Exception:
        return None


@router.get("")
async def list_my_maintenance_requests(user: dict = Depends(get_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    user_email = user.get("email")
    docs = await db.maintenance_requests.find({"customer_email": user_email}).sort("created_at", -1).to_list(length=200)
    return [serialize_doc(doc) for doc in docs]


@router.post("")
async def create_maintenance_request(payload: dict, user: dict = Depends(get_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    user_email = user.get("email")
    now = datetime.utcnow()
    
    doc = {
        "customer_email": user_email,
        "customer_name": user.get("full_name") or user.get("name"),
        "service_type": payload.get("service_type"),
        "machine_name": payload.get("machine_name"),
        "machine_model": payload.get("machine_model"),
        "serial_number": payload.get("serial_number"),
        "location": payload.get("location"),
        "description": payload.get("description"),
        "preferred_date": payload.get("preferred_date"),
        "preferred_time": payload.get("preferred_time"),
        "status": "submitted",
        "created_at": now,
        "updated_at": now,
    }
    
    result = await db.maintenance_requests.insert_one(doc)
    created = await db.maintenance_requests.find_one({"_id": result.inserted_id})
    return serialize_doc(created)
