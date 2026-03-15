import requests
from notification_config import RESEND_API_KEY, SENDER_EMAIL


class ResendEmailError(Exception):
    pass


def send_resend_email(to, subject, html, cc=None, bcc=None, reply_to=None):
    if not RESEND_API_KEY:
        # Return mock response if no API key configured
        print(f"[MOCK EMAIL] To: {to}, Subject: {subject}")
        return {"id": "mock-email-id", "mock": True}

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
