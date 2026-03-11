"""
Konekt PDF Generator Service - World-Class Professional Documents
Premium Zoho/Stripe/Freshbooks style design
"""
import io
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
import requests

# Premium color palette
NAVY = colors.HexColor("#1F3247")
NAVY_2 = colors.HexColor("#2D3E50")
GOLD = colors.HexColor("#D4A843")
TEXT = colors.HexColor("#0F172A")
MUTED = colors.HexColor("#64748B")
BORDER = colors.HexColor("#E2E8F0")
SOFT = colors.HexColor("#F8FAFC")
WHITE = colors.white


def money(value, currency="TZS"):
    """Format currency value"""
    try:
        value = float(value or 0)
    except Exception:
        value = 0
    return f"{currency} {value:,.0f}"


def fetch_logo(logo_url: str):
    """Fetch company logo from URL"""
    if not logo_url:
        return None
    try:
        response = requests.get(logo_url, timeout=10)
        response.raise_for_status()
        return ImageReader(io.BytesIO(response.content))
    except Exception:
        return None


def draw_header(c, settings, doc_type, number, status):
    """Draw premium branded header with navy bar"""
    width, height = A4

    # Navy header bar
    c.setFillColor(NAVY)
    c.rect(0, height - 38 * mm, width, 38 * mm, stroke=0, fill=1)

    # Company logo
    logo = fetch_logo(settings.get("logo_url"))
    if logo:
        c.drawImage(
            logo,
            18 * mm,
            height - 28 * mm,
            width=24 * mm,
            height=14 * mm,
            preserveAspectRatio=True,
            mask="auto",
        )

    # Document type title
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 21)
    c.drawRightString(width - 18 * mm, height - 18 * mm, doc_type.upper())

    # Document number
    c.setFont("Helvetica-Bold", 10)
    c.drawRightString(width - 18 * mm, height - 26 * mm, number)

    # Status badge
    c.setFillColor(GOLD)
    c.roundRect(width - 62 * mm, height - 34 * mm, 44 * mm, 8 * mm, 3 * mm, stroke=0, fill=1)
    c.setFillColor(TEXT)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(width - 40 * mm, height - 29 * mm, status.upper())


def draw_company_and_billto(c, settings, customer, issue_date, due_date=None, payment_term_label=None):
    """Draw two-column company and bill-to section with TIN/Registration and Payment Terms"""
    width, height = A4
    top_y = height - 55 * mm

    # FROM section (Konekt/Seller)
    c.setFillColor(TEXT)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(18 * mm, top_y, "From")

    c.setFont("Helvetica-Bold", 12)
    c.drawString(18 * mm, top_y - 7 * mm, settings.get("company_name", "Konekt Limited"))

    c.setFont("Helvetica", 9)
    c.setFillColor(MUTED)
    
    # Build company lines including TIN and Registration
    company_lines = [
        settings.get("address_line_1", ""),
        settings.get("address_line_2", ""),
        ", ".join(filter(None, [settings.get("city", ""), settings.get("country", "")])),
        settings.get("email", ""),
        settings.get("phone", ""),
    ]
    
    # Add TIN and Registration numbers
    if settings.get("tin_number"):
        company_lines.append(f"TIN: {settings.get('tin_number')}")
    if settings.get("business_registration_number"):
        company_lines.append(f"Reg No: {settings.get('business_registration_number')}")
    if settings.get("vat_number"):
        company_lines.append(f"VAT: {settings.get('vat_number')}")
    
    company_lines.append(settings.get("website", ""))

    y = top_y - 13 * mm
    for line in company_lines:
        if line:
            c.drawString(18 * mm, y, line)
            y -= 4.5 * mm

    # BILL TO section (Customer/Client)
    c.setFillColor(TEXT)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(95 * mm, top_y, "Bill To")

    c.setFont("Helvetica-Bold", 12)
    c.drawString(95 * mm, top_y - 7 * mm, customer.get("customer_name", ""))

    c.setFont("Helvetica", 9)
    c.setFillColor(MUTED)
    
    # Build customer lines including TIN and Registration
    customer_lines = [
        customer.get("customer_company", ""),
        customer.get("customer_address", ""),
        customer.get("customer_email", ""),
        customer.get("customer_phone", ""),
    ]
    
    # Add customer TIN and Registration
    if customer.get("customer_tin"):
        customer_lines.append(f"TIN: {customer.get('customer_tin')}")
    if customer.get("customer_registration_number"):
        customer_lines.append(f"Reg No: {customer.get('customer_registration_number')}")

    y2 = top_y - 13 * mm
    for line in customer_lines:
        if line:
            c.drawString(95 * mm, y2, str(line))
            y2 -= 4.5 * mm

    # Date and Payment Terms card (expanded to show payment terms)
    card_x = width - 70 * mm
    card_y = top_y - 24 * mm
    card_height = 34 * mm if payment_term_label else 24 * mm
    c.setFillColor(SOFT)
    c.roundRect(card_x, card_y - (10 * mm if payment_term_label else 0), 52 * mm, card_height, 3 * mm, stroke=0, fill=1)

    c.setFillColor(TEXT)
    c.setFont("Helvetica-Bold", 9)
    
    # Adjust positions based on whether we have payment terms
    if payment_term_label:
        c.drawString(card_x + 4 * mm, card_y + 16 * mm, "Issue Date")
        c.drawString(card_x + 4 * mm, card_y + 9 * mm, "Due Date" if due_date else "Valid Until")
        c.drawString(card_x + 4 * mm, card_y + 2 * mm, "Payment Terms")

        c.setFont("Helvetica", 9)
        c.drawRightString(card_x + 47 * mm, card_y + 16 * mm, issue_date or "-")
        c.drawRightString(card_x + 47 * mm, card_y + 9 * mm, due_date or "-")
        c.drawRightString(card_x + 47 * mm, card_y + 2 * mm, payment_term_label[:25] or "-")
    else:
        c.drawString(card_x + 4 * mm, card_y + 16 * mm, "Issue Date")
        c.drawString(card_x + 4 * mm, card_y + 9 * mm, "Due Date" if due_date else "Valid Until")

        c.setFont("Helvetica", 9)
        c.drawRightString(card_x + 43 * mm, card_y + 16 * mm, issue_date or "-")
        c.drawRightString(card_x + 43 * mm, card_y + 9 * mm, due_date or "-")


