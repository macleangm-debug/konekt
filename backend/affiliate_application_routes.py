"""
Affiliate Application Routes — Full Controlled Program
Public: Submit application, check status by email/phone.
Admin: List, review, approve/reject with notes, enforce max affiliates.
"""
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr
from typing import Optional
import re

router = APIRouter(prefix="/api/affiliate-applications", tags=["Affiliate Applications"])


class AffiliateApplicationCreate(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    company_name: Optional[str] = None
    region: Optional[str] = None
    notes: Optional[str] = None


@router.post("")
async def submit_application(payload: AffiliateApplicationCreate, request: Request):
    """Submit a new affiliate application (public - no auth required)."""
    db = request.app.mongodb

    settings = await db.affiliate_settings.find_one({}, {"_id": 0}) or {}
    if not settings.get("application_enabled", True):
        raise HTTPException(status_code=403, detail="Affiliate applications are currently closed")

    existing = await db.affiliate_applications.find_one(
        {"email": payload.email, "status": {"$in": ["pending", "approved"]}},
        {"_id": 0}
    )
    if existing:
        if existing["status"] == "pending":
            raise HTTPException(status_code=400, detail="You already have a pending application")
        if existing["status"] == "approved":
            raise HTTPException(status_code=400, detail="You are already an approved affiliate")

    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid4()),
        **payload.model_dump(),
        "status": "pending",
        "admin_notes": "",
        "reviewed_at": None,
        "reviewed_by": None,
        "created_at": now,
        "updated_at": now,
    }
    await db.affiliate_applications.insert_one(doc)
    doc.pop("_id", None)
    return {"ok": True, "application": doc}


@router.get("")
async def list_applications(request: Request, status: str = None):
    """List all affiliate applications (admin)."""
    db = request.app.mongodb
    query = {}
    if status:
        query["status"] = status
    docs = await db.affiliate_applications.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"applications": docs}


@router.get("/stats")
async def application_stats(request: Request):
    """Get application stats for admin dashboard."""
    db = request.app.mongodb
    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    results = await db.affiliate_applications.aggregate(pipeline).to_list(10)
    stats = {r["_id"]: r["count"] for r in results}
    active_affiliates = await db.affiliates.count_documents({"is_active": True})
    settings = await db.affiliate_settings.find_one({}, {"_id": 0}) or {}
    max_affiliates = settings.get("max_active_affiliates", 0)
    return {
        "pending": stats.get("pending", 0),
        "approved": stats.get("approved", 0),
        "rejected": stats.get("rejected", 0),
        "active_affiliates": active_affiliates,
        "max_affiliates": max_affiliates,
        "slots_remaining": max(0, max_affiliates - active_affiliates) if max_affiliates > 0 else -1,
    }


