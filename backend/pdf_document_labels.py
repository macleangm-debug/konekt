"""
PDF Document Labels Helper
Provides consistent labels and formatting for PDF documents (quotes, invoices).
"""


def tax_label(settings: dict) -> str:
    """Returns the configured tax name or default 'VAT'."""
    return settings.get("tax_name") or "VAT"


def business_identity_lines(settings: dict) -> list:
    """
    Returns a list of formatted business identity lines for PDF headers.
    
    Args:
        settings: Company settings dictionary
        
    Returns:
        List of strings for the business identity section
    """
    lines = []
    
    if settings.get("company_name"):
        lines.append(settings["company_name"])
    
    if settings.get("address_line_1"):
        lines.append(settings["address_line_1"])
    
    if settings.get("address_line_2"):
        lines.append(settings["address_line_2"])
    
    city_country = ", ".join(filter(None, [
        settings.get("city"),
        settings.get("country")
    ]))
    if city_country:
        lines.append(city_country)
    
    if settings.get("email"):
        lines.append(settings["email"])
    
    if settings.get("phone"):
        lines.append(settings["phone"])
    
    if settings.get("tax_number"):
        lines.append(f"TIN: {settings['tax_number']}")
    
    if settings.get("business_registration_number"):
        lines.append(f"BRN: {settings['business_registration_number']}")
    
    return lines


def format_currency(amount: float, currency: str = "TZS") -> str:
    """Format an amount with currency symbol."""
    return f"{currency} {amount:,.2f}"


def payment_terms_label(term_key: str) -> str:
    """Convert payment term key to human-readable label."""
    terms_map = {
        "net_7": "Net 7 Days",
        "net_14": "Net 14 Days",
        "net_15": "Net 15 Days",
        "net_30": "Net 30 Days",
        "net_45": "Net 45 Days",
        "net_60": "Net 60 Days",
        "net_90": "Net 90 Days",
        "due_on_receipt": "Due on Receipt",
        "cod": "Cash on Delivery",
        "50_50": "50% Deposit, 50% on Delivery",
        "30_70": "30% Deposit, 70% on Delivery",
        "custom": "Custom Terms",
    }
    return terms_map.get(term_key, term_key.replace("_", " ").title() if term_key else "-")


def document_status_label(status: str) -> str:
    """Convert document status to human-readable label."""
    status_map = {
        "draft": "Draft",
        "sent": "Sent",
        "viewed": "Viewed",
        "accepted": "Accepted",
        "rejected": "Rejected",
        "expired": "Expired",
        "paid": "Paid",
        "partially_paid": "Partially Paid",
        "overdue": "Overdue",
        "cancelled": "Cancelled",
    }
    return status_map.get(status, status.replace("_", " ").title() if status else "-")
