"""
Customer Order Routes - Public-facing order creation and retrieval
Supports guest checkout without authentication
"""
from datetime import datetime
from uuid import uuid4
import os

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(tags=["Customer Orders"])

# Database connection (same pattern as server.py)
client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
db = client[os.environ.get('DB_NAME', 'konekt')]


class OrderLineItem(BaseModel):
    description: str
    quantity: int
    unit_price: float
    total: float
    customization_summary: Optional[str] = None


class GuestOrderCreate(BaseModel):
    customer_name: str
    customer_email: EmailStr
    customer_phone: Optional[str] = None
    customer_company: Optional[str] = None
    delivery_address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    notes: Optional[str] = None
    line_items: List[OrderLineItem]
    subtotal: float
    tax: float = 0.0
    discount: float = 0.0
    total: float


def serialize_doc(doc):
    """Serialize MongoDB document for JSON response"""
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


@router.post("/api/guest/orders")
async def create_guest_order(payload: GuestOrderCreate):
    """Create a new guest order (no authentication required)"""
    now = datetime.utcnow()

    order_number = f"ORD-{now.strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}"

    doc = payload.model_dump()
    doc["order_number"] = order_number
    doc["status"] = "pending"
    doc["current_status"] = "pending"
    doc["payment_status"] = "unpaid"
    doc["status_history"] = [
        {
            "status": "pending",
            "note": "Order submitted by customer",
            "timestamp": now,
        }
    ]
    doc["is_guest_order"] = True
    doc["created_at"] = now
    doc["updated_at"] = now

    result = await db.orders.insert_one(doc)

    return {
        "id": str(result.inserted_id),
        "order_id": str(result.inserted_id),
        "order_number": order_number,
        "status": "pending",
        "message": "Order created successfully",
    }


@router.get("/api/guest/orders/{order_id}")
async def get_guest_order(order_id: str):
    """Get guest order details by ID (public access)"""
    try:
        doc = await db.orders.find_one({"_id": ObjectId(order_id)})
    except Exception:
        doc = await db.orders.find_one({"order_number": order_id})
    
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")

    return serialize_doc(doc)


@router.get("/api/orders/track/{order_id}")
async def track_order(order_id: str):
    """Track order status (public access)"""
    try:
        doc = await db.orders.find_one({"_id": ObjectId(order_id)})
    except Exception:
        doc = await db.orders.find_one({"order_number": order_id})
    
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")

    return serialize_doc(doc)
