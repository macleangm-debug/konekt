from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Request

router = APIRouter(prefix="/api/admin/affiliates", tags=["Affiliate Admin"])


@router.get("")
async def list_affiliates(request: Request):
    """List all affiliates."""
    db = request.app.mongodb
    docs = await db.affiliates.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"affiliates": docs}


@router.post("")
async def create_affiliate(payload: dict, request: Request):
    """Create a new affiliate. Commission comes from settings, not from form."""
    db = request.app.mongodb

    name = payload.get("name", "").strip()
    email = payload.get("email", "").strip()
    code = payload.get("affiliate_code", "").strip().upper()

    if not name or not email or not code:
        raise HTTPException(status_code=400, detail="Name, email, and affiliate code are required")

    existing = await db.affiliates.find_one(
        {"$or": [{"email": email}, {"affiliate_code": code}]}, {"_id": 0}
    )
    if existing:
        raise HTTPException(status_code=400, detail="Affiliate with this email or code already exists")

    # Get default commission from affiliate settings
    aff_settings = await db.affiliate_settings.find_one({}, {"_id": 0}) or {}
    commission_type = aff_settings.get("commission_type", "percentage")
    commission_value = float(aff_settings.get("default_commission_rate", 0))

    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid4()),
        "name": name,
        "phone": payload.get("phone", ""),
        "email": email,
        "affiliate_code": code,
        "affiliate_link": f"/a/{code}",
        "is_active": payload.get("is_active", True),
        "commission_type": commission_type,
        "commission_value": commission_value,
        "payout_method": payload.get("payout_method", ""),
        "mobile_money_number": payload.get("mobile_money_number", ""),
        "mobile_money_provider": payload.get("mobile_money_provider", ""),
        "bank_name": payload.get("bank_name", ""),
        "bank_account_name": payload.get("bank_account_name", ""),
        "bank_account_number": payload.get("bank_account_number", ""),
        "notes": payload.get("notes", ""),
        "created_at": now,
        "updated_at": now,
    }
    await db.affiliates.insert_one(doc)
    doc.pop("_id", None)
    return {"ok": True, "affiliate": doc}


@router.delete("/{affiliate_id}")
async def delete_affiliate(affiliate_id: str, request: Request):
    """Delete an affiliate."""
    db = request.app.mongodb
    result = await db.affiliates.delete_one({"id": affiliate_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Affiliate not found")
    return {"ok": True}


@router.get("/applications")
async def list_affiliate_applications(request: Request, status: str = None):
    """List affiliate applications."""
    db = request.app.mongodb
    query = {}
    if status:
        query["status"] = status
    docs = await db.affiliate_applications.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"applications": docs}


@router.post("/applications/{application_id}/review")
async def review_affiliate_application(application_id: str, payload: dict, request: Request):
    """Approve or reject an affiliate application."""
    db = request.app.mongodb
    decision = payload.get("decision")
    note = payload.get("note", "")

    if decision not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="Invalid decision")

    application = await db.affiliate_applications.find_one({"id": application_id}, {"_id": 0})
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    now = datetime.now(timezone.utc).isoformat()
    await db.affiliate_applications.update_one(
        {"id": application_id},
        {"$set": {"status": decision, "review_note": note, "reviewed_at": now}}
    )

    if decision == "approved":
        existing = await db.affiliates.find_one({"email": application.get("email")})
        if not existing:
            aff_settings = await db.affiliate_settings.find_one({}, {"_id": 0}) or {}
            code = application.get("affiliate_code") or application.get("name", "AFF").upper().replace(" ", "")[:10]
            await db.affiliates.insert_one({
                "id": str(uuid4()),
                "name": application.get("name", ""),
                "phone": application.get("phone", ""),
                "email": application.get("email", ""),
                "affiliate_code": code,
                "affiliate_link": f"/a/{code}",
                "is_active": True,
                "commission_type": aff_settings.get("commission_type", "percentage"),
                "commission_value": float(aff_settings.get("default_commission_rate", 0)),
                "payout_method": application.get("payout_method", ""),
                "notes": f"Auto-created from application. {note}".strip(),
                "created_at": now,
                "updated_at": now,
            })

    return {"ok": True, "status": decision}
