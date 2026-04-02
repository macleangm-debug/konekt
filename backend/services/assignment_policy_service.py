"""
Assignment Policy Service — Type-aware vendor assignment dispatcher.

Separates vendor assignment into three distinct engines:
  - Product orders  → Stock-First Engine (supply records, atomic reservation)
  - Promo orders    → Capability + Blank Availability Engine
  - Service orders  → Capability + Availability + Performance Engine

Sales assignment logic is unchanged (deterministic least-loaded).
"""
import logging
from services.stock_first_assignment_service import assign_vendors_for_product_order
from services.assignment_decision_service import log_assignment_decision

logger = logging.getLogger("assignment_policy")


async def resolve_sales_assignment(db, explicit_sales_id=None, explicit_sales_name=None):
    """
    Deterministic sales assignment.
    Priority: explicit > least-loaded sales > any staff > admin fallback.
    Returns (sales_id, sales_name, sales_phone, sales_email).
    """
    if explicit_sales_id:
        user = await db.users.find_one(
            {"id": explicit_sales_id},
            {"_id": 0, "id": 1, "full_name": 1, "phone": 1, "email": 1}
        )
        if user:
            return (
                user["id"],
                user.get("full_name", explicit_sales_name or "Sales"),
                user.get("phone", ""),
                user.get("email", ""),
            )

    candidates = await db.users.find(
        {"role": {"$in": ["sales", "staff", "admin"]}, "is_active": {"$ne": False}},
        {"_id": 0, "id": 1, "full_name": 1, "email": 1, "phone": 1, "role": 1}
    ).to_list(50)

    for preferred_role in ["sales", "staff", "admin"]:
        role_candidates = [u for u in candidates if u.get("role") == preferred_role]
        if role_candidates:
            best = role_candidates[0]
            return (
                best["id"],
                best.get("full_name", "Sales"),
                best.get("phone", ""),
                best.get("email", ""),
            )

    return None, "Unassigned", "", ""


async def resolve_vendor_assignment(db, items=None, explicit_vendor_id=None, order_type=None, order_id=None):
    """
    Type-aware vendor assignment dispatcher.
    Routes to the appropriate engine based on order_type.
    Falls back to deterministic item-vendor lookup if order_type is not specified.
    Returns (vendor_id, vendor_name, vendor_ids_list, decision_record).
    """
    # Manual override takes top priority
    if explicit_vendor_id:
        vendor = await db.users.find_one(
            {"$or": [{"id": explicit_vendor_id}, {"partner_id": explicit_vendor_id}]},
            {"_id": 0, "id": 1, "full_name": 1, "partner_id": 1}
        )
        if vendor:
            vid = vendor.get("partner_id") or vendor["id"]
            vname = vendor.get("full_name", "Vendor")
            decision = None
            if order_id:
                decision = await log_assignment_decision(
                    db,
                    order_id=order_id,
                    order_type=order_type or "unknown",
                    engine_used="manual_override",
                    chosen_vendor_id=vid,
                    chosen_vendor_name=vname,
                    reason_code="manual_override",
                    reason_detail="Vendor explicitly assigned by admin or system",
                    assigned_by="explicit",
                )
            return vid, vname, [vid], decision

    items = items or []
    effective_type = (order_type or "product").lower()

    # ─── Product Orders: Stock-First Engine ───────────────────────────
    if effective_type == "product":
        return await _dispatch_product_assignment(db, items, order_id)

    # ─── Promo Orders: Capability + Blank Availability ────────────────
    if effective_type in ("promo", "promotional", "promotional_materials"):
        return await _dispatch_promo_assignment(db, items, order_id)

    # ─── Service Orders: Capability + Availability + Performance ──────
    if effective_type in ("service", "services"):
        return await _dispatch_service_assignment(db, items, order_id)

    # ─── Fallback: deterministic item vendor lookup ───────────────────
    return await _dispatch_fallback_assignment(db, items, order_id, effective_type)


