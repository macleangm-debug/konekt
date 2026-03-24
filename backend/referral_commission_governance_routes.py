from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, Request, HTTPException

router = APIRouter(prefix="/api/referral-commission", tags=["Referral + Sales Commission"])

DEFAULT_RULES = {
    "affiliate_commission_percent": 5,
    "sales_commission_percent": 3,
    "minimum_payout_threshold": 50000,
    "allow_affiliate_and_sales_same_order": True,
    "commission_trigger": "payment_approved",
}

def _money(v):
    return round(float(v or 0), 2)

def _now():
    return datetime.now(timezone.utc).isoformat()

async def _get_rules(db):
    row = await db.platform_settings.find_one({"key": "commission_rules"})
    return {**DEFAULT_RULES, **(row.get("value", {}) if row else {})}


async def create_commissions_for_order(db, order_id, invoice_id, customer_id, commissionable_base, affiliate_id=None, promo_code=None, sales_owner_id=None, sales_owner_name="Sales Advisor"):
    """Reusable helper to create commissions after payment approval. Called from approve flows."""
    rules = await _get_rules(db)
    if commissionable_base <= 0:
        return []
    created = []
    if affiliate_id or promo_code:
        if not affiliate_id and promo_code:
            affiliate = await db.affiliates.find_one({"promo_code": promo_code})
            affiliate_id = affiliate.get("id") if affiliate else None
        if affiliate_id:
            amount = _money(commissionable_base * float(rules["affiliate_commission_percent"]) / 100.0)
            row = {
                "id": str(uuid4()), "source_type": "affiliate",
                "affiliate_id": affiliate_id, "promo_code": promo_code,
                "sales_owner_id": None, "order_id": order_id,
                "invoice_id": invoice_id, "customer_id": customer_id,
                "amount": amount, "status": "approved", "created_at": _now(),
            }
            await db.commissions.insert_one(row)
            row.pop("_id", None)
            created.append(row)
    if sales_owner_id and (rules["allow_affiliate_and_sales_same_order"] or not created):
        amount = _money(commissionable_base * float(rules["sales_commission_percent"]) / 100.0)
        row = {
            "id": str(uuid4()), "source_type": "sales",
            "affiliate_id": None, "promo_code": None,
            "sales_owner_id": sales_owner_id, "sales_owner_name": sales_owner_name,
            "order_id": order_id, "invoice_id": invoice_id,
            "customer_id": customer_id, "amount": amount,
            "status": "approved", "created_at": _now(),
        }
        await db.commissions.insert_one(row)
        row.pop("_id", None)
        created.append(row)
    return created

@router.get("/rules")
async def get_rules(request: Request):
    db = request.app.mongodb
    return await _get_rules(db)

@router.put("/rules")
async def save_rules(payload: dict, request: Request):
    db = request.app.mongodb
    rules = {**DEFAULT_RULES, **payload}
    await db.platform_settings.update_one(
        {"key": "commission_rules"},
        {"$set": {"value": rules, "updated_at": _now()}},
        upsert=True,
    )
    return {"ok": True, "rules": rules}

@router.post("/affiliate/create")
async def create_affiliate(payload: dict, request: Request):
    db = request.app.mongodb
    code = (payload.get("promo_code") or "").strip().upper()
    if not code:
        raise HTTPException(status_code=400, detail="promo_code is required")
    existing = await db.affiliates.find_one({"promo_code": code})
    if existing:
        raise HTTPException(status_code=409, detail="promo_code already exists")
    row = {
        "id": str(uuid4()),
        "name": payload.get("name", "Affiliate"),
        "email": payload.get("email", ""),
        "phone": payload.get("phone", ""),
        "promo_code": code,
        "referral_link": payload.get("referral_link", f"/?ref={code}"),
        "status": payload.get("status", "active"),
        "created_at": _now(),
    }
    await db.affiliates.insert_one(row)
    row.pop("_id", None)
    return {"ok": True, "affiliate": row}

