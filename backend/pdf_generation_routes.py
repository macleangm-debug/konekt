from io import BytesIO
from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse, HTMLResponse

router = APIRouter(prefix="/api/pdf", tags=["PDF Generation"])

def render_quote_html(quote: dict):
    """Generate HTML template for quote PDF"""
    items_html = ""
    if quote.get("items"):
        items_html = "<table style='width:100%; border-collapse: collapse; margin-top: 20px;'>"
        items_html += "<tr style='background: #f8fafc;'><th style='padding: 10px; text-align: left; border-bottom: 1px solid #e2e8f0;'>Item</th><th style='padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0;'>Qty</th><th style='padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0;'>Price</th><th style='padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0;'>Subtotal</th></tr>"
        for item in quote.get("items", []):
            name = item.get("name") or item.get("product_name") or "Item"
            qty = item.get("quantity", 1)
            price = item.get("price") or item.get("unit_price", 0)
            subtotal = item.get("subtotal") or (qty * price)
            items_html += f"<tr><td style='padding: 10px; border-bottom: 1px solid #e2e8f0;'>{name}</td><td style='padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0;'>{qty}</td><td style='padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0;'>TZS {price:,.0f}</td><td style='padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0;'>TZS {subtotal:,.0f}</td></tr>"
        items_html += "</table>"

    subtotal = quote.get("subtotal", 0)
    vat_amount = quote.get("vat_amount", 0)
    total = quote.get("total") or quote.get("total_amount", 0)
    
    return f'''
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {{ font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #20364D; line-height: 1.6; }}
          .header {{ display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }}
          .logo {{ font-size: 28px; font-weight: bold; color: #20364D; }}
          .quote-title {{ font-size: 32px; font-weight: bold; color: #20364D; margin-bottom: 8px; }}
          .meta {{ color: #64748b; font-size: 14px; }}
          .section {{ margin-top: 30px; }}
          .section-title {{ font-size: 18px; font-weight: 600; color: #20364D; margin-bottom: 12px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }}
          .totals {{ margin-top: 30px; text-align: right; }}
          .totals-row {{ display: flex; justify-content: flex-end; gap: 40px; padding: 8px 0; }}
          .totals-label {{ color: #64748b; }}
          .totals-value {{ font-weight: 600; min-width: 120px; }}
          .grand-total {{ font-size: 24px; font-weight: bold; color: #20364D; border-top: 2px solid #20364D; padding-top: 12px; margin-top: 12px; }}
          .status {{ display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; }}
          .status-pending {{ background: #fef3c7; color: #92400e; }}
          .status-approved {{ background: #d1fae5; color: #065f46; }}
          .status-paid {{ background: #dbeafe; color: #1e40af; }}
          .footer {{ margin-top: 60px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px; }}
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">KONEKT</div>
            <div class="meta">B2B Commerce Platform</div>
          </div>
          <div style="text-align: right;">
            <div class="quote-title">QUOTE</div>
            <div class="meta">#{quote.get("quote_number", quote.get("id", "")[:8])}</div>
            <div class="meta">Date: {quote.get("created_at", datetime.now(timezone.utc).isoformat())[:10]}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Client Details</div>
          <div><strong>{quote.get("customer_name", "Customer")}</strong></div>
          <div>{quote.get("customer_email", "")}</div>
          <div>{quote.get("customer_phone", "")}</div>
        </div>

        <div class="section">
          <div class="section-title">Quote Items</div>
          {items_html if items_html else "<p>No items listed.</p>"}
        </div>

        <div class="totals">
          <div class="totals-row">
            <span class="totals-label">Subtotal:</span>
            <span class="totals-value">TZS {subtotal:,.0f}</span>
          </div>
          <div class="totals-row">
            <span class="totals-label">VAT ({quote.get("vat_percentage", 18)}%):</span>
            <span class="totals-value">TZS {vat_amount:,.0f}</span>
          </div>
          <div class="totals-row grand-total">
            <span>Total:</span>
            <span>TZS {total:,.0f}</span>
          </div>
        </div>

        <div class="section">
          <span class="status status-{quote.get("status", "pending")}">{quote.get("status", "pending").upper()}</span>
        </div>

        <div class="footer">
          <p>Thank you for choosing Konekt. This quote is valid for 30 days from the date of issue.</p>
          <p>For questions, contact us at support@konekt.co.tz</p>
        </div>
      </body>
    </html>
    '''

