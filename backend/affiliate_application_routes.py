"""
Affiliate Application Routes — Qualification-Based with Token Activation
Public: Submit qualification form, check status.
Admin: List, review, approve/reject with notes, WhatsApp activation.
Activation: Token-based password creation.
"""
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import re
import secrets

router = APIRouter(prefix="/api/affiliate-applications", tags=["Affiliate Applications"])


class AffiliateApplicationCreate(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    location: Optional[str] = None
    primary_platform: str
    social_instagram: Optional[str] = None
    social_tiktok: Optional[str] = None
    social_facebook: Optional[str] = None
    social_website: Optional[str] = None
    audience_size: str
    promotion_strategy: str
    product_interests: Optional[str] = None
    prior_experience: bool = False
    experience_description: Optional[str] = None
    expected_monthly_sales: int = 0
    willing_to_promote_weekly: bool = True
    why_join: str
    agreed_performance_terms: bool = True
    agreed_terms: bool = True


async def _get_base_url(db):
    """Get base public URL from settings."""
    settings_row = await db.admin_settings.find_one({"key": "settings_hub"})
    s = settings_row.get("value", {}) if settings_row else {}
    bp = s.get("business_profile", {})
    base = bp.get("base_public_url", "").rstrip("/")
    if base:
        return base
    import os
    return os.environ.get("REACT_APP_BACKEND_URL", "https://konekt.co.tz").rstrip("/")


async def _get_affiliate_email_settings(db):
    """Get affiliate email settings."""
    settings_row = await db.admin_settings.find_one({"key": "settings_hub"})
    s = settings_row.get("value", {}) if settings_row else {}
    return s.get("affiliate_emails", {
        "send_application_received": True,
        "send_application_approved": True,
        "send_application_rejected": True,
        "sla_response_text": "We will review your application within 48-72 hours.",
    })


@router.post("")
async def submit_application(payload: AffiliateApplicationCreate, request: Request):
    """Submit a qualification-based affiliate application (public)."""
    db = request.app.mongodb

    settings = await db.affiliate_settings.find_one({}, {"_id": 0}) or {}
    if not settings.get("application_enabled", True):
        raise HTTPException(status_code=403, detail="Affiliate applications are currently closed")

    existing = await db.affiliate_applications.find_one(
        {"email": payload.email, "status": {"$in": ["pending", "approved"]}}, {"_id": 0}
    )
    if existing:
        if existing["status"] == "pending":
            raise HTTPException(status_code=400, detail="You already have a pending application")
        if existing["status"] == "approved":
            raise HTTPException(status_code=400, detail="You are already an approved affiliate")

    if not payload.agreed_terms or not payload.agreed_performance_terms:
        raise HTTPException(status_code=400, detail="You must agree to the terms")

    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid4()),
        **payload.model_dump(),
        "status": "pending",
        "activation_status": "not_sent",
        "admin_notes": "",
        "reviewed_at": None,
        "reviewed_by": None,
        "activation_token": None,
        "activation_token_expires": None,
        "activation_email_sent": False,
        "activation_whatsapp_opened": False,
        "account_activated": False,
        "setup_completed": False,
        "created_at": now,
        "updated_at": now,
    }
    await db.affiliate_applications.insert_one(doc)
    doc.pop("_id", None)

    # Send application received email
    try:
        email_settings = await _get_affiliate_email_settings(db)
        if email_settings.get("send_application_received", True):
            sla = email_settings.get("sla_response_text", "We will review your application within 48-72 hours.")
            from services.canonical_email_engine import send_email
            await send_email(
                db, payload.email,
                "Application Received - Affiliate Program",
                "Application Received",
                f'''<p style="color:#475569;font-size:15px;line-height:1.6;">Hello {payload.full_name},</p>
                <p style="color:#475569;font-size:15px;line-height:1.6;">Thank you for applying to our affiliate program.</p>
                <p style="color:#475569;font-size:14px;line-height:1.6;">{sla}</p>
                <p style="color:#475569;font-size:14px;">We will review your application and notify you of our decision.</p>''',
            )
    except Exception as e:
        print(f"Warning: Application received email error: {e}")

    return {"ok": True, "application": {k: v for k, v in doc.items() if k != "activation_token"}}


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
    pipeline = [{"$group": {"_id": "$status", "count": {"$sum": 1}}}]
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
    """Approve application, create affiliate + user account with activation token."""
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
        "notes": f"From application. Platform: {app_doc.get('primary_platform', '')}. Audience: {app_doc.get('audience_size', '')}.",
        "created_at": now,
        "updated_at": now,
    }
    await db.affiliates.insert_one(affiliate_doc)
    affiliate_doc.pop("_id", None)

    # Generate activation token
    activation_token = secrets.token_urlsafe(48)
    token_expires = (datetime.now(timezone.utc) + timedelta(hours=48)).isoformat()

    await db.affiliate_applications.update_one(
        {"id": application_id},
        {"$set": {
            "status": "approved",
            "affiliate_id": affiliate_doc["id"],
            "admin_notes": body.get("admin_notes", ""),
            "reviewed_at": now,
            "updated_at": now,
            "activation_token": activation_token,
            "activation_token_expires": token_expires,
            "activation_status": "sent",
        }}
    )

    # Create user account (password not set yet — will be set via activation)
    existing_user = await db.users.find_one({"email": app_doc["email"]}, {"_id": 0})
    user_created = False
    if not existing_user:
        user_doc = {
            "id": str(uuid4()),
            "email": app_doc["email"],
            "full_name": app_doc.get("full_name", ""),
            "phone": app_doc.get("phone", ""),
            "password_hash": "",
            "role": "affiliate",
            "is_active": False,
            "points": 0,
            "referral_code": "",
            "company": "",
            "created_at": now,
            "updated_at": now,
        }
        await db.users.insert_one(user_doc)
        user_created = True
    else:
        if existing_user.get("role") != "affiliate":
            await db.users.update_one({"email": app_doc["email"]}, {"$set": {"role": "affiliate"}})

    base_url = await _get_base_url(db)
    activation_link = f"{base_url}/activate?token={activation_token}"

    # Send approved email with activation link
    try:
        email_settings = await _get_affiliate_email_settings(db)
        if email_settings.get("send_application_approved", True):
            from services.canonical_email_engine import send_email
            await send_email(
                db, app_doc["email"],
                "You're Approved - Activate Your Affiliate Account",
                "Welcome to the Program!",
                f'''<p style="color:#475569;font-size:15px;line-height:1.6;">Hello {app_doc.get("full_name", "Partner")},</p>
                <p style="color:#059669;font-size:16px;font-weight:600;">Your affiliate application has been approved!</p>
                <p style="color:#475569;font-size:14px;line-height:1.6;">Click the button below to create your password and activate your account. Then log in to complete your setup and start earning.</p>
                <p style="color:#94a3b8;font-size:12px;margin-top:16px;">This link expires in 48 hours.</p>''',
                activation_link, "Create Your Password"
            )
            await db.affiliate_applications.update_one(
                {"id": application_id}, {"$set": {"activation_email_sent": True}}
            )
    except Exception as e:
        print(f"Warning: Affiliate approved email error: {e}")

    # Build WhatsApp message for admin
    whatsapp_message = (
        f"Hello {app_doc.get('full_name', '')},\n\n"
        f"Your affiliate application has been approved!\n\n"
        f"Set your password and activate your account here:\n"
        f"{activation_link}\n\n"
        f"Once done, log in and complete your setup to start earning.\n\n"
        f"- Connect Team"
    )
    whatsapp_phone = (app_doc.get("phone") or "").replace("+", "").replace(" ", "")

    return {
        "ok": True,
        "affiliate": affiliate_doc,
        "user_created": user_created,
        "activation_link": activation_link,
        "whatsapp_link": f"https://wa.me/{whatsapp_phone}?text={_urlencode(whatsapp_message)}" if whatsapp_phone else None,
        "whatsapp_message": whatsapp_message,
    }