def draw_items_table(c, items, currency="TZS", start_y=150 * mm):
    """Draw premium line items table"""
    width, _ = A4
    left = 18 * mm
    total_width = width - 36 * mm

    col_desc = 95 * mm
    col_qty = 18 * mm
    col_unit = 35 * mm
    col_total = total_width - (col_desc + col_qty + col_unit)

    y = start_y

    # Table header
    c.setFillColor(NAVY_2)
    c.roundRect(left, y, total_width, 10 * mm, 2 * mm, stroke=0, fill=1)

    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(left + 4 * mm, y + 3.3 * mm, "Description")
    c.drawRightString(left + col_desc + col_qty - 2 * mm, y + 3.3 * mm, "Qty")
    c.drawRightString(left + col_desc + col_qty + col_unit - 2 * mm, y + 3.3 * mm, "Unit Price")
    c.drawRightString(left + total_width - 4 * mm, y + 3.3 * mm, "Amount")

    y -= 9 * mm
    c.setFont("Helvetica", 9)

    # Table rows
    for idx, item in enumerate(items):
        c.setFillColor(SOFT if idx % 2 == 0 else WHITE)
        c.rect(left, y, total_width, 9 * mm, stroke=0, fill=1)

        c.setFillColor(TEXT)
        c.drawString(left + 4 * mm, y + 3.1 * mm, str(item.get("description", ""))[:70])
        c.drawRightString(left + col_desc + col_qty - 2 * mm, y + 3.1 * mm, str(item.get("quantity", 0)))
        c.drawRightString(
            left + col_desc + col_qty + col_unit - 2 * mm,
            y + 3.1 * mm,
            money(item.get("unit_price", 0), currency),
        )
        c.drawRightString(left + total_width - 4 * mm, y + 3.1 * mm, money(item.get("total", 0), currency))

        y -= 9 * mm

    # Bottom border
    c.setStrokeColor(BORDER)
    c.line(left, y + 2 * mm, left + total_width, y + 2 * mm)
    return y


