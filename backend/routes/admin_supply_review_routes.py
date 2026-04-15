"""
Admin Vendor Supply Review Routes
Admin endpoints for reviewing vendor product submissions and import jobs.
"""
import os
import logging
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient
import jwt

from services.product_upload_service import (
    list_all_submissions,
    review_submission,
    get_submission_by_id,
)
from services.product_import_service import list_all_import_jobs, get_import_job
from services.approved_product_publish_service import publish_approved_submission

logger = logging.getLogger("admin_supply_review_routes")

router = APIRouter(prefix="/api/admin/vendor-supply", tags=["admin-vendor-supply"])

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ.get("DB_NAME", "konekt")
JWT_SECRET = os.environ.get("JWT_SECRET", "konekt-secret-key-2024")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


async def _get_admin(authorization: str):
    """Verify admin JWT and return user."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Authorization required")
    token = authorization.replace("Bearer ", "").strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(401, "User not found")
        if user.get("role") not in ("admin", "sales", "sales_manager", "finance_manager", "marketing", "production", "vendor_ops", "staff"):
            raise HTTPException(403, "Admin access required")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")


# ─── Submissions ──────────────────────────────────────────

@router.get("/submissions")
async def admin_list_submissions(
    status: Optional[str] = None,
    vendor_id: Optional[str] = None,
    authorization: Optional[str] = Header(None),
):
    """Admin: list all vendor product submissions with optional filters."""
    await _get_admin(authorization)
    return await list_all_submissions(db, status=status, vendor_id=vendor_id)


@router.get("/submissions/{submission_id}")
async def admin_get_submission(
    submission_id: str,
    authorization: Optional[str] = Header(None),
):
    """Admin: get a specific submission with full details."""
    await _get_admin(authorization)
    sub = await get_submission_by_id(db, submission_id)
    if not sub:
        raise HTTPException(404, "Submission not found")
    return sub


class ReviewIn(BaseModel):
    status: str  # approved, rejected, changes_requested
    notes: str = ""


@router.post("/submissions/{submission_id}/review")
async def admin_review_submission(
    submission_id: str,
    payload: ReviewIn,
    authorization: Optional[str] = Header(None),
):
    """Admin: approve/reject a vendor product submission."""
    admin = await _get_admin(authorization)
    reviewed_by = admin.get("full_name", admin.get("email", "admin"))

    if payload.status not in ("approved", "rejected", "changes_requested"):
        raise HTTPException(400, "Status must be: approved, rejected, or changes_requested")

    result = await review_submission(db, submission_id, payload.status, payload.notes, reviewed_by)
    if not result:
        raise HTTPException(404, "Submission not found")

    # Auto-publish to canonical products collection on approval
    published_product = None
    if payload.status == "approved":
        published_product = await publish_approved_submission(db, result, reviewed_by)

    return {"ok": True, "submission": result, "published_product": published_product}


# ─── Import Jobs ──────────────────────────────────────────

@router.get("/import-jobs")
async def admin_list_import_jobs(
    status: Optional[str] = None,
    authorization: Optional[str] = Header(None),
):
    """Admin: list all vendor import jobs."""
    await _get_admin(authorization)
    return await list_all_import_jobs(db, status=status)


@router.get("/import-jobs/{job_id}")
async def admin_get_import_job(
    job_id: str,
    authorization: Optional[str] = Header(None),
):
    """Admin: get full import job details."""
    await _get_admin(authorization)
    job = await get_import_job(db, job_id)
    if not job:
        raise HTTPException(404, "Import job not found")
    return job



# ─── SUPPLY REVIEW CONTROL TOWER ──────────────────────────

@router.get("/review-dashboard")
async def supply_review_dashboard(
    filter: Optional[str] = None,
    authorization: Optional[str] = Header(None),
):
    """Supply Review control tower: all products with pricing health, data completeness, and integrity flags."""
    await _get_admin(authorization)

    # Get all products
    products = await db.products.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)

    # Get margin settings for integrity check
    hub = await db.admin_settings.find_one({"key": "settings_hub"})
    if hub and hub.get("value"):
        pass  # Settings used by pricing engine directly

    # Also check category_margin_rules
    cat_rules = await db.platform_settings.find_one({"key": "category_margin_rules"})
    default_target = 30.0
    default_min = 15.0
    if cat_rules and cat_rules.get("value"):
        default_target = float(cat_rules["value"].get("default", {}).get("target_margin_pct", 30))
        default_min = float(cat_rules["value"].get("default", {}).get("min_margin_pct", 15))

    enriched = []
    stats = {"total": 0, "pending": 0, "pricing_issues": 0, "missing_data": 0, "healthy": 0}

    for p in products:
        stats["total"] += 1
        vendor_cost = float(p.get("vendor_cost", 0) or 0)
        sell_price = float(p.get("selling_price", 0) or 0)
        status = p.get("status", "draft")

        # Pricing health
        flags = []
        pricing_health = "healthy"

        if vendor_cost > 0 and sell_price <= 0:
            flags.append({"type": "critical", "msg": "Sell price missing"})
            pricing_health = "critical"
        elif vendor_cost > 0 and sell_price <= vendor_cost:
            flags.append({"type": "critical", "msg": "Sell price at or below vendor cost"})
            pricing_health = "critical"
        elif vendor_cost > 0 and sell_price > 0:
            margin = ((sell_price - vendor_cost) / vendor_cost) * 100
            if margin < default_min:
                flags.append({"type": "warning", "msg": f"Margin {margin:.1f}% below minimum {default_min}%"})
                pricing_health = "warning"
        elif vendor_cost <= 0 and sell_price > 0:
            flags.append({"type": "info", "msg": "No vendor cost set"})

        # Check if pricing engine was used
        if not p.get("pricing_rule_source") and vendor_cost > 0:
            flags.append({"type": "warning", "msg": "Not processed by pricing engine"})
            if pricing_health == "healthy":
                pricing_health = "warning"

        # Data completeness
        missing = []
        if not p.get("images") or len(p.get("images", [])) == 0:
            missing.append("images")
        if not p.get("unit_of_measurement"):
            missing.append("unit")
        if not p.get("sku"):
            missing.append("SKU")
        if not p.get("category"):
            missing.append("category")
        if not p.get("description"):
            missing.append("description")

        if missing:
            flags.append({"type": "info", "msg": f"Missing: {', '.join(missing)}"})

        # Calculate margin
        margin_pct = 0
        margin_amount = 0
        if vendor_cost > 0 and sell_price > 0:
            margin_amount = round(sell_price - vendor_cost)
            margin_pct = round(((sell_price - vendor_cost) / vendor_cost) * 100, 1)

        # Expected sell price from engine
        expected_sell = round(vendor_cost * (1 + default_target / 100)) if vendor_cost > 0 else 0
        min_sell = round(vendor_cost * (1 + default_min / 100)) if vendor_cost > 0 else 0

        item = {
            "id": p.get("id"),
            "name": p.get("name", ""),
            "category": p.get("category", ""),
            "vendor_name": p.get("vendor_name", ""),
            "vendor_cost": vendor_cost,
            "selling_price": sell_price,
            "original_price": float(p.get("original_price", 0) or 0),
            "margin_pct": margin_pct,
            "margin_amount": margin_amount,
            "expected_sell_price": expected_sell,
            "min_sell_price": min_sell,
            "pricing_rule_source": p.get("pricing_rule_source", ""),
            "pricing_warning": p.get("pricing_warning"),
            "has_override": bool(p.get("pricing_warning")),
            "unit_of_measurement": p.get("unit_of_measurement", ""),
            "sku": p.get("sku", ""),
            "stock": p.get("stock", 0),
            "image_count": len(p.get("images", [])),
            "image_url": p.get("image_url", ""),
            "status": status,
            "pricing_health": pricing_health,
            "flags": flags,
            "missing_data": missing,
            "created_at": p.get("created_at", ""),
        }

        # Stats
        if status in ("draft", "pending_review"):
            stats["pending"] += 1
        if pricing_health in ("critical", "warning"):
            stats["pricing_issues"] += 1
        if missing:
            stats["missing_data"] += 1
        if pricing_health == "healthy" and not missing:
            stats["healthy"] += 1

        # Apply filter
        if filter == "pricing_issues" and pricing_health not in ("critical", "warning"):
            continue
        if filter == "missing_data" and not missing:
            continue
        if filter == "ready" and (pricing_health != "healthy" or missing or status not in ("draft", "pending_review")):
            continue
        if filter == "pending" and status not in ("draft", "pending_review"):
            continue

        enriched.append(item)

    # Pricing integrity check
    using_engine = sum(1 for p in products if p.get("pricing_rule_source"))
    not_using_engine = sum(1 for p in products if not p.get("pricing_rule_source") and float(p.get("vendor_cost", 0) or 0) > 0)

    return {
        "products": enriched,
        "stats": stats,
        "pricing_integrity": {
            "total_with_vendor_cost": using_engine + not_using_engine,
            "using_engine": using_engine,
            "not_using_engine": not_using_engine,
            "integrity_pct": round((using_engine / max(using_engine + not_using_engine, 1)) * 100),
        },
        "margin_settings": {
            "default_target_pct": default_target,
            "default_min_pct": default_min,
        },
    }


@router.post("/products/{product_id}/approve-pricing")
async def approve_product_pricing(
    product_id: str,
    payload: dict = {},
    authorization: Optional[str] = Header(None),
):
    """Approve a product with pricing engine validation. Optionally override sell price."""
    admin = await _get_admin(authorization)
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(404, "Product not found")

    vendor_cost = float(product.get("vendor_cost", 0) or 0)
    override_price = float(payload.get("override_sell_price", 0) or 0)
    new_status = payload.get("status", "active")

    from services.pricing_engine import calculate_sell_price
    pricing = await calculate_sell_price(
        db, vendor_cost,
        category=product.get("category", ""),
        override_sell_price=override_price if override_price > 0 else None,
    )

    update = {
        "status": new_status,
        "is_active": new_status == "active",
        "selling_price": pricing["sell_price"],
        "margin_pct": pricing["margin_pct"],
        "margin_amount": pricing["margin_amount"],
        "pricing_rule_source": pricing["rule_source"],
        "pricing_warning": pricing.get("warning"),
        "approved_by": admin.get("full_name", admin.get("email", "admin")),
        "approved_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
    }

    if override_price > 0:
        update["pricing_override"] = True
        update["pricing_override_reason"] = payload.get("override_reason", "")
        update["pricing_override_by"] = admin.get("full_name", admin.get("email"))

    await db.products.update_one({"id": product_id}, {"$set": update})

    return {
        "ok": True,
        "sell_price": pricing["sell_price"],
        "margin_pct": pricing["margin_pct"],
        "warning": pricing.get("warning"),
    }


@router.post("/products/{product_id}/reject")
async def reject_product(
    product_id: str,
    payload: dict = {},
    authorization: Optional[str] = Header(None),
):
    """Reject a product with reason."""
    admin = await _get_admin(authorization)
    reason = payload.get("reason", "")

    await db.products.update_one({"id": product_id}, {"$set": {
        "status": "rejected",
        "is_active": False,
        "rejection_reason": reason,
        "rejected_by": admin.get("full_name", admin.get("email", "admin")),
        "rejected_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
    }})

    return {"ok": True}
