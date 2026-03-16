"""
Notification Test Routes
Admin endpoint to test email sending before activation
"""
from fastapi import APIRouter
from notification_events import safe_send_email
from notification_config import RESEND_API_KEY

router = APIRouter(prefix="/api/admin/notifications-test", tags=["Notification Test"])


@router.get("/status")
async def notification_status():
    """Check if notification system is configured"""
    return {
        "resend_configured": bool(RESEND_API_KEY),
        "api_key_preview": RESEND_API_KEY[:8] + "..." if RESEND_API_KEY else None,
    }


@router.post("/send")
async def send_test_email(payload: dict):
    """Send a test email to verify Resend integration"""
    result = safe_send_email(
        to=payload.get("to"),
        subject=payload.get("subject", "Konekt Test Email"),
        html=payload.get("html", """
            <div style="font-family: Arial, sans-serif; padding:20px;">
                <h2 style="color:#20364D;">Resend Integration Test</h2>
                <p>This is a test email from Konekt's notification system.</p>
                <p>If you received this, the integration is working correctly!</p>
            </div>
        """),
    )
    return result
