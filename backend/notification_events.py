from resend_live_service import send_resend_email, ResendEmailError
from email_templates_v2 import (
    quote_ready_email,
    invoice_ready_email,
    service_update_email,
    payment_received_email,
)


def safe_send_email(to, subject, html):
    try:
        return send_resend_email(to=to, subject=subject, html=html)
    except ResendEmailError as exc:
        print(f"[EMAIL ERROR] {exc}")
        return {"ok": False, "error": str(exc)}
    except Exception as exc:
        print(f"[EMAIL ERROR] {exc}")
        return {"ok": False, "error": str(exc)}


def notify_quote_ready(quote):
    html = quote_ready_email(
        customer_name=quote.get("customer_name"),
        quote_number=quote.get("quote_number"),
        total=float(quote.get("total", 0) or 0),
        currency=quote.get("currency", "TZS"),
        quote_id=str(quote.get("_id") or quote.get("id")),
    )
    return safe_send_email(
        to=quote.get("customer_email"),
        subject=f"Your Quote {quote.get('quote_number')} is Ready",
        html=html,
    )


def notify_invoice_ready(invoice):
    html = invoice_ready_email(
        customer_name=invoice.get("customer_name"),
        invoice_number=invoice.get("invoice_number"),
        total=float(invoice.get("total", 0) or 0),
        currency=invoice.get("currency", "TZS"),
        invoice_id=str(invoice.get("_id") or invoice.get("id")),
    )
    return safe_send_email(
        to=invoice.get("customer_email"),
        subject=f"Invoice {invoice.get('invoice_number')} is Available",
        html=html,
    )


def notify_service_update(service_request, note=""):
    html = service_update_email(
        customer_name=service_request.get("customer_name"),
        service_title=service_request.get("service_title"),
        status=service_request.get("status"),
        request_id=str(service_request.get("_id") or service_request.get("id")),
        note=note,
    )
    return safe_send_email(
        to=service_request.get("customer_email"),
        subject=f"Update on {service_request.get('service_title')}",
        html=html,
    )


def notify_payment_received(customer_email, customer_name, document_number, amount, currency):
    html = payment_received_email(customer_name, document_number, amount, currency)
    return safe_send_email(
        to=customer_email,
        subject=f"Payment Received for {document_number}",
        html=html,
    )
