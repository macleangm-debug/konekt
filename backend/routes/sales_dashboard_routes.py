"""
Sales Dashboard API — Phase C (Upgraded)
Aggregates KPIs, today's actions, pipeline stages with values,
commission summary/breakdown, trend charts, and assigned CRM.
TZS-first amounts throughout.
"""
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Request
import jwt as pyjwt

router = APIRouter(prefix="/api/staff/sales-dashboard", tags=["sales-dashboard"])


def _money(v):
    return round(float(v or 0), 2)


def _extract_staff(request: Request):
    auth = request.headers.get("authorization", "")
    if auth.startswith("Bearer "):
        try:
            token = auth.split(" ")[1]
            payload = pyjwt.decode(token, options={"verify_signature": False})
            return payload.get("user_id") or payload.get("sub"), payload.get("email"), payload.get("full_name") or payload.get("name")
        except Exception:
            pass
    return None, None, None


def _parse_dt(val):
    if not val:
        return None
    if isinstance(val, datetime):
        return val
    if isinstance(val, str):
        try:
            return datetime.fromisoformat(val.replace("Z", "+00:00"))
        except Exception:
            return None
    return None


def _is_today(created_at, today_start):
    dt = _parse_dt(created_at)
    if not dt:
        return False
    try:
        return dt >= today_start
    except Exception:
        return False


def _is_this_month(created_at, month_start):
    dt = _parse_dt(created_at)
    if not dt:
        return False
    try:
        return dt >= month_start
    except Exception:
        return False


