"""
Konekt Unified Notification Service
DB-backed settings, templates, dispatch with dry-run fallback.
Resend email provider with async non-blocking calls.
"""
import os
import asyncio
import logging
from datetime import datetime, timezone
from uuid import uuid4

logger = logging.getLogger("notifications")

# ─── Default Templates ────────────────────────────────────

DEFAULT_TEMPLATES = {
    "customer_order_received": {
        "subject": "Your Konekt Order Has Been Received",
        "body": """<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#20364D">
<div style="background:#0E1A2B;padding:24px 32px;border-radius:12px 12px 0 0">
<h1 style="color:#D4A843;margin:0;font-size:22px">KONEKT</h1>
</div>
<div style="padding:32px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px">
<p style="font-size:16px">Hi <strong>{{customer_name}}</strong>,</p>
<p>Thank you for your order with Konekt.</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0">
<tr style="background:#f8fafc"><td style="padding:10px;font-weight:bold;border:1px solid #e2e8f0">Order Number</td><td style="padding:10px;border:1px solid #e2e8f0"><strong>{{order_number}}</strong></td></tr>
<tr><td style="padding:10px;font-weight:bold;border:1px solid #e2e8f0">Items</td><td style="padding:10px;border:1px solid #e2e8f0">{{items_summary}}</td></tr>
<tr style="background:#f8fafc"><td style="padding:10px;font-weight:bold;border:1px solid #e2e8f0">Total</td><td style="padding:10px;border:1px solid #e2e8f0"><strong>TZS {{total}}</strong></td></tr>
</table>
<h3 style="color:#20364D;margin-top:24px">Next Step: Complete Your Payment</h3>
<table style="width:100%;border-collapse:collapse;margin:12px 0;background:#eff6ff;border-radius:8px">
<tr><td style="padding:8px 12px;color:#1e40af;font-size:13px">Bank</td><td style="padding:8px 12px;font-weight:bold">{{bank_name}}</td></tr>
<tr><td style="padding:8px 12px;color:#1e40af;font-size:13px">Account Name</td><td style="padding:8px 12px;font-weight:bold">{{account_name}}</td></tr>
<tr><td style="padding:8px 12px;color:#1e40af;font-size:13px">Account Number</td><td style="padding:8px 12px;font-weight:bold">{{account_number}}</td></tr>
<tr><td style="padding:8px 12px;color:#1e40af;font-size:13px">Reference</td><td style="padding:8px 12px;font-weight:bold">{{order_number}}</td></tr>
</table>
<p style="margin-top:20px">After payment, upload your proof:</p>
<a href="{{payment_proof_link}}" style="display:inline-block;background:#D4A843;color:#17283C;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin:8px 0">Upload Payment Proof</a>
<hr style="border:0;border-top:1px solid #e2e8f0;margin:24px 0">
<p style="font-size:13px;color:#64748b">We will begin processing your order once payment is verified.</p>
<p style="font-size:13px;color:#64748b">Questions? Reply to this email or contact us at support@konekt.co.tz</p>
</div></div>""",
    },
    "customer_payment_proof_received": {
        "subject": "Payment Proof Received — {{order_number}}",
        "body": """<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#20364D">
<div style="background:#0E1A2B;padding:24px 32px;border-radius:12px 12px 0 0">
<h1 style="color:#D4A843;margin:0;font-size:22px">KONEKT</h1>
</div>
<div style="padding:32px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px">
<p style="font-size:16px">Hi <strong>{{customer_name}}</strong>,</p>
<p>We have received your payment proof for order <strong>{{order_number}}</strong>.</p>
<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0">
<p style="margin:0;color:#166534;font-weight:bold">What happens next?</p>
<p style="margin:8px 0 0;color:#15803d;font-size:14px">Our finance team is verifying your payment. You will be notified once approved.</p>
</div>
<p style="margin-top:16px">Want to track your order?</p>
<a href="{{account_link}}" style="display:inline-block;background:#20364D;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin:8px 0">Track Your Order</a>
<hr style="border:0;border-top:1px solid #e2e8f0;margin:24px 0">
<p style="font-size:13px;color:#64748b">— Konekt Team</p>
</div></div>""",
    },
    "customer_payment_verified": {
        "subject": "Payment Verified — Your Order Is Being Processed",
        "body": """<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#20364D">
<div style="background:#0E1A2B;padding:24px 32px;border-radius:12px 12px 0 0">
<h1 style="color:#D4A843;margin:0;font-size:22px">KONEKT</h1>
</div>
<div style="padding:32px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px">
<p style="font-size:16px">Hi <strong>{{customer_name}}</strong>,</p>
<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:16px 0;text-align:center">
<p style="margin:0;font-size:24px">Payment Verified</p>
<p style="margin:8px 0 0;color:#15803d;font-size:14px">Order <strong>{{order_number}}</strong></p>
</div>
<p>Your payment of <strong>TZS {{amount}}</strong> has been verified. Your order is now being processed.</p>
<p>A Konekt sales representative will contact you shortly to confirm delivery details.</p>
<a href="{{account_link}}" style="display:inline-block;background:#D4A843;color:#17283C;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">View Your Order</a>
<hr style="border:0;border-top:1px solid #e2e8f0;margin:24px 0">
<p style="font-size:13px;color:#64748b">— Konekt Team</p>
</div></div>""",
    },
    "admin_payment_proof_submitted": {
        "subject": "[Admin] New Payment Proof: {{order_number}}",
        "body": """<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#20364D">
<div style="background:#7c3aed;padding:16px 24px;border-radius:8px 8px 0 0">
<h2 style="color:white;margin:0;font-size:16px">KONEKT ADMIN — Payment Proof Alert</h2>
</div>
<div style="padding:24px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 8px 8px">
<p>A new payment proof has been submitted and requires verification.</p>
<table style="width:100%;border-collapse:collapse;margin:12px 0">
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold">Order</td><td style="padding:8px;border:1px solid #e2e8f0">{{order_number}}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold">Customer</td><td style="padding:8px;border:1px solid #e2e8f0">{{customer_name}} ({{customer_email}})</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold">Amount</td><td style="padding:8px;border:1px solid #e2e8f0">TZS {{amount}}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold">Payer</td><td style="padding:8px;border:1px solid #e2e8f0">{{payer_name}}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold">Reference</td><td style="padding:8px;border:1px solid #e2e8f0">{{bank_reference}}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold">Guest Order</td><td style="padding:8px;border:1px solid #e2e8f0">{{is_guest}}</td></tr>
</table>
<a href="{{admin_link}}" style="display:inline-block;background:#7c3aed;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:8px 0">Review in Admin</a>
</div></div>""",
    },
}

