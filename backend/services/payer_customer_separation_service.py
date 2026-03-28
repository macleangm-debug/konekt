def resolve_customer_name(order_or_invoice: dict) -> str:
    """Customer name comes ONLY from customer/account/business record — never from payer."""
    return (
        order_or_invoice.get("customer_name")
        or (order_or_invoice.get("customer") or {}).get("name")
        or (order_or_invoice.get("account") or {}).get("business_name")
        or order_or_invoice.get("customer_email")
        or "-"
    )

def resolve_payer_name(invoice: dict, proof=None, submission=None) -> str:
    """Payer name comes ONLY from payment proof/submission — never from customer record."""
    return (
        (proof or {}).get("payer_name")
        or (submission or {}).get("payer_name")
        or invoice.get("payer_name")
        or "-"
    )

def apply_invoice_party_fields(invoice: dict, proof=None, submission=None) -> dict:
    """Apply SEPARATED customer_name and payer_name to an invoice dict."""
    invoice["customer_name"] = resolve_customer_name(invoice)
    invoice["payer_name"] = resolve_payer_name(invoice, proof=proof, submission=submission)
    return invoice
