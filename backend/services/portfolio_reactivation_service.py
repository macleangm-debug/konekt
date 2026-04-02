"""
Portfolio & Reactivation Service — Core engine for client portfolio management.

Computes:
  - Active/Inactive/At-Risk/Lost client classifications
  - Portfolio revenue per sales owner
  - Reactivation task generation
  - Activity recency tracking

Buckets:
  - Active: activity within 60 days
  - At Risk: 60-89 days no activity
  - Inactive: 90-179 days no activity
  - Lost: 180+ days with failed follow-up
"""
from datetime import datetime, timezone, timedelta


# Default inactivity thresholds (days)
THRESHOLDS = {
    "active": 60,
    "at_risk": 90,
    "lost": 180,
}


def classify_client(last_activity_date, now=None):
    """Classify a client into active/at_risk/inactive/lost based on last activity."""
    if not last_activity_date:
        return "inactive"
    now = now or datetime.now(timezone.utc)
    try:
        if isinstance(last_activity_date, str):
            last = datetime.fromisoformat(last_activity_date.replace("Z", "+00:00"))
        else:
            last = last_activity_date
        if last.tzinfo is None:
            last = last.replace(tzinfo=timezone.utc)
        days_since = (now - last).days
    except (ValueError, TypeError):
        return "inactive"

    if days_since <= THRESHOLDS["active"]:
        return "active"
    elif days_since <= THRESHOLDS["at_risk"]:
        return "at_risk"
    elif days_since <= THRESHOLDS["lost"]:
        return "inactive"
    return "lost"


async def get_last_activity_for_entity(db, *, email: str = "", company_id: str = ""):
    """Find the most recent activity date across orders, quotes, requests for this entity."""
    dates = []

    if email:
        # Check orders
        order = await db.orders.find_one(
            {"customer_email": {"$regex": f"^{email}$", "$options": "i"}},
            {"_id": 0, "created_at": 1},
            sort=[("created_at", -1)]
        )
        if order and order.get("created_at"):
            dates.append(order["created_at"])

        # Check quotes
        quote = await db.quotes.find_one(
            {"customer_email": {"$regex": f"^{email}$", "$options": "i"}},
            {"_id": 0, "created_at": 1},
            sort=[("created_at", -1)]
        )
        if quote and quote.get("created_at"):
            dates.append(quote["created_at"])

        # Check requests
        request = await db.requests.find_one(
            {"$or": [{"guest_email": {"$regex": f"^{email}$", "$options": "i"}}]},
            {"_id": 0, "created_at": 1},
            sort=[("created_at", -1)]
        )
        if request and request.get("created_at"):
            dates.append(request["created_at"])

    if company_id:
        # Check contacts under this company for activity
        contacts = await db.contacts.find(
            {"company_id": company_id, "status": "active"},
            {"_id": 0, "email": 1}
        ).to_list(50)
        for contact in contacts:
            cemail = contact.get("email", "")
            if cemail:
                order = await db.orders.find_one(
                    {"customer_email": {"$regex": f"^{cemail}$", "$options": "i"}},
                    {"_id": 0, "created_at": 1},
                    sort=[("created_at", -1)]
                )
                if order and order.get("created_at"):
                    dates.append(order["created_at"])

    if not dates:
        return None

    # Return most recent
    parsed = []
    for d in dates:
        try:
            if isinstance(d, str):
                parsed.append(datetime.fromisoformat(d.replace("Z", "+00:00")))
            else:
                parsed.append(d)
        except (ValueError, TypeError):
            pass

    return max(parsed).isoformat() if parsed else None


