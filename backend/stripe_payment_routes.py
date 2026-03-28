"""
Stripe Payment Routes for Konekt
Handles checkout session creation, status polling, and webhooks for invoice payments.
"""
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Optional
import os

from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout,
    CheckoutSessionRequest,
)

router = APIRouter(prefix="/api/payments/stripe", tags=["Stripe Payments"])

STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "")


class InvoiceCheckoutRequest(BaseModel):
    invoice_id: str
    origin_url: str


@router.post("/checkout/invoice")
async def create_invoice_checkout(payload: InvoiceCheckoutRequest, request: Request):
    """Create a Stripe checkout session for an invoice payment."""
    db = request.app.mongodb

    if not STRIPE_API_KEY:
        raise HTTPException(status_code=500, detail="Stripe not configured")

    invoice = await db.invoices.find_one({"id": payload.invoice_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    status = invoice.get("payment_status") or invoice.get("status") or ""
    if status in ("paid", "approved"):
        raise HTTPException(status_code=400, detail="Invoice already paid")

    amount = float(invoice.get("total_amount") or invoice.get("total") or 0)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid invoice amount")

    amount_paid = float(invoice.get("amount_paid") or 0)
    balance_due = amount - amount_paid
    if balance_due <= 0:
        raise HTTPException(status_code=400, detail="No balance due")

    # Convert TZS to USD for Stripe sandbox (approximate rate)
    usd_amount = round(balance_due / 2500.0, 2)
    if usd_amount < 0.50:
        usd_amount = 0.50

    origin = payload.origin_url.rstrip("/")
    success_url = f"{origin}/account/invoices?payment=success&session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/account/invoices?payment=cancelled"

    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"

    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)

    metadata = {
        "invoice_id": payload.invoice_id,
        "invoice_number": invoice.get("invoice_number", ""),
        "customer_id": invoice.get("customer_id", ""),
        "customer_email": invoice.get("customer_email", ""),
        "original_currency": "TZS",
        "original_amount": str(balance_due),
    }

    checkout_request = CheckoutSessionRequest(
        amount=usd_amount,
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )

    session = await stripe_checkout.create_checkout_session(checkout_request)

    now = datetime.now(timezone.utc).isoformat()
    txn = {
        "id": str(uuid4()),
        "session_id": session.session_id,
        "invoice_id": payload.invoice_id,
        "invoice_number": invoice.get("invoice_number", ""),
        "customer_id": invoice.get("customer_id", ""),
        "customer_email": invoice.get("customer_email", ""),
        "amount_usd": usd_amount,
        "amount_tzs": balance_due,
        "currency": "usd",
        "payment_status": "pending",
        "status": "initiated",
        "provider": "stripe",
        "created_at": now,
        "updated_at": now,
    }
    await db.payment_transactions.insert_one(txn)
    txn.pop("_id", None)

    return {
        "url": session.url,
        "session_id": session.session_id,
        "amount_usd": usd_amount,
        "amount_tzs": balance_due,
    }


@router.get("/checkout/status/{session_id}")
async def get_checkout_status(session_id: str, request: Request):
    """Poll Stripe checkout session status."""
    db = request.app.mongodb

    if not STRIPE_API_KEY:
        raise HTTPException(status_code=500, detail="Stripe not configured")

    txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    if txn.get("payment_status") == "paid":
        return {
            "status": "complete",
            "payment_status": "paid",
            "invoice_id": txn.get("invoice_id"),
            "amount_usd": txn.get("amount_usd"),
        }

    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)

    try:
        checkout_status = await stripe_checkout.get_checkout_status(session_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Stripe status check failed: {str(e)}")

    now = datetime.now(timezone.utc).isoformat()

    if checkout_status.payment_status == "paid" and txn.get("payment_status") != "paid":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {
                "payment_status": "paid",
                "status": "complete",
                "paid_at": now,
                "updated_at": now,
                "stripe_amount_total": checkout_status.amount_total,
                "stripe_currency": checkout_status.currency,
            }}
        )

        invoice_id = txn.get("invoice_id")
        if invoice_id:
            await _process_successful_payment(db, invoice_id, txn, now)

    elif checkout_status.status == "expired":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"status": "expired", "payment_status": "expired", "updated_at": now}}
        )

    return {
        "status": checkout_status.status,
        "payment_status": checkout_status.payment_status,
        "invoice_id": txn.get("invoice_id"),
        "amount_usd": txn.get("amount_usd"),
    }


async def _process_successful_payment(db, invoice_id: str, txn: dict, now: str):
    """Process a successful Stripe payment - update invoice and create payment proof."""
    invoice = await db.invoices.find_one({"id": invoice_id})
    if not invoice:
        return

    current_status = invoice.get("payment_status") or invoice.get("status") or ""
    if current_status in ("paid", "approved"):
        return

    await db.invoices.update_one(
        {"id": invoice_id},
        {"$set": {
            "payment_status": "paid",
            "status": "paid",
            "paid_at": now,
            "payment_method": "stripe",
            "amount_paid": float(invoice.get("total_amount") or invoice.get("total") or 0),
        }}
    )

    proof_id = str(uuid4())
    proof = {
        "id": proof_id,
        "invoice_id": invoice_id,
        "customer_id": txn.get("customer_id", ""),
        "payer_name": "Stripe Payment",
        "amount_paid": float(invoice.get("total_amount") or invoice.get("total") or 0),
        "payment_mode": "full",
        "payment_method": "stripe",
        "stripe_session_id": txn.get("session_id"),
        "status": "approved",
        "approved_at": now,
        "approved_by_role": "auto",
        "file_url": "",
        "created_at": now,
    }
    await db.payment_proofs.insert_one(proof)
    proof.pop("_id", None)

    await db.notifications.insert_one({
        "id": str(uuid4()),
        "user_id": txn.get("customer_id", ""),
        "role": "customer",
        "event_type": "payment_approved",
        "title": "Payment Successful",
        "message": "Your Stripe payment has been processed successfully.",
        "target_url": "/account/invoices",
        "target_ref": invoice.get("invoice_number") or invoice_id,
        "read": False,
        "created_at": now,
    })
