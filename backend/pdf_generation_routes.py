"""
Konekt Premium Document Templates — Invoice, Quote, Order
Settings-driven, Zoho-level quality, unified brand family
"""
import os
from io import BytesIO
from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse, HTMLResponse

router = APIRouter(prefix="/api/pdf", tags=["PDF Generation"])

# ── Konekt brand palette ──
NAVY = "#20364D"
NAVY_LIGHT = "#2f526f"
GOLD = "#D4A843"
SLATE = "#64748b"
LIGHT_BG = "#f8fafc"

def _env_bank():
    return {
        "bank_name": os.environ.get("BANK_NAME", ""),
        "account_name": os.environ.get("BANK_ACCOUNT_NAME", ""),
        "account_number": os.environ.get("BANK_ACCOUNT_NUMBER", ""),
        "branch": os.environ.get("BANK_BRANCH", ""),
        "swift_code": os.environ.get("BANK_SWIFT_CODE", ""),
        "currency": os.environ.get("BANK_CURRENCY", "TZS"),
    }

def _money(v):
    return f"TZS {int(v or 0):,}"

def _date(v):
    if not v: return "-"
    return str(v)[:10]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SHARED TEMPLATE BLOCKS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def _css():
    return f'''
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{ font-family: 'Helvetica Neue', Arial, sans-serif; color: {NAVY}; background: #fff; }}
    .page {{ width: 794px; max-width: 100%; margin: 0 auto; overflow: hidden; }}

    /* Multi-page support */
    @page {{
      size: A4;
      margin: 28px 0;
    }}

    .header {{
      position: relative;
      background: {NAVY};
      padding: 42px 48px 38px 48px;
      overflow: hidden;
    }}
    .header::after {{
      content: '';
      position: absolute;
      bottom: -30px;
      right: -40px;
      width: 260px;
      height: 260px;
      border-radius: 50%;
      background: {NAVY_LIGHT};
      opacity: 0.35;
    }}
    .header-inner {{ display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; position: relative; z-index: 1; }}
    .logo {{ font-size: 36px; font-weight: 800; color: #fff; letter-spacing: 2px; }}
    .logo-sub {{ font-size: 11px; color: rgba(255,255,255,0.55); margin-top: 2px; letter-spacing: 0.5px; }}
    .doc-title {{ text-align: right; max-width: 280px; flex-shrink: 0; }}
    .doc-title h1 {{ font-size: 34px; font-weight: 700; color: #fff; margin-bottom: 6px; }}
    .doc-title .meta {{ font-size: 13px; color: rgba(255,255,255,0.7); line-height: 1.7; }}

    .contact-bar {{
      background: {GOLD};
      padding: 10px 48px;
      display: flex;
      gap: 32px;
      font-size: 12px;
      color: {NAVY};
      font-weight: 600;
    }}
    .contact-bar span {{ display: flex; align-items: center; gap: 6px; }}

    .body {{ padding: 36px 48px 28px 48px; }}

    .two-col {{ display: flex; gap: 36px; margin-bottom: 28px; }}
    .col {{ flex: 1; min-width: 0; }}
    .section-label {{ font-size: 10px; text-transform: uppercase; letter-spacing: 1.2px; color: {SLATE}; font-weight: 700; margin-bottom: 10px; }}
    .client-name {{ font-size: 18px; font-weight: 700; margin-bottom: 4px; }}
    .client-detail {{ font-size: 13px; color: {SLATE}; line-height: 1.7; }}

    .status-pill {{
      display: inline-block;
      padding: 6px 18px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }}
    .status-paid {{ background: #dff6e8; color: #16794d; }}
    .status-pending {{ background: #fef3c7; color: #92400e; }}
    .status-review {{ background: #dbeafe; color: #1e40af; }}
    .status-rejected {{ background: #fee2e2; color: #991b1b; }}

    .items-table {{ width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 8px; }}
    .items-table thead {{ display: table-header-group; }}
    .items-table thead th {{
      background: {NAVY};
      color: #fff;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      font-weight: 700;
      padding: 12px 16px;
      text-align: left;
    }}
    .items-table thead th:nth-child(2),
    .items-table thead th:nth-child(3),
    .items-table thead th:last-child {{ text-align: right; }}
    .items-table tbody td {{
      padding: 14px 16px;
      font-size: 14px;
      border-bottom: 1px solid #e5edf5;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }}
    .items-table tbody td:nth-child(2),
    .items-table tbody td:nth-child(3),
    .items-table tbody td:last-child {{ text-align: right; }}
    .items-table tbody tr:nth-child(even) td {{ background: {LIGHT_BG}; }}
    /* Allow table rows to break across pages */
    .items-table tbody tr {{ page-break-inside: avoid; }}

    .totals-wrap {{ display: flex; justify-content: flex-end; margin-top: 20px; }}
    .totals-box {{ width: 320px; max-width: 100%; margin-left: auto; margin-top: 20px; }}
    .totals-row {{ display: flex; justify-content: space-between; padding: 7px 0; font-size: 14px; color: {SLATE}; }}
    .totals-row span:last-child {{ color: {NAVY}; font-weight: 600; }}
    .totals-grand {{
      display: flex;
      justify-content: space-between;
      padding: 14px 20px;
      margin-top: 8px;
      background: {NAVY};
      color: #fff;
      font-size: 20px;
      font-weight: 700;
      border-radius: 10px;
    }}

    .bank-box {{
      background: {LIGHT_BG};
      border: 1px solid #d7e3ee;
      border-radius: 12px;
      padding: 18px 22px;
      margin-top: 28px;
    }}
    .bank-box .section-label {{ margin-bottom: 12px; }}
    .bank-row {{ display: flex; gap: 6px; font-size: 14px; line-height: 1.8; }}
    .bank-row strong {{ display: inline-block; min-width: 140px; color: {SLATE}; }}

    .auth-area {{ display: flex; justify-content: flex-end; gap: 24px; margin-top: 32px; page-break-inside: avoid; align-items: flex-end; }}
    .auth-block {{
      border: 1px solid #d7e3ee;
      border-radius: 12px;
      padding: 18px;
      min-height: 130px;
      background: #fff;
      text-align: center;
    }}
    .auth-block .section-label {{ margin-bottom: 12px; }}
    .sig-line {{ height: 48px; border-bottom: 2px solid #d7e3ee; margin-bottom: 10px; }}
    .sig-name {{ font-size: 14px; font-weight: 700; color: {NAVY}; }}
    .sig-title {{ font-size: 11px; color: {SLATE}; }}
    .signature-img {{ max-width: 140px; max-height: 60px; object-fit: contain; margin-bottom: 8px; }}
    .stamp-img {{ width: 96px; height: 96px; object-fit: contain; margin: 8px auto 0 auto; display: block; }}

    .footer {{
      border-top: 3px solid {NAVY};
      margin-top: 36px;
      padding: 18px 48px;
      text-align: center;
      color: {SLATE};
      font-size: 11px;
      line-height: 1.8;
    }}
    '''


