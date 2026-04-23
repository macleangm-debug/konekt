"""
Premium PDF Generator for Commercial Documents
Creates world-class invoices and quotes with Zoho-style layout
"""
from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
    Paragraph,
    Image,
    KeepTogether,
)

from pdf_style_helpers import build_styles, ACCENT, BORDER, LIGHT_BG, SOFT_BG
from pdf_document_labels import business_identity_lines, client_identity_lines, tax_label


def money(v):
    """Format number as money"""
    return f"{float(v or 0):,.0f}"


def build_logo_or_placeholder(settings, width=34 * mm, height=20 * mm):
    """Build logo image or placeholder box"""
    logo_path = settings.get("company_logo_path")
    styles = build_styles()

    if logo_path:
        try:
            return Image(logo_path, width=width, height=height)
        except Exception:
            pass

    placeholder = Table(
        [[Paragraph("LOGO", styles["BodyMuted"])]],
        colWidths=[width],
        rowHeights=[height],
    )
    placeholder.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 0.8, BORDER),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BACKGROUND", (0, 0), (-1, -1), SOFT_BG),
            ]
        )
    )
    return placeholder


def build_identity_block(title, lines, styles):
    """Build From/Bill To identity block"""
    story = [Paragraph(title, styles["BlockHeading"])]
    if not lines:
        story.append(Paragraph("-", styles["BodySmall"]))
    else:
        for line in lines:
            story.append(Paragraph(str(line), styles["BodySmall"]))
    return story


def build_line_items_table(doc, styles):
    """Build premium line items table"""
    items = doc.get("line_items", []) or []
    currency = doc.get("currency", "TZS")

    rows = [[
        Paragraph("Description", styles["BlockHeading"]),
        Paragraph("Qty", styles["BlockHeading"]),
        Paragraph("Unit Price", styles["BlockHeading"]),
        Paragraph("Amount", styles["BlockHeading"]),
    ]]

    for item in items:
        description = item.get("description") or item.get("name") or "-"
        qty = item.get("quantity", 1)
        unit_price = float(item.get("unit_price", 0) or 0)
        amount = float(item.get("total", item.get("amount", qty * unit_price)) or 0)

        rows.append([
            Paragraph(str(description), styles["BodySmall"]),
            Paragraph(str(qty), styles["BodySmall"]),
            Paragraph(f"{currency} {money(unit_price)}", styles["BodySmall"]),
            Paragraph(f"{currency} {money(amount)}", styles["BodySmall"]),
        ])

    table = Table(
        rows,
        colWidths=[88 * mm, 18 * mm, 34 * mm, 34 * mm],
        repeatRows=1,
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), LIGHT_BG),
                ("TEXTCOLOR", (0, 0), (-1, 0), ACCENT),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9.5),
                ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (1, 1), (-1, -1), "CENTER"),
                ("ALIGN", (0, 0), (0, -1), "LEFT"),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return table


def build_totals_table(doc, settings, styles):
    """Build totals summary card"""
    currency = doc.get("currency", "TZS")
    label = tax_label(settings)

    subtotal = float(doc.get("subtotal", 0) or 0)
    tax = float(doc.get("tax", 0) or 0)
    discount = float(doc.get("discount", 0) or 0)
    total = float(doc.get("total", 0) or 0)
    paid_amount = float(doc.get("paid_amount", 0) or doc.get("amount_paid", 0) or 0)
    balance_due = float(doc.get("balance_due", total - paid_amount) or 0)

    rows = [
        [Paragraph("Subtotal", styles["BodySmall"]), Paragraph(f"{currency} {money(subtotal)}", styles["RightMeta"])],
        [Paragraph(label, styles["BodySmall"]), Paragraph(f"{currency} {money(tax)}", styles["RightMeta"])],
        [Paragraph("Discount", styles["BodySmall"]), Paragraph(f"-{currency} {money(discount)}", styles["RightMeta"])],
        [Paragraph("Paid", styles["BodySmall"]), Paragraph(f"{currency} {money(paid_amount)}", styles["RightMeta"])],
        [Paragraph("Balance Due", styles["BlockHeading"]), Paragraph(f"{currency} {money(balance_due)}", styles["RightStrong"])],
    ]

    table = Table(rows, colWidths=[42 * mm, 38 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), SOFT_BG),
                ("BOX", (0, 0), (-1, -1), 0.6, BORDER),
                ("INNERGRID", (0, 0), (-1, -1), 0.3, BORDER),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return table


def format_date(date_val):
    """Safely format date for PDF"""
    if not date_val:
        return "-"
    if hasattr(date_val, "strftime"):
        return date_val.strftime("%Y-%m-%d")
    if isinstance(date_val, str):
        return date_val[:10]
    return str(date_val)[:10]


