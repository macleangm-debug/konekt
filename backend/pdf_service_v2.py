"""
Konekt PDF Generator Service v2 - Premium Documents
Better spacing, cleaner right-side info panel, proper logo placeholder,
stronger client/company alignment, totals box not cramped, better footer rhythm
"""
import io
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
import requests

NAVY = colors.HexColor("#20364D")
NAVY_2 = colors.HexColor("#2D3E50")
GOLD = colors.HexColor("#D4A843")
TEXT = colors.HexColor("#0F172A")
MUTED = colors.HexColor("#64748B")
BORDER = colors.HexColor("#E2E8F0")
SOFT = colors.HexColor("#F8FAFC")
WHITE = colors.white
LIGHT_GOLD = colors.HexColor("#F7E7B1")


def money(value, currency="TZS"):
    try:
        value = float(value or 0)
    except Exception:
        value = 0
    return f"{currency} {value:,.0f}"


def fetch_logo(logo_url: str):
    if not logo_url:
        return None
    try:
        res = requests.get(logo_url, timeout=10)
        res.raise_for_status()
        return ImageReader(io.BytesIO(res.content))
    except Exception:
        return None


def draw_logo_or_placeholder(c, x, y, w, h, logo):
    if logo:
        c.drawImage(
            logo,
            x,
            y,
            width=w,
            height=h,
            preserveAspectRatio=True,
            mask="auto",
        )
        return

    c.setStrokeColor(colors.HexColor("#CBD5E1"))
    c.setFillColor(colors.HexColor("#F8FAFC"))
    c.roundRect(x, y, w, h, 3 * mm, stroke=1, fill=1)
    c.setFillColor(colors.HexColor("#64748B"))
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(x + w / 2, y + h / 2 - 1.5 * mm, "LOGO")


def draw_header(c, settings, doc_type, number, status):
    width, height = A4

    c.setFillColor(NAVY)
    c.rect(0, height - 42 * mm, width, 42 * mm, stroke=0, fill=1)

    logo = fetch_logo(settings.get("logo_url"))
    draw_logo_or_placeholder(c, 18 * mm, height - 30 * mm, 26 * mm, 16 * mm, logo)

    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 22)
    c.drawRightString(width - 18 * mm, height - 18 * mm, doc_type.upper())

    c.setFont("Helvetica-Bold", 9)
    c.drawRightString(width - 18 * mm, height - 26 * mm, number)

    badge_width = 34 * mm
    c.setFillColor(GOLD)
    c.roundRect(width - 18 * mm - badge_width, height - 36 * mm, badge_width, 8 * mm, 3 * mm, stroke=0, fill=1)
    c.setFillColor(TEXT)
    c.setFont("Helvetica-Bold", 8.5)
    c.drawCentredString(width - 18 * mm - badge_width / 2, height - 31 * mm, status.upper())


def draw_company_and_customer(c, settings, customer, issue_date, due_date=None):
    width, height = A4
    top_y = height - 58 * mm

    # From
    c.setFillColor(TEXT)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(18 * mm, top_y, "From")

    c.setFont("Helvetica-Bold", 12)
    c.drawString(18 * mm, top_y - 7 * mm, settings.get("company_name", "Konekt Limited"))

    c.setFont("Helvetica", 8.8)
    c.setFillColor(MUTED)

    company_lines = [
        settings.get("address_line_1", ""),
        settings.get("address_line_2", ""),
        ", ".join(filter(None, [settings.get("city", ""), settings.get("country", "")])),
        settings.get("email", ""),
        settings.get("phone", ""),
        settings.get("website", ""),
        f"TIN: {settings.get('tin_number')}" if settings.get("tin_number") else "",
        f"BRN: {settings.get('business_registration_number')}" if settings.get("business_registration_number") else "",
    ]

    y = top_y - 13 * mm
    for line in company_lines:
        if line:
            c.drawString(18 * mm, y, line)
            y -= 4.2 * mm

    # Bill To
    c.setFillColor(TEXT)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(92 * mm, top_y, "Bill To")

    c.setFont("Helvetica-Bold", 12)
    c.drawString(92 * mm, top_y - 7 * mm, customer.get("customer_name", "") or "-")

    c.setFont("Helvetica", 8.8)
    c.setFillColor(MUTED)

    customer_lines = [
        customer.get("customer_company", ""),
        customer.get("customer_address_line_1", "") or customer.get("customer_address", ""),
        customer.get("customer_address_line_2", ""),
        ", ".join(filter(None, [customer.get("customer_city", ""), customer.get("customer_country", "")])),
        customer.get("customer_email", ""),
        customer.get("customer_phone", ""),
        f"TIN: {customer.get('customer_tin')}" if customer.get("customer_tin") else "",
        f"BRN: {customer.get('customer_registration_number')}" if customer.get("customer_registration_number") else "",
    ]

    y2 = top_y - 13 * mm
    for line in customer_lines:
        if line:
            c.drawString(92 * mm, y2, str(line))
            y2 -= 4.2 * mm

    # Info card
    card_x = width - 70 * mm
    card_y = top_y - 22 * mm
    card_w = 52 * mm
    card_h = 29 * mm

    c.setFillColor(SOFT)
    c.roundRect(card_x, card_y, card_w, card_h, 3 * mm, stroke=0, fill=1)

    c.setFillColor(TEXT)
    c.setFont("Helvetica-Bold", 8.4)
    c.drawString(card_x + 4 * mm, card_y + 21 * mm, "Issue Date")
    c.drawString(card_x + 4 * mm, card_y + 14 * mm, "Due Date" if due_date else "Valid Until")
    c.drawString(card_x + 4 * mm, card_y + 7 * mm, "Payment Terms")

    c.setFont("Helvetica", 8.4)
    c.drawRightString(card_x + card_w - 4 * mm, card_y + 21 * mm, issue_date or "-")
    c.drawRightString(card_x + card_w - 4 * mm, card_y + 14 * mm, due_date or "-")
    c.drawRightString(card_x + card_w - 4 * mm, card_y + 7 * mm, customer.get("payment_term_label", "-") or "-")


