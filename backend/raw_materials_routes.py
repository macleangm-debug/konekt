"""
Konekt Raw Materials Management Routes
- CRUD for raw materials
- Track materials needed for production
"""
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from bson import ObjectId
import os
import jwt
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/raw-materials", tags=["Raw Materials"])
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
async def list_raw_materials(
    user: dict = Depends(get_admin_user),
    category: Optional[str] = None,
    low_stock: Optional[bool] = None
):
    """List all raw materials"""
    query = {}
    if category:
        query["category"] = category
    
    docs = await db.raw_materials.find(query).sort("name", 1).to_list(length=500)
    materials = [serialize_doc(doc) for doc in docs]
    
    # Filter low stock if requested
    if low_stock:
        materials = [m for m in materials if m.get("quantity_on_hand", 0) <= m.get("reorder_level", 0)]
    
    return materials


@router.post("")
async def create_raw_material(payload: dict, user: dict = Depends(get_admin_user)):
    """Create a new raw material"""
    required_fields = ["name", "sku", "unit_of_measure"]
    for field in required_fields:
        if field not in payload or not payload[field]:
            raise HTTPException(status_code=400, detail=f"Missing required field: {field}")

    # Check for duplicate SKU
    existing = await db.raw_materials.find_one({"sku": payload["sku"].upper()})
    if existing:
        raise HTTPException(status_code=400, detail="Material SKU already exists")

    now = datetime.now(timezone.utc)
    doc = {
        "name": payload["name"],
        "sku": payload["sku"].upper(),
        "description": payload.get("description", ""),
        "category": payload.get("category", "General"),
        "unit_of_measure": payload["unit_of_measure"],  # e.g., kg, meters, liters, sheets, units
        "quantity_on_hand": float(payload.get("quantity_on_hand", 0)),
        "reserved_quantity": float(payload.get("reserved_quantity", 0)),
        "reorder_level": float(payload.get("reorder_level", 10)),
        "unit_cost": float(payload.get("unit_cost", 0)),
        "supplier_name": payload.get("supplier_name", ""),
        "supplier_contact": payload.get("supplier_contact", ""),
        "warehouse_id": payload.get("warehouse_id"),
        "warehouse_location": payload.get("warehouse_location", ""),
        "lead_time_days": int(payload.get("lead_time_days", 7)),
        "notes": payload.get("notes", ""),
        "is_active": payload.get("is_active", True),
        "created_at": now,
        "updated_at": now,
        "created_by": user.get("email"),
    }
    
    result = await db.raw_materials.insert_one(doc)
    created = await db.raw_materials.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.get("/categories")
async def get_material_categories(user: dict = Depends(get_admin_user)):
    """Get distinct material categories"""
    categories = await db.raw_materials.distinct("category")
    return sorted([c for c in categories if c])


@router.get("/low-stock")
async def get_low_stock_materials(user: dict = Depends(get_admin_user)):
    """Get materials below reorder level"""
    pipeline = [
        {"$match": {"is_active": {"$ne": False}}},
        {"$project": {
            "id": {"$toString": "$_id"},
            "name": 1,
            "sku": 1,
            "category": 1,
            "unit_of_measure": 1,
            "quantity_on_hand": 1,
            "reserved_quantity": 1,
            "reorder_level": 1,
            "supplier_name": 1,
            "lead_time_days": 1,
            "available": {"$subtract": ["$quantity_on_hand", {"$ifNull": ["$reserved_quantity", 0]}]},
            "_id": 0
        }},
        {"$match": {"$expr": {"$lte": ["$available", "$reorder_level"]}}},
        {"$sort": {"available": 1}}
    ]
    
    results = await db.raw_materials.aggregate(pipeline).to_list(length=100)
    return results


