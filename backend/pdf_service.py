"""
Konekt PDF Generator Service - Zoho-style professional documents
"""
import io
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
import requests


# Color palette
NAVY = colors.HexColor("#2D3E50")
GOLD = colors.HexColor("#D4A843")
LIGHT = colors.HexColor("#F8FAFC")
GRAY = colors.HexColor("#64748B")
DARK = colors.HexColor("#0F172A")


def draw_logo(c, logo_url, x, y, width=32*mm, height=16*mm):
    """Draw company logo from URL"""
    if not logo_url:
        return
    try:
        response = requests.get(logo_url, timeout=8)
        response.raise_for_status()
        image = ImageReader(io.BytesIO(response.content))
        c.drawImage(image, x, y, width=width, height=height, preserveAspectRatio=True, mask='auto')
    except Exception:
        return


def money(value, currency="TZS"):
    """Format currency value"""
    return f"{currency} {value:,.2f}"


def draw_header(c, settings, title, number, status, issue_date, due_date=None):
    """Draw document header with company info and document details"""
    width, height = A4
    
    # Draw logo
    draw_logo(c, settings.get("logo_url"), 20*mm, height - 30*mm)

    # Document title
    c.setFont("Helvetica-Bold", 20)
    c.setFillColor(NAVY)
    c.drawRightString(width - 20*mm, height - 20*mm, title.upper())

    # Document number
    c.setFillColor(DARK)
    c.setFont("Helvetica-Bold", 10)
    c.drawRightString(width - 20*mm, height - 28*mm, number)

    # Status badge
    c.setFillColor(GOLD)
    c.roundRect(width - 60*mm, height - 40*mm, 40*mm, 8*mm, 3*mm, stroke=0, fill=1)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(width - 40*mm, height - 34.5*mm, status.upper())

    # Company name
    c.setFillColor(DARK)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(20*mm, height - 42*mm, settings.get("company_name", "Konekt Limited"))

    # Company address
    c.setFont("Helvetica", 9)
    y = height - 48*mm
    lines = [
        settings.get("address_line_1", ""),
        settings.get("address_line_2", ""),
        ", ".join(filter(None, [settings.get("city", ""), settings.get("country", "")])),
        settings.get("email", ""),
        settings.get("phone", ""),
        settings.get("website", ""),
    ]
    for line in lines:
        if line:
            c.drawString(20*mm, y, line)
            y -= 4.5*mm

    # Date box
    box_x = width - 80*mm
    box_y = height - 70*mm
    c.setFillColor(LIGHT)
    c.roundRect(box_x, box_y, 60*mm, 24*mm, 4*mm, stroke=0, fill=1)

    c.setFillColor(DARK)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(box_x + 5*mm, box_y + 18*mm, "Issue Date")
    c.drawString(box_x + 5*mm, box_y + 11*mm, "Due Date" if due_date else "Valid Until")
    c.setFont("Helvetica", 9)
    c.drawRightString(box_x + 55*mm, box_y + 18*mm, issue_date or "-")
    c.drawRightString(box_x + 55*mm, box_y + 11*mm, due_date or "-")


def draw_customer_block(c, customer):
    """Draw customer/billing information block"""
    width, height = A4
    y = height - 88*mm

    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(NAVY)
    c.drawString(20*mm, y, "Bill To")

    c.setFillColor(DARK)
    c.setFont("Helvetica", 10)
    y -= 6*mm

    lines = [
        customer.get("customer_name", ""),
        customer.get("customer_company", ""),
        customer.get("customer_email", ""),
        customer.get("customer_phone", ""),
    ]
    for line in lines:
        if line:
            c.drawString(20*mm, y, str(line))
            y -= 5*mm


def draw_line_items_table(c, items, currency="TZS", start_y=150*mm):
    """Draw line items table"""
    width, _ = A4
    left = 20*mm
    table_width = width - 40*mm

    col_desc = 95*mm
    col_qty = 20*mm
    col_unit = 35*mm

    y = start_y

    # Table header
    c.setFillColor(NAVY)
    c.roundRect(left, y, table_width, 10*mm, 2*mm, stroke=0, fill=1)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(left + 4*mm, y + 3.3*mm, "Description")
    c.drawRightString(left + col_desc + col_qty - 2*mm, y + 3.3*mm, "Qty")
    c.drawRightString(left + col_desc + col_qty + col_unit - 2*mm, y + 3.3*mm, "Unit Price")
    c.drawRightString(left + table_width - 4*mm, y + 3.3*mm, "Total")

    y -= 9*mm

    # Table rows
    c.setFont("Helvetica", 9)
    c.setFillColor(DARK)

    for idx, item in enumerate(items):
        row_fill = LIGHT if idx % 2 == 0 else colors.white
        c.setFillColor(row_fill)
        c.rect(left, y, table_width, 9*mm, stroke=0, fill=1)

        c.setFillColor(DARK)
        desc = str(item.get("description", ""))[:65]
        c.drawString(left + 4*mm, y + 3.2*mm, desc)
        c.drawRightString(left + col_desc + col_qty - 2*mm, y + 3.2*mm, str(item.get("quantity", 0)))
        c.drawRightString(
            left + col_desc + col_qty + col_unit - 2*mm,
            y + 3.2*mm,
            money(float(item.get("unit_price", 0)), currency)
        )
        c.drawRightString(
            left + table_width - 4*mm,
            y + 3.2*mm,
            money(float(item.get("total", 0)), currency)
        )

        y -= 9*mm

    return y