def _header_block(doc_type, doc_number, doc_date, status_label, status_class, branding=None):
    branding = branding or {}
    email = branding.get("contact_email") or "accounts@konekt.co.tz"
    phone = branding.get("contact_phone") or "+255 XXX XXX XXX"
    address = branding.get("contact_address") or "Dar es Salaam, Tanzania"
    return f'''
    <div class="header">
      <div class="header-inner">
        <div>
          <div class="logo">KONEKT</div>
          <div class="logo-sub">B2B Commerce Platform</div>
        </div>
        <div class="doc-title">
          <h1>{doc_type}</h1>
          <div class="meta">
            #{doc_number}<br/>
            Date: {_date(doc_date)}
          </div>
          <div style="margin-top:12px;">
            <span class="status-pill {status_class}">{status_label}</span>
          </div>
        </div>
      </div>
    </div>
    <div class="contact-bar">
      <span>{email}</span>
      <span>{phone}</span>
      <span>{address}</span>
    </div>'''


def _items_table_html(items):
    if not items:
        return '<p style="color:#94a3b8; text-align:center; padding:20px;">No line items.</p>'
    rows = ""
    for i, item in enumerate(items):
        name = item.get("name") or item.get("product_name") or item.get("title") or f"Item {i+1}"
        qty = item.get("quantity", 1)
        price = item.get("price") or item.get("unit_price", 0)
        total = item.get("line_total") or item.get("subtotal") or (qty * price)
        rows += f'<tr><td>{name}</td><td>{qty}</td><td>{_money(price)}</td><td>{_money(total)}</td></tr>'
    return f'''<table class="items-table">
      <thead><tr><th>Description</th><th style="text-align:right">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>{rows}</tbody>
    </table>'''


