"""
KwikPay Webhook Handler
Receives payment status updates from KwikPay
"""
from datetime import datetime
import os

from bson import ObjectId
from fastapi import APIRouter, Header, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorClient

from kwikpay_service import verify_kwikpay_signature
from payment_reconciliation_service import reconcile_invoice_payment
from affiliate_commission_service import create_affiliate_commission_on_closed_business
from notification_events import notify_payment_received

router = APIRouter(prefix="/api/payments/kwikpay", tags=["KwikPay Webhook"])

# Database connection
client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
db = client[os.environ.get('DB_NAME', 'konekt')]


@router.post("/webhook")
async def kwikpay_webhook(
    request: Request,
    x_signature: str = Header(default=""),
):
    """Handle KwikPay webhook callbacks"""
    raw_body = await request.body()

    if not verify_kwikpay_signature(raw_body, x_signature):
        raise HTTPException(status_code=401, detail="Invalid signature")

    payload = await request.json()
    now = datetime.utcnow()

    reference = payload.get("reference")
    payment_status = payload.get("status", "").lower()
    transaction_id = payload.get("transaction_id") or payload.get("payment_id")

    payment = await db.payments.find_one({"reference": reference, "provider": "kwikpay"})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    await db.payments.update_one(
        {"_id": payment["_id"]},
        {
            "$set": {
                "status": payment_status,
                "transaction_id": transaction_id,
                "webhook_payload": payload,
                "updated_at": now,
            }
        },
    )

    # Update target document on successful payment
    if payment_status == "paid":
        if payment["target_type"] == "order":
            await db.orders.update_one(
                {"_id": ObjectId(payment["target_id"])},
                {
                    "$set": {"payment_status": "paid", "updated_at": now},
                    "$push": {
                        "status_history": {
                            "status": "confirmed",
                            "note": "Payment confirmed via KwikPay Mobile Money",
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
                payment_method="kwikpay",
                reference=transaction_id or reference,
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
                
                # Send payment received notification
                notify_payment_received(
                    customer_email=invoice.get("customer_email"),
                    customer_name=invoice.get("customer_name"),
                    document_number=invoice.get("invoice_number"),
                    amount=float(payment.get("amount", 0) or 0),
                    currency=invoice.get("currency", "TZS"),
                )

    return {"received": True}
