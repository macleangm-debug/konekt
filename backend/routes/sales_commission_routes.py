"""
Sales Commission Dashboard API
Aggregates commission data for the logged-in sales user.
Uses the resolved pricing model (margin engine) — single source of truth.
Commission status is INDEPENDENT from order status.
"""
from fastapi import APIRouter, Request
from services.margin_engine import get_split_settings

router = APIRouter(prefix="/api/staff/commissions", tags=["sales-commissions"])


def _money(v):
    return round(float(v or 0), 2)


def _extract_user_id(request: Request):
    auth = request.headers.get("authorization", "")
    if auth.startswith("Bearer "):
        import jwt
        try:
            token = auth.split(" ")[1]
            payload = jwt.decode(token, options={"verify_signature": False})
            return payload.get("user_id") or payload.get("sub")
        except Exception:
            pass
    return None


@router.get("/summary")
async def get_commission_summary(request: Request):
    """
    Returns commission summary for the logged-in sales user.
    - total_earned (all time, TZS)
    - pending_payout (TZS)
    - paid_out (TZS)
    - expected (from open quotes/orders, TZS)
    """
    db = request.app.mongodb
    user_id = _extract_user_id(request)

    # Aggregate from commissions collection
    pipeline_match = {"beneficiary_type": "sales"}
    if user_id:
        pipeline_match["beneficiary_user_id"] = user_id

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
        },
    }


@router.get("/orders")
async def get_commission_orders(request: Request):
    """
    Returns per-order commission breakdown for the sales user.
    Commission status is INDEPENDENT from order status.
    TZS amounts first, percentage as secondary context.
    """
    db = request.app.mongodb
    user_id = _extract_user_id(request)

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
    sales_pct = split.get("sales_share_pct", 30)

    result = []
    for order in orders:
        oid = order.get("id") or order.get("order_number")
        comm = commission_map.get(oid)

        total = order.get("total") or order.get("total_amount") or 0

        # Read from stored pricing snapshot if available
        pricing_snapshot = order.get("pricing_breakdown") or order.get("margin_record") or {}
        stored_sales_amount = pricing_snapshot.get("sales_amount")

        if comm:
            commission_amount = comm.get("amount", 0)
            commission_status = comm.get("status", "pending")
            if commission_status == "approved":
                commission_status = "pending_payout"
        elif stored_sales_amount is not None:
            commission_amount = stored_sales_amount
            commission_status = "expected"
        else:
            # Estimate from distribution settings
            distributable_pct = 10  # default
            dist_settings = await db.distribution_settings.find_one({"type": "global"}, {"_id": 0})
            if dist_settings:
                distributable_pct = dist_settings.get("distribution_margin_pct", 10)
            # Distributable amount of the total
            distributable_value = total * distributable_pct / (100 + distributable_pct + 20)  # approximate
            commission_amount = _money(distributable_value * sales_pct / 100)
            commission_status = "expected"

        result.append({
            "order_id": oid,
            "order_number": order.get("order_number", oid),
            "customer_name": order.get("customer_name", "—"),
            "order_total": _money(total),
            "commission_amount": _money(commission_amount),
            "commission_pct": sales_pct,
            "commission_status": commission_status,
            "order_status": order.get("status") or order.get("order_status", "pending"),
            "payment_status": order.get("payment_status", "pending"),
            "created_at": order.get("created_at"),
        })

    return {"ok": True, "orders": result}


@router.get("/monthly")
async def get_monthly_breakdown(request: Request):
    """
    Returns monthly commission breakdown.
    TZS amounts: earned, pending, paid per month.
    """
    db = request.app.mongodb
    user_id = _extract_user_id(request)

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
                from datetime import datetime
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
        elif c.get("status") in ("approved", "pending_payout"):
            months[key]["pending"] += amt
        months[key]["earned"] += amt

    # Also generate from orders if no commissions exist yet
    if not months:
        order_query = {}
        if user_id:
            order_query["assigned_sales_id"] = user_id
        orders = await db.orders.find(order_query, {"_id": 0}).to_list(200)
        split = await get_split_settings(db)
        sales_pct = split.get("sales_share_pct", 30)

        for order in orders:
            created = order.get("created_at")
            if not created:
                continue
            if isinstance(created, str):
                try:
                    from datetime import datetime
                    created = datetime.fromisoformat(created.replace("Z", "+00:00"))
                except Exception:
                    continue
            key = created.strftime("%Y-%m")
            if key not in months:
                months[key] = {"month": key, "earned": 0, "pending": 0, "paid": 0, "count": 0}
            months[key]["count"] += 1
            total = order.get("total") or order.get("total_amount") or 0
            est_commission = _money(total * 0.1 * sales_pct / 100)  # rough estimate
            payment_status = order.get("payment_status", "pending")
            if payment_status in ("verified", "approved", "paid"):
                months[key]["pending"] += est_commission
            months[key]["earned"] += est_commission

    result = sorted(months.values(), key=lambda x: x["month"], reverse=True)
    for r in result:
        r["earned"] = _money(r["earned"])
        r["pending"] = _money(r["pending"])
        r["paid"] = _money(r["paid"])

    return {"ok": True, "months": result}
