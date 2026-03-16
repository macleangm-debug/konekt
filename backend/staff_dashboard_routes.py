"""
Staff Dashboard Routes
Role-based workspace homepage data
"""
from datetime import datetime, timezone
import os
from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/staff-dashboard", tags=["Staff Dashboard"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


@router.get("/me")
async def get_staff_dashboard(user_email: str = None, user_role: str = None):
    """
    Get staff dashboard data based on role.
    In production, this would use auth middleware to get user from token.
    For now, accepts query params for testing.
    """
    # For authenticated requests, we'd get this from the token
    # This is a simplified version that works with or without auth
    
    if not user_email:
        # Try to get a default admin for demo purposes
        admin_user = await db.users.find_one({"role": "admin"}, {"_id": 0})
        if admin_user:
            user_email = admin_user.get("email")
            user_role = admin_user.get("role", "sales")
        else:
            user_email = "staff@konekt.co.tz"
            user_role = "sales"
    
    user = await db.users.find_one({"email": user_email}, {"_id": 0, "password_hash": 0})
    if not user:
        user = {"email": user_email, "role": user_role or "sales", "full_name": "Staff User"}
    
    role = user.get("role", "sales")
    email = user.get("email")
    team = user.get("team")

    result = {
        "role": role,
        "full_name": user.get("full_name"),
        "email": email,
        "team": team,
        "cards": [],
        "quick_actions": [],
    }

    if role in ["sales", "admin", "super_admin"]:
        my_leads = await db.crm_leads.count_documents({"assigned_to": email}) if role == "sales" else await db.crm_leads.count_documents({})
        my_quotes = await db.quotes_v2.count_documents({"assigned_to": email}) if role == "sales" else await db.quotes_v2.count_documents({})
        my_tasks = await db.tasks.count_documents({"assigned_to": email, "status": {"$ne": "done"}}) if role == "sales" else await db.tasks.count_documents({"status": {"$ne": "done"}})

        result["cards"] = [
            {"label": "My Leads" if role == "sales" else "All Leads", "value": my_leads, "href": "/admin/crm"},
            {"label": "My Quotes" if role == "sales" else "All Quotes", "value": my_quotes, "href": "/admin/quotes"},
            {"label": "Open Tasks", "value": my_tasks, "href": "/admin/tasks"},
        ]
        
        result["quick_actions"] = [
            {"label": "New Lead", "href": "/admin/crm"},
            {"label": "New Quote", "href": "/admin/quotes"},
        ]

    if role == "production":
        my_tasks = await db.tasks.count_documents({"assigned_to": email, "status": {"$ne": "done"}})
        pending_orders = await db.orders.count_documents({"status": {"$in": ["pending", "in_production"]}})

        result["cards"] = [
            {"label": "My Open Tasks", "value": my_tasks, "href": "/admin/tasks"},
            {"label": "Pending Orders", "value": pending_orders, "href": "/admin/orders"},
        ]

    if role == "finance":
        pending_payments = await db.payments.count_documents({"status": {"$in": ["pending", "payment_submitted"]}})
        unpaid_invoices = await db.invoices_v2.count_documents({"status": {"$nin": ["paid", "cancelled"]}})

        result["cards"] = [
            {"label": "Pending Payments", "value": pending_payments, "href": "/admin/central-payments"},
            {"label": "Unpaid Invoices", "value": unpaid_invoices, "href": "/admin/invoices"},
        ]

    if role == "marketing":
        active_campaigns = await db.affiliate_campaigns.count_documents({"is_active": True})
        pending_apps = await db.affiliate_applications.count_documents({"status": "pending"})

        result["cards"] = [
            {"label": "Active Campaigns", "value": active_campaigns, "href": "/admin/affiliate-campaigns"},
            {"label": "Affiliate Applications", "value": pending_apps, "href": "/admin/affiliate-applications"},
        ]

    if role == "support":
        open_requests = await db.service_requests.count_documents({"status": {"$nin": ["completed", "cancelled"]}})
        my_tasks = await db.tasks.count_documents({"assigned_to": email, "status": {"$ne": "done"}})

        result["cards"] = [
            {"label": "Open Service Requests", "value": open_requests, "href": "/admin/service-requests"},
            {"label": "My Tasks", "value": my_tasks, "href": "/admin/tasks"},
        ]

    if role == "supervisor":
        team_leads = await db.crm_leads.count_documents({"team": team}) if team else 0
        team_tasks = await db.tasks.count_documents({"team": team, "status": {"$ne": "done"}}) if team else 0
        now = datetime.now(timezone.utc)
        overdue_tasks = await db.tasks.count_documents({
            "status": {"$ne": "done"},
            "due_date": {"$lt": now.isoformat()},
        })

        result["cards"] = [
            {"label": "Team Leads", "value": team_leads, "href": "/admin/crm"},
            {"label": "Team Open Tasks", "value": team_tasks, "href": "/admin/tasks"},
            {"label": "Overdue Tasks", "value": overdue_tasks, "href": "/admin/tasks"},
        ]

    # For admin/super_admin, add global stats
    if role in ["admin", "super_admin"]:
        all_leads = await db.crm_leads.count_documents({})
        all_tasks = await db.tasks.count_documents({"status": {"$ne": "done"}})
        all_orders = await db.orders.count_documents({})
        all_requests = await db.service_requests.count_documents({"status": {"$nin": ["completed", "cancelled"]}})

        result["cards"] = [
            {"label": "All Leads", "value": all_leads, "href": "/admin/crm"},
            {"label": "All Open Tasks", "value": all_tasks, "href": "/admin/tasks"},
            {"label": "All Orders", "value": all_orders, "href": "/admin/orders"},
            {"label": "Open Service Requests", "value": all_requests, "href": "/admin/service-requests"},
        ]

    return result
