"""
Konekt Warehouse Management Routes
- CRUD for warehouses/locations
- Track storage locations for inventory
"""
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from bson import ObjectId
import os
import jwt
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/warehouses", tags=["Warehouses"])
security = HTTPBearer(auto_error=False)

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

JWT_SECRET = os.environ.get('JWT_SECRET', 'konekt-secret-key-2024')


def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable dict"""
    if doc is None:
        return None
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    for key, value in doc.items():
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
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
        if role not in ["admin", "sales", "marketing", "production"]:
            raise HTTPException(status_code=403, detail="Admin access required")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.get("")
async def list_warehouses(
    user: dict = Depends(get_admin_user),
    is_active: Optional[bool] = None
):
    """List all warehouses"""
    query = {}
    if is_active is not None:
        query["is_active"] = is_active
    docs = await db.warehouses.find(query).sort("name", 1).to_list(length=100)
    return [serialize_doc(doc) for doc in docs]


@router.post("")
async def create_warehouse(payload: dict, user: dict = Depends(get_admin_user)):
    """Create a new warehouse/location"""
    required_fields = ["name", "code"]
    for field in required_fields:
        if field not in payload or not payload[field]:
            raise HTTPException(status_code=400, detail=f"Missing required field: {field}")

    # Check for duplicate code
    existing = await db.warehouses.find_one({"code": payload["code"].upper()})
    if existing:
        raise HTTPException(status_code=400, detail="Warehouse code already exists")

    now = datetime.now(timezone.utc)
    doc = {
        "name": payload["name"],
        "code": payload["code"].upper(),
        "address": payload.get("address", ""),
        "city": payload.get("city", ""),
        "country": payload.get("country", "Tanzania"),
        "contact_name": payload.get("contact_name", ""),
        "contact_phone": payload.get("contact_phone", ""),
        "contact_email": payload.get("contact_email", ""),
        "capacity_units": int(payload.get("capacity_units", 0)),
        "current_utilization": int(payload.get("current_utilization", 0)),
        "warehouse_type": payload.get("warehouse_type", "general"),  # general, cold_storage, hazmat, etc.
        "notes": payload.get("notes", ""),
        "is_active": payload.get("is_active", True),
        "created_at": now,
        "updated_at": now,
        "created_by": user.get("email"),
    }
    
    result = await db.warehouses.insert_one(doc)
    created = await db.warehouses.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.get("/{warehouse_id}")
async def get_warehouse(warehouse_id: str, user: dict = Depends(get_admin_user)):
    """Get a single warehouse by ID"""
    try:
        doc = await db.warehouses.find_one({"_id": ObjectId(warehouse_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    
    if not doc:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    return serialize_doc(doc)


@router.put("/{warehouse_id}")
async def update_warehouse(warehouse_id: str, payload: dict, user: dict = Depends(get_admin_user)):
    """Update a warehouse"""
    try:
        existing = await db.warehouses.find_one({"_id": ObjectId(warehouse_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    
    if not existing:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    update_fields = [
        "name", "address", "city", "country", "contact_name", "contact_phone",
        "contact_email", "capacity_units", "current_utilization", "warehouse_type",
        "notes", "is_active"
    ]
    
    update_data = {k: payload[k] for k in update_fields if k in payload}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    update_data["updated_at"] = datetime.now(timezone.utc)

    await db.warehouses.update_one(
        {"_id": ObjectId(warehouse_id)},
        {"$set": update_data}
    )
    
    updated = await db.warehouses.find_one({"_id": ObjectId(warehouse_id)})
    return serialize_doc(updated)


@router.delete("/{warehouse_id}")
async def delete_warehouse(warehouse_id: str, user: dict = Depends(get_admin_user)):
    """Soft delete a warehouse"""
    try:
        result = await db.warehouses.update_one(
            {"_id": ObjectId(warehouse_id)},
            {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}}
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    
    return {"message": "Warehouse deactivated"}


@router.get("/stats/summary")
async def get_warehouse_stats(user: dict = Depends(get_admin_user)):
    """Get warehouse statistics"""
    total = await db.warehouses.count_documents({})
    active = await db.warehouses.count_documents({"is_active": True})
    
    # Get total capacity and utilization
    pipeline = [
        {"$match": {"is_active": True}},
        {"$group": {
            "_id": None,
            "total_capacity": {"$sum": "$capacity_units"},
            "total_utilization": {"$sum": "$current_utilization"}
        }}
    ]
    
    agg_result = await db.warehouses.aggregate(pipeline).to_list(length=1)
    capacity_data = agg_result[0] if agg_result else {"total_capacity": 0, "total_utilization": 0}
    
    return {
        "total_warehouses": total,
        "active_warehouses": active,
        "total_capacity": capacity_data.get("total_capacity", 0),
        "total_utilization": capacity_data.get("total_utilization", 0),
    }
