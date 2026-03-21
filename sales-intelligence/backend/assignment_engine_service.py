from datetime import datetime

def calculate_efficiency_score(
    *,
    close_rate: float = 0,
    response_speed_score: float = 0,
    customer_rating_score: float = 0,
):
    score = (
        float(close_rate or 0) * 0.40
        + float(response_speed_score or 0) * 0.30
        + float(customer_rating_score or 0) * 0.30
    )
    return round(score, 2)


async def get_sales_staff_scores(db):
    staff = await db.users.find({"role": "sales", "is_active": True}).to_list(length=500)
    output = []

    for member in staff:
        member_id = str(member.get("_id"))
        opportunities = await db.sales_opportunities.find({"assigned_sales_id": member_id}).to_list(length=1000)

        total = len(opportunities)
        won = len([x for x in opportunities if x.get("stage") == "closed_won"])
        close_rate = (won / total * 100) if total else 0

        avg_response_hours = float(member.get("avg_response_hours", 24) or 24)
        # Lower response hours => better score
        response_speed_score = max(0, min(100, 100 - (avg_response_hours * 3)))

        customer_rating = float(member.get("customer_rating", 4.0) or 4.0)
        customer_rating_score = max(0, min(100, (customer_rating / 5.0) * 100))

        workload = len([x for x in opportunities if x.get("stage") not in ["closed_won", "closed_lost"]])

        efficiency = calculate_efficiency_score(
            close_rate=close_rate,
            response_speed_score=response_speed_score,
            customer_rating_score=customer_rating_score,
        )

        output.append({
            "sales_user_id": member_id,
            "sales_name": member.get("name") or member.get("full_name") or member.get("email"),
            "close_rate": round(close_rate, 2),
            "response_speed_score": round(response_speed_score, 2),
            "customer_rating_score": round(customer_rating_score, 2),
            "efficiency_score": efficiency,
            "open_workload": workload,
            "specialties": member.get("specialties", []),
        })

    return sorted(output, key=lambda x: (-x["efficiency_score"], x["open_workload"]))


async def smart_assign_sales_owner(
    db,
    *,
    category: str | None = None,
    source: str | None = None,
):
    scored = await get_sales_staff_scores(db)
    if not scored:
        return {
            "assigned_sales_id": None,
            "assigned_sales_name": None,
            "assignment_reason": "no_sales_staff_available",
        }

    ranked = []
    for person in scored:
        specialty_bonus = 10 if category and category in (person.get("specialties") or []) else 0
        workload_penalty = min(person.get("open_workload", 0) * 2, 30)
        final_score = person["efficiency_score"] + specialty_bonus - workload_penalty
        ranked.append((round(final_score, 2), person))

    ranked.sort(key=lambda x: -x[0])
    best_score, best = ranked[0]

    return {
        "assigned_sales_id": best["sales_user_id"],
        "assigned_sales_name": best["sales_name"],
        "assignment_reason": f"smart_assignment(score={best_score}, category={category or 'general'}, source={source or 'unknown'})",
    }
