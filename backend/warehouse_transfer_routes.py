"""
Konekt Warehouse Transfer Routes
Handles stock transfers between warehouses
"""
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from bson import ObjectId
import os
import jwt
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/warehouse-transfers", tags=["Warehouse Transfers"])
security = HTTPBearer(auto_error=False)

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

JWT_SECRET = os.environ.get('JWT_SECRET', 'konekt-secret-key-2024')


def serialize_doc(doc):
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
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.get("")
async def list_transfers(user: dict = Depends(get_admin_user)):
    """List all warehouse transfers"""
    docs = await db.warehouse_transfers.find({}).sort("created_at", -1).to_list(length=500)
    return [serialize_doc(doc) for doc in docs]


@router.post("")
async def create_transfer(payload: dict, user: dict = Depends(get_admin_user)):
    """Create a new warehouse transfer"""
    variant_id = payload.get("variant_id")
    if not variant_id:
        raise HTTPException(status_code=400, detail="variant_id is required")
    
    try:
        variant = await db.inventory_variants.find_one({"_id": ObjectId(variant_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Invalid variant ID")
    
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")

    quantity = int(payload.get("quantity", 0))
    if quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than zero")

    stock_on_hand = int(variant.get("stock_on_hand", 0))
    if stock_on_hand < quantity:
        raise HTTPException(status_code=400, detail=f"Insufficient stock for transfer (available: {stock_on_hand})")

    now = datetime.now(timezone.utc)
    transfer = {
        "variant_id": variant_id,
        "sku": variant.get("sku"),
        "product_title": variant.get("product_title"),
        "from_warehouse": payload.get("from_warehouse"),
        "to_warehouse": payload.get("to_warehouse"),
        "quantity": quantity,
        "status": "completed",
        "notes": payload.get("notes", ""),
        "created_at": now,
        "updated_at": now,
        "created_by": user.get("email"),
    }

    result = await db.warehouse_transfers.insert_one(transfer)

    # Record outbound movement
    await db.stock_movements.insert_one({
        "movement_type": "transfer_out",
        "variant_id": variant_id,
        "sku": variant.get("sku"),
        "warehouse": payload.get("from_warehouse"),
        "quantity": -quantity,
        "reference_type": "warehouse_transfer",
        "reference_id": str(result.inserted_id),
        "created_at": now,
    })

    # Record inbound movement
    await db.stock_movements.insert_one({
        "movement_type": "transfer_in",
        "variant_id": variant_id,
        "sku": variant.get("sku"),
        "warehouse": payload.get("to_warehouse"),
        "quantity": quantity,
        "reference_type": "warehouse_transfer",
        "reference_id": str(result.inserted_id),
        "created_at": now,
    })

    created = await db.warehouse_transfers.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.get("/{transfer_id}")
async def get_transfer(transfer_id: str, user: dict = Depends(get_admin_user)):
    """Get a single transfer"""
    try:
        doc = await db.warehouse_transfers.find_one({"_id": ObjectId(transfer_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Transfer not found")
    
    if not doc:
        raise HTTPException(status_code=404, detail="Transfer not found")
    return serialize_doc(doc)
