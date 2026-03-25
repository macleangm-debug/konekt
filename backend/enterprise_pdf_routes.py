from io import BytesIO
from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/api/enterprise-docs", tags=["Enterprise PDFs"])

def _defaults():
    return {
        "company_name": "Konekt",
        "logo_url": "/branding/konekt-logo-full.png",
        "icon_url": "/branding/konekt-icon.png",
        "company_email": "hello@konekt.co.tz",
        "company_phone": "+255 000 000 000",
        "company_address": "Dar es Salaam, Tanzania",
        "company_tin": "",
        "company_vat_number": "",
        "quote_footer_note": "Thank you for choosing Konekt.",
        "invoice_footer_note": "Payment terms apply as stated on this document.",
        "order_footer_note": "Order updates will be shared through your account and WhatsApp when enabled.",
    }

async def _branding(db):
    row = await db.platform_settings.find_one({"key": "branding_settings"})
    return {**_defaults(), **row.get("value", {})} if row else _defaults()

def _table(items):
    rows = []
    for item in items:
        name = item.get('name') or item.get('product_name') or 'Item'
        qty = item.get('quantity', 1)
        unit_price = float(item.get('unit_price') or item.get('price', 0) or 0)
        line_total = float(item.get('line_total') or item.get('subtotal') or (qty * unit_price) or 0)
        rows.append(
            f"<tr><td style='padding:12px 8px;border-bottom:1px solid #e2e8f0;'>{name}</td>"
            f"<td style='padding:12px 8px;border-bottom:1px solid #e2e8f0;text-align:right;'>{qty}</td>"
            f"<td style='padding:12px 8px;border-bottom:1px solid #e2e8f0;text-align:right;'>TZS {unit_price:,.0f}</td>"
            f"<td style='padding:12px 8px;border-bottom:1px solid #e2e8f0;text-align:right;'>TZS {line_total:,.0f}</td></tr>"
        )
    return '''
    <table style="width:100%;border-collapse:collapse;margin-top:24px;">
      <thead>
        <tr style="background:#f8fafc;">
          <th style="padding:12px 8px;text-align:left;border-bottom:1px solid #e2e8f0;">Item</th>
          <th style="padding:12px 8px;text-align:right;border-bottom:1px solid #e2e8f0;">Qty</th>
          <th style="padding:12px 8px;text-align:right;border-bottom:1px solid #e2e8f0;">Unit Price</th>
          <th style="padding:12px 8px;text-align:right;border-bottom:1px solid #e2e8f0;">Total</th>
        </tr>
      </thead>
      <tbody>''' + "".join(rows) + '''</tbody>
    </table>
    '''

def _totals(subtotal, vat, total):
    return f'''
    <div style="width:340px;margin-left:auto;margin-top:20px;">
      <div style="display:flex;justify-content:space-between;padding:8px 0;">
        <span style="color:#64748b;">Subtotal</span>
        <span style="font-weight:600;">TZS {float(subtotal or 0):,.0f}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;">
        <span style="color:#64748b;">VAT</span>
        <span style="font-weight:600;">TZS {float(vat or 0):,.0f}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:10px 0;margin-top:8px;border-top:2px solid #20364D;font-size:16px;font-weight:700;">
        <span>Grand Total</span>
        <span>TZS {float(total or 0):,.0f}</span>
      </div>
    </div>
    '''