def render_invoice_html(invoice: dict):
    """Generate HTML template for invoice PDF"""
    items_html = ""
    if invoice.get("items"):
        items_html = "<table style='width:100%; border-collapse: collapse; margin-top: 20px;'>"
        items_html += "<tr style='background: #f8fafc;'><th style='padding: 10px; text-align: left; border-bottom: 1px solid #e2e8f0;'>Item</th><th style='padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0;'>Qty</th><th style='padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0;'>Price</th><th style='padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0;'>Subtotal</th></tr>"
        for item in invoice.get("items", []):
            name = item.get("name") or item.get("product_name") or "Item"
            qty = item.get("quantity", 1)
            price = item.get("price") or item.get("unit_price", 0)
            subtotal = item.get("subtotal") or (qty * price)
            items_html += f"<tr><td style='padding: 10px; border-bottom: 1px solid #e2e8f0;'>{name}</td><td style='padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0;'>{qty}</td><td style='padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0;'>TZS {price:,.0f}</td><td style='padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0;'>TZS {subtotal:,.0f}</td></tr>"
        items_html += "</table>"

    subtotal = invoice.get("subtotal", 0)
    vat_amount = invoice.get("vat_amount", 0)
    total = invoice.get("total") or invoice.get("total_amount", 0)
    
    return f'''
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {{ font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #20364D; line-height: 1.6; }}
          .header {{ display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }}
          .logo {{ font-size: 28px; font-weight: bold; color: #20364D; }}
          .invoice-title {{ font-size: 32px; font-weight: bold; color: #20364D; margin-bottom: 8px; }}
          .meta {{ color: #64748b; font-size: 14px; }}
          .section {{ margin-top: 30px; }}
          .section-title {{ font-size: 18px; font-weight: 600; color: #20364D; margin-bottom: 12px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }}
          .totals {{ margin-top: 30px; text-align: right; }}
          .totals-row {{ display: flex; justify-content: flex-end; gap: 40px; padding: 8px 0; }}
          .totals-label {{ color: #64748b; }}
          .totals-value {{ font-weight: 600; min-width: 120px; }}
          .grand-total {{ font-size: 24px; font-weight: bold; color: #20364D; border-top: 2px solid #20364D; padding-top: 12px; margin-top: 12px; }}
          .status {{ display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; }}
          .status-pending {{ background: #fef3c7; color: #92400e; }}
          .status-paid {{ background: #d1fae5; color: #065f46; }}
          .status-overdue {{ background: #fee2e2; color: #991b1b; }}
          .footer {{ margin-top: 60px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px; }}
          .payment-info {{ background: #f8fafc; padding: 20px; border-radius: 12px; margin-top: 30px; }}
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">KONEKT</div>
            <div class="meta">B2B Commerce Platform</div>
          </div>
          <div style="text-align: right;">
            <div class="invoice-title">INVOICE</div>
            <div class="meta">#{invoice.get("invoice_number", invoice.get("id", "")[:8])}</div>
            <div class="meta">Date: {invoice.get("created_at", datetime.now(timezone.utc).isoformat())[:10]}</div>
            {f'<div class="meta">Due: {invoice.get("due_date", "")[:10]}</div>' if invoice.get("due_date") else ''}
          </div>
        </div>

        <div class="section">
          <div class="section-title">Bill To</div>
          <div><strong>{invoice.get("customer_name", "Customer")}</strong></div>
          <div>{invoice.get("customer_email", "")}</div>
          <div>{invoice.get("customer_phone", "")}</div>
        </div>

        <div class="section">
          <div class="section-title">Invoice Items</div>
          {items_html if items_html else "<p>No items listed.</p>"}
        </div>

        <div class="totals">
          <div class="totals-row">
            <span class="totals-label">Subtotal:</span>
            <span class="totals-value">TZS {subtotal:,.0f}</span>
          </div>
          <div class="totals-row">
            <span class="totals-label">VAT ({invoice.get("vat_percentage", 18)}%):</span>
            <span class="totals-value">TZS {vat_amount:,.0f}</span>
          </div>
          <div class="totals-row grand-total">
            <span>Total Due:</span>
            <span>TZS {total:,.0f}</span>
          </div>
        </div>

        <div class="section">
          <span class="status status-{invoice.get("status", "pending")}">{invoice.get("status", "pending").upper()}</span>
        </div>

        <div class="payment-info">
          <div class="section-title">Payment Information</div>
          <p><strong>Bank:</strong> CRDB Bank</p>
          <p><strong>Account Name:</strong> Konekt Limited</p>
          <p><strong>Account Number:</strong> 0150XXXXXXXX</p>
          <p><strong>Reference:</strong> {invoice.get("invoice_number", invoice.get("id", "")[:8])}</p>
        </div>

        <div class="footer">
          <p>Thank you for your business. Please include the invoice number in your payment reference.</p>
          <p>For questions, contact us at accounts@konekt.co.tz</p>
        </div>
      </body>
    </html>
    '''

