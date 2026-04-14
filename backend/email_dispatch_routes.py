"""
Email Dispatch Routes
Admin email management: preview templates, test sends, trigger controls.
"""
from fastapi import APIRouter, HTTPException, Request

router = APIRouter(prefix="/api/admin/email", tags=["Email Management"])


@router.get("/preview/{template_type}")
async def preview_template(template_type: str, request: Request):
    """Preview a canonical email template."""
    db = request.app.mongodb
    from services.canonical_email_engine import preview_email_template
    result = await preview_email_template(db, template_type)
    return result


@router.post("/test-send")
async def test_send_email(request: Request):
    """Send a test email to a specified address."""
    db = request.app.mongodb
    body = await request.json()
    to_email = body.get("to_email")
    template_type = body.get("template_type", "order_completed")

    if not to_email:
        raise HTTPException(status_code=400, detail="to_email required")

    from services.canonical_email_engine import send_email
    result = await send_email(
        db, to_email,
        f"Test Email - {template_type}",
        "Test Email Preview",
        '<p style="color:#475569;font-size:15px;">This is a test email to verify your email template and branding settings.</p>',
        None, None
    )
    return result


@router.get("/triggers")
async def get_triggers(request: Request):
    """Get current email trigger settings."""
    db = request.app.mongodb
    from services.canonical_email_engine import get_email_triggers
    triggers = await get_email_triggers(db)
    return {"triggers": triggers}
