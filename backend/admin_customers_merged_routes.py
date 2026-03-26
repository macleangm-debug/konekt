"""
Merged Customers API — List + Stats + 360 Detail
Combines users (role=customer) with aggregated order/invoice/quote data.
Computes customer status: Active (30d) / At Risk (31-90d) / Inactive (90d+)
"""
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Request, Query
from typing import Optional

router = APIRouter(prefix="/api/admin/customers-360", tags=["Customers Merged"])

ACTIVE_DAYS = 30
AT_RISK_DAYS = 90


def _serialize(doc):
    if not doc:
        return None
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    for k, v in doc.items():
        if isinstance(v, datetime):
            doc[k] = v.isoformat()
    return doc


def _fmt_money(val):
    if val is None:
        return "TZS 0"
    return f"TZS {val:,.0f}"


def _compute_status(last_activity_dt):
    """Compute customer status from last activity datetime."""
    if not last_activity_dt:
        return "inactive"
    now = datetime.now(timezone.utc)
    if isinstance(last_activity_dt, str):
        try:
            last_activity_dt = datetime.fromisoformat(last_activity_dt.replace("Z", "+00:00"))
        except Exception:
            return "inactive"
    if isinstance(last_activity_dt, datetime):
        if last_activity_dt.tzinfo is None:
            last_activity_dt = last_activity_dt.replace(tzinfo=timezone.utc)
    days_since = (now - last_activity_dt).days
    if days_since <= ACTIVE_DAYS:
        return "active"
    elif days_since <= AT_RISK_DAYS:
        return "at_risk"
    return "inactive"


async def _get_last_activity(db, uid):
    """Get the most recent activity date across orders, invoices, quotes."""
    candidates = []
    for coll_name in ["orders", "invoices", "quotes"]:
        coll = db[coll_name]
        doc = await coll.find_one({"customer_id": uid}, sort=[("created_at", -1)])
        if doc and doc.get("created_at"):
            val = doc["created_at"]
            if isinstance(val, str):
                try:
                    val = datetime.fromisoformat(val.replace("Z", "+00:00"))
                except Exception:
                    continue
            if isinstance(val, datetime):
                if val.tzinfo is None:
                    val = val.replace(tzinfo=timezone.utc)
                candidates.append(val)
    return max(candidates) if candidates else None


@router.get("/stats")
async def customers_stats(request: Request):
    """Return aggregate stats for the stats cards."""
    db = request.app.mongodb
    now = datetime.now(timezone.utc)
    active_cutoff = now - timedelta(days=ACTIVE_DAYS)
    at_risk_cutoff = now - timedelta(days=AT_RISK_DAYS)

    total = await db.users.count_documents({"role": "customer"})

    # Get all customer IDs
    users = await db.users.find({"role": "customer"}, {"id": 1, "_id": 0}).to_list(length=1000)
    uids = [u["id"] for u in users if u.get("id")]

    active_count = 0
    at_risk_count = 0
    inactive_count = 0
    with_unpaid = set()
    with_active_orders = set()

    for uid in uids:
        last_act = await _get_last_activity(db, uid)
        status = _compute_status(last_act)
        if status == "active":
            active_count += 1
        elif status == "at_risk":
            at_risk_count += 1
        else:
            inactive_count += 1

        unpaid = await db.invoices.count_documents({"customer_id": uid, "status": {"$nin": ["paid", "cancelled"]}})
        if unpaid > 0:
            with_unpaid.add(uid)

        active_ord = await db.orders.count_documents({"customer_id": uid, "status": {"$nin": ["delivered", "cancelled", "completed"]}})
        if active_ord > 0:
            with_active_orders.add(uid)

    return {
        "total": total,
        "active": active_count,
        "at_risk": at_risk_count,
        "inactive": inactive_count,
        "with_unpaid_invoices": len(with_unpaid),
        "with_active_orders": len(with_active_orders),
    }


