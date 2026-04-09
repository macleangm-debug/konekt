"""
Notification Multi-Channel Dispatch Service.
Checks user preferences, then dispatches via in_app, email (Resend), and WhatsApp (Twilio).
No new routes — extends the existing notification flow.
"""
import os
import asyncio
import logging
from datetime import datetime, timezone

logger = logging.getLogger("notification_dispatch")

# ─── Role-based default preferences ───
ROLE_DEFAULTS = {
    "customer": {
        "order_created":       {"in_app": True,  "email": True,  "whatsapp": False},
        "payment_verified":    {"in_app": True,  "email": True,  "whatsapp": False},
        "order_in_fulfillment":{"in_app": True,  "email": False, "whatsapp": False},
        "order_dispatched":    {"in_app": True,  "email": True,  "whatsapp": False},
        "order_delivered":     {"in_app": True,  "email": True,  "whatsapp": False},
        "order_delayed":       {"in_app": True,  "email": True,  "whatsapp": False},
    },
    "sales": {
        "sales_order_assigned": {"in_app": True, "email": True,  "whatsapp": False},
        "sales_delay_flagged":  {"in_app": True, "email": True,  "whatsapp": False},
    },
    "vendor": {
        "vendor_order_assigned": {"in_app": True, "email": True, "whatsapp": False},
    },
    "affiliate": {
        "affiliate_payout":     {"in_app": True, "email": True,  "whatsapp": False},
        "affiliate_reward":     {"in_app": True, "email": True,  "whatsapp": False},
    },
    "admin": {
        "admin_sales_override": {"in_app": True, "email": True,  "whatsapp": False},
        "admin_delay_flagged":  {"in_app": True, "email": True,  "whatsapp": False},
    },
}

# ─── All event types with labels and groups ───
EVENT_CATALOG = {
    # Customer
    "order_created":        {"label": "Order Received",      "group": "Order Updates", "roles": ["customer"]},
    "payment_verified":     {"label": "Payment Verified",    "group": "Payments",      "roles": ["customer"]},
    "order_in_fulfillment": {"label": "Order In Fulfillment","group": "Order Updates", "roles": ["customer"]},
    "order_dispatched":     {"label": "Order Dispatched",    "group": "Order Updates", "roles": ["customer"]},
    "order_delivered":      {"label": "Order Delivered",     "group": "Order Updates", "roles": ["customer"]},
    "order_delayed":        {"label": "Order Delayed",       "group": "Alerts",        "roles": ["customer"]},
    # Sales
    "sales_order_assigned": {"label": "New Assignment",      "group": "Assignments",   "roles": ["sales"]},
    "sales_delay_flagged":  {"label": "Delay Flagged",       "group": "Alerts",        "roles": ["sales"]},
    # Vendor
    "vendor_order_assigned":{"label": "New Assignment",      "group": "Assignments",   "roles": ["vendor"]},
    # Affiliate
    "affiliate_payout":     {"label": "Payout Update",       "group": "Earnings",      "roles": ["affiliate"]},
    "affiliate_reward":     {"label": "Reward Earned",       "group": "Earnings",      "roles": ["affiliate"]},
    # Admin
    "admin_sales_override": {"label": "Sales Override",      "group": "Approvals",     "roles": ["admin"]},
    "admin_delay_flagged":  {"label": "Vendor Delay",        "group": "Alerts",        "roles": ["admin"]},
}


async def get_user_preferences(db, user_id: str, role: str) -> dict:
    """Get user's notification preferences, falling back to role defaults."""
    doc = await db.notification_preferences.find_one(
        {"user_id": user_id}, {"_id": 0}
    )
    if doc and doc.get("preferences"):
        return doc["preferences"]

    # Return role defaults
    return ROLE_DEFAULTS.get(role, ROLE_DEFAULTS.get("customer", {}))