# ─── Trigger Registry ─────────────────────────────────────

TRIGGER_REGISTRY = [
    {"event_key": "customer_order_received", "label": "Order Confirmation", "audience": "customer", "channel": "email", "template_key": "customer_order_received", "default_enabled": False},
    {"event_key": "customer_payment_proof_received", "label": "Payment Proof Received", "audience": "customer", "channel": "email", "template_key": "customer_payment_proof_received", "default_enabled": False},
    {"event_key": "customer_payment_verified", "label": "Payment Verified", "audience": "customer", "channel": "email", "template_key": "customer_payment_verified", "default_enabled": False},
    {"event_key": "admin_payment_proof_submitted", "label": "Admin: New Payment Proof", "audience": "admin", "channel": "email", "template_key": "admin_payment_proof_submitted", "default_enabled": False},
]


def _now():
    return datetime.now(timezone.utc).isoformat()


def _render_template(template: dict, context: dict) -> dict:
    """Interpolate {{key}} placeholders in subject and body."""
    subject = template.get("subject", "")
    body = template.get("body", "")
    for key, value in context.items():
        placeholder = "{{" + str(key) + "}}"
        subject = subject.replace(placeholder, str(value))
        body = body.replace(placeholder, str(value))
    return {"subject": subject, "body": body}


