"""
Canonical Email Engine
Settings-driven, brand-consistent, trigger-controlled email system.
Uses Resend API. Pulls branding from Business Settings.
"""
from datetime import datetime, timezone
import os
import traceback

RESEND_API_URL = "https://api.resend.com/emails"
FRONTEND_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://konekt.co.tz")


def _first_name(name):
    """Extract first name for personalization. Fallback to 'Hello' if missing."""
    if not name or not name.strip():
        return ""
    return name.strip().split()[0]


def _greeting(name):
    """Build personalized greeting. 'Hi John,' or 'Hello,'"""
    fn = _first_name(name)
    return f"Hi {fn}," if fn else "Hello,"


async def get_email_branding(db):
    """Pull branding from Business Settings."""
    settings_row = await db.admin_settings.find_one({"key": "settings_hub"})
    settings = settings_row.get("value", {}) if settings_row else {}
    profile = settings.get("business_profile", {})
    branding = settings.get("branding", {})
    sender = settings.get("notification_sender", {})

    return {
        "company_name": profile.get("brand_name") or profile.get("legal_name") or "Konekt",
        "logo_url": branding.get("primary_logo_url", ""),
        "primary_color": branding.get("primary_color", "#20364D"),
        "accent_color": branding.get("accent_color", "#D4A843"),
        "support_email": profile.get("support_email") or sender.get("sender_email") or "support@konekt.co.tz",
        "support_phone": profile.get("support_phone", ""),
        "footer_text": sender.get("email_footer_text", ""),
        "sender_name": sender.get("sender_name") or profile.get("brand_name") or "Konekt",
        "sender_email": os.environ.get("RESEND_FROM_EMAIL", "onboarding@resend.dev"),
        "reply_to": sender.get("sender_email") or profile.get("support_email") or "",
    }


async def get_email_triggers(db):
    """Get email trigger settings."""
    settings_row = await db.admin_settings.find_one({"key": "settings_hub"})
    settings = settings_row.get("value", {}) if settings_row else {}
    return settings.get("email_triggers", {
        "payment_submitted": True,
        "payment_approved": True,
        "order_confirmed": True,
        "order_completed": True,
        "group_deal_joined": True,
        "group_deal_successful": True,
        "withdrawal_approved": True,
        "affiliate_application_approved": True,
        "rating_request": True,
    })


def build_canonical_email(branding, title, body_html, cta_url=None, cta_label=None):
    """Build a canonical email using brand settings."""
    company = branding.get("company_name", "Konekt")
    primary = branding.get("primary_color", "#20364D")
    accent = branding.get("accent_color", "#D4A843")
    logo_url = branding.get("logo_url", "")
    support_email = branding.get("support_email", "")
    support_phone = branding.get("support_phone", "")
    footer_text = branding.get("footer_text", "")

    logo_html = f'<img src="{logo_url}" alt="{company}" style="max-height:40px;max-width:180px;" />' if logo_url else f'<span style="font-size:24px;font-weight:700;color:white;">{company}</span>'

    cta_html = ""
    if cta_url and cta_label:
        cta_html = f'''
        <p style="margin-top:28px;text-align:center;">
          <a href="{cta_url}" style="background:{accent};color:{primary};text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;display:inline-block;">
            {cta_label}
          </a>
        </p>'''

    support_html = ""
    if support_email or support_phone:
        parts = []
        if support_email:
            parts.append(f'<a href="mailto:{support_email}" style="color:#64748b;">{support_email}</a>')
        if support_phone:
            parts.append(support_phone)
        support_html = f'<p style="margin-top:16px;font-size:12px;color:#94a3b8;">Need help? {" | ".join(parts)}</p>'

    footer_extra = f'<p style="font-size:11px;color:#94a3b8;margin-top:8px;">{footer_text}</p>' if footer_text else ""

    return f'''<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f1f5f9;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">
  <div style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <div style="background:{primary};padding:24px 28px;text-align:left;">
      {logo_html}
    </div>
    <div style="padding:32px 28px;">
      <h1 style="margin:0 0 16px;color:{primary};font-size:22px;font-weight:700;">{title}</h1>
      {body_html}
      {cta_html}
      {support_html}
    </div>
    <div style="background:#f8fafc;padding:16px 28px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">&copy; {datetime.now().year} {company}. All rights reserved.</p>
      {footer_extra}
    </div>
  </div>
</div>
</body></html>'''


