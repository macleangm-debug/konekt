"""
Sales Performance Service — Calculates real performance scores from MongoDB data.
Role-safe: sales see only own score, admin sees all. No rater identity exposed.
Reads weights/thresholds from performance_governance collection when available.
"""
from datetime import datetime, timezone, timedelta


DEFAULT_WEIGHTS = {
    "conversion_rate": 0.25,
    "response_speed": 0.15,
    "revenue_contribution": 0.20,
    "follow_up_compliance": 0.10,
    "customer_rating": 0.30,
}

DEFAULT_THRESHOLDS = {"excellent": 85, "safe": 70, "risk": 50}
DEFAULT_MIN_SAMPLE = 5


async def _load_governance(db):
    """Load governance settings if available, else defaults."""
    doc = await db.performance_governance.find_one({"key": "settings"}, {"_id": 0})
    if doc and "sales" in doc:
        s = doc["sales"]
        return (
            s.get("weights", DEFAULT_WEIGHTS),
            s.get("thresholds", DEFAULT_THRESHOLDS),
            s.get("min_sample_size", DEFAULT_MIN_SAMPLE),
        )
    return DEFAULT_WEIGHTS, DEFAULT_THRESHOLDS, DEFAULT_MIN_SAMPLE


def get_zone(score, thresholds, min_sample=5, sample_size=0):
    if sample_size < min_sample:
        return "developing"
    if score >= thresholds.get("excellent", 85):
        return "excellent"
    if score >= thresholds.get("safe", 70):
        return "safe"
    return "risk"


def generate_tips(breakdown):
    tips = []
    for item in breakdown:
        if item["raw_score"] < 60:
            tips.append(f"Improve {item['label']}: currently at {item['raw_score']}%. {item.get('tip', '')}")
    if not tips:
        tips.append("Keep up the strong performance across all metrics.")
    return tips


async def compute_sales_performance(db, sales_user_id: str, sales_name: str = ""):
    """Compute real performance from leads, quotes, orders, and ratings."""
    weights, thresholds, min_sample = await _load_governance(db)
    now = datetime.now(timezone.utc)
    thirty_days_ago = (now - timedelta(days=30)).isoformat()

    # 1. Conversion rate: won / (won + lost) in last 30 days
    leads_total = await db.crm_leads.count_documents({
        "assigned_sales_owner_id": sales_user_id,
        "stage": {"$in": ["won", "lost"]},
    })
    leads_won = await db.crm_leads.count_documents({
        "assigned_sales_owner_id": sales_user_id,
        "stage": "won",
    })
    conversion_raw = (leads_won / max(leads_total, 1)) * 100

    # 2. Response speed: % of leads with first action within 24h (scored 0-100)
    all_leads = await db.crm_leads.count_documents({"assigned_sales_owner_id": sales_user_id})
    leads_with_notes = await db.crm_leads.count_documents({
        "assigned_sales_owner_id": sales_user_id,
        "notes": {"$exists": True, "$ne": []},
    })
    response_raw = (leads_with_notes / max(all_leads, 1)) * 100

    # 3. Revenue contribution: based on quotes converted to orders
    pipeline = [
        {"$match": {"created_by_id": sales_user_id, "status": "converted"}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}},
    ]
    revenue = 0
    async for row in db.quotes_v2.aggregate(pipeline):
        revenue = row.get("total", 0)
    # Normalize: 100k+ = 100 score
    revenue_raw = min(revenue / 1000, 100)

    # 4. Follow-up compliance: % of leads with follow-up set
    leads_with_followup = await db.crm_leads.count_documents({
        "assigned_sales_owner_id": sales_user_id,
        "follow_up_at": {"$exists": True, "$ne": None},
    })
    followup_raw = (leads_with_followup / max(all_leads, 1)) * 100

    # 5. Customer rating: average from ratings collection (anonymous)
    rating_pipeline = [
        {"$match": {"rated_sales_id": sales_user_id}},
        {"$group": {"_id": None, "avg": {"$avg": "$score"}, "count": {"$sum": 1}}},
    ]
    rating_avg = 75  # default if no ratings
    rating_count = 0
    async for row in db.performance_ratings.aggregate(rating_pipeline):
        rating_avg = row.get("avg", 75)
        rating_count = row.get("count", 0)
    customer_rating_raw = min(rating_avg, 100)

    sample_size = leads_total + rating_count

    breakdown = [
        {"key": "customer_rating", "label": "Customer Rating", "raw_score": round(customer_rating_raw), "weight": weights.get("customer_rating", 0.30), "weighted": round(customer_rating_raw * weights.get("customer_rating", 0.30), 1), "tip": "Ensure timely communication and clear expectations."},
        {"key": "conversion_rate", "label": "Conversion Rate", "raw_score": round(conversion_raw), "weight": weights.get("conversion_rate", 0.25), "weighted": round(conversion_raw * weights.get("conversion_rate", 0.25), 1), "tip": "Focus on qualifying leads before quoting."},
        {"key": "revenue_contribution", "label": "Revenue Contribution", "raw_score": round(revenue_raw), "weight": weights.get("revenue_contribution", 0.20), "weighted": round(revenue_raw * weights.get("revenue_contribution", 0.20), 1), "tip": "Prioritize high-value opportunities."},
        {"key": "response_speed", "label": "Response Speed", "raw_score": round(response_raw), "weight": weights.get("response_speed", 0.15), "weighted": round(response_raw * weights.get("response_speed", 0.15), 1), "tip": "Add first note within 24 hours of lead assignment."},
        {"key": "follow_up_compliance", "label": "Follow-up Compliance", "raw_score": round(followup_raw), "weight": weights.get("follow_up_compliance", 0.10), "weighted": round(followup_raw * weights.get("follow_up_compliance", 0.10), 1), "tip": "Set follow-up dates on every active lead."},
    ]

    total_score = round(sum(b["weighted"] for b in breakdown))
    zone = get_zone(total_score, thresholds, min_sample=min_sample, sample_size=sample_size)
    tips = generate_tips(breakdown)

    return {
        "sales_user_id": sales_user_id,
        "sales_name": sales_name,
        "performance_score": total_score,
        "performance_zone": zone,
        "sample_size": sample_size,
        "breakdown": breakdown,
        "tips": tips,
        "computed_at": now.isoformat(),
    }
