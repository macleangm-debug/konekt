"""
Payment configuration for Konekt
Supports KwikPay (Mobile Money) and Bank Transfer
"""
import os

PAYMENT_PROVIDER_DEFAULT = os.getenv("PAYMENT_PROVIDER_DEFAULT", "kwikpay")

# KwikPay Configuration
KWIKPAY_ENABLED = os.getenv("KWIKPAY_ENABLED", "false").lower() == "true"
KWIKPAY_BASE_URL = os.getenv("KWIKPAY_BASE_URL", "")
KWIKPAY_API_KEY = os.getenv("KWIKPAY_API_KEY", "")
KWIKPAY_API_SECRET = os.getenv("KWIKPAY_API_SECRET", "")
KWIKPAY_WEBHOOK_SECRET = os.getenv("KWIKPAY_WEBHOOK_SECRET", "")
KWIKPAY_MERCHANT_ID = os.getenv("KWIKPAY_MERCHANT_ID", "")
KWIKPAY_RETURN_URL = os.getenv("KWIKPAY_RETURN_URL", "")
KWIKPAY_CANCEL_URL = os.getenv("KWIKPAY_CANCEL_URL", "")
KWIKPAY_CALLBACK_URL = os.getenv("KWIKPAY_CALLBACK_URL", "")

# Bank Transfer Configuration
BANK_TRANSFER_ENABLED = os.getenv("BANK_TRANSFER_ENABLED", "true").lower() == "true"
BANK_NAME = os.getenv("BANK_NAME", "")
BANK_ACCOUNT_NAME = os.getenv("BANK_ACCOUNT_NAME", "")
BANK_ACCOUNT_NUMBER = os.getenv("BANK_ACCOUNT_NUMBER", "")
BANK_BRANCH = os.getenv("BANK_BRANCH", "")
BANK_SWIFT_CODE = os.getenv("BANK_SWIFT_CODE", "")
BANK_CURRENCY = os.getenv("BANK_CURRENCY", "TZS")

# General URLs
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8001").rstrip("/")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "info@konekt.co.tz")
