"""
Customer Orders Routes
Get orders for the authenticated customer
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from bson import ObjectId
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


async def enrich_order(order):
    order = serialize_doc(order)
    sales_assignment = await db.sales_assignments.find_one({"order_id": order.get("id")}, {"_id": 0})
    if sales_assignment:
        order["sales_owner_name"] = sales_assignment.get("sales_owner_name")
        if sales_assignment.get("sales_owner_id"):
            sales_user = await db.users.find_one({"id": sales_assignment.get("sales_owner_id")}, {"_id": 0})
            if sales_user:
                order["sales"] = {
                    "name": sales_user.get("full_name") or sales_assignment.get("sales_owner_name"),
                    "email": sales_user.get("email"),
                    "phone": sales_user.get("phone") or sales_user.get("mobile"),
                }

    vendor_id = (order.get("vendor_ids") or [None])[0]
    if vendor_id:
        partner = await db.partners.find_one({"_id": ObjectId(vendor_id)}) if ObjectId.is_valid(str(vendor_id)) else await db.partners.find_one({"id": vendor_id})
        if partner:
            order["vendor"] = {
                "name": partner.get("name"),
                "phone": partner.get("phone"),
                "email": partner.get("email"),
            }
    return order


@router.get("")
async def get_my_orders(user: dict = Depends(get_user)):
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
    }).sort("created_at", -1).to_list(length=100)
    return [await enrich_order(o) for o in orders]


@router.get("/{order_id}")
async def get_order_detail(order_id: str, user: dict = Depends(get_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user_email = user.get("email")
    user_id = user.get("id")
    base_query = {
        "$or": [
            {"user_id": user_id},
            {"customer_id": user_id},
            {"customer_email": user_email},
            {"customer.email": user_email}
        ]
    }

    order = None
    try:
        order = await db.orders.find_one({"_id": ObjectId(order_id), **base_query})
    except Exception:
        order = await db.orders.find_one({"order_number": order_id, **base_query})
    if not order:
        order = await db.orders.find_one({"id": order_id, **base_query})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    return await enrich_order(order)
