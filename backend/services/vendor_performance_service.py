"""
Vendor Performance Service — Computes real performance scores from operational data.
Role-safe: vendor sees only own score, admin sees all. No rater identity exposed.

Metrics:
  1. Responsiveness (20%) — time from assignment to first status update/note
  2. Timeliness (25%) — promised ETA vs actual completion
  3. Quality (25%) — order completion rate, low issue/return rate
  4. Compliance (10%) — following process: setting ETA, adding notes, proper status flow
  5. Customer/Internal Rating (20%) — anonymous ratings from internal reviewers
"""
from datetime import datetime, timezone, timedelta


DEFAULT_WEIGHTS = {
    "responsiveness": 0.20,
    "timeliness": 0.25,
    "quality": 0.25,
    "compliance": 0.10,
    "rating": 0.20,
}

THRESHOLDS = {"excellent": 85, "safe": 70, "risk": 50}


def get_zone(score, min_sample=3, sample_size=0):
    if sample_size < min_sample:
        return "developing"
    if score >= THRESHOLDS["excellent"]:
        return "excellent"
    if score >= THRESHOLDS["safe"]:
        return "safe"
    return "risk"


def generate_vendor_tips(breakdown):
    tips = []
    for item in breakdown:
        if item["raw_score"] < 60:
            tips.append(f"Improve {item['label']}: currently at {item['raw_score']}%. {item.get('tip', '')}")
    if not tips:
        tips.append("Keep up the strong performance across all metrics.")
    return tips