def html_to_pdf_bytes(html: str):
    """Convert HTML to PDF using WeasyPrint"""
    try:
        from weasyprint import HTML
    except ImportError:
        raise HTTPException(status_code=500, detail="WeasyPrint is not installed. Install with: pip install weasyprint")
    pdf_io = BytesIO()
    HTML(string=html).write_pdf(pdf_io)
    pdf_io.seek(0)
    return pdf_io

@router.get("/quotes/{quote_id}")
async def download_quote_pdf(quote_id: str, request: Request):
    """Download quote as PDF"""
    db = request.app.mongodb
    quote = await db.quotes.find_one({"id": quote_id})
    if not quote:
        quote = await db.quotes.find_one({"quote_number": quote_id})
    if not quote:
        quote = await db.quotes_v2.find_one({"id": quote_id})
    if not quote:
        quote = await db.quotes_v2.find_one({"quote_number": quote_id})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    pdf_io = html_to_pdf_bytes(render_quote_html(quote))
    filename = f'Quote-{quote.get("quote_number", quote.get("id", "")[:8])}.pdf'
    return StreamingResponse(
        pdf_io, 
        media_type="application/pdf", 
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.get("/invoices/{invoice_id}")
async def download_invoice_pdf(invoice_id: str, request: Request):
    """Download invoice as PDF"""
    db = request.app.mongodb
    invoice = await db.invoices_v2.find_one({"id": invoice_id})
    if not invoice:
        invoice = await db.invoices_v2.find_one({"invoice_number": invoice_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    pdf_io = html_to_pdf_bytes(render_invoice_html(invoice))
    filename = f'Invoice-{invoice.get("invoice_number", invoice.get("id", "")[:8])}.pdf'
    return StreamingResponse(
        pdf_io, 
        media_type="application/pdf", 
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.get("/quotes/{quote_id}/preview", response_class=HTMLResponse)
async def quote_html_preview(quote_id: str, request: Request):
    """Preview quote as HTML"""
    db = request.app.mongodb
    quote = await db.quotes.find_one({"id": quote_id})
    if not quote:
        quote = await db.quotes.find_one({"quote_number": quote_id})
    if not quote:
        quote = await db.quotes_v2.find_one({"id": quote_id})
    if not quote:
        quote = await db.quotes_v2.find_one({"quote_number": quote_id})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    return HTMLResponse(render_quote_html(quote))

@router.get("/invoices/{invoice_id}/preview", response_class=HTMLResponse)
async def invoice_html_preview(invoice_id: str, request: Request):
    """Preview invoice as HTML"""
    db = request.app.mongodb
    invoice = await db.invoices_v2.find_one({"id": invoice_id})
    if not invoice:
        invoice = await db.invoices_v2.find_one({"invoice_number": invoice_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return HTMLResponse(render_invoice_html(invoice))
