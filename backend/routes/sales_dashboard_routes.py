"""
Sales Dashboard API — Phase C
Aggregates KPIs, today's actions, pipeline stages, commission-per-order, and assigned CRM.
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

    # ═══ KPIs ═══
    all_orders = await db.orders.find(
        {**sales_filter, "status": {"$nin": ["cancelled", "draft"]}},
        {"_id": 0, "id": 1, "total_amount": 1, "total": 1, "created_at": 1,
         "status": 1, "payment_status": 1, "order_number": 1, "customer_name": 1}
    ).sort("created_at", -1).to_list(500)

    # Today's orders
    today_orders = [o for o in all_orders if _is_today(o.get("created_at"), today_start)]
    today_revenue = sum(_money(o.get("total_amount") or o.get("total") or 0) for o in today_orders)

    # This month
    month_orders = [o for o in all_orders if _is_this_month(o.get("created_at"), month_start)]
    month_revenue = sum(_money(o.get("total_amount") or o.get("total") or 0) for o in month_orders)

    # Pipeline value (open orders not yet paid/completed)
    pipeline_orders = [o for o in all_orders if o.get("payment_status") not in ("paid", "verified") and o.get("status") not in ("completed", "cancelled")]
    pipeline_value = sum(_money(o.get("total_amount") or o.get("total") or 0) for o in pipeline_orders)

    # Commissions
    comm_filter = {"beneficiary_type": "sales"}
    if user_id:
        comm_filter["beneficiary_user_id"] = user_id
    commissions = await db.commissions.find(comm_filter, {"_id": 0}).to_list(500)
    total_earned = sum(c.get("amount", 0) for c in commissions if c.get("status") in ("approved", "paid"))
    pending_payout = sum(c.get("amount", 0) for c in commissions if c.get("status") == "approved")

    # Leads
    lead_filter = {"assigned_to": user_email} if user_email else {}
    total_leads = await db.crm_leads.count_documents(lead_filter)

    # Quotes
    quote_filter = {"assigned_to": user_email} if user_email else {}
    total_quotes = await db.quotes_v2.count_documents(quote_filter)
    pending_quotes = await db.quotes_v2.count_documents({**quote_filter, "status": {"$in": ["pending", "sent"]}})
    approved_quotes = await db.quotes_v2.count_documents({**quote_filter, "status": "approved"})

    conversion_rate = round((len([o for o in all_orders if o.get("payment_status") == "paid"]) / max(total_leads, 1)) * 100, 1)

    kpis = {
        "today_orders": len(today_orders),
        "today_revenue": _money(today_revenue),
        "month_orders": len(month_orders),
        "month_revenue": _money(month_revenue),
        "pipeline_value": _money(pipeline_value),
        "total_earned": _money(total_earned),
        "pending_payout": _money(pending_payout),
        "conversion_rate": conversion_rate,
        "total_leads": total_leads,
        "total_quotes": total_quotes,
        "open_orders": len(pipeline_orders),
    }

    # ═══ TODAY'S ACTIONS ═══
    actions = []

    # Urgent leads (new, not contacted)
    urgent_leads = await db.crm_leads.find(
        {**lead_filter, "status": {"$in": ["new", "contacted"]}},
        {"_id": 0, "id": 1, "name": 1, "company": 1, "phone": 1, "email": 1, "status": 1}
    ).sort("created_at", -1).to_list(10)

    for lead in urgent_leads:
        actions.append({
            "type": "follow_up",
            "urgency": "high" if lead.get("status") == "new" else "medium",
            "title": f"Follow up: {lead.get('name') or lead.get('company', 'Unknown')}",
            "description": f"Lead status: {lead.get('status', 'new')}",
            "phone": lead.get("phone"),
            "email": lead.get("email"),
            "href": "/staff/portfolio",
        })

    # Pending quotes to follow up
    pq = await db.quotes_v2.find(
        {**quote_filter, "status": {"$in": ["pending", "sent"]}},
        {"_id": 0, "id": 1, "quote_number": 1, "customer_name": 1, "total": 1, "status": 1}
    ).sort("created_at", -1).to_list(10)

    for q in pq:
        actions.append({
            "type": "quote_followup",
            "urgency": "medium",
            "title": f"Quote #{q.get('quote_number', q.get('id', '')[:8])} — {q.get('customer_name', '')}",
            "description": f"TZS {_money(q.get('total', 0)):,.0f} — {q.get('status', 'pending')}",
            "href": "/staff/orders",
        })

    # Approved quotes ready to close
    aq = await db.quotes_v2.find(
        {**quote_filter, "status": "approved"},
        {"_id": 0, "id": 1, "quote_number": 1, "customer_name": 1, "total": 1}
    ).to_list(10)

    for q in aq:
        actions.append({
            "type": "close_deal",
            "urgency": "hot",
            "title": f"Close: {q.get('customer_name', '')} — #{q.get('quote_number', '')}",
            "description": f"TZS {_money(q.get('total', 0)):,.0f} approved — push to payment",
            "href": "/staff/orders",
        })

    # Sort by urgency
    urgency_order = {"hot": 0, "high": 1, "medium": 2, "low": 3}
    actions.sort(key=lambda a: urgency_order.get(a.get("urgency", "low"), 4))

    # ═══ PIPELINE ═══
    pipeline = {
        "new_leads": await db.crm_leads.count_documents({**lead_filter, "status": "new"}),
        "contacted": await db.crm_leads.count_documents({**lead_filter, "status": "contacted"}),
        "quoted": pending_quotes,
        "approved": approved_quotes,
        "paid": len([o for o in all_orders if o.get("payment_status") == "paid"]),
        "fulfilled": len([o for o in all_orders if o.get("status") in ("completed", "delivered", "fulfilled")]),
    }

    # ═══ RECENT ORDERS WITH COMMISSION ═══
    from services.margin_engine import get_split_settings
    split = await get_split_settings(db)
    sales_pct = split.get("sales_share_pct", 30)

    # Build commission map
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

    return {
        "ok": True,
        "staff_name": user_name or "Sales",
        "kpis": kpis,
        "today_actions": actions[:15],
        "pipeline": pipeline,
        "recent_orders": recent_orders,
        "assigned_customers": assigned_customers,
    }


def _is_today(created_at, today_start):
    if not created_at:
        return False
    if isinstance(created_at, str):
        try:
            created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
        except Exception:
            return False
    try:
        return created_at >= today_start
    except Exception:
        return False


def _is_this_month(created_at, month_start):
    if not created_at:
        return False
    if isinstance(created_at, str):
        try:
            created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
        except Exception:
            return False
    try:
        return created_at >= month_start
    except Exception:
        return False
