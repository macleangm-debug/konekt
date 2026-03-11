"""
Konekt PDF Export Routes
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from bson import ObjectId
import os
from motor.motor_asyncio import AsyncIOMotorClient

from pdf_service import build_document_pdf

router = APIRouter(prefix="/api/admin/pdf", tags=["PDF Export"])

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


@router.get("/quote/{quote_id}")
async def export_quote_pdf(quote_id: str):
    """Export a quote as PDF"""
    try:
        quote = await db.quotes.find_one({"_id": ObjectId(quote_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    settings = await db.company_settings.find_one({}) or {}
    pdf_buffer = build_document_pdf("quote", quote, settings)

    filename = f"{quote.get('quote_number', 'quote')}.pdf"
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/invoice/{invoice_id}")
async def export_invoice_pdf(invoice_id: str):
    """Export an invoice as PDF"""
    try:
        invoice = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    settings = await db.company_settings.find_one({}) or {}
    pdf_buffer = build_document_pdf("invoice", invoice, settings)

    filename = f"{invoice.get('invoice_number', 'invoice')}.pdf"
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
