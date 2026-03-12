"""
Konekt Stock Movement Routes
Track all stock movements (transfers, reserves, deductions)
"""
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
import jwt
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/stock-movements", tags=["Stock Movements"])
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
async def list_stock_movements(
    user: dict = Depends(get_admin_user),
    sku: Optional[str] = None,
    variant_id: Optional[str] = None,
    movement_type: Optional[str] = None,
    limit: int = Query(default=500, le=1000)
):
    """List stock movements with optional filters"""
    query = {}
    if sku:
        query["sku"] = sku
    if variant_id:
        query["variant_id"] = variant_id
    if movement_type:
        query["movement_type"] = movement_type

    docs = await db.stock_movements.find(query).sort("created_at", -1).to_list(length=limit)
    return [serialize_doc(doc) for doc in docs]


@router.get("/by-variant/{variant_id}")
async def get_variant_movements(variant_id: str, user: dict = Depends(get_admin_user)):
    """Get all movements for a specific variant"""
    docs = await db.stock_movements.find({"variant_id": variant_id}).sort("created_at", -1).to_list(length=500)
    return [serialize_doc(doc) for doc in docs]


@router.get("/stats")
async def get_movement_stats(user: dict = Depends(get_admin_user)):
    """Get stock movement statistics"""
    pipeline = [
        {"$group": {
            "_id": "$movement_type",
            "count": {"$sum": 1},
            "total_quantity": {"$sum": "$quantity"}
        }}
    ]
    
    results = await db.stock_movements.aggregate(pipeline).to_list(length=100)
    
    stats = {
        "by_type": {r["_id"]: {"count": r["count"], "total_quantity": r["total_quantity"]} for r in results},
        "total_movements": sum(r["count"] for r in results)
    }
    return stats
