"""
Vendor Invite Routes — Token-based vendor activation.
Handles password creation flow for invited vendors.
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
import bcrypt

from services.vendor_onboarding_service import activate_vendor_by_token


router = APIRouter(prefix="/api/vendor-invite", tags=["Vendor Invite"])


class ActivatePayload(BaseModel):
    token: str
    password: str


@router.get("/validate/{token}")
async def validate_invite_token(token: str, request: Request):
    """Validate an invite token without consuming it."""
    db = request.app.mongodb
    invite = await db.vendor_invites.find_one({"token": token}, {"_id": 0})
    if not invite:
        return {"valid": False, "reason": "Token not found"}
    if invite.get("status") == "activated":
        return {"valid": False, "reason": "Token already used"}
    vendor = await db.users.find_one({"id": invite["vendor_id"]}, {"_id": 0, "full_name": 1, "email": 1, "business_name": 1, "company": 1})
    return {
        "valid": True,
        "vendor_name": (vendor or {}).get("full_name", ""),
        "vendor_email": (vendor or {}).get("email", ""),
        "business_name": (vendor or {}).get("business_name") or (vendor or {}).get("company", ""),
    }


@router.post("/activate")
async def activate_vendor(payload: ActivatePayload, request: Request):
    """Activate vendor account by setting password via invite token."""
    db = request.app.mongodb

    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    password_hash = bcrypt.hashpw(payload.password.encode(), bcrypt.gensalt()).decode()
    vendor, error = await activate_vendor_by_token(db, payload.token, password_hash)

    if error:
        raise HTTPException(status_code=400, detail=error)

    return {
        "success": True,
        "vendor_id": vendor.get("id"),
        "vendor_name": vendor.get("full_name"),
        "message": "Account activated. You can now log in.",
    }
