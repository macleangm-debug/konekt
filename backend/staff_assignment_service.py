"""
Staff Assignment Service
Smart assignment based on performance scores and workload.
"""
from datetime import datetime, timezone


async def calculate_staff_score(db, staff_id: str, role: str = None):
    """
    Calculate performance score for a staff member.
    Higher score = better performance.
    """
    query = {"staff_id": staff_id}
    if role:
        query["role"] = role
    
    completed = await db.staff_task_metrics.count_documents({
        **query,
        "status": "completed",
    })
    delayed = await db.staff_task_metrics.count_documents({
        **query,
        "status": "delayed",
    })
    issues = await db.staff_task_metrics.count_documents({
        **query,
        "status": "issue_reported",
    })
    active = await db.staff_task_metrics.count_documents({
        **query,
        "status": {"$in": ["assigned", "in_progress", "awaiting_update"]},
    })

    # Score formula:
    # +5 per completed task
    # -3 per delayed task
    # -4 per issue task
    # -2 per active task (to balance workload)
    score = (completed * 5) - (delayed * 3) - (issues * 4) - (active * 2)
    
    return {
        "staff_id": staff_id,
        "completed": completed,
        "delayed": delayed,
        "issues": issues,
        "active": active,
        "score": round(score, 2),
    }


async def get_best_staff_for_assignment(db, *, role: str, category: str = None):
    """
    Get the best available staff member for assignment.
    Considers: performance score, current workload, specialization.
    """
    query = {
        "role": role,
        "is_active": True,
    }
    if category:
        query["specializations"] = {"$in": [category]}

    staff_list = await db.users.find(query).to_list(length=200)
    
    if not staff_list:
        # Fallback: try without category filter
        staff_list = await db.users.find({
            "role": role,
            "is_active": True,
        }).to_list(length=200)

    best_staff = None
    best_score = -999999

    for staff in staff_list:
        perf = await calculate_staff_score(db, str(staff["_id"]), role)
        score = perf["score"]
        
        if score > best_score:
            best_score = score
            best_staff = staff

    return best_staff


def resolve_sale_source(*, created_by_staff: bool, affiliate_code: str = None, touched_by_staff: bool = False):
    """
    Determine the source of a sale for commission calculation.
    - sales: Staff created and closed the deal
    - hybrid: Website/affiliate lead, but staff converted
    - affiliate: Affiliate-driven, no staff involvement
    - website: Direct website purchase, no attribution
    """
    if created_by_staff:
        return "sales"
    if affiliate_code and touched_by_staff:
        return "hybrid"
    if affiliate_code:
        return "affiliate"
    if touched_by_staff:
        return "hybrid"
    return "website"


async def record_task_assignment(
    db,
    *,
    staff_id: str,
    role: str,
    entity_type: str,
    entity_id: str,
    status: str = "assigned",
):
    """
    Record a task assignment for performance tracking.
    """
    now = datetime.now(timezone.utc).isoformat()
    
    doc = {
        "staff_id": staff_id,
        "role": role,
        "entity_type": entity_type,  # order, quote, service_request, etc.
        "entity_id": entity_id,
        "status": status,
        "assigned_at": now,
        "updated_at": now,
    }
    
    await db.staff_task_metrics.insert_one(doc)
    return doc


async def update_task_status(db, *, staff_id: str, entity_id: str, status: str):
    """
    Update task status for performance tracking.
    """
    now = datetime.now(timezone.utc).isoformat()
    
    await db.staff_task_metrics.update_one(
        {"staff_id": staff_id, "entity_id": entity_id},
        {"$set": {"status": status, "updated_at": now}}
    )
