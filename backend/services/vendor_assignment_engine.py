"""
Smart Vendor Assignment Engine.
Considers: capability match → availability → turnaround → workload.
Falls back to alternative vendor if primary is occupied.
"""
from datetime import datetime, timezone


async def find_best_vendor(db, required_capabilities: list, exclude_vendor_ids: list = None) -> dict:
    """
    Find the best available vendor based on:
    1. Taxonomy capability match
    2. Availability (active status)
    3. Current workload (fewer active orders = higher priority)
    4. Turnaround history (past completion speed)
    """
    exclude_vendor_ids = exclude_vendor_ids or []

    # Step 1: Find vendors with matching capabilities
    cap_query = {}
    if required_capabilities:
        cap_query["capabilities"] = {"$in": required_capabilities}

    capabilities = await db.vendor_capabilities.find(cap_query, {"_id": 0}).to_list(100)
    candidate_vendor_ids = list(set(
        c.get("vendor_id") for c in capabilities
        if c.get("vendor_id") and c.get("vendor_id") not in exclude_vendor_ids
    ))

    if not candidate_vendor_ids:
        # Fallback: get all active vendors
        all_vendors = await db.users.find(
            {"role": {"$in": ["vendor", "partner"]}, "status": {"$ne": "inactive"}},
            {"_id": 0, "id": 1}
        ).to_list(100)
        candidate_vendor_ids = [
            v["id"] for v in all_vendors
            if v.get("id") and v["id"] not in exclude_vendor_ids
        ]

    if not candidate_vendor_ids:
        return None

    # Step 2: Get vendor profiles and active workload
    scored = []
    for vid in candidate_vendor_ids:
        vendor = await db.users.find_one(
            {"id": vid, "status": {"$ne": "inactive"}},
            {"_id": 0, "id": 1, "full_name": 1, "email": 1, "partner_id": 1}
        )
        if not vendor:
            continue

        partner_id = vendor.get("partner_id") or vid

        # Count active (non-completed) vendor orders
        active_count = await db.vendor_orders.count_documents({
            "vendor_id": partner_id,
            "status": {"$nin": ["completed", "cancelled", "delivered"]},
        })

        # Count completed orders (turnaround history)
        completed_count = await db.vendor_orders.count_documents({
            "vendor_id": partner_id,
            "status": {"$in": ["completed", "delivered"]},
        })

        # Capability match count
        cap_match_count = sum(
            1 for c in capabilities
            if c.get("vendor_id") == vid
        )

        # Score: higher capability match = better, lower workload = better, more completions = better
        score = (cap_match_count * 10) - (active_count * 3) + (min(completed_count, 10))

        scored.append({
            "vendor_id": partner_id,
            "vendor_user_id": vid,
            "vendor_name": vendor.get("full_name", ""),
            "vendor_email": vendor.get("email", ""),
            "active_orders": active_count,
            "completed_orders": completed_count,
            "capability_match": cap_match_count,
            "score": score,
        })

    if not scored:
        return None

    # Sort by score descending
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[0]


async def get_vendor_candidates(db, required_capabilities: list = None, limit: int = 5) -> list:
    """
    Return a ranked list of vendor candidates for assignment review.
    """
    candidates = []
    exclude = []

    for _ in range(min(limit, 10)):
        best = await find_best_vendor(db, required_capabilities or [], exclude)
        if not best:
            break
        candidates.append(best)
        exclude.append(best["vendor_user_id"])

    return candidates
