from datetime import datetime
import os
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
import jwt
from commission_trigger_service import get_payout_progress

router = APIRouter(prefix="/api/affiliate", tags=["Affiliate Dashboard"])
security = HTTPBearer(auto_error=False)

# Database connection
client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
db = client[os.environ.get('DB_NAME', 'konekt')]

JWT_SECRET = os.environ.get('JWT_SECRET', 'konekt-secret-key-2024')
PARTNER_JWT_SECRET = os.environ.get('PARTNER_JWT_SECRET', 'konekt-partner-secret-2024')


async def get_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    try:
        # Try main JWT secret first
        try:
            payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        except jwt.InvalidSignatureError:
            # Try partner JWT secret
            payload = jwt.decode(credentials.credentials, PARTNER_JWT_SECRET, algorithms=["HS256"])
        
        user_id = payload.get("user_id") or payload.get("sub")
        if not user_id:
            return None
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            # Try by email - check both 'email' field and 'sub' (which may contain email for partner tokens)
            email = payload.get("email") or payload.get("sub")
            if email and "@" in str(email):
                user = await db.users.find_one({"email": email}, {"_id": 0})
        # If still no user found but we have email from token, return a minimal user object
        if not user:
            email = payload.get("email") or payload.get("sub")
            if email and "@" in str(email):
                user = {"email": email, "id": payload.get("partner_user_id") or payload.get("user_id") or user_id}
        return user
    except Exception as e:
        print(f"get_user exception: {e}")
        return None


@router.get("/me")
async def get_affiliate_dashboard(user: dict = Depends(get_user)):
    if not user:
        return {
            "profile": {},
            "summary": {"total_earned": 0, "total_approved": 0, "total_paid": 0, "payable_balance": 0},
            "recent_commissions": [],
            "recent_payouts": [],
        }
    user_email = user.get("email")

    affiliate = await db.affiliates.find_one({"email": user_email})
    if not affiliate:
        return {
            "profile": {"name": user.get("full_name", ""), "email": user_email},
            "summary": {"total_earned": 0, "total_approved": 0, "total_paid": 0, "payable_balance": 0},
            "recent_commissions": [],
            "recent_payouts": [],
        }

    commissions = await db.affiliate_commissions.find({"affiliate_email": user_email}).to_list(length=500)
    payouts = await db.affiliate_payout_requests.find({"affiliate_email": user_email}).sort("created_at", -1).to_list(length=200)

    total_earned = sum(float(c.get("commission_amount", 0) or 0) for c in commissions)
    total_approved = sum(float(c.get("commission_amount", 0) or 0) for c in commissions if c.get("status") == "approved")
    total_paid = sum(float(c.get("amount", 0) or 0) for c in payouts if c.get("status") == "paid")
    payable_balance = max(0, total_approved - total_paid)

    return {
        "profile": {
            "name": affiliate.get("name"),
            "email": affiliate.get("email"),
            "status": affiliate.get("status"),
            "commission_rate": affiliate.get("commission_rate", 0),
            "promo_code": affiliate.get("promo_code"),
            "referral_link": affiliate.get("referral_link"),
        },
        "summary": {
            "total_earned": total_earned,
            "total_approved": total_approved,
            "total_paid": total_paid,
            "payable_balance": payable_balance,
        },
        "commissions": [
            {
                "id": str(c["_id"]),
                "source_document": c.get("source_document"),
                "sale_amount": c.get("sale_amount"),
                "commission_amount": c.get("commission_amount"),
                "status": c.get("status"),
                "created_at": c.get("created_at"),
            }
            for c in commissions
        ],
        "payout_requests": [
            {
                "id": str(p["_id"]),
                "amount": p.get("amount"),
                "status": p.get("status"),
                "created_at": p.get("created_at"),
            }
            for p in payouts
        ],
    }