async def compute_portfolio_for_owner(db, sales_user_id: str):
    """Compute full portfolio summary for a sales owner."""
    now = datetime.now(timezone.utc)

    # Get owned companies
    companies = await db.companies.find(
        {"owner_sales_id": sales_user_id, "status": "active"},
        {"_id": 0}
    ).to_list(500)

    # Get owned individuals
    individuals = await db.individual_clients.find(
        {"owner_sales_id": sales_user_id, "status": "active"},
        {"_id": 0}
    ).to_list(500)

    portfolio_items = []
    total_revenue = 0
    buckets = {"active": 0, "at_risk": 0, "inactive": 0, "lost": 0}

    # Process companies
    for comp in companies:
        last_activity = await get_last_activity_for_entity(db, company_id=comp["id"])
        classification = classify_client(last_activity, now)
        buckets[classification] += 1

        # Get revenue for this company's contacts
        contacts = await db.contacts.find(
            {"company_id": comp["id"], "status": "active"},
            {"_id": 0, "email": 1}
        ).to_list(50)
        revenue = 0
        for ct in contacts:
            if ct.get("email"):
                pipeline = [
                    {"$match": {"customer_email": {"$regex": f"^{ct['email']}$", "$options": "i"}, "status": {"$nin": ["cancelled", "draft"]}}},
                    {"$group": {"_id": None, "total": {"$sum": "$total"}}}
                ]
                async for row in db.orders.aggregate(pipeline):
                    revenue += row.get("total", 0)
        total_revenue += revenue

        portfolio_items.append({
            "type": "company",
            "id": comp["id"],
            "name": comp["name"],
            "domain": comp.get("domain", ""),
            "industry": comp.get("industry", ""),
            "classification": classification,
            "last_activity": last_activity,
            "revenue": revenue,
            "contact_count": len(contacts),
        })

    # Process individuals
    for ind in individuals:
        last_activity = await get_last_activity_for_entity(db, email=ind.get("email", ""))
        classification = classify_client(last_activity, now)
        buckets[classification] += 1

        # Get revenue
        revenue = 0
        if ind.get("email"):
            pipeline = [
                {"$match": {"customer_email": {"$regex": f"^{ind['email']}$", "$options": "i"}, "status": {"$nin": ["cancelled", "draft"]}}},
                {"$group": {"_id": None, "total": {"$sum": "$total"}}}
            ]
            async for row in db.orders.aggregate(pipeline):
                revenue += row.get("total", 0)
        total_revenue += revenue

        portfolio_items.append({
            "type": "individual",
            "id": ind["id"],
            "name": ind["name"],
            "email": ind.get("email", ""),
            "classification": classification,
            "last_activity": last_activity,
            "revenue": revenue,
        })

    # Sort: at_risk first, then inactive, then lost, then active
    priority = {"at_risk": 0, "inactive": 1, "lost": 2, "active": 3}
    portfolio_items.sort(key=lambda x: (priority.get(x["classification"], 99), -(x.get("revenue", 0))))

    # Count overdue follow-ups
    overdue_followups = await db.reactivation_tasks.count_documents({
        "owner_sales_id": sales_user_id,
        "status": "pending",
        "due_date": {"$lt": now.isoformat()},
    })

    # Count active quotes
    active_quotes = await db.quotes.count_documents({
        "created_by_id": sales_user_id,
        "status": {"$in": ["draft", "sent", "pending"]},
    })

    return {
        "owner_sales_id": sales_user_id,
        "total_clients": len(portfolio_items),
        "total_revenue": total_revenue,
        "active_quotes": active_quotes,
        "overdue_followups": overdue_followups,
        "buckets": buckets,
        "clients": portfolio_items,
        "computed_at": now.isoformat(),
    }


async def generate_reactivation_tasks(db, sales_user_id: str):
    """Generate reactivation tasks for at-risk and inactive clients."""
    now = datetime.now(timezone.utc)
    portfolio = await compute_portfolio_for_owner(db, sales_user_id)
    created = 0

    for client in portfolio["clients"]:
        if client["classification"] not in ("at_risk", "inactive", "lost"):
            continue

        # Check if task already exists
        existing = await db.reactivation_tasks.find_one({
            "entity_id": client["id"],
            "owner_sales_id": sales_user_id,
            "status": {"$in": ["pending", "in_progress"]},
        })
        if existing:
            continue

        # Suggest next action
        if client["classification"] == "at_risk":
            action = "Send a check-in message. Client may be evaluating alternatives."
            due_days = 3
        elif client["classification"] == "inactive":
            action = "Schedule a call or send a reactivation offer. No activity in 90+ days."
            due_days = 7
        else:
            action = "Attempt final outreach. Consider escalation to manager if no response."
            due_days = 14

        task = {
            "id": f"react-{client['id'][:8]}-{now.strftime('%Y%m%d')}",
            "entity_type": client["type"],
            "entity_id": client["id"],
            "entity_name": client["name"],
            "owner_sales_id": sales_user_id,
            "classification": client["classification"],
            "suggested_action": action,
            "status": "pending",
            "outcome": None,
            "notes": "",
            "due_date": (now + timedelta(days=due_days)).isoformat(),
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }
        await db.reactivation_tasks.insert_one(task)
        created += 1

    return {"tasks_created": created}


async def get_admin_portfolio_overview(db):
    """Admin view: portfolio stats across all sales owners."""
    # Get all sales users
    sales_users = await db.users.find(
        {"role": {"$in": ["sales", "staff"]}},
        {"_id": 0, "id": 1, "full_name": 1, "name": 1, "email": 1}
    ).to_list(50)

    overview = []
    for user in sales_users:
        uid = user.get("id", "")
        name = user.get("full_name") or user.get("name") or user.get("email", "")

        # Count owned entities
        companies = await db.companies.count_documents({"owner_sales_id": uid, "status": "active"})
        individuals = await db.individual_clients.count_documents({"owner_sales_id": uid, "status": "active"})
        total = companies + individuals

        # Count reactivation tasks
        pending_tasks = await db.reactivation_tasks.count_documents({"owner_sales_id": uid, "status": "pending"})
        completed_tasks = await db.reactivation_tasks.count_documents({"owner_sales_id": uid, "status": "completed"})
        reactivated = await db.reactivation_tasks.count_documents({"owner_sales_id": uid, "outcome": "reactivated"})

        reactivation_rate = round((reactivated / max(completed_tasks, 1)) * 100) if completed_tasks > 0 else 0

        overview.append({
            "sales_id": uid,
            "sales_name": name,
            "total_clients": total,
            "companies": companies,
            "individuals": individuals,
            "pending_tasks": pending_tasks,
            "completed_tasks": completed_tasks,
            "reactivation_rate": reactivation_rate,
        })

    overview.sort(key=lambda x: x["total_clients"], reverse=True)
    return {"owners": overview}