@router.get("/admin/affiliates")
async def admin_affiliates(request: Request):
    db = request.app.mongodb
    affiliates = await db.affiliates.find({}).sort("created_at", -1).to_list(length=500)
    out = []
    for a in affiliates:
        a.pop("_id", None)
        aff_id = a.get("id")
        clicks = await db.referral_events.count_documents({"affiliate_id": aff_id, "event_type": "click"})
        leads = await db.referral_events.count_documents({"affiliate_id": aff_id, "event_type": "lead"})
        approved_sales = await db.commissions.count_documents({"affiliate_id": aff_id, "status": {"$in": ["approved", "payable", "paid"]}})
        unpaid = await db.commissions.aggregate([
            {"$match": {"affiliate_id": aff_id, "status": {"$in": ["approved", "payable"]}}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]).to_list(length=1)
        out.append({
            "id": aff_id,
            "name": a.get("name", ""),
            "promo_code": a.get("promo_code", ""),
            "status": a.get("status", "active"),
            "clicks": clicks,
            "leads": leads,
            "approved_sales": approved_sales,
            "unpaid_commission": unpaid[0]["total"] if unpaid else 0,
        })
    return out

@router.get("/affiliate/dashboard")
async def affiliate_dashboard(request: Request, affiliate_id: str):
    db = request.app.mongodb
    affiliate = await db.affiliates.find_one({"id": affiliate_id})
    if not affiliate:
        raise HTTPException(status_code=404, detail="Affiliate not found")
    affiliate.pop("_id", None)
    clicks = await db.referral_events.count_documents({"affiliate_id": affiliate_id, "event_type": "click"})
    leads = await db.referral_events.count_documents({"affiliate_id": affiliate_id, "event_type": "lead"})
    sales = await db.commissions.count_documents({"affiliate_id": affiliate_id})
    earnings = await db.commissions.aggregate([
        {"$match": {"affiliate_id": affiliate_id}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(length=1)
    unpaid = await db.commissions.aggregate([
        {"$match": {"affiliate_id": affiliate_id, "status": {"$in": ["approved", "payable"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(length=1)
    return {
        "affiliate": {
            "id": affiliate.get("id"),
            "name": affiliate.get("name"),
            "promo_code": affiliate.get("promo_code"),
            "referral_link": affiliate.get("referral_link"),
            "status": affiliate.get("status"),
        },
        "stats": {
            "clicks": clicks,
            "leads": leads,
            "sales": sales,
            "earnings_total": earnings[0]["total"] if earnings else 0,
            "unpaid_commission": unpaid[0]["total"] if unpaid else 0,
        }
    }

@router.post("/track")
async def track_referral_event(payload: dict, request: Request):
    db = request.app.mongodb
    code = (payload.get("promo_code") or "").strip().upper()
    if not code:
        raise HTTPException(status_code=400, detail="promo_code required")
    affiliate = await db.affiliates.find_one({"promo_code": code})
    if not affiliate:
        raise HTTPException(status_code=404, detail="Affiliate code not found")
    row = {
        "id": str(uuid4()),
        "affiliate_id": affiliate.get("id"),
        "promo_code": code,
        "event_type": payload.get("event_type", "click"),
        "customer_id": payload.get("customer_id"),
        "order_id": payload.get("order_id"),
        "created_at": _now(),
    }
    await db.referral_events.insert_one(row)
    row.pop("_id", None)
    return {"ok": True, "event": row}

@router.post("/trigger-after-payment-approval")
async def trigger_commissions_after_payment_approval(payload: dict, request: Request):
    db = request.app.mongodb
    rules = await _get_rules(db)

    order_id = payload.get("order_id")
    invoice_id = payload.get("invoice_id")
    customer_id = payload.get("customer_id")
    net_base = _money(payload.get("commissionable_base_amount", 0))
    affiliate_id = payload.get("affiliate_id")
    promo_code = (payload.get("promo_code") or "").strip().upper() or None
    sales_owner_id = payload.get("sales_owner_id")
    sales_owner_name = payload.get("sales_owner_name", "Sales Advisor")

    if net_base <= 0:
        raise HTTPException(status_code=400, detail="commissionable_base_amount must be greater than zero")

    created = []

    if affiliate_id or promo_code:
        if not affiliate_id and promo_code:
            affiliate = await db.affiliates.find_one({"promo_code": promo_code})
            affiliate_id = affiliate.get("id") if affiliate else None
        if affiliate_id:
            amount = _money(net_base * float(rules["affiliate_commission_percent"]) / 100.0)
            row = {
                "id": str(uuid4()),
                "source_type": "affiliate",
                "affiliate_id": affiliate_id,
                "promo_code": promo_code,
                "sales_owner_id": None,
                "order_id": order_id,
                "invoice_id": invoice_id,
                "customer_id": customer_id,
                "amount": amount,
                "status": "approved",
                "created_at": _now(),
            }
            await db.commissions.insert_one(row)
            row.pop("_id", None)
            created.append(row)

    if sales_owner_id and (rules["allow_affiliate_and_sales_same_order"] or not created):
        amount = _money(net_base * float(rules["sales_commission_percent"]) / 100.0)
        row = {
            "id": str(uuid4()),
            "source_type": "sales",
            "affiliate_id": None,
            "promo_code": None,
            "sales_owner_id": sales_owner_id,
            "sales_owner_name": sales_owner_name,
            "order_id": order_id,
            "invoice_id": invoice_id,
            "customer_id": customer_id,
            "amount": amount,
            "status": "approved",
            "created_at": _now(),
        }
        await db.commissions.insert_one(row)
        row.pop("_id", None)
        created.append(row)

    return {"ok": True, "created_commissions": created}
