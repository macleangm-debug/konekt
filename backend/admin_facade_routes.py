from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import uuid4
import os
import jwt as pyjwt

from fastapi import APIRouter, Query, Request, HTTPException

from core.live_commerce_service import LiveCommerceService

router = APIRouter(prefix="/api/admin", tags=["Admin Facade"])

def _get_caller_role(request: Request) -> str:
    """Extract caller role from JWT without strict validation (dashboard only)."""
    auth = request.headers.get("authorization", "")
    if auth.startswith("Bearer "):
        try:
            token = auth.split(" ")[1]
            payload = pyjwt.decode(token, options={"verify_signature": False})
            return payload.get("role", "admin")
        except Exception:
            pass
    return "admin"

def _now():
    return datetime.now(timezone.utc).isoformat()

def _clean(doc):
    if not doc:
        return doc
    doc = dict(doc)
    if "_id" in doc:
        if "id" not in doc or not doc["id"]:
            doc["id"] = str(doc["_id"])
        doc.pop("_id", None)
    return doc

# ─── DASHBOARD ────────────────────────────────────────────────────────────────

@router.get("/dashboard/kpis")
async def dashboard_kpis(request: Request):
    """Comprehensive admin dashboard KPIs, snapshots, and chart data."""
    db = request.app.mongodb
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()

    # ── Top KPI row ──
    orders_today = await db.orders.count_documents({"created_at": {"$gte": today_start}})
    
    # Revenue this month (from completed/delivered/paid orders)
    revenue_pipeline = [
        {"$match": {"status": {"$in": ["delivered", "completed", "paid"]}, "created_at": {"$gte": month_start}}},
        {"$group": {"_id": None, "total": {"$sum": {"$toDouble": {"$ifNull": ["$total", 0]}}}}},
    ]
    rev_result = await db.orders.aggregate(revenue_pipeline).to_list(length=1)
    revenue_month = rev_result[0]["total"] if rev_result else 0

    pending_payments = await db.payment_proofs.count_documents({"status": {"$in": ["uploaded", "submitted", "pending"]}})
    active_quotes = await db.quotes.count_documents({"status": {"$in": ["pending", "sent", "quoting"]}})
    delayed_orders = await db.orders.count_documents({"status": "delayed"})
    vo_delayed = await db.vendor_orders.count_documents({"status": "delayed"})
    pending_approvals = pending_payments  # Payment proofs needing approval

    # ── Operations snapshot ──
    status_counts = {}
    pipeline_statuses = ["pending", "confirmed", "paid", "assigned", "in_production", "in_progress", "ready", "dispatched", "in_transit", "delivered", "completed", "delayed", "cancelled"]
    for st in pipeline_statuses:
        status_counts[st] = await db.orders.count_documents({"status": st})
    total_orders = await db.orders.count_documents({})

    # ── Finance snapshot ──
    invoices_issued = await db.invoices.count_documents({"created_at": {"$gte": month_start}})
    total_invoices = await db.invoices.count_documents({})
    outstanding_pipeline = [
        {"$match": {"status": {"$in": ["unpaid", "pending", "sent"]}}},
        {"$group": {"_id": None, "total": {"$sum": {"$toDouble": {"$ifNull": ["$total", 0]}}}}},
    ]
    outstanding_result = await db.invoices.aggregate(outstanding_pipeline).to_list(length=1)
    outstanding_amount = outstanding_result[0]["total"] if outstanding_result else 0

    # ── Commercial snapshot ──
    active_promotions = await db.promotions.count_documents({"status": "active"})
    discount_requests = await db.discount_requests.count_documents({"status": "pending"})

    # ── Partner snapshot ──
    active_partners = await db.partner_users.count_documents({"status": "active"})
    total_affiliates = await db.affiliates.count_documents({})
    active_vendors = await db.partner_users.count_documents({"status": "active", "partner_type": {"$in": ["vendor", "supplier"]}})

    # ── Team snapshot ──
    total_customers = await db.users.count_documents({"role": {"$in": ["customer", "user"]}})
    total_sales = await db.users.count_documents({"role": "sales"})

    # ── Chart: orders by day (last 14 days) ──
    orders_trend = []
    for i in range(13, -1, -1):
        from datetime import timedelta
        day = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        next_day = day + timedelta(days=1)
        count = await db.orders.count_documents({"created_at": {"$gte": day.isoformat(), "$lt": next_day.isoformat()}})
        orders_trend.append({"date": day.strftime("%d %b"), "orders": count})

    # ── Profit this month: Revenue - Base Cost - Commissions paid ──
    profit_month = 0
    month_orders = await db.orders.find(
        {"status": {"$in": ["delivered", "completed", "paid"]}, "created_at": {"$gte": month_start}}
    ).to_list(length=5000)
    total_base_cost_month = 0
    for mo in month_orders:
        sell = float(mo.get("total") or mo.get("total_amount") or 0)
        base = float(mo.get("base_cost") or mo.get("vendor_cost") or 0)
        total_base_cost_month += base
        profit_month += (sell - base)
    # Subtract commissions paid this month
    month_commissions = await db.commissions.find(
        {"created_at": {"$gte": month_start}, "status": {"$in": ["earned", "approved", "paid", "payable"]}}
    ).to_list(length=5000)
    commissions_total_month = sum(float(c.get("amount") or 0) for c in month_commissions)
    profit_month -= commissions_total_month
    # Only show negative profit if there's actual revenue (avoid misleading negatives from test commissions)
    if revenue_month <= 0:
        profit_month = 0

    # ── Chart: revenue + profit by month (last 6 months) ──
    revenue_trend = []
    for i in range(5, -1, -1):
        m = now.month - i
        y = now.year
        while m <= 0:
            m += 12
            y -= 1
        m_start_dt = datetime(y, m, 1, tzinfo=timezone.utc)
        m_start = m_start_dt.isoformat()
        nm = m + 1
        ny = y
        if nm > 12:
            nm = 1
            ny += 1
        m_end = datetime(ny, nm, 1, tzinfo=timezone.utc).isoformat()
        rev_p = [
            {"$match": {"status": {"$in": ["delivered", "completed", "paid"]}, "created_at": {"$gte": m_start, "$lt": m_end}}},
            {"$group": {"_id": None, "total": {"$sum": {"$toDouble": {"$ifNull": ["$total", 0]}}}}},
        ]
        r = await db.orders.aggregate(rev_p).to_list(length=1)
        m_revenue = r[0]["total"] if r else 0

        # Profit for this month: revenue - base costs - commissions
        m_orders = await db.orders.find(
            {"status": {"$in": ["delivered", "completed", "paid"]}, "created_at": {"$gte": m_start, "$lt": m_end}}
        ).to_list(length=5000)
        m_base = sum(float(o.get("base_cost") or o.get("vendor_cost") or 0) for o in m_orders)
        m_comms = await db.commissions.find(
            {"created_at": {"$gte": m_start, "$lt": m_end}, "status": {"$in": ["earned", "approved", "paid", "payable"]}}
        ).to_list(length=5000)
        m_comm_total = sum(float(c.get("amount") or 0) for c in m_comms)
        m_profit = m_revenue - m_base - m_comm_total
        if m_revenue <= 0:
            m_profit = 0

        revenue_trend.append({
            "month": m_start_dt.strftime("%b %Y"),
            "revenue": round(m_revenue, 0),
            "profit": round(m_profit, 0),
        })

    # ── Chart: status distribution ──
    status_distribution = [{"status": k.replace("_", " ").title(), "count": v} for k, v in status_counts.items() if v > 0]

    return {
        "kpis": {
            "orders_today": orders_today,
            "revenue_month": revenue_month,
            "profit_month": round(profit_month, 0),
            "pending_payments": pending_payments,
            "active_quotes": active_quotes,
            "open_delays": delayed_orders + vo_delayed,
            "pending_approvals": pending_approvals,
        },
        "operations": {
            "total_orders": total_orders,
            "status_counts": status_counts,
        },
        "finance": {
            "invoices_this_month": invoices_issued,
            "total_invoices": total_invoices,
            "outstanding_amount": outstanding_amount,
        },
        "commercial": {
            "active_promotions": active_promotions,
            "pending_discount_requests": discount_requests,
        },
        "partners": {
            "active_partners": active_partners,
            "active_vendors": active_vendors,
            "total_affiliates": total_affiliates,
        },
        "team": {
            "total_customers": total_customers,
            "total_sales": total_sales,
        },
        "charts": {
            "orders_trend": orders_trend,
            "revenue_trend": revenue_trend,
            "status_distribution": status_distribution,
        },
        "caller_role": _get_caller_role(request),
    }


@router.post("/system/go-live-reset")
async def go_live_reset(request: Request):
    """Clear all test data for go-live. Preserves: admin/staff accounts, settings, catalog, partners.
    Deletes: orders, quotes, invoices, payments, customers, commissions, requests, site visits, notifications.
    """
    db = request.app.mongodb
    now = datetime.now(timezone.utc).isoformat()

    # Collections to completely clear
    clear_collections = [
        "orders", "vendor_orders", "quotes", "quotes_v2",
        "invoices", "payment_proofs", "commissions", "payouts",
        "requests", "site_visits", "status_requests",
        "order_events", "stock_movements", "inventory_reservations",
        "production_queue", "admin_tasks", "delivery_notes",
        "notifications", "referral_events", "sales_assignments",
        "discount_requests", "group_deal_participants",
        "document_sequences",
    ]

    deleted_counts = {}
    for coll_name in clear_collections:
        try:
            coll = db[coll_name]
            result = await coll.delete_many({})
            deleted_counts[coll_name] = result.deleted_count
        except Exception:
            deleted_counts[coll_name] = 0

    # Delete non-admin, non-staff users (customers)
    protected_roles = {"admin", "sales", "sales_manager", "finance_manager", "vendor_ops", "production", "staff", "marketing"}
    cust_result = await db.users.delete_many({"role": {"$nin": list(protected_roles)}})
    deleted_counts["customer_users"] = cust_result.deleted_count

    # Reset affiliate statuses to pending (preserve accounts)
    await db.affiliates.update_many({}, {"$set": {"status": "pending", "updated_at": now}})

    # Update system mode to full_live
    await db.admin_settings.update_one(
        {"key": "settings_hub"},
        {"$set": {"value.launch_controls.system_mode": "full_live"}},
    )

    # Log the reset event
    await db.audit_log.insert_one({
        "action": "go_live_reset",
        "performed_at": now,
        "deleted_counts": deleted_counts,
        "note": "Test data cleared for go-live deployment",
    })

    return {
        "status": "success",
        "message": "Test data cleared. System is now in Live mode.",
        "deleted_counts": deleted_counts,
    }



@router.get("/active-country-config")
async def get_active_country_config(request: Request):
    """Get the active country configuration.
    
    Returns the currency, VAT rate, phone prefix, etc. for the currently active country.
    Frontend uses this to determine how to format numbers, which currency to display, etc.
    """
    db = request.app.mongodb
    hub = await db.admin_settings.find_one({"key": "settings_hub"})
    if not hub:
        return {
            "code": "TZ", "name": "Tanzania", "currency": "TZS",
            "currency_symbol": "TSh", "vat_rate": 18, "phone_prefix": "+255",
            "doc_prefix_code": "TZ", "timezone": "Africa/Dar_es_Salaam",
        }
    
    countries_cfg = (hub.get("value") or {}).get("countries", {})
    active_code = countries_cfg.get("active_country", "TZ")
    available = countries_cfg.get("available_countries", [])
    
    for c in available:
        if c.get("code") == active_code:
            return {
                "code": c.get("code", "TZ"),
                "name": c.get("name", "Tanzania"),
                "currency": c.get("currency", "TZS"),
                "currency_symbol": c.get("currency_symbol", "TSh"),
                "vat_rate": float(c.get("vat_rate", 18) or 18),
                "phone_prefix": c.get("phone_prefix", "+255"),
                "doc_prefix_code": c.get("doc_prefix_code", "TZ"),
                "timezone": c.get("timezone", "Africa/Dar_es_Salaam"),
            }
    
    # Fallback
    return {
        "code": "TZ", "name": "Tanzania", "currency": "TZS",
        "currency_symbol": "TSh", "vat_rate": 18, "phone_prefix": "+255",
        "doc_prefix_code": "TZ", "timezone": "Africa/Dar_es_Salaam",
    }


@router.get("/dashboard/summary")

@router.post("/impersonate/{user_id}")
async def impersonate_user(user_id: str, request: Request):
    """Admin/Ops can impersonate another user account (vendor, sales, etc).
    
    Creates a temporary JWT token for the target user, allowing Ops to
    perform actions on their behalf. Original admin session is preserved.
    
    Only admin and vendor_ops roles can impersonate.
    """
    db = request.app.mongodb
    
    # Verify caller is admin or vendor_ops
    caller_role = _get_caller_role(request)
    if caller_role not in ("admin", "vendor_ops"):
        raise HTTPException(status_code=403, detail="Only admin and operations can impersonate users")
    
    # Find target user
    target = await db.users.find_one({"id": user_id})
    if not target:
        # Try partner_users
        target = await db.partner_users.find_one({"partner_id": user_id})
        if target:
            target["id"] = target.get("partner_id", user_id)
            target["role"] = target.get("partner_type", "vendor")
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Cannot impersonate admin
    if target.get("role") == "admin":
        raise HTTPException(status_code=403, detail="Cannot impersonate admin accounts")
    
    jwt_secret = os.environ.get('JWT_SECRET', 'konekt-secret-key-2024')
    token_payload = {
        "user_id": target.get("id", user_id),
        "email": target.get("email", ""),
        "role": target.get("role", "vendor"),
        "full_name": target.get("full_name", target.get("name", "")),
        "impersonated_by": caller_role,
        "is_impersonation": True,
        "exp": datetime.now(timezone.utc) + timedelta(hours=4),
    }
    
    token = pyjwt.encode(token_payload, jwt_secret, algorithm="HS256")
    
    return {
        "token": token,
        "user": {
            "id": target.get("id", user_id),
            "name": target.get("full_name", target.get("name", "")),
            "email": target.get("email", ""),
            "role": target.get("role", "vendor"),
            "company": target.get("company_name", target.get("company", "")),
        },
        "message": f"Impersonating {target.get('full_name', target.get('email', user_id))}",
    }