def _totals_html(subtotal, vat, total, amount_paid=0):
    paid_row = ""
    if amount_paid > 0:
        paid_row = f'<div class="totals-row"><span>Amount Paid</span><span style="color:#16794d">-{_money(amount_paid)}</span></div>'
    balance = total - amount_paid if amount_paid > 0 else total
    label = "Balance Due" if amount_paid > 0 else "Total Due"
    return f'''<div class="totals-box">
      <div class="totals-row"><span>Subtotal</span><span>{_money(subtotal)}</span></div>
      <div class="totals-row"><span>VAT</span><span>{_money(vat)}</span></div>
      {paid_row}
      <div class="totals-grand"><span>{label}</span><span>{_money(balance)}</span></div>
    </div>'''


def _bank_html(bank, reference):
    if not bank.get("bank_name"):
        return ""
    return f'''<div class="bank-box">
      <div class="section-label">Bank Transfer Details</div>
      <div class="bank-row"><strong>Bank:</strong> {bank["bank_name"]}</div>
      <div class="bank-row"><strong>Account Name:</strong> {bank["account_name"]}</div>
      <div class="bank-row"><strong>Account Number:</strong> {bank["account_number"]}</div>
      <div class="bank-row"><strong>Branch:</strong> {bank["branch"]}</div>
      <div class="bank-row"><strong>SWIFT:</strong> {bank["swift_code"]}</div>
      <div class="bank-row"><strong>Reference:</strong> {reference}</div>
    </div>'''


def _auth_html(branding):
    """Settings-driven auth block — shows signature/stamp when enabled regardless of doc status."""
    show_sig = branding.get("show_signature", False)
    show_stamp = branding.get("show_stamp", False)
    if not show_sig and not show_stamp:
        return ""

    sig_block = ""
    if show_sig:
        sig_url = branding.get("cfo_signature_url", "")
        if sig_url and sig_url.startswith("data:"):
            sig_img = f'<img src="{sig_url}" class="signature-img" />'
        elif sig_url:
            sig_img = f'<img src="file:///app/backend{sig_url}" class="signature-img" />'
        else:
            sig_img = '<div class="sig-line"></div>'
        cfo_name = branding.get("cfo_name", "")
        cfo_title = branding.get("cfo_title", "Chief Finance Officer")
        sig_block = f'''<div class="auth-block">
          <div class="section-label">Authorized by</div>
          {sig_img}
          <div class="sig-name">{cfo_name or "Chief Finance Officer"}</div>
          <div class="sig-title">{cfo_title}</div>
        </div>'''

    stamp_block = ""
    if show_stamp:
        stamp_mode = branding.get("stamp_mode", "generated")
        stamp_content = ""
        if stamp_mode == "uploaded" and branding.get("stamp_uploaded_url"):
            stamp_content = f'<img src="file:///app/backend{branding["stamp_uploaded_url"]}" class="stamp-img" />'
        elif stamp_mode == "generated" and branding.get("stamp_preview_url"):
            svg_path = f"/app/backend{branding['stamp_preview_url']}"
            try:
                with open(svg_path, "r") as f:
                    stamp_content = f'<div style="width:96px; height:96px; margin:8px auto 0 auto;">{f.read()}</div>'
            except Exception:
                stamp_content = '<div style="width:96px; height:96px; border:2px dashed #d7e3ee; border-radius:50%; margin:8px auto 0 auto;"></div>'
        else:
            stamp_content = '<div style="width:96px; height:96px; border:2px dashed #d7e3ee; border-radius:50%; margin:8px auto 0 auto;"></div>'

        stamp_block = f'''<div class="auth-block">
          <div class="section-label">Company Stamp</div>
          {stamp_content}
        </div>'''

    return f'<div class="auth-area">{sig_block}{stamp_block}</div>'


def _footer_html():
    return f'''<div class="footer">
      Thank you for choosing Konekt. Please include the document number as payment reference.<br/>
      Konekt Limited &bull; accounts@konekt.co.tz &bull; Dar es Salaam, Tanzania
    </div>'''


