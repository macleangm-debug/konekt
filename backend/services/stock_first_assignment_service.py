"""
Stock-First Vendor Assignment Service for Product Orders.

Priority chain:
  1. Exact allocated stock match (in_stock, quantity >= requested, vendor eligible)
  2. Partial stock vendor (in_stock, has some stock, vendor eligible)
  3. Made-to-order vendor (vendor has supply record with made_to_order mode)
  4. On-demand capable vendor (capability or supply record with on_demand)
  5. Product catalog owner (original uploader / vendor_id on product)
  6. Unassigned (requires manual assignment)

Atomic stock reservation prevents double-booking.
"""
from datetime import datetime, timezone
from uuid import uuid4
from pymongo import ReturnDocument


REASON_CODES = {
    "exact_stock": "Vendor has sufficient pre-allocated stock for this product",
    "partial_stock": "Vendor has partial stock; remaining quantity may be on backorder",
    "made_to_order": "Vendor can produce this product to order",
    "on_demand": "Vendor has on-demand supply capability",
    "product_owner": "Assigned to original product catalog vendor",
    "manual_override": "Manually assigned by admin",
    "unassigned": "No eligible vendor found; requires manual assignment",
}

TIER_LABELS = {
    1: "exact_stock",
    2: "partial_stock",
    3: "made_to_order",
    4: "on_demand",
    5: "product_owner",
    6: "unassigned",
}


async def _is_vendor_eligible(db, vendor_id):
    """
    Check vendor eligibility for assignment.
    Excludes only: suspended, blocked, deactivated, or critically underperforming.
    Risk-zone vendors are allowed but flagged for admin visibility.
    Returns (eligible: bool, reason: str, warning: str|None).
    """
    vendor = await db.users.find_one(
        {"$or": [{"id": vendor_id}, {"partner_id": vendor_id}]},
        {"_id": 0, "id": 1, "status": 1, "is_active": 1, "full_name": 1, "partner_id": 1}
    )
    if not vendor:
        return False, "vendor_not_found", None

    status = (vendor.get("status") or "").lower()
    if status in ("suspended", "blocked"):
        return False, f"vendor_{status}", None
    if vendor.get("is_active") is False:
        return False, "vendor_deactivated", None

    # Load governance critical threshold
    perf_doc = await db.performance_governance.find_one({"key": "settings"}, {"_id": 0})
    risk_threshold = 50
    if perf_doc and "vendor" in perf_doc:
        risk_threshold = perf_doc["vendor"].get("thresholds", {}).get("risk", 50)
    critical_threshold = risk_threshold * 0.6  # critically below = 60% of risk

    # Lightweight performance check (only with enough sample)
    total_orders = await db.vendor_orders.count_documents({"vendor_id": vendor_id})
    warning = None
    if total_orders >= 5:
        completed = await db.vendor_orders.count_documents({
            "vendor_id": vendor_id,
            "status": {"$in": ["completed", "delivered"]}
        })
        quality_score = (completed / total_orders) * 100 if total_orders > 0 else 100
        if quality_score < critical_threshold:
            return False, f"critically_underperforming(score={quality_score:.0f})", None
        if quality_score < risk_threshold:
            warning = f"risk_zone(score={quality_score:.0f})"

    return True, "eligible", warning


async def _find_stock_candidates(db, product_id, required_qty):
    """Find all vendors with supply records for a product, classified by tier."""
    supply_records = await db.vendor_supply.find(
        {"product_id": product_id},
        {"_id": 0}
    ).to_list(100)

    candidates = []
    for rec in supply_records:
        vendor_id = rec.get("vendor_id")
        eligible, reason, warning = await _is_vendor_eligible(db, vendor_id)

        mode = rec.get("supply_mode", "on_demand")
        qty = rec.get("quantity", 0)

        if mode == "in_stock":
            tier = 1 if qty >= required_qty else (2 if qty > 0 else 4)
        elif mode == "made_to_order":
            tier = 3
        else:
            tier = 4

        # Resolve vendor name
        vendor = await db.users.find_one(
            {"$or": [{"id": vendor_id}, {"partner_id": vendor_id}]},
            {"_id": 0, "full_name": 1, "partner_id": 1}
        )
        vendor_name = (vendor or {}).get("full_name", "")
        actual_vid = (vendor or {}).get("partner_id") or vendor_id

        candidates.append({
            "vendor_id": actual_vid,
            "vendor_user_id": vendor_id,
            "vendor_name": vendor_name,
            "supply_record_id": rec.get("id"),
            "available_qty": qty,
            "supply_mode": mode,
            "lead_time_days": rec.get("lead_time_days", 0),
            "base_price": rec.get("base_price_vat_inclusive", 0),
            "tier": tier,
            "eligible": eligible,
            "eligibility_reason": reason,
            "warning": warning,
        })

    # Sort: eligible first → tier ascending → available_qty descending
    candidates.sort(key=lambda c: (0 if c["eligible"] else 1, c["tier"], -c["available_qty"]))
    return candidates


