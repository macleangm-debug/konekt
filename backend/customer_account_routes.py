"""
Customer Account Routes
Customer-level summary across all commercial documents
"""
import os
from fastapi import APIRouter
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/customer-accounts", tags=["Customer Accounts"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


def serialize_doc(doc):
    if not doc:
        return None
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


@router.get("/{customer_email}")
async def get_customer_account(customer_email: str):
    customer = await db.customers.find_one({"email": customer_email}, {"_id": 0})
    user = await db.users.find_one({"email": customer_email}, {"_id": 0, "password_hash": 0})

    quotes = await db.quotes_v2.find({"customer_email": customer_email}).sort("created_at", -1).to_list(length=100)
    invoices = await db.invoices_v2.find({"customer_email": customer_email}).sort("created_at", -1).to_list(length=100)
    orders = await db.orders.find({"customer_email": customer_email}).sort("created_at", -1).to_list(length=100)
    payments = await db.payments.find({"customer_email": customer_email}).sort("created_at", -1).to_list(length=100)
    service_requests = await db.service_requests.find({"customer_email": customer_email}).sort("created_at", -1).to_list(length=100)
    leads = await db.crm_leads.find({"email": customer_email}).sort("created_at", -1).to_list(length=100)

    invoice_total = sum(float(x.get("total", 0) or 0) for x in invoices)
    invoice_paid = sum(float(x.get("paid_amount", 0) or 0) for x in invoices)
    invoice_balance = sum(float(x.get("balance_due", x.get("total", 0)) or 0) for x in invoices)

    return {
        "profile": {
            "customer": customer,
            "user": user,
            "email": customer_email,
        },
        "summary": {
            "quotes_count": len(quotes),
            "invoices_count": len(invoices),
            "orders_count": len(orders),
            "payments_count": len(payments),
            "service_requests_count": len(service_requests),
            "leads_count": len(leads),
            "invoice_total": invoice_total,
            "invoice_paid": invoice_paid,
            "invoice_balance": invoice_balance,
        },
        "quotes": [serialize_doc(x) for x in quotes],
        "invoices": [serialize_doc(x) for x in invoices],
        "orders": [serialize_doc(x) for x in orders],
        "payments": [serialize_doc(x) for x in payments],
        "service_requests": [serialize_doc(x) for x in service_requests],
        "leads": [serialize_doc(x) for x in leads],
    }