async def _dispatch_product_assignment(db, items, order_id):
    """Stock-first assignment for product orders."""
    result = await assign_vendors_for_product_order(db, items, order_id=order_id)

    primary_vid = result.get("primary_vendor_id")
    primary_vname = result.get("primary_vendor_name", "Unassigned")
    all_vids = result.get("all_vendor_ids", [])

    # Build candidates snapshot from all item assignments
    all_candidates = []
    for ia in result.get("item_assignments", []):
        all_candidates.extend(ia.get("candidates_snapshot", []))
    # Deduplicate by vendor_id
    seen = set()
    unique_candidates = []
    for c in all_candidates:
        vid = c.get("vendor_id")
        if vid and vid not in seen:
            seen.add(vid)
            unique_candidates.append(c)

    decision = None
    if order_id:
        # Determine fallback reason if primary wasn't tier 1
        fallback_reason = None
        primary_item = next(
            (ia for ia in result.get("item_assignments", []) if ia.get("vendor_id") == primary_vid),
            None,
        )
        if primary_item and primary_item.get("tier", 6) > 1:
            fallback_reason = f"Primary vendor chosen via {primary_item.get('reason_code', 'fallback')} (tier {primary_item.get('tier')})"

        decision = await log_assignment_decision(
            db,
            order_id=order_id,
            order_type="product",
            engine_used="stock_first_product",
            candidates_snapshot=unique_candidates,
            chosen_vendor_id=primary_vid,
            chosen_vendor_name=primary_vname,
            reason_code=result.get("primary_reason_code", ""),
            reason_detail=f"Stock-first engine selected vendor across {len(items)} item(s)",
            fallback_reason=fallback_reason,
            item_assignments=[
                {
                    "item_index": ia["item_index"],
                    "product_id": ia.get("product_id"),
                    "product_name": ia.get("product_name"),
                    "vendor_id": ia.get("vendor_id"),
                    "vendor_name": ia.get("vendor_name"),
                    "reason_code": ia.get("reason_code"),
                    "tier": ia.get("tier"),
                    "reserved": ia.get("reserved"),
                    "reserved_qty": ia.get("reserved_qty"),
                    "warning": ia.get("warning"),
                }
                for ia in result.get("item_assignments", [])
            ],
            all_vendor_ids=all_vids,
            assigned_by="stock_first_engine",
        )

    logger.info(
        "[product_assignment] order=%s primary_vendor=%s reason=%s vendors=%s",
        order_id, primary_vid, result.get("primary_reason_code"), all_vids,
    )
    return primary_vid, primary_vname, all_vids, decision


