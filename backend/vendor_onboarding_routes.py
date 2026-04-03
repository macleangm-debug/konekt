"""
Vendor Onboarding Routes — Unified vendor onboarding with country-aware fields,
role classification, marketplace permission enforcement, and invite generation.
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Optional

from services.vendor_onboarding_service import onboard_vendor
from services.vendor_role_policy_service import classify_vendor_role, get_vendor_permissions, can_publish_marketplace_items
from services.market_context_service import get_market_context, list_supported_markets


router = APIRouter(prefix="/api/admin/vendor-onboarding", tags=["Vendor Onboarding"])


class VendorOnboardPayload(BaseModel):
    full_name: str
    business_name: str = ""
    email: str
    country_code: str = "TZ"
    phone_prefix: Optional[str] = None
    phone_number: str = ""
    currency_code: Optional[str] = None
    region: str = ""
    city: str = ""
    address: str = ""
    tin: str = ""
    vrn: str = ""
    registration_number: str = ""
    bank_name: str = ""
    bank_account_name: str = ""
    bank_account_number: str = ""
    capability_type: str = "products"
    taxonomy_ids: list = Field(default_factory=list)
    subcategory_ids: list = Field(default_factory=list)
    service_capability_ids: list = Field(default_factory=list)
    notes: str = ""


@router.get("/markets")
async def get_supported_markets():
    """List all supported markets with phone prefixes and currencies."""
    return {"markets": list_supported_markets()}


@router.get("/market-context/{country_code}")
async def get_market_defaults(country_code: str):
    """Get market defaults for a specific country."""
    return get_market_context(country_code)


@router.get("/role-preview")
async def preview_vendor_role(capability_type: str = "products"):
    """Preview what vendor_role and permissions would be assigned for a capability_type."""
    vendor_role = classify_vendor_role(capability_type)
    return get_vendor_permissions(vendor_role)


@router.post("")
async def create_vendor_onboarding(payload: VendorOnboardPayload, request: Request):
    """
    Full vendor onboarding:
    - Creates vendor with country-aware fields
    - Classifies vendor role
    - Generates invite token
    - Returns vendor doc, invite info, and marketplace permissions
    """
    db = request.app.mongodb

    # Check for duplicate email
    existing = await db.users.find_one({"email": payload.email, "role": "vendor"}, {"_id": 0, "id": 1})
    if existing:
        raise HTTPException(status_code=409, detail="A vendor with this email already exists")

    vendor_doc, invite_doc, permissions = await onboard_vendor(db, {
        **payload.dict(),
        "onboarded_by": "admin",
    })

    # Note: Email invite is MOCKED until Resend is configured
    invite_url = f"/vendor/create-password?token={invite_doc['token']}"

    return {
        "vendor": {k: v for k, v in vendor_doc.items() if k != "password"},
        "invite": {
            "id": invite_doc["id"],
            "token": invite_doc["token"],
            "status": invite_doc["status"],
            "activation_url": invite_url,
            "email_sent": False,
            "email_provider": "mocked",
        },
        "permissions": permissions,
        "market_context": get_market_context(payload.country_code),
    }


@router.get("/invites")
async def list_pending_invites(request: Request):
    """List all vendor invites."""
    db = request.app.mongodb
    invites = await db.vendor_invites.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"invites": invites}


@router.post("/invites/{invite_id}/resend")
async def resend_invite(invite_id: str, request: Request):
    """Resend a vendor invite (MOCKED until email provider configured)."""
    db = request.app.mongodb
    invite = await db.vendor_invites.find_one({"id": invite_id}, {"_id": 0})
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    return {
        "invite": invite,
        "email_sent": False,
        "email_provider": "mocked",
        "message": "Email invite is mocked. Configure Resend to enable.",
    }