class NotificationService:
    def __init__(self, db):
        self.db = db

    # ─── Settings CRUD ────────────────────────────────────

    async def seed_defaults(self):
        """Initialize default trigger settings (idempotent)."""
        now = _now()
        for trigger in TRIGGER_REGISTRY:
            existing = await self.db.notification_settings.find_one(
                {"event_key": trigger["event_key"]}, {"_id": 0}
            )
            if not existing:
                await self.db.notification_settings.insert_one({
                    "event_key": trigger["event_key"],
                    "label": trigger["label"],
                    "audience": trigger["audience"],
                    "channel": trigger["channel"],
                    "enabled": trigger["default_enabled"],
                    "template_key": trigger["template_key"],
                    "updated_at": now,
                    "updated_by": "system_seed",
                })
        # Seed provider config
        existing_prov = await self.db.notification_provider.find_one({}, {"_id": 0})
        if not existing_prov:
            await self.db.notification_provider.insert_one({
                "email_provider": "resend",
                "enabled": False,
                "sender_name": "Konekt",
                "sender_email": os.environ.get("SENDER_EMAIL", "onboarding@resend.dev"),
                "dry_run": True,
                "api_key_configured": bool(os.environ.get("RESEND_API_KEY")),
                "updated_at": now,
            })
        return {"ok": True}

    async def get_settings(self):
        settings = []
        async for doc in self.db.notification_settings.find({}, {"_id": 0}):
            settings.append(doc)
        provider = await self.db.notification_provider.find_one({}, {"_id": 0}) or {}
        return {"settings": settings, "provider": provider}

    async def update_trigger(self, event_key: str, enabled: bool, updated_by: str = "admin"):
        await self.db.notification_settings.update_one(
            {"event_key": event_key},
            {"$set": {"enabled": enabled, "updated_at": _now(), "updated_by": updated_by}},
        )
        return {"ok": True}

    async def update_provider(self, payload: dict):
        payload["updated_at"] = _now()
        payload["api_key_configured"] = bool(os.environ.get("RESEND_API_KEY"))
        await self.db.notification_provider.update_one({}, {"$set": payload}, upsert=True)
        return {"ok": True}

    # ─── Templates CRUD ───────────────────────────────────

    async def get_templates(self):
        templates = {}
        async for doc in self.db.notification_templates.find({}, {"_id": 0}):
            templates[doc["template_key"]] = {"subject": doc["subject"], "body": doc["body"]}
        # Fill defaults for any missing
        for key, tpl in DEFAULT_TEMPLATES.items():
            if key not in templates:
                templates[key] = tpl
        return templates

    async def upsert_template(self, template_key: str, subject: str, body: str):
        await self.db.notification_templates.update_one(
            {"template_key": template_key},
            {"$set": {"template_key": template_key, "subject": subject, "body": body, "updated_at": _now()}},
            upsert=True,
        )
        return {"ok": True}

    # ─── Dispatch ─────────────────────────────────────────

    async def dispatch(self, event_key: str, recipient_email: str, context: dict):
        """
        Main dispatch entry point.
        Checks settings → renders template → sends or dry-runs → logs.
        """
        # Get trigger settings
        trigger = await self.db.notification_settings.find_one(
            {"event_key": event_key}, {"_id": 0}
        )
        if not trigger:
            logger.info("Notification skipped: trigger '%s' not configured", event_key)
            return {"status": "skipped", "reason": "trigger_not_configured"}

        if not trigger.get("enabled"):
            logger.info("Notification skipped: trigger '%s' is disabled", event_key)
            await self._log(event_key, recipient_email, "skipped", "trigger_disabled", context)
            return {"status": "skipped", "reason": "trigger_disabled"}

        # Get provider config
        provider = await self.db.notification_provider.find_one({}, {"_id": 0}) or {}
        if not provider.get("enabled"):
            logger.info("Notification skipped: email provider disabled")
            await self._log(event_key, recipient_email, "skipped", "provider_disabled", context)
            return {"status": "skipped", "reason": "provider_disabled"}

        # Get template
        template_key = trigger.get("template_key", event_key)
        templates = await self.get_templates()
        template = templates.get(template_key, DEFAULT_TEMPLATES.get(template_key))
        if not template:
            await self._log(event_key, recipient_email, "failed", "template_not_found", context)
            return {"status": "failed", "reason": "template_not_found"}

        rendered = _render_template(template, context)

        # Dry-run mode
        if provider.get("dry_run", True):
            logger.info("DRY RUN [%s] → %s: %s", event_key, recipient_email, rendered["subject"])
            await self._log(event_key, recipient_email, "dry_run", rendered["subject"], context, rendered["body"])
            return {"status": "dry_run", "subject": rendered["subject"]}

        # Real send via Resend
        result = await self._send_resend(
            sender_name=provider.get("sender_name", "Konekt"),
            sender_email=provider.get("sender_email", "onboarding@resend.dev"),
            recipient=recipient_email,
            subject=rendered["subject"],
            html=rendered["body"],
        )

        status = "sent" if result.get("ok") else "failed"
        await self._log(event_key, recipient_email, status, rendered["subject"], context, email_id=result.get("email_id"))
        return {"status": status, "email_id": result.get("email_id"), "error": result.get("error")}

    async def _send_resend(self, sender_name, sender_email, recipient, subject, html):
        """Send email via Resend SDK (non-blocking)."""
        try:
            import resend
            api_key = os.environ.get("RESEND_API_KEY")
            if not api_key:
                return {"ok": False, "error": "RESEND_API_KEY not set"}
            resend.api_key = api_key
            params = {
                "from": f"{sender_name} <{sender_email}>",
                "to": [recipient],
                "subject": subject,
                "html": html,
            }
            email = await asyncio.to_thread(resend.Emails.send, params)
            email_id = email.get("id") if isinstance(email, dict) else getattr(email, "id", str(email))
            logger.info("Email sent via Resend: %s → %s (id: %s)", subject, recipient, email_id)
            return {"ok": True, "email_id": email_id}
        except Exception as e:
            logger.error("Resend send failed: %s", str(e))
            return {"ok": False, "error": str(e)}

    async def _log(self, event_key, recipient, status, subject, context, body=None, email_id=None):
        """Log every dispatch attempt to notification_logs collection."""
        await self.db.notification_logs.insert_one({
            "id": str(uuid4()),
            "event_key": event_key,
            "recipient": recipient,
            "status": status,
            "subject": subject,
            "context": context,
            "body_preview": (body or "")[:500] if body else None,
            "email_id": email_id,
            "created_at": _now(),
        })

    # ─── Convenience: Fire & Forget ───────────────────────

    async def fire(self, event_key: str, recipient_email: str, context: dict):
        """Non-blocking fire. Logs errors but doesn't raise."""
        try:
            return await self.dispatch(event_key, recipient_email, context)
        except Exception as e:
            logger.error("Notification fire error [%s]: %s", event_key, str(e))
            return {"status": "error", "reason": str(e)}
