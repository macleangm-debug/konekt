"""
Konekt Service Orders - Routes for creative service orders
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(tags=["Service Orders"])

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


class ServiceCustomer(BaseModel):
    business_name: str
    contact_name: str
    email: EmailStr
    phone: Optional[str] = None


class ServiceBrief(BaseModel):
    industry: Optional[str] = None
    project_goal: str
    target_audience: str
    preferred_style: Optional[str] = None
    preferred_colors: List[str] = []
    content_text: Optional[str] = None
    notes: Optional[str] = None


class UploadedFileMeta(BaseModel):
    filename: str
    size: int
    type: Optional[str] = None


class ServiceOrderCreate(BaseModel):
    service_id: Optional[str] = None
    service_name: str
    package_name: Optional[str] = None
    package_price: float
    delivery_days: int
    customer: ServiceCustomer
    brief: ServiceBrief
    uploaded_files: List[UploadedFileMeta] = []


class ServiceOrderResponse(BaseModel):
    order_id: str
    status: str
    message: str


# Service order statuses
SERVICE_STATUSES = [
    "pending",
    "brief_review",
    "in_design",
    "draft_sent",
    "revision_requested",
    "approved",
    "final_delivery",
    "completed",
]


@router.post("/api/service-orders", response_model=ServiceOrderResponse)
async def create_service_order(payload: ServiceOrderCreate):
    """
    Create a new service order (design project).
    """
    # Generate order ID
    order_id = f"KS-{uuid.uuid4().hex[:10].upper()}"
    now = datetime.now(timezone.utc)

    # Build order document
    order_doc = {
        "order_id": order_id,
        "order_type": "creative-service",
        "service_id": payload.service_id,
        "service_name": payload.service_name,
        "package_name": payload.package_name,
        "package_price": payload.package_price,
        "delivery_days": payload.delivery_days,
        "customer": payload.customer.model_dump(),
        "brief": payload.brief.model_dump(),
        "uploaded_files": [f.model_dump() for f in payload.uploaded_files],
        "status": "pending",
        "status_history": [
            {
                "status": "pending",
                "note": "Service order submitted by customer",
                "timestamp": now.isoformat(),
            }
        ],
        "designer_notes": [],
        "revision_count": 0,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }

    # Insert into database
    await db.service_orders.insert_one(order_doc)

    return ServiceOrderResponse(
        order_id=order_id,
        status="pending",
        message="Service order created successfully. Our team will review your brief within 24 hours.",
    )


@router.get("/api/service-orders")
async def list_service_orders(status: Optional[str] = None, limit: int = 50):
    """
    List service orders (admin).
    """
    query = {"order_type": "creative-service"}
    if status:
        query["status"] = status

    orders = await db.service_orders.find(
        query, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(length=limit)
    
    return {"orders": orders, "count": len(orders)}


@router.get("/api/service-orders/{order_id}")
async def get_service_order(order_id: str):
    """
    Get a specific service order.
    """
    order = await db.service_orders.find_one(
        {"order_id": order_id}, {"_id": 0}
    )
    
    if not order:
        raise HTTPException(status_code=404, detail="Service order not found")
    
    return order


class StatusUpdateRequest(BaseModel):
    status: str
    note: Optional[str] = None


@router.patch("/api/service-orders/{order_id}/status")
async def update_service_order_status(order_id: str, payload: StatusUpdateRequest):
    """
    Update service order status (admin).
    """
    if payload.status not in SERVICE_STATUSES:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid status. Must be one of: {', '.join(SERVICE_STATUSES)}"
        )
    
    now = datetime.now(timezone.utc)
    
    result = await db.service_orders.update_one(
        {"order_id": order_id},
        {
            "$set": {
                "status": payload.status,
                "updated_at": now.isoformat(),
            },
            "$push": {
                "status_history": {
                    "status": payload.status,
                    "note": payload.note or f"Status updated to {payload.status}",
                    "timestamp": now.isoformat(),
                }
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Service order not found")
    
    return {
        "order_id": order_id,
        "status": payload.status,
        "message": "Status updated successfully"
    }


class DesignerNoteRequest(BaseModel):
    note: str
    is_customer_visible: bool = False


@router.post("/api/service-orders/{order_id}/notes")
async def add_designer_note(order_id: str, payload: DesignerNoteRequest):
    """
    Add a designer note to a service order.
    """
    now = datetime.now(timezone.utc)
    
    result = await db.service_orders.update_one(
        {"order_id": order_id},
        {
            "$push": {
                "designer_notes": {
                    "note": payload.note,
                    "is_customer_visible": payload.is_customer_visible,
                    "timestamp": now.isoformat(),
                }
            },
            "$set": {
                "updated_at": now.isoformat(),
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Service order not found")
    
    return {"message": "Note added successfully"}


@router.get("/api/service-orders/customer/{email}")
async def get_customer_service_orders(email: str):
    """
    Get service orders for a specific customer by email.
    """
    orders = await db.service_orders.find(
        {"customer.email": email}, {"_id": 0}
    ).sort("created_at", -1).to_list(length=50)
    
    return {"orders": orders, "count": len(orders)}


@router.get("/api/admin/service-orders/stats")
async def get_service_order_stats():
    """
    Get service order statistics for admin dashboard.
    """
    pipeline = [
        {"$match": {"order_type": "creative-service"}},
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1},
            "total_value": {"$sum": "$package_price"}
        }}
    ]
    
    stats_cursor = db.service_orders.aggregate(pipeline)
    stats = await stats_cursor.to_list(length=100)
    
    total_orders = sum(s["count"] for s in stats)
    total_revenue = sum(s["total_value"] for s in stats)
    
    by_status = {s["_id"]: {"count": s["count"], "value": s["total_value"]} for s in stats}
    
    return {
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "by_status": by_status,
        "statuses": SERVICE_STATUSES
    }