@router.post("/me/payout-request")
async def create_payout_request(payload: dict, user: dict = Depends(get_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_email = user.get("email")

    amount = float(payload.get("amount", 0) or 0)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid amount")

    affiliate = await db.affiliates.find_one({"email": user_email})
    if not affiliate:
        raise HTTPException(status_code=404, detail="Affiliate profile not found")

    # Enforce minimum payout from settings
    settings_row = await db.admin_settings.find_one({"key": "settings_hub"})
    settings = settings_row.get("value", {}) if settings_row else {}
    payout_settings = settings.get("payouts", {})
    min_payout = float(payout_settings.get("affiliate_minimum_payout", 50000))

    if amount < min_payout:
        raise HTTPException(status_code=400, detail=f"Minimum payout is TZS {min_payout:,.0f}")

    # Calculate available balance
    commissions = await db.affiliate_commissions.find({"affiliate_email": user_email, "status": "approved"}).to_list(length=500)
    paid_payouts = await db.affiliate_payout_requests.find({"affiliate_email": user_email, "status": "paid"}).to_list(length=500)
    pending_payouts = await db.affiliate_payout_requests.find({"affiliate_email": user_email, "status": {"$in": ["pending", "approved"]}}).to_list(length=500)

    total_approved = sum(float(c.get("commission_amount", 0) or 0) for c in commissions)
    total_paid = sum(float(p.get("amount", 0) or 0) for p in paid_payouts)
    total_pending = sum(float(p.get("amount", 0) or 0) for p in pending_payouts)
    available_balance = max(0, total_approved - total_paid - total_pending)

    if amount > available_balance:
        raise HTTPException(status_code=400, detail=f"Amount exceeds available balance (TZS {available_balance:,.0f})")

    payout_method = payload.get("payout_method", "bank_transfer")
    payout_account_id = payload.get("payout_account_id")

    doc = {
        "affiliate_email": user_email,
        "affiliate_name": affiliate.get("name") or user.get("full_name", ""),
        "amount": amount,
        "payout_method": payout_method,
        "payout_account_id": payout_account_id,
        "status": "pending",
        "created_at": datetime.utcnow(),
        "note": payload.get("note", ""),
    }

    result = await db.affiliate_payout_requests.insert_one(doc)
    created = await db.affiliate_payout_requests.find_one({"_id": result.inserted_id})

    created["id"] = str(created["_id"])
    del created["_id"]
    return created


@router.get("/wallet")
async def get_wallet_balance(user: dict = Depends(get_user)):
    """
    Get wallet balances: pending, available, paid_out.
    Reads from commission engine + payout records. No guessing.
    """
    if not user:
        return {"pending": 0, "available": 0, "paid_out": 0, "minimum_payout": 50000}

    user_email = user.get("email")

    # All commissions for this affiliate
    all_commissions = await db.affiliate_commissions.find(
        {"affiliate_email": user_email}, {"_id": 0}
    ).to_list(500)

    # Pending = commissions not yet approved
    pending = sum(float(c.get("commission_amount", 0) or 0) for c in all_commissions if c.get("status") in ("pending", "expected"))
    # Approved = ready for withdrawal
    approved = sum(float(c.get("commission_amount", 0) or 0) for c in all_commissions if c.get("status") == "approved")

    # Paid payouts
    paid_payouts = await db.affiliate_payout_requests.find(
        {"affiliate_email": user_email, "status": "paid"}, {"_id": 0}
    ).to_list(500)
    total_paid_out = sum(float(p.get("amount", 0) or 0) for p in paid_payouts)

    # Pending payouts (requested but not yet paid)
    pending_payouts = await db.affiliate_payout_requests.find(
        {"affiliate_email": user_email, "status": {"$in": ["pending", "approved"]}}, {"_id": 0}
    ).to_list(500)
    total_pending_payouts = sum(float(p.get("amount", 0) or 0) for p in pending_payouts)

    available = max(0, approved - total_paid_out - total_pending_payouts)

    # Get minimum payout from settings
    settings_row = await db.admin_settings.find_one({"key": "settings_hub"})
    settings = settings_row.get("value", {}) if settings_row else {}
    payout_settings = settings.get("payouts", {})
    min_payout = float(payout_settings.get("affiliate_minimum_payout", 50000))
    payout_cycle = payout_settings.get("payout_cycle", "monthly")
    methods = payout_settings.get("payout_methods_enabled", ["mobile_money", "bank_transfer"])

    return {
        "pending": round(pending, 2),
        "available": round(available, 2),
        "paid_out": round(total_paid_out, 2),
        "pending_withdrawal": round(total_pending_payouts, 2),
        "minimum_payout": min_payout,
        "payout_cycle": payout_cycle,
        "payout_methods": methods,
        "can_withdraw": available >= min_payout,
    }


@router.get("/payout-accounts")
async def list_payout_accounts(user: dict = Depends(get_user)):
    """List saved payout accounts for the affiliate."""
    if not user:
        return {"accounts": []}
    user_email = user.get("email")
    accounts = await db.payout_accounts.find(
        {"user_email": user_email}, {"_id": 0}
    ).to_list(20)
    return {"accounts": accounts}


@router.post("/payout-accounts")
async def create_payout_account(payload: dict, user: dict = Depends(get_user)):
    """Add a new payout account (mobile money or bank transfer)."""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user_email = user.get("email")
    method = payload.get("method")  # "mobile_money" or "bank_transfer"

    if method not in ("mobile_money", "bank_transfer"):
        raise HTTPException(status_code=400, detail="Method must be 'mobile_money' or 'bank_transfer'")

    import uuid
    account_id = str(uuid.uuid4())

    doc = {
        "id": account_id,
        "user_email": user_email,
        "method": method,
        "is_default": payload.get("is_default", False),
        "created_at": datetime.utcnow().isoformat(),
    }

    if method == "mobile_money":
        doc.update({
            "provider": payload.get("provider", ""),
            "account_name": payload.get("account_name", ""),
            "phone_number": payload.get("phone_number", ""),
        })
    else:
        doc.update({
            "bank_name": payload.get("bank_name", ""),
            "account_name": payload.get("account_name", ""),
            "account_number": payload.get("account_number", ""),
            "branch_name": payload.get("branch_name", ""),
            "swift_code": payload.get("swift_code", ""),
        })

    # If set as default, unset other defaults
    if doc["is_default"]:
        await db.payout_accounts.update_many(
            {"user_email": user_email, "method": method},
            {"$set": {"is_default": False}}
        )

    await db.payout_accounts.insert_one(doc)
    return {"ok": True, "account": {k: v for k, v in doc.items() if k != "_id"}}


@router.delete("/payout-accounts/{account_id}")
async def delete_payout_account(account_id: str, user: dict = Depends(get_user)):
    """Delete a payout account."""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    result = await db.payout_accounts.delete_one(
        {"id": account_id, "user_email": user.get("email")}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Account not found")
    return {"ok": True}


@router.get("/payout-history")
async def get_payout_history(user: dict = Depends(get_user)):
    """Get full payout history for the affiliate."""
    if not user:
        return {"payouts": []}
    user_email = user.get("email")
    payouts = await db.affiliate_payout_requests.find(
        {"affiliate_email": user_email}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)

    result = []
    for p in payouts:
        p_id = p.get("id") or str(p.get("_id", ""))
        result.append({
            "id": p_id,
            "amount": p.get("amount", 0),
            "status": p.get("status", "pending"),
            "payout_method": p.get("payout_method", "bank_transfer"),
            "created_at": p.get("created_at"),
            "approved_at": p.get("approved_at"),
            "paid_at": p.get("paid_at"),
            "payment_reference": p.get("payment_reference"),
            "note": p.get("note", ""),
            "rejection_note": p.get("rejection_note", ""),
        })
    return {"payouts": result}


@router.get("/dashboard/summary")
async def affiliate_summary(user: dict = Depends(get_user)):
    """Get affiliate dashboard summary with earnings and commissions"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    email = user.get("email")
    affiliate = await db.affiliates.find_one({"email": email})
    if not affiliate:
        raise HTTPException(status_code=404, detail="Affiliate account not found")

    commissions = await db.affiliate_commissions.find({
        "$or": [
            {"affiliate_code": affiliate.get("affiliate_code")},
            {"affiliate_email": email}
        ]
    }).sort("created_at", -1).to_list(length=300)

    total_sales = sum(float(x.get("sale_value", 0) or x.get("sale_amount", 0) or 0) for x in commissions)
    total_commission = sum(float(x.get("commission", 0) or x.get("commission_amount", 0) or 0) for x in commissions)
    pending_commission = sum(float(x.get("commission", 0) or x.get("commission_amount", 0) or 0) for x in commissions if x.get("status") == "pending")
    paid_commission = sum(float(x.get("commission", 0) or x.get("commission_amount", 0) or 0) for x in commissions if x.get("status") == "paid")

    # Get base URL from environment or use default
    base_url = os.environ.get("REACT_APP_BACKEND_URL", "https://konekt.app")

    return {
        "affiliate_code": affiliate.get("affiliate_code") or affiliate.get("promo_code"),
        "name": affiliate.get("name"),
        "email": affiliate.get("email"),
        "country": affiliate.get("country"),
        "total_sales": round(total_sales, 2),
        "total_commission": round(total_commission, 2),
        "pending_commission": round(pending_commission, 2),
        "paid_commission": round(paid_commission, 2),
        "share_link": affiliate.get("referral_link") or f"{base_url}/?ref={affiliate.get('affiliate_code') or affiliate.get('promo_code')}",
        "commissions": [
            {
                "order_id": x.get("order_id") or x.get("source_document"),
                "sale_value": x.get("sale_value", 0) or x.get("sale_amount", 0),
                "commission": x.get("commission", 0) or x.get("commission_amount", 0),
                "status": x.get("status", "pending"),
                "created_at": x.get("created_at"),
            }
            for x in commissions
        ],
    }


@router.get("/payout-progress")
async def affiliate_payout_progress(user: dict = Depends(get_user)):
    """Get payout progress - how much more needed to reach threshold"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    user_id = user.get("id")
    progress = await get_payout_progress(db, user_id, "affiliate")
    return progress


@router.get("/recent-earnings")
async def affiliate_recent_earnings(user: dict = Depends(get_user)):
    """Get recent commission earnings for 'You just earned' notifications"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    user_id = user.get("id")
    
    # Fetch commissions created in the last 24 hours for this user
    from datetime import timedelta
    cutoff = datetime.utcnow() - timedelta(hours=24)
    
    recent = await db.commission_records.find({
        "beneficiary_user_id": user_id,
        "created_at": {"$gte": cutoff}
    }).sort("created_at", -1).to_list(length=10)
    
    return [
        {
            "id": str(r.get("_id", "")),
            "amount": r.get("amount", 0),
            "currency": r.get("currency", "TZS"),
            "commission_type": r.get("beneficiary_type", "affiliate"),
            "status": r.get("status", "pending"),
            "created_at": r.get("created_at"),
        }
        for r in recent
    ]
