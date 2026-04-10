"""
Sales Team Coaching Engine.
Generates coaching signals per sales rep using existing data:
  - Customer ratings (avg + recent low ratings)
  - Discount behavior (critical/warning alerts)
  - Performance metrics (deals, conversion, trends)
  - Activity (stale pipeline / inactivity)

Classification:
  - Top Performer  >= 75
  - Strong         50-74
  - Improving      25-49
  - Needs Attention 10-24
  - Critical       < 10
"""
import logging
from datetime import datetime, timezone, timedelta

logger = logging.getLogger("coaching_engine")

STATUS_LABELS = [
    (75, "Top Performer"),
    (50, "Strong"),
    (25, "Improving"),
    (10, "Needs Attention"),
    (0, "Critical"),
]


def _classify(score: float) -> str:
    for threshold, label in STATUS_LABELS:
        if score >= threshold:
            return label
    return "Critical"


async def generate_coaching_insights(db, team_table: list, all_orders: list, sales_map: dict) -> list:
    """
    Generate coaching insights for each sales rep.

    Args:
        db: MongoDB database
        team_table: Pre-computed per-rep performance data from dashboard_team_kpis
        all_orders: All non-cancelled orders
        sales_map: Map of user_id/email -> full_name

    Returns:
        List of coaching insight dicts, sorted by score ascending (worst first).
    """
    now = datetime.now(timezone.utc)
    seven_days_ago = (now - timedelta(days=7)).isoformat()
    five_days_ago = (now - timedelta(days=5)).isoformat()

    # Get action_alerts for the last 7 days
    recent_alerts = await db.action_alerts.find(
        {"created_at": {"$gte": seven_days_ago}},
        {"_id": 0, "alert_type": 1, "severity": 1, "related_user_id": 1,
         "related_user_name": 1, "created_at": 1}
    ).to_list(500)

    # Get recent discount requests
    recent_discounts = await db.discount_requests.find(
        {"created_at": {"$gte": seven_days_ago}},
        {"_id": 0, "requested_by_id": 1, "discount_percent": 1, "status": 1}
    ).to_list(500)

    # Discount governance thresholds
    settings_doc = await db.admin_settings.find_one({"type": "discount_governance"}, {"_id": 0})
    critical_threshold = 30
    warning_threshold = 20
    if settings_doc and settings_doc.get("settings"):
        critical_threshold = settings_doc["settings"].get("critical_threshold", 30)
        warning_threshold = settings_doc["settings"].get("warning_threshold", 20)

    # Get team averages for comparison
    team_deals = [r["deals"] for r in team_table]
    avg_team_deals = sum(team_deals) / max(len(team_deals), 1)
    team_revenues = [r["revenue"] for r in team_table]
    avg_team_revenue = sum(team_revenues) / max(len(team_revenues), 1)

    insights = []

    for rep in team_table:
        rep_id = rep.get("id", "")
        rep_name = rep.get("name", "Unknown")
        score = 50.0  # Start at neutral
        reasons = []
        actions = []

        # ── 1. Rating signals ──
        avg_rating = rep.get("avg_rating", 0)
        total_ratings = rep.get("total_ratings", 0)

        # Recent low ratings (last 7 days)
        rep_orders = [o for o in all_orders
                      if o.get("assigned_sales_id") in (rep_id, rep.get("email", ""))]
        recent_low = 0
        for o in rep_orders:
            r = o.get("rating", {})
            if r.get("stars") and r["stars"] <= 2:
                rated_at = r.get("rated_at", "")
                if rated_at and str(rated_at) >= seven_days_ago:
                    recent_low += 1

        if avg_rating > 0 and avg_rating < 3.0:
            score -= 30
            reasons.append(f"Low customer ratings (avg {avg_rating}/5)")
            actions.append("Review recent customer feedback and follow up with affected customers")
        elif avg_rating > 0 and avg_rating < 3.5:
            score -= 15
            reasons.append(f"Below-average customer ratings (avg {avg_rating}/5)")
            actions.append("Review recent customer feedback")

        if recent_low >= 2:
            score -= 20
            if not any("rating" in r.lower() for r in reasons):
                reasons.append(f"{recent_low} low ratings (≤2★) in last 7 days")
            actions.append("Prioritize customer satisfaction in current deals")

        if avg_rating >= 4.5 and total_ratings >= 3:
            score += 15  # Bonus for excellent ratings

        # ── 2. Discount risk signals ──
        rep_critical_discounts = sum(
            1 for d in recent_discounts
            if d.get("requested_by_id") == rep_id
            and float(d.get("discount_percent", 0)) >= critical_threshold
        )
        rep_warning_discounts = sum(
            1 for d in recent_discounts
            if d.get("requested_by_id") == rep_id
            and warning_threshold <= float(d.get("discount_percent", 0)) < critical_threshold
        )

        if rep_critical_discounts >= 2:
            score -= 25
            reasons.append(f"{rep_critical_discounts} critical discount approvals in last 7 days")
            actions.append("Reduce discount levels and focus on value-based selling")
        elif rep_critical_discounts == 1:
            score -= 10
            reasons.append("1 critical discount approval in last 7 days")

        if rep_warning_discounts >= 3:
            score -= 10
            reasons.append(f"{rep_warning_discounts} elevated discount requests this week")

        # ── 3. Performance signals ──
        deals = rep.get("deals", 0)
        total_orders = rep.get("total_orders", 0)
        conversion = round(deals / max(total_orders, 1) * 100) if total_orders > 0 else 0

        if deals == 0 and total_orders == 0:
            score -= 15
            reasons.append("No deals or orders yet")
            actions.append("Engage more leads this week")
        elif avg_team_deals > 0 and deals < avg_team_deals * 0.5:
            score -= 15
            reasons.append("Low deal count vs team average")
            actions.append("Focus on closing pending quotes")

        if conversion > 0 and conversion < 30:
            score -= 10
            reasons.append(f"Low conversion rate ({conversion}%)")

        if deals >= avg_team_deals * 1.5 and avg_team_deals > 0:
            score += 20  # Top performer bonus
        elif deals >= avg_team_deals and avg_team_deals > 0:
            score += 10

        # ── 4. Activity signals ──
        rep_recent_orders = [
            o for o in rep_orders
            if str(o.get("created_at", "")) >= five_days_ago
        ]
        if len(rep_orders) > 0 and len(rep_recent_orders) == 0:
            score -= 15
            reasons.append("No activity in last 5 days")
            actions.append("Follow up on stale quotes and re-engage pipeline")

        # Pipeline stagnation
        pipeline_count = sum(
            1 for o in rep_orders
            if o.get("status") in ("pending", "confirmed")
            and o.get("payment_status") not in ("paid", "verified")
        )
        if pipeline_count >= 5:
            score -= 10
            reasons.append(f"{pipeline_count} orders stalled in pipeline")
            actions.append("Convert or close stale pipeline items")

        # ── 5. Alert-based signals ──
        rep_alerts = [
            a for a in recent_alerts
            if a.get("related_user_id") == rep_id
            and a.get("severity") in ("critical", "high")
        ]
        if len(rep_alerts) >= 3:
            score -= 10
            reasons.append(f"{len(rep_alerts)} high-severity alerts this week")

        # Clamp score
        score = max(0, min(100, score))
        status = _classify(score)

        # Default positive reasons/actions for high performers
        if not reasons:
            if score >= 75:
                reasons.append("Consistently strong performance across all metrics")
                actions.append("Maintain momentum and mentor newer team members")
            else:
                reasons.append("Performance within normal range")
                actions.append("Continue current trajectory")

        # Limit to 2 reasons and 2 actions
        reasons = reasons[:2]
        actions = actions[:2]

        insights.append({
            "id": rep_id,
            "name": rep_name,
            "score": round(score),
            "status": status,
            "reasons": reasons,
            "actions": actions,
            "metrics": {
                "avg_rating": avg_rating,
                "total_ratings": total_ratings,
                "deals": deals,
                "revenue": rep.get("revenue", 0),
                "pipeline": rep.get("pipeline", 0),
                "critical_discounts": rep_critical_discounts,
                "recent_low_ratings": recent_low,
            },
        })

    # Sort: worst first (Critical/Needs Attention at top)
    insights.sort(key=lambda x: x["score"])
    return insights


def get_coaching_summary_for_report(insights: list) -> list:
    """Generate a compact coaching summary for the weekly report.
    Returns only flagged reps (Needs Attention + Critical)."""
    flagged = [i for i in insights if i["status"] in ("Critical", "Needs Attention")]
    summary = []
    for rep in flagged[:5]:
        summary.append({
            "name": rep["name"],
            "status": rep["status"],
            "issue": rep["reasons"][0] if rep["reasons"] else "Performance below threshold",
            "action": rep["actions"][0] if rep["actions"] else "Manager follow-up required",
        })
    return summary
