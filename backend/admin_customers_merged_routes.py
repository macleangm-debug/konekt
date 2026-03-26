"""
Merged Customers API — List + 360 Detail
Combines users (role=customer) with aggregated order/invoice/quote data.
"""
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request, Query
from typing import Optional

router = APIRouter(prefix="/api/admin/customers-360", tags=["Customers Merged"])


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
    if status == "active":
        query["is_active"] = True
    elif status == "inactive":
        query["is_active"] = False

    users = await db.users.find(query).sort("created_at", -1).to_list(length=limit)

    rows = []
    for u in users:
        uid = u.get("id") or str(u.get("_id", ""))
        total_orders = await db.orders.count_documents({"customer_id": uid})
        active_invoices = await db.invoices.count_documents({"customer_id": uid, "status": {"$nin": ["paid", "cancelled"]}})

        last_order = await db.orders.find_one({"customer_id": uid}, sort=[("created_at", -1)])
        last_activity = None
        if last_order:
            la = last_order.get("created_at")
            last_activity = la.isoformat() if isinstance(la, datetime) else la

        rows.append({
            "id": uid,
            "name": u.get("full_name") or u.get("email", ""),
            "email": u.get("email", ""),
            "company": u.get("company") or "-",
            "phone": u.get("phone") or "-",
            "type": "business" if u.get("company") else "individual",
            "total_orders": total_orders,
            "active_invoices": active_invoices,
            "assigned_sales_name": u.get("assigned_sales_name") or "-",
            "status": "active" if u.get("is_active", True) else "inactive",
            "created_at": u.get("created_at").isoformat() if isinstance(u.get("created_at"), datetime) else u.get("created_at"),
            "last_activity_at": last_activity or (u.get("created_at").isoformat() if isinstance(u.get("created_at"), datetime) else u.get("created_at")),
            "referral_code": u.get("referral_code") or "-",
        })

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
            "fulfillment_state": o.get("status", "-"),
            "date": o.get("created_at", ""),
        }

    def fmt_invoice(i):
        i = _serialize(i)
        return {
            "id": i.get("id", ""),
            "invoice_no": i.get("invoice_number", i.get("id", "")),
            "amount": _fmt_money(i.get("total_amount")),
            "payment_status": i.get("status", "-"),
            "date": i.get("created_at", ""),
        }

    def fmt_quote(q):
        q = _serialize(q)
        return {
            "id": q.get("id", ""),
            "quote_no": q.get("quote_number", q.get("id", "")),
            "amount": _fmt_money(q.get("total_amount")),
            "status": q.get("status", "-"),
            "date": q.get("created_at", ""),
        }

    last_order = recent_orders_raw[0] if recent_orders_raw else None
    last_activity = None
    if last_order:
        la = last_order.get("created_at")
        last_activity = la.isoformat() if isinstance(la, datetime) else la

    return {
        "id": uid,
        "name": user.get("full_name") or user.get("email", ""),
        "email": user.get("email", ""),
        "company": user.get("company") or "-",
        "type": "business" if user.get("company") else "individual",
        "phone": user.get("phone") or "-",
        "address": "-",
        "referral_code": user.get("referral_code") or "-",
        "status": "active" if user.get("is_active", True) else "inactive",
        "created_at": user.get("created_at").isoformat() if isinstance(user.get("created_at"), datetime) else user.get("created_at"),
        "last_activity_at": last_activity or (user.get("created_at").isoformat() if isinstance(user.get("created_at"), datetime) else user.get("created_at")),
        "points": user.get("points", 0),
        "credit_balance": user.get("credit_balance", 0),
        "assigned_sales": {
            "name": user.get("assigned_sales_name") or "-",
            "phone": user.get("assigned_sales_phone") or "-",
            "email": user.get("assigned_sales_email") or "-",
        },
        "summary": {
            "total_quotes": total_quotes,
            "total_invoices": total_invoices,
            "total_orders": total_orders,
            "unpaid_invoices": unpaid_invoices,
        },
        "recent_quotes": [fmt_quote(q) for q in recent_quotes_raw],
        "recent_invoices": [fmt_invoice(i) for i in recent_invoices_raw],
        "recent_orders": [fmt_order(o) for o in recent_orders_raw],
        "notes": "",
    }