async def dashboard_summary(request: Request):
    db = request.app.mongodb
    pending_payments = await db.payment_proofs.count_documents({"status": {"$in": ["uploaded", "submitted", "pending"]}})
    open_quotes = await db.quotes.count_documents({"status": {"$in": ["pending", "sent", "quoting"]}})
    active_orders = await db.orders.count_documents({"status": {"$nin": ["completed", "cancelled", "delivered"]}})
    manual_released = await db.orders.count_documents({"release_type": "manual"})
    active_affiliates = await db.affiliates.count_documents({"status": "active"})
    new_referrals = await db.referral_events.count_documents({})
    total_customers = await db.users.count_documents({"role": {"$in": ["customer", "user"]}})
    return {
        "pending_payments": pending_payments,
        "open_quotes": open_quotes,
        "active_orders": active_orders,
        "manually_released_orders": manual_released,
        "active_affiliates": active_affiliates,
        "new_referrals": new_referrals,
        "total_customers": total_customers,
    }

@router.get("/dashboard/pending-actions")
async def dashboard_pending_actions(request: Request):
    db = request.app.mongodb
    proofs = await db.payment_proofs.find({"status": "uploaded"}).sort("created_at", -1).to_list(length=10)
    quotes = await db.quotes.find({"status": {"$in": ["pending", "sent"]}}).sort("created_at", -1).to_list(length=10)
    return {
        "pending_proofs": [_clean(p) for p in proofs],
        "pending_quotes": [_clean(q) for q in quotes],
    }


@router.get("/dashboard/team-kpis")
async def dashboard_team_kpis(request: Request):
    """
    Team-level KPIs for Sales Manager dashboard.
    Returns: team deals, team revenue, avg rating, pipeline value,
    critical alerts, low rating alerts, team performance table,
    leaderboard, and pipeline overview.
    """
    db = request.app.mongodb
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # ── Get all sales reps ──
    sales_users = await db.users.find(
        {"role": {"$in": ["sales", "staff"]}},
        {"_id": 0, "id": 1, "email": 1, "full_name": 1}
    ).to_list(100)

    sales_ids = []
    sales_map = {}
    for u in sales_users:
        uid = u.get("id", "")
        sales_ids.append(uid)
        sales_map[uid] = u.get("full_name", u.get("email", ""))
        sales_map[u.get("email", "")] = u.get("full_name", u.get("email", ""))

    # ── All team orders ──
    all_orders = await db.orders.find(
        {"status": {"$nin": ["cancelled", "draft"]}},
        {"_id": 0, "assigned_sales_id": 1, "total_amount": 1, "total": 1,
         "payment_status": 1, "status": 1, "rating": 1, "created_at": 1,
         "customer_name": 1, "order_number": 1}
    ).to_list(10000)

    # ── Team KPIs ──
    paid_orders = [o for o in all_orders if o.get("payment_status") in ("paid", "verified")]
    team_deals = len(paid_orders)
    team_revenue = sum(float(o.get("total_amount") or o.get("total") or 0) for o in paid_orders)

    # Monthly team revenue
    team_revenue_month = 0
    for o in paid_orders:
        created = o.get("created_at", "")
        if isinstance(created, str) and created >= month_start.isoformat():
            team_revenue_month += float(o.get("total_amount") or o.get("total") or 0)

    # Pipeline value (open orders not yet paid/completed)
    pipeline_orders = [o for o in all_orders if o.get("payment_status") not in ("paid", "verified") and o.get("status") not in ("completed", "cancelled", "delivered")]
    pipeline_value = sum(float(o.get("total_amount") or o.get("total") or 0) for o in pipeline_orders)

    # Team ratings
    all_ratings = []
    low_rating_alerts = []
    for o in all_orders:
        r = o.get("rating")
        if r and r.get("stars"):
            all_ratings.append(r["stars"])
            if r["stars"] <= 2:
                rep_id = o.get("assigned_sales_id", "")
                low_rating_alerts.append({
                    "order_number": o.get("order_number", ""),
                    "customer_name": o.get("customer_name", ""),
                    "stars": r["stars"],
                    "comment": r.get("comment", ""),
                    "rep_name": sales_map.get(rep_id, rep_id),
                    "rated_at": r.get("rated_at", ""),
                })
    avg_rating = round(sum(all_ratings) / max(len(all_ratings), 1), 1) if all_ratings else 0

    # ── Discount risk alerts (critical) ──
    settings_doc = await db.admin_settings.find_one({"type": "discount_governance"}, {"_id": 0})
    critical_threshold = 30
    if settings_doc and settings_doc.get("settings"):
        critical_threshold = settings_doc["settings"].get("critical_threshold", 30)

    critical_discount_count = 0
    discount_requests = await db.discount_requests.find(
        {"status": "pending"},
        {"_id": 0, "discount_percent": 1, "requested_by_name": 1, "customer_name": 1}
    ).to_list(100)
    critical_discounts = []
    for dr in discount_requests:
        pct = float(dr.get("discount_percent", 0))
        if pct >= critical_threshold:
            critical_discount_count += 1
            critical_discounts.append({
                "requested_by": dr.get("requested_by_name", ""),
                "customer_name": dr.get("customer_name", ""),
                "discount_percent": pct,
            })

    # ── Per-rep performance table ──
    all_commissions = await db.commissions.find(
        {"beneficiary_type": "sales"},
        {"_id": 0, "beneficiary_user_id": 1, "amount": 1}
    ).to_list(5000)

    team_table = []
    for user in sales_users:
        uid = user.get("id", "")
        uemail = user.get("email", "")
        name = user.get("full_name", uemail)

        rep_orders = [o for o in all_orders if o.get("assigned_sales_id") in (uid, uemail)]
        rep_paid = [o for o in rep_orders if o.get("payment_status") in ("paid", "verified")]
        deals = len(rep_paid)
        revenue = sum(float(o.get("total_amount") or o.get("total") or 0) for o in rep_paid)
        pipeline = sum(float(o.get("total_amount") or o.get("total") or 0) for o in rep_orders if o.get("payment_status") not in ("paid", "verified") and o.get("status") not in ("completed", "cancelled", "delivered"))

        rep_comms = [c for c in all_commissions if c.get("beneficiary_user_id") == uid]
        commission = sum(c.get("amount", 0) for c in rep_comms)

        rep_ratings = [o["rating"]["stars"] for o in rep_orders if o.get("rating", {}).get("stars")]
        avg_r = round(sum(rep_ratings) / max(len(rep_ratings), 1), 1) if rep_ratings else 0

        team_table.append({
            "id": uid,
            "name": name,
            "deals": deals,
            "revenue": round(revenue, 0),
            "pipeline": round(pipeline, 0),
            "commission": round(commission, 0),
            "avg_rating": avg_r,
            "total_ratings": len(rep_ratings),
            "total_orders": len(rep_orders),
        })

    # Sort by deals desc
    team_table.sort(key=lambda x: -x["deals"])

    # ── Pipeline overview (status breakdown) ──
    pipeline_statuses = ["pending", "confirmed", "paid", "assigned", "in_production",
                         "in_progress", "ready", "dispatched", "in_transit", "delivered", "completed"]
    pipeline_overview = []
    for st in pipeline_statuses:
        count = sum(1 for o in all_orders if o.get("status") == st)
        value = sum(float(o.get("total_amount") or o.get("total") or 0) for o in all_orders if o.get("status") == st)
        if count > 0:
            pipeline_overview.append({"status": st.replace("_", " ").title(), "count": count, "value": round(value, 0)})

    # ── Build leaderboard (revenue visible to manager) ──
    from routes.sales_dashboard_routes import _build_leaderboard
    leaderboard = await _build_leaderboard(db, now, hide_revenue=False)

    # ── Generate coaching insights ──
    from services.coaching_engine import generate_coaching_insights
    coaching_insights = await generate_coaching_insights(db, team_table, all_orders, sales_map)
    # Filter to flagged reps only for the dashboard
    coaching_flagged = [c for c in coaching_insights if c["status"] in ("Critical", "Needs Attention", "Improving")]

    return {
        "team_kpis": {
            "team_deals": team_deals,
            "team_revenue": round(team_revenue, 0),
            "team_revenue_month": round(team_revenue_month, 0),
            "avg_rating": avg_rating,
            "total_ratings": len(all_ratings),
            "pipeline_value": round(pipeline_value, 0),
            "critical_discount_alerts": critical_discount_count,
            "low_rating_alerts": len(low_rating_alerts),
            "total_reps": len(sales_users),
        },
        "team_table": team_table,
        "pipeline_overview": pipeline_overview,
        "leaderboard": leaderboard,
        "low_rating_details": low_rating_alerts[:10],
        "critical_discount_details": critical_discounts[:10],
        "coaching_insights": coaching_flagged[:7],
        "coaching_all": coaching_insights,
    }


@router.get("/dashboard/finance-kpis")
async def dashboard_finance_kpis(request: Request):
    """
    Finance Manager dashboard — decision-focused financial data.
    KPIs: Total Revenue, Collected, Pending, Outstanding, Commission Payable, Net Margin.
    Sections: Cash Flow, Payment Status, Margin, Commissions, Top Revenue, Risky Discounts.
    Charts: Cash flow trend, payment distribution, margin trend.
    """
    db = request.app.mongodb
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # ═══ KPIs ═══

    # Total Revenue (all-time paid/delivered/completed orders)
    all_orders = await db.orders.find(
        {"status": {"$nin": ["cancelled", "draft"]}},
        {"_id": 0, "total_amount": 1, "total": 1, "payment_status": 1,
         "status": 1, "created_at": 1, "customer_name": 1,
         "discount_percent": 1, "assigned_sales_id": 1, "order_number": 1}
    ).to_list(10000)

    paid_orders = [o for o in all_orders if o.get("payment_status") in ("paid", "verified")]
    total_revenue = sum(float(o.get("total_amount") or o.get("total") or 0) for o in paid_orders)

    # Revenue this month
    revenue_month = 0
    for o in paid_orders:
        ca = o.get("created_at", "")
        if isinstance(ca, str) and ca >= month_start.isoformat():
            revenue_month += float(o.get("total_amount") or o.get("total") or 0)

    # Collected payments (approved payment proofs)
    collected_pipeline = [
        {"$match": {"status": "approved"}},
        {"$group": {"_id": None, "total": {"$sum": {"$toDouble": {"$ifNull": ["$amount", 0]}}}}},
    ]
    collected_result = await db.payment_proofs.aggregate(collected_pipeline).to_list(1)
    collected_payments = collected_result[0]["total"] if collected_result else total_revenue

    # Pending payments (uploaded/pending proofs)
    pending_proofs = await db.payment_proofs.find(
        {"status": {"$in": ["uploaded", "submitted", "pending", "pending_verification"]}},
        {"_id": 0, "amount": 1, "payer_name": 1, "status": 1, "created_at": 1}
    ).to_list(200)
    pending_payments_total = sum(float(p.get("amount", 0)) for p in pending_proofs)
    pending_payments_count = len(pending_proofs)

    # Outstanding invoices
    outstanding_pipeline = [
        {"$match": {"status": {"$in": ["pending_payment", "sent", "under_review", "partially_paid"]}}},
        {"$group": {"_id": None, "total": {"$sum": {"$toDouble": {"$ifNull": ["$total", 0]}}}, "count": {"$sum": 1}}},
    ]
    outstanding_result = await db.invoices.aggregate(outstanding_pipeline).to_list(1)
    outstanding_amount = outstanding_result[0]["total"] if outstanding_result else 0
    outstanding_count = outstanding_result[0]["count"] if outstanding_result else 0

    # Commission payable (approved but not paid)
    commission_pipeline = [
        {"$match": {"status": {"$in": ["approved", "pending", "expected"]}}},
        {"$group": {"_id": None, "total": {"$sum": {"$toDouble": {"$ifNull": ["$amount", 0]}}}, "count": {"$sum": 1}}},
    ]
    commission_result = await db.commissions.aggregate(commission_pipeline).to_list(1)
    commission_payable = commission_result[0]["total"] if commission_result else 0
    commission_pending_count = commission_result[0]["count"] if commission_result else 0

    # Total commissions paid
    paid_comm_pipeline = [
        {"$match": {"status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": {"$toDouble": {"$ifNull": ["$amount", 0]}}}}},
    ]
    paid_comm_result = await db.commissions.aggregate(paid_comm_pipeline).to_list(1)
    commission_paid = paid_comm_result[0]["total"] if paid_comm_result else 0

    # Net margin estimate (revenue - commission paid - commission payable)
    net_margin = total_revenue - commission_paid - commission_payable
    margin_pct = round((net_margin / max(total_revenue, 1)) * 100, 1)

    # ═══ PAYMENT STATUS BREAKDOWN ═══
    from collections import Counter
    all_proofs = await db.payment_proofs.find({}, {"_id": 0, "status": 1}).to_list(500)
    proof_statuses = Counter(p.get("status", "unknown") for p in all_proofs)
    payment_status_breakdown = [
        {"status": k.replace("_", " ").title(), "count": v}
        for k, v in proof_statuses.most_common()
    ]

    # ═══ INVOICE STATUS BREAKDOWN ═══
    all_invoices = await db.invoices.find({}, {"_id": 0, "status": 1, "total": 1}).to_list(1000)
    inv_statuses = Counter(i.get("status", "unknown") for i in all_invoices)
    invoice_breakdown = [
        {"status": k.replace("_", " ").title(), "count": v}
        for k, v in inv_statuses.most_common()
    ]

    # ═══ TOP REVENUE SOURCES ═══ (top 5 customers by paid order value)
    customer_revenue = {}
    for o in paid_orders:
        cname = o.get("customer_name") or "Unknown"
        customer_revenue[cname] = customer_revenue.get(cname, 0) + float(o.get("total_amount") or o.get("total") or 0)
    top_customers = sorted(customer_revenue.items(), key=lambda x: -x[1])[:5]
    top_revenue_sources = [{"customer": c, "revenue": round(r, 0)} for c, r in top_customers if c != "Unknown"]

    # ═══ HIGH-RISK DISCOUNTS ═══
    settings_doc = await db.admin_settings.find_one({"type": "discount_governance"}, {"_id": 0})
    warning_threshold = 20
    critical_threshold = 30
    if settings_doc and settings_doc.get("settings"):
        warning_threshold = settings_doc["settings"].get("warning_threshold", 20)
        critical_threshold = settings_doc["settings"].get("critical_threshold", 30)

    risky_discounts = []
    discount_reqs = await db.discount_requests.find(
        {},
        {"_id": 0, "discount_percent": 1, "requested_by_name": 1, "customer_name": 1,
         "status": 1, "created_at": 1}
    ).sort("created_at", -1).to_list(50)
    for dr in discount_reqs:
        pct = float(dr.get("discount_percent", 0))
        if pct >= warning_threshold:
            risky_discounts.append({
                "requested_by": dr.get("requested_by_name", ""),
                "customer_name": dr.get("customer_name", ""),
                "discount_percent": pct,
                "status": dr.get("status", ""),
                "risk": "critical" if pct >= critical_threshold else "warning",
            })

    # ═══ COMMISSION BY REP ═══
    sales_users = await db.users.find(
        {"role": {"$in": ["sales", "staff"]}},
        {"_id": 0, "id": 1, "email": 1, "full_name": 1}
    ).to_list(100)
    all_commissions = await db.commissions.find({}, {"_id": 0, "beneficiary_user_id": 1, "amount": 1, "status": 1, "source_type": 1}).to_list(5000)

    commission_by_rep = []
    for u in sales_users:
        uid = u.get("id", "")
        rep_comms = [c for c in all_commissions if c.get("beneficiary_user_id") == uid]
        total_c = sum(c.get("amount", 0) for c in rep_comms)
        paid_c = sum(c.get("amount", 0) for c in rep_comms if c.get("status") == "paid")
        pending_c = sum(c.get("amount", 0) for c in rep_comms if c.get("status") in ("approved", "pending", "expected"))
        if total_c > 0 or len(rep_comms) > 0:
            commission_by_rep.append({
                "name": u.get("full_name", u.get("email", "")),
                "total": round(total_c, 0),
                "paid": round(paid_c, 0),
                "pending": round(pending_c, 0),
                "count": len(rep_comms),
            })
    commission_by_rep.sort(key=lambda x: -x["total"])

    # Affiliate commissions
    affiliate_comms = [c for c in all_commissions if c.get("source_type") == "affiliate"]
    affiliate_total = sum(c.get("amount", 0) for c in affiliate_comms)

    # ═══ CHARTS ═══

    # Cash flow trend (last 6 months: revenue in vs commission out)
    cash_flow_trend = []
    for i in range(5, -1, -1):
        m = now.month - i
        y = now.year
        while m <= 0:
            m += 12
            y -= 1
        m_start = datetime(y, m, 1, tzinfo=timezone.utc).isoformat()
        nm = m + 1
        ny = y
        if nm > 12:
            nm = 1
            ny += 1
        m_end = datetime(ny, nm, 1, tzinfo=timezone.utc).isoformat()

        # Revenue in
        month_rev = sum(
            float(o.get("total_amount") or o.get("total") or 0)
            for o in paid_orders
            if isinstance(o.get("created_at"), str) and m_start <= o["created_at"] < m_end
        )

        # Commission out
        month_comm = sum(
            c.get("amount", 0) for c in all_commissions
            if isinstance(c.get("created_at"), str) and m_start <= c["created_at"] < m_end
        )

        cash_flow_trend.append({
            "month": datetime(y, m, 1).strftime("%b %Y"),
            "revenue": round(month_rev, 0),
            "commissions": round(month_comm, 0),
            "net": round(month_rev - month_comm, 0),
        })

    # Margin trend (by month — margin %)
    margin_trend = []
    for cf in cash_flow_trend:
        rev = cf["revenue"]
        comm = cf["commissions"]
        m_pct = round(((rev - comm) / max(rev, 1)) * 100, 1) if rev > 0 else 0
        margin_trend.append({"month": cf["month"], "margin_pct": m_pct, "net": cf["net"]})

    return {
        "finance_kpis": {
            "total_revenue": round(total_revenue, 0),
            "revenue_month": round(revenue_month, 0),
            "collected_payments": round(collected_payments, 0),
            "pending_payments": round(pending_payments_total, 0),
            "pending_payments_count": pending_payments_count,
            "outstanding_invoices": round(outstanding_amount, 0),
            "outstanding_count": outstanding_count,
            "commission_payable": round(commission_payable, 0),
            "commission_pending_count": commission_pending_count,
            "commission_paid": round(commission_paid, 0),
            "net_margin": round(net_margin, 0),
            "margin_pct": margin_pct,
        },
        "payment_status_breakdown": payment_status_breakdown,
        "invoice_breakdown": invoice_breakdown,
        "top_revenue_sources": top_revenue_sources,
        "risky_discounts": risky_discounts[:10],
        "commission_by_rep": commission_by_rep,
        "affiliate_commission_total": round(affiliate_total, 0),
        "charts": {
            "cash_flow_trend": cash_flow_trend,
            "margin_trend": margin_trend,
        },
    }