@router.get("")
async def get_sales_dashboard(request: Request):
    db = request.app.mongodb
    user_id, user_email, user_name = _extract_staff(request)

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # ── Query filters ──
    sales_filter = {}
    if user_id:
        sales_filter = {"$or": [
            {"assigned_sales_id": user_id},
            {"assigned_sales_id": user_email},
        ]}
    elif user_email:
        sales_filter = {"assigned_sales_id": user_email}

    # ═══ ALL ORDERS ═══
    all_orders = await db.orders.find(
        {**sales_filter, "status": {"$nin": ["cancelled", "draft"]}},
        {"_id": 0, "id": 1, "total_amount": 1, "total": 1, "created_at": 1,
         "status": 1, "payment_status": 1, "order_number": 1, "customer_name": 1,
         "fulfillment_status": 1}
    ).sort("created_at", -1).to_list(500)

    # Today/Month
    today_orders = [o for o in all_orders if _is_today(o.get("created_at"), today_start)]
    today_revenue = sum(_money(o.get("total_amount") or o.get("total") or 0) for o in today_orders)
    month_orders = [o for o in all_orders if _is_this_month(o.get("created_at"), month_start)]
    month_revenue = sum(_money(o.get("total_amount") or o.get("total") or 0) for o in month_orders)

    # Pipeline value
    pipeline_orders = [o for o in all_orders if o.get("payment_status") not in ("paid", "verified") and o.get("status") not in ("completed", "cancelled")]
    pipeline_value = sum(_money(o.get("total_amount") or o.get("total") or 0) for o in pipeline_orders)

    # ═══ COMMISSIONS ═══
    comm_filter = {"beneficiary_type": "sales"}
    if user_id:
        comm_filter["beneficiary_user_id"] = user_id
    commissions = await db.commissions.find(comm_filter, {"_id": 0}).to_list(500)

    expected_comm = sum(c.get("amount", 0) for c in commissions if c.get("status") in ("expected", "pending"))
    pending_comm = sum(c.get("amount", 0) for c in commissions if c.get("status") == "approved")
    paid_comm = sum(c.get("amount", 0) for c in commissions if c.get("status") == "paid")
    total_earned = pending_comm + paid_comm

    commission_summary = {
        "expected": _money(expected_comm),
        "pending": _money(pending_comm),
        "paid": _money(paid_comm),
        "total": _money(expected_comm + pending_comm + paid_comm),
    }

    # ═══ LEADS & QUOTES ═══
    lead_filter = {"assigned_to": user_email} if user_email else {}
    total_leads = await db.crm_leads.count_documents(lead_filter)

    quote_filter = {"assigned_to": user_email} if user_email else {}
    pending_quotes = await db.quotes_v2.count_documents({**quote_filter, "status": {"$in": ["pending", "sent"]}})
    approved_quotes = await db.quotes_v2.count_documents({**quote_filter, "status": "approved"})

    paid_orders_count = len([o for o in all_orders if o.get("payment_status") == "paid"])
    conversion_rate = round((paid_orders_count / max(total_leads, 1)) * 100, 1)

    kpis = {
        "today_orders": len(today_orders),
        "today_revenue": _money(today_revenue),
        "month_orders": len(month_orders),
        "month_revenue": _money(month_revenue),
        "pipeline_value": _money(pipeline_value),
        "total_earned": _money(total_earned),
        "pending_payout": _money(pending_comm),
        "conversion_rate": conversion_rate,
        "total_leads": total_leads,
        "open_orders": len(pipeline_orders),
    }

    # ═══ TODAY'S ACTIONS (enhanced) ═══
    actions = []

    # 1. Quotes expiring / awaiting follow-up
    pq = await db.quotes_v2.find(
        {**quote_filter, "status": {"$in": ["pending", "sent"]}},
        {"_id": 0, "id": 1, "quote_number": 1, "customer_name": 1, "total": 1, "status": 1, "created_at": 1, "valid_until": 1}
    ).sort("created_at", -1).to_list(20)

    for q in pq:
        valid_until = _parse_dt(q.get("valid_until"))
        is_expiring = valid_until and valid_until.date() <= (now + timedelta(days=1)).date() if valid_until else False
        urgency = "hot" if is_expiring else "medium"
        title_prefix = "Expiring today" if is_expiring else "Quote follow-up"
        actions.append({
            "type": "quote_followup",
            "urgency": urgency,
            "title": f"{title_prefix}: #{q.get('quote_number', q.get('id', '')[:8])}",
            "description": f"{q.get('customer_name', '')} — TZS {_money(q.get('total', 0)):,.0f}",
            "href": "/staff/orders",
        })

    # 2. Delayed orders need follow-up
    delayed_orders = [o for o in all_orders if o.get("status") in ("delayed", "overdue") or o.get("fulfillment_status") == "delayed"]
    for o in delayed_orders[:5]:
        actions.append({
            "type": "delayed_order",
            "urgency": "high",
            "title": f"Delayed: #{o.get('order_number', '')[-8:]}",
            "description": f"{o.get('customer_name', '—')} — TZS {_money(o.get('total_amount') or o.get('total') or 0):,.0f}",
            "href": "/staff/orders",
        })

    # 3. Clients not contacted in 3+ days
    stale_threshold = now - timedelta(days=3)
    stale_leads = await db.crm_leads.find(
        {**lead_filter, "status": {"$in": ["new", "contacted"]},
         "$or": [
             {"last_contact_at": {"$lt": stale_threshold}},
             {"last_contact_at": {"$exists": False}},
             {"last_contact_at": None},
         ]},
        {"_id": 0, "id": 1, "name": 1, "company": 1, "phone": 1, "email": 1, "status": 1}
    ).to_list(10)

    for lead in stale_leads:
        actions.append({
            "type": "stale_client",
            "urgency": "high",
            "title": f"No contact 3+ days: {lead.get('name') or lead.get('company', 'Unknown')}",
            "description": f"Status: {lead.get('status', 'new')} — needs follow-up",
            "phone": lead.get("phone"),
            "href": "/staff/portfolio",
        })

    # 4. Approved quotes ready to close
    aq = await db.quotes_v2.find(
        {**quote_filter, "status": "approved"},
        {"_id": 0, "id": 1, "quote_number": 1, "customer_name": 1, "total": 1}
    ).to_list(10)

    for q in aq:
        actions.append({
            "type": "close_deal",
            "urgency": "hot",
            "title": f"Close deal: {q.get('customer_name', '')} — #{q.get('quote_number', '')}",
            "description": f"TZS {_money(q.get('total', 0)):,.0f} approved — push to payment",
            "href": "/staff/orders",
        })

    # 5. Promotions ready to share
    active_promos = await db.promotions.find(
        {"status": "active"},
        {"_id": 0, "id": 1, "name": 1, "discount_type": 1, "discount_value": 1}
    ).to_list(10)

    for promo in active_promos:
        disc = f"{promo.get('discount_value', 0)}{'%' if promo.get('discount_type') == 'percentage' else ' TZS'}"
        actions.append({
            "type": "share_promo",
            "urgency": "medium",
            "title": f"Share: {promo.get('name', 'Promotion')}",
            "description": f"Discount: {disc} — share with clients",
            "href": "/staff/orders",
        })

    # Sort by urgency priority
    urgency_order = {"hot": 0, "high": 1, "medium": 2, "low": 3}
    actions.sort(key=lambda a: urgency_order.get(a.get("urgency", "low"), 4))

    # ═══ PIPELINE WITH VALUES ═══
    new_leads_count = await db.crm_leads.count_documents({**lead_filter, "status": "new"})
    contacted_count = await db.crm_leads.count_documents({**lead_filter, "status": "contacted"})
    fulfilled_list = [o for o in all_orders if o.get("status") in ("completed", "delivered", "fulfilled")]

    # Compute pipeline values per stage
    quoted_value = sum(_money(q.get("total", 0)) for q in pq)
    approved_value = sum(_money(q.get("total", 0)) for q in aq)
    paid_value = sum(_money(o.get("total_amount") or o.get("total") or 0) for o in all_orders if o.get("payment_status") == "paid")
    fulfilled_value = sum(_money(o.get("total_amount") or o.get("total") or 0) for o in fulfilled_list)

    pipeline = {
        "new_leads": new_leads_count,
        "contacted": contacted_count,
        "quoted": pending_quotes,
        "approved": approved_quotes,
        "paid": paid_orders_count,
        "fulfilled": len(fulfilled_list),
        "values": {
            "new_leads": 0,
            "contacted": 0,
            "quoted": _money(quoted_value),
            "approved": _money(approved_value),
            "paid": _money(paid_value),
            "fulfilled": _money(fulfilled_value),
        },
    }

    # ═══ COMMISSION PER ORDER ═══
    from services.margin_engine import get_split_settings
    split = await get_split_settings(db)
    sales_pct = split.get("sales_share_pct", 30)

    comm_map = {}
    for c in commissions:
        comm_map[c.get("order_id")] = c

    recent_orders = []
    for order in all_orders[:20]:
        oid = order.get("id") or order.get("order_number")
        comm = comm_map.get(oid)
        total = _money(order.get("total_amount") or order.get("total") or 0)

        if comm:
            commission_amount = comm.get("amount", 0)
            commission_status = comm.get("status", "pending")
        else:
            distributable_value = total * 0.1
            commission_amount = _money(distributable_value * sales_pct / 100)
            commission_status = "expected"

        recent_orders.append({
            "order_id": oid,
            "order_number": order.get("order_number", ""),
            "customer_name": order.get("customer_name", "—"),
            "total": total,
            "commission_amount": _money(commission_amount),
            "commission_status": commission_status,
            "order_status": order.get("status", "pending"),
            "payment_status": order.get("payment_status", "pending"),
            "created_at": str(order.get("created_at", "")),
        })

    # ═══ TREND CHARTS (6 months) ═══
    charts = _build_trend_charts(all_orders, commissions, now)

    # ═══ ASSIGNED CUSTOMERS (CRM) ═══
    crm_filter = {"assigned_to": user_email} if user_email else {}
    customers_raw = await db.crm_leads.find(
        crm_filter,
        {"_id": 0, "id": 1, "name": 1, "company": 1, "email": 1, "phone": 1,
         "status": 1, "last_contact_at": 1, "created_at": 1}
    ).sort("created_at", -1).to_list(50)

    assigned_customers = []
    for c in customers_raw:
        assigned_customers.append({
            "id": c.get("id"),
            "name": c.get("name") or c.get("company", "—"),
            "company": c.get("company", ""),
            "email": c.get("email", ""),
            "phone": c.get("phone", ""),
            "status": c.get("status", "new"),
            "last_contact": str(c.get("last_contact_at", "")),
        })

    # ═══ RATINGS ═══
    rated_orders = await db.orders.find(
        {**sales_filter, "rating": {"$exists": True}},
        {"_id": 0, "order_number": 1, "customer_name": 1, "rating": 1, "created_at": 1}
    ).sort("rating.rated_at", -1).to_list(100)

    ratings_stars = [o["rating"]["stars"] for o in rated_orders if o.get("rating", {}).get("stars")]
    avg_rating = round(sum(ratings_stars) / max(len(ratings_stars), 1), 1) if ratings_stars else 0
    recent_ratings = []
    for o in rated_orders[:5]:
        r = o.get("rating", {})
        recent_ratings.append({
            "order_number": o.get("order_number", ""),
            "customer_name": o.get("customer_name", ""),
            "stars": r.get("stars", 0),
            "comment": r.get("comment", ""),
            "rated_at": r.get("rated_at", ""),
        })

    # ═══ LEADERBOARD ═══
    leaderboard = await _build_leaderboard(db, now)

    return {
        "ok": True,
        "staff_name": user_name or "Sales",
        "kpis": kpis,
        "commission_summary": commission_summary,
        "today_actions": actions[:15],
        "pipeline": pipeline,
        "recent_orders": recent_orders,
        "assigned_customers": assigned_customers,
        "charts": charts,
        "avg_rating": avg_rating,
        "total_ratings": len(ratings_stars),
        "recent_ratings": recent_ratings,
        "leaderboard": leaderboard,
    }


