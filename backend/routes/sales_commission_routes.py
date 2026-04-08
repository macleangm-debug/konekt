"""
Sales Commission Dashboard API
Aggregates commission data for the logged-in sales user.
Uses the resolved pricing model (margin engine) and commissions collection.
"""
from fastapi import APIRouter, Request, HTTPException
from datetime import datetime, timezone
from services.margin_engine import resolve_margin_rule, get_split_settings, resolve_pricing

router = APIRouter(prefix="/api/staff/commissions", tags=["sales-commissions"])


def _money(v):
    return round(float(v or 0), 2)


@router.get("/summary")
async def get_commission_summary(request: Request):
    """
    Returns commission summary for the logged-in sales user.
    - total_earned (all time)
    - pending_payout
    - paid_out
    - expected (from open quotes/orders)
    - closed_deals
    - assigned_orders
    """
    db = request.app.mongodb

    # Get user from auth header
    user_id = None
    auth = request.headers.get("authorization", "")
    if auth.startswith("Bearer "):
        import jwt
        try:
            token = auth.split(" ")[1]
            payload = jwt.decode(token, options={"verify_signature": False})
            user_id = payload.get("user_id") or payload.get("sub")
        except Exception:
            pass

    # Aggregate from commissions collection
    pipeline_match = {"beneficiary_type": "sales"}
    if user_id:
        pipeline_match["beneficiary_user_id"] = user_id

    # Get all sales commissions
    commissions = await db.commissions.find(pipeline_match, {"_id": 0}).to_list(500)

    total_earned = sum(c.get("amount", 0) for c in commissions if c.get("status") in ("approved", "paid"))
    pending_payout = sum(c.get("amount", 0) for c in commissions if c.get("status") == "approved")
    paid_out = sum(c.get("amount", 0) for c in commissions if c.get("status") == "paid")
    expected = sum(c.get("amount", 0) for c in commissions if c.get("status") in ("pending", "expected"))

    # Count orders
    order_match = {}
    if user_id:
        order_match["assigned_sales_id"] = user_id
    assigned_count = await db.orders.count_documents(order_match) if user_id else 0
    closed_match = {**order_match, "status": {"$in": ["completed", "delivered", "fulfilled"]}}
    closed_count = await db.orders.count_documents(closed_match) if user_id else 0

    return {
        "ok": True,
        "summary": {
            "total_earned": _money(total_earned),
            "pending_payout": _money(pending_payout),
            "paid_out": _money(paid_out),
            "expected": _money(expected),
            "assigned_orders": assigned_count,
            "closed_deals": closed_count,
            "conversion_rate": round((closed_count / max(assigned_count, 1)) * 100, 1),
        },
    }


@router.get("/orders")
async def get_commission_orders(request: Request):
    """
    Returns per-order commission breakdown for the sales user.
    Each row: order_number, customer_name, order_total, commission_amount, commission_status, date
    """
    db = request.app.mongodb

    user_id = None
    auth = request.headers.get("authorization", "")
    if auth.startswith("Bearer "):
        import jwt
        try:
            token = auth.split(" ")[1]
            payload = jwt.decode(token, options={"verify_signature": False})
            user_id = payload.get("user_id") or payload.get("sub")
        except Exception:
            pass

    # Get orders assigned to this sales user
    query = {}
    if user_id:
        query["assigned_sales_id"] = user_id

    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)

    # Get commissions keyed by order_id
    commission_map = {}
    if orders:
        order_ids = [o.get("id") or o.get("order_number") for o in orders]
        comms = await db.commissions.find(
            {"order_id": {"$in": order_ids}, "beneficiary_type": "sales"},
            {"_id": 0}
        ).to_list(500)
        for c in comms:
            commission_map[c["order_id"]] = c

    # Get split settings for expected commission calc
    split = await get_split_settings(db)
    sales_pct = split.get("sales_share_pct", 3)

    result = []
    for order in orders:
        oid = order.get("id") or order.get("order_number")
        comm = commission_map.get(oid)

        total = order.get("total") or order.get("total_amount") or 0

        if comm:
            commission_amount = comm.get("amount", 0)
            commission_status = comm.get("status", "pending")
        else:
            # Estimate from distribution settings
            commission_amount = _money(total * sales_pct / 100)
            commission_status = "expected"

        result.append({
            "order_id": oid,
            "order_number": order.get("order_number", oid),
            "customer_name": order.get("customer_name", "—"),
            "order_total": _money(total),
            "commission_amount": _money(commission_amount),
            "commission_pct": sales_pct,
            "commission_status": commission_status,
            "order_status": order.get("status", "pending"),
            "payment_status": order.get("payment_status", "pending"),
            "created_at": order.get("created_at"),
        })

    return {"ok": True, "orders": result}


@router.get("/monthly")
async def get_monthly_breakdown(request: Request):
    """
    Returns monthly commission breakdown for the current year.
    """
    db = request.app.mongodb

    user_id = None
    auth = request.headers.get("authorization", "")
    if auth.startswith("Bearer "):
        import jwt
        try:
            token = auth.split(" ")[1]
            payload = jwt.decode(token, options={"verify_signature": False})
            user_id = payload.get("user_id") or payload.get("sub")
        except Exception:
            pass

    query = {"beneficiary_type": "sales"}
    if user_id:
        query["beneficiary_user_id"] = user_id

    commissions = await db.commissions.find(query, {"_id": 0}).to_list(1000)

    months = {}
    for c in commissions:
        created = c.get("created_at")
        if not created:
            continue
        if isinstance(created, str):
            try:
                created = datetime.fromisoformat(created.replace("Z", "+00:00"))
            except Exception:
                continue
        key = created.strftime("%Y-%m")
        if key not in months:
            months[key] = {"month": key, "earned": 0, "pending": 0, "paid": 0, "count": 0}
        months[key]["count"] += 1
        amt = c.get("amount", 0)
        if c.get("status") == "paid":
            months[key]["paid"] += amt
        elif c.get("status") == "approved":
            months[key]["pending"] += amt
        months[key]["earned"] += amt

    # Sort by month descending
    result = sorted(months.values(), key=lambda x: x["month"], reverse=True)
    for r in result:
        r["earned"] = _money(r["earned"])
        r["pending"] = _money(r["pending"])
        r["paid"] = _money(r["paid"])

    return {"ok": True, "months": result}
