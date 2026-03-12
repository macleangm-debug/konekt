from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import jwt
import os

from payment_records_models import ManualPaymentCreate, PaymentAllocationUpdate

router = APIRouter(prefix="/api/admin/central-payments", tags=["Central Payments"])
security = HTTPBearer(auto_error=False)

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'konekt')]

JWT_SECRET = os.environ.get('JWT_SECRET', 'konekt-secret-key-2024')


def serialize_doc(doc):
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


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


async def recalculate_invoice_status(invoice_id: str):
    """Recalculate invoice payment status based on allocations"""
    invoice = await db.invoices_v2.find_one({"_id": ObjectId(invoice_id)})
    if not invoice:
        return None

    allocations = await db.payment_allocations.find({"invoice_id": invoice_id}).to_list(length=500)
    paid_amount = sum(float(a.get("allocated_amount", 0) or 0) for a in allocations)
    invoice_total = float(invoice.get("total", 0) or 0)

    if paid_amount <= 0:
        status = "sent"
    elif paid_amount < invoice_total:
        status = "partially_paid"
    else:
        status = "paid"

    await db.invoices_v2.update_one(
        {"_id": ObjectId(invoice_id)},
        {
            "$set": {
                "status": status,
                "paid_amount": round(paid_amount, 2),
                "balance_due": round(max(invoice_total - paid_amount, 0), 2),
                "updated_at": datetime.utcnow(),
            }
        },
    )

    return await db.invoices_v2.find_one({"_id": ObjectId(invoice_id)})


@router.get("")
async def list_payments(
    user: dict = Depends(get_admin_user),
    customer_email: str = None,
    payment_method: str = None,
    payment_source: str = None,
):
    """List all payments with optional filters"""
    query = {}
    if customer_email:
        query["customer_email"] = customer_email
    if payment_method:
        query["payment_method"] = payment_method
    if payment_source:
        query["payment_source"] = payment_source

    docs = await db.central_payments.find(query).sort("payment_date", -1).to_list(length=500)
    return [serialize_doc(doc) for doc in docs]


@router.get("/{payment_id}")
async def get_payment(payment_id: str, user: dict = Depends(get_admin_user)):
    """Get a single payment with its allocations"""
    doc = await db.central_payments.find_one({"_id": ObjectId(payment_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Payment not found")

    allocations = await db.payment_allocations.find({"payment_id": payment_id}).to_list(length=200)
    result = serialize_doc(doc)
    result["allocations"] = [serialize_doc(a) for a in allocations]
    return result


@router.post("")
async def create_payment(payload: ManualPaymentCreate, user: dict = Depends(get_admin_user)):
    """Create a new payment record with optional invoice allocations"""
    now = datetime.utcnow()

    payment_date = payload.payment_date or now

    doc = payload.model_dump()
    doc["payment_date"] = payment_date
    doc["status"] = "recorded"
    doc["unallocated_amount"] = float(payload.amount_received or 0)
    doc["recorded_by"] = user.get("email")
    doc["created_at"] = now
    doc["updated_at"] = now

    result = await db.central_payments.insert_one(doc)
    payment_id = str(result.inserted_id)

    remaining = float(payload.amount_received or 0)

    # Process allocations
    for allocation in payload.allocations:
        if allocation.allocated_amount <= 0:
            continue

        invoice = await db.invoices_v2.find_one({"_id": ObjectId(allocation.invoice_id)})
        if not invoice:
            continue

        alloc_amount = min(float(allocation.allocated_amount), remaining)
        if alloc_amount <= 0:
            continue

        await db.payment_allocations.insert_one(
            {
                "payment_id": payment_id,
                "invoice_id": allocation.invoice_id,
                "invoice_number": invoice.get("invoice_number"),
                "allocated_amount": round(alloc_amount, 2),
                "created_at": now,
            }
        )

        remaining -= alloc_amount
        await recalculate_invoice_status(allocation.invoice_id)

    # Update unallocated amount
    await db.central_payments.update_one(
        {"_id": ObjectId(payment_id)},
        {"$set": {"unallocated_amount": round(max(remaining, 0), 2)}},
    )

    created = await db.central_payments.find_one({"_id": ObjectId(payment_id)})

    return serialize_doc(created)


@router.post("/{payment_id}/allocate")
async def allocate_payment(payment_id: str, payload: PaymentAllocationUpdate, user: dict = Depends(get_admin_user)):
    """Add allocations to an existing payment"""
    payment = await db.central_payments.find_one({"_id": ObjectId(payment_id)})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    remaining = float(payment.get("unallocated_amount", 0))
    now = datetime.utcnow()

    for allocation in payload.allocations:
        if allocation.allocated_amount <= 0:
            continue

        invoice = await db.invoices_v2.find_one({"_id": ObjectId(allocation.invoice_id)})
        if not invoice:
            continue

        alloc_amount = min(float(allocation.allocated_amount), remaining)
        if alloc_amount <= 0:
            continue

        await db.payment_allocations.insert_one(
            {
                "payment_id": payment_id,
                "invoice_id": allocation.invoice_id,
                "invoice_number": invoice.get("invoice_number"),
                "allocated_amount": round(alloc_amount, 2),
                "created_at": now,
            }
        )

        remaining -= alloc_amount
        await recalculate_invoice_status(allocation.invoice_id)

    await db.central_payments.update_one(
        {"_id": ObjectId(payment_id)},
        {"$set": {"unallocated_amount": round(max(remaining, 0), 2), "updated_at": now}},
    )

    updated = await db.central_payments.find_one({"_id": ObjectId(payment_id)})
    return serialize_doc(updated)


@router.get("/customer/{customer_email}")
async def get_customer_payments(customer_email: str, user: dict = Depends(get_admin_user)):
    """Get all payments for a specific customer"""
    docs = await db.central_payments.find({"customer_email": customer_email}).sort("payment_date", -1).to_list(length=200)
    return [serialize_doc(doc) for doc in docs]


@router.get("/stats/summary")
async def get_payment_stats(user: dict = Depends(get_admin_user)):
    """Get payment statistics"""
    pipeline = [
        {"$group": {
            "_id": "$payment_method",
            "count": {"$sum": 1},
            "total_amount": {"$sum": "$amount_received"}
        }}
    ]
    
    by_method = await db.central_payments.aggregate(pipeline).to_list(length=20)
    
    total_payments = await db.central_payments.count_documents({})
    total_amount = sum(item.get("total_amount", 0) for item in by_method)
    
    return {
        "total_payments": total_payments,
        "total_amount": round(total_amount, 2),
        "by_method": by_method
    }
