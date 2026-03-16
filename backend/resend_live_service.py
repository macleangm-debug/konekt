"""
Resend Live Email Service
Send emails via Resend API with graceful fallback
"""
import requests
from notification_config import RESEND_API_KEY, SENDER_EMAIL


class ResendEmailError(Exception):
    pass


def send_resend_email(to, subject, html, cc=None, bcc=None, reply_to=None):
    """
    Send email via Resend API.
    Raises ResendEmailError if API key is missing or request fails.
    """
    if not RESEND_API_KEY:
        raise ResendEmailError("RESEND_API_KEY is not configured")

    payload = {
        "from": SENDER_EMAIL,
        "to": [to] if isinstance(to, str) else to,
        "subject": subject,
        "html": html,
    }

    if cc:
        payload["cc"] = [cc] if isinstance(cc, str) else cc
    if bcc:
        payload["bcc"] = [bcc] if isinstance(bcc, str) else bcc
    if reply_to:
        payload["reply_to"] = reply_to

    response = requests.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=30,
    )

    if response.status_code >= 400:
        raise ResendEmailError(response.text)

    return response.json()
