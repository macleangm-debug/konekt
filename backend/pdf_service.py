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

    # Navy header bar - slightly taller for better presence
    c.setFillColor(NAVY)
    c.rect(0, height - 42 * mm, width, 42 * mm, stroke=0, fill=1)

    # Company logo - larger and better positioned
    logo = fetch_logo(settings.get("logo_url"))
    if logo:
        c.drawImage(
            logo,
            18 * mm,
            height - 32 * mm,
            width=28 * mm,
            height=18 * mm,
            preserveAspectRatio=True,
            mask="auto",
        )

    # Document type title - larger, more prominent
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 24)
    c.drawRightString(width - 18 * mm, height - 18 * mm, doc_type.upper())

    # Document number - better spacing
    c.setFont("Helvetica-Bold", 11)
    c.drawRightString(width - 18 * mm, height - 28 * mm, number)

    # Status badge - better positioned
    c.setFillColor(GOLD)
    c.roundRect(width - 65 * mm, height - 38 * mm, 47 * mm, 9 * mm, 3 * mm, stroke=0, fill=1)
    c.setFillColor(TEXT)
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(width - 41.5 * mm, height - 32.5 * mm, status.upper())


def draw_company_and_billto(c, settings, customer, issue_date, due_date=None, payment_term_label=None):
    """Draw two-column company and bill-to section with TIN/Registration and Payment Terms"""
    width, height = A4
    top_y = height - 58 * mm  # Adjusted for taller header

    # FROM section (Konekt/Seller)
    c.setFillColor(TEXT)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(18 * mm, top_y, "FROM")

    c.setFont("Helvetica-Bold", 13)
    c.drawString(18 * mm, top_y - 8 * mm, settings.get("company_name", "Konekt Limited"))

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

    y = top_y - 15 * mm  # Better spacing from company name
    for line in company_lines:
        if line:
            c.drawString(18 * mm, y, line)
            y -= 5 * mm  # Increased line spacing

    # BILL TO section (Customer/Client)
    c.setFillColor(TEXT)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(95 * mm, top_y, "BILL TO")

    c.setFont("Helvetica-Bold", 13)
    c.drawString(95 * mm, top_y - 8 * mm, customer.get("customer_name", ""))

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

    y2 = top_y - 15 * mm
    for line in customer_lines:
        if line:
            c.drawString(95 * mm, y2, str(line))
            y2 -= 5 * mm  # Increased line spacing

    # Date and Payment Terms card (expanded to show payment terms)
    card_x = width - 72 * mm
    card_y = top_y - 26 * mm
    card_height = 38 * mm if payment_term_label else 26 * mm
    c.setFillColor(SOFT)
    c.roundRect(card_x, card_y - (12 * mm if payment_term_label else 0), 54 * mm, card_height, 4 * mm, stroke=0, fill=1)

    c.setFillColor(TEXT)
    c.setFont("Helvetica-Bold", 9)
    
    # Adjust positions based on whether we have payment terms
    if payment_term_label:
        c.drawString(card_x + 5 * mm, card_y + 18 * mm, "Issue Date")
        c.drawString(card_x + 5 * mm, card_y + 10 * mm, "Due Date" if due_date else "Valid Until")
        c.drawString(card_x + 5 * mm, card_y + 2 * mm, "Payment Terms")

        c.setFont("Helvetica", 9)
        c.drawRightString(card_x + 49 * mm, card_y + 18 * mm, issue_date or "-")
        c.drawRightString(card_x + 49 * mm, card_y + 10 * mm, due_date or "-")
        c.drawRightString(card_x + 49 * mm, card_y + 2 * mm, payment_term_label[:25] or "-")
    else:
        c.drawString(card_x + 5 * mm, card_y + 18 * mm, "Issue Date")
        c.drawString(card_x + 5 * mm, card_y + 10 * mm, "Due Date" if due_date else "Valid Until")

        c.setFont("Helvetica", 9)
        c.drawRightString(card_x + 45 * mm, card_y + 18 * mm, issue_date or "-")
        c.drawRightString(card_x + 45 * mm, card_y + 10 * mm, due_date or "-")