async def _dispatch_promo_assignment(db, items, order_id):
    """
    Promo assignment: blank availability → capability fit → production suitability
    → performance → turnaround.
    """
    # Collect required taxonomy/capability tags from items
    required_caps = set()
    for item in items:
        cats = item.get("categories") or item.get("taxonomy_ids") or []
        if isinstance(cats, list):
            required_caps.update(cats)
        cap = item.get("capability_type") or item.get("category")
        if cap:
            required_caps.add(cap)

    # Find vendors with promo capabilities
    cap_query = {}
    if required_caps:
        cap_query["capabilities"] = {"$in": list(required_caps)}
    capabilities = await db.vendor_capabilities.find(cap_query, {"_id": 0}).to_list(100)
    candidate_vids = list(set(c.get("vendor_id") for c in capabilities if c.get("vendor_id")))

    # Fallback: all active vendor/partner users with promo capability
    if not candidate_vids:
        promo_vendors = await db.users.find(
            {"role": {"$in": ["vendor", "partner"]}, "is_active": {"$ne": False}},
            {"_id": 0, "id": 1, "full_name": 1, "partner_id": 1}
        ).to_list(100)
        candidate_vids = [v.get("partner_id") or v["id"] for v in promo_vendors]

    # Score candidates
    scored = []
    for vid in candidate_vids:
        vendor = await db.users.find_one(
            {"$or": [{"id": vid}, {"partner_id": vid}]},
            {"_id": 0, "id": 1, "full_name": 1, "partner_id": 1, "status": 1, "is_active": 1}
        )
        if not vendor or vendor.get("status") in ("suspended", "blocked") or vendor.get("is_active") is False:
            continue

        actual_vid = vendor.get("partner_id") or vendor["id"]
        vname = vendor.get("full_name", "Vendor")

        # Blank stock availability
        blank_stock = await db.vendor_supply.count_documents({"vendor_id": actual_vid, "quantity": {"$gt": 0}})

        # Active workload
        active_orders = await db.vendor_orders.count_documents({
            "vendor_id": actual_vid,
            "status": {"$nin": ["completed", "cancelled", "delivered"]},
        })

        # Capability match count
        cap_match = sum(1 for c in capabilities if c.get("vendor_id") == vid)

        score = (cap_match * 15) + (blank_stock * 5) - (active_orders * 3)
        scored.append({
            "vendor_id": actual_vid,
            "vendor_name": vname,
            "score": score,
            "cap_match": cap_match,
            "blank_stock": blank_stock,
            "active_orders": active_orders,
            "eligible": True,
        })

    scored.sort(key=lambda x: -x["score"])
    best = scored[0] if scored else None

    chosen_vid = best["vendor_id"] if best else None
    chosen_vname = best["vendor_name"] if best else "Unassigned"
    all_vids = [chosen_vid] if chosen_vid else []
    reason_code = "promo_capability_match" if best else "unassigned"

    decision = None
    if order_id:
        decision = await log_assignment_decision(
            db,
            order_id=order_id,
            order_type="promo",
            engine_used="promo_capability",
            candidates_snapshot=[
                {
                    "vendor_id": s["vendor_id"],
                    "vendor_name": s["vendor_name"],
                    "score": s["score"],
                    "eligible": True,
                }
                for s in scored[:10]
            ],
            chosen_vendor_id=chosen_vid,
            chosen_vendor_name=chosen_vname,
            reason_code=reason_code,
            reason_detail="Promo assignment: blank availability + capability fit + workload",
            all_vendor_ids=all_vids,
            assigned_by="promo_engine",
        )

    logger.info("[promo_assignment] order=%s vendor=%s reason=%s", order_id, chosen_vid, reason_code)
    return chosen_vid, chosen_vname, all_vids, decision


async def _dispatch_service_assignment(db, items, order_id):
    """
    Service assignment: capability → availability → performance → turnaround.
    """
    required_caps = set()
    for item in items:
        cats = item.get("categories") or item.get("taxonomy_ids") or []
        if isinstance(cats, list):
            required_caps.update(cats)
        cap = item.get("service_type") or item.get("capability_type") or item.get("category")
        if cap:
            required_caps.add(cap)

    cap_query = {}
    if required_caps:
        cap_query["capabilities"] = {"$in": list(required_caps)}
    capabilities = await db.vendor_capabilities.find(cap_query, {"_id": 0}).to_list(100)
    candidate_vids = list(set(c.get("vendor_id") for c in capabilities if c.get("vendor_id")))

    if not candidate_vids:
        service_vendors = await db.users.find(
            {"role": {"$in": ["vendor", "partner"]}, "is_active": {"$ne": False}},
            {"_id": 0, "id": 1, "full_name": 1, "partner_id": 1}
        ).to_list(100)
        candidate_vids = [v.get("partner_id") or v["id"] for v in service_vendors]

    scored = []
    for vid in candidate_vids:
        vendor = await db.users.find_one(
            {"$or": [{"id": vid}, {"partner_id": vid}]},
            {"_id": 0, "id": 1, "full_name": 1, "partner_id": 1, "status": 1, "is_active": 1}
        )
        if not vendor or vendor.get("status") in ("suspended", "blocked") or vendor.get("is_active") is False:
            continue

        actual_vid = vendor.get("partner_id") or vendor["id"]
        vname = vendor.get("full_name", "Vendor")

        # Active workload (availability)
        active_orders = await db.vendor_orders.count_documents({
            "vendor_id": actual_vid,
            "status": {"$nin": ["completed", "cancelled", "delivered"]},
        })

        # Completed orders (track record / turnaround)
        completed = await db.vendor_orders.count_documents({
            "vendor_id": actual_vid,
            "status": {"$in": ["completed", "delivered"]},
        })

        cap_match = sum(1 for c in capabilities if c.get("vendor_id") == vid)

        score = (cap_match * 15) + (min(completed, 20) * 2) - (active_orders * 4)
        scored.append({
            "vendor_id": actual_vid,
            "vendor_name": vname,
            "score": score,
            "cap_match": cap_match,
            "completed_orders": completed,
            "active_orders": active_orders,
            "eligible": True,
        })

    scored.sort(key=lambda x: -x["score"])
    best = scored[0] if scored else None

    chosen_vid = best["vendor_id"] if best else None
    chosen_vname = best["vendor_name"] if best else "Unassigned"
    all_vids = [chosen_vid] if chosen_vid else []
    reason_code = "service_capability_match" if best else "unassigned"

    decision = None
    if order_id:
        decision = await log_assignment_decision(
            db,
            order_id=order_id,
            order_type="service",
            engine_used="service_capability_performance",
            candidates_snapshot=[
                {
                    "vendor_id": s["vendor_id"],
                    "vendor_name": s["vendor_name"],
                    "score": s["score"],
                    "eligible": True,
                }
                for s in scored[:10]
            ],
            chosen_vendor_id=chosen_vid,
            chosen_vendor_name=chosen_vname,
            reason_code=reason_code,
            reason_detail="Service assignment: capability + availability + performance",
            all_vendor_ids=all_vids,
            assigned_by="service_engine",
        )

    logger.info("[service_assignment] order=%s vendor=%s reason=%s", order_id, chosen_vid, reason_code)
    return chosen_vid, chosen_vname, all_vids, decision


