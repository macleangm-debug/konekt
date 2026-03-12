from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import jwt
import os

router = APIRouter(prefix="/api/admin/inventory-variants", tags=["Inventory Variants"])
security = HTTPBearer(auto_error=False)

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'konekt')]

JWT_SECRET = os.environ.get('JWT_SECRET', 'konekt-secret-key-2024')


def serialize_doc(doc):
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
        if role not in ["admin", "sales", "marketing", "production"]:
            raise HTTPException(status_code=403, detail="Admin access required")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.get("")
async def list_variants(user: dict = Depends(get_admin_user), product_id: str = None):
    """List all inventory variants"""
    query = {}
    if product_id:
        query["product_id"] = product_id
    
    docs = await db.inventory_variants.find(query).sort("sku", 1).to_list(length=500)
    return [serialize_doc(doc) for doc in docs]


@router.post("")
async def create_variant(payload: dict, user: dict = Depends(get_admin_user)):
    """Create a new inventory variant linked to a product"""
    required_fields = ["product_id", "sku", "variant_attributes", "stock_on_hand"]
    for field in required_fields:
        if field not in payload:
            raise HTTPException(status_code=400, detail=f"Missing field: {field}")

    # Verify product exists
    product = await db.products.find_one({"id": payload["product_id"]})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Check for duplicate SKU
    existing_sku = await db.inventory_variants.find_one({"sku": payload["sku"]})
    if existing_sku:
        raise HTTPException(status_code=400, detail="SKU already exists")

    now = datetime.utcnow()
    doc = {
        "product_id": payload["product_id"],
        "product_title": product.get("name") or product.get("title"),
        "sku": payload["sku"],
        "variant_attributes": payload.get("variant_attributes", {}),
        "stock_on_hand": int(payload.get("stock_on_hand", 0)),
        "reserved_stock": int(payload.get("reserved_stock", 0)),
        "warehouse_location": payload.get("warehouse_location"),
        "unit_cost": float(payload.get("unit_cost", 0)),
        "selling_price": float(payload.get("selling_price", product.get("base_price", 0))),
        "currency": payload.get("currency", "TZS"),
        "reorder_level": int(payload.get("reorder_level", 10)),
        "is_active": payload.get("is_active", True),
        "created_at": now,
        "updated_at": now,
    }
    result = await db.inventory_variants.insert_one(doc)
    created = await db.inventory_variants.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.get("/product/{product_id}")
async def get_variants_for_product(product_id: str, user: dict = Depends(get_admin_user)):
    """Get all variants for a specific product"""
    docs = await db.inventory_variants.find({"product_id": product_id}).sort("sku", 1).to_list(length=300)
    return [serialize_doc(doc) for doc in docs]


@router.get("/{variant_id}")
async def get_variant(variant_id: str, user: dict = Depends(get_admin_user)):
    """Get a single variant by ID"""
    doc = await db.inventory_variants.find_one({"_id": ObjectId(variant_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Variant not found")
    return serialize_doc(doc)


@router.put("/{variant_id}")
async def update_variant(variant_id: str, payload: dict, user: dict = Depends(get_admin_user)):
    """Update an inventory variant"""
    existing = await db.inventory_variants.find_one({"_id": ObjectId(variant_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Variant not found")

    update_fields = ["stock_on_hand", "reserved_stock", "warehouse_location", 
                     "unit_cost", "selling_price", "reorder_level", "is_active", "variant_attributes"]
    
    update_data = {k: payload[k] for k in update_fields if k in payload}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    update_data["updated_at"] = datetime.utcnow()

    await db.inventory_variants.update_one(
        {"_id": ObjectId(variant_id)},
        {"$set": update_data}
    )
    
    updated = await db.inventory_variants.find_one({"_id": ObjectId(variant_id)})
    return serialize_doc(updated)


@router.delete("/{variant_id}")
async def delete_variant(variant_id: str, user: dict = Depends(get_admin_user)):
    """Soft delete a variant"""
    result = await db.inventory_variants.update_one(
        {"_id": ObjectId(variant_id)},
        {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Variant not found")
    
    return {"message": "Variant deleted"}


@router.get("/low-stock/alerts")
async def get_low_stock_alerts(user: dict = Depends(get_admin_user)):
    """Get variants that are below reorder level"""
    pipeline = [
        {"$match": {"is_active": True}},
        {"$project": {
            "id": {"$toString": "$_id"},
            "product_id": 1,
            "product_title": 1,
            "sku": 1,
            "variant_attributes": 1,
            "stock_on_hand": 1,
            "reserved_stock": 1,
            "reorder_level": 1,
            "available": {"$subtract": ["$stock_on_hand", "$reserved_stock"]},
            "_id": 0
        }},
        {"$match": {"$expr": {"$lte": ["$available", "$reorder_level"]}}},
        {"$sort": {"available": 1}}
    ]
    
    results = await db.inventory_variants.aggregate(pipeline).to_list(length=100)
    return results
