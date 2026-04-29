"""
Stripe Webhook Handler
Handles Stripe payment events for Konekt.
"""
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, Request, HTTPException
import os

from services.optional_integrations import get_stripe_checkout_classes

router = APIRouter(tags=["Stripe Webhook"])

STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "")


@router.post("/api/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events."""
    db = request.app.mongodb

    if not STRIPE_API_KEY:
        raise HTTPException(status_code=500, detail="Stripe not configured")

    body = await request.body()
    sig_header = request.headers.get("Stripe-Signature", "")

    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    StripeCheckout, _ = get_stripe_checkout_classes()
    if not StripeCheckout:
        raise HTTPException(status_code=503, detail="Stripe integration unavailable: emergentintegrations not installed")
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)

    try:
        event = await stripe_checkout.handle_webhook(body, sig_header)
    except Exception as e:
        return {"ok": False, "error": str(e)}

    now = datetime.now(timezone.utc).isoformat()

    if event.payment_status == "paid" and event.session_id:
        txn = await db.payment_transactions.find_one({"session_id": event.session_id})
        if txn and txn.get("payment_status") != "paid":
            await db.payment_transactions.update_one(
                {"session_id": event.session_id},
                {"$set": {
                    "payment_status": "paid",
                    "status": "complete",
                    "paid_at": now,
                    "updated_at": now,
                    "webhook_event_id": event.event_id,
                    "webhook_event_type": event.event_type,
                }}
            )

            invoice_id = txn.get("invoice_id")
            if invoice_id:
                from stripe_payment_routes import _process_successful_payment
                await _process_successful_payment(db, invoice_id, txn, now)

    return {"ok": True, "event_type": event.event_type}
