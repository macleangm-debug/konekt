"""
Payment Admin Routes
List payments, verify bank transfers, manage payment status
"""
from datetime import datetime
from typing import Optional
import os

from bson import ObjectId
from fastapi import APIRouter, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient

from payment_reconciliation_service import reconcile_invoice_payment
from affiliate_commission_service import create_affiliate_commission_on_closed_business

router = APIRouter(prefix="/api/admin/payments", tags=["Payment Admin"])

# Database connection
client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
db = client[os.environ.get('DB_NAME', 'konekt')]


def serialize_doc(doc):
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


@router.get("")
async def list_payments(status: Optional[str] = None, provider: Optional[str] = None):
    """List all payments with optional filters"""
    query = {}
    if status:
        query["status"] = status
    if provider:
        query["provider"] = provider

    docs = await db.payments.find(query).sort("created_at", -1).to_list(length=500)
    return [serialize_doc(doc) for doc in docs]


@router.get("/{payment_id}")
async def get_payment(payment_id: str):
    """Get payment details by ID"""
    if not ObjectId.is_valid(payment_id):
        raise HTTPException(status_code=400, detail="Invalid payment ID format")
    payment = await db.payments.find_one({"_id": ObjectId(payment_id)})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return serialize_doc(payment)


@router.post("/{payment_id}/verify")
async def verify_payment(payment_id: str):
    """Admin verifies a bank transfer payment as paid"""
    if not ObjectId.is_valid(payment_id):
        raise HTTPException(status_code=400, detail="Invalid payment ID format")
    now = datetime.utcnow()

    payment = await db.payments.find_one({"_id": ObjectId(payment_id)})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    await db.payments.update_one(
        {"_id": ObjectId(payment_id)},
        {"$set": {"status": "paid", "verified_at": now, "updated_at": now}},
    )

    # Update the target document
    if payment["target_type"] == "order":
        await db.orders.update_one(
            {"_id": ObjectId(payment["target_id"])},
            {
                "$set": {"payment_status": "paid", "updated_at": now},
                "$push": {
                    "status_history": {
                        "status": "confirmed",
                        "note": "Payment verified by admin",
                        "timestamp": now,
                    }
                },
            },
        )
    elif payment["target_type"] == "invoice":
        # Use reconciliation service for consistent invoice payment handling
        await reconcile_invoice_payment(
            db,
            invoice_id=payment["target_id"],
            amount=float(payment.get("amount", 0) or 0),
            payment_method=payment.get("provider", "manual"),
            reference=payment.get("transaction_id") or payment.get("reference"),
        )
        
        # Create affiliate commission if applicable
        invoice = await db.invoices_v2.find_one({"_id": ObjectId(payment["target_id"])})
        if invoice:
            await create_affiliate_commission_on_closed_business(
                db,
                source_document="invoice",
                source_document_id=str(invoice["_id"]),
                customer_email=invoice.get("customer_email"),
                sale_amount=float(payment.get("amount", 0) or 0),
                affiliate_code=invoice.get("affiliate_code"),
                affiliate_email=invoice.get("affiliate_email"),
            )

    return {"status": "paid", "message": "Payment verified successfully"}


@router.post("/{payment_id}/reject")
async def reject_payment(payment_id: str, reason: Optional[str] = None):
    """Admin rejects a payment"""
    if not ObjectId.is_valid(payment_id):
        raise HTTPException(status_code=400, detail="Invalid payment ID format")
    now = datetime.utcnow()

    payment = await db.payments.find_one({"_id": ObjectId(payment_id)})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    await db.payments.update_one(
        {"_id": ObjectId(payment_id)},
        {
            "$set": {
                "status": "rejected",
                "rejection_reason": reason,
                "rejected_at": now,
                "updated_at": now,
            }
        },
    )

    return {"status": "rejected", "message": "Payment rejected"}
