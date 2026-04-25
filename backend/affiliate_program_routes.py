"""
Affiliate Program Routes — Setup Wizard, Contract Engine, Notifications
Handles: setup completion, promo code creation, status engine, notifications.
"""
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import os
import re

router = APIRouter(prefix="/api/affiliate-program", tags=["Affiliate Program"])
security = HTTPBearer(auto_error=False)

JWT_SECRET = os.environ.get("JWT_SECRET", "konekt-secret-key-2024")
PARTNER_JWT_SECRET = os.environ.get("PARTNER_JWT_SECRET", "konekt-partner-secret-2024")


async def _get_affiliate_from_token(credentials: HTTPAuthorizationCredentials, db):
    """Resolve affiliate from JWT token (supports both main and partner JWT)."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = credentials.credentials
    email = None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        email = payload.get("email") or payload.get("sub")
        if not email:
            user_id = payload.get("user_id")
            if user_id:
                user = await db.users.find_one({"id": user_id}, {"_id": 0})
                email = user.get("email") if user else None
    except jwt.InvalidSignatureError:
        try:
            payload = jwt.decode(token, PARTNER_JWT_SECRET, algorithms=["HS256"])
            email = payload.get("sub") or payload.get("email")
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    if not email:
        raise HTTPException(status_code=401, detail="Could not resolve user email")

    affiliate = await db.affiliates.find_one({"email": email}, {"_id": 0})
    if not affiliate:
        raise HTTPException(status_code=404, detail="Affiliate account not found")
    return affiliate


@router.get("/my-status")
async def get_my_affiliate_status(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current affiliate status: setup_complete, contract tier, performance."""
    db = request.app.mongodb
    affiliate = await _get_affiliate_from_token(credentials, db)

    return {
        "id": affiliate.get("id"),
        "name": affiliate.get("name"),
        "email": affiliate.get("email"),
        "setup_complete": affiliate.get("setup_complete", False),
        "affiliate_code": affiliate.get("affiliate_code", ""),
        "affiliate_code_locked": bool(affiliate.get("affiliate_code")),
        "payout_method": affiliate.get("payout_method", ""),
        "payout_details": affiliate.get("payout_details", {}),
        "contract_tier": affiliate.get("contract_tier", "starter"),
        "performance_status": affiliate.get("performance_status", "active"),
        "is_active": affiliate.get("is_active", True),
    }


