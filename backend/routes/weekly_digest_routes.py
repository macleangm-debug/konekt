"""
Weekly Digest API — Aggregated executive snapshot for the Weekly Operations Report.
Pulls from orders, payments, leads, quotes, partners, affiliates, alerts.
"""
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/admin/weekly-digest", tags=["weekly-digest"])


@router.get("/snapshot")
async def get_weekly_digest(request: Request):
    """Generate a weekly operations digest snapshot."""
    db = request.app.mongodb
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    week_ago_iso = week_ago.isoformat()

    # --- REVENUE & ORDERS ---
    all_orders = await db.orders.find(
        {"status": {"$nin": ["cancelled", "draft"]}},
        {"_id": 0, "total_amount": 1, "total": 1, "payment_status": 1,
         "created_at": 1, "assigned_sales_id": 1, "category": 1,
         "items": 1, "customer_email": 1, "customer_name": 1}
    ).to_list(5000)

    paid_orders = [o for o in all_orders if o.get("payment_status") in ("paid", "verified")]
    total_revenue = sum(float(o.get("total_amount") or o.get("total") or 0) for o in paid_orders)
    total_orders = len(all_orders)

    # Build product name → category lookup
    all_products = await db.products.find({}, {"_id": 0, "name": 1, "category": 1}).to_list(1000)
    product_cat_map = {}
    for p in all_products:
        name = (p.get("name") or "").lower().strip()
        cat = p.get("category") or ""
        if name and cat:
            product_cat_map[name] = cat

    # Build UUID → category name lookup
    cat_docs = await db.catalog_categories.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(100)
    cat_id_map = {c["id"]: c["name"] for c in cat_docs if c.get("id") and c.get("name")}

    # Build keyword → category mapping for fuzzy matching
    keyword_cat = {}
    for pname, pcat in product_cat_map.items():
        for word in pname.split():
            if len(word) > 3:
                keyword_cat[word] = pcat

    # Revenue by category
    rev_by_cat = {}
    for o in paid_orders:
        amt = float(o.get("total_amount") or o.get("total") or 0)
        order_cat = None

        # Try to resolve from line_items
        line_items = o.get("line_items") or o.get("items") or []
        if line_items and isinstance(line_items, list):
            for li in line_items:
                if isinstance(li, dict):
                    desc = (li.get("description") or li.get("name") or "").lower().strip()
                    # Exact product match
                    for pname, pcat in product_cat_map.items():
                        if pname in desc or desc in pname:
                            order_cat = pcat
                            break
                    # Keyword match
                    if not order_cat:
                        for word in desc.split():
                            if len(word) > 3 and word in keyword_cat:
                                order_cat = keyword_cat[word]
                                break
                    if order_cat:
                        break

        # Fallback to order-level category
        if not order_cat:
            order_cat = o.get("category") or ""

        # Resolve UUID category to name
        if order_cat and order_cat in cat_id_map:
            order_cat = cat_id_map[order_cat]

        # Classify based on order type if still unknown
        if not order_cat:
            order_type = o.get("order_type", "")
            if order_type == "service":
                order_cat = "Services"
            elif order_type == "quote":
                order_cat = "Custom Orders"
            else:
                order_cat = "General"

        rev_by_cat[order_cat] = rev_by_cat.get(order_cat, 0) + amt

    rev_breakdown = sorted(
        [{"category": k, "revenue": round(v), "pct": 0} for k, v in rev_by_cat.items()],
        key=lambda x: -x["revenue"]
    )
    if total_revenue > 0:
        for r in rev_breakdown:
            r["pct"] = round((r["revenue"] / total_revenue) * 100, 1)

    # Unique customers
    customer_emails = set(o.get("customer_email", "") for o in all_orders if o.get("customer_email"))

    # --- OPERATIONS HEALTH ---
    pending_payments = await db.orders.count_documents(
        {"payment_status": {"$in": ["pending", "awaiting_proof"]}, "status": {"$ne": "cancelled"}}
    )

    # Overdue follow-ups from CRM
    all_leads = await db.crm_leads.find(
        {}, {"_id": 0, "assigned_to": 1, "next_follow_up_at": 1, "stage": 1,
             "last_contacted_at": 1, "contact_name": 1, "company_name": 1}
    ).to_list(5000)

    overdue_followups = 0
    stale_leads = 0
    for l in all_leads:
        nf = l.get("next_follow_up_at")
        if nf:
            try:
                nf_dt = datetime.fromisoformat(str(nf).replace("Z", "+00:00")) if isinstance(nf, str) else nf
                if nf_dt.tzinfo is None:
                    nf_dt = nf_dt.replace(tzinfo=timezone.utc)
                if nf_dt < now:
                    overdue_followups += 1
            except Exception:
                pass
        if l.get("stage") not in ("closed_won", "closed_lost", "disqualified"):
            lc = l.get("last_contacted_at")
            if lc:
                try:
                    lc_dt = datetime.fromisoformat(str(lc).replace("Z", "+00:00")) if isinstance(lc, str) else lc
                    if lc_dt.tzinfo is None:
                        lc_dt = lc_dt.replace(tzinfo=timezone.utc)
                    if lc_dt < week_ago:
                        stale_leads += 1
                except Exception:
                    pass

    # Unassigned tasks (admin_tasks without assignee)
    unassigned_tasks = await db.admin_tasks.count_documents(
        {"$or": [{"assigned_to": {"$exists": False}}, {"assigned_to": None}, {"assigned_to": ""}]}
    )

    # --- SALES PERFORMANCE ---
    sales_users = await db.users.find(
        {"role": {"$in": ["sales", "staff"]}},
        {"_id": 0, "id": 1, "email": 1, "full_name": 1}
    ).to_list(100)

    reps = []
    for user in sales_users:
        uid = user.get("id", "")
        uemail = user.get("email", "")
        name = user.get("full_name", uemail)
        rep_orders = [o for o in paid_orders if o.get("assigned_sales_id") in (uid, uemail)]
        deals = len(rep_orders)
        revenue = sum(float(o.get("total_amount") or o.get("total") or 0) for o in rep_orders)
        reps.append({"name": name, "deals": deals, "revenue": round(revenue)})

    reps.sort(key=lambda x: -x["revenue"])
    top_reps = reps[:3]
    lowest_rep = reps[-1] if len(reps) > 1 else None

    # Stuck deals (active leads with overdue follow-up)
    stuck_deals = overdue_followups

    # --- PARTNER ECOSYSTEM ---
    total_partners = await db.partners.count_documents({})
    active_partners = await db.partners.count_documents({"status": "active"})
    inactive_partners = await db.partners.count_documents({"status": {"$in": ["inactive", "suspended"]}})

    active_partner_docs = await db.partners.find({"status": "active"}, {"_id": 0, "regions": 1, "categories": 1}).to_list(500)
    regions_covered = set()
    categories_covered = set()
    no_region = 0
    no_category = 0
    for p in active_partner_docs:
        rs = p.get("regions", [])
        cs = p.get("categories", [])
        if rs:
            regions_covered.update(rs)
        else:
            no_region += 1
        if cs:
            categories_covered.update(cs)
        else:
            no_category += 1

    pending_applications = await db.affiliate_applications.count_documents(
        {"status": {"$in": ["pending", "pending_review"]}}
    )

    # --- AFFILIATES ---
    total_affiliates = await db.affiliates.count_documents({})
    active_affiliates = await db.affiliates.count_documents({"is_active": True})

    # --- ALERTS (top 3) ---
    top_alerts = []
    if overdue_followups > 0:
        top_alerts.append({
            "severity": "critical" if overdue_followups > 10 else "warning",
            "message": f"{overdue_followups} overdue follow-ups need attention",
            "cta": "/admin/team/alerts",
            "cta_label": "View Alerts",
        })
    if pending_payments > 0:
        top_alerts.append({
            "severity": "warning",
            "message": f"{pending_payments} orders awaiting payment",
            "cta": "/admin/finance/payments-queue",
            "cta_label": "Review Payments",
        })
    if pending_applications > 0:
        top_alerts.append({
            "severity": "info",
            "message": f"{pending_applications} affiliate applications pending review",
            "cta": "/admin/affiliate-applications",
            "cta_label": "Review Applications",
        })

    # --- ACTION ITEMS ---
    actions = []
    if pending_applications > 0:
        actions.append({"label": f"Review {pending_applications} pending affiliate applications", "path": "/admin/affiliate-applications"})
    if no_region > 0:
        actions.append({"label": f"Assign regions to {no_region} active partners", "path": "/admin/partner-ecosystem"})
    if overdue_followups > 0:
        actions.append({"label": f"Follow up on {overdue_followups} overdue deals", "path": "/admin/crm"})
    if inactive_partners > 0:
        actions.append({"label": f"Activate {inactive_partners} inactive partners", "path": "/admin/partner-ecosystem"})
    if stale_leads > 0:
        actions.append({"label": f"Re-engage {stale_leads} stale leads", "path": "/admin/crm"})

    # Active partners utilization
    partner_util = round((active_partners / max(total_partners, 1)) * 100) if total_partners > 0 else 0

    return {
        "ok": True,
        "week_start": (now - timedelta(days=now.weekday())).strftime("%b %d"),
        "week_end": now.strftime("%b %d, %Y"),
        "generated_at": now.isoformat(),
        "kpis": {
            "revenue": round(total_revenue),
            "orders": total_orders,
            "customers": len(customer_emails),
            "new_affiliates": total_affiliates,
            "active_partners_pct": partner_util,
            "critical_alerts": len([a for a in top_alerts if a["severity"] == "critical"]),
        },
        "revenue_breakdown": rev_breakdown[:8],
        "operations": {
            "pending_payments": pending_payments,
            "overdue_followups": overdue_followups,
            "stale_leads": stale_leads,
            "unassigned_tasks": unassigned_tasks,
        },
        "sales": {
            "top_reps": top_reps,
            "lowest_rep": lowest_rep,
            "stuck_deals": stuck_deals,
            "total_reps": len(reps),
        },
        "ecosystem": {
            "total_partners": total_partners,
            "active_partners": active_partners,
            "inactive_partners": inactive_partners,
            "regions_without_coverage": no_region,
            "categories_without_partners": no_category,
            "pending_applications": pending_applications,
        },
        "affiliates": {
            "total": total_affiliates,
            "active": active_affiliates,
        },
        "alerts": top_alerts[:3],
        "actions": actions[:6],
    }