async def reserve_stock_atomic(db, vendor_id, product_id, quantity, order_id):
    """
    Atomically reserve stock using MongoDB findOneAndUpdate.
    The $gte condition + $inc are applied in a single atomic operation,
    preventing double-booking even under concurrent requests.
    Returns the updated document or None if insufficient stock.
    """
    now = datetime.now(timezone.utc).isoformat()
    result = await db.vendor_supply.find_one_and_update(
        {
            "vendor_id": vendor_id,
            "product_id": product_id,
            "supply_mode": "in_stock",
            "quantity": {"$gte": quantity},
        },
        {
            "$inc": {"quantity": -quantity},
            "$set": {"updated_at": now},
            "$push": {"reservations": {
                "order_id": order_id,
                "quantity": quantity,
                "reserved_at": now,
            }},
        },
        return_document=ReturnDocument.AFTER,
    )
    if result:
        result.pop("_id", None)
    return result


async def _assign_vendor_for_item(db, product_id, required_qty, order_id=None, exclude_ids=None):
    """
    Assign best vendor for a single product item.
    Returns assignment dict with vendor info, reason, and candidates snapshot.
    """
    exclude_ids = set(exclude_ids or [])
    candidates = await _find_stock_candidates(db, product_id, required_qty)

    # Filter excluded vendors
    candidates = [c for c in candidates if c["vendor_id"] not in exclude_ids]

    # Build snapshot for audit (before assignment attempt)
    candidates_snapshot = [
        {
            "vendor_id": c["vendor_id"],
            "vendor_name": c["vendor_name"],
            "tier": c["tier"],
            "tier_label": TIER_LABELS.get(c["tier"], "unknown"),
            "supply_mode": c["supply_mode"],
            "available_qty": c["available_qty"],
            "eligible": c["eligible"],
            "eligibility_reason": c["eligibility_reason"],
            "warning": c["warning"],
        }
        for c in candidates
    ]

    # Try each eligible candidate in priority order
    for candidate in candidates:
        if not candidate["eligible"]:
            continue

        vid = candidate["vendor_id"]
        vname = candidate["vendor_name"]
        tier = candidate["tier"]

        # For in_stock tiers, attempt atomic stock reservation
        reserved = False
        reserved_qty = 0
        if tier in (1, 2) and order_id:
            reserve_amount = min(required_qty, candidate["available_qty"])
            result = await reserve_stock_atomic(
                db, candidate["vendor_user_id"], product_id, reserve_amount, order_id
            )
            if result is not None:
                reserved = True
                reserved_qty = reserve_amount
            elif tier == 1:
                # Stock was consumed between check and reserve — skip, try next
                continue

        reason_code = TIER_LABELS.get(tier, "on_demand")
        return {
            "vendor_id": vid,
            "vendor_name": vname,
            "reason_code": reason_code,
            "reason_detail": REASON_CODES.get(reason_code, ""),
            "tier": tier,
            "reserved": reserved,
            "reserved_qty": reserved_qty,
            "supply_mode": candidate.get("supply_mode"),
            "warning": candidate.get("warning"),
            "candidates_snapshot": candidates_snapshot,
        }

    # Fallback: product catalog owner
    if product_id:
        product = await db.products.find_one(
            {"$or": [{"id": product_id}, {"sku": product_id}]},
            {"_id": 0, "vendor_id": 1, "owner_vendor_id": 1, "uploaded_by_vendor_id": 1, "partner_id": 1}
        )
        if product:
            vid = (
                product.get("vendor_id")
                or product.get("owner_vendor_id")
                or product.get("uploaded_by_vendor_id")
                or product.get("partner_id")
            )
            if vid and vid not in exclude_ids:
                eligible, elig_reason, warning = await _is_vendor_eligible(db, vid)
                if eligible:
                    vendor = await db.users.find_one(
                        {"$or": [{"id": vid}, {"partner_id": vid}]},
                        {"_id": 0, "full_name": 1, "partner_id": 1}
                    )
                    actual_vid = (vendor or {}).get("partner_id") or vid
                    return {
                        "vendor_id": actual_vid,
                        "vendor_name": (vendor or {}).get("full_name", "Vendor"),
                        "reason_code": "product_owner",
                        "reason_detail": REASON_CODES["product_owner"],
                        "tier": 5,
                        "reserved": False,
                        "reserved_qty": 0,
                        "supply_mode": None,
                        "warning": warning,
                        "candidates_snapshot": candidates_snapshot,
                    }

    return {
        "vendor_id": None,
        "vendor_name": "Unassigned",
        "reason_code": "unassigned",
        "reason_detail": REASON_CODES["unassigned"],
        "tier": 6,
        "reserved": False,
        "reserved_qty": 0,
        "supply_mode": None,
        "warning": None,
        "candidates_snapshot": candidates_snapshot,
    }


