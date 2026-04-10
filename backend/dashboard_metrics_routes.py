from datetime import datetime, timezone
from fastapi import APIRouter, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import os

router = APIRouter(prefix="/api/dashboard-metrics", tags=["Dashboard Metrics"])

JWT_SECRET = os.environ.get('JWT_SECRET', 'konekt-secret-key-2024')
JWT_ALGORITHM = "HS256"
security = HTTPBearer(auto_error=False)

async def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except:
        return None

@router.get("/customer")
async def customer_dashboard_metrics(request: Request, user_id: str | None = None):
    """Get customer dashboard metrics — Active orders, invoices, referral wallet, reminders."""
    db = request.app.mongodb
    now = datetime.now(timezone.utc)
    
    quote_filter = {"customer_id": user_id} if user_id else {}
    order_filter = {"customer_id": user_id} if user_id else {}
    invoice_filter = {"customer_id": user_id} if user_id else {}

    # ── Top KPIs ──
    order_count = await db.orders.count_documents(order_filter)
    active_orders = await db.orders.count_documents({**order_filter, "status": {"$nin": ["delivered", "completed", "cancelled"]}})

    pending_invoices = await db.invoices.find({**invoice_filter, "status": {"$in": ["pending", "unpaid", "sent"]}}).to_list(length=1000)
    pending_invoice_count = len(pending_invoices)
    pending_amount = sum(float(x.get("total") or x.get("total_amount", 0) or 0) for x in pending_invoices)

    # Referral wallet — use credit_balance from users collection + referral_transactions
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0, "credit_balance": 1, "referral_code": 1})
    referral_balance = float((user_doc or {}).get("credit_balance", 0))
    user_referral_code = (user_doc or {}).get("referral_code", "")

    # Calculate total earned from referral transactions
    referral_txns = await db.referral_transactions.find(
        {"referrer_id": user_id, "status": "credited"}
    ).to_list(length=500)
    referral_total_earned = sum(float(t.get("reward_amount", 0)) for t in referral_txns)

    # Fallback to old referral_wallets if exists
    if referral_balance == 0 and not user_referral_code:
        referral_old = await db.referral_wallets.find_one({"user_id": user_id}, {"_id": 0})
        if referral_old:
            referral_balance = float(referral_old.get("balance", 0))
            user_referral_code = referral_old.get("referral_code", "")
            referral_total_earned = float(referral_old.get("total_earned", 0))

    quote_count = await db.quotes.count_documents(quote_filter) + await db.quotes_v2.count_documents(quote_filter)
    pending_quotes = await db.quotes.count_documents({**quote_filter, "status": {"$in": ["pending", "sent"]}})

    # ── Active orders for display ──
    active_order_docs = await db.orders.find(
        {**order_filter, "status": {"$nin": ["delivered", "completed", "cancelled"]}},
        {"_id": 0, "id": 1, "order_number": 1, "status": 1, "total": 1, "customer_status": 1, "created_at": 1}
    ).sort("created_at", -1).limit(5).to_list(length=5)
    
    # Map to customer-safe statuses
    from services.status_propagation_service import map_status_for_role
    for o in active_order_docs:
        o["customer_status"] = map_status_for_role(o.get("status", ""), "customer")

    # ── Reminders ──
    reminders = []
    proofs_needed = await db.invoices.count_documents({**invoice_filter, "status": {"$in": ["unpaid", "sent"]}, "payment_proof_id": {"$exists": False}})
    if proofs_needed:
        reminders.append({"type": "payment_proof", "message": f"{proofs_needed} invoice(s) need payment proof", "cta": "Upload Payment", "url": "/account/invoices"})
    if pending_quotes:
        reminders.append({"type": "quote_review", "message": f"{pending_quotes} quote(s) awaiting your review", "cta": "Review Quotes", "url": "/account/quotes"})
    
    # ── Order trend (last 6 months) ──
    from datetime import timedelta
    order_trend = []
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
        cnt = await db.orders.count_documents({**order_filter, "created_at": {"$gte": m_start, "$lt": m_end}})
        order_trend.append({"month": datetime(y, m, 1).strftime("%b"), "orders": cnt})

    # ── Spend trend (last 6 months) ──
    spend_trend = []
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
        pipeline = [
            {"$match": {**order_filter, "created_at": {"$gte": m_start, "$lt": m_end}}},
            {"$group": {"_id": None, "total": {"$sum": {"$toDouble": {"$ifNull": ["$total", 0]}}}}},
        ]
        r = await db.orders.aggregate(pipeline).to_list(length=1)
        spend_trend.append({"month": datetime(y, m, 1).strftime("%b"), "spend": r[0]["total"] if r else 0})

    return {
        "kpis": {
            "active_orders": active_orders,
            "pending_invoices": pending_invoice_count,
            "referral_balance": referral_balance,
            "total_orders": order_count,
            "total_quotes": quote_count,
            "pending_quotes": pending_quotes,
            "pending_amount": pending_amount,
        },
        "active_orders": active_order_docs,
        "reminders": reminders,
        "referral": {
            "balance": referral_balance,
            "code": user_referral_code,
            "total_earned": referral_total_earned,
        },
        "charts": {
            "order_trend": order_trend,
            "spend_trend": spend_trend,
        },
    }

