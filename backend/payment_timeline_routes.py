"""
Payment Timeline Routes
API endpoints to retrieve payment timeline for invoices.
"""
from fastapi import APIRouter, Request, HTTPException
from bson import ObjectId
from payment_timeline_service import get_invoice_timeline, PAYMENT_TIMELINE_SEQUENCE

router = APIRouter(prefix="/api/payment-timeline", tags=["Payment Timeline"])


@router.get("/invoice/{invoice_id}")
async def get_invoice_payment_timeline(invoice_id: str, request: Request):
    """Get the payment timeline events for a specific invoice."""
    db = request.app.mongodb
    events = await get_invoice_timeline(db, invoice_id)
    return {
        "invoice_id": invoice_id,
        "events": events,
        "sequence": PAYMENT_TIMELINE_SEQUENCE,
    }


@router.get("/steps")
async def get_payment_timeline_steps():
    """Get the payment timeline step sequence."""
    return {"steps": PAYMENT_TIMELINE_SEQUENCE}