def _build_trend_charts(all_orders, commissions, now):
    """Build 6-month trend data for pipeline, deals closed, and commission."""
    months = []
    for i in range(5, -1, -1):
        d = now - timedelta(days=30 * i)
        months.append({
            "year": d.year,
            "month": d.month,
            "label": d.strftime("%b"),
        })

    pipeline_trend = []
    deals_closed_trend = []
    commission_trend = []

    for m in months:
        y, mo, label = m["year"], m["month"], m["label"]

        # Orders in this month
        month_orders = []
        for o in all_orders:
            dt = _parse_dt(o.get("created_at"))
            if dt and dt.year == y and dt.month == mo:
                month_orders.append(o)

        # Pipeline value = open orders created in this month
        open_in_month = [o for o in month_orders if o.get("payment_status") not in ("paid", "verified") and o.get("status") not in ("completed", "cancelled")]
        pv = sum(float(o.get("total_amount") or o.get("total") or 0) for o in open_in_month)

        # Deals closed = paid orders in this month
        paid_in_month = [o for o in month_orders if o.get("payment_status") in ("paid", "verified")]
        deals_count = len(paid_in_month)
        deals_value = sum(float(o.get("total_amount") or o.get("total") or 0) for o in paid_in_month)

        # Commission for this month
        month_comm = 0
        for c in commissions:
            cdt = _parse_dt(c.get("created_at"))
            if cdt and cdt.year == y and cdt.month == mo:
                month_comm += c.get("amount", 0)

        pipeline_trend.append({"month": label, "value": round(pv, 0)})
        deals_closed_trend.append({"month": label, "count": deals_count, "value": round(deals_value, 0)})
        commission_trend.append({"month": label, "amount": round(month_comm, 0)})

    return {
        "pipeline_trend": pipeline_trend,
        "deals_closed_trend": deals_closed_trend,
        "commission_trend": commission_trend,
    }


