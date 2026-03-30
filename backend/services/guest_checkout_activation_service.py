from datetime import datetime, timedelta, timezone
import secrets

def build_guest_checkout_account_invite(checkout: dict, customer_user: dict) -> dict:
    token = secrets.token_urlsafe(24)
    return {
        "guest_email": checkout.get("email"),
        "customer_user_id": customer_user.get("id"),
        "checkout_id": checkout.get("id"),
        "request_id": checkout.get("request_id"),
        "invite_token": token,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
    }

def build_guest_activation_url(base_url: str, invite_token: str) -> str:
    return f"{base_url.rstrip('/')}/activate-account?token={invite_token}"