def _html(title, branding, doc, footer_key):
    footer = branding.get(footer_key, "")
    return f'''
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {{ font-family: 'Helvetica Neue', Arial, sans-serif; color:#20364D; padding:40px; font-size:13px; line-height:1.5; }}
          .muted {{ color:#64748b; }}
        </style>
      </head>
      <body>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #20364D;padding-bottom:18px;">
          <div>
            <div style="font-size:28px;font-weight:700;color:#20364D;">{branding.get("company_name","Konekt")}</div>
            <div class="muted" style="margin-top:4px;">{branding.get("company_address","")}</div>
          </div>
          <div style="text-align:right;">
            <div class="muted">{branding.get("company_phone","")}</div>
            <div class="muted">{branding.get("company_email","")}</div>
            <div class="muted">TIN: {branding.get("company_tin","—")}</div>
            <div class="muted">VAT: {branding.get("company_vat_number","—")}</div>
          </div>
        </div>
        
        <div style="font-size:28px;font-weight:700;margin-top:24px;">{title}</div>
        
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:22px;">
          <div style="border:1px solid #e2e8f0;border-radius:16px;padding:16px;">
            <div><strong>Document #:</strong> {doc.get("doc_number","")}</div>
            <div class="muted" style="margin-top:8px;"><strong>Status:</strong> {doc.get("status","").upper()}</div>
            <div class="muted" style="margin-top:8px;"><strong>Date:</strong> {str(doc.get("created_at",""))[:10]}</div>
          </div>
          <div style="border:1px solid #e2e8f0;border-radius:16px;padding:16px;">
            <div><strong>Client:</strong> {doc.get("customer_name","")}</div>
            <div class="muted" style="margin-top:8px;"><strong>Email:</strong> {doc.get("customer_email","")}</div>
            <div class="muted" style="margin-top:8px;"><strong>Phone:</strong> {doc.get("customer_phone","")}</div>
          </div>
        </div>
        
        {_table(doc.get("items", []))}
        {_totals(doc.get("subtotal") or doc.get("subtotal_amount", doc.get("total", 0)), doc.get("vat_amount", 0), doc.get("total") or doc.get("total_amount", 0))}
        
        <div style="margin-top:36px;border-top:1px solid #e2e8f0;padding-top:16px;color:#64748b;font-size:12px;">
          {footer}
        </div>
      </body>
    </html>
    '''

def _pdf_bytes(html):
    try:
        from weasyprint import HTML
    except Exception:
        raise HTTPException(status_code=500, detail="WeasyPrint is not installed")
    out = BytesIO()
    HTML(string=html, base_url="").write_pdf(out)
    out.seek(0)
    return out

async def _find_quote(db, key):
    doc = await db.quotes.find_one({"id": key})
    if not doc:
        doc = await db.quotes.find_one({"quote_number": key})
    if not doc:
        doc = await db.quotes_v2.find_one({"id": key})
    if not doc:
        doc = await db.quotes_v2.find_one({"quote_number": key})
    if not doc:
        raise HTTPException(status_code=404, detail="Quote not found")
    doc["doc_number"] = doc.get("quote_number", str(doc.get("_id", ""))[:8])
    return doc

async def _find_invoice(db, key):
    doc = await db.invoices_v2.find_one({"id": key})
    if not doc:
        doc = await db.invoices_v2.find_one({"invoice_number": key})
    if not doc:
        raise HTTPException(status_code=404, detail="Invoice not found")
    doc["doc_number"] = doc.get("invoice_number", str(doc.get("_id", ""))[:8])
    return doc

async def _find_order(db, key):
    doc = await db.orders.find_one({"id": key})
    if not doc:
        doc = await db.orders.find_one({"order_number": key})
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")
    doc["doc_number"] = doc.get("order_number", str(doc.get("_id", ""))[:8])
    return doc

@router.get("/quote/{quote_id}/pdf")
async def enterprise_quote_pdf(quote_id: str, request: Request):
    """Download enterprise-branded quote PDF"""
    db = request.app.mongodb
    branding = await _branding(db)
    quote = await _find_quote(db, quote_id)
    pdf = _pdf_bytes(_html("Quotation", branding, quote, "quote_footer_note"))
    name = f'{quote.get("quote_number","quote")}.pdf'
    return StreamingResponse(pdf, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{name}"'})

@router.get("/invoice/{invoice_id}/pdf")
async def enterprise_invoice_pdf(invoice_id: str, request: Request):
    """Download enterprise-branded invoice PDF"""
    db = request.app.mongodb
    branding = await _branding(db)
    invoice = await _find_invoice(db, invoice_id)
    pdf = _pdf_bytes(_html("Invoice", branding, invoice, "invoice_footer_note"))
    name = f'{invoice.get("invoice_number","invoice")}.pdf'
    return StreamingResponse(pdf, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{name}"'})

@router.get("/order/{order_id}/pdf")
async def enterprise_order_pdf(order_id: str, request: Request):
    """Download enterprise-branded order summary PDF"""
    db = request.app.mongodb
    branding = await _branding(db)
    order = await _find_order(db, order_id)
    pdf = _pdf_bytes(_html("Order Summary", branding, order, "order_footer_note"))
    name = f'{order.get("order_number","order")}.pdf'
    return StreamingResponse(pdf, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{name}"'})
