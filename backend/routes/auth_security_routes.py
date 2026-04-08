"""
Auth Security Routes — Forgot Password, Reset Password, Email Verification
Unified across all roles. Minimal canonical routes.
"""

import os
from fastapi import APIRouter, Request, HTTPException
import bcrypt

from services.auth_security_service import (
    create_password_reset_token,
    validate_and_use_reset_token,
    check_rate_limit,
    verify_email_token,
)
from email_service import EmailService

router = APIRouter(prefix="/api/auth", tags=["auth-security"])

FRONTEND_URL = os.environ.get("FRONTEND_URL", "")


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.post("/forgot-password")
async def forgot_password(request: Request):
    """
    Request a password reset email.
    ALWAYS returns a neutral success message regardless of whether email exists.
    """
    db = request.app.mongodb
    body = await request.json()
    email = (body.get("email") or "").strip().lower()

    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    # Rate limit check
    client_ip = _get_client_ip(request)
    if not check_rate_limit("forgot_password", f"{client_ip}:{email}"):
        # Still return neutral message — don't reveal rate limiting details
        return {
            "ok": True,
            "message": "If an account exists for this email, we've sent a reset link.",
        }

    # Create reset token (returns None if email doesn't exist)
    token_data = await create_password_reset_token(db, email)

    if token_data:
        # Build reset URL
        reset_url = f"{FRONTEND_URL}/reset-password?token={token_data['token']}"

        # Send email (dry-run if no Resend API key)
        await EmailService.send_password_reset_email(email, reset_url)

    # ALWAYS return neutral message
    return {
        "ok": True,
        "message": "If an account exists for this email, we've sent a reset link.",
    }


@router.post("/reset-password")
async def reset_password(request: Request):
    """
    Reset password using a one-time token.
    Token is invalidated after use.
    """
    db = request.app.mongodb
    body = await request.json()
    token = body.get("token", "")
    new_password = body.get("password", "")

    if not token:
        raise HTTPException(status_code=400, detail="Reset token is required")
    if not new_password or len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    # Rate limit
    client_ip = _get_client_ip(request)
    if not check_rate_limit("reset_password", client_ip):
        raise HTTPException(status_code=429, detail="Too many attempts. Please try again later.")

    new_hash = _hash_password(new_password)
    result = await validate_and_use_reset_token(db, token, new_hash)

    if not result.get("ok"):
        raise HTTPException(status_code=400, detail=result.get("error", "Invalid reset token"))

    return {
        "ok": True,
        "message": "Password has been reset successfully. You can now sign in.",
    }


@router.post("/verify-email")
async def verify_email(request: Request):
    """Verify email using a verification token."""
    db = request.app.mongodb
    body = await request.json()
    token = body.get("token", "")

    if not token:
        raise HTTPException(status_code=400, detail="Verification token is required")

    result = await verify_email_token(db, token)

    if not result.get("ok"):
        raise HTTPException(status_code=400, detail=result.get("error", "Invalid verification token"))

    return {
        "ok": True,
        "message": "Email verified successfully." if not result.get("already_verified") else "Email was already verified.",
    }
