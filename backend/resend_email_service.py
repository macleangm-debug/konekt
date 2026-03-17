import os
import requests
from typing import Optional


RESEND_API_URL = "https://api.resend.com/emails"


def resend_is_configured() -> bool:
    return bool(os.getenv("RESEND_API_KEY")) and bool(os.getenv("RESEND_FROM_EMAIL"))


async def send_resend_email(
    *,
    to_email: str,
    subject: str,
    html: str,
    text: Optional[str] = None,
):
    api_key = os.getenv("RESEND_API_KEY")
    from_email = os.getenv("RESEND_FROM_EMAIL")

    if not api_key or not from_email:
        return {
            "ok": False,
            "reason": "resend_not_configured",
        }

    payload = {
        "from": from_email,
        "to": [to_email],
        "subject": subject,
        "html": html,
    }

    if text:
        payload["text"] = text

    try:
        response = requests.post(
            RESEND_API_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=30,
        )

        if response.status_code >= 400:
            return {
                "ok": False,
                "reason": "resend_request_failed",
                "status_code": response.status_code,
                "response": response.text,
            }

        return {
            "ok": True,
            "response": response.json(),
        }
    except Exception as e:
        return {
            "ok": False,
            "reason": "resend_exception",
            "error": str(e),
        }
