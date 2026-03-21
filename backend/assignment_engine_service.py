"""
Assignment Engine Service
Smart assignment of sales opportunities based on efficiency scoring and workload.
"""
from datetime import datetime, timezone


def calculate_efficiency_score(
    *,
    close_rate: float = 0,
    response_speed_score: float = 0,
    customer_rating_score: float = 0,
):
    """
    Calculate efficiency score based on weighted formula:
    - Close rate: 40%
    - Response speed: 30%
    - Customer rating: 30%
    """
    score = (
        float(close_rate or 0) * 0.40
        + float(response_speed_score or 0) * 0.30
        + float(customer_rating_score or 0) * 0.30
    )
    return round(score, 2)


async def get_sales_staff_scores(db):
    """
    Get all sales staff with their performance scores and workload.
    Returns sorted list by efficiency (highest first) then by workload (lowest first).
    """
    # Find all active sales staff
    staff = await db.users.find({
        "role": {"$in": ["sales", "staff", "admin"]},
        "is_active": {"$ne": False}
    }).to_list(length=500)
    
    output = []

    for member in staff:
        member_id = str(member.get("_id"))
        
        # Get all opportunities assigned to this person
        opportunities = await db.sales_opportunities.find({
            "assigned_sales_id": member_id
        }).to_list(length=1000)

        total = len(opportunities)
        won = len([x for x in opportunities if x.get("stage") == "closed_won"])
        close_rate = (won / total * 100) if total else 0

        # Calculate response speed score (lower hours = better score)
        avg_response_hours = float(member.get("avg_response_hours", 24) or 24)
        response_speed_score = max(0, min(100, 100 - (avg_response_hours * 3)))

        # Calculate customer rating score (5 star scale to 100)
        customer_rating = float(member.get("customer_rating", 4.0) or 4.0)
        customer_rating_score = max(0, min(100, (customer_rating / 5.0) * 100))

        # Calculate open workload (opportunities not closed)
        workload = len([x for x in opportunities if x.get("stage") not in ["closed_won", "closed_lost"]])

        # Calculate efficiency score
        efficiency = calculate_efficiency_score(
            close_rate=close_rate,
            response_speed_score=response_speed_score,
            customer_rating_score=customer_rating_score,
        )

        output.append({
            "sales_user_id": member_id,
            "sales_name": member.get("name") or member.get("full_name") or member.get("email"),
            "sales_email": member.get("email"),
            "close_rate": round(close_rate, 2),
            "response_speed_score": round(response_speed_score, 2),
            "customer_rating_score": round(customer_rating_score, 2),
            "efficiency_score": efficiency,
            "open_workload": workload,
            "total_opportunities": total,
            "won_opportunities": won,
            "specialties": member.get("specialties", []),
            "is_active": member.get("is_active", True),
        })

    # Sort by efficiency (descending) then by workload (ascending)
    return sorted(output, key=lambda x: (-x["efficiency_score"], x["open_workload"]))


async def smart_assign_sales_owner(
    db,
    *,
    category: str = None,
    source: str = None,
    lead_type: str = None,
):
    """
    Smart assignment of sales owner based on:
    - Efficiency score
    - Specialty match (bonus for category expertise)
    - Current workload (penalty for high workload)
    """
    scored = await get_sales_staff_scores(db)
    
    if not scored:
        return {
            "assigned_sales_id": None,
            "assigned_sales_name": None,
            "assignment_reason": "no_sales_staff_available",
            "assignment_score": 0,
        }

    ranked = []
    for person in scored:
        # Base score from efficiency
        base_score = person["efficiency_score"]
        
        # Specialty bonus (+10 if person specializes in the category)
        specialty_bonus = 10 if category and category in (person.get("specialties") or []) else 0
        
        # Workload penalty (up to -30 for high workload)
        workload_penalty = min(person.get("open_workload", 0) * 2, 30)
        
        # Calculate final assignment score
        final_score = base_score + specialty_bonus - workload_penalty
        ranked.append((round(final_score, 2), person))

    # Sort by final score (highest first)
    ranked.sort(key=lambda x: -x[0])
    best_score, best = ranked[0]

    return {
        "assigned_sales_id": best["sales_user_id"],
        "assigned_sales_name": best["sales_name"],
        "assigned_sales_email": best.get("sales_email"),
        "assignment_score": best_score,
        "assignment_reason": f"smart_assignment(score={best_score}, category={category or 'general'}, source={source or 'unknown'}, lead_type={lead_type or 'standard'})",
    }


async def auto_assign_opportunity(db, opportunity_id: str, category: str = None, source: str = None):
    """
    Automatically assign a sales owner to an opportunity.
    Updates the opportunity record with the assigned sales person.
    """
    assignment = await smart_assign_sales_owner(db, category=category, source=source)
    
    if assignment["assigned_sales_id"]:
        await db.sales_opportunities.update_one(
            {"_id": ObjectId(opportunity_id) if len(opportunity_id) == 24 else opportunity_id},
            {
                "$set": {
                    "assigned_sales_id": assignment["assigned_sales_id"],
                    "assigned_sales_name": assignment["assigned_sales_name"],
                    "assignment_reason": assignment["assignment_reason"],
                    "assigned_at": datetime.now(timezone.utc),
                }
            }
        )
    
    return assignment


# Import ObjectId for the auto_assign function
from bson import ObjectId