def _wrap(css, body_html):
    return f'''<!DOCTYPE html><html><head><meta charset="UTF-8"><style>{css}</style></head><body>{body_html}</body></html>'''


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# INVOICE TEMPLATE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def render_invoice_html(invoice: dict, branding: dict = None):
    bank = _env_bank()
    branding = branding or {}

    inv_number = invoice.get("invoice_number") or str(invoice.get("_id", ""))[:8]
    created = invoice.get("created_at", "")
    items = invoice.get("items", [])
    subtotal = invoice.get("subtotal_amount") or invoice.get("subtotal", 0)
    vat = invoice.get("vat_amount", 0)
    total = invoice.get("total_amount") or invoice.get("total", 0)
    amount_paid = invoice.get("amount_paid", 0)

    ps = invoice.get("payment_status") or invoice.get("status", "pending_payment")
    if ps == "paid":
        sl, sc = "Paid in Full", "status-paid"
    elif ps in ("under_review", "awaiting_review", "payment_under_review"):
        sl, sc = "Under Review", "status-review"
    elif ps in ("proof_rejected", "rejected", "payment_rejected"):
        sl, sc = "Rejected", "status-rejected"
    elif ps == "partially_paid":
        sl, sc = "Partially Paid", "status-pending"
    else:
        sl, sc = "Awaiting Payment", "status-pending"

    billing = invoice.get("billing", {})
    name = billing.get("invoice_client_name") or invoice.get("customer_name", "Customer")
    email = billing.get("invoice_client_email") or invoice.get("customer_email", "")
    phone = billing.get("invoice_client_phone") or invoice.get("customer_phone", "")
    tin = billing.get("invoice_client_tin", "")
    address = invoice.get("billing_address") or billing.get("address", "")

    # Payment info block
    if ps == "paid":
        paid_on = _date(invoice.get("paid_at") or invoice.get("updated_at"))
        method = invoice.get("payment_method", "Bank Transfer")
        pay_info = f'''<div class="section-label">Payment Information</div>
          <div style="color:#16794d; font-weight:700; font-size:15px; margin-bottom:6px;">Paid in Full</div>
          <div class="client-detail"><strong>Date:</strong> {paid_on}<br/><strong>Method:</strong> {method}<br/><strong>Reference:</strong> {inv_number}</div>'''
    else:
        pay_info = f'''<div class="section-label">Payment Information</div>
          <div style="color:#92400e; font-weight:700; font-size:15px; margin-bottom:6px;">{sl}</div>
          <div class="client-detail"><strong>Reference:</strong> {inv_number}<br/><strong>Status:</strong> {sl}</div>'''

    is_finalized = ps in ("paid", "under_review", "issued", "payment_under_review")

    body = f'''
    <div class="page">
      {_header_block("INVOICE", inv_number, created, sl, sc, branding)}
      <div class="body">
        <div class="two-col">
          <div class="col">
            <div class="section-label">Bill To</div>
            <div class="client-name">{name}</div>
            <div class="client-detail">{email}{"<br/>" + phone if phone else ""}{"<br/>" + address if address else ""}{"<br/>TIN: " + tin if tin else ""}</div>
          </div>
          <div class="col">{pay_info}</div>
        </div>
        {_items_table_html(items)}
        {_totals_html(subtotal, vat, total, amount_paid)}
        {_bank_html(bank, inv_number)}
        {_auth_html(branding)}
      </div>
      {_footer_html()}
    </div>'''
    return _wrap(_css(), body)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# QUOTE TEMPLATE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def render_quote_html(quote: dict, branding: dict = None):
    branding = branding or {}
    q_number = quote.get("quote_number") or str(quote.get("_id", ""))[:8]
    created = quote.get("created_at", "")
    valid = quote.get("valid_until", "")
    items = quote.get("items", [])
    subtotal = quote.get("subtotal", 0)
    vat = quote.get("vat_amount", 0)
    total = quote.get("total") or quote.get("total_amount", 0)

    qs = (quote.get("status") or "pending").lower()
    if qs in ("approved", "accepted"):
        sl, sc = "Accepted", "status-paid"
    elif qs == "rejected":
        sl, sc = "Rejected", "status-rejected"
    elif qs == "expired":
        sl, sc = "Expired", "status-pending"
    else:
        sl, sc = "Awaiting Approval", "status-pending"

    name = quote.get("customer_name", "Customer")
    email = quote.get("customer_email", "")
    phone = quote.get("customer_phone", "")
    company = quote.get("customer_company", "")

    quote_info = f'''<div class="section-label">Quote Details</div>
      <div class="client-detail">
        <strong>Date Issued:</strong> {_date(created)}<br/>
        <strong>Valid Until:</strong> {_date(valid)}<br/>
        <strong>Prepared by:</strong> {quote.get("prepared_by") or "Konekt Sales Team"}<br/>
        <strong>Type:</strong> {quote.get("type") or "Product"}
      </div>'''

    body = f'''
    <div class="page">
      {_header_block("QUOTE", q_number, created, sl, sc, branding)}
      <div class="body">
        <div class="two-col">
          <div class="col">
            <div class="section-label">Prepared For</div>
            <div class="client-name">{name}</div>
            {"<div class='client-detail'>" + company + "</div>" if company else ""}
            <div class="client-detail">{email}{"<br/>" + phone if phone else ""}</div>
          </div>
          <div class="col">{quote_info}</div>
        </div>
        {_items_table_html(items)}
        {_totals_html(subtotal, vat, total)}
        {_auth_html(branding)}
      </div>
      <div class="footer">
        This quote is valid until {_date(valid)}. For questions, contact us at accounts@konekt.co.tz<br/>
        Konekt Limited &bull; Dar es Salaam, Tanzania
      </div>
    </div>'''
    return _wrap(_css(), body)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ORDER DOCUMENT TEMPLATE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def render_order_html(order: dict, branding: dict = None):
    branding = branding or {}
    o_number = order.get("order_number") or str(order.get("_id", ""))[:8]
    created = order.get("created_at", "")
    items = order.get("items") or order.get("line_items", [])
    subtotal = order.get("subtotal_amount") or order.get("subtotal", 0)
    vat = order.get("vat_amount", 0)
    total = order.get("total_amount") or order.get("total", 0)

    fs = (order.get("status") or "processing").lower()
    if fs in ("completed", "delivered"):
        sl, sc = "Completed", "status-paid"
    elif fs in ("in_progress", "ready_to_fulfill", "ready"):
        sl, sc = "In Progress", "status-review"
    else:
        sl, sc = "Processing", "status-pending"

    delivery = order.get("delivery", {})
    billing = order.get("billing", {})
    name = delivery.get("client_name") or billing.get("invoice_client_name") or order.get("customer_name", "Customer")
    phone = delivery.get("client_phone") or order.get("customer_phone", "")
    address = delivery.get("address_line", "")

    sales_name = order.get("assigned_sales_name") or "Konekt Sales Team"
    sales_phone = order.get("sales_phone") or "+255 XXX XXX XXX"
    sales_email = order.get("sales_email") or "sales@konekt.co.tz"

    order_info = f'''<div class="section-label">Order Summary</div>
      <div class="client-detail">
        <strong>Order:</strong> {o_number}<br/>
        <strong>Date:</strong> {_date(created)}<br/>
        <strong>Source:</strong> {order.get("type", "Product").capitalize()}<br/>
        <strong>Payment:</strong> {(order.get("payment_status") or "Paid").replace("_"," ").title()}<br/>
        <strong>Fulfillment:</strong> {sl}
      </div>'''

    sales_block = f'''
    <div class="bank-box" style="margin-top:20px;">
      <div class="section-label">Your Sales Contact</div>
      <div style="font-size:16px; font-weight:700; margin-bottom:6px;">{sales_name}</div>
      <div class="client-detail"><strong>Phone:</strong> {sales_phone}<br/><strong>Email:</strong> {sales_email}</div>
    </div>'''

    body = f'''
    <div class="page">
      {_header_block("ORDER", o_number, created, sl, sc, branding)}
      <div class="body">
        <div class="two-col">
          <div class="col">
            <div class="section-label">Customer</div>
            <div class="client-name">{name}</div>
            <div class="client-detail">{phone}{"<br/>" + address if address else ""}</div>
          </div>
          <div class="col">{order_info}</div>
        </div>
        {_items_table_html(items)}
        {_totals_html(subtotal, vat, total)}
        {sales_block}
        {_auth_html(branding)}
      </div>
      {_footer_html()}
    </div>'''
    return _wrap(_css(), body)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PDF CONVERSION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def html_to_pdf_bytes(html: str):
    try:
        from weasyprint import HTML
    except ImportError:
        raise HTTPException(status_code=500, detail="WeasyPrint is not installed")
    pdf_io = BytesIO()
    HTML(string=html).write_pdf(pdf_io)
    pdf_io.seek(0)
    return pdf_io


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ROUTES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async def _find_invoice(db, invoice_id):
    try:
        from bson import ObjectId as OID
        doc = await db.invoices.find_one({"_id": OID(invoice_id)})
        if doc: return doc
    except Exception:
        pass
    doc = await db.invoices.find_one({"id": invoice_id})
    if doc: return doc
    return await db.invoices.find_one({"invoice_number": invoice_id})