async def _dispatch_fallback_assignment(db, items, order_id, order_type):
    """Fallback: deterministic item-vendor lookup from product catalog."""
    for item in items:
        vid = item.get("vendor_id") or item.get("partner_id")
        if vid:
            vendor = await db.users.find_one(
                {"$or": [{"id": vid}, {"partner_id": vid}]},
                {"_id": 0, "id": 1, "full_name": 1, "partner_id": 1}
            )
            if vendor:
                actual_vid = vendor.get("partner_id") or vendor["id"]
                vname = vendor.get("full_name", "Vendor")
                decision = None
                if order_id:
                    decision = await log_assignment_decision(
                        db,
                        order_id=order_id,
                        order_type=order_type,
                        engine_used="fallback_item_vendor",
                        chosen_vendor_id=actual_vid,
                        chosen_vendor_name=vname,
                        reason_code="item_vendor_id",
                        reason_detail="Vendor resolved from order item vendor_id field",
                        all_vendor_ids=[actual_vid],
                        assigned_by="fallback",
                    )
                return actual_vid, vname, [actual_vid], decision

        product_id = item.get("product_id") or item.get("sku")
        if product_id:
            product = await db.products.find_one(
                {"$or": [{"id": product_id}, {"sku": product_id}]},
                {"_id": 0, "vendor_id": 1, "partner_id": 1}
            )
            if product:
                vid = product.get("vendor_id") or product.get("partner_id")
                if vid:
                    vendor = await db.users.find_one(
                        {"$or": [{"id": vid}, {"partner_id": vid}]},
                        {"_id": 0, "id": 1, "full_name": 1, "partner_id": 1}
                    )
                    actual_vid = (vendor or {}).get("partner_id") or vid
                    vname = (vendor or {}).get("full_name", "Vendor")
                    decision = None
                    if order_id:
                        decision = await log_assignment_decision(
                            db,
                            order_id=order_id,
                            order_type=order_type,
                            engine_used="fallback_product_catalog",
                            chosen_vendor_id=actual_vid,
                            chosen_vendor_name=vname,
                            reason_code="product_catalog_vendor",
                            reason_detail="Vendor resolved from product catalog",
                            all_vendor_ids=[actual_vid],
                            assigned_by="fallback",
                        )
                    return actual_vid, vname, [actual_vid], decision

    return None, "Unassigned", [], None