# ─── REPORTS HUB ──────────────────────────────────────────────────────────────

@router.get("/reports/business-health")
async def reports_business_health(request: Request, days: int = Query(180)):
    """Executive business health overview with trends and alerts."""
    db = request.app.mongodb
    now = datetime.now(timezone.utc)
    cutoff = (now - timedelta(days=days)).isoformat()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # All orders
    all_orders = await db.orders.find(
        {"status": {"$nin": ["cancelled", "draft"]}},
        {"_id": 0, "total_amount": 1, "total": 1, "payment_status": 1,
         "status": 1, "created_at": 1, "rating": 1, "customer_name": 1,
         "discount_percent": 1}
    ).to_list(10000)

    paid = [o for o in all_orders if o.get("payment_status") in ("paid", "verified")]
    total_revenue = sum(float(o.get("total_amount") or o.get("total") or 0) for o in paid)
    revenue_month = sum(float(o.get("total_amount") or o.get("total") or 0) for o in paid if isinstance(o.get("created_at"), str) and o["created_at"] >= month_start.isoformat())

    # Commission for margin
    all_comms = await db.commissions.find({}, {"_id": 0, "amount": 1, "created_at": 1}).to_list(5000)
    total_comm = sum(c.get("amount", 0) for c in all_comms)
    margin_pct = round(((total_revenue - total_comm) / max(total_revenue, 1)) * 100, 1)

    # Ratings
    all_ratings = [o["rating"]["stars"] for o in all_orders if o.get("rating", {}).get("stars")]
    avg_rating = round(sum(all_ratings) / max(len(all_ratings), 1), 1) if all_ratings else 0

    # Active customers
    customer_set = set(o.get("customer_name") for o in all_orders if o.get("customer_name"))
    active_customers = len(customer_set)

    # Pending payments
    pending_count = await db.payment_proofs.count_documents({"status": {"$in": ["uploaded", "submitted", "pending", "pending_verification"]}})

    # Outstanding invoices
    outstanding = await db.invoices.count_documents({"status": {"$in": ["pending_payment", "sent", "under_review", "partially_paid"]}})

    # Discount risk
    settings_doc = await db.admin_settings.find_one({"type": "discount_governance"}, {"_id": 0})
    warning_threshold = 20
    critical_threshold = 30
    if settings_doc and settings_doc.get("settings"):
        warning_threshold = settings_doc["settings"].get("warning_threshold", 20)
        critical_threshold = settings_doc["settings"].get("critical_threshold", 30)

    discount_reqs = await db.discount_requests.find({}, {"_id": 0, "discount_percent": 1, "status": 1, "created_at": 1}).to_list(500)
    critical_count = sum(1 for d in discount_reqs if float(d.get("discount_percent", 0)) >= critical_threshold)
    warning_count = sum(1 for d in discount_reqs if warning_threshold <= float(d.get("discount_percent", 0)) < critical_threshold)
    risk_score = "Critical" if critical_count > 3 else "Warning" if (critical_count + warning_count) > 5 else "Low"

    # ── Charts (6 months) ──
    revenue_trend = []
    margin_trend = []
    rating_trend_data = []
    discount_risk_trend = []

    for i in range(5, -1, -1):
        m = now.month - i
        y = now.year
        while m <= 0:
            m += 12
            y -= 1
        m_start = datetime(y, m, 1, tzinfo=timezone.utc).isoformat()
        nm = m + 1
        ny = y
        if nm > 12:
            nm = 1
            ny += 1
        m_end = datetime(ny, nm, 1, tzinfo=timezone.utc).isoformat()
        label = datetime(y, m, 1).strftime("%b %Y")

        m_rev = sum(float(o.get("total_amount") or o.get("total") or 0) for o in paid if isinstance(o.get("created_at"), str) and m_start <= o["created_at"] < m_end)
        m_comm = sum(c.get("amount", 0) for c in all_comms if isinstance(c.get("created_at"), str) and m_start <= c["created_at"] < m_end)
        m_margin = round(((m_rev - m_comm) / max(m_rev, 1)) * 100, 1) if m_rev > 0 else 0

        m_ratings = [o["rating"]["stars"] for o in all_orders if o.get("rating", {}).get("stars") and isinstance(o.get("created_at"), str) and m_start <= o["created_at"] < m_end]
        m_avg_r = round(sum(m_ratings) / max(len(m_ratings), 1), 1) if m_ratings else 0

        m_warn = sum(1 for d in discount_reqs if isinstance(d.get("created_at"), str) and m_start <= d["created_at"] < m_end and warning_threshold <= float(d.get("discount_percent", 0)) < critical_threshold)
        m_crit = sum(1 for d in discount_reqs if isinstance(d.get("created_at"), str) and m_start <= d["created_at"] < m_end and float(d.get("discount_percent", 0)) >= critical_threshold)

        revenue_trend.append({"month": label, "revenue": round(m_rev, 0)})
        margin_trend.append({"month": label, "margin_pct": m_margin})
        rating_trend_data.append({"month": label, "avg_rating": m_avg_r})
        discount_risk_trend.append({"month": label, "warning": m_warn, "critical": m_crit})

    # ── Alerts ──
    alerts = []
    if pending_count > 10:
        alerts.append({"type": "Payment", "severity": "warning", "message": f"{pending_count} payments awaiting approval", "date": now.strftime("%Y-%m-%d")})
    if outstanding > 20:
        alerts.append({"type": "Invoice", "severity": "warning", "message": f"{outstanding} outstanding invoices", "date": now.strftime("%Y-%m-%d")})
    if critical_count > 0:
        alerts.append({"type": "Discount", "severity": "critical", "message": f"{critical_count} critical discount requests flagged", "date": now.strftime("%Y-%m-%d")})
    low_ratings = sum(1 for r in all_ratings if r <= 2)
    if low_ratings > 0:
        alerts.append({"type": "Rating", "severity": "warning", "message": f"{low_ratings} orders received low ratings (≤2 stars)", "date": now.strftime("%Y-%m-%d")})
    if not alerts:
        alerts.append({"type": "System", "severity": "info", "message": "All metrics within healthy thresholds", "date": now.strftime("%Y-%m-%d")})

    return {
        "kpis": {
            "total_revenue": round(total_revenue, 0),
            "revenue_month": round(revenue_month, 0),
            "margin_pct": margin_pct,
            "avg_rating": avg_rating,
            "total_orders": len(all_orders),
            "active_customers": active_customers,
            "pending_payments": pending_count,
            "outstanding_invoices": outstanding,
            "discount_risk_score": risk_score,
        },
        "charts": {
            "revenue_trend": revenue_trend,
            "margin_trend": margin_trend,
            "rating_trend": rating_trend_data,
            "discount_risk_trend": discount_risk_trend,
        },
        "alerts": alerts,
    }


@router.get("/reports/financial")
async def reports_financial(request: Request, days: int = Query(180)):
    """Financial reports: revenue, cash flow, margin, commission."""
    db = request.app.mongodb
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    all_orders = await db.orders.find(
        {"status": {"$nin": ["cancelled", "draft"]}},
        {"_id": 0, "total_amount": 1, "total": 1, "payment_status": 1,
         "created_at": 1, "customer_name": 1}
    ).to_list(10000)

    paid = [o for o in all_orders if o.get("payment_status") in ("paid", "verified")]
    total_revenue = sum(float(o.get("total_amount") or o.get("total") or 0) for o in paid)
    revenue_month = sum(float(o.get("total_amount") or o.get("total") or 0) for o in paid if isinstance(o.get("created_at"), str) and o["created_at"] >= month_start.isoformat())

    # Collected
    coll_result = await db.payment_proofs.aggregate([
        {"$match": {"status": "approved"}},
        {"$group": {"_id": None, "total": {"$sum": {"$toDouble": {"$ifNull": ["$amount", 0]}}}}},
    ]).to_list(1)
    collected = coll_result[0]["total"] if coll_result else total_revenue

    # Outstanding
    out_result = await db.invoices.aggregate([
        {"$match": {"status": {"$in": ["pending_payment", "sent", "under_review", "partially_paid"]}}},
        {"$group": {"_id": None, "total": {"$sum": {"$toDouble": {"$ifNull": ["$total", 0]}}}}},
    ]).to_list(1)
    outstanding = out_result[0]["total"] if out_result else 0

    # Commissions
    all_comms = await db.commissions.find({}, {"_id": 0, "amount": 1, "status": 1, "beneficiary_user_id": 1, "created_at": 1}).to_list(5000)
    comm_total = sum(c.get("amount", 0) for c in all_comms)
    margin_pct = round(((total_revenue - comm_total) / max(total_revenue, 1)) * 100, 1)

    # Payment breakdown
    from collections import Counter
    proofs = await db.payment_proofs.find({}, {"_id": 0, "status": 1}).to_list(500)
    proof_counts = Counter(p.get("status", "unknown") for p in proofs)
    payment_breakdown = [{"status": k.replace("_", " ").title(), "count": v} for k, v in proof_counts.most_common()]

    # Top customers
    cust_rev = {}
    for o in paid:
        cn = o.get("customer_name") or "Unknown"
        if cn != "Unknown":
            cust_rev[cn] = cust_rev.get(cn, 0) + float(o.get("total_amount") or o.get("total") or 0)
    top_customers = [{"customer": c, "revenue": round(r, 0)} for c, r in sorted(cust_rev.items(), key=lambda x: -x[1])[:5]]

    # Commission by rep
    sales = await db.users.find({"role": {"$in": ["sales", "staff"]}}, {"_id": 0, "id": 1, "full_name": 1, "email": 1}).to_list(100)
    comm_by_rep = []
    for u in sales:
        uid = u.get("id", "")
        rep_c = [c for c in all_comms if c.get("beneficiary_user_id") == uid]
        total_c = sum(c.get("amount", 0) for c in rep_c)
        paid_c = sum(c.get("amount", 0) for c in rep_c if c.get("status") == "paid")
        pending_c = sum(c.get("amount", 0) for c in rep_c if c.get("status") in ("approved", "pending", "expected"))
        if total_c > 0 or len(rep_c) > 0:
            comm_by_rep.append({"name": u.get("full_name", u.get("email", "")), "total": round(total_c, 0), "paid": round(paid_c, 0), "pending": round(pending_c, 0), "count": len(rep_c)})
    comm_by_rep.sort(key=lambda x: -x["total"])

    # 6 month trends
    revenue_trend = []
    cash_flow_trend = []
    margin_trend_data = []
    commission_trend = []
    for i in range(5, -1, -1):
        m = now.month - i
        y = now.year
        while m <= 0:
            m += 12
            y -= 1
        ms = datetime(y, m, 1, tzinfo=timezone.utc).isoformat()
        nm = m + 1
        ny = y
        if nm > 12:
            nm = 1
            ny += 1
        me = datetime(ny, nm, 1, tzinfo=timezone.utc).isoformat()
        label = datetime(y, m, 1).strftime("%b %Y")

        mr = sum(float(o.get("total_amount") or o.get("total") or 0) for o in paid if isinstance(o.get("created_at"), str) and ms <= o["created_at"] < me)
        mo = sum(1 for o in paid if isinstance(o.get("created_at"), str) and ms <= o["created_at"] < me)
        mc = sum(c.get("amount", 0) for c in all_comms if isinstance(c.get("created_at"), str) and ms <= c["created_at"] < me)
        mp = round(((mr - mc) / max(mr, 1)) * 100, 1) if mr > 0 else 0

        revenue_trend.append({"month": label, "revenue": round(mr, 0), "orders": mo})
        cash_flow_trend.append({"month": label, "revenue": round(mr, 0), "commissions": round(mc, 0), "net": round(mr - mc, 0)})
        margin_trend_data.append({"month": label, "margin_pct": mp, "revenue": round(mr, 0), "cost": round(mc, 0)})
        commission_trend.append({"month": label, "amount": round(mc, 0)})

    return {
        "kpis": {
            "total_revenue": round(total_revenue, 0),
            "revenue_month": round(revenue_month, 0),
            "collected": round(collected, 0),
            "outstanding_invoices": round(outstanding, 0),
            "commission_total": round(comm_total, 0),
            "margin_pct": margin_pct,
        },
        "charts": {
            "revenue_trend": revenue_trend,
            "cash_flow_trend": cash_flow_trend,
            "margin_trend": margin_trend_data,
            "commission_trend": commission_trend,
        },
        "top_customers": top_customers,
        "commission_by_rep": comm_by_rep,
        "payment_breakdown": payment_breakdown,
    }


