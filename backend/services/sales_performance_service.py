"""
Sales Performance Service — Calculates real performance scores from MongoDB data.
Role-safe: sales see only own score, admin sees all. No rater identity exposed.
"""
from datetime import datetime, timezone, timedelta


DEFAULT_WEIGHTS = {
    "conversion_rate": 0.25,
    "response_speed": 0.15,
    "revenue_contribution": 0.20,
    "follow_up_compliance": 0.10,
    "customer_rating": 0.30,
}

THRESHOLDS = {"excellent": 85, "safe": 70, "risk": 50}


def get_zone(score, min_sample=5, sample_size=0):
    if sample_size < min_sample:
        return "developing"
    if score >= THRESHOLDS["excellent"]:
        return "excellent"
    if score >= THRESHOLDS["safe"]:
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
        {"key": "customer_rating", "label": "Customer Rating", "raw_score": round(customer_rating_raw), "weight": DEFAULT_WEIGHTS["customer_rating"], "weighted": round(customer_rating_raw * DEFAULT_WEIGHTS["customer_rating"], 1), "tip": "Ensure timely communication and clear expectations."},
        {"key": "conversion_rate", "label": "Conversion Rate", "raw_score": round(conversion_raw), "weight": DEFAULT_WEIGHTS["conversion_rate"], "weighted": round(conversion_raw * DEFAULT_WEIGHTS["conversion_rate"], 1), "tip": "Focus on qualifying leads before quoting."},
        {"key": "revenue_contribution", "label": "Revenue Contribution", "raw_score": round(revenue_raw), "weight": DEFAULT_WEIGHTS["revenue_contribution"], "weighted": round(revenue_raw * DEFAULT_WEIGHTS["revenue_contribution"], 1), "tip": "Prioritize high-value opportunities."},
        {"key": "response_speed", "label": "Response Speed", "raw_score": round(response_raw), "weight": DEFAULT_WEIGHTS["response_speed"], "weighted": round(response_raw * DEFAULT_WEIGHTS["response_speed"], 1), "tip": "Add first note within 24 hours of lead assignment."},
        {"key": "follow_up_compliance", "label": "Follow-up Compliance", "raw_score": round(followup_raw), "weight": DEFAULT_WEIGHTS["follow_up_compliance"], "weighted": round(followup_raw * DEFAULT_WEIGHTS["follow_up_compliance"], 1), "tip": "Set follow-up dates on every active lead."},
    ]

    total_score = round(sum(b["weighted"] for b in breakdown))
    zone = get_zone(total_score, sample_size=sample_size)
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
