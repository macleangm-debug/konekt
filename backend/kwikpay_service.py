"""
KwikPay Mobile Money Service Adapter
Placeholder for actual KwikPay API integration
Replace request/response format once official docs are available
"""
from datetime import datetime
import hmac
import hashlib
import json
import requests

from payment_config import (
    KWIKPAY_BASE_URL,
    KWIKPAY_API_KEY,
    KWIKPAY_API_SECRET,
    KWIKPAY_MERCHANT_ID,
    KWIKPAY_RETURN_URL,
    KWIKPAY_CANCEL_URL,
    KWIKPAY_CALLBACK_URL,
)


class KwikPayError(Exception):
    pass


def kwikpay_headers(payload: dict) -> dict:
    """Generate headers with HMAC signature"""
    raw = json.dumps(payload, separators=(",", ":"), sort_keys=True)
    signature = hmac.new(
        KWIKPAY_API_SECRET.encode("utf-8"),
        raw.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    return {
        "Content-Type": "application/json",
        "X-API-KEY": KWIKPAY_API_KEY,
        "X-SIGNATURE": signature,
    }


def create_mobile_money_payment(
    reference: str,
    amount: float,
    currency: str,
    phone_number: str,
    customer_name: str,
    customer_email: str,
    description: str,
):
    """
    Create a mobile money payment request via KwikPay
    NOTE: This is a placeholder structure - update with actual KwikPay API format
    """
    if not KWIKPAY_BASE_URL or not KWIKPAY_API_KEY or not KWIKPAY_API_SECRET:
        raise KwikPayError("KwikPay configuration missing")

    # Placeholder schema - replace with official KwikPay fields
    payload = {
        "merchant_id": KWIKPAY_MERCHANT_ID,
        "reference": reference,
        "amount": amount,
        "currency": currency,
        "phone_number": phone_number,
        "customer": {
            "name": customer_name,
            "email": customer_email,
        },
        "description": description,
        "return_url": KWIKPAY_RETURN_URL,
        "cancel_url": KWIKPAY_CANCEL_URL,
        "callback_url": KWIKPAY_CALLBACK_URL,
        "channel": "mobile_money",
        "created_at": datetime.utcnow().isoformat() + "Z",
    }

    response = requests.post(
        f"{KWIKPAY_BASE_URL.rstrip('/')}/payments",
        headers=kwikpay_headers(payload),
        json=payload,
        timeout=30,
    )

    if response.status_code >= 400:
        raise KwikPayError(f"KwikPay error: {response.text}")

    return response.json()


def verify_kwikpay_signature(raw_body: bytes, signature: str) -> bool:
    """Verify webhook signature from KwikPay"""
    if not KWIKPAY_API_SECRET:
        return False
    computed = hmac.new(
        KWIKPAY_API_SECRET.encode("utf-8"),
        raw_body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(computed, signature or "")
