from fastapi import APIRouter, Request
from resend_email_service import send_resend_email, resend_is_configured
from email_template_service import (
    quote_email_html,
    invoice_email_html,
    payment_received_email_html,
    partner_application_received_html,
    order_confirmation_email_html,
    affiliate_welcome_email_html,
)

router = APIRouter(prefix="/api/launch-emails", tags=["Launch Emails"])


@router.get("/status")
async def email_status():
    return {
        "resend_configured": resend_is_configured(),
    }


@router.post("/send-quote")
async def send_quote_email(payload: dict, request: Request):
    result = await send_resend_email(
        to_email=payload.get("to_email", ""),
        subject=f"Your Quote {payload.get('quote_number', '')}",
        html=quote_email_html(
            customer_name=payload.get("customer_name", ""),
            quote_number=payload.get("quote_number", ""),
        ),
    )
    return result


@router.post("/send-invoice")
async def send_invoice_email(payload: dict, request: Request):
    result = await send_resend_email(
        to_email=payload.get("to_email", ""),
        subject=f"Your Invoice {payload.get('invoice_number', '')}",
        html=invoice_email_html(
            customer_name=payload.get("customer_name", ""),
            invoice_number=payload.get("invoice_number", ""),
        ),
    )
    return result


@router.post("/send-payment-received")
async def send_payment_received_email(payload: dict, request: Request):
    result = await send_resend_email(
        to_email=payload.get("to_email", ""),
        subject=f"Payment Proof Received - {payload.get('reference', '')}",
        html=payment_received_email_html(
            customer_name=payload.get("customer_name", ""),
            reference=payload.get("reference", ""),
        ),
    )
    return result


@router.post("/send-partner-application-received")
async def send_partner_application_received(payload: dict, request: Request):
    result = await send_resend_email(
        to_email=payload.get("to_email", ""),
        subject="Konekt Partner Application Received",
        html=partner_application_received_html(
            company_name=payload.get("company_name", ""),
            country_code=payload.get("country_code", ""),
        ),
    )
    return result


@router.post("/send-order-confirmation")
async def send_order_confirmation(payload: dict, request: Request):
    result = await send_resend_email(
        to_email=payload.get("to_email", ""),
        subject=f"Order Confirmed - {payload.get('order_number', '')}",
        html=order_confirmation_email_html(
            customer_name=payload.get("customer_name", ""),
            order_number=payload.get("order_number", ""),
        ),
    )
    return result


@router.post("/send-affiliate-welcome")
async def send_affiliate_welcome(payload: dict, request: Request):
    result = await send_resend_email(
        to_email=payload.get("to_email", ""),
        subject="Welcome to Konekt Affiliate Program",
        html=affiliate_welcome_email_html(
            affiliate_name=payload.get("affiliate_name", ""),
            affiliate_code=payload.get("affiliate_code", ""),
        ),
    )
    return result
