"""
Discount Request Routes — Phase E
Staff: create + list own requests
Admin: queue, detail, approve, reject
"""

from fastapi import APIRouter, Request, Query
from typing import Optional
import jwt as pyjwt

from services.discount_request_service import (
    create_discount_request,
    list_discount_requests_for_staff,
    list_discount_requests_for_admin,
    get_discount_request_detail,
    approve_discount_request,
    reject_discount_request,
)

router = APIRouter(tags=["discount-requests"])


def _extract_user(request: Request):
    """Extract user info from JWT (works for both staff and admin tokens)."""
    auth = request.headers.get("authorization", "")
    if auth.startswith("Bearer "):
        try:
            token = auth.split(" ")[1]
            payload = pyjwt.decode(token, options={"verify_signature": False})
            user_id = payload.get("user_id") or payload.get("sub") or ""
            email = payload.get("email") or ""
            name = payload.get("full_name") or payload.get("name") or ""
            role = payload.get("role") or ""
            return user_id, email, name, role
        except Exception:
            pass
    return "", "", "", ""


# ═══ STAFF ENDPOINTS ═══

@router.post("/api/staff/discount-requests")
async def staff_create_discount_request(request: Request):
    """Sales staff submits a discount request."""
    db = request.app.mongodb
    user_id, email, name, _ = _extract_user(request)
    payload = await request.json()
    result = await create_discount_request(
        db, payload=payload,
        staff_id=user_id, staff_email=email, staff_name=name,
    )
    return result


@router.get("/api/staff/discount-requests")
async def staff_list_discount_requests(request: Request):
    """Sales staff lists their own discount requests."""
    db = request.app.mongodb
    user_id, email, _, _ = _extract_user(request)
    docs = await list_discount_requests_for_staff(db, staff_id=user_id, staff_email=email)
    return {"ok": True, "items": docs}


# ═══ ADMIN ENDPOINTS ═══

@router.get("/api/admin/discount-requests")
async def admin_list_discount_requests(
    request: Request,
    status: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
):
    """Admin queue — list all discount requests with KPIs."""
    db = request.app.mongodb
    result = await list_discount_requests_for_admin(db, status=status, limit=limit)
    return {"ok": True, **result}


@router.get("/api/admin/discount-requests/{request_id}")
async def admin_get_discount_request(request: Request, request_id: str):
    """Admin gets full detail of a discount request."""
    db = request.app.mongodb
    doc = await get_discount_request_detail(db, request_id)
    if not doc:
        return {"ok": False, "error": "Request not found"}
    return {"ok": True, "request": doc}


@router.put("/api/admin/discount-requests/{request_id}/approve")
async def admin_approve_discount_request(request: Request, request_id: str):
    """Admin approves a discount request."""
    db = request.app.mongodb
    _, _, admin_name, _ = _extract_user(request)
    body = await request.json()
    admin_note = body.get("admin_note", "")
    result = await approve_discount_request(
        db, request_id, admin_name=admin_name, admin_note=admin_note,
    )
    return result


@router.put("/api/admin/discount-requests/{request_id}/reject")
async def admin_reject_discount_request(request: Request, request_id: str):
    """Admin rejects a discount request."""
    db = request.app.mongodb
    _, _, admin_name, _ = _extract_user(request)
    body = await request.json()
    admin_note = body.get("admin_note", "")
    result = await reject_discount_request(
        db, request_id, admin_name=admin_name, admin_note=admin_note,
    )
    return result
