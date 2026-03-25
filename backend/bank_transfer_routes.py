"""
Bank Transfer Payment Routes
Manual bank transfer flow with admin verification
"""
from datetime import datetime
from typing import Literal, Optional
import os

from bson import ObjectId
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from motor.motor_asyncio import AsyncIOMotorClient

from payment_config import (
    BANK_TRANSFER_ENABLED,
    BANK_NAME,
    BANK_ACCOUNT_NAME,
    BANK_ACCOUNT_NUMBER,
    BANK_BRANCH,
    BANK_SWIFT_CODE,
    BANK_CURRENCY,
)
from payment_utils import (
    make_payment_reference,
    normalize_currency,
    payment_allowed_for_invoice,
    payment_allowed_for_order,
    serialize_doc,
)

router = APIRouter(prefix="/api/payments/bank-transfer", tags=["Bank Transfer"])

# Database connection
client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
db = client[os.environ.get('DB_NAME', 'konekt')]


class BankTransferIntentCreate(BaseModel):
    target_type: Literal["order", "invoice"]
    target_id: str
    customer_name: str
    customer_email: EmailStr


class BankTransferMarkSubmitted(BaseModel):
    payment_id: str
    proof_url: Optional[str] = None
    proof_filename: Optional[str] = None
    transaction_reference: Optional[str] = None


@router.post("/intent")
async def create_bank_transfer_intent(payload: BankTransferIntentCreate):
    """Create a bank transfer payment intent with bank details"""
    if not BANK_TRANSFER_ENABLED:
        raise HTTPException(status_code=400, detail="Bank transfer is not enabled")

    now = datetime.utcnow()

    # Validate ObjectId format
    if not ObjectId.is_valid(payload.target_id):
        raise HTTPException(status_code=400, detail="Invalid target ID format")

    if payload.target_type == "order":
        target = await db.orders.find_one({"_id": ObjectId(payload.target_id)})
        if not target:
            raise HTTPException(status_code=404, detail="Order not found")
        if not payment_allowed_for_order(target):
            raise HTTPException(status_code=400, detail="Order is not payable")
        document_number = target.get("order_number", payload.target_id)
        amount = float(target.get("total", 0))
        currency = normalize_currency(target.get("currency", BANK_CURRENCY))
    else:
        target = await db.invoices_v2.find_one({"_id": ObjectId(payload.target_id)})
        if not target:
            raise HTTPException(status_code=404, detail="Invoice not found")
        if not payment_allowed_for_invoice(target):
            raise HTTPException(status_code=400, detail="Invoice is not payable")
        document_number = target.get("invoice_number", payload.target_id)
        amount = float(target.get("total", 0))
        currency = normalize_currency(target.get("currency", BANK_CURRENCY))

    reference = make_payment_reference("BNK", document_number)

    payment_doc = {
        "provider": "bank_transfer",
        "target_type": payload.target_type,
        "target_id": payload.target_id,
        "document_number": document_number,
        "reference": reference,
        "amount": amount,
        "currency": currency,
        "customer_name": payload.customer_name,
        "customer_email": payload.customer_email,
        "status": "awaiting_customer_payment",
        "created_at": now,
        "updated_at": now,
    }

    result = await db.payments.insert_one(payment_doc)
    created = await db.payments.find_one({"_id": result.inserted_id})

    return {
        "payment": serialize_doc(created),
        "bank_details": {
            "bank_name": BANK_NAME,
            "account_name": BANK_ACCOUNT_NAME,
            "account_number": BANK_ACCOUNT_NUMBER,
            "branch": BANK_BRANCH,
            "swift_code": BANK_SWIFT_CODE,
            "currency": currency,
            "amount": amount,
            "reference": reference,
        },
    }


@router.post("/mark-submitted")
async def mark_bank_transfer_submitted(payload: BankTransferMarkSubmitted):
    """Mark bank transfer as submitted by customer (awaiting admin verification)"""
    now = datetime.utcnow()

    # Validate ObjectId format
    if not ObjectId.is_valid(payload.payment_id):
        raise HTTPException(status_code=400, detail="Invalid payment ID format")

    payment = await db.payments.find_one({"_id": ObjectId(payload.payment_id), "provider": "bank_transfer"})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    await db.payments.update_one(
        {"_id": ObjectId(payload.payment_id)},
        {
            "$set": {
                "status": "payment_submitted",
                "proof_url": payload.proof_url,
                "proof_filename": payload.proof_filename,
                "transaction_reference": payload.transaction_reference,
                "updated_at": now,
            }
        },
    )

    return {"status": "payment_submitted", "message": "Bank transfer marked as submitted, awaiting verification"}