def draw_totals(c, subtotal, tax, discount, total, currency="TZS", tax_rate=18.0, y=58 * mm):
    """Draw premium totals section with tax rate"""
    width, _ = A4
    box_x = width - 75 * mm

    # Totals card
    c.setFillColor(SOFT)
    c.roundRect(box_x, y, 57 * mm, 38 * mm, 4 * mm, stroke=0, fill=1)

    rows = [
        ("Subtotal", subtotal),
        (f"VAT ({tax_rate}%)", tax),
        ("Discount", discount),
    ]

    row_y = y + 29 * mm
    c.setFont("Helvetica", 9)
    c.setFillColor(TEXT)

    for label, value in rows:
        c.drawString(box_x + 5 * mm, row_y, label)
        c.drawRightString(box_x + 52 * mm, row_y, money(value, currency))
        row_y -= 6 * mm

    # Gold divider
    c.setStrokeColor(GOLD)
    c.line(box_x + 5 * mm, row_y + 2 * mm, box_x + 52 * mm, row_y + 2 * mm)

    # Total
    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(NAVY)
    c.drawString(box_x + 5 * mm, row_y - 5 * mm, "Total")
    c.drawRightString(box_x + 52 * mm, row_y - 5 * mm, money(total, currency))


def draw_footer(c, settings, notes=None, terms=None):
    """Draw document footer with notes and terms"""
    width, _ = A4

    # Divider line
    c.setStrokeColor(BORDER)
    c.line(18 * mm, 42 * mm, width - 18 * mm, 42 * mm)

    # Notes
    c.setFillColor(TEXT)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(18 * mm, 35 * mm, "Notes")
    c.setFont("Helvetica", 8.5)
    c.setFillColor(MUTED)
    c.drawString(18 * mm, 30 * mm, (notes or "Thank you for your business.")[:140])

    # Terms
    c.setFillColor(TEXT)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(18 * mm, 22 * mm, "Terms")
    c.setFont("Helvetica", 8.5)
    c.setFillColor(MUTED)
    c.drawString(
        18 * mm,
        17 * mm,
        (terms or settings.get("invoice_terms") or "Payment is due according to the agreed terms.")[:170],
    )

    # Payment instructions
    payment = settings.get("payment_instructions")
    if payment:
        c.setFillColor(TEXT)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(110 * mm, 35 * mm, "Payment Instructions")
        c.setFont("Helvetica", 8.5)
        c.setFillColor(MUTED)
        c.drawString(110 * mm, 30 * mm, payment[:90])

    # Generation timestamp
    c.setFont("Helvetica", 8)
    c.setFillColor(MUTED)
    c.drawString(18 * mm, 8 * mm, f"Generated by {settings.get('company_name', 'Konekt Limited')}")
    c.drawRightString(width - 18 * mm, 8 * mm, datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"))


def build_document_pdf(doc_type, doc, settings):
    """Build a premium PDF document (quote or invoice)"""
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

    title = "Invoice" if doc_type == "invoice" else "Quote"
    
    # Get payment term label for display
    payment_term_label = doc.get("payment_term_label", "")

    # Include all customer details for PDF
    customer = {
        "customer_name": doc.get("customer_name", ""),
        "customer_company": doc.get("customer_company", ""),
        "customer_email": doc.get("customer_email", ""),
        "customer_phone": doc.get("customer_phone", ""),
        "customer_address": doc.get("customer_address", ""),
        "customer_tin": doc.get("customer_tin", ""),
        "customer_registration_number": doc.get("customer_registration_number", ""),
    }

    draw_header(c, settings, title, number, status)
    draw_company_and_billto(c, settings, customer, issue_date, due_date, payment_term_label)
    
    # Draw items table and get the Y position after items
    items_end_y = draw_items_table(
        c,
        doc.get("line_items", []),
        doc.get("currency", settings.get("currency", "TZS")),
        start_y=120 * mm,  # Slightly lower to accommodate payment terms card
    )
    
    # Calculate totals Y position based on items
    totals_y = max(items_end_y - 15 * mm, 52 * mm)
    
    draw_totals(
        c,
        doc.get("subtotal", 0),
        doc.get("tax", 0),
        doc.get("discount", 0),
        doc.get("total", 0),
        doc.get("currency", settings.get("currency", "TZS")),
        tax_rate=doc.get("tax_rate", settings.get("default_tax_rate", 18.0)),
        y=totals_y,
    )
    
    # Use payment_term_notes if terms not explicitly set
    terms = doc.get("terms") or doc.get("payment_term_notes")
    draw_footer(c, settings, notes=doc.get("notes"), terms=terms)

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
