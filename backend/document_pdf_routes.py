"""
Commercial Document PDF Routes
Premium PDF export for invoices and quotes
With canonical collection mode
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from bson import ObjectId
import os
from motor.motor_asyncio import AsyncIOMotorClient

from pdf_commercial_documents import generate_commercial_document_pdf
from collection_mode_service import get_quote_collection, get_invoice_collection

router = APIRouter(prefix="/api/documents/pdf", tags=["Commercial PDF"])

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


@router.get("/invoice/{invoice_id}")
async def export_invoice_pdf(invoice_id: str):
    """Export invoice as premium PDF"""
    invoices_collection = await get_invoice_collection(db)
    try:
        invoice = await invoices_collection.find_one({"_id": ObjectId(invoice_id)})
    except Exception:
        invoice = None
    
    if not invoice:
        # Try fallback collection
        fallback = db.invoices if invoices_collection.name == "invoices_v2" else db.invoices_v2
        try:
            invoice = await fallback.find_one({"_id": ObjectId(invoice_id)})
        except Exception:
            pass

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Normalize numeric fields
    invoice["subtotal"] = float(invoice.get("subtotal", 0) or 0)
    invoice["tax"] = float(invoice.get("tax", 0) or 0)
    invoice["discount"] = float(invoice.get("discount", 0) or 0)
    invoice["total"] = float(invoice.get("total", 0) or 0)
    invoice["paid_amount"] = float(invoice.get("paid_amount", 0) or 0)
    invoice["balance_due"] = float(invoice.get("balance_due", invoice["total"]) or 0)

    # Get settings from business_settings or fall back to settings
    settings = await db.business_settings.find_one({}) or await db.settings.find_one({}) or {}

    pdf_buffer = generate_commercial_document_pdf(invoice, settings, document_type="invoice")
    filename = f"{invoice.get('invoice_number', 'invoice')}.pdf"

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


@router.get("/quote/{quote_id}")
async def export_quote_pdf(quote_id: str):
    """Export quote as premium PDF"""
    quotes_collection = await get_quote_collection(db)
    try:
        quote = await quotes_collection.find_one({"_id": ObjectId(quote_id)})
    except Exception:
        quote = None
    
    if not quote:
        # Try fallback collection
        fallback = db.quotes if quotes_collection.name == "quotes_v2" else db.quotes_v2
        try:
            quote = await fallback.find_one({"_id": ObjectId(quote_id)})
        except Exception:
            pass

    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    # Normalize numeric fields
    quote["subtotal"] = float(quote.get("subtotal", 0) or 0)
    quote["tax"] = float(quote.get("tax", 0) or 0)
    quote["discount"] = float(quote.get("discount", 0) or 0)
    quote["total"] = float(quote.get("total", 0) or 0)
    quote["paid_amount"] = float(quote.get("paid_amount", 0) or 0)
    quote["balance_due"] = float(quote.get("balance_due", quote["total"]) or 0)

    # Get settings from business_settings or fall back to settings
    settings = await db.business_settings.find_one({}) or await db.settings.find_one({}) or {}

    pdf_buffer = generate_commercial_document_pdf(quote, settings, document_type="quote")
    filename = f"{quote.get('quote_number', 'quote')}.pdf"

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )
