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
    gender: Optional[str] = None  # "Male" or "Female"
    date_of_birth: Optional[str] = None  # ISO date YYYY-MM-DD
    id_type: Optional[str] = None  # "national_id" | "passport" | "driver_license"
    id_number: Optional[str] = None
    id_document_url: Optional[str] = None  # uploaded image/PDF path
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
    whatsapp_consent: bool = True  # confirms phone is WhatsApp-enabled
    agreed_performance_terms: bool = True
    agreed_terms: bool = True


REJECTION_REASONS = [
    "Insufficient online presence",
    "Incomplete information",
    "Doesn't meet network criteria",
    "Conflicting interests",
    "Already rejected previously",
    "Other",
]


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

    # Normalise email to lowercase so duplicate-detection and later
    # case-insensitive lookups behave consistently.
    payload.email = payload.email.lower().strip()

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

    # Wire an in-app notification to admin/ops so the bell rings the moment
    # a new application lands. The admin Notifications page picks it up via
    # target_type='admin'.
    try:
        await db.notifications.insert_one({
            "id": str(uuid4()),
            "target_type": "admin",
            "target_id": "ops",
            "kind": "affiliate_application_received",
            "title": "New affiliate application",
            "message": f"{payload.full_name} just applied — {payload.primary_platform or 'no platform'} · {payload.audience_size or 'unknown audience'}",
            "deep_link": "/admin/affiliate-applications",
            "read": False,
            "created_at": now,
        })
    except Exception as e:
        print(f"Warning: affiliate notification insert failed: {e}")

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


@router.get("/rejection-reasons")
async def list_rejection_reasons():
    """Canonical list of pre-listed rejection reasons surfaced in the admin UI."""
    return {"reasons": REJECTION_REASONS}


