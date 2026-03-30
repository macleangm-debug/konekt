"""
Sales Delivery Override Routes
Sales team controls logistics after vendor marks Ready for Pickup.
Statuses: picked_up → in_transit → delivered → completed
"""
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import os

router = APIRouter(prefix="/api/sales", tags=["Sales Delivery Override"])
_security = HTTPBearer()


async def _get_sales_user(request: Request, credentials: HTTPAuthorizationCredentials = Depends(_security)):
    JWT_SECRET = os.environ.get("JWT_SECRET", "konekt-secret-key-change-in-production")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        db = request.app.mongodb
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(401, "User not found")
        role = user.get("role", "customer")
        if role not in ("admin", "sales", "staff"):
            raise HTTPException(403, "Sales access required")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")


@router.post("/delivery/{vendor_order_id}/update-status")
async def sales_update_delivery_status(
    vendor_order_id: str,
    payload: dict,
    request: Request,
    user: dict = Depends(_get_sales_user),
):
    """
    Sales team updates delivery/logistics status after vendor marks Ready.
    Allowed: picked_up, in_transit, delivered, completed
    """
    from services.sales_delivery_override_service import can_sales_update_status
    from services.product_delivery_status_workflow import SALES_LOGISTICS_STATUSES

    db = request.app.mongodb
    new_status = payload.get("status")
    if not new_status:
        raise HTTPException(400, "status is required")

    if new_status not in set(SALES_LOGISTICS_STATUSES):
        raise HTTPException(400, f"Invalid logistics status. Allowed: {SALES_LOGISTICS_STATUSES}")

    doc = await db.vendor_orders.find_one({"id": vendor_order_id})
    if not doc:
        raise HTTPException(404, "Vendor order not found")

    current = doc.get("status", "")
    if not can_sales_update_status(current) and current not in SALES_LOGISTICS_STATUSES:
        raise HTTPException(400, f"Cannot update from current status '{current}'. Vendor must first mark Ready for Pickup.")

    now = datetime.now(timezone.utc).isoformat()
    await db.vendor_orders.update_one(
        {"id": vendor_order_id},
        {"$set": {"status": new_status, "updated_at": now, "logistics_updated_by": user.get("id"), "logistics_updated_at": now}}
    )

    order_id = doc.get("order_id")
    if order_id:
        await db.orders.update_one(
            {"id": order_id},
            {"$set": {"status": new_status, "current_status": new_status, "updated_at": now}}
        )
        await db.order_events.insert_one({
            "id": str(uuid4()),
            "order_id": order_id,
            "event": f"sales_logistics_{new_status}",
            "actor": f"sales:{user.get('id')}",
            "actor_name": user.get("full_name", "Sales"),
            "created_at": now,
        })

    # Customer notification for key milestones
    customer_id = doc.get("customer_id")
    if customer_id and new_status in ("in_transit", "delivered", "completed"):
        from services.product_delivery_status_workflow import map_customer_status
        customer_label = map_customer_status(new_status)
        await db.notifications.insert_one({
            "id": str(uuid4()),
            "user_id": customer_id,
            "role": "customer",
            "event_type": f"delivery_{new_status}",
            "title": f"Order {customer_label}",
            "message": f"Your order is now: {customer_label}.",
            "target_url": "/account/orders",
            "read": False,
            "created_at": now,
        })

    return {"ok": True, "status": new_status}


@router.get("/delivery/{vendor_order_id}/logistics-status")
async def get_logistics_status(
    vendor_order_id: str,
    request: Request,
    user: dict = Depends(_get_sales_user),
):
    """Get current delivery status and available next statuses for a vendor order."""
    from services.sales_delivery_override_service import next_sales_logistics_statuses, can_sales_update_status

    db = request.app.mongodb
    doc = await db.vendor_orders.find_one({"id": vendor_order_id}, {"_id": 0, "status": 1, "id": 1, "order_id": 1, "vendor_order_no": 1})
    if not doc:
        raise HTTPException(404, "Vendor order not found")

    current = doc.get("status", "")
    can_update = can_sales_update_status(current)
    next_statuses = next_sales_logistics_statuses(current) if can_update else []

    return {
        "vendor_order_id": doc.get("id"),
        "vendor_order_no": doc.get("vendor_order_no"),
        "current_status": current,
        "can_sales_update": can_update,
        "next_statuses": next_statuses,
    }