async def assign_vendors_for_product_order(db, items, order_id=None):
    """
    Stock-first vendor assignment for a complete product order.
    Assigns vendor per-item, determines primary vendor, returns full decision.
    """
    item_assignments = []
    vendor_counts = {}
    all_vendor_ids = set()

    for idx, item in enumerate(items):
        product_id = item.get("product_id") or item.get("sku") or item.get("id")
        qty = max(1, int(item.get("quantity", 1) or 1))

        assignment = await _assign_vendor_for_item(
            db, product_id, qty, order_id=order_id
        )

        item_assignments.append({
            "item_index": idx,
            "product_id": product_id,
            "product_name": item.get("name", ""),
            "quantity": qty,
            **assignment,
        })

        vid = assignment.get("vendor_id")
        if vid:
            all_vendor_ids.add(vid)
            vendor_counts[vid] = vendor_counts.get(vid, 0) + 1

    # Primary vendor = most frequently assigned across items
    primary_vendor_id = None
    primary_vendor_name = "Unassigned"
    primary_reason = "unassigned"
    if vendor_counts:
        primary_vendor_id = max(vendor_counts, key=vendor_counts.get)
        for ia in item_assignments:
            if ia.get("vendor_id") == primary_vendor_id:
                primary_vendor_name = ia.get("vendor_name", "Vendor")
                primary_reason = ia.get("reason_code", "")
                break

    return {
        "item_assignments": item_assignments,
        "primary_vendor_id": primary_vendor_id,
        "primary_vendor_name": primary_vendor_name,
        "primary_reason_code": primary_reason,
        "all_vendor_ids": list(all_vendor_ids),
        "engine": "stock_first_product",
    }


async def get_product_candidates_preview(db, product_id, quantity=1):
    """
    Admin preview: return ranked candidates for a product without reserving stock.
    """
    candidates = await _find_stock_candidates(db, product_id, quantity)

    # Also include product catalog owner as fallback candidate
    product = await db.products.find_one(
        {"$or": [{"id": product_id}, {"sku": product_id}]},
        {"_id": 0, "vendor_id": 1, "owner_vendor_id": 1, "partner_id": 1, "name": 1}
    )
    catalog_vendor_id = None
    if product:
        catalog_vendor_id = product.get("vendor_id") or product.get("owner_vendor_id") or product.get("partner_id")
        # Add if not already in candidates
        existing_vids = {c["vendor_id"] for c in candidates}
        if catalog_vendor_id and catalog_vendor_id not in existing_vids:
            eligible, reason, warning = await _is_vendor_eligible(db, catalog_vendor_id)
            vendor = await db.users.find_one(
                {"$or": [{"id": catalog_vendor_id}, {"partner_id": catalog_vendor_id}]},
                {"_id": 0, "full_name": 1, "partner_id": 1}
            )
            candidates.append({
                "vendor_id": (vendor or {}).get("partner_id") or catalog_vendor_id,
                "vendor_name": (vendor or {}).get("full_name", ""),
                "supply_record_id": None,
                "available_qty": 0,
                "supply_mode": "catalog_owner",
                "lead_time_days": 0,
                "base_price": 0,
                "tier": 5,
                "eligible": eligible,
                "eligibility_reason": reason,
                "warning": warning,
            })

    return {
        "product_id": product_id,
        "product_name": (product or {}).get("name", ""),
        "requested_quantity": quantity,
        "candidates": [
            {
                "vendor_id": c["vendor_id"],
                "vendor_name": c["vendor_name"],
                "tier": c["tier"],
                "tier_label": TIER_LABELS.get(c["tier"], "unknown"),
                "supply_mode": c["supply_mode"],
                "available_qty": c["available_qty"],
                "lead_time_days": c.get("lead_time_days", 0),
                "base_price": c.get("base_price", 0),
                "eligible": c["eligible"],
                "eligibility_reason": c["eligibility_reason"],
                "warning": c.get("warning"),
            }
            for c in candidates
        ],
        "engine": "stock_first_product",
    }