@router.get("/sales")
async def sales_dashboard_metrics(request: Request, user_id: str | None = None):
    """Get sales team dashboard metrics"""
    db = request.app.mongodb
    
    lead_filter = {"assigned_to": user_id} if user_id else {}
    quote_filter = {"sales_owner_id": user_id} if user_id else {}
    
    # Count leads needing action
    leads_new = await db.leads.count_documents({**lead_filter, "status": "new"})
    leads_contacted = await db.leads.count_documents({**lead_filter, "status": "contacted"})
    
    # Count quotes by status
    quotes_pending = await db.quotes.count_documents({**quote_filter, "status": "pending"})
    quotes_pending_v2 = await db.quotes_v2.count_documents({**quote_filter, "status": "pending"})
    quotes_approved = await db.quotes.count_documents({**quote_filter, "status": "approved"})
    quotes_approved_v2 = await db.quotes_v2.count_documents({**quote_filter, "status": "approved"})
    
    # Count sales assist requests
    assist_pending = await db.sales_assist_requests.count_documents({"status": "pending"})
    
    # Get recent quotes
    recent_quotes = await db.quotes.find(quote_filter).sort("created_at", -1).limit(5).to_list(length=5)
    
    return {
        "leads_needing_action": leads_new + leads_contacted,
        "leads_new": leads_new,
        "leads_contacted": leads_contacted,
        "quotes_pending": quotes_pending + quotes_pending_v2,
        "deals_ready_to_close": quotes_approved + quotes_approved_v2,
        "assist_requests_pending": assist_pending,
        "recent_quotes": [
            {
                "id": str(q.get("_id", "")),
                "quote_number": q.get("quote_number", ""),
                "customer_name": q.get("customer_name", ""),
                "total": q.get("total") or q.get("total_amount", 0),
                "status": q.get("status", "pending"),
                "created_at": str(q.get("created_at", "")),
            } for q in recent_quotes
        ],
    }

@router.get("/admin")
async def admin_dashboard_metrics(request: Request):
    """Get admin dashboard metrics - revenue, orders pipeline, partners, affiliates"""
    db = request.app.mongodb
    
    # Orders pipeline
    orders_pending = await db.orders.count_documents({"status": "pending"})
    orders_in_progress = await db.orders.count_documents({"status": {"$in": ["in_progress", "processing"]}})
    orders_completed = await db.orders.count_documents({"status": {"$in": ["completed", "delivered"]}})
    orders_total = await db.orders.count_documents({})
    
    # Partners and affiliates
    active_partners = await db.partners.count_documents({"status": "active"})
    total_partners = await db.partners.count_documents({})
    active_affiliates = await db.affiliates.count_documents({"status": "active"})
    total_affiliates = await db.affiliates.count_documents({})
    
    # Revenue from paid invoices
    paid_invoices = await db.invoices.find({"status": "paid"}).to_list(length=10000)
    revenue = sum(float(x.get("total") or x.get("total_amount", 0) or 0) for x in paid_invoices)
    
    # Pending revenue
    pending_invoices = await db.invoices.find({"status": {"$in": ["pending", "unpaid"]}}).to_list(length=10000)
    pending_revenue = sum(float(x.get("total") or x.get("total_amount", 0) or 0) for x in pending_invoices)
    
    # Quote metrics
    quotes_total = await db.quotes.count_documents({}) + await db.quotes_v2.count_documents({})
    quotes_pending = await db.quotes.count_documents({"status": "pending"}) + await db.quotes_v2.count_documents({"status": "pending"})
    
    # User counts
    customers_total = await db.users.count_documents({"role": {"$in": ["customer", "user", None]}})
    
    return {
        "revenue": revenue,
        "pending_revenue": pending_revenue,
        "orders_pending": orders_pending,
        "orders_in_progress": orders_in_progress,
        "orders_completed": orders_completed,
        "orders_total": orders_total,
        "active_partners": active_partners,
        "total_partners": total_partners,
        "active_affiliates": active_affiliates,
        "total_affiliates": total_affiliates,
        "quotes_total": quotes_total,
        "quotes_pending": quotes_pending,
        "customers_total": customers_total,
    }

