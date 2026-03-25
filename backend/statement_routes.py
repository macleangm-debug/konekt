from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
import jwt
import os

router = APIRouter(prefix="/api/admin/statements", tags=["Statements"])
security = HTTPBearer(auto_error=False)

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'konekt')]

JWT_SECRET = os.environ.get('JWT_SECRET', 'konekt-secret-key-2024')


async def get_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify admin user"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        role = user.get("role", "customer")
        if role not in ["admin", "sales", "marketing", "production"]:
            raise HTTPException(status_code=403, detail="Admin access required")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.get("/customer/{customer_email}")
async def get_customer_statement(customer_email: str, user: dict = Depends(get_admin_user)):
    """Get statement of account for a customer"""
    # Get all invoices for customer
    invoices = await db.invoices.find({"customer_email": customer_email}).sort("created_at", 1).to_list(length=1000)
    
    # Get all payments for customer
    payments = await db.central_payments.find({"customer_email": customer_email}).sort("payment_date", 1).to_list(length=1000)

    if not invoices and not payments:
        raise HTTPException(status_code=404, detail="No statement data found for this customer")

    # Get customer info
    customer = await db.b2b_customers.find_one({"email": customer_email}, {"_id": 0})

    entries = []
    total_invoiced = 0.0
    total_paid = 0.0

    # Add invoices as debit entries
    for inv in invoices:
        total = float(inv.get("total", 0) or 0)
        total_invoiced += total
        entries.append({
            "entry_type": "invoice",
            "date": inv.get("created_at"),
            "document_number": inv.get("invoice_number"),
            "description": f"Invoice {inv.get('invoice_number')}",
            "debit": round(total, 2),
            "credit": 0.0,
            "reference_id": str(inv.get("_id"))
        })

    # Add payments as credit entries
    for payment in payments:
        amount = float(payment.get("amount_received", 0) or 0)
        total_paid += amount
        entries.append({
            "entry_type": "payment",
            "date": payment.get("payment_date"),
            "document_number": payment.get("payment_reference") or str(payment.get("_id")),
            "description": f"Payment ({payment.get('payment_method', 'Unknown')})",
            "debit": 0.0,
            "credit": round(amount, 2),
            "reference_id": str(payment.get("_id"))
        })

    # Sort entries by date
    entries = sorted(entries, key=lambda x: x["date"] or "")

    # Calculate running balance
    running_balance = 0.0
    for item in entries:
        running_balance += float(item["debit"] or 0) - float(item["credit"] or 0)
        item["balance"] = round(running_balance, 2)

    return {
        "customer_email": customer_email,
        "customer_name": customer.get("contact_name") if customer else None,
        "customer_company": customer.get("company_name") if customer else None,
        "entries": entries,
        "summary": {
            "total_invoiced": round(total_invoiced, 2),
            "total_paid": round(total_paid, 2),
            "balance_due": round(total_invoiced - total_paid, 2),
        },
        "generated_at": datetime.utcnow().isoformat()
    }


@router.get("/customer/{customer_email}/aging")
async def get_customer_aging(customer_email: str, user: dict = Depends(get_admin_user)):
    """Get aging report for a customer's outstanding invoices"""
    now = datetime.utcnow()

    # Get unpaid/partially paid invoices
    invoices = await db.invoices.find({
        "customer_email": customer_email,
        "status": {"$in": ["sent", "partially_paid", "overdue"]}
    }).to_list(length=500)

    aging_buckets = {
        "current": {"label": "Current (0-30 days)", "amount": 0, "invoices": []},
        "30_60": {"label": "31-60 days", "amount": 0, "invoices": []},
        "60_90": {"label": "61-90 days", "amount": 0, "invoices": []},
        "90_plus": {"label": "Over 90 days", "amount": 0, "invoices": []}
    }

    for inv in invoices:
        invoice_date = inv.get("created_at")
        if isinstance(invoice_date, str):
            try:
                invoice_date = datetime.fromisoformat(invoice_date.replace("Z", "+00:00"))
            except:
                invoice_date = now
        
        days_old = (now - invoice_date).days if invoice_date else 0
        balance = float(inv.get("balance_due", inv.get("total", 0)) or 0)

        invoice_info = {
            "invoice_number": inv.get("invoice_number"),
            "date": inv.get("created_at"),
            "total": float(inv.get("total", 0)),
            "balance_due": balance,
            "days_old": days_old
        }

        if days_old <= 30:
            aging_buckets["current"]["amount"] += balance
            aging_buckets["current"]["invoices"].append(invoice_info)
        elif days_old <= 60:
            aging_buckets["30_60"]["amount"] += balance
            aging_buckets["30_60"]["invoices"].append(invoice_info)
        elif days_old <= 90:
            aging_buckets["60_90"]["amount"] += balance
            aging_buckets["60_90"]["invoices"].append(invoice_info)
        else:
            aging_buckets["90_plus"]["amount"] += balance
            aging_buckets["90_plus"]["invoices"].append(invoice_info)

    # Round amounts
    for bucket in aging_buckets.values():
        bucket["amount"] = round(bucket["amount"], 2)

    total_outstanding = sum(bucket["amount"] for bucket in aging_buckets.values())

    return {
        "customer_email": customer_email,
        "aging": aging_buckets,
        "total_outstanding": round(total_outstanding, 2),
        "generated_at": now.isoformat()
    }
