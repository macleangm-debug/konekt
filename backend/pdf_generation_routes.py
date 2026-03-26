import os
from io import BytesIO
from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse, HTMLResponse

router = APIRouter(prefix="/api/pdf", tags=["PDF Generation"])


def _env_bank():
    """Read bank details from environment variables."""
    return {
        "bank_name": os.environ.get("BANK_NAME", ""),
        "account_name": os.environ.get("BANK_ACCOUNT_NAME", ""),
        "account_number": os.environ.get("BANK_ACCOUNT_NUMBER", ""),
        "branch": os.environ.get("BANK_BRANCH", ""),
        "swift_code": os.environ.get("BANK_SWIFT_CODE", ""),
        "currency": os.environ.get("BANK_CURRENCY", "TZS"),
    }


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


def render_invoice_html(invoice: dict, branding: dict = None):
    """Generate branded Zoho-level HTML invoice with status-aware payment block and CFO signature."""
    bank = _env_bank()
    branding = branding or {}

    items_html = ""
    if invoice.get("items"):
        for item in invoice.get("items", []):
            name = item.get("name") or item.get("product_name") or "Item"
            qty = item.get("quantity", 1)
            price = item.get("price") or item.get("unit_price", 0)
            line_total = item.get("line_total") or item.get("subtotal") or (qty * price)
            items_html += f'''<tr>
              <td style="padding:14px 16px; border-bottom:1px solid #e5edf5; font-size:15px;">{name}</td>
              <td style="padding:14px 16px; text-align:center; border-bottom:1px solid #e5edf5; font-size:15px;">{qty}</td>
              <td style="padding:14px 16px; text-align:right; border-bottom:1px solid #e5edf5; font-size:15px;">TZS {price:,.0f}</td>
              <td style="padding:14px 16px; text-align:right; border-bottom:1px solid #e5edf5; font-size:15px;">TZS {line_total:,.0f}</td>
            </tr>'''

    subtotal = invoice.get("subtotal_amount") or invoice.get("subtotal", 0)
    vat_amount = invoice.get("vat_amount", 0)
    total = invoice.get("total_amount") or invoice.get("total", 0)
    amount_paid = invoice.get("amount_paid", 0)
    balance_due = total - amount_paid

    payment_status_raw = invoice.get("payment_status") or invoice.get("status", "pending_payment")

    if payment_status_raw == "paid":
        payment_label = "Paid in Full"
        status_bg = "#dff6e8"
        status_color = "#16794d"
    elif payment_status_raw in ("under_review", "awaiting_review", "payment_under_review"):
        payment_label = "Under Review"
        status_bg = "#dbeafe"
        status_color = "#1e40af"
    elif payment_status_raw == "partially_paid":
        payment_label = "Partially Paid"
        status_bg = "#fef3c7"
        status_color = "#92400e"
    elif payment_status_raw in ("proof_rejected", "rejected", "payment_rejected"):
        payment_label = "Rejected"
        status_bg = "#fee2e2"
        status_color = "#991b1b"
    else:
        payment_label = "Awaiting Payment"
        status_bg = "#f1f5f9"
        status_color = "#475569"

    billing = invoice.get("billing", {})
    billing_name = billing.get("invoice_client_name") or invoice.get("customer_name", "Customer")
    billing_email = billing.get("invoice_client_email") or invoice.get("customer_email", "")
    billing_phone = billing.get("invoice_client_phone") or invoice.get("customer_phone", "")
    billing_tin = billing.get("invoice_client_tin", "")
    billing_address = invoice.get("billing_address") or billing.get("address", "")

    inv_number = invoice.get("invoice_number") or str(invoice.get("_id", ""))[:8]
    created = str(invoice.get("created_at", ""))[:10]
    paid_on = str(invoice.get("paid_at") or invoice.get("updated_at") or "")[:10]
    payment_method = invoice.get("payment_method", "Bank Transfer")
    payer_name = billing_name

    # Payment info section — status aware
    if payment_status_raw == "paid":
        payment_info_html = f'''
        <div style="text-align:left;">
          <div style="font-size:11px; color:#6e7f99; text-transform:uppercase; letter-spacing:0.05em; font-weight:700; margin-bottom:10px;">Payment Information</div>
          <div style="color:#16794d; font-weight:700; font-size:15px; margin-bottom:6px;">Paid in Full</div>
          <div style="font-size:14px; color:#475569; line-height:1.7;">
            <strong>Date:</strong> {paid_on}<br/>
            <strong>Method:</strong> {payment_method}<br/>
            <strong>Payer:</strong> {payer_name}<br/>
            <strong>Reference:</strong> {inv_number}
          </div>
        </div>'''
    else:
        payment_info_html = f'''
        <div style="text-align:left;">
          <div style="font-size:11px; color:#6e7f99; text-transform:uppercase; letter-spacing:0.05em; font-weight:700; margin-bottom:10px;">Payment Information</div>
          <div style="color:#92400e; font-weight:700; font-size:15px; margin-bottom:6px;">{payment_label}</div>
          <div style="font-size:14px; color:#475569; line-height:1.7;">
            <strong>Status:</strong> {payment_label}<br/>
            <strong>Reference:</strong> {inv_number}
          </div>
        </div>'''

    # Bank details box
    bank_html = f'''
    <div style="background:#f8fbff; border:1px solid #d7e3ee; border-radius:12px; padding:18px 20px; margin-top:32px;">
      <div style="font-size:11px; color:#6e7f99; text-transform:uppercase; letter-spacing:0.05em; font-weight:700; margin-bottom:12px;">Bank Transfer Details</div>
      <div style="font-size:15px; color:#183153; line-height:1.8;">
        <strong style="display:inline-block; min-width:135px;">Bank:</strong> {bank["bank_name"]}<br/>
        <strong style="display:inline-block; min-width:135px;">Account Name:</strong> {bank["account_name"]}<br/>
        <strong style="display:inline-block; min-width:135px;">Account Number:</strong> {bank["account_number"]}<br/>
        <strong style="display:inline-block; min-width:135px;">Branch:</strong> {bank["branch"]}<br/>
        <strong style="display:inline-block; min-width:135px;">SWIFT:</strong> {bank["swift_code"]}<br/>
        <strong style="display:inline-block; min-width:135px;">Reference:</strong> {inv_number}
      </div>
    </div>'''

    # CFO signature block — driven by branding settings
    signature_html = ""
    show_sig = branding.get("show_signature", False)
    show_stamp = branding.get("show_stamp", False)
    is_finalized = payment_status_raw in ("paid", "under_review", "issued")

    if is_finalized and (show_sig or show_stamp):
        cfo_name = branding.get("cfo_name", "")
        cfo_title = branding.get("cfo_title", "Chief Finance Officer")
        sig_url = branding.get("cfo_signature_url", "")

        # Resolve stamp image/svg
        stamp_mode = branding.get("stamp_mode", "generated")
        stamp_preview_url = branding.get("stamp_preview_url", "")
        stamp_uploaded_url = branding.get("stamp_uploaded_url", "")

        sig_block = ""
        if show_sig:
            sig_img = ""
            if sig_url:
                sig_img = f'<img src="file:///app/backend{sig_url}" style="height:50px; object-fit:contain; margin-bottom:12px;" />'
            else:
                sig_img = '<div style="height:50px; border-bottom:2px solid #d7e3ee; margin:24px 0 12px 0;"></div>'
            sig_block = f'''
      <div style="flex:1; border:1px solid #d7e3ee; border-radius:12px; padding:18px; min-height:140px; background:#fff;">
        <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.05em; color:#6e7f99; font-weight:700; margin-bottom:14px;">Authorized by</div>
        {sig_img}
        <div style="font-size:14px; color:#183153; font-weight:700;">{cfo_name or "Chief Finance Officer"}</div>
        <div style="font-size:12px; color:#6e7f99;">{cfo_title}</div>
      </div>'''

        stamp_block = ""
        if show_stamp:
            stamp_content = ""
            if stamp_mode == "uploaded" and stamp_uploaded_url:
                stamp_content = f'<img src="file:///app/backend{stamp_uploaded_url}" style="width:90px; height:90px; object-fit:contain; margin:12px auto 0 auto;" />'
            elif stamp_mode == "generated" and stamp_preview_url:
                # Read SVG from file
                svg_path = f"/app/backend{stamp_preview_url}"
                try:
                    with open(svg_path, "r") as f:
                        stamp_content = f.read()
                except Exception:
                    stamp_content = '<div style="width:90px; height:90px; border:2px dashed #d7e3ee; border-radius:50%; margin:12px auto 0 auto;"></div>'
            else:
                stamp_content = '<div style="width:90px; height:90px; border:2px dashed #d7e3ee; border-radius:50%; margin:12px auto 0 auto;"></div>'

            stamp_block = f'''
      <div style="flex:1; border:1px solid #d7e3ee; border-radius:12px; padding:18px; min-height:140px; background:#fff; text-align:center;">
        <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.05em; color:#6e7f99; font-weight:700; margin-bottom:14px;">Company Stamp</div>
        {stamp_content}
      </div>'''

        signature_html = f'''
    <div style="display:flex; gap:24px; margin-top:36px;">
      {sig_block}
      {stamp_block}
    </div>'''

    return f'''<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
* {{ box-sizing: border-box; }}
body {{ font-family: 'Helvetica Neue', Arial, sans-serif; color: #183153; margin: 0; background: #fff; }}
.page {{ width: 860px; margin: 0 auto; padding: 56px; }}
</style></head><body>
<div class="page">
  <!-- Header -->
  <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:28px;">
    <div>
      <div style="font-size:36px; font-weight:800; color:#20364D; letter-spacing:1px;">KONEKT</div>
      <div style="font-size:12px; color:#6e7f99; margin-top:2px;">B2B Commerce Platform</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:34px; font-weight:700; color:#20364D; margin-bottom:10px;">Invoice</div>
      <div style="font-size:14px; color:#6e7f99; margin-top:4px;">#{inv_number}</div>
      <div style="font-size:14px; color:#6e7f99; margin-top:4px;">Date: {created}</div>
      <div style="display:inline-block; margin-top:14px; padding:8px 16px; border-radius:999px; background:{status_bg}; color:{status_color}; font-size:13px; font-weight:700;">{payment_label}</div>
    </div>
  </div>

  <!-- Divider -->
  <div style="height:3px; background:#203d5c; margin:26px 0 24px 0;"></div>

  <!-- Two columns: Bill To + Payment Info -->
  <div style="display:flex; gap:40px; margin-bottom:28px;">
    <div style="flex:1;">
      <div style="font-size:11px; color:#6e7f99; text-transform:uppercase; letter-spacing:0.05em; font-weight:700; margin-bottom:10px;">Bill To</div>
      <div style="font-size:18px; font-weight:700; margin-bottom:6px;">{billing_name}</div>
      <div style="color:#6e7f99; font-size:14px; line-height:1.7;">
        {billing_email}{'<br/>' + billing_phone if billing_phone else ''}{'<br/>' + billing_address if billing_address else ''}{'<br/>TIN: ' + billing_tin if billing_tin else ''}
      </div>
    </div>
    <div style="flex:1;">
      {payment_info_html}
    </div>
  </div>

  <!-- Line Items Table -->
  <table style="width:100%; border-collapse:collapse; margin-top:6px;">
    <thead>
      <tr>
        <th style="text-align:left; background:#f1f5f9; color:#6e7f99; font-size:12px; padding:12px 16px; text-transform:uppercase; font-weight:700; letter-spacing:0.5px;">Item</th>
        <th style="text-align:center; background:#f1f5f9; color:#6e7f99; font-size:12px; padding:12px 16px; text-transform:uppercase; font-weight:700;">Qty</th>
        <th style="text-align:right; background:#f1f5f9; color:#6e7f99; font-size:12px; padding:12px 16px; text-transform:uppercase; font-weight:700;">Unit Price</th>
        <th style="text-align:right; background:#f1f5f9; color:#6e7f99; font-size:12px; padding:12px 16px; text-transform:uppercase; font-weight:700;">Amount</th>
      </tr>
    </thead>
    <tbody>
      {items_html if items_html else '<tr><td colspan="4" style="padding:20px; text-align:center; color:#94a3b8;">No line items.</td></tr>'}
    </tbody>
  </table>

  <!-- Totals -->
  <div style="width:330px; margin-left:auto; margin-top:20px;">
    <div style="display:flex; justify-content:space-between; padding:8px 0; font-size:16px; color:#6e7f99;">
      <span>Subtotal</span><span style="color:#183153;">TZS {subtotal:,.0f}</span>
    </div>
    <div style="display:flex; justify-content:space-between; padding:8px 0; font-size:16px; color:#6e7f99;">
      <span>VAT</span><span style="color:#183153;">TZS {vat_amount:,.0f}</span>
    </div>
    {'<div style="display:flex; justify-content:space-between; padding:8px 0; font-size:16px; color:#6e7f99;"><span>Amount Paid</span><span style="color:#16794d;">TZS ' + f'{amount_paid:,.0f}' + '</span></div>' if amount_paid > 0 else ''}
    <div style="border-top:3px solid #203d5c; margin-top:6px; padding-top:12px; display:flex; justify-content:space-between; font-size:28px; color:#183153; font-weight:700;">
      <span>{"Balance Due" if amount_paid > 0 else "Total Due"}</span><span>TZS {balance_due if amount_paid > 0 else total:,.0f}</span>
    </div>
  </div>

  <!-- Bank Details -->
  {bank_html}

  <!-- CFO Signature & Stamp -->
  {signature_html}

  <!-- Footer -->
  <div style="border-top:1px solid #e5edf5; margin-top:36px; padding-top:18px; text-align:center; color:#8aa0ba; font-size:12px; line-height:1.8;">
    Thank you for your business. Please include the invoice number as payment reference.<br/>
    Konekt Limited &bull; accounts@konekt.co.tz
  </div>
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
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
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

    branding = await db.business_settings.find_one({"type": "invoice_branding"}) or {}
    pdf_io = html_to_pdf_bytes(render_invoice_html(invoice, branding=branding))
    filename = f'Invoice-{invoice.get("invoice_number", str(invoice.get("_id", ""))[:8])}.pdf'
    return StreamingResponse(
        pdf_io,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
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
    branding = await db.business_settings.find_one({"type": "invoice_branding"}) or {}
    return HTMLResponse(render_invoice_html(invoice, branding=branding))
