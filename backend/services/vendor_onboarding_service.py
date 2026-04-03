"""
Vendor Onboarding Service — Creates vendor record with country-aware fields,
role classification, capabilities, and invite token generation.
"""
from datetime import datetime, timezone
from uuid import uuid4
import secrets

from services.market_context_service import get_market_context
from services.vendor_role_policy_service import classify_vendor_role, get_vendor_permissions


def _now():
    return datetime.now(timezone.utc).isoformat()


async def onboard_vendor(db, payload: dict):
    """
    Full vendor onboarding:
    1. Resolve market context from country
    2. Classify vendor role from capability_type
    3. Create vendor user record
    4. Generate invite token
    Returns: (vendor_doc, invite_doc, permissions)
    """
    country_code = payload.get("country_code", "TZ")
    market = get_market_context(country_code)
    capability_type = payload.get("capability_type", "services")
    vendor_role = classify_vendor_role(capability_type)
    permissions = get_vendor_permissions(vendor_role)

    vendor_id = str(uuid4())
    now = _now()

    vendor_doc = {
        "id": vendor_id,
        "full_name": payload.get("full_name") or payload.get("contact_person_name", ""),
        "business_name": payload.get("business_name") or payload.get("company_name", ""),
        "company": payload.get("business_name") or payload.get("company_name", ""),
        "email": payload.get("email", ""),
        "country_code": country_code,
        "phone_prefix": payload.get("phone_prefix") or market["phone_prefix"],
        "phone_number": payload.get("phone_number", ""),
        "phone": f"{payload.get('phone_prefix') or market['phone_prefix']} {payload.get('phone_number', '')}".strip(),
        "currency_code": payload.get("currency_code") or market["currency_code"],
        "region": payload.get("region") or market.get("default_region", ""),
        "city": payload.get("city", ""),
        "address": payload.get("address", ""),
        "tin": payload.get("tin", ""),
        "vrn": payload.get("vrn", ""),
        "registration_number": payload.get("registration_number", ""),
        "bank_name": payload.get("bank_name", ""),
        "bank_account_name": payload.get("bank_account_name", ""),
        "bank_account_number": payload.get("bank_account_number", ""),
        "role": "vendor",
        "vendor_role": vendor_role,
        "capability_type": capability_type,
        "taxonomy_ids": payload.get("taxonomy_ids") or payload.get("category_ids", []),
        "subcategory_ids": payload.get("subcategory_ids", []),
        "service_capability_ids": payload.get("service_capability_ids", []),
        "vendor_status": "invited",
        "is_active": False,
        "notes": payload.get("notes", ""),
        "onboarded_by": payload.get("onboarded_by", ""),
        "created_at": now,
        "updated_at": now,
    }

    await db.users.insert_one(vendor_doc)
    vendor_doc.pop("_id", None)

    # Generate invite token
    invite_token = secrets.token_urlsafe(48)
    invite_doc = {
        "id": str(uuid4()),
        "vendor_id": vendor_id,
        "vendor_email": payload.get("email", ""),
        "token": invite_token,
        "status": "pending",
        "created_at": now,
        "expires_at": "",  # Set by caller or 7-day default
        "activated_at": None,
    }
    await db.vendor_invites.insert_one(invite_doc)
    invite_doc.pop("_id", None)

    return vendor_doc, invite_doc, permissions


async def activate_vendor_by_token(db, token: str, password_hash: str):
    """
    Activate a vendor account using an invite token.
    Sets password, activates vendor, marks invite as used.
    """
    invite = await db.vendor_invites.find_one({"token": token, "status": "pending"}, {"_id": 0})
    if not invite:
        return None, "Invalid or expired invite token"

    vendor_id = invite["vendor_id"]
    now = _now()

    await db.users.update_one(
        {"id": vendor_id},
        {"$set": {
            "password": password_hash,
            "is_active": True,
            "vendor_status": "active",
            "activated_at": now,
            "updated_at": now,
        }}
    )

    await db.vendor_invites.update_one(
        {"id": invite["id"]},
        {"$set": {"status": "activated", "activated_at": now}}
    )

    vendor = await db.users.find_one({"id": vendor_id}, {"_id": 0, "password": 0})
    return vendor, None