@router.get("/reports/sales")
async def reports_sales(request: Request, days: int = Query(180)):
    """Sales reports: performance, conversion, leaderboard."""
    db = request.app.mongodb
    now = datetime.now(timezone.utc)

    # Team data
    sales_users = await db.users.find(
        {"role": {"$in": ["sales", "staff"]}},
        {"_id": 0, "id": 1, "email": 1, "full_name": 1}
    ).to_list(100)

    all_orders = await db.orders.find(
        {"status": {"$nin": ["cancelled", "draft"]}},
        {"_id": 0, "assigned_sales_id": 1, "total_amount": 1, "total": 1,
         "payment_status": 1, "status": 1, "rating": 1, "created_at": 1,
         "order_number": 1}
    ).to_list(10000)

    paid = [o for o in all_orders if o.get("payment_status") in ("paid", "verified")]
    total_deals = len(paid)
    total_revenue = sum(float(o.get("total_amount") or o.get("total") or 0) for o in paid)

    all_ratings = [o["rating"]["stars"] for o in all_orders if o.get("rating", {}).get("stars")]
    avg_rating = round(sum(all_ratings) / max(len(all_ratings), 1), 1) if all_ratings else 0

    pipeline_orders = [o for o in all_orders if o.get("payment_status") not in ("paid", "verified") and o.get("status") not in ("completed", "cancelled", "delivered")]
    pipeline_value = sum(float(o.get("total_amount") or o.get("total") or 0) for o in pipeline_orders)

    # Quotes for conversion
    all_quotes = await db.quotes.find({}, {"_id": 0, "status": 1, "created_at": 1}).to_list(5000)
    total_quotes = len(all_quotes)
    converted_quotes = sum(1 for q in all_quotes if q.get("status") in ("accepted", "converted", "ordered"))
    conversion_rate = round((converted_quotes / max(total_quotes, 1)) * 100, 1)

    # Commissions
    all_comms = await db.commissions.find({"beneficiary_type": "sales"}, {"_id": 0, "beneficiary_user_id": 1, "amount": 1}).to_list(5000)

    # Per-rep table
    team_table = []
    for u in sales_users:
        uid = u.get("id", "")
        uemail = u.get("email", "")
        name = u.get("full_name", uemail)
        rep_orders = [o for o in all_orders if o.get("assigned_sales_id") in (uid, uemail)]
        rep_paid = [o for o in rep_orders if o.get("payment_status") in ("paid", "verified")]
        deals = len(rep_paid)
        rev = sum(float(o.get("total_amount") or o.get("total") or 0) for o in rep_paid)
        pipe = sum(float(o.get("total_amount") or o.get("total") or 0) for o in rep_orders if o.get("payment_status") not in ("paid", "verified") and o.get("status") not in ("completed", "cancelled", "delivered"))
        rep_comms = [c for c in all_comms if c.get("beneficiary_user_id") == uid]
        commission = sum(c.get("amount", 0) for c in rep_comms)
        rep_ratings = [o["rating"]["stars"] for o in rep_orders if o.get("rating", {}).get("stars")]
        avg_r = round(sum(rep_ratings) / max(len(rep_ratings), 1), 1) if rep_ratings else 0
        team_table.append({"id": uid, "name": name, "deals": deals, "revenue": round(rev, 0), "pipeline": round(pipe, 0), "commission": round(commission, 0), "avg_rating": avg_r, "total_orders": len(rep_orders)})
    team_table.sort(key=lambda x: -x["deals"])

    # Leaderboard
    from routes.sales_dashboard_routes import _build_leaderboard
    leaderboard = await _build_leaderboard(db, now, hide_revenue=False)

    # Conversion trend (6 months)
    conversion_trend = []
    deals_trend = []
    for i in range(5, -1, -1):
        m = now.month - i
        y = now.year
        while m <= 0:
            m += 12
            y -= 1
        ms = datetime(y, m, 1, tzinfo=timezone.utc).isoformat()
        nm = m + 1
        ny = y
        if nm > 12:
            nm = 1
            ny += 1
        me = datetime(ny, nm, 1, tzinfo=timezone.utc).isoformat()
        label = datetime(y, m, 1).strftime("%b %Y")

        m_quotes = sum(1 for q in all_quotes if isinstance(q.get("created_at"), str) and ms <= q["created_at"] < me)
        m_orders = sum(1 for o in paid if isinstance(o.get("created_at"), str) and ms <= o["created_at"] < me)
        m_rate = round((m_orders / max(m_quotes, 1)) * 100, 1) if m_quotes > 0 else 0

        conversion_trend.append({"month": label, "quotes": m_quotes, "orders": m_orders, "rate": m_rate})
        deals_trend.append({"month": label, "deals": m_orders})

    return {
        "kpis": {
            "total_deals": total_deals,
            "total_revenue": round(total_revenue, 0),
            "avg_rating": avg_rating,
            "conversion_rate": conversion_rate,
            "active_reps": len(sales_users),
            "pipeline_value": round(pipeline_value, 0),
        },
        "team_table": team_table,
        "leaderboard": leaderboard,
        "charts": {
            "conversion_trend": conversion_trend,
            "deals_trend": deals_trend,
        },
    }



@router.get("/reports/inventory-intelligence")
async def reports_inventory_intelligence(request: Request, days: int = Query(180)):
    """
    Inventory & Product Intelligence:
    - Fast-moving products (by units sold, revenue, order frequency)
    - Slow/Dead stock classification
    - Product health distribution
    - Procurement insights (restock, review, vendor performance)
    """
    db = request.app.mongodb
    now = datetime.now(timezone.utc)

    # ── Gather all paid orders with items ──
    paid_orders = await db.orders.find(
        {"payment_status": {"$in": ["paid", "verified"]}, "items": {"$exists": True, "$ne": []}},
        {"_id": 0, "items": 1, "created_at": 1}
    ).to_list(10000)

    # All orders (including unpaid) for full timeline
    all_orders_with_items = await db.orders.find(
        {"status": {"$nin": ["cancelled", "draft"]}, "items": {"$exists": True, "$ne": []}},
        {"_id": 0, "items": 1, "created_at": 1}
    ).to_list(10000)

    # ── Build product performance map ──
    product_map = {}  # product_name -> stats

    for order in paid_orders:
        order_date_raw = order.get("created_at", "")
        order_date = order_date_raw.isoformat() if hasattr(order_date_raw, 'isoformat') else str(order_date_raw or "")
        for item in order.get("items", []):
            pname = item.get("product_name") or item.get("name") or "Unknown"
            pid = item.get("product_id", pname)
            qty = int(item.get("quantity", 1))
            revenue = float(item.get("subtotal") or item.get("line_total") or (item.get("unit_price", 0) * qty))

            if pname not in product_map:
                product_map[pname] = {
                    "product_id": pid,
                    "product_name": pname,
                    "units_sold": 0,
                    "revenue": 0,
                    "order_count": 0,
                    "last_sold": "",
                    "first_sold": order_date,
                    "monthly_sales": {},
                }

            pm = product_map[pname]
            pm["units_sold"] += qty
            pm["revenue"] += revenue
            pm["order_count"] += 1
            if isinstance(order_date, str) and order_date > pm["last_sold"]:
                pm["last_sold"] = order_date
            if isinstance(order_date, str) and (not pm["first_sold"] or order_date < pm["first_sold"]):
                pm["first_sold"] = order_date

            # Monthly bucket
            if isinstance(order_date, str) and len(order_date) >= 7:
                month_key = order_date[:7]  # "2026-03"
                pm["monthly_sales"][month_key] = pm["monthly_sales"].get(month_key, 0) + qty

    # ── Also include catalog products with zero sales ──
    all_products = await db.products.find(
        {},
        {"_id": 0, "name": 1, "category": 1, "base_price": 1, "vendor_id": 1, "status": 1}
    ).to_list(500)

    for prod in all_products:
        pname = prod.get("name", "")
        if pname and pname not in product_map:
            product_map[pname] = {
                "product_id": "",
                "product_name": pname,
                "units_sold": 0,
                "revenue": 0,
                "order_count": 0,
                "last_sold": "",
                "first_sold": "",
                "monthly_sales": {},
            }

    # ── Classify products ──
    now_iso = now.isoformat()
    thirty_days_ago = (now - timedelta(days=30)).isoformat()
    sixty_days_ago = (now - timedelta(days=60)).isoformat()

    products_list = []
    classification_counts = {"fast": 0, "moderate": 0, "slow": 0, "dead": 0}

    for pname, pm in product_map.items():
        last_sold = pm["last_sold"]
        units = pm["units_sold"]

        # Determine days_inactive
        if last_sold:
            try:
                from datetime import datetime as dt2
                ls_dt = dt2.fromisoformat(last_sold.replace("Z", "+00:00"))
                days_inactive = (now - ls_dt).days
            except Exception:
                days_inactive = 999
        else:
            days_inactive = 999

        # Classification rules
        if units == 0 or days_inactive >= 60:
            classification = "dead"
        elif days_inactive >= 30:
            classification = "slow"
        elif pm["order_count"] >= 5 or units >= 10:
            classification = "fast"
        else:
            classification = "moderate"

        classification_counts[classification] += 1

        # Sales trend (last 3 months direction)
        months_sorted = sorted(pm["monthly_sales"].keys())
        trend = "stable"
        if len(months_sorted) >= 2:
            last_month_sales = pm["monthly_sales"].get(months_sorted[-1], 0)
            prev_month_sales = pm["monthly_sales"].get(months_sorted[-2], 0)
            if last_month_sales > prev_month_sales * 1.2:
                trend = "increasing"
            elif last_month_sales < prev_month_sales * 0.8:
                trend = "decreasing"

        products_list.append({
            "product_name": pname,
            "units_sold": units,
            "revenue": round(pm["revenue"], 0),
            "order_count": pm["order_count"],
            "last_sold": last_sold[:10] if last_sold else "Never",
            "days_inactive": days_inactive if days_inactive < 999 else None,
            "classification": classification,
            "trend": trend,
        })

    # Sort by units sold descending
    products_list.sort(key=lambda x: -x["units_sold"])

    # ── KPIs ──
    total_products = len(products_list)
    top_product = products_list[0] if products_list else None
    total_units = sum(p["units_sold"] for p in products_list)
    total_product_revenue = sum(p["revenue"] for p in products_list)
    fast_count = classification_counts["fast"]
    slow_count = classification_counts["slow"]
    dead_count = classification_counts["dead"]

    # ── Charts ──
    # Top 10 products by revenue
    top_10_revenue = products_list[:10]

    # Classification distribution
    classification_dist = [
        {"name": "Fast", "value": classification_counts["fast"]},
        {"name": "Moderate", "value": classification_counts["moderate"]},
        {"name": "Slow", "value": classification_counts["slow"]},
        {"name": "Dead", "value": classification_counts["dead"]},
    ]

    # Product sales trend (aggregate monthly)
    monthly_agg = {}
    for pm in product_map.values():
        for mk, qty in pm["monthly_sales"].items():
            monthly_agg[mk] = monthly_agg.get(mk, 0) + qty
    sales_trend = [{"month": k, "units": v} for k, v in sorted(monthly_agg.items())][-6:]

    # ── Procurement Insights ──
    # Restock recommendations: fast + increasing trend
    restock = [p for p in products_list if p["classification"] == "fast" and p["trend"] == "increasing"][:5]

    # Review/Remove: dead stock or consistently slow + decreasing
    review_remove = [p for p in products_list if p["classification"] in ("dead", "slow")][:10]

    # ── Vendor Performance ──
    # Map products to vendors via catalog
    vendor_product_map = {}
    for prod in all_products:
        vid = prod.get("vendor_id")
        if vid:
            if vid not in vendor_product_map:
                vendor_product_map[vid] = []
            vendor_product_map[vid].append(prod.get("name", ""))

    # Vendor stats
    vendor_stats = {}
    for vid, prod_names in vendor_product_map.items():
        vdata = {"vendor_id": vid, "products": len(prod_names), "fast": 0, "slow": 0, "dead": 0, "total_revenue": 0, "total_units": 0}
        for pname in prod_names:
            match = next((p for p in products_list if p["product_name"] == pname), None)
            if match:
                vdata[match["classification"]] = vdata.get(match["classification"], 0) + 1
                vdata["total_revenue"] += match["revenue"]
                vdata["total_units"] += match["units_sold"]
        vendor_stats[vid] = vdata

    # Resolve vendor names
    vendor_ids = list(vendor_stats.keys())
    vendor_users = await db.users.find(
        {"$or": [{"id": {"$in": vendor_ids}}, {"role": {"$in": ["vendor", "partner"]}}]},
        {"_id": 0, "id": 1, "full_name": 1, "email": 1}
    ).to_list(100)
    vendor_name_map = {u.get("id", ""): u.get("full_name", u.get("email", "")) for u in vendor_users}

    top_vendors = []
    weak_vendors = []
    for vid, vs in vendor_stats.items():
        vs["vendor_name"] = vendor_name_map.get(vid, vid[:12])
        vs["total_revenue"] = round(vs["total_revenue"], 0)
        if vs["fast"] > 0 and vs["dead"] == 0:
            top_vendors.append(vs)
        elif vs["dead"] > 0 or (vs["slow"] > vs["fast"]):
            weak_vendors.append(vs)

    top_vendors.sort(key=lambda x: -x["total_revenue"])
    weak_vendors.sort(key=lambda x: -x["dead"])

    return {
        "kpis": {
            "total_products": total_products,
            "total_units_sold": total_units,
            "total_product_revenue": round(total_product_revenue, 0),
            "top_product": top_product["product_name"] if top_product else "—",
            "fast_products": fast_count,
            "slow_products": slow_count,
            "dead_products": dead_count,
        },
        "products": products_list,
        "charts": {
            "top_10_revenue": [{"product": p["product_name"][:20], "revenue": p["revenue"], "units": p["units_sold"]} for p in top_10_revenue],
            "classification_distribution": classification_dist,
            "sales_trend": sales_trend,
        },
        "procurement": {
            "restock_recommendations": restock[:5],
            "review_remove": review_remove[:10],
            "top_vendors": top_vendors[:5],
            "weak_vendors": weak_vendors[:5],
        },
    }