def draw_items_table(c, items, currency="TZS", start_y=125 * mm):
    width, _ = A4
    left = 18 * mm
    total_width = width - 36 * mm

    col_desc = 100 * mm
    col_qty = 16 * mm
    col_unit = 28 * mm

    y = start_y

    c.setFillColor(NAVY_2)
    c.roundRect(left, y, total_width, 10 * mm, 2 * mm, stroke=0, fill=1)

    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 8.8)
    c.drawString(left + 4 * mm, y + 3.4 * mm, "Description")
    c.drawRightString(left + col_desc + col_qty - 2 * mm, y + 3.4 * mm, "Qty")
    c.drawRightString(left + col_desc + col_qty + col_unit - 2 * mm, y + 3.4 * mm, "Unit Price")
    c.drawRightString(left + total_width - 4 * mm, y + 3.4 * mm, "Amount")

    y -= 9 * mm
    c.setFont("Helvetica", 8.8)

    for idx, item in enumerate(items):
        c.setFillColor(SOFT if idx % 2 == 0 else WHITE)
        c.rect(left, y, total_width, 8.5 * mm, stroke=0, fill=1)

        c.setFillColor(TEXT)
        c.drawString(left + 4 * mm, y + 3 * mm, str(item.get("description", ""))[:75])
        c.drawRightString(left + col_desc + col_qty - 2 * mm, y + 3 * mm, str(item.get("quantity", 0)))
        c.drawRightString(left + col_desc + col_qty + col_unit - 2 * mm, y + 3 * mm, money(item.get("unit_price", 0), currency))
        c.drawRightString(left + total_width - 4 * mm, y + 3 * mm, money(item.get("total", 0), currency))
        y -= 8.5 * mm

    c.setStrokeColor(BORDER)
    c.line(left, y + 1.5 * mm, left + total_width, y + 1.5 * mm)
    return y


def draw_totals(c, subtotal, tax, discount, total, currency="TZS", tax_label="VAT", y=58 * mm):
    width, _ = A4
    box_x = width - 72 * mm
    box_w = 54 * mm
    box_h = 34 * mm

    c.setFillColor(WHITE)
    c.roundRect(box_x, y, box_w, box_h, 4 * mm, stroke=0, fill=1)
    c.setStrokeColor(BORDER)
    c.roundRect(box_x, y, box_w, box_h, 4 * mm, stroke=1, fill=0)

    rows = [
        ("Subtotal", subtotal),
        (tax_label, tax),
        ("Discount", discount),
    ]

    row_y = y + 25 * mm
    c.setFont("Helvetica", 8.6)
    c.setFillColor(TEXT)

    for label, value in rows:
        c.drawString(box_x + 4 * mm, row_y, label)
        c.drawRightString(box_x + box_w - 4 * mm, row_y, money(value, currency))
        row_y -= 6 * mm

    c.setStrokeColor(GOLD)
    c.line(box_x + 4 * mm, row_y + 2 * mm, box_x + box_w - 4 * mm, row_y + 2 * mm)

    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(NAVY)
    c.drawString(box_x + 4 * mm, row_y - 4 * mm, "Total")
    c.drawRightString(box_x + box_w - 4 * mm, row_y - 4 * mm, money(total, currency))


