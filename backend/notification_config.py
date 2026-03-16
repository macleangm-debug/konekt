"""
Notification Configuration
Environment variables for email and notification services
"""
import os

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
SENDER_EMAIL = os.getenv("SENDER_EMAIL", "noreply@konekt.co.tz")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "info@konekt.co.tz")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8001").rstrip("/")
