"""
Public Product Variant Routes
Public-facing endpoints for product variants (no auth required)
"""
from fastapi import APIRouter
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/products-public", tags=["Public Product Variants"])

# Database connection
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
    return doc


@router.get("/{product_id}/variants")
async def get_public_variants(product_id: str):
    """Get public variants for a product (customer-facing)"""
    docs = await db.inventory_variants.find({"product_id": product_id}).sort("sku", 1).to_list(length=200)
    
    public_docs = []
    for doc in docs:
        item = serialize_doc(doc)
        # Calculate available stock (on_hand minus reserved)
        item["available_stock"] = max(
            int(item.get("stock_on_hand", 0) or 0) - int(item.get("reserved_stock", 0) or 0),
            0,
        )
        public_docs.append(item)
    
    return public_docs
