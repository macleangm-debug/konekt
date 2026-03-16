"""
Inventory Ledger Routes
Provides movement history for individual SKUs
"""
from datetime import datetime
from fastapi import APIRouter
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/inventory-ledger", tags=["Inventory Ledger"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


def serialize_doc(doc):
    if doc is None:
        return None
    doc = dict(doc)
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    for key, value in doc.items():
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
    return doc


@router.get("/{sku}")
async def get_inventory_ledger(sku: str, limit: int = 500):
    """Get movement history for a specific SKU."""
    docs = await db.stock_movements.find({"sku": sku}).sort("created_at", -1).to_list(length=limit)
    return [serialize_doc(doc) for doc in docs]


@router.get("")
async def get_all_movements(
    sku: str = None,
    movement_type: str = None,
    direction: str = None,
    warehouse_id: str = None,
    limit: int = 500
):
    """Get all stock movements with optional filters."""
    query = {}
    if sku:
        query["sku"] = sku
    if movement_type:
        query["movement_type"] = movement_type
    if direction:
        query["direction"] = direction
    if warehouse_id:
        query["warehouse_id"] = warehouse_id
    
    docs = await db.stock_movements.find(query).sort("created_at", -1).to_list(length=limit)
    return [serialize_doc(doc) for doc in docs]
