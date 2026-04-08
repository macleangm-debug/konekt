"""
Konekt — Sales Status Override Routes
Allows sales team to update vendor order statuses with mandatory notes and audit trail.
"""
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from services.status_propagation_service import (
    record_status_change,
    get_status_options_for_role,
    map_status_for_role,
    INTERNAL_STATUSES,
    SOURCE_LABELS,
)

router = APIRouter(prefix="/api/sales/orders", tags=["sales-status"])


class StatusOverridePayload(BaseModel):
    new_status: str
    note: str
    source: str = "sales_follow_up"


@router.put("/{order_id}/status-override")
async def sales_status_override(order_id: str, payload: StatusOverridePayload, request: Request):
    """Sales overrides a vendor order status with required note and source."""
    db = request.app.mongodb

    # Validate status
    if payload.new_status not in INTERNAL_STATUSES:
        raise HTTPException(400, f"Invalid status. Must be one of: {', '.join(INTERNAL_STATUSES)}")

    # Validate source
    if payload.source not in SOURCE_LABELS:
        raise HTTPException(400, f"Invalid source. Must be one of: {', '.join(SOURCE_LABELS)}")

    # Require note
    if not payload.note or not payload.note.strip():
        raise HTTPException(400, "A note is required when overriding status.")

    # Get current document — try vendor_orders first, then orders
    from bson import ObjectId
    vo = None
    try:
        vo = await db.vendor_orders.find_one({"_id": ObjectId(order_id)})
    except Exception:
        pass
    if not vo:
        vo = await db.vendor_orders.find_one({"$or": [{"id": order_id}, {"vendor_order_no": order_id}]})

    if not vo:
        raise HTTPException(404, "Vendor order not found")

    prev_status = vo.get("status") or vo.get("fulfillment_state") or "assigned"

    # Extract sales user from JWT
    sales_name = "Sales Team"
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            import jwt, os
            token = auth_header.split(" ")[1]
            decoded = jwt.decode(token, os.environ.get("JWT_SECRET", "konekt-secret"), algorithms=["HS256"])
            sales_name = decoded.get("full_name") or decoded.get("email", "Sales Team")
        except Exception:
            pass

    success, entry = await record_status_change(
        db,
        "vendor_orders",
        str(vo["_id"]),
        prev_status,
        payload.new_status,
        updated_by=sales_name,
        role="sales",
        note=payload.note.strip(),
        source=payload.source,
    )

    if not success:
        raise HTTPException(500, "Failed to update status")

    return {"ok": True, "audit_entry": entry}


@router.get("/{order_id}/status-options")
async def get_sales_status_options(order_id: str, request: Request):
    """Get available status options for sales role."""
    return {
        "statuses": get_status_options_for_role("sales"),
        "sources": SOURCE_LABELS,
    }


@router.get("/{order_id}/audit-trail")
async def get_order_audit_trail(order_id: str, request: Request):
    """Get the full audit trail for a vendor order."""
    db = request.app.mongodb
    from bson import ObjectId
    vo = None
    try:
        vo = await db.vendor_orders.find_one({"_id": ObjectId(order_id)}, {"_id": 0, "status_audit_trail": 1, "status": 1, "vendor_order_no": 1})
    except Exception:
        pass
    if not vo:
        vo = await db.vendor_orders.find_one(
            {"$or": [{"id": order_id}, {"vendor_order_no": order_id}]},
            {"_id": 0, "status_audit_trail": 1, "status": 1, "vendor_order_no": 1}
        )
    if not vo:
        raise HTTPException(404, "Vendor order not found")
    return {
        "vendor_order_no": vo.get("vendor_order_no"),
        "current_status": vo.get("status"),
        "audit_trail": vo.get("status_audit_trail", []),
    }
