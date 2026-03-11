"""
Konekt Customer Admin Routes
CRUD operations for B2B customer management with payment terms
"""
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from bson import ObjectId
import os
from motor.motor_asyncio import AsyncIOMotorClient

from customer_models import CustomerCreate, CustomerUpdate

router = APIRouter(prefix="/api/admin/customers", tags=["Customers"])

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


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


@router.post("")
async def create_customer(payload: CustomerCreate):
    """Create a new customer with payment terms"""
    now = datetime.now(timezone.utc)

    # Check for existing customer
    existing = await db.customers.find_one({"email": payload.email})
    if existing:
        raise HTTPException(status_code=400, detail="Customer with this email already exists")

    doc = payload.model_dump()
    doc["created_at"] = now
    doc["updated_at"] = now

    result = await db.customers.insert_one(doc)
    created = await db.customers.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.get("")
async def list_customers(
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    limit: int = Query(default=500, le=1000)
):
    """List all customers with optional filters"""
    query = {}
    if is_active is not None:
        query["is_active"] = is_active
    if search:
        query["$or"] = [
            {"company_name": {"$regex": search, "$options": "i"}},
            {"contact_name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]
    
    docs = await db.customers.find(query).sort("created_at", -1).to_list(length=limit)
    return [serialize_doc(doc) for doc in docs]


@router.get("/{customer_id}")
async def get_customer(customer_id: str):
    """Get a specific customer by ID"""
    try:
        doc = await db.customers.find_one({"_id": ObjectId(customer_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid customer ID format")
    
    if not doc:
        raise HTTPException(status_code=404, detail="Customer not found")
    return serialize_doc(doc)


@router.get("/by-email/{email}")
async def get_customer_by_email(email: str):
    """Get a customer by email address"""
    doc = await db.customers.find_one({"email": email})
    if not doc:
        raise HTTPException(status_code=404, detail="Customer not found")
    return serialize_doc(doc)


@router.patch("/{customer_id}")
async def update_customer(customer_id: str, payload: CustomerUpdate):
    """Update customer details including payment terms"""
    # Build update dict excluding None values
    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    update_data["updated_at"] = datetime.now(timezone.utc)

    try:
        result = await db.customers.update_one(
            {"_id": ObjectId(customer_id)},
            {"$set": update_data}
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid customer ID format")

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")

    updated = await db.customers.find_one({"_id": ObjectId(customer_id)})
    return serialize_doc(updated)


@router.delete("/{customer_id}")
async def delete_customer(customer_id: str):
    """Soft delete a customer (set is_active to False)"""
    try:
        result = await db.customers.update_one(
            {"_id": ObjectId(customer_id)},
            {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}}
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid customer ID format")
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    return {"message": "Customer deactivated successfully"}
