from fastapi import APIRouter, Request
from assignment_engine_service import get_sales_staff_scores

router = APIRouter(prefix="/api/staff-performance", tags=["Staff Performance"])

@router.get("/sales")
async def staff_sales_performance(request: Request):
    db = request.app.mongodb
    return await get_sales_staff_scores(db)

@router.get("/supervisor-overview")
async def supervisor_overview(request: Request):
    db = request.app.mongodb
    leaderboard = await get_sales_staff_scores(db)
    avg_efficiency = round(sum(x["efficiency_score"] for x in leaderboard) / len(leaderboard), 2) if leaderboard else 0
    at_risk = [x for x in leaderboard if x["efficiency_score"] < 50]
    overloaded = [x for x in leaderboard if x["open_workload"] > 15]

    return {
        "team_size": len(leaderboard),
        "average_efficiency": avg_efficiency,
        "at_risk_count": len(at_risk),
        "overloaded_count": len(overloaded),
        "leaderboard": leaderboard,
    }