@router.post("/upload-id-document")
async def upload_id_document(request: Request):
    """Public endpoint: applicant uploads their ID document (image or PDF).
    Returns a `{url}` that the form embeds into id_document_url before
    submitting. Storage is local under /app/uploads/affiliate_ids/.
    """
    import os
    from pathlib import Path

    form = await request.form()
    file = form.get("file")
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")

    # 8 MB limit, only image/* or application/pdf
    content = await file.read()
    if len(content) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 8 MB)")
    mime = (file.content_type or "").lower()
    if not (mime.startswith("image/") or mime == "application/pdf"):
        raise HTTPException(status_code=400, detail="Only image or PDF accepted")

    target_dir = Path("/app/uploads/affiliate_ids")
    target_dir.mkdir(parents=True, exist_ok=True)
    ext = (os.path.splitext(file.filename or "")[1] or "").lower()
    if ext not in (".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".pdf"):
        ext = ".pdf" if mime == "application/pdf" else ".jpg"
    fname = f"{uuid4()}{ext}"
    fpath = target_dir / fname
    fpath.write_bytes(content)
    return {"url": f"/api/uploads/affiliate_ids/{fname}", "filename": fname}


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

    rejection_reason = body.get("rejection_reason", "").strip()
    custom_note = body.get("admin_notes", body.get("note", "")).strip()
    # Compose final note: pre-listed reason + optional custom add-on
    if rejection_reason and rejection_reason not in REJECTION_REASONS:
        # Reject anything not in the canonical list (forces UI compliance)
        raise HTTPException(status_code=400, detail="Invalid rejection_reason")
    final_note = rejection_reason
    if custom_note:
        final_note = f"{rejection_reason} — {custom_note}" if rejection_reason else custom_note

    now = datetime.now(timezone.utc).isoformat()
    await db.affiliate_applications.update_one(
        {"id": application_id},
        {"$set": {
            "status": "rejected",
            "rejection_reason": rejection_reason or None,
            "admin_notes": final_note,
            "reviewed_at": now,
            "updated_at": now,
        }}
    )

    # Build WhatsApp deep-link for the rejection (optional, admin clicks)
    whatsapp_phone = (app_doc.get("phone") or "").replace("+", "").replace(" ", "")
    whatsapp_message = (
        f"Hello {app_doc.get('full_name', '')},\n\n"
        f"Thank you for applying to the Konekt affiliate program. "
        f"After reviewing your application, we are unable to approve it at this time."
        f"{(chr(10) + chr(10) + 'Reason: ' + final_note) if final_note else ''}"
        f"\n\nYou are welcome to reapply in the future.\n\n- Konekt Team"
    )
    whatsapp_link = (
        f"https://wa.me/{whatsapp_phone}?text={_urlencode(whatsapp_message)}"
        if whatsapp_phone else None
    )

    # Send rejection email
    try:
        email_settings = await _get_affiliate_email_settings(db)
        if email_settings.get("send_application_rejected", True):
            reason_html = (
                f'<p style="color:#475569;font-size:14px;">Reason: {final_note}</p>'
                if final_note else ""
            )
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

    return {
        "ok": True,
        "status": "rejected",
        "whatsapp_link": whatsapp_link,
        "whatsapp_message": whatsapp_message,
    }


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
    """Check application status by email or phone (public).

    `identifier` may be either a valid email, OR a phone number. Phone may
    include a leading `+` country prefix (URL-decoded by FastAPI) — we match
    on `phone` exactly, with `+` stripped, AND on the trailing-digits suffix
    so frontend can pass either `+255712345678` or `712345678`.
    """
    db = request.app.mongodb

    ident = (identifier or "").strip()
    if not ident:
        return {"exists": False, "status": None}

    if re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", ident):
        # Match email case-insensitively — older rows might have been stored
        # with the case the applicant typed in.
        query = {"email": {"$regex": f"^{re.escape(ident)}$", "$options": "i"}}
    else:
        digits_only = re.sub(r"\D", "", ident)
        if len(digits_only) < 6:
            return {"exists": False, "status": None}
        # Match either the full +-prefixed form OR a phone whose last 9 digits
        # equal the input's last 9 digits (handles users typing local-only).
        tail = digits_only[-9:]
        query = {"$or": [
            {"phone": ident},
            {"phone": {"$regex": re.escape(tail) + r"$"}},
        ]}

    doc = await db.affiliate_applications.find_one(
        query,
        {"_id": 0, "status": 1, "created_at": 1, "reviewed_at": 1,
         "admin_notes": 1, "rejection_reason": 1, "full_name": 1},
    )
    if not doc:
        return {"exists": False, "status": None}
    notes = doc.get("admin_notes", "") if doc.get("status") == "rejected" else ""
    return {
        "exists": True,
        "status": doc.get("status"),
        "submitted_at": doc.get("created_at"),
        "reviewed_at": doc.get("reviewed_at"),
        "rejection_reason": notes or doc.get("rejection_reason") or "",
        "full_name": doc.get("full_name", ""),
    }


@router.get("/admin/margin-audit")
async def affiliate_margin_audit(request: Request):
    """Audit every active promotion / group deal to confirm the affiliate
    commission allocation never exceeds the tier's distributable margin.

    Returns:
      • `healthy[]` — each promo with its computed affiliate share + headroom
      • `issues[]` — any promo where affiliate share would dip into protected
        margin (must be capped by admin)
      • `summary` — totals + verdict
    """
    db = request.app.mongodb

    # Pull current pricing tiers (per-branch fallback to default)
    settings_row = await db.admin_settings.find_one({"key": "settings_hub"})
    s = settings_row.get("value", {}) if settings_row else {}
    tier_map = s.get("pricing_policy_tiers") or {}
    if isinstance(tier_map, list):
        tier_map = {"default": tier_map}

    def _resolve_tier(branch: str, vendor_cost: float):
        tiers = tier_map.get(branch) or tier_map.get("default") or []
        if not isinstance(tiers, list):
            return None
        for t in tiers:
            if not isinstance(t, dict):
                continue
            lo = float(t.get("min", 0) or 0)
            hi = float(t.get("max", 0) or 0)
            if vendor_cost >= lo and (hi == 0 or vendor_cost < hi):
                return t
        return tiers[0] if tiers else None

    healthy, issues = [], []

    async for promo in db.platform_promotions.find(
        {"is_active": True}, {"_id": 0}
    ):
        product_id = promo.get("product_id")
        product = await db.products.find_one(
            {"id": product_id}, {"_id": 0}
        ) if product_id else None
        if not product:
            continue
        vc = float(product.get("vendor_cost") or 0)
        cp = float(product.get("customer_price") or 0)
        branch = product.get("branch") or "default"
        tier = _resolve_tier(branch, vc)
        if not tier:
            continue
        distributable_pct = float(tier.get("distributable_margin_pct", 0) or 0)
        distributable_tzs = round(vc * distributable_pct / 100)
        affiliate_share_pct = float(promo.get("affiliate_share_pct", 0) or 0)
        affiliate_share_tzs = round(distributable_tzs * affiliate_share_pct / 100)
        headroom = distributable_tzs - affiliate_share_tzs

        row = {
            "promo_id": promo.get("id"),
            "promo_label": promo.get("label") or promo.get("name"),
            "product_id": product_id,
            "product_name": product.get("name"),
            "branch": branch,
            "tier_label": tier.get("label", ""),
            "vendor_cost": vc,
            "customer_price": cp,
            "distributable_pct": distributable_pct,
            "distributable_tzs": distributable_tzs,
            "affiliate_share_pct": affiliate_share_pct,
            "affiliate_share_tzs": affiliate_share_tzs,
            "headroom_tzs": headroom,
        }
        if affiliate_share_tzs > distributable_tzs:
            row["issue"] = "affiliate share exceeds distributable margin — auto-cap recommended"
            issues.append(row)
        else:
            healthy.append(row)

    return {
        "healthy": healthy,
        "issues": issues,
        "summary": {
            "active_promos_audited": len(healthy) + len(issues),
            "issues_count": len(issues),
            "verdict": "ok" if not issues else "needs_attention",
        },
    }
