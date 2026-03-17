import os
from fastapi import APIRouter

router = APIRouter(prefix="/api/payment-gateways", tags=["Payment Gateways"])


def kwikpay_is_configured() -> bool:
    return bool(os.getenv("KWIKPAY_PUBLIC_KEY")) and bool(os.getenv("KWIKPAY_SECRET_KEY"))


@router.get("/status")
async def payment_gateway_status():
    return {
        "kwikpay_configured": kwikpay_is_configured(),
        "kwikpay_enabled": kwikpay_is_configured(),
        "bank_transfer_available": True,
        "mobile_money_available": False,
    }