# ─── ACTION ALERTS (extends existing risk/notification infrastructure) ─────────

@router.get("/alerts")
async def get_action_alerts(
    request: Request,
    severity: Optional[str] = Query(None),
    alert_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50),
):
    """
    Unified action alerts with priority scoring.
    Merges discount_risk_alerts + system-generated alerts.
    Supports filtering by severity, type, status.
    """
    db = request.app.mongodb

    # Build query
    query = {}
    if severity:
        query["severity"] = severity
    if alert_type:
        query["alert_type"] = alert_type
    if status:
        query["status"] = status

    alerts = await db.action_alerts.find(query, {"_id": 0}).sort("priority_score", -1).to_list(limit)

    # KPI summary
    all_alerts = await db.action_alerts.find({}, {"_id": 0, "severity": 1, "status": 1}).to_list(1000)
    critical = sum(1 for a in all_alerts if a.get("severity") == "critical" and a.get("status") == "open")
    warning = sum(1 for a in all_alerts if a.get("severity") == "warning" and a.get("status") == "open")
    open_count = sum(1 for a in all_alerts if a.get("status") == "open")
    resolved = sum(1 for a in all_alerts if a.get("status") == "resolved")

    return {
        "kpis": {
            "critical": critical,
            "warning": warning,
            "open": open_count,
            "resolved": resolved,
            "total": len(all_alerts),
        },
        "alerts": alerts,
    }