@router.get("/{material_id}")
async def get_raw_material(material_id: str, user: dict = Depends(get_admin_user)):
    """Get a single raw material by ID"""
    try:
        doc = await db.raw_materials.find_one({"_id": ObjectId(material_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Material not found")
    
    if not doc:
        raise HTTPException(status_code=404, detail="Material not found")
    return serialize_doc(doc)


@router.put("/{material_id}")
async def update_raw_material(material_id: str, payload: dict, user: dict = Depends(get_admin_user)):
    """Update a raw material"""
    try:
        existing = await db.raw_materials.find_one({"_id": ObjectId(material_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Material not found")
    
    if not existing:
        raise HTTPException(status_code=404, detail="Material not found")

    update_fields = [
        "name", "description", "category", "unit_of_measure", "quantity_on_hand",
        "reserved_quantity", "reorder_level", "unit_cost", "supplier_name",
        "supplier_contact", "warehouse_id", "warehouse_location", "lead_time_days",
        "notes", "is_active"
    ]
    
    update_data = {k: payload[k] for k in update_fields if k in payload}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    # Convert numeric fields
    for field in ["quantity_on_hand", "reserved_quantity", "reorder_level", "unit_cost"]:
        if field in update_data:
            update_data[field] = float(update_data[field])
    if "lead_time_days" in update_data:
        update_data["lead_time_days"] = int(update_data["lead_time_days"])
    
    update_data["updated_at"] = datetime.now(timezone.utc)

    await db.raw_materials.update_one(
        {"_id": ObjectId(material_id)},
        {"$set": update_data}
    )
    
    updated = await db.raw_materials.find_one({"_id": ObjectId(material_id)})
    return serialize_doc(updated)


@router.delete("/{material_id}")
async def delete_raw_material(material_id: str, user: dict = Depends(get_admin_user)):
    """Soft delete a raw material"""
    try:
        result = await db.raw_materials.update_one(
            {"_id": ObjectId(material_id)},
            {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}}
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Material not found")
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Material not found")
    
    return {"message": "Material deactivated"}


@router.post("/{material_id}/adjust-stock")
async def adjust_material_stock(
    material_id: str,
    payload: dict,
    user: dict = Depends(get_admin_user)
):
    """Adjust raw material stock (add or remove)"""
    try:
        existing = await db.raw_materials.find_one({"_id": ObjectId(material_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Material not found")
    
    if not existing:
        raise HTTPException(status_code=404, detail="Material not found")
    
    adjustment_type = payload.get("type", "add")  # add, remove, set
    quantity = float(payload.get("quantity", 0))
    reason = payload.get("reason", "")
    
    current_qty = float(existing.get("quantity_on_hand", 0))
    
    if adjustment_type == "add":
        new_qty = current_qty + quantity
    elif adjustment_type == "remove":
        new_qty = max(0, current_qty - quantity)
    else:  # set
        new_qty = quantity
    
    now = datetime.now(timezone.utc)
    
    # Record the movement
    movement = {
        "material_id": material_id,
        "material_sku": existing.get("sku"),
        "material_name": existing.get("name"),
        "movement_type": adjustment_type,
        "quantity": quantity,
        "previous_qty": current_qty,
        "new_qty": new_qty,
        "reason": reason,
        "created_at": now,
        "created_by": user.get("email"),
    }
    await db.raw_material_movements.insert_one(movement)
    
    # Update the material
    await db.raw_materials.update_one(
        {"_id": ObjectId(material_id)},
        {"$set": {"quantity_on_hand": new_qty, "updated_at": now}}
    )
    
    updated = await db.raw_materials.find_one({"_id": ObjectId(material_id)})
    return serialize_doc(updated)


@router.get("/stats/summary")
async def get_material_stats(user: dict = Depends(get_admin_user)):
    """Get raw material statistics"""
    total = await db.raw_materials.count_documents({})
    active = await db.raw_materials.count_documents({"is_active": {"$ne": False}})
    
    # Count low stock
    pipeline = [
        {"$match": {"is_active": {"$ne": False}}},
        {"$project": {
            "available": {"$subtract": ["$quantity_on_hand", {"$ifNull": ["$reserved_quantity", 0]}]},
            "reorder_level": 1
        }},
        {"$match": {"$expr": {"$lte": ["$available", "$reorder_level"]}}}
    ]
    low_stock_result = await db.raw_materials.aggregate(pipeline).to_list(length=1000)
    low_stock = len(low_stock_result)
    
    # Get total value
    value_pipeline = [
        {"$match": {"is_active": {"$ne": False}}},
        {"$group": {
            "_id": None,
            "total_value": {"$sum": {"$multiply": ["$quantity_on_hand", "$unit_cost"]}}
        }}
    ]
    value_result = await db.raw_materials.aggregate(value_pipeline).to_list(length=1)
    total_value = value_result[0].get("total_value", 0) if value_result else 0
    
    return {
        "total_materials": total,
        "active_materials": active,
        "low_stock_count": low_stock,
        "total_inventory_value": total_value,
    }
