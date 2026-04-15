"""
Admin Finance Routes — Commission tracking and cash flow overview.
Reads real data from commissions, payments, and orders collections.
"""
import os
import jwt
from fastapi import APIRouter, Request, Header, HTTPException
from typing import Optional

router = APIRouter(prefix="/api/admin/finance", tags=["Admin Finance"])

JWT_SECRET = os.environ.get("JWT_SECRET", "konekt-secret-key-change-in-production")


async def _require_admin(request: Request):
    db = request.app.mongodb
    auth = request.headers.get("authorization", "")
    if not auth or not auth.startswith("Bearer "):
        raise HTTPException(401, "Authorization required")
    token = auth.replace("Bearer ", "").strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user or user.get("role") not in ("admin", "finance_manager", "sales_manager"):
            raise HTTPException(403, "Finance access required")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")


@router.get("/commissions")
async def list_commissions(request: Request, status: str = None):
    """List all commissions with optional status filter."""
    await _require_admin(request)
    db = request.app.mongodb
    query = {}
    if status and status != "all":
        query["status"] = status
    commissions = await db.commissions.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"commissions": commissions, "total": len(commissions)}


@router.get("/commission-stats")
async def commission_stats(request: Request):
    """Aggregated commission statistics."""
    await _require_admin(request)
    db = request.app.mongodb

    pipeline_total = [{"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}}]
    pipeline_pending = [{"$match": {"status": "pending"}}, {"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}}]
    pipeline_paid = [{"$match": {"status": {"$in": ["paid", "approved"]}}}, {"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}}]
    pipeline_beneficiaries = [{"$group": {"_id": "$beneficiary_user_id"}}, {"$count": "count"}]

    total_res = await db.commissions.aggregate(pipeline_total).to_list(1)
    pending_res = await db.commissions.aggregate(pipeline_pending).to_list(1)
    paid_res = await db.commissions.aggregate(pipeline_paid).to_list(1)
    bene_res = await db.commissions.aggregate(pipeline_beneficiaries).to_list(1)

    return {
        "total_earned": total_res[0]["total"] if total_res else 0,
        "total_count": total_res[0]["count"] if total_res else 0,
        "pending_amount": pending_res[0]["total"] if pending_res else 0,
        "pending_count": pending_res[0]["count"] if pending_res else 0,
        "paid_amount": paid_res[0]["total"] if paid_res else 0,
        "paid_count": paid_res[0]["count"] if paid_res else 0,
        "beneficiary_count": bene_res[0]["count"] if bene_res else 0,
    }


@router.get("/cash-flow")
async def cash_flow_overview(request: Request):
    """Cash flow overview from payments collection."""
    await _require_admin(request)
    db = request.app.mongodb

    # Payment stats by status
    pipeline = [
        {"$group": {
            "_id": "$payment_status",
            "total": {"$sum": "$amount"},
            "count": {"$sum": 1},
        }}
    ]
    results = await db.payments.aggregate(pipeline).to_list(20)
    by_status = {r["_id"]: {"total": r["total"], "count": r["count"]} for r in results if r["_id"]}

    total_revenue = sum(r.get("total", 0) for r in results)

    return {
        "total_revenue": total_revenue,
        "by_status": by_status,
        "pending": by_status.get("pending_review", by_status.get("pending", {"total": 0, "count": 0})),
        "approved": by_status.get("approved", {"total": 0, "count": 0}),
        "rejected": by_status.get("rejected", {"total": 0, "count": 0}),
    }