def draw_footer(c, settings, notes=None, terms=None):
    width, _ = A4
    c.setStrokeColor(BORDER)
    c.line(18 * mm, 38 * mm, width - 18 * mm, 38 * mm)

    c.setFillColor(TEXT)
    c.setFont("Helvetica-Bold", 8.8)
    c.drawString(18 * mm, 31 * mm, "Notes")
    c.setFont("Helvetica", 8.2)
    c.setFillColor(MUTED)
    c.drawString(18 * mm, 26 * mm, (notes or "Thank you for your business.")[:150])

    c.setFillColor(TEXT)
    c.setFont("Helvetica-Bold", 8.8)
    c.drawString(18 * mm, 18 * mm, "Terms")
    c.setFont("Helvetica", 8.2)
    c.setFillColor(MUTED)
    c.drawString(18 * mm, 13 * mm, (terms or settings.get("invoice_terms") or "Payment is due according to agreed terms.")[:180])

    payment = settings.get("payment_instructions")
    if payment:
        c.setFillColor(TEXT)
        c.setFont("Helvetica-Bold", 8.8)
        c.drawString(105 * mm, 31 * mm, "Payment Instructions")
        c.setFont("Helvetica", 8.2)
        c.setFillColor(MUTED)
        c.drawString(105 * mm, 26 * mm, payment[:110])

    c.setFillColor(MUTED)
    c.setFont("Helvetica", 7.6)
    c.drawString(18 * mm, 6 * mm, f"Generated by {settings.get('company_name', 'Konekt Limited')}")
    c.drawRightString(width - 18 * mm, 6 * mm, datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"))


def build_document_pdf(doc_type, doc, settings):
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)

    number = doc.get("invoice_number") or doc.get("quote_number") or doc.get("order_number") or "-"
    status = doc.get("status", "draft")
    issue_date = str(doc.get("created_at", ""))[:10] if doc.get("created_at") else "-"
    due_date = None
    if doc.get("due_date"):
        due_date = str(doc.get("due_date"))[:10]
    elif doc.get("valid_until"):
        due_date = str(doc.get("valid_until"))[:10]

    customer = {
        "customer_name": doc.get("customer_name", ""),
        "customer_company": doc.get("customer_company", ""),
        "customer_email": doc.get("customer_email", ""),
        "customer_phone": doc.get("customer_phone", ""),
        "customer_address": doc.get("customer_address", ""),
        "customer_address_line_1": doc.get("customer_address_line_1", ""),
        "customer_address_line_2": doc.get("customer_address_line_2", ""),
        "customer_city": doc.get("customer_city", ""),
        "customer_country": doc.get("customer_country", ""),
        "customer_tin": doc.get("customer_tin", ""),
        "customer_registration_number": doc.get("customer_registration_number", ""),
        "payment_term_label": doc.get("payment_term_label", ""),
    }

    draw_header(c, settings, "Invoice" if doc_type == "invoice" else "Quote", number, status)
    draw_company_and_customer(c, settings, customer, issue_date, due_date)
    
    items_end_y = draw_items_table(
        c, 
        doc.get("line_items", []), 
        doc.get("currency", settings.get("currency", "TZS")), 
        start_y=118 * mm
    )
    
    totals_y = max(items_end_y - 16 * mm, 54 * mm)
    
    draw_totals(
        c,
        doc.get("subtotal", 0),
        doc.get("tax", 0),
        doc.get("discount", 0),
        doc.get("total", 0),
        doc.get("currency", settings.get("currency", "TZS")),
        tax_label=f"{settings.get('tax_name', 'VAT')} ({doc.get('tax_rate', settings.get('default_tax_rate', 18))}%)",
        y=totals_y,
    )
    draw_footer(
        c,
        settings,
        notes=doc.get("notes"),
        terms=doc.get("payment_term_notes") or doc.get("terms"),
    )

    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer


# Legacy function aliases for backward compatibility
def generate_quote_pdf(quote: dict, settings: dict):
    """Generate a premium quote PDF"""
    return build_document_pdf("quote", quote, settings)


def generate_invoice_pdf(invoice: dict, settings: dict):
    """Generate a premium invoice PDF"""
    return build_document_pdf("invoice", invoice, settings)
