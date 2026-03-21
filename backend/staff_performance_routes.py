"""
Staff Performance Routes
API endpoints for staff and supervisor performance dashboards.
"""
from fastapi import APIRouter, Request
from assignment_engine_service import get_sales_staff_scores

router = APIRouter(prefix="/api/staff-performance", tags=["Staff Performance"])


@router.get("/sales")
async def staff_sales_performance(request: Request):
    """Get performance metrics for all sales staff."""
    db = request.app.mongodb
    return await get_sales_staff_scores(db)


@router.get("/supervisor-overview")
async def supervisor_overview(request: Request):
    """
    Get supervisor dashboard overview with team metrics:
    - Team size
    - Average efficiency
    - At-risk staff (efficiency < 50)
    - Overloaded staff (workload > 15)
    """
    db = request.app.mongodb
    leaderboard = await get_sales_staff_scores(db)
    
    if not leaderboard:
        return {
            "team_size": 0,
            "average_efficiency": 0,
            "at_risk_count": 0,
            "overloaded_count": 0,
            "leaderboard": [],
        }
    
    avg_efficiency = round(sum(x["efficiency_score"] for x in leaderboard) / len(leaderboard), 2)
    at_risk = [x for x in leaderboard if x["efficiency_score"] < 50]
    overloaded = [x for x in leaderboard if x["open_workload"] > 15]
    top_performer = leaderboard[0] if leaderboard else None
    needs_attention = leaderboard[-1] if len(leaderboard) > 1 else None

    return {
        "team_size": len(leaderboard),
        "average_efficiency": avg_efficiency,
        "at_risk_count": len(at_risk),
        "overloaded_count": len(overloaded),
        "top_performer": top_performer,
        "needs_attention": needs_attention,
        "leaderboard": leaderboard,
        "at_risk_staff": at_risk,
        "overloaded_staff": overloaded,
    }


@router.get("/my-stats")
async def my_performance_stats(request: Request):
    """
    Get performance stats for the current logged-in staff member.
    Returns their efficiency score and comparison to team average.
    """
    db = request.app.mongodb
    
    # Get current user from token (would need auth middleware)
    # For now, return placeholder that would be populated with auth context
    leaderboard = await get_sales_staff_scores(db)
    avg = round(sum(x["efficiency_score"] for x in leaderboard) / len(leaderboard), 2) if leaderboard else 0
    
    return {
        "team_average": avg,
        "total_staff": len(leaderboard),
        "note": "Use with auth middleware to get personalized stats"
    }