def draw_items_table(c, items, currency="TZS", start_y=150 * mm):
    """Draw premium line items table with improved spacing"""
    width, _ = A4
    left = 18 * mm
    total_width = width - 36 * mm

    col_desc = 92 * mm
    col_qty = 20 * mm
    col_unit = 36 * mm
    # col_total calculated but used implicitly for remaining space

    y = start_y

    # Table header - taller with better padding
    c.setFillColor(NAVY_2)
    c.roundRect(left, y, total_width, 12 * mm, 3 * mm, stroke=0, fill=1)

    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(left + 5 * mm, y + 4 * mm, "Description")
    c.drawRightString(left + col_desc + col_qty - 3 * mm, y + 4 * mm, "Qty")
    c.drawRightString(left + col_desc + col_qty + col_unit - 3 * mm, y + 4 * mm, "Unit Price")
    c.drawRightString(left + total_width - 5 * mm, y + 4 * mm, "Amount")

    y -= 11 * mm
    c.setFont("Helvetica", 9)

    # Table rows with improved height
    for idx, item in enumerate(items):
        c.setFillColor(SOFT if idx % 2 == 0 else WHITE)
        c.rect(left, y, total_width, 11 * mm, stroke=0, fill=1)

        c.setFillColor(TEXT)
        c.drawString(left + 5 * mm, y + 4 * mm, str(item.get("description", ""))[:65])
        c.drawRightString(left + col_desc + col_qty - 3 * mm, y + 4 * mm, str(item.get("quantity", 0)))
        c.drawRightString(
            left + col_desc + col_qty + col_unit - 3 * mm,
            y + 4 * mm,
            money(item.get("unit_price", 0), currency),
        )
        c.drawRightString(left + total_width - 5 * mm, y + 4 * mm, money(item.get("total", 0), currency))

        y -= 11 * mm

    # Bottom border
    c.setStrokeColor(BORDER)
    c.line(left, y + 3 * mm, left + total_width, y + 3 * mm)
    return y


def draw_totals(c, subtotal, tax, discount, total, currency="TZS", tax_rate=18.0, y=58 * mm):
    """Draw premium totals section with improved spacing"""
    width, _ = A4
    box_x = width - 78 * mm

    # Totals card - larger with better padding
    c.setFillColor(SOFT)
    c.roundRect(box_x, y, 60 * mm, 42 * mm, 4 * mm, stroke=0, fill=1)

    rows = [
        ("Subtotal", subtotal),
        (f"VAT ({tax_rate}%)", tax),
        ("Discount", discount),
    ]

    row_y = y + 32 * mm
    c.setFont("Helvetica", 10)
    c.setFillColor(TEXT)

    for label, value in rows:
        c.drawString(box_x + 6 * mm, row_y, label)
        c.drawRightString(box_x + 54 * mm, row_y, money(value, currency))
        row_y -= 7 * mm

    # Gold divider - thicker
    c.setStrokeColor(GOLD)
    c.setLineWidth(1.5)
    c.line(box_x + 6 * mm, row_y + 3 * mm, box_x + 54 * mm, row_y + 3 * mm)
    c.setLineWidth(1)

    # Total - larger and bolder
    c.setFont("Helvetica-Bold", 13)
    c.setFillColor(NAVY)
    c.drawString(box_x + 6 * mm, row_y - 6 * mm, "Total")
    c.drawRightString(box_x + 54 * mm, row_y - 6 * mm, money(total, currency))


def draw_footer(c, settings, notes=None, terms=None):
    """Draw document footer with notes and terms - improved layout"""
    width, _ = A4

    # Divider line
    c.setStrokeColor(BORDER)
    c.setLineWidth(0.5)
    c.line(18 * mm, 45 * mm, width - 18 * mm, 45 * mm)

    # Notes section
    c.setFillColor(TEXT)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(18 * mm, 38 * mm, "Notes")
    c.setFont("Helvetica", 9)
    c.setFillColor(MUTED)
    notes_text = notes or "Thank you for your business."
    # Handle longer notes with word wrap
    if len(notes_text) > 80:
        c.drawString(18 * mm, 32 * mm, notes_text[:80])
        c.drawString(18 * mm, 27 * mm, notes_text[80:160])
    else:
        c.drawString(18 * mm, 32 * mm, notes_text[:140])

    # Terms section
    c.setFillColor(TEXT)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(18 * mm, 20 * mm, "Terms & Conditions")
    c.setFont("Helvetica", 9)
    c.setFillColor(MUTED)
    terms_text = terms or settings.get("invoice_terms") or "Payment is due according to the agreed terms."
    if len(terms_text) > 90:
        c.drawString(18 * mm, 14 * mm, terms_text[:90])
        c.drawString(18 * mm, 9 * mm, terms_text[90:180])
    else:
        c.drawString(18 * mm, 14 * mm, terms_text[:170])

    # Payment instructions - moved to right column
    payment = settings.get("payment_instructions")
    if payment:
        c.setFillColor(TEXT)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(112 * mm, 38 * mm, "Payment Instructions")
        c.setFont("Helvetica", 9)
        c.setFillColor(MUTED)
        c.drawString(112 * mm, 32 * mm, payment[:45])
        if len(payment) > 45:
            c.drawString(112 * mm, 27 * mm, payment[45:90])

    # Generation timestamp - more subtle
    c.setFont("Helvetica", 7)
    c.setFillColor(colors.HexColor("#94A3B8"))
    c.drawString(18 * mm, 4 * mm, f"Generated by {settings.get('company_name', 'Konekt Limited')}")
    c.drawRightString(width - 18 * mm, 4 * mm, datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"))


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
    # Adjusted start position for taller header and address sections
    items_end_y = draw_items_table(
        c,
        doc.get("line_items", []),
        doc.get("currency", settings.get("currency", "TZS")),
        start_y=115 * mm,
    )
    
    # Calculate totals Y position based on items
    totals_y = max(items_end_y - 18 * mm, 50 * mm)
    
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
