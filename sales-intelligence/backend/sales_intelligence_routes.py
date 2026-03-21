from fastapi import APIRouter, Request
from assignment_engine_service import get_sales_staff_scores, smart_assign_sales_owner

router = APIRouter(prefix="/api/sales-intelligence", tags=["Sales Intelligence"])

@router.get("/leaderboard")
async def sales_leaderboard(request: Request):
    db = request.app.mongodb
    return await get_sales_staff_scores(db)

@router.post("/assign-preview")
async def assign_preview(payload: dict, request: Request):
    db = request.app.mongodb
    result = await smart_assign_sales_owner(
        db,
        category=payload.get("category"),
        source=payload.get("source"),
    )
    return result
