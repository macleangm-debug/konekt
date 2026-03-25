"""
Super Admin Ecosystem Dashboard Routes
Provides one-screen visibility across revenue, partners, affiliates, countries, and operations.
"""
import os
from datetime import datetime, timedelta
from fastapi import APIRouter
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/ecosystem-dashboard", tags=["Ecosystem Dashboard"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


def serialize_doc(doc):
    if doc is None:
        return None
    if "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc


@router.get("/overview")
async def ecosystem_overview():
    """Get top-level ecosystem metrics."""
    # Revenue from invoices
    total_revenue = 0
    async for row in db.invoices.aggregate([
        {"$match": {"status": {"$in": ["sent", "paid", "part_paid"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}},
    ]):
        total_revenue = row.get("total", 0)

    # Counts
    total_orders = await db.orders.count_documents({})
    total_service_requests = await db.service_requests.count_documents({})
    active_partners = await db.partners.count_documents({"status": "active"})
    active_affiliates = await db.affiliates.count_documents({"status": "active"})
    active_contract_clients = await db.contract_clients.count_documents({"is_active": True})
    
    # Country counts
    live_countries = await db.country_launch_configs.count_documents({"status": "live"})

    # Operational health
    delayed_jobs = await db.partner_assignments.count_documents({"current_progress_code": "delayed"})
    issue_jobs = await db.partner_assignments.count_documents({"current_progress_code": "issue_reported"})
    
    stale_cutoff = datetime.utcnow() - timedelta(days=2)
    stale_jobs = await db.partner_assignments.count_documents({
        "updated_at": {"$lt": stale_cutoff},
        "current_progress_code": {"$nin": ["completed", "cancelled"]},
    })

    # Payment proofs pending
    pending_payment_proofs = await db.payment_proof_submissions.count_documents({"status": "pending"})

    # Quote conversion
    total_quotes = await db.quotes.count_documents({})
    approved_quotes = await db.quotes.count_documents({"status": {"$in": ["approved", "invoiced", "completed"]}})
    quote_conversion_rate = round((approved_quotes / total_quotes) * 100, 1) if total_quotes > 0 else 0

    return {
        "total_revenue": total_revenue,
        "total_orders": total_orders,
        "total_service_requests": total_service_requests,
        "active_partners": active_partners,
        "active_affiliates": active_affiliates,
        "active_contract_clients": active_contract_clients,
        "live_countries": live_countries,
        "delayed_jobs": delayed_jobs,
        "issue_jobs": issue_jobs,
        "stale_jobs": stale_jobs,
        "pending_payment_proofs": pending_payment_proofs,
        "total_quotes": total_quotes,
        "approved_quotes": approved_quotes,
        "quote_conversion_rate": quote_conversion_rate,
    }


@router.get("/partner-summary")
async def ecosystem_partner_summary():
    """Get top partners ranked by performance."""
    partners = await db.partners.find({}).to_list(length=300)
    rows = []

    for partner in partners:
        partner_id = str(partner["_id"])
        assigned = await db.partner_assignments.count_documents({"partner_id": partner_id})
        completed = await db.partner_assignments.count_documents({
            "partner_id": partner_id,
            "current_progress_code": "completed",
        })
        delayed = await db.partner_assignments.count_documents({
            "partner_id": partner_id,
            "current_progress_code": "delayed",
        })
        active_queue = await db.partner_assignments.count_documents({
            "partner_id": partner_id,
            "current_progress_code": {
                "$in": ["assigned", "accepted", "production_started", "ready_for_dispatch", 
                        "site_visit_scheduled", "on_site", "installation_started"]
            },
        })

        completion_rate = round((completed / assigned) * 100, 2) if assigned else 0

        rows.append({
            "partner_id": partner_id,
            "partner_name": partner.get("name"),
            "partner_type": partner.get("partner_type", "general"),
            "status": partner.get("status", "active"),
            "country_code": partner.get("country_code", "TZ"),
            "assigned": assigned,
            "completed": completed,
            "delayed": delayed,
            "active_queue": active_queue,
            "completion_rate": completion_rate,
        })

    rows.sort(key=lambda x: (x["completion_rate"], -x["assigned"]), reverse=True)
    return rows[:20]


@router.get("/affiliate-summary")
async def ecosystem_affiliate_summary():
    """Get top affiliates by sales volume."""
    affiliates = await db.affiliates.find({"status": "active"}).to_list(length=300)
    rows = []

    for aff in affiliates:
        code = aff.get("affiliate_code")
        commissions = await db.affiliate_commissions.find({
            "affiliate_code": code
        }).to_list(length=500)

        total_sales = sum(float(x.get("sale_value", 0) or 0) for x in commissions)
        total_commission = sum(float(x.get("commission", 0) or 0) for x in commissions)
        pending = sum(float(x.get("commission", 0) or 0) for x in commissions if x.get("status") == "pending")
        paid = sum(float(x.get("commission", 0) or 0) for x in commissions if x.get("status") == "paid")

        rows.append({
            "affiliate_code": code,
            "name": aff.get("name"),
            "email": aff.get("email"),
            "total_sales": total_sales,
            "total_commission": total_commission,
            "pending_commission": pending,
            "paid_commission": paid,
            "order_count": len(commissions),
        })

    rows.sort(key=lambda x: x["total_sales"], reverse=True)
    return rows[:20]


@router.get("/country-summary")
async def ecosystem_country_summary():
    """Get country expansion and coverage status."""
    # Default countries if no config exists
    default_countries = [
        {"country_code": "TZ", "country_name": "Tanzania", "status": "live", "currency": "TZS"},
        {"country_code": "KE", "country_name": "Kenya", "status": "coming_soon", "currency": "KES"},
        {"country_code": "UG", "country_name": "Uganda", "status": "coming_soon", "currency": "UGX"},
        {"country_code": "RW", "country_name": "Rwanda", "status": "coming_soon", "currency": "RWF"},
        {"country_code": "GH", "country_name": "Ghana", "status": "coming_soon", "currency": "GHS"},
        {"country_code": "NG", "country_name": "Nigeria", "status": "coming_soon", "currency": "NGN"},
        {"country_code": "ZA", "country_name": "South Africa", "status": "coming_soon", "currency": "ZAR"},
    ]

    docs = await db.country_launch_configs.find({}).to_list(length=200)
    if not docs:
        docs = default_countries

    rows = []
    for doc in docs:
        country_code = doc.get("country_code")

        partner_count = await db.partner_capabilities.count_documents({"country_code": country_code})
        delivery_partners = await db.delivery_partners.count_documents({"country_code": country_code})
        service_requests = await db.service_requests.count_documents({"country_code": country_code})
        orders = await db.orders.count_documents({"country_code": country_code})
        
        waitlist = await db.country_waitlist_requests.count_documents({"country_code": country_code})
        applications = await db.country_partner_applications.count_documents({"country_code": country_code})

        rows.append({
            "country_code": country_code,
            "country_name": doc.get("country_name"),
            "status": doc.get("status", "coming_soon"),
            "currency": doc.get("currency"),
            "partner_count": partner_count,
            "delivery_partner_count": delivery_partners,
            "service_requests": service_requests,
            "orders": orders,
            "waitlist_count": waitlist,
            "partner_applications": applications,
        })

    return rows


@router.get("/at-risk-items")
async def ecosystem_at_risk_items():
    """Get items needing immediate attention."""
    # Delayed jobs
    delayed_jobs = await db.partner_assignments.find({
        "current_progress_code": "delayed"
    }).to_list(length=20)

    # Issue jobs
    issue_jobs = await db.partner_assignments.find({
        "current_progress_code": "issue_reported"
    }).to_list(length=20)

    # Overdue invoices (30+ days)
    overdue_cutoff = datetime.utcnow() - timedelta(days=30)
    overdue_invoices = await db.invoices.find({
        "status": {"$in": ["sent", "part_paid"]},
        "created_at": {"$lt": overdue_cutoff},
    }).to_list(length=20)

    # Stale quotes (14+ days without follow-up)
    stale_cutoff = datetime.utcnow() - timedelta(days=14)
    stale_quotes = await db.quotes.find({
        "status": {"$in": ["draft", "sent"]},
        "updated_at": {"$lt": stale_cutoff},
    }).to_list(length=20)

    return {
        "delayed_jobs": [serialize_doc(d) for d in delayed_jobs],
        "issue_jobs": [serialize_doc(d) for d in issue_jobs],
        "overdue_invoices": [serialize_doc(d) for d in overdue_invoices],
        "stale_quotes": [serialize_doc(d) for d in stale_quotes],
    }

