"""
Team Performance API — Aggregated team data for admin overview, leaderboard, and alerts.
Single endpoint that provides all data needed for the Team Performance pages.
"""
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/admin/team-performance", tags=["team-performance"])


@router.get("/summary")
async def get_team_performance_summary(request: Request):
    """Comprehensive team performance data for overview, leaderboard, and alerts."""
    db = request.app.mongodb
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)

    # Get all sales users
    sales_users = await db.users.find(
        {"role": {"$in": ["sales", "staff"]}},
        {"_id": 0, "id": 1, "email": 1, "full_name": 1}
    ).to_list(100)

    # Bulk-fetch relevant collections
    all_orders = await db.orders.find(
        {"status": {"$nin": ["cancelled", "draft"]}},
        {"_id": 0, "assigned_sales_id": 1, "total_amount": 1, "total": 1,
         "payment_status": 1, "rating": 1, "created_at": 1, "status": 1}
    ).to_list(5000)

    all_leads = await db.crm_leads.find(
        {}, {"_id": 0, "assigned_to": 1, "stage": 1, "status": 1,
             "expected_value": 1, "estimated_value": 1,
             "next_follow_up_at": 1, "last_contacted_at": 1, "created_at": 1}
    ).to_list(5000)

    all_quotes = await db.quotes_v2.find(
        {}, {"_id": 0, "created_by": 1, "status": 1, "total": 1, "created_at": 1}
    ).to_list(5000)
    if not all_quotes:
        all_quotes = await db.quotes.find(
            {}, {"_id": 0, "created_by": 1, "status": 1, "total": 1,
                 "total_amount": 1, "created_at": 1}
        ).to_list(5000)

    all_commissions = await db.commissions.find(
        {"beneficiary_type": "sales"},
        {"_id": 0, "beneficiary_user_id": 1, "amount": 1}
    ).to_list(5000)

    all_ratings = await db.sales_ratings.find(
        {}, {"_id": 0, "rated_user_id": 1, "stars": 1, "rating": 1}
    ).to_list(5000)

    # Build per-rep stats
    reps = []
    total_revenue = 0
    total_deals = 0
    total_pipeline = 0
    total_overdue = 0

    for user in sales_users:
        uid = user.get("id", "")
        uemail = user.get("email", "")
        name = user.get("full_name", uemail)

        # Orders for this rep
        rep_orders = [o for o in all_orders if o.get("assigned_sales_id") in (uid, uemail)]
        paid_orders = [o for o in rep_orders if o.get("payment_status") in ("paid", "verified")]
        deals = len(paid_orders)
        revenue = sum(float(o.get("total_amount") or o.get("total") or 0) for o in paid_orders)

        # Leads
        rep_leads = [l for l in all_leads if l.get("assigned_to") in (uid, uemail)]
        active_leads = len([l for l in rep_leads if l.get("stage") not in ("closed_won", "closed_lost", "disqualified")])
        pipeline_value = sum(float(l.get("expected_value") or l.get("estimated_value") or 0) for l in rep_leads if l.get("stage") not in ("closed_won", "closed_lost", "disqualified"))

        # Overdue follow-ups
        overdue_count = 0
        for l in rep_leads:
            nf = l.get("next_follow_up_at")
            if nf:
                try:
                    nf_dt = datetime.fromisoformat(str(nf).replace("Z", "+00:00")) if isinstance(nf, str) else nf
                    if nf_dt.tzinfo is None:
                        nf_dt = nf_dt.replace(tzinfo=timezone.utc)
                    if nf_dt < now:
                        overdue_count += 1
                except Exception:
                    pass

        # Quotes
        rep_quotes = [q for q in all_quotes if q.get("created_by") in (uid, uemail)]
        quotes_sent = len(rep_quotes)

        # Conversion rate: deals / (deals + active_leads) if denominator > 0
        conversion = round((deals / max(deals + active_leads, 1)) * 100, 1)

        # Commission
        rep_comms = [c for c in all_commissions if c.get("beneficiary_user_id") == uid]
        commission = sum(c.get("amount", 0) for c in rep_comms)

        # Rating
        rep_order_ratings = [o["rating"]["stars"] for o in rep_orders if o.get("rating", {}).get("stars")]
        rep_direct_ratings = [r.get("stars") or r.get("rating", 0) for r in all_ratings if r.get("rated_user_id") == uid]
        all_rep_ratings = rep_order_ratings + [r for r in rep_direct_ratings if r > 0]
        avg_rating = round(sum(all_rep_ratings) / max(len(all_rep_ratings), 1), 1) if all_rep_ratings else 0

        total_revenue += revenue
        total_deals += deals
        total_pipeline += pipeline_value
        total_overdue += overdue_count

        reps.append({
            "id": uid,
            "name": name,
            "email": uemail,
            "active_leads": active_leads,
            "quotes_sent": quotes_sent,
            "deals_won": deals,
            "revenue": round(revenue),
            "pipeline_value": round(pipeline_value),
            "conversion_rate": conversion,
            "avg_rating": avg_rating,
            "commission": round(commission),
            "overdue_followups": overdue_count,
        })

    # Scoring & ranking for leaderboard
    max_deals = max((r["deals_won"] for r in reps), default=1) or 1
    max_rev = max((r["revenue"] for r in reps), default=1) or 1
    max_comm = max((r["commission"] for r in reps), default=1) or 1

    for r in reps:
        nd = (r["deals_won"] / max_deals) * 100
        nr = (r["revenue"] / max_rev) * 100
        nc = (r["commission"] / max_comm) * 100
        nrat = (r["avg_rating"] / 5) * 100
        score = (nd * 0.30) + (nc * 0.30) + (nrat * 0.25) + (nr * 0.15)
        r["score"] = round(score, 1)
        if score >= 75:
            r["label"] = "Top Performer"
        elif score >= 50:
            r["label"] = "Strong"
        elif score >= 25:
            r["label"] = "Improving"
        else:
            r["label"] = "Needs Attention"

    reps.sort(key=lambda x: -x["score"])
    for i, r in enumerate(reps):
        r["rank"] = i + 1

    # Global KPIs
    all_active_leads = len([l for l in all_leads if l.get("stage") not in ("closed_won", "closed_lost", "disqualified")])
    total_leads = len(all_leads)
    total_quotes_sent = len(all_quotes)
    avg_conversion = round((total_deals / max(total_deals + all_active_leads, 1)) * 100, 1)
    avg_rating_all = 0
    all_avg = [r["avg_rating"] for r in reps if r["avg_rating"] > 0]
    if all_avg:
        avg_rating_all = round(sum(all_avg) / len(all_avg), 1)

    # Alerts: overdue follow-ups, stale leads (no contact in 7+ days), payment issues
    alerts = []

    # Build user ID → name lookup
    all_users_lookup = {}
    for u in sales_users:
        all_users_lookup[u.get("id", "")] = u.get("full_name", u.get("email", ""))
        all_users_lookup[u.get("email", "")] = u.get("full_name", u.get("email", ""))

    def _resolve_name(uid):
        return all_users_lookup.get(uid, uid[:20] if uid and len(uid) > 20 else uid or "Unassigned")

    # Overdue follow-ups
    for l in all_leads:
        nf = l.get("next_follow_up_at")
        if nf:
            try:
                nf_dt = datetime.fromisoformat(str(nf).replace("Z", "+00:00")) if isinstance(nf, str) else nf
                if nf_dt.tzinfo is None:
                    nf_dt = nf_dt.replace(tzinfo=timezone.utc)
                if nf_dt < now:
                    days_overdue = (now - nf_dt).days
                    alerts.append({
                        "type": "overdue_followup",
                        "severity": "critical" if days_overdue > 3 else "warning",
                        "message": f"Follow-up overdue by {days_overdue} day{'s' if days_overdue != 1 else ''}",
                        "entity": _resolve_name(l.get("assigned_to", "")),
                        "reference": l.get("contact_name") or l.get("company_name") or "",
                        "date": nf_dt.isoformat(),
                        "lead_id": l.get("id", ""),
                    })
            except Exception:
                pass

    # Stale leads (not contacted in 7+ days)
    for l in all_leads:
        if l.get("stage") in ("closed_won", "closed_lost", "disqualified"):
            continue
        lc = l.get("last_contacted_at")
        if lc:
            try:
                lc_dt = datetime.fromisoformat(str(lc).replace("Z", "+00:00")) if isinstance(lc, str) else lc
                if lc_dt.tzinfo is None:
                    lc_dt = lc_dt.replace(tzinfo=timezone.utc)
                if lc_dt < week_ago:
                    days_stale = (now - lc_dt).days
                    alerts.append({
                        "type": "stale_lead",
                        "severity": "warning",
                        "message": f"Lead not contacted in {days_stale} days",
                        "entity": _resolve_name(l.get("assigned_to", "")),
                        "reference": l.get("contact_name") or l.get("company_name") or "",
                        "date": lc_dt.isoformat(),
                        "lead_id": l.get("id", ""),
                    })
            except Exception:
                pass

    # Pending payments
    pending_payments = await db.orders.count_documents(
        {"payment_status": {"$in": ["pending", "awaiting_proof"]}, "status": {"$ne": "cancelled"}}
    )
    if pending_payments > 0:
        alerts.append({
            "type": "pending_payments",
            "severity": "warning" if pending_payments < 10 else "critical",
            "message": f"{pending_payments} order{'s' if pending_payments != 1 else ''} awaiting payment",
            "entity": "Payments",
            "date": now.isoformat(),
        })

    # Sort alerts by severity
    sev_order = {"critical": 0, "warning": 1, "info": 2}
    alerts.sort(key=lambda a: sev_order.get(a["severity"], 2))

    return {
        "ok": True,
        "kpis": {
            "total_revenue": round(total_revenue),
            "deals_closed": total_deals,
            "active_leads": all_active_leads,
            "total_leads": total_leads,
            "total_quotes": total_quotes_sent,
            "pipeline_value": round(total_pipeline),
            "conversion_rate": avg_conversion,
            "avg_rating": avg_rating_all,
            "overdue_followups": total_overdue,
            "pending_payments": pending_payments,
        },
        "reps": reps,
        "alerts": alerts[:50],
        "team_size": len(sales_users),
    }