@router.post("/{application_id}/approve")
async def approve_application(application_id: str, request: Request):
    """Approve application and create affiliate record with setup_complete=false."""
    db = request.app.mongodb

    app_doc = await db.affiliate_applications.find_one({"id": application_id}, {"_id": 0})
    if not app_doc:
        raise HTTPException(status_code=404, detail="Application not found")
    if app_doc.get("status") == "approved":
        raise HTTPException(status_code=400, detail="Already approved")

    existing_aff = await db.affiliates.find_one({"email": app_doc["email"]})
    if existing_aff:
        raise HTTPException(status_code=400, detail="Affiliate with this email already exists")

    settings = await db.affiliate_settings.find_one({}, {"_id": 0}) or {}
    max_affiliates = settings.get("max_active_affiliates", 0)
    if max_affiliates > 0:
        active_count = await db.affiliates.count_documents({"is_active": True})
        if active_count >= max_affiliates:
            raise HTTPException(status_code=400, detail=f"Maximum active affiliates ({max_affiliates}) reached")

    now = datetime.now(timezone.utc).isoformat()
    commission_type = settings.get("commission_type", "percentage")
    commission_value = float(settings.get("default_commission_rate", 0))

    body = {}
    try:
        body = await request.json()
    except Exception:
        pass

    temp_code = "TEMP_" + str(uuid4())[:8].upper()

    affiliate_doc = {
        "id": str(uuid4()),
        "name": app_doc.get("full_name", ""),
        "phone": app_doc.get("phone", ""),
        "email": app_doc["email"],
        "affiliate_code": temp_code,
        "affiliate_link": f"/a/{temp_code}",
        "is_active": True,
        "setup_complete": False,
        "commission_type": commission_type,
        "commission_value": commission_value,
        "payout_method": "",
        "payout_details": {},
        "contract_tier": "starter",
        "contract_start": now,
        "performance_status": "active",
        "total_deals": 0,
        "total_earnings": 0,
        "notes": f"From application. {app_doc.get('notes', '')}".strip(),
        "created_at": now,
        "updated_at": now,
    }
    await db.affiliates.insert_one(affiliate_doc)
    affiliate_doc.pop("_id", None)

    await db.affiliate_applications.update_one(
        {"id": application_id},
        {"$set": {
            "status": "approved",
            "affiliate_id": affiliate_doc["id"],
            "admin_notes": body.get("admin_notes", ""),
            "reviewed_at": now,
            "updated_at": now,
        }}
    )

    existing_user = await db.users.find_one({"email": app_doc["email"]}, {"_id": 0})
    if not existing_user:
        import bcrypt
        temp_password = str(uuid4())[:12]
        password_hash = bcrypt.hashpw(temp_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        user_doc = {
            "id": str(uuid4()),
            "email": app_doc["email"],
            "full_name": app_doc.get("full_name", ""),
            "phone": app_doc.get("phone", ""),
            "password_hash": password_hash,
            "role": "affiliate",
            "is_active": True,
            "points": 0,
            "referral_code": "",
            "company": app_doc.get("company_name", ""),
            "created_at": now,
            "updated_at": now,
        }
        await db.users.insert_one(user_doc)
        user_doc.pop("_id", None)
        return {"ok": True, "affiliate": affiliate_doc, "temp_password": temp_password, "user_created": True}

    if existing_user.get("role") != "affiliate":
        await db.users.update_one({"email": app_doc["email"]}, {"$set": {"role": "affiliate"}})

    return {"ok": True, "affiliate": affiliate_doc, "user_created": False}


@router.post("/{application_id}/reject")
async def reject_application(application_id: str, request: Request):
    """Reject an application with notes."""
    db = request.app.mongodb

    app_doc = await db.affiliate_applications.find_one({"id": application_id}, {"_id": 0})
    if not app_doc:
        raise HTTPException(status_code=404, detail="Application not found")
    if app_doc.get("status") in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail=f"Already {app_doc['status']}")

    body = {}
    try:
        body = await request.json()
    except Exception:
        pass

    now = datetime.now(timezone.utc).isoformat()
    await db.affiliate_applications.update_one(
        {"id": application_id},
        {"$set": {
            "status": "rejected",
            "admin_notes": body.get("admin_notes", body.get("note", "")),
            "reviewed_at": now,
            "updated_at": now,
        }}
    )
    return {"ok": True, "status": "rejected"}


@router.get("/check/{identifier}")
async def check_status(identifier: str, request: Request):
    """Check application status by email or phone (public)."""
    db = request.app.mongodb
    query = {"$or": [{"email": identifier}]}
    if not re.match(r"[^@]+@[^@]+\.[^@]+", identifier):
        query = {"$or": [{"phone": {"$regex": identifier.replace("+", "\\+")}}]}
    else:
        query["$or"].append({"phone": identifier})

    doc = await db.affiliate_applications.find_one(
        query, {"_id": 0, "status": 1, "created_at": 1, "reviewed_at": 1, "admin_notes": 1}
    )
    if not doc:
        return {"exists": False, "status": None}
    notes = doc.get("admin_notes", "") if doc.get("status") == "rejected" else ""
    return {
        "exists": True,
        "status": doc.get("status"),
        "submitted_at": doc.get("created_at"),
        "reviewed_at": doc.get("reviewed_at"),
        "rejection_reason": notes,
    }
