"""
Runtime Settings Service
Checks configuration status for external integrations
"""
import os


def get_runtime_settings():
    return {
        "resend_configured": bool(os.getenv("RESEND_API_KEY")) and bool(os.getenv("RESEND_FROM_EMAIL")),
        "kwikpay_configured": bool(os.getenv("KWIKPAY_PUBLIC_KEY")) and bool(os.getenv("KWIKPAY_SECRET_KEY")),
        "stripe_configured": bool(os.getenv("STRIPE_SECRET_KEY")),
        "mongo_configured": bool(os.getenv("MONGO_URL")),
    }