async def send_email(db, to_email, subject, title, body_html, cta_url=None, cta_label=None):
    """Send a canonical email via Resend."""
    import requests

    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key:
        return {"ok": False, "reason": "resend_not_configured"}

    branding = await get_email_branding(db)
    html = build_canonical_email(branding, title, body_html, cta_url, cta_label)

    payload = {
        "from": f"{branding['sender_name']} <{branding['sender_email']}>",
        "to": [to_email],
        "subject": subject,
        "html": html,
    }
    if branding.get("reply_to"):
        payload["reply_to"] = branding["reply_to"]

    try:
        response = requests.post(
            RESEND_API_URL,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=payload,
            timeout=30,
        )
        if response.status_code >= 400:
            return {"ok": False, "reason": "resend_error", "detail": response.text}
        return {"ok": True, "response": response.json()}
    except Exception as e:
        return {"ok": False, "reason": str(e)}


# ═══ SPECIFIC EMAIL DISPATCHERS ═══

async def send_payment_submitted_email(db, customer_email, customer_name, order_number, amount):
    """Send payment submitted notification."""
    triggers = await get_email_triggers(db)
    if not triggers.get("payment_submitted", True):
        return {"ok": False, "reason": "trigger_disabled"}

    body = f'''
    <p style="color:#475569;font-size:15px;line-height:1.6;">{_greeting(customer_name)}</p>
    <p style="color:#475569;font-size:15px;line-height:1.6;">We have received your payment submission for order <strong>{order_number}</strong>.</p>
    <div style="background:#f8fafc;border-radius:10px;padding:16px;margin:16px 0;">
      <p style="margin:0;font-size:14px;color:#64748b;">Amount: <strong style="color:#20364D;">TZS {amount:,.0f}</strong></p>
      <p style="margin:8px 0 0;font-size:14px;color:#64748b;">Status: <strong style="color:#D97706;">Under Review</strong></p>
    </div>
    <p style="color:#475569;font-size:14px;">Our team will verify your payment shortly. You will receive a confirmation once approved.</p>'''

    return await send_email(db, customer_email, f"Payment Received - {order_number}", "Payment Submitted", body,
                            f"{FRONTEND_URL}/track", "Track Order")


async def send_payment_approved_email(db, customer_email, customer_name, order_number, amount):
    """Send payment approved notification."""
    triggers = await get_email_triggers(db)
    if not triggers.get("payment_approved", True):
        return {"ok": False, "reason": "trigger_disabled"}

    body = f'''
    <p style="color:#475569;font-size:15px;line-height:1.6;">{_greeting(customer_name)}</p>
    <p style="color:#059669;font-size:16px;font-weight:600;">Your payment has been verified and approved!</p>
    <div style="background:#ecfdf5;border-radius:10px;padding:16px;margin:16px 0;">
      <p style="margin:0;font-size:14px;color:#064e3b;">Order: <strong>{order_number}</strong></p>
      <p style="margin:8px 0 0;font-size:14px;color:#064e3b;">Amount: <strong>TZS {amount:,.0f}</strong></p>
      <p style="margin:8px 0 0;font-size:14px;color:#064e3b;">Status: <strong>Approved</strong></p>
    </div>
    <p style="color:#475569;font-size:14px;">Your order is now being processed. We will keep you updated on its progress.</p>'''

    return await send_email(db, customer_email, f"Payment Approved - {order_number}", "Payment Approved", body,
                            f"{FRONTEND_URL}/track", "Track Order")