def generate_commercial_document_pdf(doc, settings, document_type="invoice"):
    """Generate premium PDF for invoice or quote"""
    styles = build_styles()
    buffer = BytesIO()

    pdf = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
    )

    story = []

    # Document title and metadata
    title = "INVOICE" if document_type == "invoice" else "QUOTE"
    number = doc.get("invoice_number") if document_type == "invoice" else doc.get("quote_number")
    issue_date = doc.get("created_at")
    due_date = doc.get("due_date") or doc.get("valid_until")

    # Header left: Logo + Company name
    header_left = [
        build_logo_or_placeholder(settings),
        Spacer(1, 4 * mm),
        Paragraph(settings.get("company_name", "Konekt"), styles["DocTitle"]),
    ]

    # Header right: Document title + meta
    header_right_rows = [
        [Paragraph(title, styles["DocTitle"])],
        [Paragraph(f"Number: {number or '-'}", styles["RightMeta"])],
        [Paragraph(f"Issue Date: {format_date(issue_date)}", styles["RightMeta"])],
        [Paragraph(f"Due Date: {format_date(due_date)}", styles["RightMeta"])],
    ]
    header_right = Table(header_right_rows, colWidths=[55 * mm])
    header_right.setStyle(
        TableStyle([("ALIGN", (0, 0), (-1, -1), "RIGHT")])
    )

    header = Table([[header_left, header_right]], colWidths=[100 * mm, 70 * mm])
    header.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    story.append(header)
    story.append(Spacer(1, 8 * mm))

    # Identity blocks: From / Bill To
    seller_block = build_identity_block("From", business_identity_lines(settings), styles)
    client_block = build_identity_block("Bill To", client_identity_lines(doc), styles)

    identity = Table([[seller_block, client_block]], colWidths=[84 * mm, 84 * mm])
    identity.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, BORDER),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    story.append(identity)
    story.append(Spacer(1, 8 * mm))

    # Line items table
    story.append(build_line_items_table(doc, styles))
    story.append(Spacer(1, 8 * mm))

    # Notes and totals section
    notes = doc.get("notes") or settings.get("default_document_note") or ""
    terms = doc.get("payment_term_label") or doc.get("terms") or settings.get("default_payment_terms") or ""
    instructions = settings.get("payment_instructions") or ""

    notes_block = []
    if notes:
        notes_block.append(Paragraph("Notes", styles["BlockHeading"]))
        notes_block.append(Paragraph(str(notes), styles["BodySmall"]))
        notes_block.append(Spacer(1, 3 * mm))

    if terms:
        notes_block.append(Paragraph("Payment Terms", styles["BlockHeading"]))
        notes_block.append(Paragraph(str(terms), styles["BodySmall"]))
        notes_block.append(Spacer(1, 3 * mm))

    if instructions:
        notes_block.append(Paragraph("Payment Instructions", styles["BlockHeading"]))
        notes_block.append(Paragraph(str(instructions), styles["BodySmall"]))

    # If no notes content, add a spacer
    if not notes_block:
        notes_block.append(Spacer(1, 1))

    notes_table = Table(
        [[notes_block, build_totals_table(doc, settings, styles)]],
        colWidths=[96 * mm, 74 * mm],
    )
    notes_table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    story.append(KeepTogether(notes_table))

    # QR code footer — links back to the hosted document/landing page
    try:
        qr_id = doc.get("id") or number
        if qr_id:
            from pathlib import Path as _Path
            import qrcode
            from qrcode.constants import ERROR_CORRECT_M
            from reportlab.platypus import Image as _RLImage
            qr_dir = _Path("/app/static/qr/invoices") if document_type == "invoice" else _Path("/app/static/qr/quotes")
            qr_dir.mkdir(parents=True, exist_ok=True)
            qr_path = qr_dir / f"{qr_id}.png"
            if not qr_path.exists():
                target_url = (
                    f"https://konekt.co.tz/invoice/{qr_id}" if document_type == "invoice"
                    else f"https://konekt.co.tz/quote/{qr_id}"
                )
                qr_img = qrcode.QRCode(error_correction=ERROR_CORRECT_M, box_size=8, border=2)
                qr_img.add_data(target_url)
                qr_img.make(fit=True)
                qr_img.make_image(fill_color="#20364D", back_color="white").save(qr_path, format="PNG")
            story.append(Spacer(1, 6 * mm))
            qr_row = Table(
                [[
                    Paragraph(
                        f"Scan to view the live {document_type} online.",
                        styles["BodySmall"],
                    ),
                    _RLImage(str(qr_path), width=22 * mm, height=22 * mm),
                ]],
                colWidths=[140 * mm, 28 * mm],
            )
            qr_row.setStyle(TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                ("LINEABOVE", (0, 0), (-1, 0), 0.4, BORDER),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
            ]))
            story.append(qr_row)
    except Exception as _qr_err:
        import logging as _lg
        _lg.getLogger("pdf_commercial").warning("QR attach failed: %s", _qr_err)

    pdf.build(story)
    buffer.seek(0)
    return buffer
