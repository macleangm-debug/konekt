from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
import uuid

router = APIRouter(prefix="/api/admin/deliveries", tags=["Admin Deliveries"])

class DeliveryStatusUpdate(BaseModel):
    status: str

@router.get("")
async def list_deliveries(
    request: Request,
    status: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
):
    """List all deliveries for admin/courier partner view"""
    db = request.app.mongodb
    
    query = {}
    if status:
        query["status"] = status
    
    # Get deliveries from dedicated collection
    deliveries = await db.deliveries.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    
    # Also check quotes_v2 for pending deliveries (quotes with delivery_address)
    if not deliveries or len(deliveries) < limit:
        quote_query = {"delivery_address": {"$exists": True}}
        if status:
            # Map delivery status to quote status
            if status == "pending":
                quote_query["status"] = {"$in": ["pending", "approved"]}
            elif status == "delivered":
                quote_query["status"] = "delivered"
        
        quotes = await db.quotes_v2.find(quote_query, {"_id": 0}).sort("created_at", -1).to_list(limit)
        
        # Convert quotes to delivery format
        for quote in quotes:
            if not any(d.get("source_id") == quote["id"] for d in deliveries):
                deliveries.append({
                    "id": quote["id"],
                    "source_type": "quote",
                    "source_id": quote["id"],
                    "order_number": None,
                    "quote_number": quote.get("quote_number"),
                    "customer_id": quote.get("customer_id"),
                    "customer_name": quote.get("customer_name"),
                    "customer_email": quote.get("customer_email"),
                    "customer_phone": quote.get("customer_phone"),
                    "delivery_address": quote.get("delivery_address"),
                    "delivery_notes": quote.get("delivery_notes"),
                    "status": "pending" if quote.get("status") in ["pending", "approved"] else quote.get("status"),
                    "created_at": quote.get("created_at"),
                })
    
    return deliveries

@router.get("/{delivery_id}")
async def get_delivery(delivery_id: str, request: Request):
    """Get a single delivery"""
    db = request.app.mongodb
    
    # Check deliveries collection first
    delivery = await db.deliveries.find_one({"id": delivery_id}, {"_id": 0})
    if delivery:
        return delivery
    
    # Check quotes_v2
    quote = await db.quotes_v2.find_one({"id": delivery_id}, {"_id": 0})
    if quote and quote.get("delivery_address"):
        return {
            "id": quote["id"],
            "source_type": "quote",
            "source_id": quote["id"],
            "order_number": None,
            "quote_number": quote.get("quote_number"),
            "customer_id": quote.get("customer_id"),
            "customer_name": quote.get("customer_name"),
            "customer_email": quote.get("customer_email"),
            "customer_phone": quote.get("customer_phone"),
            "delivery_address": quote.get("delivery_address"),
            "delivery_notes": quote.get("delivery_notes"),
            "status": "pending" if quote.get("status") in ["pending", "approved"] else quote.get("status"),
            "created_at": quote.get("created_at"),
        }
    
    raise HTTPException(status_code=404, detail="Delivery not found")

@router.patch("/{delivery_id}/status")
async def update_delivery_status(delivery_id: str, data: DeliveryStatusUpdate, request: Request):
    """Update delivery status"""
    db = request.app.mongodb
    
    valid_statuses = ["pending", "ready_for_pickup", "in_transit", "delivered", "cancelled"]
    if data.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    # Check deliveries collection first
    result = await db.deliveries.update_one(
        {"id": delivery_id},
        {"$set": {"status": data.status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count > 0:
        return {"id": delivery_id, "status": data.status, "message": "Status updated"}
    
    # Check if it's a quote and create a delivery record
    quote = await db.quotes_v2.find_one({"id": delivery_id}, {"_id": 0})
    if quote and quote.get("delivery_address"):
        # Create delivery record from quote
        delivery_doc = {
            "id": str(uuid.uuid4()),
            "source_type": "quote",
            "source_id": delivery_id,
            "order_number": None,
            "quote_number": quote.get("quote_number"),
            "customer_id": quote.get("customer_id"),
            "customer_name": quote.get("customer_name"),
            "customer_email": quote.get("customer_email"),
            "customer_phone": quote.get("customer_phone"),
            "delivery_address": quote.get("delivery_address"),
            "delivery_notes": quote.get("delivery_notes"),
            "status": data.status,
            "created_at": quote.get("created_at"),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.deliveries.insert_one(delivery_doc)
        
        # Update quote status if delivered
        if data.status == "delivered":
            await db.quotes_v2.update_one({"id": delivery_id}, {"$set": {"status": "delivered"}})
        
        return {"id": delivery_doc["id"], "status": data.status, "message": "Delivery created and status updated"}
    
    raise HTTPException(status_code=404, detail="Delivery not found")

@router.post("")
async def create_delivery(request: Request):
    """Create a new delivery manually (for direct shipments without quotes)"""
    db = request.app.mongodb
    
    body = await request.json()
    
    delivery_id = str(uuid.uuid4())
    delivery_doc = {
        "id": delivery_id,
        "source_type": body.get("source_type", "manual"),
        "source_id": body.get("source_id"),
        "order_number": body.get("order_number"),
        "quote_number": body.get("quote_number"),
        "customer_id": body.get("customer_id"),
        "customer_name": body.get("customer_name"),
        "customer_email": body.get("customer_email"),
        "customer_phone": body.get("customer_phone"),
        "delivery_address": body.get("delivery_address"),
        "delivery_notes": body.get("delivery_notes"),
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.deliveries.insert_one(delivery_doc)
    return {"id": delivery_id, "message": "Delivery created successfully"}
