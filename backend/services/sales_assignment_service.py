"""
Sales Assignment Service — Weighted scoring with ownership continuity gate.
If client/company already has an owner, preserve it. Only score/assign when no owner exists.
"""
from datetime import datetime, timezone


ASSIGNMENT_WEIGHTS = {
    "continuity": 0.30,
    "specialization": 0.25,
    "availability": 0.20,
    "capacity": 0.15,
    "response_speed": 0.10,
}


def score_sales_candidate(candidate: dict) -> float:
    return round(
        candidate.get("continuity_score", 0) * ASSIGNMENT_WEIGHTS["continuity"]
        + candidate.get("specialization_score", 0) * ASSIGNMENT_WEIGHTS["specialization"]
        + candidate.get("availability_score", 0) * ASSIGNMENT_WEIGHTS["availability"]
        + candidate.get("capacity_remaining_score", 0) * ASSIGNMENT_WEIGHTS["capacity"]
        + candidate.get("response_speed_score", 0) * ASSIGNMENT_WEIGHTS["response_speed"],
        2,
    )


async def check_ownership_continuity(db, email: str = None, company_name: str = None):
    """Check if client/company already has a sales owner. Returns owner_id or None."""
    if email:
        # Check by email domain for corporate
        domain = email.split("@")[1] if "@" in email else ""
        if domain:
            existing = await db.client_ownership.find_one(
                {"email_domain": domain, "active": True},
                {"_id": 0, "owner_sales_id": 1}
            )
            if existing:
                return existing.get("owner_sales_id")

        # Check by exact email
        existing = await db.client_ownership.find_one(
            {"email": email, "active": True},
            {"_id": 0, "owner_sales_id": 1}
        )
        if existing:
            return existing.get("owner_sales_id")

    if company_name:
        normalized = company_name.strip().lower()
        existing = await db.client_ownership.find_one(
            {"company_name_normalized": normalized, "active": True},
            {"_id": 0, "owner_sales_id": 1}
        )
        if existing:
            return existing.get("owner_sales_id")

    # Check existing CRM leads for same email/company
    if email:
        lead = await db.crm_leads.find_one(
            {"email": email, "assigned_sales_owner_id": {"$exists": True, "$ne": None}},
            {"_id": 0, "assigned_sales_owner_id": 1}
        )
        if lead:
            return lead.get("assigned_sales_owner_id")

    return None


async def assign_sales_owner(db, *, email: str = None, company_name: str = None,
                              lane: str = None, category: str = None):
    """
    Assign a sales owner. Ownership continuity gate first.
    Only score candidates when no existing owner is found.
    """
    # Gate 1: Ownership continuity
    existing_owner = await check_ownership_continuity(db, email=email, company_name=company_name)
    if existing_owner:
        return {
            "assigned_sales_id": existing_owner,
            "routing_mode": "continuity",
            "reason": "Existing client/company owner preserved",
            "candidates": [],
        }

    # Gate 2: Score available sales reps
    sales_users = await db.users.find(
        {"role": "sales", "status": {"$ne": "inactive"}},
        {"_id": 0, "id": 1, "name": 1, "email": 1}
    ).to_list(100)

    if not sales_users:
        return {
            "assigned_sales_id": None,
            "routing_mode": "no_candidates",
            "reason": "No active sales users available",
            "candidates": [],
        }

    candidates = []
    for user in sales_users:
        uid = user["id"]
        cap = await db.sales_capabilities.find_one({"user_id": uid}, {"_id": 0}) or {}

        # Specialization match
        lanes = cap.get("lanes") or []
        categories = cap.get("categories") or []
        spec_score = 0
        if lane and lane in lanes:
            spec_score += 50
        if category and category in categories:
            spec_score += 50
        if not lane and not category:
            spec_score = 50

        # Capacity
        max_leads = cap.get("max_active_leads", 25)
        active_leads = await db.crm_leads.count_documents({
            "assigned_sales_owner_id": uid,
            "stage": {"$nin": ["won", "lost", "closed"]},
        })
        capacity_remaining = max(0, max_leads - active_leads)
        capacity_score = min(capacity_remaining / max(max_leads, 1) * 100, 100)

        # Availability (active flag)
        avail_score = 100 if cap.get("active", True) else 0

        candidates.append({
            "id": uid,
            "name": user.get("name", ""),
            "continuity_score": 0,
            "specialization_score": spec_score,
            "availability_score": avail_score,
            "capacity_remaining_score": capacity_score,
            "response_speed_score": 70,  # Default until we have response data
            "active_leads": active_leads,
            "max_leads": max_leads,
        })

    # Score and rank
    for c in candidates:
        c["_score"] = score_sales_candidate(c)

    candidates.sort(key=lambda c: c["_score"], reverse=True)
    winner = candidates[0] if candidates else None

    # Log assignment decision
    await db.assignment_audit_log.insert_one({
        "entity_type": "lead",
        "routing_mode": "scored_assignment",
        "candidates": [{"id": c["id"], "name": c["name"], "score": c["_score"]} for c in candidates],
        "selected_id": winner["id"] if winner else None,
        "selected_score": winner["_score"] if winner else 0,
        "was_overridden": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return {
        "assigned_sales_id": winner["id"] if winner else None,
        "routing_mode": "scored_assignment",
        "reason": f"Best match: {winner['name']} (score: {winner['_score']})" if winner else "No match",
        "candidates": [{"id": c["id"], "name": c["name"], "score": c["_score"]} for c in candidates[:5]],
    }
