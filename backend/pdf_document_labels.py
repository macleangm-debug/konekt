"""
PDF Document Labels
Identity blocks and tax labels for commercial documents
"""


def tax_label(settings: dict) -> str:
    return settings.get("tax_name") or "VAT"


def business_identity_lines(settings: dict):
    """Build business identity lines for PDF"""
    lines = []

    if settings.get("company_name"):
        lines.append(settings["company_name"])

    if settings.get("address_line_1"):
        lines.append(settings["address_line_1"])

    if settings.get("address_line_2"):
        lines.append(settings["address_line_2"])

    city_country = ", ".join(
        [x for x in [settings.get("city"), settings.get("country")] if x]
    )
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


def client_identity_lines(doc: dict):
    """Build client identity lines for PDF"""
    lines = []

    if doc.get("customer_name"):
        lines.append(doc["customer_name"])

    if doc.get("customer_company"):
        lines.append(doc["customer_company"])

    if doc.get("customer_email"):
        lines.append(doc["customer_email"])

    if doc.get("customer_phone"):
        lines.append(doc["customer_phone"])

    if doc.get("customer_tin") or doc.get("client_tin"):
        lines.append(f"TIN: {doc.get('customer_tin') or doc.get('client_tin')}")

    if doc.get("customer_registration_number") or doc.get("client_brn"):
        lines.append(f"BRN: {doc.get('customer_registration_number') or doc.get('client_brn')}")

    address_parts = [
        doc.get("customer_address") or doc.get("customer_address_line_1"),
        doc.get("customer_address_line_2"),
        doc.get("customer_city"),
        doc.get("customer_country"),
    ]
    address = ", ".join([x for x in address_parts if x])
    if address:
        lines.append(address)

    return lines
