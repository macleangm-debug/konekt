def resolve_payment_queue_customer_name(row: dict, linked_invoice=None, linked_order=None, linked_checkout=None) -> str:
    return (
        row.get("customer_name")
        or (linked_order or {}).get("customer_name")
        or (linked_invoice or {}).get("customer_name")
        or (linked_checkout or {}).get("customer_name")
        or row.get("customer_email")
        or "-"
    )

def resolve_payment_queue_payer_name(row: dict, proof=None, submission=None) -> str:
    return (
        row.get("payer_name")
        or (proof or {}).get("payer_name")
        or (submission or {}).get("payer_name")
        or "-"
    )

def apply_payment_queue_party_fields(row: dict, linked_invoice=None, linked_order=None, linked_checkout=None, proof=None, submission=None) -> dict:
    row["customer_name"] = resolve_payment_queue_customer_name(row, linked_invoice, linked_order, linked_checkout)
    row["payer_name"] = resolve_payment_queue_payer_name(row, proof, submission)
    return row