async def _find_quote(db, quote_id):
    for coll in [db.quotes, db.quotes_v2]:
        doc = await coll.find_one({"id": quote_id})
        if doc: return doc
        doc = await coll.find_one({"quote_number": quote_id})
        if doc: return doc
    try:
        from bson import ObjectId as OID
        doc = await db.quotes.find_one({"_id": OID(quote_id)})
        if doc: return doc
    except Exception:
        pass
    return None

async def _find_order(db, order_id):
    try:
        from bson import ObjectId as OID
        doc = await db.orders.find_one({"_id": OID(order_id)})
        if doc: return doc
    except Exception:
        pass
    doc = await db.orders.find_one({"id": order_id})
    if doc: return doc
    return await db.orders.find_one({"order_number": order_id})


@router.get("/invoices/{invoice_id}")
async def download_invoice_pdf(invoice_id: str, request: Request):
    db = request.app.mongodb
    invoice = await _find_invoice(db, invoice_id)
    if not invoice: raise HTTPException(404, "Invoice not found")
    branding = await db.business_settings.find_one({"type": "invoice_branding"}) or {}
    pdf_io = html_to_pdf_bytes(render_invoice_html(invoice, branding))
    fn = f'Invoice-{invoice.get("invoice_number", str(invoice.get("_id",""))[:8])}.pdf'
    return StreamingResponse(pdf_io, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{fn}"'})


@router.get("/invoices/{invoice_id}/preview", response_class=HTMLResponse)
async def invoice_preview(invoice_id: str, request: Request):
    db = request.app.mongodb
    invoice = await _find_invoice(db, invoice_id)
    if not invoice: raise HTTPException(404, "Invoice not found")
    branding = await db.business_settings.find_one({"type": "invoice_branding"}) or {}
    return HTMLResponse(render_invoice_html(invoice, branding))


@router.get("/quotes/{quote_id}")
async def download_quote_pdf(quote_id: str, request: Request):
    db = request.app.mongodb
    quote = await _find_quote(db, quote_id)
    if not quote: raise HTTPException(404, "Quote not found")
    branding = await db.business_settings.find_one({"type": "invoice_branding"}) or {}
    pdf_io = html_to_pdf_bytes(render_quote_html(quote, branding))
    fn = f'Quote-{quote.get("quote_number", str(quote.get("_id",""))[:8])}.pdf'
    return StreamingResponse(pdf_io, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{fn}"'})


@router.get("/quotes/{quote_id}/preview", response_class=HTMLResponse)
async def quote_preview(quote_id: str, request: Request):
    db = request.app.mongodb
    quote = await _find_quote(db, quote_id)
    if not quote: raise HTTPException(404, "Quote not found")
    branding = await db.business_settings.find_one({"type": "invoice_branding"}) or {}
    return HTMLResponse(render_quote_html(quote, branding))


@router.get("/orders/{order_id}")
async def download_order_pdf(order_id: str, request: Request):
    db = request.app.mongodb
    order = await _find_order(db, order_id)
    if not order: raise HTTPException(404, "Order not found")
    branding = await db.business_settings.find_one({"type": "invoice_branding"}) or {}
    pdf_io = html_to_pdf_bytes(render_order_html(order, branding))
    fn = f'Order-{order.get("order_number", str(order.get("_id",""))[:8])}.pdf'
    return StreamingResponse(pdf_io, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{fn}"'})


@router.get("/orders/{order_id}/preview", response_class=HTMLResponse)
async def order_preview(order_id: str, request: Request):
    db = request.app.mongodb
    order = await _find_order(db, order_id)
    if not order: raise HTTPException(404, "Order not found")
    branding = await db.business_settings.find_one({"type": "invoice_branding"}) or {}
    return HTMLResponse(render_order_html(order, branding))
