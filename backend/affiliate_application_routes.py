"""
Affiliate Application Routes — Public application + Admin review flow.
Public: Submit application, check status.
Admin: List, review, approve/reject applications.
"""
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr
from typing import Optional

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
    """Submit a new affiliate application (public — no auth required)."""
    db = request.app.mongodb

    existing = await db.affiliate_applications.find_one({"email": payload.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="An application with this email already exists")

    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid4()),
        **payload.model_dump(),
        "status": "pending",
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


@router.post("/{application_id}/approve")
async def approve_application(application_id: str, request: Request):
    """Approve application and create affiliate record. Commission auto from settings."""
    db = request.app.mongodb

    app_doc = await db.affiliate_applications.find_one({"id": application_id}, {"_id": 0})
    if not app_doc:
        raise HTTPException(status_code=404, detail="Application not found")
    if app_doc.get("status") == "approved":
        raise HTTPException(status_code=400, detail="Already approved")

    # Check if affiliate email already exists
    existing = await db.affiliates.find_one({"email": app_doc["email"]})
    if existing:
        raise HTTPException(status_code=400, detail="Affiliate with this email already exists")

    now = datetime.now(timezone.utc).isoformat()

    # Auto commission from settings
    aff_settings = await db.affiliate_settings.find_one({}, {"_id": 0}) or {}
    commission_type = aff_settings.get("commission_type", "percentage")
    commission_value = float(aff_settings.get("default_commission_rate", 0))

    # Generate code from name
    name = app_doc.get("full_name") or app_doc.get("company_name") or "AFF"
    code = name.upper().replace(" ", "")[:8] + str(uuid4())[:4].upper()

    affiliate_doc = {
        "id": str(uuid4()),
        "name": app_doc.get("full_name", ""),
        "phone": app_doc.get("phone", ""),
        "email": app_doc["email"],
        "affiliate_code": code,
        "affiliate_link": f"/a/{code}",
        "is_active": True,
        "commission_type": commission_type,
        "commission_value": commission_value,
        "payout_method": "",
        "notes": f"From application. {app_doc.get('notes', '')}".strip(),
        "created_at": now,
        "updated_at": now,
    }
    await db.affiliates.insert_one(affiliate_doc)
    affiliate_doc.pop("_id", None)

    await db.affiliate_applications.update_one(
        {"id": application_id},
        {"$set": {"status": "approved", "affiliate_id": affiliate_doc["id"], "updated_at": now}}
    )

    return {"ok": True, "affiliate": affiliate_doc}


@router.post("/{application_id}/reject")
async def reject_application(application_id: str, payload: dict, request: Request):
    """Reject an application."""
    db = request.app.mongodb

    app_doc = await db.affiliate_applications.find_one({"id": application_id}, {"_id": 0})
    if not app_doc:
        raise HTTPException(status_code=404, detail="Application not found")
    if app_doc.get("status") in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail=f"Already {app_doc['status']}")

    now = datetime.now(timezone.utc).isoformat()
    note = payload.get("note", "")

    await db.affiliate_applications.update_one(
        {"id": application_id},
        {"$set": {"status": "rejected", "rejection_note": note, "updated_at": now}}
    )

    return {"ok": True, "status": "rejected"}


@router.get("/check/{email}")
async def check_status(email: str, request: Request):
    """Check application status by email (public)."""
    db = request.app.mongodb
    doc = await db.affiliate_applications.find_one({"email": email}, {"_id": 0, "status": 1, "created_at": 1})
    if not doc:
        return {"exists": False, "status": None}
    return {"exists": True, "status": doc.get("status"), "submitted_at": doc.get("created_at")}
