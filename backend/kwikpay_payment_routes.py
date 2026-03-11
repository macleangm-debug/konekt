"""
KwikPay Payment Routes
Mobile money payment initiation
"""
from datetime import datetime
from typing import Literal
import os

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr
from motor.motor_asyncio import AsyncIOMotorClient

from payment_config import KWIKPAY_ENABLED
from payment_utils import (
    make_payment_reference,
    normalize_currency,
    payment_allowed_for_invoice,
    payment_allowed_for_order,
    serialize_doc,
)
from kwikpay_service import create_mobile_money_payment, KwikPayError

router = APIRouter(prefix="/api/payments/kwikpay", tags=["KwikPay Payments"])

# Database connection
client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
db = client[os.environ.get('DB_NAME', 'konekt')]


class KwikPayIntentCreate(BaseModel):
    target_type: Literal["order", "invoice"]
    target_id: str
    phone_number: str
    customer_name: str
    customer_email: EmailStr


@router.post("/intent")
async def create_kwikpay_intent(payload: KwikPayIntentCreate):
    """Create a KwikPay mobile money payment intent"""
    if not KWIKPAY_ENABLED:
        raise HTTPException(status_code=400, detail="KwikPay is not enabled")

    now = datetime.utcnow()

    if payload.target_type == "order":
        target = await db.orders.find_one({"_id": ObjectId(payload.target_id)})
        if not target:
            raise HTTPException(status_code=404, detail="Order not found")
        if not payment_allowed_for_order(target):
            raise HTTPException(status_code=400, detail="Order is not payable")
        document_number = target.get("order_number", payload.target_id)
        amount = float(target.get("total", 0))
        currency = normalize_currency(target.get("currency", "TZS"))
        description = f"Payment for order {document_number}"
    else:
        target = await db.invoices.find_one({"_id": ObjectId(payload.target_id)})
        if not target:
            raise HTTPException(status_code=404, detail="Invoice not found")
        if not payment_allowed_for_invoice(target):
            raise HTTPException(status_code=400, detail="Invoice is not payable")
        document_number = target.get("invoice_number", payload.target_id)
        amount = float(target.get("total", 0))
        currency = normalize_currency(target.get("currency", "TZS"))
        description = f"Payment for invoice {document_number}"

    reference = make_payment_reference("KPK", document_number)

    payment_doc = {
        "provider": "kwikpay",
        "target_type": payload.target_type,
        "target_id": payload.target_id,
        "document_number": document_number,
        "reference": reference,
        "amount": amount,
        "currency": currency,
        "phone_number": payload.phone_number,
        "customer_name": payload.customer_name,
        "customer_email": payload.customer_email,
        "status": "pending",
        "created_at": now,
        "updated_at": now,
    }

    result = await db.payments.insert_one(payment_doc)

    try:
        gateway_response = create_mobile_money_payment(
            reference=reference,
            amount=amount,
            currency=currency,
            phone_number=payload.phone_number,
            customer_name=payload.customer_name,
            customer_email=payload.customer_email,
            description=description,
        )
    except KwikPayError as exc:
        await db.payments.update_one(
            {"_id": result.inserted_id},
            {"$set": {"status": "failed", "gateway_error": str(exc), "updated_at": datetime.utcnow()}},
        )
        raise HTTPException(status_code=502, detail=str(exc))

    await db.payments.update_one(
        {"_id": result.inserted_id},
        {
            "$set": {
                "gateway_response": gateway_response,
                "gateway_payment_id": gateway_response.get("payment_id") or gateway_response.get("id"),
                "status": gateway_response.get("status", "processing"),
                "updated_at": datetime.utcnow(),
            }
        },
    )

    created = await db.payments.find_one({"_id": result.inserted_id})
    return serialize_doc(created)
