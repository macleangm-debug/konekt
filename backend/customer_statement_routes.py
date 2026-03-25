"""
Customer Statement Routes
Customer-facing statement view
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
import jwt
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/customer/statements", tags=["Customer Statements"])
security = HTTPBearer(auto_error=False)

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

JWT_SECRET = os.environ.get('JWT_SECRET', 'konekt-secret-key-2024')


async def get_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get authenticated user"""
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        return user
    except Exception:
        return None


@router.get("/me")
async def get_my_statement(user: dict = Depends(get_user)):
    """Get statement of account for the current customer"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    user_email = user.get("email")
    
    # Get all invoices for customer
    invoices = await db.invoices.find({"customer_email": user_email}).sort("created_at", 1).to_list(length=1000)
    payments = await db.central_payments.find({"customer_email": user_email}).sort("payment_date", 1).to_list(length=1000)
    
    entries = []
    total_invoiced = 0.0
    total_paid = 0.0
    
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
        })
    
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
        })
    
    # Sort entries by date
    entries = sorted(entries, key=lambda x: x["date"] or "")
    
    # Calculate running balance
    running_balance = 0.0
    for item in entries:
        running_balance += float(item["debit"] or 0) - float(item["credit"] or 0)
        item["balance"] = round(running_balance, 2)
    
    return {
        "customer_email": user_email,
        "entries": entries,
        "summary": {
            "total_invoiced": round(total_invoiced, 2),
            "total_paid": round(total_paid, 2),
            "balance_due": round(total_invoiced - total_paid, 2),
        },
    }
