"""
Dormant Client Alert Service — Proactive detection of at-risk, inactive, and lost clients.

Classification thresholds (days since last meaningful activity):
  - Active:   <= 60 days
  - At Risk:  61-89 days
  - Inactive: 90-179 days
  - Lost:     180+ days

Meaningful activity: orders, quotes, requests, payments, logged follow-ups.

Company-level rollup: For corporate clients, dormancy is evaluated at company level
using the latest activity across ALL contacts under that company.
Individual clients are classified directly.
"""
from datetime import datetime, timezone, timedelta


THRESHOLDS = {"active": 60, "at_risk": 90, "inactive": 180}


def classify_dormancy(days_since_activity):
    """Classify dormancy based on days since last activity."""
    if days_since_activity is None:
        return "inactive"
    if days_since_activity <= THRESHOLDS["active"]:
        return "active"
    if days_since_activity < THRESHOLDS["at_risk"]:
        return "at_risk"
    if days_since_activity < THRESHOLDS["inactive"]:
        return "inactive"
    return "lost"


async def _find_latest_activity(db, emails):
    """Find most recent activity date across orders, quotes, requests, payments for given emails."""
    if not emails:
        return None

    dates = []
    email_query = [{"$regex": f"^{e}$", "$options": "i"} for e in emails if e]
    if not email_query:
        return None

    or_clauses = [{"customer_email": eq} for eq in email_query]

    # Orders
    order = await db.orders.find_one(
        {"$or": or_clauses}, {"_id": 0, "created_at": 1},
        sort=[("created_at", -1)]
    )
    if order and order.get("created_at"):
        dates.append(order["created_at"])

    # Quotes
    quote = await db.quotes.find_one(
        {"$or": or_clauses}, {"_id": 0, "created_at": 1},
        sort=[("created_at", -1)]
    )
    if quote and quote.get("created_at"):
        dates.append(quote["created_at"])

    # Requests
    req_clauses = [{"guest_email": eq} for eq in email_query]
    request = await db.requests.find_one(
        {"$or": req_clauses}, {"_id": 0, "created_at": 1},
        sort=[("created_at", -1)]
    )
    if request and request.get("created_at"):
        dates.append(request["created_at"])

    # Payments
    payment = await db.payments.find_one(
        {"$or": [{"customer_email": eq} for eq in email_query]},
        {"_id": 0, "created_at": 1},
        sort=[("created_at", -1)]
    )
    if payment and payment.get("created_at"):
        dates.append(payment["created_at"])

    # Follow-up tasks (from reactivation engine)
    task = await db.reactivation_tasks.find_one(
        {"$or": [{"client_email": eq} for eq in email_query], "outcome": "reactivated"},
        {"_id": 0, "updated_at": 1},
        sort=[("updated_at", -1)]
    )
    if task and task.get("updated_at"):
        dates.append(task["updated_at"])

    if not dates:
        return None

    parsed = []
    for d in dates:
        try:
            if isinstance(d, str):
                parsed.append(datetime.fromisoformat(d.replace("Z", "+00:00")))
            elif isinstance(d, datetime):
                if d.tzinfo is None:
                    d = d.replace(tzinfo=timezone.utc)
                parsed.append(d)
        except (ValueError, TypeError):
            pass

    return max(parsed) if parsed else None


async def scan_dormant_companies(db, owner_sales_id=None):
    """
    Scan all companies for dormancy at COMPANY level.
    Rolls up activity from all contacts under each company.
    """
    now = datetime.now(timezone.utc)
    query = {"status": "active"}
    if owner_sales_id:
        query["owner_sales_id"] = owner_sales_id

    companies = await db.companies.find(query, {"_id": 0}).to_list(1000)
    results = []

    for comp in companies:
        company_id = comp.get("id")
        # Get all contacts under this company
        contacts = await db.contacts.find(
            {"company_id": company_id, "status": "active"},
            {"_id": 0, "email": 1, "name": 1}
        ).to_list(100)

        # Collect all emails: company domain + contact emails
        emails = [c.get("email") for c in contacts if c.get("email")]
        # Also check by company domain if present
        domain = comp.get("domain")
        if domain:
            domain_users = await db.users.find(
                {"email": {"$regex": f"@{domain}$", "$options": "i"}, "role": "customer"},
                {"_id": 0, "email": 1}
            ).to_list(50)
            emails.extend([u["email"] for u in domain_users if u.get("email")])

        emails = list(set(emails))

        # Find latest activity across all company contacts
        latest = await _find_latest_activity(db, emails)

        days_since = None
        if latest:
            days_since = (now - latest).days

        status = classify_dormancy(days_since)

        # Resolve owner name
        owner_name = ""
        owner_id = comp.get("owner_sales_id")
        if owner_id:
            owner = await db.users.find_one(
                {"id": owner_id}, {"_id": 0, "full_name": 1}
            )
            owner_name = (owner or {}).get("full_name", "")

        results.append({
            "client_id": company_id,
            "client_name": comp.get("name", ""),
            "client_type": "company",
            "client_email": emails[0] if emails else "",
            "contact_count": len(contacts),
            "owner_sales_id": owner_id or "",
            "owner_name": owner_name,
            "status": status,
            "days_since_activity": days_since,
            "last_activity_at": latest.isoformat() if latest else None,
            "industry": comp.get("industry", ""),
            "domain": domain or "",
        })

    return results