def _urlencode(text):
    import urllib.parse
    return urllib.parse.quote(text, safe="")


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

    # Send rejection email
    try:
        email_settings = await _get_affiliate_email_settings(db)
        if email_settings.get("send_application_rejected", True):
            reason = body.get("admin_notes", body.get("note", ""))
            reason_html = f'<p style="color:#475569;font-size:14px;">Reason: {reason}</p>' if reason else ""
            from services.canonical_email_engine import send_email
            await send_email(
                db, app_doc["email"],
                "Affiliate Application Update",
                "Application Update",
                f'''<p style="color:#475569;font-size:15px;line-height:1.6;">Hello {app_doc.get("full_name", "")},</p>
                <p style="color:#475569;font-size:15px;line-height:1.6;">Thank you for your interest in our affiliate program. After reviewing your application, we are unable to approve it at this time.</p>
                {reason_html}
                <p style="color:#475569;font-size:14px;">You are welcome to reapply in the future.</p>''',
            )
    except Exception as e:
        print(f"Warning: Rejection email error: {e}")

    return {"ok": True, "status": "rejected"}


@router.post("/{application_id}/resend-activation")
async def resend_activation(application_id: str, request: Request):
    """Resend or regenerate activation token."""
    db = request.app.mongodb
    app_doc = await db.affiliate_applications.find_one({"id": application_id}, {"_id": 0})
    if not app_doc:
        raise HTTPException(status_code=404, detail="Application not found")
    # Allow resend if approved OR if activation was previously sent
    if app_doc.get("status") not in ("approved",) and app_doc.get("activation_status") not in ("sent", "expired"):
        raise HTTPException(status_code=400, detail="Application must be approved first")
    if app_doc.get("account_activated"):
        raise HTTPException(status_code=400, detail="Account already activated")

    new_token = secrets.token_urlsafe(48)
    new_expires = (datetime.now(timezone.utc) + timedelta(hours=48)).isoformat()

    await db.affiliate_applications.update_one(
        {"id": application_id},
        {"$set": {
            "activation_token": new_token,
            "activation_token_expires": new_expires,
            "activation_status": "sent",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )

    base_url = await _get_base_url(db)
    activation_link = f"{base_url}/activate?token={new_token}"

    # Send email
    try:
        from services.canonical_email_engine import send_email
        await send_email(
            db, app_doc["email"],
            "Activate Your Affiliate Account",
            "Activate Your Account",
            f'''<p style="color:#475569;font-size:15px;">Hello {app_doc.get("full_name", "")},</p>
            <p style="color:#475569;font-size:14px;">Click below to create your password and activate your affiliate account.</p>
            <p style="color:#94a3b8;font-size:12px;margin-top:12px;">This link expires in 48 hours.</p>''',
            activation_link, "Create Your Password"
        )
    except Exception as e:
        print(f"Warning: Resend activation email error: {e}")

    whatsapp_phone = (app_doc.get("phone") or "").replace("+", "").replace(" ", "")
    whatsapp_message = (
        f"Hello {app_doc.get('full_name', '')},\n\n"
        f"Activate your affiliate account here:\n{activation_link}\n\n- Connect Team"
    )

    return {
        "ok": True,
        "activation_link": activation_link,
        "whatsapp_link": f"https://wa.me/{whatsapp_phone}?text={_urlencode(whatsapp_message)}" if whatsapp_phone else None,
    }


@router.post("/{application_id}/mark-whatsapp-sent")
async def mark_whatsapp_sent(application_id: str, request: Request):
    """Mark that WhatsApp activation was opened by admin."""
    db = request.app.mongodb
    await db.affiliate_applications.update_one(
        {"id": application_id},
        {"$set": {"activation_whatsapp_opened": True, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"ok": True}


# ═══ ACTIVATION ═══

@router.post("/activate")
async def activate_account(request: Request):
    """Validate activation token and set password."""
    db = request.app.mongodb
    body = await request.json()
    token = body.get("token", "").strip()
    password = body.get("password", "").strip()

    if not token or not password:
        raise HTTPException(status_code=400, detail="Token and password required")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    app_doc = await db.affiliate_applications.find_one({"activation_token": token}, {"_id": 0})
    if not app_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired activation link")
    if app_doc.get("account_activated"):
        raise HTTPException(status_code=400, detail="Account already activated. Please log in.")

    expires = app_doc.get("activation_token_expires", "")
    if expires:
        try:
            exp_dt = datetime.fromisoformat(expires.replace("Z", "+00:00"))
            if datetime.now(timezone.utc) > exp_dt:
                raise HTTPException(status_code=400, detail="Activation link has expired. Please request a new one.")
        except ValueError:
            pass

    import bcrypt
    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    email = app_doc["email"]
    now = datetime.now(timezone.utc).isoformat()

    # Update user account
    await db.users.update_one(
        {"email": email},
        {"$set": {"password_hash": password_hash, "is_active": True, "updated_at": now}}
    )

    # Mark activation complete
    await db.affiliate_applications.update_one(
        {"id": app_doc["id"]},
        {"$set": {
            "account_activated": True,
            "activation_status": "activated",
            "activation_token": None,
            "updated_at": now,
        }}
    )

    return {"ok": True, "message": "Account activated. You can now log in.", "email": email}


@router.get("/check/{identifier}")
async def check_status(identifier: str, request: Request):
    """Check application status by email or phone (public)."""
    db = request.app.mongodb
    query = {"$or": [{"email": identifier}]}
    if not re.match(r"[^@]+@[^@]+\.[^@]+", identifier):
        query = {"$or": [{"phone": {"$regex": identifier.replace("+", "\\+")}}]}
    else:
        query["$or"].append({"phone": identifier})

    doc = await db.affiliate_applications.find_one(query, {"_id": 0, "status": 1, "created_at": 1, "reviewed_at": 1, "admin_notes": 1})
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
