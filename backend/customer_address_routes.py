"""
Customer Address Routes
Manage delivery addresses for customers
"""
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from bson import ObjectId
import os
import jwt
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/customer/addresses", tags=["Customer Addresses"])
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
async def list_my_addresses(user: dict = Depends(get_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    user_email = user.get("email")
    docs = await db.customer_addresses.find({"customer_email": user_email}).sort("is_default", -1).to_list(length=100)
    return [serialize_doc(doc) for doc in docs]


@router.post("")
async def create_address(payload: dict, user: dict = Depends(get_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    user_email = user.get("email")
    now = datetime.utcnow()
    
    # If this is default, unset other defaults
    if payload.get("is_default"):
        await db.customer_addresses.update_many(
            {"customer_email": user_email},
            {"$set": {"is_default": False}}
        )
    
    doc = {
        "customer_email": user_email,
        "full_name": payload.get("full_name"),
        "company_name": payload.get("company_name"),
        "country": payload.get("country", "TZ"),
        "city": payload.get("city"),
        "address_line_1": payload.get("address_line_1"),
        "address_line_2": payload.get("address_line_2"),
        "postal_code": payload.get("postal_code"),
        "phone_prefix": payload.get("phone_prefix", "+255"),
        "phone_number": payload.get("phone_number"),
        "is_default": payload.get("is_default", False),
        "created_at": now,
        "updated_at": now,
    }
    
    result = await db.customer_addresses.insert_one(doc)
    created = await db.customer_addresses.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.delete("/{address_id}")
async def delete_address(address_id: str, user: dict = Depends(get_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    user_email = user.get("email")
    result = await db.customer_addresses.delete_one({
        "_id": ObjectId(address_id),
        "customer_email": user_email
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Address not found")
    
    return {"deleted": True}


@router.put("/{address_id}/set-default")
async def set_default_address(address_id: str, user: dict = Depends(get_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    user_email = user.get("email")
    
    # Unset all defaults
    await db.customer_addresses.update_many(
        {"customer_email": user_email},
        {"$set": {"is_default": False}}
    )
    
    # Set this one as default
    result = await db.customer_addresses.update_one(
        {"_id": ObjectId(address_id), "customer_email": user_email},
        {"$set": {"is_default": True, "updated_at": datetime.utcnow()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Address not found")
    
    return {"success": True}
