"""
Customer Order Routes - Public-facing order creation and retrieval
Supports guest checkout without authentication
Includes affiliate attribution and campaign discount application
"""
from datetime import datetime
from uuid import uuid4
import os

from fastapi import APIRouter, HTTPException, Request, Cookie
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from checkout_attribution_service import resolve_affiliate_attribution, log_campaign_usage

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
    # Affiliate attribution fields
    affiliate_code: Optional[str] = None
    affiliate_email: Optional[str] = None
    # Campaign attribution fields
    campaign_id: Optional[str] = None
    campaign_name: Optional[str] = None
    campaign_discount: float = 0.0
    campaign_reward_type: Optional[str] = None


def serialize_doc(doc):
    """Serialize MongoDB document for JSON response"""
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


@router.post("/api/guest/orders")
async def create_guest_order(
    payload: GuestOrderCreate,
    request: Request,
    affiliate_code: Optional[str] = Cookie(default=None),
):
    """Create a new guest order (no authentication required)
    
    Supports affiliate attribution via:
    1. Payload fields (affiliate_code, affiliate_email)
    2. Cookie (affiliate_code) - auto-read from browser cookie
    
    Supports campaign discount application via campaign_id
    """
    now = datetime.utcnow()
    order_number = f"ORD-{now.strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}"

    doc = payload.model_dump()
    doc["order_number"] = order_number
    doc["status"] = "pending"
    doc["current_status"] = "pending"
    doc["payment_status"] = "unpaid"
    doc["total_amount"] = payload.total  # Also store as total_amount for analytics
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

    # Handle affiliate attribution - resolve using service
    effective_affiliate_code = payload.affiliate_code or affiliate_code
    affiliate = await resolve_affiliate_attribution(
        db,
        affiliate_code=effective_affiliate_code,
        customer_email=payload.customer_email,
    )
    
    if affiliate:
        doc["affiliate_code"] = affiliate.get("affiliate_code")
        doc["affiliate_email"] = affiliate.get("affiliate_email")
        doc["affiliate_name"] = affiliate.get("affiliate_name")
    elif payload.affiliate_email:
        doc["affiliate_email"] = payload.affiliate_email
        doc["affiliate_code"] = payload.affiliate_code

    # Handle campaign attribution
    if payload.campaign_id:
        doc["campaign_id"] = payload.campaign_id
        doc["campaign_name"] = payload.campaign_name
        doc["campaign_discount"] = payload.campaign_discount
        doc["campaign_reward_type"] = payload.campaign_reward_type
        
        # Apply campaign discount to total if provided
        if payload.campaign_discount > 0:
            original_total = doc.get("total", 0)
            doc["original_total"] = original_total
            doc["total"] = max(0, original_total - payload.campaign_discount)
            doc["total_amount"] = doc["total"]
            doc["discount"] = (doc.get("discount") or 0) + payload.campaign_discount

    result = await db.orders.insert_one(doc)
    order_id = str(result.inserted_id)

    # Log campaign usage for tracking
    await log_campaign_usage(
        db,
        campaign_id=payload.campaign_id,
        campaign_name=payload.campaign_name,
        customer_email=payload.customer_email,
        order_id=order_id,
        invoice_id=None,
        discount_amount=payload.campaign_discount,
    )

    # Guest checkout → account activation flow
    # If guest email doesn't have an active account, create invited user + link
    invite_info = None
    guest_email = (payload.customer_email or "").strip().lower()
    if guest_email:
        existing_user = await db.users.find_one({"email": guest_email, "account_status": "active"})
        if not existing_user:
            from services.guest_checkout_activation_service import build_guest_checkout_account_invite, build_guest_activation_url
            from uuid import uuid4 as _uuid4

            # Check if invited user already exists
            invited_user = await db.users.find_one({"email": guest_email})
            if not invited_user:
                customer_id = str(_uuid4())
                invited_user = {
                    "id": customer_id,
                    "email": guest_email,
                    "full_name": payload.customer_name or "",
                    "phone": payload.customer_phone or "",
                    "role": "customer",
                    "account_status": "invited",
                    "created_at": now.isoformat() if hasattr(now, 'isoformat') else str(now),
                    "updated_at": now.isoformat() if hasattr(now, 'isoformat') else str(now),
                }
                await db.users.insert_one(invited_user)
            else:
                customer_id = invited_user.get("id", str(invited_user.get("_id", "")))

            checkout_data = {"email": guest_email, "id": order_id, "request_id": None}
            user_ref = {"id": customer_id}
            link = build_guest_checkout_account_invite(checkout_data, user_ref)
            link["id"] = str(_uuid4())
            await db.guest_checkout_account_links.insert_one(link)

            # Also create invite in customer_invites for the activation route
            await db.customer_invites.insert_one({
                "id": str(_uuid4()),
                "customer_user_id": customer_id,
                "customer_email": guest_email,
                "customer_name": payload.customer_name or "",
                "created_by_sales_user_id": None,
                "invite_token": link["invite_token"],
                "status": "pending",
                "expires_at": link.get("expires_at"),
                "accepted_at": None,
                "created_at": link["created_at"],
            })

            import os
            base_url = os.environ.get("FRONTEND_URL", os.environ.get("REACT_APP_BACKEND_URL", ""))
            invite_url = build_guest_activation_url(base_url, link["invite_token"])
            invite_info = {
                "invite_token": link["invite_token"],
                "invite_url": invite_url,
                "customer_id": customer_id,
            }

    return {
        "id": order_id,
        "order_id": order_id,
        "order_number": order_number,
        "status": "pending",
        "message": "Order created successfully",
        "affiliate_attributed": bool(doc.get("affiliate_code") or doc.get("affiliate_email")),
        "campaign_applied": bool(doc.get("campaign_id")),
        "account_invite": invite_info,
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