@router.post("/setup/payout")
async def setup_payout(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Step 1: Save payout details (Mobile Money or Bank)."""
    db = request.app.mongodb
    affiliate = await _get_affiliate_from_token(credentials, db)
    body = await request.json()

    method = body.get("method")
    if method not in ("mobile_money", "bank_transfer"):
        raise HTTPException(status_code=400, detail="Method must be 'mobile_money' or 'bank_transfer'")

    payout_details = {}
    if method == "mobile_money":
        provider = body.get("provider", "").strip()
        phone_number = body.get("phone_number", "").strip()
        account_name = body.get("account_name", "").strip()
        if not provider or not phone_number or not account_name:
            raise HTTPException(status_code=400, detail="Provider, phone number, and account name required")
        payout_details = {"provider": provider, "phone_number": phone_number, "account_name": account_name}
    else:
        bank_name = body.get("bank_name", "").strip()
        account_name = body.get("account_name", "").strip()
        account_number = body.get("account_number", "").strip()
        if not bank_name or not account_name or not account_number:
            raise HTTPException(status_code=400, detail="Bank name, account name, and account number required")
        payout_details = {
            "bank_name": bank_name,
            "account_name": account_name,
            "account_number": account_number,
            "branch_name": body.get("branch_name", ""),
            "swift_code": body.get("swift_code", ""),
        }

    now = datetime.now(timezone.utc).isoformat()
    await db.affiliates.update_one(
        {"email": affiliate["email"]},
        {"$set": {"payout_method": method, "payout_details": payout_details, "updated_at": now}}
    )

    also_save_account = {
        "id": str(uuid4()),
        "user_email": affiliate["email"],
        "method": method,
        "is_default": True,
        **payout_details,
        "created_at": now,
    }
    await db.payout_accounts.update_many(
        {"user_email": affiliate["email"]}, {"$set": {"is_default": False}}
    )
    await db.payout_accounts.insert_one(also_save_account)

    return {"ok": True, "payout_method": method, "payout_details": payout_details}


@router.post("/setup/promo-code")
async def setup_promo_code(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Step 2: Create unique promo code. ENTER ONCE → LOCKED FOREVER.

    Once an affiliate sets their code, every published creative + caption
    + QR code on every WhatsApp screenshot/IG story already carries that
    code. Editing it later would silently break attribution on every
    historical share, so we hard-lock the code on first save.
    """
    db = request.app.mongodb
    affiliate = await _get_affiliate_from_token(credentials, db)
    body = await request.json()

    # Hard lock: refuse update once a code is already in place
    if affiliate.get("affiliate_code"):
        raise HTTPException(
            status_code=409,
            detail="Your promo code is locked. Promo codes cannot be changed after first activation so your previous posts keep working.",
        )

    code = (body.get("code") or "").strip().upper()
    if not code:
        raise HTTPException(status_code=400, detail="Promo code is required")
    if len(code) < 3 or len(code) > 20:
        raise HTTPException(status_code=400, detail="Promo code must be 3-20 characters")
    if not re.match(r"^[A-Z0-9_]+$", code):
        raise HTTPException(status_code=400, detail="Only letters, numbers, and underscores allowed")

    existing = await db.affiliates.find_one(
        {"affiliate_code": code, "email": {"$ne": affiliate["email"]}}, {"_id": 0}
    )
    if existing:
        raise HTTPException(status_code=409, detail="This promo code is already taken")

    existing_sales = await db.users.find_one({"sales_promo_code": code}, {"_id": 0})
    if existing_sales:
        raise HTTPException(status_code=409, detail="This code is already taken by another team member")

    existing_promo = await db.promotions.find_one({"code": code}, {"_id": 0})
    if existing_promo:
        raise HTTPException(status_code=409, detail="This code conflicts with an existing promotion")

    base_url = os.environ.get("REACT_APP_BACKEND_URL", "https://konekt.co.tz")
    now = datetime.now(timezone.utc).isoformat()
    await db.affiliates.update_one(
        {"email": affiliate["email"]},
        {"$set": {
            "affiliate_code": code,
            "affiliate_code_locked": True,
            "affiliate_code_created_at": now,
            "affiliate_link": f"/a/{code}",
            "referral_link": f"{base_url}/?ref={code}",
            "updated_at": now,
        }}
    )

    return {"ok": True, "code": code, "locked": True, "link": f"{base_url}/?ref={code}"}


@router.get("/validate-code/{code}")
async def validate_promo_code(code: str, request: Request):
    """Check if a promo code is available (public)."""
    db = request.app.mongodb
    code = code.strip().upper()
    if len(code) < 3 or len(code) > 20 or not re.match(r"^[A-Z0-9_]+$", code):
        return {"available": False, "reason": "Invalid format"}

    existing = await db.affiliates.find_one({"affiliate_code": code}, {"_id": 0})
    if existing:
        return {"available": False, "reason": "Already taken"}

    existing_promo = await db.promotions.find_one({"code": code}, {"_id": 0})
    if existing_promo:
        return {"available": False, "reason": "Conflicts with existing promotion"}

    return {"available": True}


@router.post("/setup/complete")
async def complete_setup(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Mark setup as complete (after payout + promo code are set)."""
    db = request.app.mongodb
    affiliate = await _get_affiliate_from_token(credentials, db)

    if not affiliate.get("payout_method"):
        raise HTTPException(status_code=400, detail="Payout method not set")
    code = affiliate.get("affiliate_code", "")
    if not code or code.startswith("TEMP_"):
        raise HTTPException(status_code=400, detail="Promo code not set")

    now = datetime.now(timezone.utc).isoformat()
    await db.affiliates.update_one(
        {"email": affiliate["email"]},
        {"$set": {"setup_complete": True, "updated_at": now}}
    )

    await _create_affiliate_notification(
        db, affiliate["email"],
        "Welcome to the Program!",
        f"Your affiliate account is ready. Your promo code is {code}. Start sharing and earning!",
        "setup_complete"
    )

    return {"ok": True, "setup_complete": True}


# ═══ CONTRACT & STATUS ENGINE ═══

@router.get("/my-performance")
async def get_my_performance(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get affiliate's performance vs contract targets."""
    db = request.app.mongodb
    affiliate = await _get_affiliate_from_token(credentials, db)

    settings = await db.affiliate_settings.find_one({}, {"_id": 0}) or {}
    contracts = settings.get("contracts", {})
    tier = affiliate.get("contract_tier", "starter")
    contract = contracts.get(tier, contracts.get("starter", {}))

    commissions = await db.affiliate_commissions.find(
        {"$or": [
            {"affiliate_code": affiliate.get("affiliate_code")},
            {"affiliate_email": affiliate.get("email")}
        ]},
        {"_id": 0}
    ).to_list(500)

    total_deals = len(commissions)
    total_earnings = sum(float(c.get("commission_amount", 0) or c.get("commission", 0) or 0) for c in commissions)
    pending_earnings = sum(
        float(c.get("commission_amount", 0) or c.get("commission", 0) or 0)
        for c in commissions if c.get("status") in ("pending", "expected")
    )
    paid_earnings = sum(
        float(c.get("commission_amount", 0) or c.get("commission", 0) or 0)
        for c in commissions if c.get("status") == "paid"
    )

    min_deals = contract.get("min_deals", 5)
    min_earnings = contract.get("min_earnings", 50000)
    deal_pct = round((total_deals / min_deals * 100) if min_deals > 0 else 100, 1)
    earnings_pct = round((total_earnings / min_earnings * 100) if min_earnings > 0 else 100, 1)

    return {
        "contract_tier": tier,
        "contract_label": contract.get("label", "Starter"),
        "duration_months": contract.get("duration_months", 1),
        "performance_status": affiliate.get("performance_status", "active"),
        "targets": {"min_deals": min_deals, "min_earnings": min_earnings},
        "actuals": {
            "total_deals": total_deals,
            "total_earnings": round(total_earnings, 2),
            "pending_earnings": round(pending_earnings, 2),
            "paid_earnings": round(paid_earnings, 2),
        },
        "progress": {
            "deals_pct": min(deal_pct, 100),
            "earnings_pct": min(earnings_pct, 100),
        },
    }


@router.post("/admin/evaluate/{affiliate_id}")
async def evaluate_affiliate_status(affiliate_id: str, request: Request):
    """Admin: evaluate an affiliate's status against contract targets."""
    db = request.app.mongodb
    affiliate = await db.affiliates.find_one({"id": affiliate_id}, {"_id": 0})
    if not affiliate:
        raise HTTPException(status_code=404, detail="Affiliate not found")

    settings = await db.affiliate_settings.find_one({}, {"_id": 0}) or {}
    contracts = settings.get("contracts", {})
    status_engine = settings.get("status_engine", {})
    tier = affiliate.get("contract_tier", "starter")
    contract = contracts.get(tier, {})

    commissions = await db.affiliate_commissions.find(
        {"$or": [
            {"affiliate_code": affiliate.get("affiliate_code")},
            {"affiliate_email": affiliate.get("email")}
        ]},
        {"_id": 0}
    ).to_list(500)

    total_deals = len(commissions)
    total_earnings = sum(float(c.get("commission_amount", 0) or c.get("commission", 0) or 0) for c in commissions)

    min_deals = contract.get("min_deals", 5)
    min_earnings = contract.get("min_earnings", 50000)
    deal_pct = (total_deals / min_deals * 100) if min_deals > 0 else 100
    earnings_pct = (total_earnings / min_earnings * 100) if min_earnings > 0 else 100
    overall_pct = min(deal_pct, earnings_pct)

    warning_threshold = status_engine.get("warning_threshold_pct", 50)
    probation_threshold = status_engine.get("probation_threshold_pct", 25)

    new_status = "active"
    if overall_pct < probation_threshold:
        new_status = "probation"
    elif overall_pct < warning_threshold:
        new_status = "warning"

    now = datetime.now(timezone.utc).isoformat()
    if new_status != affiliate.get("performance_status"):
        await db.affiliates.update_one(
            {"id": affiliate_id},
            {"$set": {"performance_status": new_status, "updated_at": now}}
        )
        if new_status == "warning":
            await _create_affiliate_notification(
                db, affiliate["email"],
                "Performance Warning",
                f"You are at {overall_pct:.0f}% of your target. Increase activity to stay on track.",
                "performance_warning"
            )
        elif new_status == "probation":
            await _create_affiliate_notification(
                db, affiliate["email"],
                "Account at Risk",
                f"Your performance is at {overall_pct:.0f}% of target. Your account may be suspended if performance doesn't improve.",
                "performance_probation"
            )

    return {
        "affiliate_id": affiliate_id,
        "previous_status": affiliate.get("performance_status"),
        "new_status": new_status,
        "overall_pct": round(overall_pct, 1),
    }


@router.post("/admin/update-tier/{affiliate_id}")
async def update_affiliate_tier(affiliate_id: str, request: Request):
    """Admin: upgrade or downgrade affiliate contract tier."""
    db = request.app.mongodb
    body = await request.json()
    new_tier = body.get("tier")
    if new_tier not in ("starter", "growth", "top"):
        raise HTTPException(status_code=400, detail="Invalid tier")

    affiliate = await db.affiliates.find_one({"id": affiliate_id}, {"_id": 0})
    if not affiliate:
        raise HTTPException(status_code=404, detail="Affiliate not found")

    now = datetime.now(timezone.utc).isoformat()
    old_tier = affiliate.get("contract_tier", "starter")
    await db.affiliates.update_one(
        {"id": affiliate_id},
        {"$set": {"contract_tier": new_tier, "contract_start": now, "updated_at": now}}
    )

    direction = "upgraded" if ["starter", "growth", "top"].index(new_tier) > ["starter", "growth", "top"].index(old_tier) else "adjusted"
    await _create_affiliate_notification(
        db, affiliate["email"],
        f"Contract {direction.title()}",
        f"Your contract has been {direction} to {new_tier.title()} tier.",
        "contract_change"
    )

    return {"ok": True, "old_tier": old_tier, "new_tier": new_tier}


@router.post("/admin/update-status/{affiliate_id}")
async def admin_update_affiliate_status(affiliate_id: str, request: Request):
    """Admin: manually set affiliate performance status."""
    db = request.app.mongodb
    body = await request.json()
    new_status = body.get("status")
    if new_status not in ("active", "warning", "probation", "suspended"):
        raise HTTPException(status_code=400, detail="Invalid status")

    now = datetime.now(timezone.utc).isoformat()
    result = await db.affiliates.update_one(
        {"id": affiliate_id},
        {"$set": {"performance_status": new_status, "updated_at": now}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Affiliate not found")

    affiliate = await db.affiliates.find_one({"id": affiliate_id}, {"_id": 0})
    if affiliate and new_status == "suspended":
        await db.affiliates.update_one({"id": affiliate_id}, {"$set": {"is_active": False}})
        await _create_affiliate_notification(
            db, affiliate["email"],
            "Account Suspended",
            "Your affiliate account has been suspended due to performance issues. Please contact support.",
            "account_suspended"
        )

    return {"ok": True, "status": new_status}


# ═══ NOTIFICATIONS ═══

@router.get("/notifications")
async def get_my_notifications(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get affiliate notifications."""
    db = request.app.mongodb
    affiliate = await _get_affiliate_from_token(credentials, db)
    notifs = await db.affiliate_notifications.find(
        {"affiliate_email": affiliate["email"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    unread = sum(1 for n in notifs if not n.get("is_read"))
    return {"notifications": notifs, "unread_count": unread}


@router.post("/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: str, request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Mark a notification as read."""
    db = request.app.mongodb
    affiliate = await _get_affiliate_from_token(credentials, db)
    await db.affiliate_notifications.update_one(
        {"id": notif_id, "affiliate_email": affiliate["email"]},
        {"$set": {"is_read": True}}
    )
    return {"ok": True}


@router.post("/notifications/read-all")
async def mark_all_notifications_read(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Mark all notifications as read."""
    db = request.app.mongodb
    affiliate = await _get_affiliate_from_token(credentials, db)
    await db.affiliate_notifications.update_many(
        {"affiliate_email": affiliate["email"], "is_read": False},
        {"$set": {"is_read": True}}
    )
    return {"ok": True}


async def _create_affiliate_notification(db, email: str, title: str, message: str, notif_type: str):
    """Create a notification for an affiliate."""
    doc = {
        "id": str(uuid4()),
        "affiliate_email": email,
        "title": title,
        "message": message,
        "type": notif_type,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.affiliate_notifications.insert_one(doc)
    return doc


# ═══ CONTENT STUDIO — SHARE CAMPAIGNS ═══

@router.get("/campaigns")
async def get_shareable_campaigns(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get products/campaigns with auto-injected promo code for sharing."""
    db = request.app.mongodb
    affiliate = await _get_affiliate_from_token(credentials, db)

    code = affiliate.get("affiliate_code", "")

    from services.creative_generator_service import generate_campaign_content, get_shareable_products, generate_group_deal_campaigns
    products = await get_shareable_products(db)
    campaigns = await generate_campaign_content(db, products, "affiliate", code)
    group_deals = await generate_group_deal_campaigns(db, code)

    return {"campaigns": campaigns, "group_deals": group_deals, "promo_code": code, "total": len(campaigns) + len(group_deals)}
