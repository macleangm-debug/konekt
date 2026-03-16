"""
Reorder Routes - Duplicate past orders for repeat business
"""
import os
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/reorders", tags=["Reorders"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


def serialize_doc(doc):
    if doc is None:
        return None
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    for key, value in doc.items():
        if isinstance(value, ObjectId):
            doc[key] = str(value)
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
    return doc


@router.post("/order/{order_id}")
async def repeat_order(order_id: str):
    """Duplicate a past order for repeat business"""
    original = await db.orders.find_one({"_id": ObjectId(order_id)})
    if not original:
        raise HTTPException(status_code=404, detail="Order not found")

    # Generate new order number
    last_order = await db.orders.find_one(sort=[("created_at", -1)])
    last_num = 1000
    if last_order and last_order.get("order_number"):
        try:
            last_num = int(last_order["order_number"].replace("ORD-", ""))
        except (ValueError, AttributeError):
            pass
    new_order_number = f"ORD-{last_num + 1}"

    new_doc = {
        "order_number": new_order_number,
        "customer_id": original.get("customer_id"),
        "customer_email": original.get("customer_email"),
        "customer_name": original.get("customer_name"),
        "customer_company": original.get("customer_company"),
        "customer_phone": original.get("customer_phone"),
        "line_items": original.get("line_items", []),
        "items": original.get("items", []),
        "subtotal": original.get("subtotal", 0),
        "tax": original.get("tax", 0),
        "discount": 0,
        "total": original.get("subtotal", 0),
        "total_amount": original.get("subtotal", 0),
        "status": "pending",
        "source_type": "repeat_order",
        "source_order_id": str(original["_id"]),
        "customer_country_code": original.get("customer_country_code"),
        "country_code": original.get("country_code"),
        "customer_region": original.get("customer_region"),
        "region": original.get("region"),
        "delivery_address": original.get("delivery_address"),
        "shipping_address": original.get("shipping_address"),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    result = await db.orders.insert_one(new_doc)
    created = await db.orders.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.get("/customer/{customer_id}/history")
async def get_customer_order_history(customer_id: str, limit: int = 20):
    """Get a customer's past orders for repeat selection"""
    docs = await db.orders.find(
        {"customer_id": customer_id, "status": {"$in": ["completed", "delivered"]}}
    ).sort("created_at", -1).limit(limit).to_list(length=limit)
    return [serialize_doc(doc) for doc in docs]
