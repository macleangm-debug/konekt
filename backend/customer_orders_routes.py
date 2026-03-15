"""
Customer Orders Routes
Get orders for the authenticated customer
"""
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
import os
import jwt

router = APIRouter(prefix="/api/customer/orders", tags=["Customer Orders"])
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
async def get_my_orders(user: dict = Depends(get_user)):
    """Get orders for the current user"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    user_email = user.get("email")
    user_id = user.get("id")
    
    # Find orders by user_id or email
    orders = await db.orders.find({
        "$or": [
            {"user_id": user_id},
            {"customer_email": user_email},
            {"customer.email": user_email}
        ]
    }).sort("created_at", -1).to_list(length=100)
    
    return [serialize_doc(o) for o in orders]


@router.get("/{order_id}")
async def get_order_detail(order_id: str, user: dict = Depends(get_user)):
    """Get a specific order for the current user"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    user_email = user.get("email")
    user_id = user.get("id")
    
    # Try to find by ObjectId first, then by order_number
    order = None
    try:
        order = await db.orders.find_one({
            "_id": ObjectId(order_id),
            "$or": [
                {"user_id": user_id},
                {"customer_email": user_email},
                {"customer.email": user_email}
            ]
        })
    except Exception:
        # Try finding by order_number
        order = await db.orders.find_one({
            "order_number": order_id,
            "$or": [
                {"user_id": user_id},
                {"customer_email": user_email},
                {"customer.email": user_email}
            ]
        })
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return serialize_doc(order)