async def _build_leaderboard(db, now):
    """
    Build sales leaderboard ranked by deals closed.
    Aggregates across all sales reps: deals, revenue, commission, avg rating.
    """
    # All sales users
    sales_users = await db.users.find(
        {"role": {"$in": ["sales", "staff"]}},
        {"_id": 0, "id": 1, "email": 1, "full_name": 1}
    ).to_list(100)

    if not sales_users:
        return []

    # All non-cancelled orders
    all_orders = await db.orders.find(
        {"status": {"$nin": ["cancelled", "draft"]}},
        {"_id": 0, "assigned_sales_id": 1, "total_amount": 1, "total": 1,
         "payment_status": 1, "rating": 1}
    ).to_list(5000)

    # All commissions
    all_commissions = await db.commissions.find(
        {"beneficiary_type": "sales"},
        {"_id": 0, "beneficiary_user_id": 1, "amount": 1, "status": 1}
    ).to_list(5000)

    board = []
    for user in sales_users:
        uid = user.get("id", "")
        uemail = user.get("email", "")
        name = user.get("full_name", uemail)

        # Filter orders assigned to this rep
        rep_orders = [o for o in all_orders if o.get("assigned_sales_id") in (uid, uemail)]
        paid_orders = [o for o in rep_orders if o.get("payment_status") in ("paid", "verified")]
        deals = len(paid_orders)
        revenue = sum(float(o.get("total_amount") or o.get("total") or 0) for o in paid_orders)

        # Commission
        rep_comms = [c for c in all_commissions if c.get("beneficiary_user_id") == uid]
        commission = sum(c.get("amount", 0) for c in rep_comms)

        # Avg rating
        rep_ratings = [o["rating"]["stars"] for o in rep_orders if o.get("rating", {}).get("stars")]
        avg_r = round(sum(rep_ratings) / max(len(rep_ratings), 1), 1) if rep_ratings else 0

        board.append({
            "name": name,
            "deals": deals,
            "revenue": round(revenue, 0),
            "commission": round(commission, 0),
            "avg_rating": avg_r,
            "total_ratings": len(rep_ratings),
        })

    # Sort by deals closed desc, then revenue desc
    board.sort(key=lambda x: (-x["deals"], -x["revenue"]))

    # Add rank
    for i, entry in enumerate(board):
        entry["rank"] = i + 1

    return board
