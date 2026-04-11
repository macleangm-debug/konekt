"""
Partner Ecosystem Summary — Comprehensive data for the Partner Ecosystem management page.
Aggregates partners, affiliates, coverage, and gap analysis.
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/admin/partner-ecosystem", tags=["partner-ecosystem"])


@router.get("/summary")
async def get_ecosystem_summary(request: Request):
    """Comprehensive partner ecosystem data: KPIs, coverage, gaps, partners list."""
    db = request.app.mongodb

    # Fetch all partners
    all_partners = await db.partners.find({}, {"_id": 0}).to_list(500)
    # Fetch affiliates count
    affiliate_count = await db.affiliates.count_documents({})
    active_affiliates = await db.affiliates.count_documents({"is_active": True})

    # KPIs
    total = len(all_partners)
    active = len([p for p in all_partners if p.get("status") == "active"])
    inactive = len([p for p in all_partners if p.get("status") in ("inactive", "suspended")])

    by_type = {}
    all_regions = set()
    all_categories = set()
    for p in all_partners:
        pt = p.get("partner_type", "other")
        by_type[pt] = by_type.get(pt, 0) + 1
        for r in p.get("regions", []):
            if r:
                all_regions.add(r)
        for c in p.get("categories", []):
            if c:
                all_categories.add(c)

    preferred = len([p for p in all_partners if p.get("preferred")])

    # Coverage analysis
    active_partners = [p for p in all_partners if p.get("status") == "active"]
    covered_regions = set()
    covered_categories = set()
    for p in active_partners:
        for r in p.get("regions", []):
            if r:
                covered_regions.add(r)
        for c in p.get("categories", []):
            if c:
                covered_categories.add(c)

    # Gaps: partners with no region or no category assigned
    no_region = len([p for p in active_partners if not p.get("regions")])
    no_category = len([p for p in active_partners if not p.get("categories")])

    # Pending applications
    pending_apps = await db.affiliate_applications.count_documents(
        {"status": {"$in": ["pending", "pending_review"]}}
    )

    # Clean partner list for frontend table
    partners_clean = []
    for p in all_partners:
        # Skip TEST_ partners for display unless there are very few real ones
        name = p.get("name", "")
        partners_clean.append({
            "id": p.get("id", ""),
            "name": name,
            "partner_type": p.get("partner_type", "other"),
            "contact_person": p.get("contact_person", ""),
            "email": p.get("email", ""),
            "phone": p.get("phone", ""),
            "regions": p.get("regions", []),
            "categories": p.get("categories", []),
            "status": p.get("status", "inactive"),
            "preferred": p.get("preferred", False),
            "coverage_mode": p.get("coverage_mode", ""),
            "fulfillment_type": p.get("fulfillment_type", ""),
            "lead_time_days": p.get("lead_time_days"),
            "notes": p.get("notes", ""),
            "created_at": str(p.get("created_at", "")),
        })

    return {
        "ok": True,
        "kpis": {
            "total_partners": total,
            "active_partners": active,
            "inactive_partners": inactive,
            "preferred_partners": preferred,
            "affiliates": affiliate_count,
            "active_affiliates": active_affiliates,
            "pending_applications": pending_apps,
            "by_type": by_type,
        },
        "coverage": {
            "regions_served": sorted(list(covered_regions)),
            "categories_covered": sorted(list(covered_categories)),
            "all_regions": sorted(list(all_regions)),
            "all_categories": sorted(list(all_categories)),
            "partners_without_region": no_region,
            "partners_without_category": no_category,
        },
        "partners": partners_clean,
    }
