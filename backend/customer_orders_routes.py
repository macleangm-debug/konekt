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
from customer_timeline_mapping_service import get_customer_timeline

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
        if "id" not in doc or not doc["id"]:
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
    order_id = order.get("id")

    # Sales contact (safe for customer)
    sales_assignment = await db.sales_assignments.find_one({"order_id": order_id}, {"_id": 0})
    sales_id = None
    invalid_ids = {"unassigned", "auto-sales", ""}
    if sales_assignment and sales_assignment.get("sales_owner_id") and sales_assignment["sales_owner_id"] not in invalid_ids:
        sales_id = sales_assignment["sales_owner_id"]
    if not sales_id and order.get("assigned_sales_id") and order["assigned_sales_id"] not in invalid_ids:
        sales_id = order["assigned_sales_id"]
    if sales_id:
        sales_user = await db.users.find_one({"id": sales_id}, {"_id": 0})
        if sales_user:
            order["sales"] = {
                "name": sales_user.get("full_name"),
                "email": sales_user.get("email"),
                "phone": sales_user.get("phone"),
            }
            order["assigned_sales_name"] = sales_user.get("full_name", "")
            order["sales_owner_name"] = sales_user.get("full_name", "")
    # Fallback: if no sales user found but assignment has name, use it
    if not order.get("sales") and (sales_assignment or order.get("assigned_sales_name")):
        name = (sales_assignment or {}).get("sales_owner_name") or order.get("assigned_sales_name") or ""
        if name and name not in ("Unassigned", "unassigned", "auto-sales"):
            order["sales"] = {"name": name, "email": "", "phone": ""}
            order["assigned_sales_name"] = name
            order["sales_owner_name"] = name

    # Determine internal status from vendor orders (most advanced status)
    internal_status = order.get("status") or "processing"
    vendor_orders = await db.vendor_orders.find({"order_id": order_id}).to_list(10)
    if vendor_orders:
        vo_statuses = [vo.get("status", "processing") for vo in vendor_orders]
        # Use the most advanced vendor status
        status_priority = ["completed", "ready", "quality_check", "in_progress", "work_scheduled", "assigned", "accepted", "ready_to_fulfill", "processing"]
        for sp in status_priority:
            if sp in vo_statuses:
                internal_status = sp
                break

    # Customer-safe timeline
    source_type = order.get("type") or order.get("source_type") or "product"
    timeline_data = get_customer_timeline(source_type, internal_status)
    order["timeline_steps"] = timeline_data["steps"]
    order["timeline_index"] = timeline_data["current_index"]
    order["customer_status"] = timeline_data["current_label"]
    order["status_description"] = timeline_data["description"]

    # DO NOT expose vendor identity to customer
    order.pop("vendor_ids", None)
    order.pop("vendor", None)

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