async def send_order_completed_email(db, customer_email, customer_name, order_number, order_id, staff_name=None, rating_url=None):
    """Send order completed email with rating CTA."""
    triggers = await get_email_triggers(db)
    if not triggers.get("order_completed", True):
        return {"ok": False, "reason": "trigger_disabled"}

    already_sent = await db.email_sent_log.find_one({
        "email": customer_email, "order_id": order_id, "template": "order_completed"
    })
    if already_sent:
        return {"ok": False, "reason": "already_sent"}

    already_rated = await db.customer_ratings.find_one({"order_id": order_id})

    staff_line = ""
    if staff_name:
        staff_line = f'<p style="color:#475569;font-size:15px;line-height:1.6;">Your order was handled by <strong>{staff_name}</strong>.</p>'

    body = f'''
    <p style="color:#475569;font-size:15px;line-height:1.6;">{_greeting(customer_name)}</p>
    <p style="color:#059669;font-size:16px;font-weight:600;">Your order has been successfully completed!</p>
    <div style="background:#ecfdf5;border-radius:10px;padding:16px;margin:16px 0;">
      <p style="margin:0;font-size:14px;color:#064e3b;">Order: <strong>{order_number}</strong></p>
    </div>
    {staff_line}
    <p style="color:#475569;font-size:14px;line-height:1.6;">We'd love to hear about your experience with the service you received.</p>'''

    cta_url = rating_url or f"{FRONTEND_URL}/track"
    cta_label = "Rate Your Experience" if not already_rated else "View Order"

    result = await send_email(db, customer_email, f"Order Completed - {order_number}", "Order Completed", body,
                              cta_url, cta_label)

    if result.get("ok"):
        await db.email_sent_log.insert_one({
            "email": customer_email, "order_id": order_id, "template": "order_completed",
            "sent_at": datetime.now(timezone.utc).isoformat(),
        })

    return result


async def send_group_deal_success_email(db, customer_email, customer_name, deal_title, deal_id):
    """Send group deal success notification."""
    triggers = await get_email_triggers(db)
    if not triggers.get("group_deal_successful", True):
        return {"ok": False, "reason": "trigger_disabled"}

    body = f'''
    <p style="color:#475569;font-size:15px;line-height:1.6;">{_greeting(customer_name)}</p>
    <p style="color:#059669;font-size:16px;font-weight:600;">Great news! The group deal has been successfully reached!</p>
    <div style="background:#ecfdf5;border-radius:10px;padding:16px;margin:16px 0;">
      <p style="margin:0;font-size:14px;color:#064e3b;">Deal: <strong>{deal_title}</strong></p>
    </div>
    <p style="color:#475569;font-size:14px;">Your commitment is confirmed. We will process your order shortly.</p>'''

    return await send_email(db, customer_email, f"Group Deal Successful - {deal_title}", "Group Deal Successful", body,
                            f"{FRONTEND_URL}/track", "Track Your Order")


async def send_affiliate_approved_email(db, affiliate_email, affiliate_name, temp_password=None):
    """Send affiliate application approved notification."""
    triggers = await get_email_triggers(db)
    if not triggers.get("affiliate_application_approved", True):
        return {"ok": False, "reason": "trigger_disabled"}

    pw_line = ""
    if temp_password:
        pw_line = f'''
        <div style="background:#fef3c7;border-radius:10px;padding:16px;margin:16px 0;">
          <p style="margin:0;font-size:14px;color:#92400e;">Your temporary password: <strong>{temp_password}</strong></p>
          <p style="margin:8px 0 0;font-size:12px;color:#92400e;">Please change this after your first login.</p>
        </div>'''

    body = f'''
    <p style="color:#475569;font-size:15px;line-height:1.6;">{_greeting(affiliate_name)}</p>
    <p style="color:#059669;font-size:16px;font-weight:600;">Your affiliate application has been approved!</p>
    <p style="color:#475569;font-size:14px;line-height:1.6;">Welcome to the program. Log in to set up your payout details and create your personal promo code.</p>
    {pw_line}'''

    return await send_email(db, affiliate_email, "Affiliate Application Approved", "Welcome to the Program", body,
                            f"{FRONTEND_URL}/login", "Log In & Set Up")