async def save_user_preferences(db, user_id: str, role: str, preferences: dict):
    """Save or update user notification preferences."""
    now = datetime.now(timezone.utc).isoformat()
    await db.notification_preferences.update_one(
        {"user_id": user_id},
        {"$set": {
            "user_id": user_id,
            "role": role,
            "preferences": preferences,
            "updated_at": now,
        }},
        upsert=True,
    )


def _get_channel_prefs(preferences: dict, event_key: str, role: str) -> dict:
    """Get channel preferences for a specific event, using defaults if not set."""
    if event_key in preferences:
        return preferences[event_key]
    defaults = ROLE_DEFAULTS.get(role, {})
    return defaults.get(event_key, {"in_app": True, "email": False, "whatsapp": False})


async def dispatch_notification(
    db,
    event_key: str,
    recipient_user_id: str,
    recipient_role: str,
    title: str,
    message: str,
    target_url: str = "",
    cta_label: str = "",
    entity_type: str = "order",
    entity_id: str = "",
    context: dict = None,
):
    """
    Multi-channel notification dispatcher.
    Checks user preferences, sends via enabled channels.
    """
    # Get user preferences
    prefs = await get_user_preferences(db, recipient_user_id or "", recipient_role or "customer")
    channel_prefs = _get_channel_prefs(prefs, event_key, recipient_role or "customer")

    results = {"event": event_key, "channels": {}}

    # 1. In-app notification
    if channel_prefs.get("in_app", True):
        try:
            from services.in_app_notification_service import create_in_app_notification
            await create_in_app_notification(
                db=db,
                event_key=event_key,
                recipient_user_id=recipient_user_id,
                recipient_role=recipient_role,
                entity_type=entity_type,
                entity_id=entity_id,
                order_id=entity_id,
                context=context,
            )
            results["channels"]["in_app"] = "sent"
        except Exception as e:
            logger.error("In-app notification failed: %s", str(e))
            results["channels"]["in_app"] = f"failed: {str(e)}"

    # 2. Email via Resend
    if channel_prefs.get("email", False):
        try:
            email_result = await _send_email_notification(
                db, recipient_user_id, title, message, target_url, cta_label
            )
            results["channels"]["email"] = email_result
        except Exception as e:
            logger.error("Email notification failed: %s", str(e))
            results["channels"]["email"] = f"failed: {str(e)}"

    # 3. WhatsApp via Twilio
    if channel_prefs.get("whatsapp", False):
        try:
            wa_result = await _send_whatsapp_notification(
                db, recipient_user_id, message, target_url
            )
            results["channels"]["whatsapp"] = wa_result
        except Exception as e:
            logger.error("WhatsApp notification failed: %s", str(e))
            results["channels"]["whatsapp"] = f"failed: {str(e)}"

    # Log dispatch
    await _log_dispatch(db, event_key, recipient_user_id, recipient_role, results)
    return results