@router.get("/affiliate")
async def affiliate_dashboard_metrics(request: Request, affiliate_id: str | None = None):
    """Get affiliate dashboard metrics - earnings, clicks, conversions"""
    db = request.app.mongodb
    
    filt = {"affiliate_id": affiliate_id} if affiliate_id else {}
    
    # Get commissions
    commissions = await db.commissions.find(filt).to_list(length=10000)
    total_earnings = sum(float(x.get("amount", 0) or 0) for x in commissions)
    pending_earnings = sum(float(x.get("amount", 0) or 0) for x in commissions if x.get("status") == "pending")
    paid_earnings = sum(float(x.get("amount", 0) or 0) for x in commissions if x.get("status") == "paid")
    
    # Get clicks if collection exists
    try:
        clicks = await db.affiliate_clicks.count_documents(filt)
    except:
        clicks = 0
    
    # Count conversions
    conversions = len([x for x in commissions if x.get("status") in ["earned", "approved", "payable", "paid"]])
    
    # Get referrals
    referrals = await db.referrals.find(filt).to_list(length=100) if hasattr(db, "referrals") else []
    
    return {
        "total_earnings": total_earnings,
        "pending_earnings": pending_earnings,
        "paid_earnings": paid_earnings,
        "clicks": clicks,
        "conversions": conversions,
        "referrals_count": len(referrals),
    }

@router.get("/partner")
async def partner_dashboard_metrics(request: Request, partner_id: str | None = None):
    """Get partner dashboard metrics - jobs, deadlines, earnings"""
    db = request.app.mongodb
    
    filt = {"partner_id": partner_id} if partner_id else {}
    
    # Job counts
    assigned = await db.orders.count_documents(filt)
    in_progress = await db.orders.count_documents({**filt, "status": {"$in": ["in_progress", "processing"]}})
    completed = await db.orders.count_documents({**filt, "status": {"$in": ["completed", "delivered"]}})
    delayed = await db.orders.count_documents({**filt, "status": "delayed"})
    
    # Get payouts
    payouts = await db.partner_payouts.find(filt).to_list(length=1000) if hasattr(db, "partner_payouts") else []
    total_earnings = sum(float(x.get("amount", 0) or 0) for x in payouts)
    pending_payouts = sum(float(x.get("amount", 0) or 0) for x in payouts if x.get("status") == "pending")
    
    # Get upcoming deadlines
    upcoming_orders = await db.orders.find({**filt, "status": {"$in": ["pending", "in_progress"]}}).sort("due_date", 1).limit(5).to_list(length=5)
    
    return {
        "assigned_jobs": assigned,
        "in_progress_jobs": in_progress,
        "completed_jobs": completed,
        "delayed_jobs": delayed,
        "total_earnings": total_earnings,
        "pending_payouts": pending_payouts,
        "upcoming_deadlines": [
            {
                "id": str(o.get("_id", "")),
                "title": o.get("title") or o.get("order_number", ""),
                "due_date": str(o.get("due_date", "")),
                "status": o.get("status", ""),
            } for o in upcoming_orders
        ],
    }