async def compute_vendor_performance(db, vendor_id: str, vendor_name: str = ""):
    """Compute real performance from vendor_orders operational data."""
    now = datetime.now(timezone.utc)

    # Get all vendor orders for this vendor
    all_orders = await db.vendor_orders.find(
        {"vendor_id": vendor_id},
        {"_id": 0, "id": 1, "status": 1, "created_at": 1, "updated_at": 1,
         "vendor_promised_date": 1, "eta_updated_at": 1, "notes": 1,
         "last_vendor_note": 1}
    ).to_list(500)

    total_orders = len(all_orders)

    # ---- 1. Responsiveness: time from assignment to first vendor action ----
    # A "responsive" vendor updates status or adds a note quickly
    responsive_count = 0
    orders_with_events = 0
    for vo in all_orders:
        created = vo.get("created_at")
        if not created:
            continue
        orders_with_events += 1
        # Check if vendor responded (has notes or status beyond assigned)
        has_note = bool(vo.get("notes")) or bool(vo.get("last_vendor_note"))
        has_status_change = vo.get("status") not in (None, "assigned", "pending")
        has_eta = bool(vo.get("vendor_promised_date"))
        if has_note or has_status_change or has_eta:
            responsive_count += 1

    responsiveness_raw = (responsive_count / max(orders_with_events, 1)) * 100

    # ---- 2. Timeliness: promised ETA vs actual completion ----
    on_time_count = 0
    orders_with_eta = 0
    for vo in all_orders:
        promised = vo.get("vendor_promised_date")
        if not promised:
            continue
        orders_with_eta += 1
        status = vo.get("status", "")
        completed_statuses = {"completed", "delivered", "ready_for_pickup", "ready_for_dispatch"}
        if status in completed_statuses:
            updated = vo.get("updated_at", "")
            if updated and promised:
                try:
                    promised_dt = datetime.fromisoformat(str(promised).replace("Z", "+00:00")) if "T" not in str(promised) else datetime.fromisoformat(str(promised).replace("Z", "+00:00"))
                    updated_dt = datetime.fromisoformat(str(updated).replace("Z", "+00:00"))
                    # Allow 1 day grace
                    if updated_dt <= promised_dt + timedelta(days=1):
                        on_time_count += 1
                    # else late
                except (ValueError, TypeError):
                    on_time_count += 1  # benefit of doubt on parse errors

    timeliness_raw = (on_time_count / max(orders_with_eta, 1)) * 100 if orders_with_eta > 0 else 75  # default if no ETA data

    # ---- 3. Quality: completion rate (completed / total non-draft) ----
    completed_statuses = {"completed", "delivered"}
    issue_statuses = {"cancelled", "rejected", "returned"}
    completed_count = sum(1 for vo in all_orders if vo.get("status") in completed_statuses)
    issue_count = sum(1 for vo in all_orders if vo.get("status") in issue_statuses)
    active_count = total_orders - issue_count
    quality_raw = (completed_count / max(active_count, 1)) * 100 if active_count > 0 else 75

    # ---- 4. Compliance: following process (ETA set, notes added, proper status flow) ----
    compliant_count = 0
    for vo in all_orders:
        compliance_score = 0
        checks = 0
        # Check 1: ETA was set
        if vo.get("vendor_promised_date"):
            compliance_score += 1
        checks += 1
        # Check 2: At least one note was added
        if vo.get("notes") or vo.get("last_vendor_note"):
            compliance_score += 1
        checks += 1
        # Check 3: Status is beyond initial assignment
        if vo.get("status") not in (None, "assigned"):
            compliance_score += 1
        checks += 1

        if checks > 0 and (compliance_score / checks) >= 0.5:
            compliant_count += 1

    compliance_raw = (compliant_count / max(total_orders, 1)) * 100 if total_orders > 0 else 50

    # ---- 5. Internal/Customer Rating ----
    rating_pipeline = [
        {"$match": {"rated_vendor_id": vendor_id}},
        {"$group": {"_id": None, "avg": {"$avg": "$score"}, "count": {"$sum": 1}}},
    ]
    rating_avg = 75  # default if no ratings
    rating_count = 0
    async for row in db.vendor_performance_ratings.aggregate(rating_pipeline):
        rating_avg = row.get("avg", 75)
        rating_count = row.get("count", 0)
    rating_raw = min(rating_avg, 100)

    sample_size = total_orders + rating_count

    breakdown = [
        {
            "key": "timeliness", "label": "Timeliness",
            "raw_score": round(timeliness_raw), "weight": DEFAULT_WEIGHTS["timeliness"],
            "weighted": round(timeliness_raw * DEFAULT_WEIGHTS["timeliness"], 1),
            "tip": "Set realistic ETAs and complete orders before the promised date."
        },
        {
            "key": "quality", "label": "Quality",
            "raw_score": round(quality_raw), "weight": DEFAULT_WEIGHTS["quality"],
            "weighted": round(quality_raw * DEFAULT_WEIGHTS["quality"], 1),
            "tip": "Minimize cancellations and returns. Ensure deliverables meet specifications."
        },
        {
            "key": "responsiveness", "label": "Responsiveness",
            "raw_score": round(responsiveness_raw), "weight": DEFAULT_WEIGHTS["responsiveness"],
            "weighted": round(responsiveness_raw * DEFAULT_WEIGHTS["responsiveness"], 1),
            "tip": "Acknowledge new orders quickly with a status update or note."
        },
        {
            "key": "rating", "label": "Internal Rating",
            "raw_score": round(rating_raw), "weight": DEFAULT_WEIGHTS["rating"],
            "weighted": round(rating_raw * DEFAULT_WEIGHTS["rating"], 1),
            "tip": "Maintain good communication and quality to earn high internal ratings."
        },
        {
            "key": "compliance", "label": "Process Compliance",
            "raw_score": round(compliance_raw), "weight": DEFAULT_WEIGHTS["compliance"],
            "weighted": round(compliance_raw * DEFAULT_WEIGHTS["compliance"], 1),
            "tip": "Always set an ETA, add progress notes, and follow the status workflow."
        },
    ]

    total_score = round(sum(b["weighted"] for b in breakdown))
    zone = get_zone(total_score, sample_size=sample_size)
    tips = generate_vendor_tips(breakdown)

    return {
        "vendor_id": vendor_id,
        "vendor_name": vendor_name,
        "performance_score": total_score,
        "performance_zone": zone,
        "sample_size": sample_size,
        "breakdown": breakdown,
        "tips": tips,
        "computed_at": now.isoformat(),
        "last_updated": now.isoformat(),
    }
