"""
Sales Intelligence Routes
API endpoints for sales leaderboard and smart assignment.
"""
from fastapi import APIRouter, Request
from assignment_engine_service import get_sales_staff_scores, smart_assign_sales_owner

router = APIRouter(prefix="/api/sales-intelligence", tags=["Sales Intelligence"])


@router.get("/leaderboard")
async def sales_leaderboard(request: Request):
    """Get the sales staff leaderboard sorted by efficiency score."""
    db = request.app.mongodb
    return await get_sales_staff_scores(db)


@router.post("/assign-preview")
async def assign_preview(payload: dict, request: Request):
    """
    Preview who would be assigned for a given opportunity without actually assigning.
    Useful for testing and transparency.
    """
    db = request.app.mongodb
    result = await smart_assign_sales_owner(
        db,
        category=payload.get("category"),
        source=payload.get("source"),
        lead_type=payload.get("lead_type"),
    )
    return result


@router.get("/efficiency-breakdown/{sales_user_id}")
async def efficiency_breakdown(sales_user_id: str, request: Request):
    """Get detailed efficiency breakdown for a specific sales person."""
    db = request.app.mongodb
    scores = await get_sales_staff_scores(db)
    person = next((s for s in scores if s["sales_user_id"] == sales_user_id), None)
    
    if not person:
        return {"error": "Sales person not found"}
    
    return {
        "sales_user_id": sales_user_id,
        "sales_name": person["sales_name"],
        "efficiency_score": person["efficiency_score"],
        "breakdown": {
            "close_rate": {
                "value": person["close_rate"],
                "weight": 0.40,
                "contribution": round(person["close_rate"] * 0.40, 2),
            },
            "response_speed": {
                "value": person["response_speed_score"],
                "weight": 0.30,
                "contribution": round(person["response_speed_score"] * 0.30, 2),
            },
            "customer_rating": {
                "value": person["customer_rating_score"],
                "weight": 0.30,
                "contribution": round(person["customer_rating_score"] * 0.30, 2),
            },
        },
        "workload": person["open_workload"],
        "total_opportunities": person["total_opportunities"],
        "won_opportunities": person["won_opportunities"],
    }
