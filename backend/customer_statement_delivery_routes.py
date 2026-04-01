"""
Customer Statement Delivery Routes — Send statement of account via email.
MOCKED email delivery (ready for Resend integration when keys are available).
Logs all delivery attempts with real customer statement data.
"""
from datetime import datetime, timezone
import os
import jwt
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/customers", tags=["Statement Delivery"])

security = HTTPBearer()

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

JWT_SECRET = os.environ.get("JWT_SECRET", "konekt-secret-key-change-in-production")


async def get_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user or user.get("role") not in ("admin", "staff", "sales"):
            raise HTTPException(status_code=403, detail="Access denied")
        return user
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.post("/{customer_id}/send-statement")
async def send_statement(customer_id: str, user: dict = Depends(get_admin_user)):
    """
    Build real statement data from customer's orders/invoices, log delivery.
    MOCKED email — ready for Resend integration.
    """
    # Get customer — check both customers and users collections
    from bson import ObjectId as BsonObjectId
    customer = None
    for coll_name in ["customers", "users"]:
        coll = db[coll_name]
        customer = await coll.find_one({"id": customer_id}, {"_id": 0})
        if not customer:
            try:
                doc = await coll.find_one({"_id": BsonObjectId(customer_id)})
                if doc:
                    customer = {k: v for k, v in doc.items() if k != "_id"}
                    customer["id"] = customer_id
            except Exception:
                pass
        if customer:
            break
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    customer_email = customer.get("email") or customer.get("contact_email")
    customer_name = customer.get("company_name") or customer.get("company") or customer.get("contact_name") or customer.get("name") or customer_email
    if not customer_email:
        raise HTTPException(status_code=400, detail="Customer has no email address")

    # Build real statement data from orders
    orders = await db.orders.find(
        {"customer_email": customer_email},
        {"_id": 0, "order_number": 1, "total": 1, "current_status": 1, "created_at": 1}
    ).sort("created_at", -1).to_list(100)

    # Build real statement data from invoices
    invoices = await db.invoices.find(
        {"customer_email": customer_email},
        {"_id": 0, "invoice_number": 1, "total": 1, "status": 1, "created_at": 1}
    ).sort("created_at", -1).to_list(100)

    # Calculate summary
    total_invoiced = sum(inv.get("total", 0) for inv in invoices)
    total_paid = sum(inv.get("total", 0) for inv in invoices if inv.get("status") == "paid")
    balance_due = total_invoiced - total_paid

    # Get company settings for branding
    settings = await db.business_settings.find_one({}, {"_id": 0})
    company_name = (settings or {}).get("company_name") or "Konekt"

    # Build statement entries
    entries = []
    for inv in invoices:
        entries.append({
            "date": inv.get("created_at"),
            "reference": inv.get("invoice_number"),
            "description": f"Invoice {inv.get('invoice_number', '')}",
            "debit": inv.get("total", 0) if inv.get("status") != "paid" else 0,
            "credit": inv.get("total", 0) if inv.get("status") == "paid" else 0,
        })

    now = datetime.now(timezone.utc)

    # Log delivery attempt (MOCKED — no actual email sent)
    delivery_log = {
        "customer_id": customer_id,
        "customer_email": customer_email,
        "customer_name": customer_name,
        "initiated_by": user.get("name") or user.get("email"),
        "initiated_by_role": user.get("role"),
        "mode": "mocked_email",
        "status": "logged",
        "statement_summary": {
            "total_invoiced": total_invoiced,
            "total_paid": total_paid,
            "balance_due": balance_due,
            "order_count": len(orders),
            "invoice_count": len(invoices),
            "entry_count": len(entries),
        },
        "company_name": company_name,
        "created_at": now.isoformat(),
    }
    await db.statement_delivery_log.insert_one(delivery_log)

    return {
        "ok": True,
        "message": f"Statement logged for {customer_email} (MOCKED — email provider not configured)",
        "customer_name": customer_name,
        "customer_email": customer_email,
        "statement_summary": delivery_log["statement_summary"],
        "delivery_mode": "mocked_email",
    }
