"""
Vendor Capability Governance Routes
Admin manages vendor capabilities: products, services, promo.
Each capability: pending → approved → suspended.
Vendors cannot create listings for unapproved capabilities.
"""
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Request
from typing import Optional

router = APIRouter(prefix="/api/admin/vendor-capabilities", tags=["Vendor Capability Governance"])


def _now():
    return datetime.now(timezone.utc).isoformat()


def _clean(doc):
    if not doc:
        return doc
    doc = dict(doc)
    doc.pop("_id", None)
    return doc


@router.get("")
async def list_vendor_profiles(request: Request, status: Optional[str] = None):
    """List all vendor profiles with capability statuses."""
    db = request.app.mongodb
    query = {}
    if status:
        query["$or"] = [
            {"products_capability_status": status},
            {"services_capability_status": status},
            {"promo_capability_status": status},
        ]
    docs = await db.vendor_profiles.find(query).sort("created_at", -1).to_list(500)
    return [_clean(d) for d in docs]


@router.get("/{vendor_user_id}")
async def get_vendor_profile(vendor_user_id: str, request: Request):
    db = request.app.mongodb
    doc = await db.vendor_profiles.find_one({"vendor_user_id": vendor_user_id})
    if not doc:
        raise HTTPException(404, "Vendor profile not found")
    return _clean(doc)


@router.post("")
async def create_vendor_profile(payload: dict, request: Request):
    """Create a new vendor profile with capability statuses."""
    db = request.app.mongodb
    vendor_user_id = payload.get("vendor_user_id")
    if not vendor_user_id:
        raise HTTPException(400, "vendor_user_id is required")

    existing = await db.vendor_profiles.find_one({"vendor_user_id": vendor_user_id})
    if existing:
        raise HTTPException(409, "Vendor profile already exists")

    profile = {
        "id": str(uuid4()),
        "vendor_user_id": vendor_user_id,
        "business_name": payload.get("business_name", ""),
        "products_capability_status": payload.get("products_capability_status", "pending"),
        "services_capability_status": payload.get("services_capability_status", "pending"),
        "promo_capability_status": payload.get("promo_capability_status", "pending"),
        "listing_moderation_mode": payload.get("listing_moderation_mode", "review_required"),
        "is_verified_vendor": payload.get("is_verified_vendor", False),
        "created_at": _now(),
        "updated_at": _now(),
    }
    await db.vendor_profiles.insert_one(profile)
    return _clean(profile)


@router.put("/{vendor_user_id}")
async def update_vendor_capabilities(vendor_user_id: str, payload: dict, request: Request):
    """Admin updates vendor capability statuses."""
    db = request.app.mongodb
    existing = await db.vendor_profiles.find_one({"vendor_user_id": vendor_user_id})
    if not existing:
        raise HTTPException(404, "Vendor profile not found")

    valid_statuses = {"pending", "approved", "suspended"}
    updates = {"updated_at": _now()}

    for field in ("products_capability_status", "services_capability_status", "promo_capability_status"):
        if field in payload:
            if payload[field] not in valid_statuses:
                raise HTTPException(400, f"{field} must be one of: {valid_statuses}")
            updates[field] = payload[field]

    for field in ("listing_moderation_mode", "is_verified_vendor", "business_name"):
        if field in payload:
            updates[field] = payload[field]

    await db.vendor_profiles.update_one({"vendor_user_id": vendor_user_id}, {"$set": updates})
    updated = await db.vendor_profiles.find_one({"vendor_user_id": vendor_user_id})
    return _clean(updated)


@router.get("/{vendor_user_id}/can-create")
async def check_vendor_can_create(vendor_user_id: str, listing_type: str, request: Request):
    """Check if vendor can create a listing of given type."""
    from services.vendor_capability_guard import can_vendor_create_product, can_vendor_create_service, can_vendor_create_promo

    db = request.app.mongodb
    profile = await db.vendor_profiles.find_one({"vendor_user_id": vendor_user_id})
    if not profile:
        return {"allowed": False, "reason": "No vendor profile found. Contact admin."}

    profile = _clean(profile)
    if listing_type == "product":
        allowed = can_vendor_create_product(profile)
    elif listing_type == "service":
        allowed = can_vendor_create_service(profile)
    elif listing_type == "promo":
        allowed = can_vendor_create_promo(profile)
    else:
        raise HTTPException(400, "listing_type must be: product, service, or promo")

    reason = "" if allowed else f"{listing_type} capability not approved"
    return {"allowed": allowed, "reason": reason, "listing_moderation_mode": profile.get("listing_moderation_mode")}