@router.post("/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: str, request: Request):
    """Mark an alert as resolved."""
    db = request.app.mongodb
    result = await db.action_alerts.update_one(
        {"alert_id": alert_id},
        {"$set": {"status": "resolved", "resolved_at": datetime.now(timezone.utc).isoformat()}},
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"ok": True, "alert_id": alert_id}


@router.post("/alerts/generate")
async def generate_action_alerts(request: Request):
    """
    Auto-generate action alerts from current system state.
    Triggers: low ratings, critical discounts, delayed orders, dead products, underperforming reps.
    """
    db = request.app.mongodb
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()
    alerts_created = 0

    # Helper: create alert if not already open
    async def _create_alert(alert_type, severity, entity_type, entity_id, message, recommended_action, assigned_to="admin"):
        existing = await db.action_alerts.find_one({
            "alert_type": alert_type, "entity_id": entity_id, "status": "open"
        })
        if existing:
            return
        # Priority scoring
        sev_score = {"critical": 100, "warning": 60, "info": 20}.get(severity, 10)
        impact_score = {"rating": 25, "discount": 30, "delay": 20, "product": 15, "performance": 25}.get(alert_type, 10)
        priority_score = sev_score + impact_score

        await db.action_alerts.insert_one({
            "alert_id": f"ALT-{now.strftime('%Y%m%d')}-{str(uuid4())[:6].upper()}",
            "alert_type": alert_type,
            "severity": severity,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "message": message,
            "recommended_action": recommended_action,
            "assigned_to": assigned_to,
            "status": "open",
            "priority_score": priority_score,
            "created_at": now_iso,
            "resolved_at": None,
        })
        nonlocal alerts_created
        alerts_created += 1

    # ── 1. Low Ratings (≤2 stars) ──
    low_rated = await db.orders.find(
        {"rating.stars": {"$lte": 2}},
        {"_id": 0, "order_number": 1, "customer_name": 1, "rating": 1, "assigned_sales_id": 1}
    ).to_list(100)
    sales_map = {}
    sales_users = await db.users.find({"role": {"$in": ["sales", "staff"]}}, {"_id": 0, "id": 1, "full_name": 1}).to_list(100)
    for u in sales_users:
        sales_map[u.get("id", "")] = u.get("full_name", "")

    for o in low_rated:
        rep = sales_map.get(o.get("assigned_sales_id", ""), o.get("assigned_sales_id", "Unknown"))
        await _create_alert(
            "rating", "critical", "order", o.get("order_number", ""),
            f"Low rating ({o['rating']['stars']}★) on Order {o.get('order_number', '')} — Customer: {o.get('customer_name', '')}",
            f"Contact customer within 24h. Review {rep}'s service quality.",
            "sales_manager"
        )

    # ── 2. Critical Discounts ──
    settings_doc = await db.admin_settings.find_one({"type": "discount_governance"}, {"_id": 0})
    critical_threshold = 30
    if settings_doc and settings_doc.get("settings"):
        critical_threshold = settings_doc["settings"].get("critical_threshold", 30)

    crit_discounts = await db.discount_requests.find(
        {"status": "pending", "discount_percent": {"$gte": critical_threshold}},
        {"_id": 0, "id": 1, "discount_percent": 1, "requested_by_name": 1, "customer_name": 1}
    ).to_list(50)
    for d in crit_discounts:
        await _create_alert(
            "discount", "critical", "discount_request", d.get("id", ""),
            f"Critical discount ({d.get('discount_percent', 0)}%) requested by {d.get('requested_by_name', 'Unknown')} for {d.get('customer_name', '')}",
            "Review discount justification. Consider tightening approval thresholds.",
            "admin"
        )

    # ── 3. Delayed Orders ──
    three_days_ago = (now - timedelta(days=3)).isoformat()
    delayed = await db.orders.find(
        {"status": {"$in": ["confirmed", "assigned", "in_production", "in_progress"]},
         "created_at": {"$lt": three_days_ago}},
        {"_id": 0, "order_number": 1, "customer_name": 1, "status": 1, "created_at": 1}
    ).to_list(50)
    for o in delayed:
        created = o.get("created_at", "")
        if isinstance(created, str):
            try:
                days_old = (now - datetime.fromisoformat(created.replace("Z", "+00:00"))).days
            except Exception:
                days_old = 0
        elif hasattr(created, 'isoformat'):
            days_old = (now - created).days
        else:
            days_old = 0
        if days_old >= 3:
            await _create_alert(
                "delay", "warning", "order", o.get("order_number", ""),
                f"Order {o.get('order_number', '')} delayed — {days_old} days in '{o.get('status', '')}' status. Customer: {o.get('customer_name', '')}",
                "Follow up with vendor/production. Notify customer of status.",
                "sales_manager"
            )

    # ── 4. Dead Products ──
    sixty_days_ago = (now - timedelta(days=60)).isoformat()
    all_products = await db.products.find({}, {"_id": 0, "name": 1}).to_list(500)
    paid_orders = await db.orders.find(
        {"payment_status": {"$in": ["paid", "verified"]}, "items": {"$exists": True}},
        {"_id": 0, "items": 1, "created_at": 1}
    ).to_list(10000)

    product_last_sold = {}
    for order in paid_orders:
        ca = order.get("created_at", "")
        ca_str = ca.isoformat() if hasattr(ca, 'isoformat') else str(ca or "")
        for item in order.get("items", []):
            pname = item.get("product_name") or item.get("name") or ""
            if pname and (pname not in product_last_sold or ca_str > product_last_sold[pname]):
                product_last_sold[pname] = ca_str

    for prod in all_products:
        pname = prod.get("name", "")
        last = product_last_sold.get(pname, "")
        if not last or last < sixty_days_ago:
            await _create_alert(
                "product", "warning", "product", pname,
                f"Product '{pname}' is dead stock — no sales in 60+ days",
                "Consider removing from catalog or running a promotion.",
                "admin"
            )

    # ── 5. Underperforming Reps ──
    all_orders = await db.orders.find(
        {"status": {"$nin": ["cancelled", "draft"]}},
        {"_id": 0, "assigned_sales_id": 1, "payment_status": 1, "rating": 1}
    ).to_list(10000)

    for u in sales_users:
        uid = u.get("id", "")
        name = u.get("full_name", "")
        rep_orders = [o for o in all_orders if o.get("assigned_sales_id") == uid]
        rep_paid = [o for o in rep_orders if o.get("payment_status") in ("paid", "verified")]
        rep_ratings = [o["rating"]["stars"] for o in rep_orders if o.get("rating", {}).get("stars")]
        avg_r = sum(rep_ratings) / max(len(rep_ratings), 1) if rep_ratings else 5

        if len(rep_paid) < 3 and len(rep_orders) > 5:
            await _create_alert(
                "performance", "warning", "user", uid,
                f"Rep {name} underperforming — {len(rep_paid)} deals closed from {len(rep_orders)} orders",
                "Schedule coaching session. Review pipeline and conversion.",
                "sales_manager"
            )
        if avg_r < 3 and len(rep_ratings) >= 3:
            await _create_alert(
                "performance", "critical", "user", uid,
                f"Rep {name} has low average rating ({round(avg_r, 1)}★) across {len(rep_ratings)} ratings",
                "Review customer feedback. Assign training or mentoring.",
                "sales_manager"
            )

    return {"ok": True, "alerts_created": alerts_created}


# ─── WEEKLY PERFORMANCE REPORT ─────────────────────────────────────────────────

@router.get("/reports/weekly-performance")
async def reports_weekly_performance(request: Request, weeks_back: int = Query(0)):
    """
    Weekly Performance Report — aggregates all business data for the week.
    weeks_back=0 means current week, 1 means last week, etc.
    """
    db = request.app.mongodb
    now = datetime.now(timezone.utc)

    # Calculate week boundaries
    week_end = now - timedelta(weeks=weeks_back)
    week_start = week_end - timedelta(days=7)
    ws = week_start.isoformat()
    we = week_end.isoformat()

    # ── All orders in window ──
    all_orders = await db.orders.find(
        {"status": {"$nin": ["cancelled", "draft"]}},
        {"_id": 0, "total_amount": 1, "total": 1, "payment_status": 1,
         "status": 1, "created_at": 1, "rating": 1, "customer_name": 1,
         "assigned_sales_id": 1, "order_number": 1, "discount_percent": 1, "items": 1}
    ).to_list(10000)

    def _in_range(ca):
        ca_str = ca.isoformat() if hasattr(ca, 'isoformat') else str(ca or "")
        return ws <= ca_str <= we

    week_orders = [o for o in all_orders if _in_range(o.get("created_at", ""))]
    paid_week = [o for o in week_orders if o.get("payment_status") in ("paid", "verified")]
    paid_all = [o for o in all_orders if o.get("payment_status") in ("paid", "verified")]

    # ── 1. EXECUTIVE SUMMARY KPIs ──
    week_revenue = sum(float(o.get("total_amount") or o.get("total") or 0) for o in paid_week)
    orders_completed = len(paid_week)

    all_comms = await db.commissions.find({}, {"_id": 0, "amount": 1, "created_at": 1}).to_list(5000)
    week_comms = sum(c.get("amount", 0) for c in all_comms if _in_range(c.get("created_at", "")))
    total_rev_all = sum(float(o.get("total_amount") or o.get("total") or 0) for o in paid_all)
    total_comm_all = sum(c.get("amount", 0) for c in all_comms)
    margin_pct = round(((total_rev_all - total_comm_all) / max(total_rev_all, 1)) * 100, 1)

    week_ratings = [o["rating"]["stars"] for o in week_orders if o.get("rating", {}).get("stars")]
    avg_rating = round(sum(week_ratings) / max(len(week_ratings), 1), 1) if week_ratings else 0

    week_discount_val = sum(float(o.get("total_amount") or o.get("total") or 0) * float(o.get("discount_percent", 0)) / 100 for o in week_orders if o.get("discount_percent"))
    net_profit = round(week_revenue - week_comms, 0)

    # ── 2. SALES PERFORMANCE ──
    sales_users = await db.users.find({"role": {"$in": ["sales", "staff"]}}, {"_id": 0, "id": 1, "full_name": 1, "email": 1}).to_list(100)
    sales_map = {u.get("id", ""): u.get("full_name", u.get("email", "")) for u in sales_users}

    rep_stats = []
    for u in sales_users:
        uid = u.get("id", "")
        name = u.get("full_name", u.get("email", ""))
        rep_orders = [o for o in all_orders if o.get("assigned_sales_id") == uid]
        rep_paid = [o for o in rep_orders if o.get("payment_status") in ("paid", "verified")]
        deals = len(rep_paid)
        rev = sum(float(o.get("total_amount") or o.get("total") or 0) for o in rep_paid)
        rep_r = [o["rating"]["stars"] for o in rep_orders if o.get("rating", {}).get("stars")]
        avg_r = round(sum(rep_r) / max(len(rep_r), 1), 1) if rep_r else 0
        rep_c = sum(c.get("amount", 0) for c in all_comms if c.get("beneficiary_user_id") == uid) if hasattr(all_comms[0], 'get') else 0 if not all_comms else 0
        rep_stats.append({"name": name, "deals": deals, "revenue": round(rev, 0), "avg_rating": avg_r, "commission": round(rep_c if isinstance(rep_c, (int, float)) else 0, 0)})

    rep_stats.sort(key=lambda x: -x["deals"])
    top_performers = rep_stats[:3]
    under_performers = [r for r in rep_stats if r["deals"] < 5 or r["avg_rating"] < 3][:3]

    # Team metrics
    total_deals = sum(r["deals"] for r in rep_stats)
    pipeline_orders = [o for o in all_orders if o.get("payment_status") not in ("paid", "verified") and o.get("status") not in ("completed", "cancelled", "delivered")]
    pipeline_value = sum(float(o.get("total_amount") or o.get("total") or 0) for o in pipeline_orders)
    all_quotes = await db.quotes.find({}, {"_id": 0, "status": 1}).to_list(5000)
    converted = sum(1 for q in all_quotes if q.get("status") in ("accepted", "converted", "ordered"))
    conversion_rate = round((converted / max(len(all_quotes), 1)) * 100, 1)

    # ── 3. RISK & ALERTS ──
    open_alerts = await db.action_alerts.find(
        {"status": "open"},
        {"_id": 0}
    ).sort("priority_score", -1).to_list(5)

    # ── 4. FINANCIAL SUMMARY ──
    collected_result = await db.payment_proofs.aggregate([
        {"$match": {"status": "approved"}},
        {"$group": {"_id": None, "total": {"$sum": {"$toDouble": {"$ifNull": ["$amount", 0]}}}}},
    ]).to_list(1)
    collected = collected_result[0]["total"] if collected_result else total_rev_all

    pending_count = await db.payment_proofs.count_documents({"status": {"$in": ["uploaded", "submitted", "pending", "pending_verification"]}})

    outstanding_result = await db.invoices.aggregate([
        {"$match": {"status": {"$in": ["pending_payment", "sent", "under_review"]}}},
        {"$group": {"_id": None, "total": {"$sum": {"$toDouble": {"$ifNull": ["$total", 0]}}}}},
    ]).to_list(1)
    outstanding = outstanding_result[0]["total"] if outstanding_result else 0

    commission_payable_result = await db.commissions.aggregate([
        {"$match": {"status": {"$in": ["approved", "pending", "expected"]}}},
        {"$group": {"_id": None, "total": {"$sum": {"$toDouble": {"$ifNull": ["$amount", 0]}}}}},
    ]).to_list(1)
    commission_payable = commission_payable_result[0]["total"] if commission_payable_result else 0

    # ── 5. CUSTOMER EXPERIENCE ──
    all_ratings = [o["rating"]["stars"] for o in all_orders if o.get("rating", {}).get("stars")]
    overall_avg = round(sum(all_ratings) / max(len(all_ratings), 1), 1) if all_ratings else 0
    from collections import Counter
    rating_dist = Counter(all_ratings)
    rating_distribution = [{"stars": s, "count": rating_dist.get(s, 0)} for s in range(5, 0, -1)]

    positive_feedback = []
    negative_feedback = []
    for o in all_orders:
        r = o.get("rating", {})
        if r.get("stars") and r.get("comment"):
            entry = {"order": o.get("order_number", ""), "customer": o.get("customer_name", ""), "stars": r["stars"], "comment": r["comment"]}
            if r["stars"] >= 4:
                positive_feedback.append(entry)
            elif r["stars"] <= 2:
                negative_feedback.append(entry)

    # ── 6. PRODUCT INTELLIGENCE ──
    product_units = {}
    for o in paid_all:
        for item in o.get("items", []):
            pname = item.get("product_name") or item.get("name") or ""
            if pname:
                product_units[pname] = product_units.get(pname, 0) + int(item.get("quantity", 1))

    top_products = sorted(product_units.items(), key=lambda x: -x[1])[:5]
    top_products_list = [{"name": p, "units": u} for p, u in top_products]

    # Dead products
    sixty_ago = (now - timedelta(days=60)).isoformat()
    product_last = {}
    for o in paid_all:
        ca = o.get("created_at", "")
        ca_str = ca.isoformat() if hasattr(ca, 'isoformat') else str(ca or "")
        for item in o.get("items", []):
            pname = item.get("product_name") or item.get("name") or ""
            if pname and (pname not in product_last or ca_str > product_last[pname]):
                product_last[pname] = ca_str

    all_prods = await db.products.find({}, {"_id": 0, "name": 1}).to_list(500)
    dead_products = []
    for p in all_prods:
        pn = p.get("name", "")
        last = product_last.get(pn, "")
        if not last or last < sixty_ago:
            dead_products.append({"name": pn, "last_sold": last[:10] if last else "Never"})

    # ── 7. PROCUREMENT INSIGHTS ──
    restock = [{"name": p, "units": u} for p, u in top_products[:3]]
    remove = dead_products[:5]

    # ── 8. COACHING SUMMARY ──
    # Build a team_table compatible format for the coaching engine
    coaching_team_table = []
    for u in sales_users:
        uid = u.get("id", "")
        name = u.get("full_name", u.get("email", ""))
        rep_orders_c = [o for o in all_orders if o.get("assigned_sales_id") == uid]
        rep_paid_c = [o for o in rep_orders_c if o.get("payment_status") in ("paid", "verified")]
        rep_r_c = [o["rating"]["stars"] for o in rep_orders_c if o.get("rating", {}).get("stars")]
        avg_r_c = round(sum(rep_r_c) / max(len(rep_r_c), 1), 1) if rep_r_c else 0
        pipeline_c = sum(float(o.get("total_amount") or o.get("total") or 0) for o in rep_orders_c if o.get("payment_status") not in ("paid", "verified") and o.get("status") not in ("completed", "cancelled", "delivered"))
        coaching_team_table.append({
            "id": uid, "name": name, "deals": len(rep_paid_c),
            "revenue": round(sum(float(o.get("total_amount") or o.get("total") or 0) for o in rep_paid_c), 0),
            "pipeline": round(pipeline_c, 0), "avg_rating": avg_r_c,
            "total_ratings": len(rep_r_c), "total_orders": len(rep_orders_c),
        })

    from services.coaching_engine import generate_coaching_insights, get_coaching_summary_for_report
    coaching_insights = await generate_coaching_insights(db, coaching_team_table, all_orders, sales_map)
    coaching_summary = get_coaching_summary_for_report(coaching_insights)

    # ── 9. ACTION RECOMMENDATIONS ──
    actions = []
    for a in open_alerts:
        actions.append({"message": a.get("recommended_action", ""), "source": a.get("alert_type", ""), "severity": a.get("severity", "info")})
    if not actions:
        actions.append({"message": "All systems healthy — no urgent actions required.", "source": "system", "severity": "info"})

    return {
        "period": {
            "start": week_start.strftime("%d %b %Y"),
            "end": week_end.strftime("%d %b %Y"),
            "weeks_back": weeks_back,
        },
        "executive_summary": {
            "revenue": round(week_revenue, 0),
            "orders_completed": orders_completed,
            "margin_pct": margin_pct,
            "avg_rating": avg_rating,
            "discounts_given": round(week_discount_val, 0),
            "net_profit": net_profit,
        },
        "sales_performance": {
            "top_performers": top_performers,
            "under_performers": under_performers,
            "total_deals": total_deals,
            "pipeline_value": round(pipeline_value, 0),
            "conversion_rate": conversion_rate,
        },
        "risk_alerts": open_alerts,
        "financial_summary": {
            "collected": round(collected, 0),
            "pending_payments": pending_count,
            "outstanding": round(outstanding, 0),
            "commission_payable": round(commission_payable, 0),
        },
        "customer_experience": {
            "avg_rating": overall_avg,
            "rating_distribution": rating_distribution,
            "positive_feedback": positive_feedback[:3],
            "negative_feedback": negative_feedback[:3],
        },
        "product_intelligence": {
            "top_products": top_products_list,
            "dead_products": dead_products[:5],
        },
        "procurement": {
            "restock": restock,
            "remove": remove,
        },
        "action_recommendations": actions,
        "coaching_summary": coaching_summary,
    }


# ─── PAYMENTS ─────────────────────────────────────────────────────────────────

@router.get("/payments/stats")
async def payments_stats(request: Request):
    """Payment queue stat cards."""
    db = request.app.mongodb
    total = await db.payment_proofs.count_documents({})
    pending = await db.payment_proofs.count_documents({"status": {"$in": ["uploaded", "submitted", "pending"]}})
    approved = await db.payment_proofs.count_documents({"status": "approved"})
    rejected = await db.payment_proofs.count_documents({"status": "rejected"})
    return {"total": total, "pending": pending, "approved": approved, "rejected": rejected}

@router.get("/payments/queue")
async def payments_queue(request: Request, search: Optional[str] = Query(default=None), status: Optional[str] = Query(default=None)):
    service = LiveCommerceService(request.app.mongodb)
    all_proofs = await service.finance_queue(customer_query=search, status_filter=status if status and status != "all" else None)
    return all_proofs

@router.get("/payments/{payment_proof_id}")
async def payment_detail(payment_proof_id: str, request: Request):
    db = request.app.mongodb
    proof = await db.payment_proofs.find_one({"id": payment_proof_id})
    if not proof:
        raise HTTPException(status_code=404, detail="Payment proof not found")
    payment = await db.payments.find_one({"id": proof.get("payment_id")})
    invoice = await db.invoices.find_one({"id": proof.get("invoice_id")})

    # Enrich with customer contact details
    cust_id = proof.get("customer_id") or (invoice or {}).get("customer_id") or (invoice or {}).get("user_id")
    customer_contact = {}
    if cust_id:
        cust_user = await db.users.find_one(
            {"$or": [{"id": cust_id}, {"email": proof.get("customer_email")}]},
            {"_id": 0, "full_name": 1, "email": 1, "phone": 1, "company_name": 1}
        )
        if cust_user:
            customer_contact = {
                "full_name": cust_user.get("full_name", ""),
                "email": cust_user.get("email", ""),
                "phone": cust_user.get("phone", ""),
                "company_name": cust_user.get("company_name", ""),
            }

    # Fetch approval history from audit_logs
    approval_history = []
    logs = await db.audit_logs.find({"target_id": payment_proof_id}).sort("created_at", 1).to_list(20)
    for log in logs:
        approval_history.append({
            "action": log.get("action", ""),
            "actor_role": log.get("actor_role", ""),
            "details": log.get("details", {}),
            "created_at": str(log.get("created_at", "")),
        })

    return {
        "proof": _clean(proof),
        "payment": _clean(payment),
        "invoice": _clean(invoice),
        "customer_contact": customer_contact,
        "approval_history": approval_history,
    }

@router.post("/payments/{payment_proof_id}/approve")
async def approve_payment(payment_proof_id: str, payload: dict, request: Request):
    db = request.app.mongodb
    # Resolve real admin identity from Authorization header
    approver_name = payload.get("approver_role", "admin")
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            import jwt as pyjwt
            token_payload = pyjwt.decode(auth_header.split(" ", 1)[1], os.getenv("JWT_SECRET", "konekt-secret"), algorithms=["HS256"])
            admin_user = await db.users.find_one({"id": token_payload.get("user_id")}, {"_id": 0, "full_name": 1, "email": 1, "id": 1})
            if admin_user:
                approver_name = admin_user.get("full_name") or admin_user.get("email") or admin_user.get("id") or approver_name
        except Exception:
            pass

    service = LiveCommerceService(db)
    result = await service.approve_payment_proof(
        payment_proof_id=payment_proof_id,
        approver_role=approver_name,
        assigned_sales_id=payload.get("assigned_sales_id"),
        assigned_sales_name=payload.get("assigned_sales_name"),
    )
    # Write audit log
    await request.app.mongodb.audit_logs.insert_one({
        "id": str(uuid4()),
        "action": "payment_approved",
        "target_id": payment_proof_id,
        "actor_role": payload.get("approver_role", "admin"),
        "details": {"fully_paid": result.get("fully_paid"), "order_created": bool(result.get("order"))},
        "created_at": _now(),
    })
    return result

@router.post("/payments/{payment_proof_id}/reject")
async def reject_payment(payment_proof_id: str, payload: dict, request: Request):
    reason = payload.get("reason", "")
    if not reason.strip():
        raise HTTPException(status_code=400, detail="Rejection reason is required")
    service = LiveCommerceService(request.app.mongodb)
    result = await service.reject_payment_proof(
        payment_proof_id=payment_proof_id,
        approver_role=payload.get("approver_role", "admin"),
        reason=reason,
    )
    await request.app.mongodb.audit_logs.insert_one({
        "id": str(uuid4()),
        "action": "payment_rejected",
        "target_id": payment_proof_id,
        "actor_role": payload.get("approver_role", "admin"),
        "details": {"reason": reason},
        "created_at": _now(),
    })
    return result

# ─── INVOICES ─────────────────────────────────────────────────────────────────

@router.get("/invoices/list")
async def invoices_list(request: Request, search: Optional[str] = Query(default=None), status: Optional[str] = Query(default=None)):
    db = request.app.mongodb
    query = {}
    if status:
        query["$or"] = [{"status": status}, {"payment_status": status}]
    rows = await db.invoices.find(query).sort("created_at", -1).to_list(length=500)
    out = []
    for raw_inv in rows:
        oid_str = str(raw_inv["_id"]) if "_id" in raw_inv else None
        inv = _clean(raw_inv)
        if search:
            haystack = f"{inv.get('invoice_number','')} {inv.get('customer_name','')} {inv.get('customer_email','')}".lower()
            if search.lower() not in haystack:
                continue
        # Try proof lookup by UUID id first, then by ObjectId string
        inv_id = inv.get("id")
        proof = None
        if inv_id:
            proof = await db.payment_proofs.find_one({"invoice_id": inv_id}, sort=[("created_at", -1)])
        if not proof and oid_str:
            proof = await db.payment_proofs.find_one({"invoice_id": oid_str}, sort=[("created_at", -1)])
        if proof:
            proof = _clean(proof)
        inv["rejection_reason"] = (proof or {}).get("rejection_reason", "") if (proof or {}).get("status") == "rejected" else ""
        inv["source_type"] = "Quote" if inv.get("quote_id") else "Cart"
        # Payer name priority: invoice.payer_name → proof.payer_name (NEVER customer_name)
        payer = inv.get("payer_name") or ""
        if not payer and proof:
            payer = (proof or {}).get("payer_name") or ""
        inv["payer_name"] = payer or "-"
        # Enrich customer_name from users collection if missing
        if not inv.get("customer_name") or inv.get("customer_name") == "-":
            cid = inv.get("customer_id") or inv.get("user_id") or inv.get("customer_user_id")
            if cid:
                cust = await db.users.find_one({"id": cid}, {"_id": 0, "full_name": 1})
                if cust and cust.get("full_name"):
                    inv["customer_name"] = cust["full_name"]
        # Payment status (use payment_status first, fallback to status)
        inv["payment_state"] = inv.get("payment_status") or inv.get("status") or "draft"
        # Invoice status
        inv["invoice_status"] = inv.get("status") or "draft"
        # Linked ref (quote or order short ref)
        linked_ref = "-"
        if inv.get("quote_id"):
            q = await db.quotes.find_one({"id": inv["quote_id"]}, {"_id": 0, "quote_number": 1})
            linked_ref = (q or {}).get("quote_number", inv["quote_id"][:12])
        elif inv.get("order_id"):
            o = await db.orders.find_one({"id": inv["order_id"]}, {"_id": 0, "order_number": 1})
            linked_ref = (o or {}).get("order_number", inv["order_id"][:12])
        inv["linked_ref"] = linked_ref
        out.append(inv)
    return out

@router.get("/invoices/stats")
async def invoices_stats_facade(request: Request):
    """Invoice stat cards."""
    db = request.app.mongodb
    total = await db.invoices.count_documents({})
    draft = await db.invoices.count_documents({"status": "draft"})
    sent = await db.invoices.count_documents({"status": {"$in": ["sent", "issued"]}})
    paid = await db.invoices.count_documents({"status": "paid"})
    overdue = await db.invoices.count_documents({"status": "overdue"})
    unpaid = await db.invoices.count_documents({"status": {"$in": ["unpaid", "pending", "partially_paid"]}})
    return {"total": total, "draft": draft, "sent": sent, "paid": paid, "overdue": overdue, "unpaid": unpaid}

@router.get("/invoices/{invoice_id}")
async def invoice_detail(invoice_id: str, request: Request):
    db = request.app.mongodb
    from bson import ObjectId as _OID
    invoice = None
    try:
        invoice = await db.invoices.find_one({"_id": _OID(invoice_id)})
    except Exception:
        pass
    if not invoice:
        invoice = await db.invoices.find_one({"id": invoice_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return _clean(invoice)

# ─── ORDERS ───────────────────────────────────────────────────────────────────

@router.get("/orders/list")
async def orders_list(request: Request, search: Optional[str] = Query(default=None), status: Optional[str] = Query(default=None), tab: Optional[str] = Query(default=None)):
    db = request.app.mongodb
    query = {}
    if status:
        query["status"] = status
    if tab == "assigned":
        query["status"] = {"$in": ["assigned", "ready_to_fulfill", "processing"]}
    elif tab == "in_progress":
        query["status"] = {"$in": ["in_progress", "work_scheduled"]}
    elif tab == "completed":
        query["status"] = {"$in": ["completed", "delivered", "fulfilled"]}
    elif tab == "new":
        query["status"] = {"$in": ["new", "pending"]}

    rows = await db.orders.find(query).sort("created_at", -1).to_list(length=500)
    out = []
    for order in rows:
        order = _clean(order)
        if search:
            haystack = f"{order.get('order_number','')} {order.get('customer_name','')}".lower()
            if search.lower() not in haystack:
                continue
        # Vendor info
        vendor_orders = await db.vendor_orders.find({"order_id": order.get("id")}).to_list(20)
        order["vendor_count"] = len(vendor_orders)
        vendor_name = "-"
        if vendor_orders:
            vid = vendor_orders[0].get("vendor_id")
            if vid:
                vp = await db.partner_users.find_one({"partner_id": vid}, {"_id": 0, "name": 1, "company_name": 1})
                if vp:
                    vendor_name = vp.get("company_name") or vp.get("name") or vid[:12]
                else:
                    vendor_name = vid[:12]
        order["vendor_name"] = vendor_name
        # Sales assignment
        assignment = await db.sales_assignments.find_one({"order_id": order.get("id")})
        order["sales_owner"] = (assignment or {}).get("sales_owner_name", "Unassigned")
        # Payment status
        order["payment_state"] = order.get("payment_status") or "paid"
        order["fulfillment_state"] = order.get("status") or "new"
        # Enrich customer_name from users collection if missing
        if not order.get("customer_name") or order.get("customer_name") == "-":
            cid = order.get("customer_id") or order.get("user_id")
            if cid:
                cust = await db.users.find_one({"id": cid}, {"_id": 0, "full_name": 1})
                if cust and cust.get("full_name"):
                    order["customer_name"] = cust["full_name"]
        out.append(order)
    return out

@router.get("/orders/{order_id}")
async def order_detail(order_id: str, request: Request):
    from bson import ObjectId
    db = request.app.mongodb
    order = await db.orders.find_one({"id": order_id})
    if not order:
        try:
            order = await db.orders.find_one({"_id": ObjectId(order_id)})
        except:
            pass
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order = _clean(order)

    # Invoice
    invoice = await db.invoices.find_one({"id": order.get("invoice_id")})
    invoice = _clean(invoice)

    # Vendor orders with vendor names
    raw_vendor_orders = await db.vendor_orders.find({"order_id": order_id}).to_list(50)
    vendor_orders = []
    for vo in raw_vendor_orders:
        vo = _clean(vo)
        vid = vo.get("vendor_id", "")
        vp = await db.partner_users.find_one({"partner_id": vid}, {"_id": 0, "name": 1, "company_name": 1, "phone": 1, "email": 1})
        vo["vendor_name"] = (vp or {}).get("company_name") or (vp or {}).get("name") or vid[:12]
        vo["vendor_phone"] = (vp or {}).get("phone", "")
        vo["vendor_email"] = (vp or {}).get("email", "")
        vendor_orders.append(vo)

    # Sales assignment
    assignment = await db.sales_assignments.find_one({"order_id": order_id})
    assignment = _clean(assignment)
    sales_user = None
    sales_id = (assignment or {}).get("sales_owner_id") or order.get("assigned_sales_id")
    if sales_id:
        sales_user = await db.users.find_one({"id": sales_id}, {"_id": 0, "full_name": 1, "phone": 1, "email": 1})

    # Customer info
    cust_id = order.get("customer_id") or order.get("user_id")
    customer = None
    if cust_id:
        customer = await db.users.find_one({"id": cust_id}, {"_id": 0, "full_name": 1, "email": 1, "phone": 1})

    # Events / timeline
    events = [_clean(e) for e in await db.order_events.find({"order_id": order_id}).sort("created_at", 1).to_list(100)]

    # Commissions
    commissions = [_clean(c) for c in await db.commissions.find({"order_id": order_id}).to_list(50)]

    # Quote link
    quote = None
    quote_id = order.get("quote_id")
    if quote_id:
        quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0, "id": 1, "quote_number": 1})

    # Payment proof info — resolve payer_name from proof collection first
    payment_proof = None
    if invoice:
        inv_id = invoice.get("id")
        payer = invoice.get("payer_name") or ""
        if not payer and inv_id:
            pp = await db.payment_proofs.find_one(
                {"invoice_id": inv_id},
                {"_id": 0, "payer_name": 1, "customer_name": 1},
                sort=[("created_at", -1)]
            )
            if pp:
                payer = pp.get("payer_name") or pp.get("customer_name") or ""
        if not payer:
            payer = (invoice.get("billing") or {}).get("invoice_client_name") or invoice.get("customer_name") or "-"
        payment_proof = {
            "payer_name": payer,
            "approved_by": invoice.get("approved_by") or "-",
            "approved_at": invoice.get("approved_at") or invoice.get("paid_at") or "-",
            "payment_status": invoice.get("payment_status") or invoice.get("status") or "-",
        }

    return {
        "order": order,
        "invoice": invoice,
        "vendor_orders": vendor_orders,
        "sales_assignment": assignment,
        "sales_user": sales_user,
        "customer": customer,
        "events": events,
        "commissions": commissions,
        "quote": quote,
        "payment_proof": payment_proof,
    }

@router.post("/orders/{order_id}/release-to-vendor")
async def release_to_vendor(order_id: str, payload: dict, request: Request):
    db = request.app.mongodb
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    await db.orders.update_one({"id": order_id}, {"$set": {"release_state": "manual", "release_type": "manual", "released_at": _now(), "released_by": payload.get("released_by", "admin")}})
    await db.vendor_orders.update_many({"order_id": order_id}, {"$set": {"status": "ready_to_fulfill", "released_at": _now()}})
    await db.audit_logs.insert_one({"id": str(uuid4()), "action": "manual_release_to_vendor", "target_id": order_id, "actor_role": payload.get("released_by", "admin"), "created_at": _now()})
    return {"ok": True}

@router.post("/orders/{order_id}/update-status")
async def update_order_status(order_id: str, payload: dict, request: Request):
    db = request.app.mongodb
    new_status = payload.get("status")
    if not new_status:
        raise HTTPException(status_code=400, detail="status is required")
    await db.orders.update_one({"id": order_id}, {"$set": {"status": new_status, "current_status": new_status, "updated_at": _now()}})
    await db.order_events.insert_one({"id": str(uuid4()), "order_id": order_id, "event": f"status_changed_to_{new_status}", "created_at": _now()})
    return {"ok": True}

# ─── QUOTES ───────────────────────────────────────────────────────────────────

@router.get("/quotes/list")
async def quotes_list(request: Request, search: Optional[str] = Query(default=None), status: Optional[str] = Query(default=None)):
    db = request.app.mongodb
    query = {}
    if status:
        query["status"] = status
    rows = await db.quotes.find(query).sort("created_at", -1).to_list(length=500)
    # Also include leads/service_requests as "requests"
    leads = await db.leads.find({}).sort("created_at", -1).to_list(length=200)
    service_reqs = await db.service_requests.find({}).sort("created_at", -1).to_list(length=200)

    out = []
    for q in rows:
        q = _clean(q)
        if search:
            haystack = f"{q.get('quote_number','')} {q.get('customer_name','')}".lower()
            if search.lower() not in haystack:
                continue
        q["record_type"] = "quote"
        assignment = await db.sales_assignments.find_one({"invoice_id": q.get("invoice_id")})
        q["assigned_sales"] = (assignment or {}).get("sales_owner_name", "Unassigned")
        out.append(q)

    for lead in leads:
        lead = _clean(lead)
        if search:
            haystack = f"{lead.get('id','')} {lead.get('customer_id','')}".lower()
            if search.lower() not in haystack:
                continue
        if status and lead.get("status") != status:
            continue
        lead["record_type"] = lead.get("type", "request")
        lead["quote_number"] = lead.get("id", "")[:12]
        lead["customer_name"] = lead.get("customer_id", "")
        lead["total_amount"] = 0
        lead["assigned_sales"] = "Unassigned"
        out.append(lead)

    for sr in service_reqs:
        sr = _clean(sr)
        if search:
            haystack = f"{sr.get('id','')} {sr.get('customer_name','')}".lower()
            if search.lower() not in haystack:
                continue
        if status and sr.get("status") != status:
            continue
        sr["record_type"] = "service_request"
        sr["quote_number"] = sr.get("request_number", sr.get("id", "")[:12])
        sr["total_amount"] = sr.get("estimated_amount", 0)
        sr["assigned_sales"] = sr.get("assigned_to", "Unassigned")
        out.append(sr)

    out.sort(key=lambda x: str(x.get("created_at", "")), reverse=True)
    return out


# ─── SALES CRM ────────────────────────────────────────────────────────────────

@router.get("/sales-crm/leads")
async def sales_crm_leads(request: Request, search: Optional[str] = Query(default=None), status: Optional[str] = Query(default=None)):
    db = request.app.mongodb
    query = {}
    if status:
        query["status"] = status
    leads = await db.leads.find(query).sort("created_at", -1).to_list(length=500)
    service_reqs = await db.service_requests.find(query if status else {}).sort("created_at", -1).to_list(length=500)
    out = []
    for lead in leads:
        lead = _clean(lead)
        if search:
            haystack = f"{lead.get('customer_name','')} {lead.get('customer_id','')} {lead.get('id','')}".lower()
            if search.lower() not in haystack:
                continue
        lead["record_type"] = lead.get("type", "lead")
        out.append(lead)
    for sr in service_reqs:
        sr = _clean(sr)
        if search:
            haystack = f"{sr.get('customer_name','')} {sr.get('id','')}".lower()
            if search.lower() not in haystack:
                continue
        sr["record_type"] = "service_request"
        sr["customer_name"] = sr.get("customer_name", sr.get("customer_id", ""))
        out.append(sr)
    out.sort(key=lambda x: str(x.get("created_at", "")), reverse=True)
    return out

@router.get("/sales-crm/accounts")
async def sales_crm_accounts(request: Request, search: Optional[str] = Query(default=None)):
    db = request.app.mongodb
    users = await db.users.find({"role": {"$in": ["customer", "user"]}}).sort("created_at", -1).to_list(500)
    out = []
    for u in users:
        u = _clean(u)
        if search:
            haystack = f"{u.get('full_name','')} {u.get('email','')} {u.get('company','')}".lower()
            if search.lower() not in haystack:
                continue
        order_count = await db.orders.count_documents({"customer_email": u.get("email")})
        assignment = await db.sales_assignments.find_one({"customer_email": u.get("email")})
        u["total_orders"] = order_count
        u["assigned_sales"] = (assignment or {}).get("sales_owner_name", "Unassigned")
        out.append(u)
    return out

@router.get("/sales-crm/performance")
async def sales_crm_performance(request: Request):
    db = request.app.mongodb
    assignments = await db.sales_assignments.find({}).to_list(500)
    sales_map = {}
    for a in assignments:
        name = a.get("sales_owner_name", "Unknown")
        if name not in sales_map:
            sales_map[name] = {"name": name, "leads": 0, "orders": 0, "revenue": 0}
        if a.get("order_id"):
            sales_map[name]["orders"] += 1
        else:
            sales_map[name]["leads"] += 1
    return list(sales_map.values())

@router.post("/sales-crm/assign-lead")
async def assign_lead(payload: dict, request: Request):
    db = request.app.mongodb
    lead_id = payload.get("lead_id")
    sales_name = payload.get("sales_name", "")
    if not lead_id:
        raise HTTPException(status_code=400, detail="lead_id required")
    await db.leads.update_one({"id": lead_id}, {"$set": {"assigned_to": sales_name, "updated_at": _now()}})
    await db.sales_assignments.update_one(
        {"lead_id": lead_id},
        {"$set": {"lead_id": lead_id, "sales_owner_name": sales_name, "updated_at": _now()}},
        upsert=True,
    )
    return {"ok": True}

@router.post("/sales-crm/update-lead-status")
async def update_lead_status_facade(payload: dict, request: Request):
    db = request.app.mongodb
    lead_id = payload.get("lead_id")
    new_status = payload.get("status")
    if not lead_id or not new_status:
        raise HTTPException(status_code=400, detail="lead_id and status required")
    result = await db.leads.update_one({"id": lead_id}, {"$set": {"status": new_status, "updated_at": _now()}})
    if result.matched_count == 0:
        await db.service_requests.update_one({"id": lead_id}, {"$set": {"status": new_status, "updated_at": _now()}})
    return {"ok": True}

# ─── CUSTOMERS ────────────────────────────────────────────────────────────────

@router.get("/customers/list")
async def customers_list(request: Request, search: Optional[str] = Query(default=None), ctype: Optional[str] = Query(default=None)):
    db = request.app.mongodb
    query = {"role": {"$in": ["customer", "user"]}}
    rows = await db.users.find(query).sort("created_at", -1).to_list(500)
    out = []
    for u in rows:
        u = _clean(u)
        if search:
            haystack = f"{u.get('full_name','')} {u.get('email','')} {u.get('company','')}".lower()
            if search.lower() not in haystack:
                continue
        if ctype and u.get("customer_type") != ctype:
            continue
        order_count = await db.orders.count_documents({"customer_email": u.get("email")})
        u["total_orders"] = order_count
        referral = await db.referral_codes.find_one({"user_email": u.get("email")})
        u["referral_code"] = (referral or {}).get("code", "")
        assignment = await db.sales_assignments.find_one({"customer_email": u.get("email")})
        u["assigned_sales"] = (assignment or {}).get("sales_owner_name", "Unassigned")
        out.append(u)
    return out

@router.get("/customers/detail/{customer_id}")
async def customer_detail_facade(customer_id: str, request: Request):
    db = request.app.mongodb
    user = await db.users.find_one({"id": customer_id})
    if not user:
        user = await db.users.find_one({"email": customer_id})
    if not user:
        raise HTTPException(status_code=404, detail="Customer not found")
    user = _clean(user)
    orders = [_clean(o) for o in await db.orders.find({"customer_email": user.get("email")}).sort("created_at", -1).to_list(20)]
    invoices = [_clean(i) for i in await db.invoices.find({"customer_email": user.get("email")}).sort("created_at", -1).to_list(20)]
    return {"customer": user, "orders": orders, "invoices": invoices}

@router.post("/customers/{customer_id}/assign-sales")
async def assign_sales_to_customer(customer_id: str, payload: dict, request: Request):
    db = request.app.mongodb
    sales_name = payload.get("sales_name", "")
    user = await db.users.find_one({"id": customer_id})
    if not user:
        raise HTTPException(status_code=404, detail="Customer not found")
    await db.sales_assignments.update_one(
        {"customer_email": user.get("email")},
        {"$set": {"customer_email": user.get("email"), "sales_owner_name": sales_name, "updated_at": _now()}},
        upsert=True,
    )
    return {"ok": True}

# ─── VENDORS ──────────────────────────────────────────────────────────────────

@router.get("/vendors/list")
async def vendors_list(request: Request, search: Optional[str] = Query(default=None)):
    db = request.app.mongodb
    partners = await db.partners.find({}).sort("created_at", -1).to_list(500)
    out = []
    for p in partners:
        p = _clean(p)
        if not p.get("id"):
            p["id"] = p.get("email", "")
        if search:
            haystack = f"{p.get('company_name','')} {p.get('name','')} {p.get('email','')}".lower()
            if search.lower() not in haystack:
                continue
        vendor_key = p.get("email") or p.get("id")
        active_orders = await db.vendor_orders.count_documents({"vendor_id": vendor_key, "status": {"$nin": ["completed", "cancelled"]}})
        released = await db.vendor_orders.count_documents({"vendor_id": vendor_key, "status": "ready_to_fulfill"})
        p["active_orders"] = active_orders
        p["released_jobs"] = released
        out.append(p)
    return out

@router.get("/vendors/{vendor_id}")
async def vendor_detail(vendor_id: str, request: Request):
    db = request.app.mongodb
    partner = await db.partners.find_one({"id": vendor_id})
    if not partner:
        partner = await db.partners.find_one({"email": vendor_id})
    if not partner:
        raise HTTPException(status_code=404, detail="Vendor not found")
    vendor_key = partner.get("email") or partner.get("id") or vendor_id
    orders = [_clean(o) for o in await db.vendor_orders.find({"vendor_id": vendor_key}).sort("created_at", -1).to_list(50)]
    return {"vendor": _clean(partner), "orders": orders}

@router.post("/vendors/{vendor_id}/toggle-status")
async def toggle_vendor_status(vendor_id: str, request: Request):
    db = request.app.mongodb
    partner = await db.partners.find_one({"id": vendor_id})
    if not partner:
        partner = await db.partners.find_one({"email": vendor_id})
    if not partner:
        raise HTTPException(status_code=404, detail="Vendor not found")
    new_status = "inactive" if partner.get("status") == "active" else "active"
    query = {"email": partner.get("email")} if partner.get("email") else {"id": vendor_id}
    await db.partners.update_one(query, {"$set": {"status": new_status, "updated_at": _now()}})
    return {"ok": True, "new_status": new_status}

# ─── AFFILIATES & REFERRALS ──────────────────────────────────────────────────

@router.get("/affiliates/list")
async def affiliates_list_facade(request: Request, search: Optional[str] = Query(default=None)):
    db = request.app.mongodb
    rows = await db.affiliates.find({}).sort("created_at", -1).to_list(500)
    out = []
    for a in rows:
        a = _clean(a)
        if search:
            haystack = f"{a.get('name','')} {a.get('email','')} {a.get('code','')}".lower()
            if search.lower() not in haystack:
                continue
        out.append(a)
    return out

@router.get("/referrals/list")
async def referrals_list(request: Request):
    db = request.app.mongodb
    events = await db.referral_events.find({}).sort("created_at", -1).to_list(500)
    codes = await db.referral_codes.find({}).to_list(500)
    return {"events": [_clean(e) for e in events], "codes": [_clean(c) for c in codes]}

@router.get("/commissions/list")
async def commissions_list_facade(request: Request, search: Optional[str] = Query(default=None), status: Optional[str] = Query(default=None)):
    db = request.app.mongodb
    query = {}
    if status:
        query["status"] = status
    rows = await db.commissions.find(query).sort("created_at", -1).to_list(500)
    out = []
    for c in rows:
        c = _clean(c)
        if search:
            haystack = f"{c.get('recipient_name','')} {c.get('order_id','')}".lower()
            if search.lower() not in haystack:
                continue
        out.append(c)
    return out

@router.get("/payouts/list")
async def payouts_list(request: Request):
    db = request.app.mongodb
    rows = await db.payouts.find({}).sort("created_at", -1).to_list(500)
    return [_clean(p) for p in rows]

@router.post("/affiliates/{affiliate_id}/toggle-status")
async def toggle_affiliate_status(affiliate_id: str, request: Request):
    db = request.app.mongodb
    aff = await db.affiliates.find_one({"id": affiliate_id})
    if not aff:
        raise HTTPException(status_code=404, detail="Affiliate not found")
    new_status = "inactive" if aff.get("status") == "active" else "active"
    await db.affiliates.update_one({"id": affiliate_id}, {"$set": {"status": new_status, "updated_at": _now()}})
    return {"ok": True, "new_status": new_status}

@router.post("/payouts/{payout_id}/approve")
async def approve_payout(payout_id: str, request: Request):
    db = request.app.mongodb
    await db.payouts.update_one({"id": payout_id}, {"$set": {"status": "approved", "approved_at": _now()}})
    return {"ok": True}

# ─── CATALOG ──────────────────────────────────────────────────────────────────

@router.get("/catalog/products")
async def catalog_products(request: Request, search: Optional[str] = Query(default=None)):
    db = request.app.mongodb
    rows = await db.products.find({}).sort("created_at", -1).to_list(500)
    out = []
    for p in rows:
        p = _clean(p)
        if search:
            haystack = f"{p.get('name','')} {p.get('sku','')} {p.get('title','')}".lower()
            if search.lower() not in haystack:
                continue
        out.append(p)
    return out

@router.get("/catalog/services")
async def catalog_services(request: Request):
    db = request.app.mongodb
    rows = await db.service_catalog.find({}).sort("created_at", -1).to_list(500)
    return [_clean(s) for s in rows]

@router.get("/catalog/groups")
async def catalog_groups(request: Request):
    db = request.app.mongodb
    groups = await db.service_groups.find({}).to_list(200)
    return [_clean(g) for g in groups]

@router.get("/catalog/promo-items")
async def catalog_promo_items(request: Request):
    db = request.app.mongodb
    rows = await db.products.find({"category": {"$in": ["promotional", "promo"]}}).to_list(500)
    if not rows:
        rows = await db.products.find({"is_promotional": True}).to_list(500)
    return [_clean(p) for p in rows]

@router.get("/vendor-assignment/suggest")
async def suggest_vendor_assignment(
    request: Request,
    capabilities: Optional[str] = Query(default=None),
    limit: int = Query(default=5, ge=1, le=20),
):
    """Return ranked vendor candidates based on capabilities, availability, and workload."""
    from services.vendor_assignment_engine import get_vendor_candidates
    db = request.app.mongodb
    cap_list = [c.strip() for c in capabilities.split(",")] if capabilities else []
    candidates = await get_vendor_candidates(db, cap_list, limit)
    return {"candidates": candidates}


# ─── SETTINGS ─────────────────────────────────────────────────────────────────

@router.get("/settings/business-profile")
async def get_business_profile(request: Request):
    db = request.app.mongodb
    settings = await db.business_settings.find_one({"type": "company_profile"})
    if not settings:
        settings = await db.company_settings.find_one({})
    return _clean(settings) or {"country": "TZ", "currency": "TZS", "company_name": "Konekt"}

@router.post("/settings/business-profile")
async def update_business_profile(payload: dict, request: Request):
    db = request.app.mongodb
    payload["updated_at"] = _now()
    await db.business_settings.update_one({"type": "company_profile"}, {"$set": payload}, upsert=True)
    return {"ok": True}

@router.get("/settings/commercial-rules")
async def get_commercial_rules(request: Request):
    db = request.app.mongodb
    rules = await db.business_settings.find_one({"type": "commercial_rules"})
    return _clean(rules) or {"quote_validity_days": 30, "auto_release_on_payment": True}

@router.post("/settings/commercial-rules")
async def update_commercial_rules(payload: dict, request: Request):
    db = request.app.mongodb
    payload["type"] = "commercial_rules"
    payload["updated_at"] = _now()
    await db.business_settings.update_one({"type": "commercial_rules"}, {"$set": payload}, upsert=True)
    return {"ok": True}

@router.get("/settings/affiliate-defaults")
async def get_affiliate_defaults(request: Request):
    db = request.app.mongodb
    defaults = await db.business_settings.find_one({"type": "affiliate_defaults"})
    return _clean(defaults) or {"enabled": True, "default_commission_rate": 5, "referral_rewards": True}

@router.post("/settings/affiliate-defaults")
async def update_affiliate_defaults(payload: dict, request: Request):
    db = request.app.mongodb
    payload["type"] = "affiliate_defaults"
    payload["updated_at"] = _now()
    await db.business_settings.update_one({"type": "affiliate_defaults"}, {"$set": payload}, upsert=True)
    return {"ok": True}

@router.get("/settings/notifications")
async def get_notification_settings(request: Request):
    db = request.app.mongodb
    settings = await db.business_settings.find_one({"type": "notification_settings"})
    return _clean(settings) or {"email_on_payment": True, "email_on_order": True, "whatsapp_enabled": False}

@router.post("/settings/notifications")
async def update_notification_settings(payload: dict, request: Request):
    db = request.app.mongodb
    payload["type"] = "notification_settings"
    payload["updated_at"] = _now()
    await db.business_settings.update_one({"type": "notification_settings"}, {"$set": payload}, upsert=True)
    return {"ok": True}

# ─── USERS & ROLES ────────────────────────────────────────────────────────────

@router.get("/users/list")
async def users_list_facade(request: Request, search: Optional[str] = Query(default=None), role: Optional[str] = Query(default=None)):
    db = request.app.mongodb
    query = {}
    if role:
        query["role"] = role
    rows = await db.admin_users.find(query).sort("created_at", -1).to_list(500)
    if not rows:
        rows = await db.users.find(query).sort("created_at", -1).to_list(500)
    out = []
    for u in rows:
        u = _clean(u)
        if search:
            haystack = f"{u.get('full_name','')} {u.get('email','')} {u.get('role','')}".lower()
            if search.lower() not in haystack:
                continue
        out.append(u)
    return out

@router.post("/users/{user_id}/assign-role")
async def assign_role(user_id: str, payload: dict, request: Request):
    db = request.app.mongodb
    new_role = payload.get("role")
    if not new_role:
        raise HTTPException(status_code=400, detail="role required")
    result = await db.admin_users.update_one({"id": user_id}, {"$set": {"role": new_role, "updated_at": _now()}})
    if result.matched_count == 0:
        await db.users.update_one({"id": user_id}, {"$set": {"role": new_role, "updated_at": _now()}})
    await db.audit_logs.insert_one({"id": str(uuid4()), "action": "role_assigned", "target_id": user_id, "details": {"new_role": new_role}, "created_at": _now()})
    return {"ok": True}

@router.post("/users/{user_id}/toggle-status")
async def toggle_user_status(user_id: str, request: Request):
    db = request.app.mongodb
    user = await db.admin_users.find_one({"id": user_id})
    coll = "admin_users"
    if not user:
        user = await db.users.find_one({"id": user_id})
        coll = "users"
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    new_status = "inactive" if user.get("status", "active") == "active" else "active"
    await db[coll].update_one({"id": user_id}, {"$set": {"status": new_status, "updated_at": _now()}})
    return {"ok": True, "new_status": new_status}

# ─── AUDIT LOGS ───────────────────────────────────────────────────────────────

@router.get("/audit/list")
async def audit_list(request: Request, search: Optional[str] = Query(default=None), action: Optional[str] = Query(default=None)):
    db = request.app.mongodb
    query = {}
    if action:
        query["action"] = action
    rows = await db.audit_logs.find(query).sort("created_at", -1).to_list(500)
    out = []
    for r in rows:
        r = _clean(r)
        if search:
            haystack = f"{r.get('action','')} {r.get('target_id','')} {r.get('actor_role','')}".lower()
            if search.lower() not in haystack:
                continue
        out.append(r)
    return out

@router.get("/audit/actions")
async def audit_actions(request: Request):
    db = request.app.mongodb
    actions = await db.audit_logs.distinct("action")
    return actions
