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
    """Generate branded Zoho-style HTML invoice"""
    items_html = ""
    if invoice.get("items"):
        items_html = "<table style='width:100%; border-collapse:collapse; margin-top:16px;'>"
        items_html += "<tr style='background:#f1f5f9;'><th style='padding:10px 12px; text-align:left; border-bottom:2px solid #e2e8f0; font-size:12px; color:#64748b; text-transform:uppercase; letter-spacing:0.5px;'>Item</th><th style='padding:10px 12px; text-align:center; border-bottom:2px solid #e2e8f0; font-size:12px; color:#64748b; text-transform:uppercase;'>Qty</th><th style='padding:10px 12px; text-align:right; border-bottom:2px solid #e2e8f0; font-size:12px; color:#64748b; text-transform:uppercase;'>Unit Price</th><th style='padding:10px 12px; text-align:right; border-bottom:2px solid #e2e8f0; font-size:12px; color:#64748b; text-transform:uppercase;'>Amount</th></tr>"
        for item in invoice.get("items", []):
            name = item.get("name") or item.get("product_name") or "Item"
            qty = item.get("quantity", 1)
            price = item.get("price") or item.get("unit_price", 0)
            subtotal = item.get("line_total") or item.get("subtotal") or (qty * price)
            items_html += f"<tr><td style='padding:10px 12px; border-bottom:1px solid #f1f5f9;'>{name}</td><td style='padding:10px 12px; text-align:center; border-bottom:1px solid #f1f5f9;'>{qty}</td><td style='padding:10px 12px; text-align:right; border-bottom:1px solid #f1f5f9;'>TZS {price:,.0f}</td><td style='padding:10px 12px; text-align:right; border-bottom:1px solid #f1f5f9;'>TZS {subtotal:,.0f}</td></tr>"
        items_html += "</table>"

    subtotal = invoice.get("subtotal_amount") or invoice.get("subtotal", 0)
    vat_amount = invoice.get("vat_amount", 0)
    total = invoice.get("total_amount") or invoice.get("total", 0)
    amount_paid = invoice.get("amount_paid", 0)
    balance_due = total - amount_paid
    status = (invoice.get("payment_status") or invoice.get("status", "pending")).replace("_", " ").title()

    billing = invoice.get("billing", {})
    billing_name = billing.get("invoice_client_name") or invoice.get("customer_name", "Customer")
    billing_email = billing.get("invoice_client_email") or invoice.get("customer_email", "")
    billing_phone = billing.get("invoice_client_phone") or invoice.get("customer_phone", "")
    billing_tin = billing.get("invoice_client_tin", "")
    billing_address = invoice.get("billing_address") or billing.get("address", "")

    inv_number = invoice.get("invoice_number") or str(invoice.get("_id", ""))[:8]
    created = str(invoice.get("created_at", ""))[:10]
    due = str(invoice.get("due_date", ""))[:10] if invoice.get("due_date") else ""
    payment_terms = invoice.get("payment_terms", "Due on receipt")

    status_color = "#92400e" if "pending" in status.lower() else "#065f46" if "paid" in status.lower() else "#991b1b" if "reject" in status.lower() else "#1e40af"
    status_bg = "#fef3c7" if "pending" in status.lower() else "#d1fae5" if "paid" in status.lower() else "#fee2e2" if "reject" in status.lower() else "#dbeafe"

    return f'''<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
body {{ font-family:'Helvetica Neue',Arial,sans-serif; padding:40px 50px; color:#20364D; line-height:1.6; max-width:800px; margin:0 auto; }}
.header {{ display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:24px; border-bottom:3px solid #20364D; margin-bottom:32px; }}
.logo {{ font-size:32px; font-weight:800; color:#20364D; letter-spacing:1px; }}
.logo-sub {{ font-size:11px; color:#64748b; margin-top:2px; }}
.inv-title {{ font-size:28px; font-weight:700; color:#20364D; text-align:right; }}
.meta {{ color:#64748b; font-size:13px; text-align:right; margin-top:4px; }}
.two-col {{ display:flex; gap:40px; margin:28px 0; }}
.col {{ flex:1; }}
.col-label {{ font-size:11px; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; font-weight:600; margin-bottom:8px; }}
.col-value {{ font-size:14px; line-height:1.7; }}
.col-value strong {{ display:block; font-size:15px; color:#20364D; }}
.section {{ margin-top:28px; }}
.totals {{ margin-top:24px; margin-left:auto; width:280px; }}
.totals-row {{ display:flex; justify-content:space-between; padding:6px 0; font-size:14px; }}
.totals-row.grand {{ font-size:18px; font-weight:700; color:#20364D; border-top:2px solid #20364D; padding-top:12px; margin-top:8px; }}
.status-badge {{ display:inline-block; padding:5px 16px; border-radius:20px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; background:{status_bg}; color:{status_color}; }}
.payment-box {{ background:#f8fafc; padding:20px; border-radius:8px; margin-top:28px; border:1px solid #e2e8f0; }}
.payment-box h3 {{ font-size:13px; font-weight:700; color:#20364D; margin:0 0 12px; text-transform:uppercase; letter-spacing:0.5px; }}
.payment-box p {{ margin:4px 0; font-size:13px; color:#475569; }}
.footer {{ margin-top:48px; padding-top:16px; border-top:1px solid #e2e8f0; color:#94a3b8; font-size:11px; text-align:center; }}
</style></head><body>
<div class="header">
  <div><div class="logo">KONEKT</div><div class="logo-sub">B2B Commerce Platform</div></div>
  <div><div class="inv-title">INVOICE</div>
    <div class="meta">#{inv_number}</div>
    <div class="meta">Date: {created}</div>
    {'<div class="meta">Due: ' + due + '</div>' if due else ''}
    <div style="margin-top:8px;"><span class="status-badge">{status}</span></div>
  </div>
</div>

<div class="two-col">
  <div class="col"><div class="col-label">Bill To</div><div class="col-value">
    <strong>{billing_name}</strong>{billing_email}<br/>{billing_phone}
    {'<br/>' + billing_address if billing_address else ''}
    {'<br/>TIN: ' + billing_tin if billing_tin else ''}
  </div></div>
  <div class="col"><div class="col-label">Invoice Details</div><div class="col-value">
    <strong>Invoice #{inv_number}</strong>
    Payment Terms: {payment_terms}<br/>
    {'Balance Due: TZS ' + f'{balance_due:,.0f}' if amount_paid > 0 else ''}
  </div></div>
</div>

<div class="section">{items_html if items_html else "<p style='color:#94a3b8;'>No line items.</p>"}</div>

<div class="totals">
  <div class="totals-row"><span style="color:#64748b;">Subtotal</span><span>TZS {subtotal:,.0f}</span></div>
  <div class="totals-row"><span style="color:#64748b;">VAT ({invoice.get("vat_percentage", 18)}%)</span><span>TZS {vat_amount:,.0f}</span></div>
  {'<div class="totals-row"><span style="color:#64748b;">Amount Paid</span><span>TZS ' + f'{amount_paid:,.0f}' + '</span></div>' if amount_paid > 0 else ''}
  <div class="totals-row grand"><span>{"Balance Due" if amount_paid > 0 else "Total Due"}</span><span>TZS {balance_due if amount_paid > 0 else total:,.0f}</span></div>
</div>

<div class="payment-box">
  <h3>Payment Information</h3>
  <p><strong>Bank:</strong> CRDB Bank</p>
  <p><strong>Account Name:</strong> Konekt Limited</p>
  <p><strong>Account Number:</strong> 0150XXXXXXXX</p>
  <p><strong>SWIFT:</strong> CORUTZTZ</p>
  <p><strong>Reference:</strong> {inv_number}</p>
</div>

<div class="footer">
  <p>Thank you for your business. Please include the invoice number as payment reference.</p>
  <p>Konekt Limited &bull; accounts@konekt.co.tz</p>
</div>
</body></html>'''

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
    invoice = None
    try:
        from bson import ObjectId as OID
        invoice = await db.invoices.find_one({"_id": OID(invoice_id)})
    except Exception:
        pass
    if not invoice:
        invoice = await db.invoices.find_one({"id": invoice_id})
    if not invoice:
        invoice = await db.invoices.find_one({"invoice_number": invoice_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    pdf_io = html_to_pdf_bytes(render_invoice_html(invoice))
    filename = f'Invoice-{invoice.get("invoice_number", str(invoice.get("_id", ""))[:8])}.pdf'
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
    invoice = await db.invoices.find_one({"id": invoice_id})
    if not invoice:
        invoice = await db.invoices.find_one({"invoice_number": invoice_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return HTMLResponse(render_invoice_html(invoice))
