import os
from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/admin/launch-hardening", tags=["Launch Hardening"])


@router.get("/checklist")
async def launch_hardening_checklist(request: Request):
    checklist = {
        "mongo_url_configured": bool(os.getenv("MONGO_URL")),
        "jwt_secret_configured": bool(os.getenv("JWT_SECRET")),
        "resend_configured": bool(os.getenv("RESEND_API_KEY")),
        "kwikpay_base_url_configured": bool(os.getenv("KWIKPAY_BASE_URL")),
        "kwikpay_api_key_configured": bool(os.getenv("KWIKPAY_API_KEY")),
        "kwikpay_secret_configured": bool(os.getenv("KWIKPAY_API_SECRET")),
        "frontend_url_configured": bool(os.getenv("FRONTEND_URL")),
        "sender_email_configured": bool(os.getenv("SENDER_EMAIL")),
        "bank_transfer_enabled": os.getenv("BANK_TRANSFER_ENABLED", "false").lower() == "true",
    }

    score = sum(1 for value in checklist.values() if value)
    total = len(checklist)

    return {
        "score": score,
        "total": total,
        "status": "ready" if score == total else "needs_attention",
        "checks": checklist,
    }