async def send_rating_request_email(db, customer_email, customer_name, order_number, order_id, staff_name=None, rating_url=None):
    """Send rating request email for completed orders."""
    triggers = await get_email_triggers(db)
    if not triggers.get("rating_request", True):
        return {"ok": False, "reason": "trigger_disabled"}

    already_sent = await db.email_sent_log.find_one({
        "email": customer_email, "order_id": order_id, "template": "rating_request"
    })
    if already_sent:
        return {"ok": False, "reason": "already_sent"}

    already_rated = await db.customer_ratings.find_one({"order_id": order_id})
    if already_rated:
        return {"ok": False, "reason": "already_rated"}

    staff_line = f"Your order was completed by <strong>{staff_name}</strong>. " if staff_name else ""

    body = f'''
    <p style="color:#475569;font-size:15px;line-height:1.6;">{_greeting(customer_name)}</p>
    <p style="color:#475569;font-size:15px;line-height:1.6;">{staff_line}We'd love to hear about your experience with the service you received for order <strong>{order_number}</strong>.</p>
    <p style="color:#475569;font-size:14px;">Your feedback helps us improve our service quality.</p>'''

    result = await send_email(db, customer_email, f"Rate Your Experience - {order_number}", "How Was Your Experience?", body,
                              rating_url or f"{FRONTEND_URL}/track", "Rate Your Experience")

    if result.get("ok"):
        await db.email_sent_log.insert_one({
            "email": customer_email, "order_id": order_id, "template": "rating_request",
            "sent_at": datetime.now(timezone.utc).isoformat(),
        })

    return result


async def preview_email_template(db, template_type="order_completed"):
    """Generate a preview of an email template for admin."""
    branding = await get_email_branding(db)

    previews = {
        "payment_submitted": ("Payment Submitted", '''
            <p style="color:#475569;font-size:15px;">Hello John Doe,</p>
            <p style="color:#475569;font-size:15px;">We have received your payment submission for order <strong>KON-OR-001</strong>.</p>
            <div style="background:#f8fafc;border-radius:10px;padding:16px;margin:16px 0;">
              <p style="margin:0;font-size:14px;color:#64748b;">Amount: <strong style="color:#20364D;">TZS 250,000</strong></p>
            </div>'''),
        "payment_approved": ("Payment Approved", '''
            <p style="color:#475569;font-size:15px;">Hello John Doe,</p>
            <p style="color:#059669;font-size:16px;font-weight:600;">Your payment has been verified and approved!</p>'''),
        "order_completed": ("Order Completed", '''
            <p style="color:#475569;font-size:15px;">Hello John Doe,</p>
            <p style="color:#059669;font-size:16px;font-weight:600;">Your order has been successfully completed!</p>
            <p style="color:#475569;font-size:15px;">Your order was handled by <strong>Sarah M.</strong>.</p>
            <p style="color:#475569;font-size:14px;">We'd love to hear about your experience.</p>'''),
        "group_deal_successful": ("Group Deal Successful", '''
            <p style="color:#475569;font-size:15px;">Hello John Doe,</p>
            <p style="color:#059669;font-size:16px;font-weight:600;">Great news! The group deal has been reached!</p>'''),
        "affiliate_approved": ("Welcome to the Program", '''
            <p style="color:#475569;font-size:15px;">Hello Partner,</p>
            <p style="color:#059669;font-size:16px;font-weight:600;">Your affiliate application has been approved!</p>'''),
    }

    title, body = previews.get(template_type, previews["order_completed"])
    html = build_canonical_email(branding, title, body, "#", "Example Button")
    return {"html": html, "template_type": template_type}
