"""Public Payment Info — returns bank details from .env for customer-facing drawers/PDFs"""
import os
from fastapi import APIRouter

router = APIRouter(prefix="/api/public", tags=["Public"])


@router.get("/payment-info")
async def get_payment_info():
    return {
        "bank_name": os.environ.get("BANK_NAME", ""),
        "account_name": os.environ.get("BANK_ACCOUNT_NAME", ""),
        "account_number": os.environ.get("BANK_ACCOUNT_NUMBER", ""),
        "branch": os.environ.get("BANK_BRANCH", ""),
        "swift_code": os.environ.get("BANK_SWIFT_CODE", ""),
        "currency": os.environ.get("BANK_CURRENCY", "TZS"),
    }
