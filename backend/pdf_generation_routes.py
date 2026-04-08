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
    @page {{ size: A4; margin: 28px 0; }}
    .header {{ position: relative; background: {NAVY}; padding: 42px 48px 38px 48px; overflow: hidden; page-break-inside: avoid; break-inside: avoid; }}
    .header::after {{ content: ''; position: absolute; bottom: -30px; right: -40px; width: 260px; height: 260px; border-radius: 50%; background: {NAVY_LIGHT}; opacity: 0.35; }}
    .header-inner {{ display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; position: relative; z-index: 1; }}
    .logo {{ font-size: 36px; font-weight: 800; color: #fff; letter-spacing: 2px; }}
    .logo-sub {{ font-size: 11px; color: rgba(255,255,255,0.55); margin-top: 2px; letter-spacing: 0.5px; }}
    .doc-title {{ text-align: right; max-width: 280px; flex-shrink: 0; }}
    .doc-title h1 {{ font-size: 34px; font-weight: 700; color: #fff; margin-bottom: 6px; }}
    .doc-title .meta {{ font-size: 13px; color: rgba(255,255,255,0.7); line-height: 1.7; }}
    .contact-bar {{ background: {GOLD}; padding: 10px 48px; display: flex; gap: 32px; font-size: 12px; color: {NAVY}; font-weight: 600; }}
    .contact-bar span {{ display: flex; align-items: center; gap: 6px; }}
    .body {{ padding: 36px 48px 28px 48px; }}
    .two-col {{ display: flex; gap: 36px; margin-bottom: 28px; }}
    .col {{ flex: 1; min-width: 0; }}
    .section-label {{ font-size: 10px; text-transform: uppercase; letter-spacing: 1.2px; color: {SLATE}; font-weight: 700; margin-bottom: 10px; }}
    .client-name {{ font-size: 18px; font-weight: 700; margin-bottom: 4px; }}
    .client-detail {{ font-size: 13px; color: {SLATE}; line-height: 1.7; }}
    .status-pill {{ display: inline-block; padding: 6px 18px; border-radius: 999px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }}
    .status-paid {{ background: #dff6e8; color: #16794d; }}
    .status-pending {{ background: #fef3c7; color: #92400e; }}
    .status-review {{ background: #dbeafe; color: #1e40af; }}
    .status-rejected {{ background: #fee2e2; color: #991b1b; }}
    .items-table {{ width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 8px; }}
    .items-table thead {{ display: table-header-group; }}
    .items-table thead th {{ background: {NAVY}; color: #fff; font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700; padding: 12px 16px; text-align: left; }}
    .items-table thead th:nth-child(2), .items-table thead th:nth-child(3), .items-table thead th:last-child {{ text-align: right; }}
    .items-table tbody td {{ padding: 14px 16px; font-size: 14px; border-bottom: 1px solid #e5edf5; word-wrap: break-word; overflow-wrap: break-word; }}
    .items-table tbody td:nth-child(2), .items-table tbody td:nth-child(3), .items-table tbody td:last-child {{ text-align: right; }}
    .items-table tbody tr:nth-child(even) td {{ background: {LIGHT_BG}; }}
    .items-table tbody tr {{ page-break-inside: avoid; }}
    .totals-wrap {{ display: flex; justify-content: flex-end; margin-top: 16px; page-break-inside: avoid; break-inside: avoid; }}
    .totals-box {{ width: 320px; max-width: 100%; }}
    .totals-row {{ display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; color: {SLATE}; }}
    .totals-row span:last-child {{ color: {NAVY}; font-weight: 600; }}
    .totals-grand {{ display: flex; justify-content: space-between; padding: 14px 20px; margin-top: 6px; background: {NAVY}; color: #fff; font-size: 16px; font-weight: 700; border-radius: 10px; }}
    .payment-auth-section {{ display: grid; grid-template-columns: 1fr 260px; gap: 20px; margin-top: 22px; align-items: start; page-break-inside: avoid; break-inside: avoid; }}
    .payment-box {{ border: 1px solid #d7e3ee; background: {LIGHT_BG}; border-radius: 12px; padding: 16px 18px; }}
    .payment-line {{ font-size: 13px; line-height: 1.6; color: {NAVY}; }}
    .payment-line strong {{ display: inline-block; min-width: 120px; color: {SLATE}; }}
    .auth-column {{ display: grid; grid-template-rows: auto auto; gap: 14px; }}
    .signature-block, .stamp-block {{ border: 1px solid #d7e3ee; border-radius: 12px; padding: 12px; background: #fff; text-align: center; page-break-inside: avoid; break-inside: avoid; }}
    .block-title {{ font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: {SLATE}; font-weight: 700; margin-bottom: 8px; }}
    .signature-img {{ max-width: 110px; max-height: 42px; object-fit: contain; display: block; margin: 10px auto 8px auto; }}
    .sig-line {{ height: 42px; border-bottom: 2px solid #d7e3ee; margin-bottom: 8px; }}
    .sig-name {{ font-size: 12px; font-weight: 700; color: {NAVY}; margin-top: 6px; }}
    .sig-title {{ font-size: 11px; color: {SLATE}; }}
    .stamp-img {{ width: 100px; height: 100px; object-fit: contain; display: block; margin: 6px auto 0 auto; }}
    .stamp-decor, .stamp-bg, .large-stamp {{ max-width: 100px !important; max-height: 100px !important; width: 100px !important; height: 100px !important; position: static !important; opacity: 1 !important; }}
    .stamp-img svg {{ width: 100%; height: 100%; }}
    .footer {{ border-top: 1px solid #dfe8f2; margin-top: 18px; padding: 12px 48px; text-align: center; color: {SLATE}; font-size: 11px; line-height: 1.6; }}
    @media print {{
      .page {{ width: 100%; max-width: none; margin: 0; padding: 20mm 14mm 12mm 14mm; }}
      .payment-auth-section, .signature-block, .stamp-block, .footer, .totals-wrap {{ page-break-inside: avoid; break-inside: avoid; }}
    }}
    '''


def _connected_triad_logo_svg():
    """Generate the Connected Triad logo as inline SVG for PDF document headers.
    White variant for dark navy header background."""
    node_color = "#FFFFFF"
    accent_color = "#D4A843"
    conn_color = "rgba(229,231,235,0.85)"
    s = 38
    topX, topY = round(s*0.58,1), round(s*0.13,1)
    leftX, leftY = round(s*0.12,1), round(s*0.82,1)
    rightX, rightY = round(s*0.90,1), round(s*0.72,1)
    accentR = round(max(2.8, s*0.14),1)
    nodeR = round(max(2.2, s*0.108),1)
    sw = round(max(2.0, s*0.062),1)
    rmX = round((topX+rightX)/2 + s*0.06,1)
    rmY = round((topY+rightY)/2 - s*0.04,1)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{s}" height="{s}" viewBox="0 0 {s} {s}" fill="none" style="vertical-align:middle;">
      <line x1="{topX}" y1="{topY}" x2="{leftX}" y2="{leftY}" stroke="{conn_color}" stroke-width="{sw}" stroke-linecap="round"/>
      <path d="M{topX},{topY} Q{rmX},{rmY} {rightX},{rightY}" stroke="{conn_color}" stroke-width="{sw}" stroke-linecap="round" fill="none"/>
      <line x1="{leftX}" y1="{leftY}" x2="{rightX}" y2="{rightY}" stroke="{conn_color}" stroke-width="{sw}" stroke-linecap="round"/>
      <circle cx="{topX}" cy="{topY}" r="{accentR}" fill="{accent_color}"/>
      <circle cx="{leftX}" cy="{leftY}" r="{nodeR}" fill="{node_color}"/>
      <circle cx="{rightX}" cy="{rightY}" r="{nodeR}" fill="{node_color}"/>
    </svg>'''


def _header_block(doc_type, doc_number, doc_date, status_label, status_class, branding=None):
    branding = branding or {}
    email = branding.get("contact_email", "accounts@konekt.co.tz")
    phone = branding.get("contact_phone", "+255 XXX XXX XXX")
    address = branding.get("contact_address", "Dar es Salaam, Tanzania")
    logo_url = branding.get("company_logo_url", "")
    # Use uploaded logo if available, otherwise render Connected Triad SVG + wordmark
    if logo_url:
        logo_html = f'<img src="file:///app/backend{logo_url}" style="height:44px; object-fit:contain;" />'
    else:
        triad_svg = _connected_triad_logo_svg()
        logo_html = f'''<div style="display:flex; align-items:center; gap:10px;">
          {triad_svg}
          <span style="font-size:26px; font-weight:700; color:#fff; letter-spacing:0.02em; font-family:\'Helvetica Neue\',Arial,sans-serif;">Konekt</span>
        </div>'''
    return f'''
    <div class="header">
      <div class="header-inner">
        <div>
          {logo_html}
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
    return f'''<div class="totals-wrap"><div class="totals-box">
      <div class="totals-row"><span>Subtotal</span><span>{_money(subtotal)}</span></div>
      <div class="totals-row"><span>VAT</span><span>{_money(vat)}</span></div>
      {paid_row}
      <div class="totals-grand"><span>{label}</span><span>{_money(balance)}</span></div>
    </div></div>'''


def _auth_column_html(branding):
    """Build the right-side auth column (signature + stamp stacked)."""
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
        sig_block = f'''<div class="signature-block">
          <div class="block-title">Authorized by</div>
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
                    svg_raw = f.read()
                    stamp_content = f'<div class="stamp-img" style="display:flex; align-items:center; justify-content:center; overflow:visible;">{svg_raw}</div>'
            except Exception:
                stamp_content = '<div style="width:100px; height:100px; border:2px dashed #d7e3ee; border-radius:50%; margin:6px auto 0 auto;"></div>'
        else:
            stamp_content = '<div style="width:100px; height:100px; border:2px dashed #d7e3ee; border-radius:50%; margin:6px auto 0 auto;"></div>'
        stamp_block = f'''<div class="stamp-block">
          <div class="block-title">Company Stamp</div>
          {stamp_content}
        </div>'''

    return f'<div class="auth-column">{sig_block}{stamp_block}</div>'


def _payment_auth_html(left_content, branding):
    """Combined payment + authorization section in one grid row."""
    auth_col = _auth_column_html(branding)
    if not left_content and not auth_col:
        return ""
    if not auth_col:
        # Just payment box, no auth
        return f'<div style="margin-top:22px;">{left_content}</div>'
    if not left_content:
        # Only auth, align right
        return f'''<div class="payment-auth-section">
          <div></div>
          {auth_col}
        </div>'''
    return f'''<div class="payment-auth-section">
      {left_content}
      {auth_col}
    </div>'''


def _bank_box_html(bank, reference):
    if not bank.get("bank_name"):
        return ""
    return f'''<div class="payment-box">
      <div class="section-label">Bank Transfer Details</div>
      <div class="payment-line"><strong>Bank:</strong> {bank["bank_name"]}</div>
      <div class="payment-line"><strong>Account Name:</strong> {bank["account_name"]}</div>
      <div class="payment-line"><strong>Account Number:</strong> {bank["account_number"]}</div>
      <div class="payment-line"><strong>Branch:</strong> {bank["branch"]}</div>
      <div class="payment-line"><strong>SWIFT:</strong> {bank["swift_code"]}</div>
      <div class="payment-line"><strong>Reference:</strong> {reference}</div>
    </div>'''


def _footer_html(branding=None):
    branding = branding or {}
    email = branding.get("contact_email", "accounts@konekt.co.tz")
    address = branding.get("contact_address", "Dar es Salaam, Tanzania")
    return f'''<div class="footer">
      Thank you for choosing Konekt. Please include the document number as payment reference.<br/>
      Konekt Limited &bull; {email} &bull; {address}
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

    bank_box = _bank_box_html(bank, inv_number)

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
        {_payment_auth_html(bank_box, branding)}
      </div>
      {_footer_html(branding)}
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

    # For quotes: notes box on left, auth column on right
    notes_box = f'''<div class="payment-box">
      <div class="section-label">Terms &amp; Conditions</div>
      <div class="payment-line">This quote is valid until {_date(valid)}.</div>
      <div class="payment-line">Prices are exclusive of applicable taxes unless stated.</div>
      <div class="payment-line">Contact us at accounts@konekt.co.tz for questions.</div>
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
        {_payment_auth_html(notes_box, branding)}
      </div>
      {_footer_html(branding)}
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
    sales_data = order.get("sales", {})
    if sales_data.get("name"):
        sales_name = sales_data["name"]
    sales_phone = sales_data.get("phone") or order.get("sales_phone") or "+255 XXX XXX XXX"
    sales_email = sales_data.get("email") or order.get("sales_email") or "sales@konekt.co.tz"

    order_info = f'''<div class="section-label">Order Summary</div>
      <div class="client-detail">
        <strong>Order:</strong> {o_number}<br/>
        <strong>Date:</strong> {_date(created)}<br/>
        <strong>Source:</strong> {order.get("type", "Product").capitalize()}<br/>
        <strong>Payment:</strong> {(order.get("payment_status") or "Paid").replace("_"," ").title()}<br/>
        <strong>Fulfillment:</strong> {sl}
      </div>'''

    # Sales contact box on left, auth column on right
    sales_box = f'''<div class="payment-box">
      <div class="section-label">Your Sales Contact</div>
      <div style="font-size:15px; font-weight:700; margin-bottom:6px;">{sales_name}</div>
      <div class="payment-line"><strong>Phone:</strong> {sales_phone}</div>
      <div class="payment-line"><strong>Email:</strong> {sales_email}</div>
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
        {_payment_auth_html(sales_box, branding)}
      </div>
      {_footer_html(branding)}
    </div>'''
    return _wrap(_css(), body)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DELIVERY NOTE TEMPLATE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def _delivery_items_table_html(items):
    if not items:
        return '<p style="color:#94a3b8; text-align:center; padding:20px;">No line items.</p>'
    rows = ""
    for i, item in enumerate(items):
        name = item.get("name") or item.get("product_name") or item.get("title") or f"Item {i+1}"
        sku = item.get("sku", "")
        qty = item.get("quantity", 1)
        unit = item.get("unit", "pcs")
        rows += f'<tr><td>{i+1}</td><td>{name}{"<br/><span style=&quot;font-size:11px;color:" + SLATE + "&quot;>SKU: " + sku + "</span>" if sku else ""}</td><td style="text-align:right">{qty} {unit}</td></tr>'
    return f'''<table class="items-table">
      <thead><tr><th style="width:40px">#</th><th>Item Description</th><th style="text-align:right; width:120px">Qty Delivered</th></tr></thead>
      <tbody>{rows}</tbody>
    </table>'''


def render_delivery_note_html(note: dict, branding: dict = None):
    branding = branding or {}
    dn_number = note.get("note_number") or str(note.get("_id", ""))[:8]
    created = note.get("created_at", "")
    items = note.get("line_items", [])

    status = (note.get("status") or "issued").lower()
    status_map = {
        "issued": ("Issued", "status-review"),
        "in_transit": ("In Transit", "status-pending"),
        "delivered": ("Delivered", "status-paid"),
        "cancelled": ("Cancelled", "status-rejected"),
    }
    sl, sc = status_map.get(status, ("Issued", "status-review"))

    name = note.get("customer_name") or note.get("delivered_to") or "Customer"
    company = note.get("customer_company", "")
    address = note.get("delivery_address", "")
    email = note.get("customer_email", "")

    source_ref = ""
    if note.get("source_type") and note.get("source_id"):
        source_ref = f'<strong>Source:</strong> {note["source_type"].capitalize()} ({note["source_id"][:8]})<br/>'

    delivery_info = f'''<div class="section-label">Delivery Details</div>
      <div class="client-detail">
        <strong>Note No:</strong> {dn_number}<br/>
        <strong>Date:</strong> {_date(created)}<br/>
        {source_ref}
        <strong>Status:</strong> {sl}
      </div>'''

    vehicle = note.get("vehicle_info", "")
    remarks = note.get("remarks", "")
    delivered_by = note.get("delivered_by", "")

    dispatch_box = f'''<div class="payment-box">
      <div class="section-label">Dispatch Information</div>
      {"<div class=&quot;payment-line&quot;><strong>Issued By:</strong> " + delivered_by + "</div>" if delivered_by else ""}
      {"<div class=&quot;payment-line&quot;><strong>Vehicle:</strong> " + vehicle + "</div>" if vehicle else ""}
      {"<div class=&quot;payment-line&quot;><strong>Remarks:</strong> " + remarks + "</div>" if remarks else ""}
      <div class="payment-line" style="margin-top:16px; padding-top:12px; border-top:1px solid #e2e8f0;">
        <strong>Received By:</strong><br/>
        <div style="height:36px; border-bottom:2px solid #d7e3ee; margin:8px 0;"></div>
        <div style="font-size:11px; color:{SLATE};">Name / Signature / Date</div>
      </div>
    </div>'''

    body = f'''
    <div class="page">
      {_header_block("DELIVERY NOTE", dn_number, created, sl, sc, branding)}
      <div class="body">
        <div class="two-col">
          <div class="col">
            <div class="section-label">Deliver To</div>
            <div class="client-name">{name}</div>
            {"<div class=&quot;client-detail&quot;>" + company + "</div>" if company else ""}
            <div class="client-detail">{email}{"<br/>" + address if address else ""}</div>
          </div>
          <div class="col">{delivery_info}</div>
        </div>
        {_delivery_items_table_html(items)}
        {_payment_auth_html(dispatch_box, branding)}
      </div>
      {_footer_html(branding)}
    </div>'''
    return _wrap(_css(), body)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STATEMENT OF ACCOUNT TEMPLATE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def _statement_entries_table_html(entries):
    if not entries:
        return '<p style="color:#94a3b8; text-align:center; padding:20px;">No transactions found.</p>'
    rows = ""
    for entry in entries:
        date_str = _date(entry.get("date"))
        etype = (entry.get("entry_type") or "").capitalize()
        doc_num = entry.get("document_number", "")[:18]
        desc = entry.get("description", "")[:40]
        debit = entry.get("debit", 0)
        credit = entry.get("credit", 0)
        balance = entry.get("balance", 0)
        rows += f'''<tr>
          <td>{date_str}</td>
          <td><span style="display:inline-block; padding:2px 10px; border-radius:999px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; {"background:#dbeafe; color:#1e40af;" if etype == "Invoice" else "background:#dff6e8; color:#16794d;"}">{etype}</span></td>
          <td>{doc_num}</td>
          <td>{desc}</td>
          <td style="text-align:right">{_money(debit) if debit else "-"}</td>
          <td style="text-align:right">{_money(credit) if credit else "-"}</td>
          <td style="text-align:right; font-weight:600">{_money(balance)}</td>
        </tr>'''
    return f'''<table class="items-table" style="table-layout:auto">
      <thead><tr>
        <th style="width:80px">Date</th>
        <th style="width:80px">Type</th>
        <th style="width:100px">Document</th>
        <th>Description</th>
        <th style="text-align:right; width:100px">Debit</th>
        <th style="text-align:right; width:100px">Credit</th>
        <th style="text-align:right; width:100px">Balance</th>
      </tr></thead>
      <tbody>{rows}</tbody>
    </table>'''


def render_statement_html(statement: dict, branding: dict = None):
    branding = branding or {}
    customer_email = statement.get("customer_email", "")
    customer_name = statement.get("customer_name") or customer_email
    customer_company = statement.get("customer_company", "")
    entries = statement.get("entries", [])
    summary = statement.get("summary", {})
    generated_at = statement.get("generated_at") or datetime.now(timezone.utc).isoformat()

    total_invoiced = summary.get("total_invoiced", 0)
    total_paid = summary.get("total_paid", 0)
    balance_due = summary.get("balance_due", 0)

    if balance_due <= 0:
        sl, sc = "Settled", "status-paid"
    elif total_paid > 0:
        sl, sc = "Partially Paid", "status-pending"
    else:
        sl, sc = "Outstanding", "status-pending"

    account_info = f'''<div class="section-label">Account Summary</div>
      <div class="client-detail">
        <strong>Generated:</strong> {_date(generated_at)}<br/>
        <strong>Transactions:</strong> {len(entries)}<br/>
        <strong>Status:</strong> {sl}
      </div>'''

    # Summary totals card
    summary_html = f'''<div style="display:flex; gap:16px; margin-bottom:22px;">
      <div style="flex:1; background:{LIGHT_BG}; border-radius:10px; padding:14px 18px; border:1px solid #e2e8f0;">
        <div style="font-size:10px; text-transform:uppercase; letter-spacing:1px; color:{SLATE}; font-weight:700; margin-bottom:6px;">Total Invoiced</div>
        <div style="font-size:18px; font-weight:700; color:{NAVY};">{_money(total_invoiced)}</div>
      </div>
      <div style="flex:1; background:#dff6e8; border-radius:10px; padding:14px 18px; border:1px solid #b7e6cd;">
        <div style="font-size:10px; text-transform:uppercase; letter-spacing:1px; color:#16794d; font-weight:700; margin-bottom:6px;">Total Paid</div>
        <div style="font-size:18px; font-weight:700; color:#16794d;">{_money(total_paid)}</div>
      </div>
      <div style="flex:1; background:{"#dff6e8" if balance_due <= 0 else "#fef3c7"}; border-radius:10px; padding:14px 18px; border:1px solid {"#b7e6cd" if balance_due <= 0 else "#fde68a"};">
        <div style="font-size:10px; text-transform:uppercase; letter-spacing:1px; color:{"#16794d" if balance_due <= 0 else "#92400e"}; font-weight:700; margin-bottom:6px;">Balance Due</div>
        <div style="font-size:18px; font-weight:700; color:{"#16794d" if balance_due <= 0 else "#92400e"};">{_money(balance_due)}</div>
      </div>
    </div>'''

    auth_col = _auth_column_html(branding)
    auth_section = ""
    if auth_col:
        auth_section = f'''<div style="display:flex; justify-content:flex-end; margin-top:22px; page-break-inside:avoid;">
          {auth_col}
        </div>'''

    body = f'''
    <div class="page">
      {_header_block("STATEMENT", "OF ACCOUNT", generated_at, sl, sc, branding)}
      <div class="body">
        <div class="two-col">
          <div class="col">
            <div class="section-label">Account Holder</div>
            <div class="client-name">{customer_name}</div>
            {"<div class=&quot;client-detail&quot;>" + customer_company + "</div>" if customer_company else ""}
            <div class="client-detail">{customer_email}</div>
          </div>
          <div class="col">{account_info}</div>
        </div>
        {summary_html}
        {_statement_entries_table_html(entries)}
        {auth_section}
      </div>
      {_footer_html(branding)}
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
# HELPERS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async def _get_branding(db):
    """Single source of truth for document branding - reads from business_settings.invoice_branding"""
    return await db.business_settings.find_one({"type": "invoice_branding"}) or {}


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
        # Try ObjectId lookup in both collections
        for coll in [db.quotes, db.quotes_v2]:
            doc = await coll.find_one({"_id": OID(quote_id)})
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

async def _find_delivery_note(db, note_id):
    try:
        from bson import ObjectId as OID
        doc = await db.delivery_notes.find_one({"_id": OID(note_id)})
        if doc: return doc
    except Exception:
        pass
    doc = await db.delivery_notes.find_one({"id": note_id})
    if doc: return doc
    return await db.delivery_notes.find_one({"note_number": note_id})


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ROUTES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.get("/invoices/{invoice_id}")
async def download_invoice_pdf(invoice_id: str, request: Request):
    db = request.app.mongodb
    invoice = await _find_invoice(db, invoice_id)
    if not invoice: raise HTTPException(404, "Invoice not found")
    branding = await _get_branding(db)
    pdf_io = html_to_pdf_bytes(render_invoice_html(invoice, branding))
    fn = f'Invoice-{invoice.get("invoice_number", str(invoice.get("_id",""))[:8])}.pdf'
    return StreamingResponse(pdf_io, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{fn}"'})


@router.get("/invoices/{invoice_id}/preview", response_class=HTMLResponse)
async def invoice_preview(invoice_id: str, request: Request):
    db = request.app.mongodb
    invoice = await _find_invoice(db, invoice_id)
    if not invoice: raise HTTPException(404, "Invoice not found")
    branding = await _get_branding(db)
    return HTMLResponse(render_invoice_html(invoice, branding))


@router.get("/quotes/{quote_id}")
async def download_quote_pdf(quote_id: str, request: Request):
    db = request.app.mongodb
    quote = await _find_quote(db, quote_id)
    if not quote: raise HTTPException(404, "Quote not found")
    branding = await _get_branding(db)
    pdf_io = html_to_pdf_bytes(render_quote_html(quote, branding))
    fn = f'Quote-{quote.get("quote_number", str(quote.get("_id",""))[:8])}.pdf'
    return StreamingResponse(pdf_io, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{fn}"'})


@router.get("/quotes/{quote_id}/preview", response_class=HTMLResponse)
async def quote_preview(quote_id: str, request: Request):
    db = request.app.mongodb
    quote = await _find_quote(db, quote_id)
    if not quote: raise HTTPException(404, "Quote not found")
    branding = await _get_branding(db)
    return HTMLResponse(render_quote_html(quote, branding))


@router.get("/orders/{order_id}")
async def download_order_pdf(order_id: str, request: Request):
    db = request.app.mongodb
    order = await _find_order(db, order_id)
    if not order: raise HTTPException(404, "Order not found")
    branding = await _get_branding(db)
    pdf_io = html_to_pdf_bytes(render_order_html(order, branding))
    fn = f'Order-{order.get("order_number", str(order.get("_id",""))[:8])}.pdf'
    return StreamingResponse(pdf_io, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{fn}"'})


@router.get("/orders/{order_id}/preview", response_class=HTMLResponse)
async def order_preview(order_id: str, request: Request):
    db = request.app.mongodb
    order = await _find_order(db, order_id)
    if not order: raise HTTPException(404, "Order not found")
    branding = await _get_branding(db)
    return HTMLResponse(render_order_html(order, branding))


@router.get("/delivery-notes/{note_id}")
async def download_delivery_note_pdf(note_id: str, request: Request):
    db = request.app.mongodb
    note = await _find_delivery_note(db, note_id)
    if not note: raise HTTPException(404, "Delivery note not found")
    branding = await _get_branding(db)
    pdf_io = html_to_pdf_bytes(render_delivery_note_html(note, branding))
    fn = f'DeliveryNote-{note.get("note_number", str(note.get("_id",""))[:8])}.pdf'
    return StreamingResponse(pdf_io, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{fn}"'})


@router.get("/delivery-notes/{note_id}/preview", response_class=HTMLResponse)
async def delivery_note_preview(note_id: str, request: Request):
    db = request.app.mongodb
    note = await _find_delivery_note(db, note_id)
    if not note: raise HTTPException(404, "Delivery note not found")
    branding = await _get_branding(db)
    return HTMLResponse(render_delivery_note_html(note, branding))


@router.get("/statements/{customer_email}")
async def download_statement_pdf(customer_email: str, request: Request):
    db = request.app.mongodb
    # Build statement data
    invoices = await db.invoices.find({"customer_email": customer_email}).sort("created_at", 1).to_list(length=1000)
    payments = await db.central_payments.find({"customer_email": customer_email}).sort("payment_date", 1).to_list(length=1000)
    customer = await db.b2b_customers.find_one({"email": customer_email}, {"_id": 0})

    entries = []
    total_invoiced = 0.0
    total_paid = 0.0
    for inv in invoices:
        total = float(inv.get("total", 0) or 0)
        total_invoiced += total
        entries.append({"entry_type": "invoice", "date": inv.get("created_at"), "document_number": inv.get("invoice_number"), "description": f"Invoice {inv.get('invoice_number')}", "debit": round(total, 2), "credit": 0.0})
    for payment in payments:
        amount = float(payment.get("amount_received", 0) or 0)
        total_paid += amount
        entries.append({"entry_type": "payment", "date": payment.get("payment_date"), "document_number": payment.get("payment_reference") or str(payment.get("_id", ""))[:8], "description": f"Payment ({payment.get('payment_method', 'Unknown')})", "debit": 0.0, "credit": round(amount, 2)})
    entries = sorted(entries, key=lambda x: str(x.get("date") or ""))
    running = 0.0
    for e in entries:
        running += float(e["debit"] or 0) - float(e["credit"] or 0)
        e["balance"] = round(running, 2)

    statement = {
        "customer_email": customer_email,
        "customer_name": customer.get("contact_name") if customer else None,
        "customer_company": customer.get("company_name") if customer else None,
        "entries": entries,
        "summary": {"total_invoiced": round(total_invoiced, 2), "total_paid": round(total_paid, 2), "balance_due": round(total_invoiced - total_paid, 2)},
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    branding = await _get_branding(db)
    pdf_io = html_to_pdf_bytes(render_statement_html(statement, branding))
    fn = f'Statement-{customer_email.split("@")[0]}.pdf'
    return StreamingResponse(pdf_io, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{fn}"'})


@router.get("/statements/{customer_email}/preview", response_class=HTMLResponse)
async def statement_preview(customer_email: str, request: Request):
    db = request.app.mongodb
    invoices = await db.invoices.find({"customer_email": customer_email}).sort("created_at", 1).to_list(length=1000)
    payments = await db.central_payments.find({"customer_email": customer_email}).sort("payment_date", 1).to_list(length=1000)
    customer = await db.b2b_customers.find_one({"email": customer_email}, {"_id": 0})

    entries = []
    total_invoiced = 0.0
    total_paid = 0.0
    for inv in invoices:
        total = float(inv.get("total", 0) or 0)
        total_invoiced += total
        entries.append({"entry_type": "invoice", "date": inv.get("created_at"), "document_number": inv.get("invoice_number"), "description": f"Invoice {inv.get('invoice_number')}", "debit": round(total, 2), "credit": 0.0})
    for payment in payments:
        amount = float(payment.get("amount_received", 0) or 0)
        total_paid += amount
        entries.append({"entry_type": "payment", "date": payment.get("payment_date"), "document_number": payment.get("payment_reference") or str(payment.get("_id", ""))[:8], "description": f"Payment ({payment.get('payment_method', 'Unknown')})", "debit": 0.0, "credit": round(amount, 2)})
    entries = sorted(entries, key=lambda x: str(x.get("date") or ""))
    running = 0.0
    for e in entries:
        running += float(e["debit"] or 0) - float(e["credit"] or 0)
        e["balance"] = round(running, 2)

    statement = {
        "customer_email": customer_email,
        "customer_name": customer.get("contact_name") if customer else None,
        "customer_company": customer.get("company_name") if customer else None,
        "entries": entries,
        "summary": {"total_invoiced": round(total_invoiced, 2), "total_paid": round(total_paid, 2), "balance_due": round(total_invoiced - total_paid, 2)},
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    branding = await _get_branding(db)
    return HTMLResponse(render_statement_html(statement, branding))
