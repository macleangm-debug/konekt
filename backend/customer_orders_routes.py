"""
Customer Orders Routes
Get orders for the authenticated customer, enriched with sales assignment info
"""
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
import os
import jwt

router = APIRouter(prefix="/api/customer/orders", tags=["Customer Orders"])
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
        if "id" not in doc:
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


async def _enrich_with_sales(order_doc):
    """Attach sales contact info to an order"""
    order_id = order_doc.get("id")
    sa = await db.sales_assignments.find_one(
        {"order_id": order_id},
        {"_id": 0, "sales_owner_id": 1, "sales_owner_name": 1}
    )
    if sa and sa.get("sales_owner_id"):
        sales_user = await db.users.find_one(
            {"id": sa["sales_owner_id"]},
            {"_id": 0, "id": 1, "name": 1, "email": 1, "phone": 1}
        )
        order_doc["sales"] = sales_user or {
            "name": sa.get("sales_owner_name", "Assigned Sales"),
            "email": "", "phone": "",
        }
    return order_doc


@router.get("")
async def get_my_orders(user: dict = Depends(get_user)):
    """Get orders for the current user"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user_email = user.get("email")
    user_id = user.get("id")

    orders = await db.orders.find({
        "$or": [
            {"user_id": user_id},
            {"customer_id": user_id},
            {"customer_email": user_email},
            {"customer.email": user_email}
        ]
    }).sort("created_at", -1).to_list(length=200)

    result = []
    for o in orders:
        doc = serialize_doc(o)
        doc = await _enrich_with_sales(doc)
        result.append(doc)
    return result


@router.get("/{order_id}")
async def get_order_detail(order_id: str, user: dict = Depends(get_user)):
    """Get a specific order with full detail for the current user"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user_email = user.get("email")
    user_id = user.get("id")

    match_filter = {
        "$or": [
            {"user_id": user_id},
            {"customer_id": user_id},
            {"customer_email": user_email},
            {"customer.email": user_email}
        ]
    }

    # Try by id field, then order_number
    order = await db.orders.find_one({"id": order_id, **match_filter})
    if not order:
        order = await db.orders.find_one({"order_number": order_id, **match_filter})

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    doc = serialize_doc(order)
    doc = await _enrich_with_sales(doc)

    # Attach events
    events = await db.order_events.find(
        {"order_id": doc["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(20)
    doc["events"] = events

    return doc