def draw_totals(c, subtotal, tax, discount, total, currency="TZS", y=70*mm):
    """Draw totals section"""
    width, _ = A4
    box_x = width - 80*mm

    c.setFillColor(LIGHT)
    c.roundRect(box_x, y, 60*mm, 30*mm, 4*mm, stroke=0, fill=1)

    labels = [("Subtotal", subtotal), ("Tax", tax), ("Discount", discount), ("Total", total)]
    row_y = y + 22*mm

    for label, value in labels[:-1]:
        c.setFillColor(DARK)
        c.setFont("Helvetica", 9)
        c.drawString(box_x + 5*mm, row_y, label)
        c.drawRightString(box_x + 55*mm, row_y, money(float(value or 0), currency))
        row_y -= 6*mm

    # Total line
    c.setStrokeColor(GOLD)
    c.line(box_x + 5*mm, row_y + 2*mm, box_x + 55*mm, row_y + 2*mm)

    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(NAVY)
    c.drawString(box_x + 5*mm, row_y - 4*mm, "Total")
    c.drawRightString(box_x + 55*mm, row_y - 4*mm, money(float(total or 0), currency))


def draw_terms_footer(c, settings, notes=None, terms=None):
    """Draw notes, terms, and footer"""
    width, _ = A4
    y = 34*mm

    # Notes
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(NAVY)
    c.drawString(20*mm, y, "Notes")
    c.setFont("Helvetica", 8.5)
    c.setFillColor(DARK)
    c.drawString(20*mm, y - 5*mm, (notes or "Thank you for doing business with us.")[:140])

    # Terms
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(NAVY)
    c.drawString(20*mm, y - 15*mm, "Terms")
    c.setFont("Helvetica", 8.5)
    c.setFillColor(DARK)
    c.drawString(
        20*mm,
        y - 20*mm,
        (terms or settings.get("invoice_terms") or "Payment is due according to the agreed terms.")[:170]
    )

    # Payment instructions
    payment_info = settings.get("payment_instructions")
    if payment_info:
        c.setFont("Helvetica-Bold", 9)
        c.setFillColor(NAVY)
        c.drawString(20*mm, y - 30*mm, "Payment Instructions")
        c.setFont("Helvetica", 8.5)
        c.setFillColor(DARK)
        c.drawString(20*mm, y - 35*mm, payment_info[:170])

    # Footer line
    c.setStrokeColor(colors.HexColor("#E2E8F0"))
    c.line(20*mm, 15*mm, width - 20*mm, 15*mm)
    c.setFont("Helvetica", 8)
    c.setFillColor(GRAY)
    c.drawString(20*mm, 10*mm, f"Generated by {settings.get('company_name', 'Konekt Limited')}")
    c.drawRightString(width - 20*mm, 10*mm, datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"))


def build_document_pdf(doc_type, doc, settings):
    """Build a complete PDF document (quote or invoice)"""
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)

    # Parse dates
    issue_date = ""
    if doc.get("created_at"):
        created = doc["created_at"]
        if hasattr(created, "strftime"):
            issue_date = created.strftime("%Y-%m-%d")
        else:
            issue_date = str(created)[:10]

    due_date = ""
    if doc.get("due_date"):
        dd = doc["due_date"]
        if hasattr(dd, "strftime"):
            due_date = dd.strftime("%Y-%m-%d")
        else:
            due_date = str(dd)[:10]
    elif doc.get("valid_until"):
        vu = doc["valid_until"]
        if hasattr(vu, "strftime"):
            due_date = vu.strftime("%Y-%m-%d")
        else:
            due_date = str(vu)[:10]

    # Document details
    number = doc.get("invoice_number") or doc.get("quote_number") or doc.get("order_number") or "-"
    title = "Invoice" if doc_type == "invoice" else "Quote"
    status = doc.get("status", "draft")

    # Draw all sections
    draw_header(c, settings, title, number, status, issue_date, due_date)
    draw_customer_block(c, doc)
    draw_line_items_table(
        c, 
        doc.get("line_items", []), 
        doc.get("currency", settings.get("currency", "TZS")), 
        start_y=145*mm
    )
    draw_totals(
        c,
        doc.get("subtotal", 0),
        doc.get("tax", 0),
        doc.get("discount", 0),
        doc.get("total", 0),
        doc.get("currency", settings.get("currency", "TZS")),
        y=55*mm,
    )
    draw_terms_footer(c, settings, notes=doc.get("notes"), terms=doc.get("terms"))

    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer
