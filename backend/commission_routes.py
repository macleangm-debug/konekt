"""
Commission API — Exposes margin distribution calculation for frontend preview.
"""
from fastapi import APIRouter, HTTPException
from services.commission_engine import compute_order_commission, VALID_CHANNELS

router = APIRouter(prefix="/api/admin/commission", tags=["Commission Engine"])


@router.post("/calculate")
async def calculate_commission(payload: dict):
    """Preview commission distribution for a given order scenario."""
    selling_price = float(payload.get("selling_price", 0))
    vendor_cost = float(payload.get("vendor_cost", 0))
    channel = payload.get("channel", "direct")
    wallet_balance = float(payload.get("wallet_balance", 0))

    if selling_price <= 0:
        raise HTTPException(status_code=400, detail="selling_price must be positive")
    if channel not in VALID_CHANNELS:
        raise HTTPException(status_code=400, detail=f"Invalid channel. Must be one of: {', '.join(VALID_CHANNELS)}")

    result = await compute_order_commission(selling_price, vendor_cost, channel, wallet_balance)
    return result
