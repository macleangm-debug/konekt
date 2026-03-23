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
    """Get customer dashboard metrics - quotes, orders, invoices counts and recent activity"""
    db = request.app.mongodb
    
    # Build filters based on user_id if provided
    quote_filter = {"customer_id": user_id} if user_id else {}
    order_filter = {"customer_id": user_id} if user_id else {}
    invoice_filter = {"customer_id": user_id} if user_id else {}

    # Count documents
    quote_count = await db.quotes.count_documents(quote_filter)
    quote_count_v2 = await db.quotes_v2.count_documents(quote_filter)
    order_count = await db.orders.count_documents(order_filter)
    invoice_count = await db.invoices.count_documents(invoice_filter)
    
    # Get recent orders for activity feed
    recent_orders = await db.orders.find(order_filter).sort("created_at", -1).limit(5).to_list(length=5)
    
    # Calculate pending amounts
    pending_invoices = await db.invoices.find({**invoice_filter, "status": {"$in": ["pending", "unpaid"]}}).to_list(length=1000)
    pending_amount = sum(float(x.get("total") or x.get("total_amount", 0) or 0) for x in pending_invoices)

    return {
        "quotes_count": quote_count + quote_count_v2,
        "orders_count": order_count,
        "invoices_count": invoice_count,
        "pending_amount": pending_amount,
        "recent_activity": [
            {
                "id": str(item.get("_id", "")),
                "title": item.get("title") or item.get("order_number") or f"Order #{str(item.get('_id', ''))[:8]}",
                "status": item.get("status", "pending"),
                "time": str(item.get("created_at", "")),
                "type": "order"
            } for item in recent_orders
        ],
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
