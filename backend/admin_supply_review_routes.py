"""
Admin Supply Review dashboard — pricing integrity + product data quality.
Backs /api/admin/vendor-supply/review-dashboard and approval/rejection actions.
"""
from fastapi import APIRouter, Request, HTTPException
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

router = APIRouter(prefix="/api/admin/vendor-supply", tags=["Admin Supply Review"])


def _clean(doc: dict) -> dict:
    d = dict(doc or {})
    d.pop("_id", None)
    for k, v in list(d.items()):
        if isinstance(v, datetime):
            d[k] = v.isoformat()
    return d


async def _get_pricing_refs(db):
    """Pull the active margin tiers / min margin rules from Settings Hub."""
    hub_doc = await db.admin_settings.find_one({"key": "settings_hub"}) or {}
    hub = hub_doc.get("value") or {}
    pricing = hub.get("pricing", {}) or {}
    return {
        "min_margin_pct": float(pricing.get("min_margin_pct", 15)),
        "target_margin_pct": float(pricing.get("target_margin_pct", 25)),
        "max_margin_pct": float(pricing.get("max_margin_pct", 50)),
    }


def _product_health(p: dict, settings: dict) -> dict:
    """Classify a product as healthy/warning/critical and list concrete issues."""
    issues = []
    severity = "healthy"

    name = (p.get("name") or "").strip()
    sku = (p.get("sku") or "").strip()
    category = (p.get("category") or p.get("category_name") or "").strip()
    vendor_cost = float(p.get("vendor_cost") or p.get("base_partner_price") or 0)
    sell_price = float(p.get("selling_price") or p.get("sell_price") or p.get("price") or 0)
    image_url = p.get("image_url") or (p.get("images") or [None])[0]

    if not name:
        issues.append({"field": "name", "label": "Missing product name", "severity": "critical"})
        severity = "critical"
    if not sku:
        issues.append({"field": "sku", "label": "Missing Konekt SKU", "severity": "critical"})
        severity = "critical"
    if not category:
        issues.append({"field": "category", "label": "No category assigned", "severity": "warning"})
        if severity == "healthy":
            severity = "warning"
    if not image_url:
        issues.append({"field": "image", "label": "No image uploaded", "severity": "warning"})
        if severity == "healthy":
            severity = "warning"
    if vendor_cost <= 0:
        issues.append({"field": "vendor_cost", "label": "Vendor cost missing", "severity": "critical"})
        severity = "critical"
    if sell_price <= 0:
        issues.append({"field": "sell_price", "label": "Sell price missing", "severity": "warning"})
        if severity == "healthy":
            severity = "warning"

    margin_pct = 0
    if vendor_cost > 0 and sell_price > 0:
        margin_pct = ((sell_price - vendor_cost) / sell_price) * 100
        if margin_pct < settings["min_margin_pct"]:
            issues.append({
                "field": "margin",
                "label": f"Margin {margin_pct:.1f}% below minimum {settings['min_margin_pct']:.0f}%",
                "severity": "critical",
            })
            severity = "critical"
        elif margin_pct > settings["max_margin_pct"]:
            issues.append({
                "field": "margin",
                "label": f"Margin {margin_pct:.1f}% above maximum {settings['max_margin_pct']:.0f}% — verify",
                "severity": "warning",
            })
            if severity == "healthy":
                severity = "warning"

    return {
        "severity": severity,
        "issues": issues,
        "margin_pct": round(margin_pct, 2) if margin_pct else None,
    }


@router.get("/review-dashboard")
async def review_dashboard(filter: str = "all", request: Request = None):
    """Return products pending review, each tagged with health/issues.
    filter: all | pending | critical | warning | healthy | rejected
    """
    settings = await _get_pricing_refs(db)

    # Pull pending/submitted products. Keep it scoped to submissions queue to avoid
    # returning millions of live products.
    query = {"approval_status": {"$in": ["pending", "submitted", "under_review"]}}
    if filter == "rejected":
        query = {"approval_status": "rejected"}
    docs = await db.products.find(query, {"_id": 0}).sort("created_at", -1).to_list(length=500)

    products_out = []
    counts = {"critical": 0, "warning": 0, "healthy": 0, "total": 0, "rejected": 0}
    pricing_issues_count = 0
    total_margin = 0.0
    margin_n = 0

    for p in docs:
        h = _product_health(p, settings)
        row = _clean(p)
        row["health"] = h["severity"]
        row["issues"] = h["issues"]
        row["margin_pct"] = h["margin_pct"]
        counts[h["severity"]] += 1
        counts["total"] += 1
        if h["severity"] == "critical":
            pricing_issues_count += 1
        if h["margin_pct"]:
            total_margin += h["margin_pct"]
            margin_n += 1
        # Client-side filter
        if filter in ("critical", "warning", "healthy") and h["severity"] != filter:
            continue
        if filter == "pending" and p.get("approval_status") not in ("pending", "submitted", "under_review"):
            continue
        products_out.append(row)

    counts["rejected"] = await db.products.count_documents({"approval_status": "rejected"})
    avg_margin = round(total_margin / margin_n, 1) if margin_n else 0

    return {
        "products": products_out,
        "stats": {
            **counts,
            "pending": counts["total"],
            "avg_margin_pct": avg_margin,
            "pricing_issues": pricing_issues_count,
        },
        "pricing_integrity": {
            "issues_found": pricing_issues_count,
            "products_reviewed": counts["total"],
            "integrity_pct": round(100 * (1 - (pricing_issues_count / max(counts["total"], 1))), 1),
        },
        "margin_settings": settings,
    }


@router.post("/{product_id}/approve")
async def approve_product(product_id: str, payload: dict, request: Request = None):
    """Approve a pending product. Optionally override the sell price with a reason."""
    now = datetime.now(timezone.utc)
    update = {
        "approval_status": "approved",
        "status": "active",
        "approved_at": now,
    }
    override = payload.get("override_sell_price")
    if override is not None:
        try:
            update["selling_price"] = float(override)
            update["sell_price_override_reason"] = (payload.get("reason") or "")[:500]
            update["sell_price_overridden_at"] = now
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="override_sell_price must be a number")
    r = await db.products.update_one({"id": product_id}, {"$set": update})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"ok": True}


@router.post("/{product_id}/reject")
async def reject_product(product_id: str, payload: dict, request: Request = None):
    reason = (payload.get("reason") or "").strip()[:500]
    if not reason:
        raise HTTPException(status_code=400, detail="Rejection reason required")
    await db.products.update_one(
        {"id": product_id},
        {"$set": {
            "approval_status": "rejected",
            "status": "rejected",
            "rejection_reason": reason,
            "rejected_at": datetime.now(timezone.utc),
        }},
    )
    return {"ok": True}