async def _send_email_notification(db, user_id, title, message, target_url, cta_label):
    """Send email notification via Resend. Branding pulled from Settings Hub."""
    api_key = os.getenv("RESEND_API_KEY")
    sender = os.getenv("RESEND_FROM_EMAIL") or os.getenv("SENDER_EMAIL") or "onboarding@resend.dev"

    if not api_key:
        logger.info("Resend not configured — skipping email for %s", user_id)
        return "skipped_no_key"

    # Resolve user email
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "email": 1, "full_name": 1, "name": 1})
    if not user:
        user = await db.partner_users.find_one({"id": user_id}, {"_id": 0, "email": 1, "full_name": 1, "name": 1})
    if not user or not user.get("email"):
        return "skipped_no_email"

    recipient_email = user["email"]
    recipient_name = user.get("full_name") or user.get("name") or ""

    # --- Pull branding from Settings Hub (single source of truth) ---
    brand_name = "Konekt"
    primary_color = "#20364D"
    footer_text = "B2B Platform"
    try:
        hub_row = await db.admin_settings.find_one({"key": "settings_hub"}, {"_id": 0})
        if hub_row:
            hub = hub_row.get("value", {})
            profile = hub.get("business_profile", {})
            branding = hub.get("branding", {})
            notif_sender = hub.get("notification_sender", {})
            brand_name = profile.get("brand_name") or brand_name
            primary_color = branding.get("primary_color") or primary_color
            footer_text = notif_sender.get("email_footer_text") or footer_text
    except Exception:
        pass  # keep defaults

    # Build branded HTML
    frontend_url = os.getenv("FRONTEND_URL", "")
    full_link = f"{frontend_url}{target_url}" if target_url else frontend_url

    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;">
      <div style="text-align:center;padding:16px 0;border-bottom:2px solid {primary_color};">
        <h2 style="color:{primary_color};margin:0;font-size:20px;">{brand_name}</h2>
      </div>
      <div style="padding:24px 0;">
        <p style="color:#334155;font-size:14px;margin:0 0 8px;">Hello{(' ' + recipient_name) if recipient_name else ''},</p>
        <h3 style="color:{primary_color};font-size:16px;margin:0 0 12px;">{title}</h3>
        <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px;">{message}</p>
        {f'<a href="{full_link}" style="display:inline-block;background:{primary_color};color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">{cta_label or "View Details"}</a>' if target_url else ''}
      </div>
      <div style="border-top:1px solid #e2e8f0;padding-top:16px;text-align:center;">
        <p style="color:#94a3b8;font-size:11px;margin:0;">{brand_name} &middot; {footer_text} &middot; Manage your preferences in your account settings.</p>
      </div>
    </div>
    """

    try:
        import resend
        resend.api_key = api_key
        result = await asyncio.to_thread(
            resend.Emails.send,
            {
                "from": sender,
                "to": [recipient_email],
                "subject": title,
                "html": html,
            }
        )
        logger.info("Email sent to %s: %s (id=%s)", recipient_email, title, result)
        return "sent"
    except Exception as e:
        logger.error("Resend email failed for %s: %s", recipient_email, str(e))
        return f"failed: {str(e)}"


async def _send_whatsapp_notification(db, user_id, message, target_url):
    """Send WhatsApp notification via Twilio."""
    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    wa_from = os.getenv("TWILIO_WHATSAPP_FROM")

    if not all([account_sid, auth_token, wa_from]):
        logger.info("Twilio not configured — skipping WhatsApp for %s", user_id)
        return "skipped_no_config"

    # Resolve user phone
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "phone": 1, "phone_prefix": 1})
    if not user:
        user = await db.partner_users.find_one({"id": user_id}, {"_id": 0, "phone": 1, "phone_prefix": 1})
    if not user or not user.get("phone"):
        return "skipped_no_phone"

    prefix = user.get("phone_prefix", "+255")
    phone = user["phone"]
    full_number = f"{prefix}{phone}" if not phone.startswith("+") else phone

    # Build WhatsApp message
    frontend_url = os.getenv("FRONTEND_URL", "https://konekt.co.tz")
    wa_message = message
    if target_url:
        wa_message += f"\n\nView: {frontend_url}{target_url}"

    try:
        from twilio.rest import Client
        client = Client(account_sid, auth_token)
        wa_msg = client.messages.create(
            from_=f"whatsapp:{wa_from}",
            body=wa_message,
            to=f"whatsapp:{full_number}",
        )
        logger.info("WhatsApp sent to %s: %s", full_number, wa_msg.sid)
        return "sent"
    except Exception as e:
        logger.error("Twilio WhatsApp failed for %s: %s", full_number, str(e))
        return f"failed: {str(e)}"


async def _log_dispatch(db, event_key, user_id, role, results):
    """Log notification dispatch results."""
    try:
        await db.notification_dispatch_logs.insert_one({
            "event_key": event_key,
            "user_id": user_id,
            "role": role,
            "channels": results.get("channels", {}),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    except Exception as e:
        logger.error("Failed to log dispatch: %s", str(e))