async def scan_dormant_individuals(db, owner_sales_id=None):
    """
    Scan all individual clients for dormancy at INDIVIDUAL level.
    """
    now = datetime.now(timezone.utc)
    query = {"status": "active"}
    if owner_sales_id:
        query["owner_sales_id"] = owner_sales_id

    individuals = await db.individual_clients.find(query, {"_id": 0}).to_list(1000)
    results = []

    for ind in individuals:
        emails = []
        if ind.get("email"):
            emails.append(ind["email"])

        latest = await _find_latest_activity(db, emails)

        days_since = None
        if latest:
            days_since = (now - latest).days

        status = classify_dormancy(days_since)

        owner_name = ""
        owner_id = ind.get("owner_sales_id")
        if owner_id:
            owner = await db.users.find_one(
                {"id": owner_id}, {"_id": 0, "full_name": 1}
            )
            owner_name = (owner or {}).get("full_name", "")

        results.append({
            "client_id": ind.get("id"),
            "client_name": ind.get("name", ""),
            "client_type": "individual",
            "client_email": ind.get("email", ""),
            "contact_count": 0,
            "owner_sales_id": owner_id or "",
            "owner_name": owner_name,
            "status": status,
            "days_since_activity": days_since,
            "last_activity_at": latest.isoformat() if latest else None,
            "industry": "",
            "domain": "",
        })

    return results


async def get_all_dormant_clients(db, owner_sales_id=None, status_filter=None):
    """
    Scan all clients (companies + individuals), return only non-active ones.
    """
    companies = await scan_dormant_companies(db, owner_sales_id=owner_sales_id)
    individuals = await scan_dormant_individuals(db, owner_sales_id=owner_sales_id)

    all_clients = companies + individuals

    # Filter to only dormant (non-active)
    if status_filter:
        all_clients = [c for c in all_clients if c["status"] == status_filter]
    else:
        all_clients = [c for c in all_clients if c["status"] != "active"]

    # Sort by severity: lost > inactive > at_risk, then by days descending
    severity = {"lost": 0, "inactive": 1, "at_risk": 2, "active": 3}
    all_clients.sort(key=lambda c: (severity.get(c["status"], 3), -(c["days_since_activity"] or 0)))

    return all_clients


async def get_dormant_summary(db, owner_sales_id=None):
    """
    Get summary counts of dormant clients by status and by owner.
    """
    companies = await scan_dormant_companies(db, owner_sales_id=owner_sales_id)
    individuals = await scan_dormant_individuals(db, owner_sales_id=owner_sales_id)
    all_clients = companies + individuals

    counts = {"at_risk": 0, "inactive": 0, "lost": 0, "active": 0, "total_clients": len(all_clients)}
    by_owner = {}

    for c in all_clients:
        status = c["status"]
        counts[status] = counts.get(status, 0) + 1

        owner_id = c.get("owner_sales_id") or "unassigned"
        owner_name = c.get("owner_name") or "Unassigned"
        if owner_id not in by_owner:
            by_owner[owner_id] = {
                "owner_sales_id": owner_id,
                "owner_name": owner_name,
                "at_risk": 0, "inactive": 0, "lost": 0, "active": 0, "total": 0,
            }
        by_owner[owner_id][status] = by_owner[owner_id].get(status, 0) + 1
        by_owner[owner_id]["total"] += 1

    return {
        "summary": counts,
        "by_owner": list(by_owner.values()),
    }


async def mark_client_reactivated(db, client_id, client_type, reactivated_by):
    """Mark a dormant client as reactivated by recording an activity."""
    now = datetime.now(timezone.utc).isoformat()
    collection = "companies" if client_type == "company" else "individual_clients"
    await db[collection].update_one(
        {"id": client_id},
        {"$set": {"last_reactivation_at": now, "reactivated_by": reactivated_by, "updated_at": now}}
    )
    # Record as a reactivation task outcome
    await db.reactivation_tasks.insert_one({
        "id": f"react-{client_id}-{now[:10]}",
        "client_id": client_id,
        "client_type": client_type,
        "outcome": "reactivated",
        "completed_by": reactivated_by,
        "created_at": now,
        "updated_at": now,
    })
    return {"ok": True, "client_id": client_id, "status": "reactivated"}
