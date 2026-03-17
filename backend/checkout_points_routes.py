"""
Checkout Points Validation Routes
Validates points redemption at checkout with margin protection
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/checkout-points", tags=["Checkout Points"])


class CheckoutPointsRequest(BaseModel):
    subtotal: float
    partner_cost_total: float
    requested_points_amount: float
    protected_margin_percent: Optional[float] = 40
    points_cap_percent_of_distributable_margin: Optional[float] = 10


def calculate_max_points_redemption_amount(
    *,
    final_selling_price: float,
    partner_cost: float,
    protected_margin_percent: float = 40,
    points_cap_percent_of_distributable_margin: float = 10,
):
    """Calculate the maximum points that can be redeemed"""
    gross_margin = final_selling_price - partner_cost
    protected_margin = gross_margin * (protected_margin_percent / 100)
    distributable_margin = gross_margin - protected_margin
    max_points_redemption = distributable_margin * (points_cap_percent_of_distributable_margin / 100)
    
    return {
        "gross_margin": round(gross_margin, 2),
        "protected_margin": round(protected_margin, 2),
        "distributable_margin": round(distributable_margin, 2),
        "max_points_redemption_amount": round(max(0, max_points_redemption), 2),
    }


def apply_points_redemption_guard(
    *,
    requested_points_amount: float,
    max_points_redemption_amount: float,
):
    """Apply guard to cap points redemption"""
    approved = min(requested_points_amount, max_points_redemption_amount)
    was_capped = approved < requested_points_amount
    
    return {
        "requested_points_amount": round(requested_points_amount, 2),
        "approved_points_amount": round(approved, 2),
        "points_guard_applied": True,
        "was_capped": was_capped,
    }


@router.post("/validate")
async def validate_checkout_points(data: CheckoutPointsRequest):
    """
    Validate points redemption at checkout.
    Ensures points don't exceed the allowed cap based on margin protection.
    """
    calc = calculate_max_points_redemption_amount(
        final_selling_price=data.subtotal,
        partner_cost=data.partner_cost_total,
        protected_margin_percent=data.protected_margin_percent or 40,
        points_cap_percent_of_distributable_margin=data.points_cap_percent_of_distributable_margin or 10,
    )
    
    guard = apply_points_redemption_guard(
        requested_points_amount=data.requested_points_amount,
        max_points_redemption_amount=calc["max_points_redemption_amount"],
    )
    
    final_total = max(data.subtotal - guard["approved_points_amount"], 0)
    
    message = (
        "Requested points were reduced to protect margin."
        if guard["was_capped"]
        else "Points applied successfully."
    )
    
    return {
        "ok": True,
        "margin": calc,
        "points": guard,
        "checkout": {
            "subtotal": round(data.subtotal, 2),
            "approved_points_amount": round(guard["approved_points_amount"], 2),
            "final_total": round(final_total, 2),
        },
        "message": message,
    }