@router.get("/list")
async def customers_list(
    request: Request,
    search: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(default=200, le=500),
):
    db = request.app.mongodb

    query = {"role": "customer"}
    if search:
        query["$or"] = [
            {"full_name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"company": {"$regex": search, "$options": "i"}},
        ]

    users = await db.users.find(query).sort("created_at", -1).to_list(length=limit)

    rows = []
    for u in users:
        uid = u.get("id") or str(u.get("_id", ""))
        total_orders = await db.orders.count_documents({"customer_id": uid})
        active_invoices = await db.invoices.count_documents({"customer_id": uid, "status": {"$nin": ["paid", "cancelled"]}})

        last_activity_dt = await _get_last_activity(db, uid)
        computed_status = _compute_status(last_activity_dt)

        last_activity_str = None
        if last_activity_dt:
            last_activity_str = last_activity_dt.isoformat() if isinstance(last_activity_dt, datetime) else last_activity_dt

        created_at = u.get("created_at")
        created_str = created_at.isoformat() if isinstance(created_at, datetime) else created_at

        row = {
            "id": uid,
            "name": u.get("full_name") or u.get("email", ""),
            "email": u.get("email", ""),
            "company": u.get("company") or "-",
            "phone": u.get("phone") or "-",
            "type": "business" if u.get("company") else "individual",
            "total_orders": total_orders,
            "active_invoices": active_invoices,
            "assigned_sales_name": u.get("assigned_sales_name") or "-",
            "status": computed_status,
            "created_at": created_str,
            "last_activity_at": last_activity_str or created_str,
            "referral_code": u.get("referral_code") or "-",
        }

        # Apply status filter after computing
        if status and status != computed_status:
            continue

        rows.append(row)

    return rows


@router.get("/{customer_id}")
async def customer_detail_360(customer_id: str, request: Request):
    db = request.app.mongodb

    user = await db.users.find_one({"id": customer_id})
    if not user:
        user = await db.users.find_one({"email": customer_id})
    if not user:
        raise HTTPException(status_code=404, detail="Customer not found")

    uid = user.get("id") or str(user.get("_id", ""))

    # Aggregated counts
    total_orders = await db.orders.count_documents({"customer_id": uid})
    total_invoices = await db.invoices.count_documents({"customer_id": uid})
    total_quotes = await db.quotes.count_documents({"customer_id": uid})
    unpaid_invoices = await db.invoices.count_documents({"customer_id": uid, "status": {"$nin": ["paid", "cancelled"]}})
    active_orders = await db.orders.count_documents({"customer_id": uid, "status": {"$nin": ["delivered", "cancelled", "completed"]}})
    active_quotes = await db.quotes.count_documents({"customer_id": uid, "status": {"$nin": ["accepted", "rejected", "expired", "cancelled"]}})

    # Recent transactions (last 5 each)
    recent_orders_raw = await db.orders.find({"customer_id": uid}).sort("created_at", -1).to_list(length=5)
    recent_invoices_raw = await db.invoices.find({"customer_id": uid}).sort("created_at", -1).to_list(length=5)
    recent_quotes_raw = await db.quotes.find({"customer_id": uid}).sort("created_at", -1).to_list(length=5)

    def fmt_order(o):
        o = _serialize(o)
        return {
            "id": o.get("id", ""),
            "order_no": o.get("order_number", o.get("id", "")),
            "amount": _fmt_money(o.get("total_amount")),
            "raw_amount": o.get("total_amount", 0),
            "fulfillment_state": o.get("status", "-"),
            "date": o.get("created_at", ""),
        }

    def fmt_invoice(i):
        i = _serialize(i)
        return {
            "id": i.get("id", ""),
            "invoice_no": i.get("invoice_number", i.get("id", "")),
            "amount": _fmt_money(i.get("total_amount")),
            "raw_amount": i.get("total_amount", 0),
            "payment_status": i.get("status", "-"),
            "date": i.get("created_at", ""),
        }

    def fmt_quote(q):
        q = _serialize(q)
        return {
            "id": q.get("id", ""),
            "quote_no": q.get("quote_number", q.get("id", "")),
            "amount": _fmt_money(q.get("total_amount")),
            "raw_amount": q.get("total_amount", 0),
            "status": q.get("status", "-"),
            "date": q.get("created_at", ""),
        }

    last_activity_dt = await _get_last_activity(db, uid)
    computed_status = _compute_status(last_activity_dt)

    last_activity_str = None
    if last_activity_dt:
        last_activity_str = last_activity_dt.isoformat() if isinstance(last_activity_dt, datetime) else last_activity_dt

    created_at = user.get("created_at")
    created_str = created_at.isoformat() if isinstance(created_at, datetime) else created_at

    return {
        "id": uid,
        "name": user.get("full_name") or user.get("email", ""),
        "email": user.get("email", ""),
        "company": user.get("company") or "-",
        "type": "business" if user.get("company") else "individual",
        "phone": user.get("phone") or "-",
        "address": "-",
        "referral_code": user.get("referral_code") or "-",
        "total_referrals": user.get("total_referrals", 0),
        "status": computed_status,
        "created_at": created_str,
        "last_activity_at": last_activity_str or created_str,
        "points": user.get("points", 0),
        "credit_balance": user.get("credit_balance", 0),
        "assigned_sales": {
            "name": user.get("assigned_sales_name") or "-",
            "phone": user.get("assigned_sales_phone") or "-",
            "email": user.get("assigned_sales_email") or "-",
        },
        "summary": {
            "total_quotes": total_quotes,
            "active_quotes": active_quotes,
            "total_invoices": total_invoices,
            "unpaid_invoices": unpaid_invoices,
            "total_orders": total_orders,
            "active_orders": active_orders,
        },
        "recent_quotes": [fmt_quote(q) for q in recent_quotes_raw],
        "recent_invoices": [fmt_invoice(i) for i in recent_invoices_raw],
        "recent_orders": [fmt_order(o) for o in recent_orders_raw],
        "notes": "",
    }
