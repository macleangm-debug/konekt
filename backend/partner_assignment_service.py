"""
Partner Assignment Service - Intelligent routing of work to partners
"""
from datetime import datetime


async def choose_best_partner_for_service(db, *, service_key: str, country_code: str, region: str):
    """
    Select the best partner for a service based on:
    - Capability match
    - Region coverage
    - Current queue load
    - Performance history
    - Priority weight
    """
    capabilities = await db.partner_capabilities.find({
        "service_key": service_key,
        "country_code": country_code,
        "status": "active",
    }).to_list(length=300)

    eligible = []
    for cap in capabilities:
        regions = cap.get("regions", [])
        if regions and region not in regions:
            continue

        # Count current assignments in queue
        queue_count = await db.partner_assignments.count_documents({
            "partner_id": cap["partner_id"],
            "status": {"$in": ["assigned", "accepted", "in_progress"]},
        })

        # Get performance metrics
        performance = await db.partner_performance.find_one({"partner_id": cap["partner_id"]}) or {}
        completion_rate = float(performance.get("completion_rate", 80) or 80)
        avg_delay = float(performance.get("avg_delay_days", 0) or 0)
        quality_score = float(performance.get("quality_score", 70) or 70)

        # Calculate composite score
        # Higher is better
        score = (
            float(cap.get("priority_weight", 0) or 0) * 2
            + completion_rate
            + quality_score
            - (queue_count * 5)  # Penalize busy partners
            - (avg_delay * 10)   # Heavily penalize late delivery
        )

        eligible.append({
            "partner_id": cap["partner_id"],
            "partner_name": cap["partner_name"],
            "score": score,
            "queue_count": queue_count,
            "lead_time_days": cap.get("lead_time_days", 3),
            "completion_rate": completion_rate,
        })

    if not eligible:
        return None

    # Sort by score descending
    eligible.sort(key=lambda x: x["score"], reverse=True)
    return eligible[0]


async def assign_work_to_partner(db, *, assignment_type: str, reference_id: str, 
                                  partner_id: str, partner_name: str, details: dict):
    """
    Create a work assignment for a partner
    assignment_type: service_request | fulfillment_job | site_visit
    """
    assignment_doc = {
        "assignment_type": assignment_type,
        "reference_id": reference_id,
        "partner_id": partner_id,
        "partner_name": partner_name,
        "details": details,
        "status": "assigned",  # assigned | accepted | rejected | in_progress | completed | cancelled
        "assigned_at": datetime.utcnow(),
        "accepted_at": None,
        "started_at": None,
        "completed_at": None,
        "notes": "",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    
    result = await db.partner_assignments.insert_one(assignment_doc)
    return str(result.inserted_id)


async def update_partner_performance(db, *, partner_id: str):
    """
    Recalculate partner performance metrics based on recent assignments
    """
    # Get completed assignments in last 90 days
    from datetime import timedelta
    cutoff = datetime.utcnow() - timedelta(days=90)
    
    assignments = await db.partner_assignments.find({
        "partner_id": partner_id,
        "completed_at": {"$gte": cutoff},
    }).to_list(length=500)
    
    if not assignments:
        return
    
    total = len(assignments)
    completed = len([a for a in assignments if a.get("status") == "completed"])
    
    # Calculate average delay (positive = late, negative = early)
    delays = []
    for a in assignments:
        if a.get("completed_at") and a.get("due_date"):
            delta = (a["completed_at"] - a["due_date"]).days
            delays.append(delta)
    
    avg_delay = sum(delays) / len(delays) if delays else 0
    completion_rate = (completed / total) * 100 if total > 0 else 0
    
    # Update or create performance record
    await db.partner_performance.update_one(
        {"partner_id": partner_id},
        {"$set": {
            "partner_id": partner_id,
            "total_assignments_90d": total,
            "completed_assignments_90d": completed,
            "completion_rate": round(completion_rate, 2),
            "avg_delay_days": round(avg_delay, 2),
            "updated_at": datetime.utcnow(),
        }},
        upsert=True,
    )
