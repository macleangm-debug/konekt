"""
Group Deal Campaign System — Demand aggregation engine.
Campaigns collect commitments; orders are created ONLY after admin finalizes.
Join = commitment only. Finalize = buyer orders + aggregated vendor back order.

Safety: duplicate join prevention, campaign lock after finalize, overflow allowed.
"""
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query
import os
from motor.motor_asyncio import AsyncIOMotorClient
from messaging_event_hooks import trigger_event, EventType

router = APIRouter(prefix="/api/admin/group-deals", tags=["Group Deals"])

mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


def _s(doc):
    if not doc:
        return None
    d = dict(doc)
    d["id"] = str(d.pop("_id"))
    for k, v in d.items():
        if isinstance(v, datetime):
            d[k] = v.isoformat()
        elif isinstance(v, ObjectId):
            d[k] = str(v)
    return d


# ─── CAMPAIGNS ───

@router.post("/campaigns")
async def create_campaign(payload: dict):
    """Create a new group deal campaign."""
    required = ["product_name", "vendor_cost", "display_target", "discounted_price", "duration_days"]
    for f in required:
        if not payload.get(f):
            raise HTTPException(status_code=400, detail=f"Missing required field: {f}")

    vendor_cost = float(payload["vendor_cost"])
    discounted_price = float(payload["discounted_price"])
    display_target = int(payload["display_target"])
    vendor_threshold = int(payload.get("vendor_threshold") or display_target)
    duration_days = int(payload["duration_days"])
    original_price = float(payload.get("original_price") or discounted_price * 1.25)

    margin_per_unit = discounted_price - vendor_cost
    if margin_per_unit < 0:
        raise HTTPException(status_code=400, detail="Discounted price cannot be below vendor cost.")

    margin_pct = round((margin_per_unit / discounted_price) * 100, 1)

    settings = await db.admin_settings.find_one({"key": "settings_hub"})
    min_margin = 5
    if settings:
        gd_settings = settings.get("value", {}).get("group_deals", {})
        min_margin = float(gd_settings.get("min_margin_pct", 5))
    if margin_pct < min_margin:
        raise HTTPException(status_code=400, detail=f"Margin {margin_pct}% is below minimum threshold of {min_margin}%.")

    now = datetime.now(timezone.utc)
    deadline = now + timedelta(days=duration_days)

    campaign = {
        "campaign_id": str(uuid4())[:8].upper(),
        "product_id": payload.get("product_id", ""),
        "product_name": payload["product_name"],
        "product_image": payload.get("product_image", ""),
        "description": payload.get("description", ""),
        "category": payload.get("category", ""),
        "vendor_cost": vendor_cost,
        "original_price": original_price,
        "discounted_price": discounted_price,
        "discount_pct": round(((original_price - discounted_price) / original_price) * 100),
        "margin_per_unit": margin_per_unit,
        "margin_pct": margin_pct,
        "display_target": display_target,
        "vendor_threshold": vendor_threshold,
        "current_committed": 0,
        "buyer_count": 0,
        "duration_days": duration_days,
        "deadline": deadline,
        "commission_mode": payload.get("commission_mode", "none"),
        "affiliate_share_pct": float(payload.get("affiliate_share_pct", 0)),
        "status": "active",
        "threshold_met": False,
        "is_featured": False,
        "created_by": payload.get("created_by", ""),
        "created_at": now,
        "updated_at": now,
    }

    result = await db.group_deal_campaigns.insert_one(campaign)
    created = await db.group_deal_campaigns.find_one({"_id": result.inserted_id})
    return _s(created)


@router.get("/products/search")
async def search_products_for_deal(q: str = ""):
    """Search products from marketplace listings for group deal creation."""
    query = {"is_active": True}
    if q:
        query["$or"] = [
            {"slug": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"category": {"$regex": q, "$options": "i"}},
            {"tags": {"$regex": q, "$options": "i"}},
        ]
    docs = await db.marketplace_listings.find(
        query,
        {"_id": 1, "slug": 1, "description": 1, "short_description": 1, "category": 1,
         "customer_price": 1, "base_partner_price": 1, "images": 1, "hero_image": 1,
         "listing_type": 1, "tags": 1}
    ).sort("slug", 1).to_list(50)

    results = []
    for d in docs:
        name = (d.get("slug") or "").replace("-", " ").title()
        img = d.get("hero_image") or (d.get("images") or [None])[0] if d.get("images") else None
        results.append({
            "id": str(d["_id"]),
            "name": name,
            "slug": d.get("slug", ""),
            "description": (d.get("short_description") or d.get("description") or "")[:120],
            "category": d.get("category", ""),
            "base_price": float(d.get("customer_price") or 0),
            "image": img or "",
            "listing_type": d.get("listing_type", "product"),
        })
    return results


@router.get("/campaigns")
async def list_campaigns(status: str = None):
    query = {}
    if status:
        query["status"] = status
    docs = await db.group_deal_campaigns.find(query).sort("created_at", -1).to_list(200)
    return [_s(d) for d in docs]


@router.get("/campaigns/{campaign_id}")
async def get_campaign(campaign_id: str):
    doc = await db.group_deal_campaigns.find_one({"_id": ObjectId(campaign_id)})
    if not doc:
        doc = await db.group_deal_campaigns.find_one({"campaign_id": campaign_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Campaign not found")
    commitments = await db.group_deal_commitments.find(
        {"campaign_id": str(doc["_id"])},
        {"_id": 0, "customer_name": 1, "customer_phone": 1, "amount": 1, "quantity": 1, "status": 1, "created_at": 1}
    ).to_list(500)
    result = _s(doc)
    result["commitments"] = [
        {**c, "created_at": c["created_at"].isoformat() if isinstance(c.get("created_at"), datetime) else str(c.get("created_at", ""))}
        for c in commitments
    ]
    vbo = await db.vendor_back_orders.find_one(
        {"campaign_id": str(doc["_id"])}, {"_id": 0}
    )
    if vbo:
        for k, v in vbo.items():
            if isinstance(v, datetime):
                vbo[k] = v.isoformat()
        result["vendor_back_order"] = vbo
    return result


@router.patch("/campaigns/{campaign_id}")
async def update_campaign(campaign_id: str, payload: dict):
    doc = await db.group_deal_campaigns.find_one({"_id": ObjectId(campaign_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if doc.get("status") in ("finalized", "failed"):
        raise HTTPException(status_code=400, detail="Cannot modify a completed campaign.")

    allowed = {"description", "product_image", "deadline", "commission_mode", "affiliate_share_pct"}
    updates = {k: payload[k] for k in allowed if k in payload}
    updates["updated_at"] = datetime.now(timezone.utc)
    await db.group_deal_campaigns.update_one({"_id": ObjectId(campaign_id)}, {"$set": updates})
    updated = await db.group_deal_campaigns.find_one({"_id": ObjectId(campaign_id)})
    return _s(updated)


# ─── DEAL OF THE DAY ───

@router.post("/campaigns/{campaign_id}/set-featured")
async def set_featured_deal(campaign_id: str):
    """Set a campaign as Deal of the Day. Only 1 at a time."""
    doc = await db.group_deal_campaigns.find_one({"_id": ObjectId(campaign_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if doc.get("status") != "active":
        raise HTTPException(status_code=400, detail="Only active campaigns can be featured.")

    progress = (doc.get("current_committed", 0) / max(doc.get("display_target", 1), 1)) * 100
    if progress < 30 and doc.get("current_committed", 0) > 0:
        raise HTTPException(status_code=400, detail="Campaign needs ≥30% progress to be featured.")

    # Unfeature all others first
    await db.group_deal_campaigns.update_many(
        {"is_featured": True},
        {"$set": {"is_featured": False}}
    )
    await db.group_deal_campaigns.update_one(
        {"_id": ObjectId(campaign_id)},
        {"$set": {"is_featured": True, "updated_at": datetime.now(timezone.utc)}}
    )
    return {"status": "featured", "campaign_id": campaign_id}


@router.post("/campaigns/{campaign_id}/unset-featured")
async def unset_featured_deal(campaign_id: str):
    """Remove featured status from a campaign."""
    await db.group_deal_campaigns.update_one(
        {"_id": ObjectId(campaign_id)},
        {"$set": {"is_featured": False, "updated_at": datetime.now(timezone.utc)}}
    )
    return {"status": "unfeatured"}


# ─── COMMITMENTS ───

@router.post("/campaigns/{campaign_id}/join")
async def join_campaign(campaign_id: str, payload: dict):
    """
    Customer commits to a group deal (full payment upfront).
    Does NOT create orders. Does NOT auto-mark campaign as successful.
    Only creates a commitment record and updates the committed count.
    Prevents duplicate joins from same phone number.
    """
    doc = await db.group_deal_campaigns.find_one({"_id": ObjectId(campaign_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if doc.get("status") != "active":
        raise HTTPException(status_code=400, detail="This campaign is no longer accepting commitments.")
    deadline = doc.get("deadline")
    if deadline:
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > deadline:
            raise HTTPException(status_code=400, detail="Campaign deadline has passed.")

    customer_name = payload.get("customer_name", "")
    customer_phone = payload.get("customer_phone", "")
    customer_email = payload.get("customer_email", "")
    if not customer_name and not customer_phone:
        raise HTTPException(status_code=400, detail="Customer name or phone is required.")

    # Duplicate join prevention — same phone on same campaign
    if customer_phone:
        existing = await db.group_deal_commitments.find_one({
            "campaign_id": str(doc["_id"]),
            "customer_phone": customer_phone,
            "status": {"$in": ["committed", "order_created"]},
        })
        if existing:
            raise HTTPException(status_code=400, detail="You have already joined this deal.")

    amount = doc["discounted_price"]
    qty = max(1, int(payload.get("quantity", 1)))
    payment_method = payload.get("payment_method", "cash")

    now = datetime.now(timezone.utc)
    commitment = {
        "campaign_id": str(doc["_id"]),
        "campaign_name": doc["product_name"],
        "customer_name": customer_name,
        "customer_phone": customer_phone,
        "customer_email": customer_email,
        "customer_id": payload.get("customer_id", ""),
        "amount": amount * qty,
        "unit_price": amount,
        "payment_method": payment_method,
        "payment_reference": payload.get("payment_reference", ""),
        "referral_code": payload.get("referral_code", ""),
        "status": "committed",
        "quantity": qty,
        "created_at": now,
    }
    await db.group_deal_commitments.insert_one(commitment)

    # Update committed unit count + buyer count — NO status change
    new_count = doc.get("current_committed", 0) + qty
    new_buyers = doc.get("buyer_count", 0) + 1
    update_fields = {"current_committed": new_count, "buyer_count": new_buyers, "updated_at": now}

    # Set threshold_met flag for admin visibility, but do NOT change status
    if new_count >= doc.get("vendor_threshold", doc["display_target"]):
        update_fields["threshold_met"] = True

    await db.group_deal_campaigns.update_one({"_id": doc["_id"]}, {"$set": update_fields})

    await trigger_event(
        EventType.GROUP_DEAL_JOINED,
        recipient_phone=customer_phone, recipient_email=customer_email,
        recipient_name=customer_name, entity_id=str(doc["_id"]),
        entity_number=doc["campaign_id"], entity_type="group_deal",
        amount=amount * qty, extra={"product_name": doc["product_name"], "quantity": qty},
    )

    return {
        "status": "committed",
        "amount": amount * qty,
        "quantity": qty,
        "current_committed": new_count,
        "buyer_count": new_buyers,
        "target": doc["display_target"],
        "campaign_status": "active",
    }


# ─── CAMPAIGN LIFECYCLE ───

@router.post("/campaigns/{campaign_id}/finalize")
async def finalize_campaign(campaign_id: str):
    """
    Admin finalizes a campaign that has met its threshold.
    Creates:
      1. Individual buyer orders (one per commitment)
      2. ONE aggregated vendor back order (total quantity for vendor prep)
    """
    doc = await db.group_deal_campaigns.find_one({"_id": ObjectId(campaign_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if doc.get("status") != "active":
        raise HTTPException(status_code=400, detail=f"Campaign in '{doc.get('status')}' state cannot be finalized.")
    if doc.get("current_committed", 0) < doc.get("vendor_threshold", 1):
        raise HTTPException(status_code=400, detail="Campaign has not reached vendor threshold yet.")

    commitments = await db.group_deal_commitments.find(
        {"campaign_id": str(doc["_id"]), "status": "committed"}
    ).to_list(1000)

    if not commitments:
        raise HTTPException(status_code=400, detail="No committed buyers to finalize.")

    now = datetime.now(timezone.utc)
    orders_created = 0
    total_units = 0

    # 1. Create individual buyer orders
    for c in commitments:
        qty = c.get("quantity", 1)
        total_units += qty
        order_number = f"GD-{now.strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}"
        order_doc = {
            "order_number": order_number,
            "customer_name": c.get("customer_name", ""),
            "customer_phone": c.get("customer_phone", ""),
            "customer_email": c.get("customer_email", ""),
            "customer_id": c.get("customer_id", ""),
            "line_items": [{
                "name": doc["product_name"],
                "description": doc.get("description", doc["product_name"]),
                "quantity": qty,
                "unit_price": doc["discounted_price"],
                "total": doc["discounted_price"] * qty,
            }],
            "subtotal": doc["discounted_price"] * qty,
            "total": doc["discounted_price"] * qty,
            "total_amount": doc["discounted_price"] * qty,
            "currency": "TZS",
            "status": "confirmed",
            "payment_status": "paid",
            "sales_channel": "group_deal",
            "sales_contribution_type": "campaign",
            "group_deal_campaign_id": str(doc["_id"]),
            "notes": f"Group Deal: {doc['product_name']} (Campaign {doc['campaign_id']})",
            "created_at": now,
            "updated_at": now,
        }
        await db.orders.insert_one(order_doc)
        await db.group_deal_commitments.update_one(
            {"_id": c["_id"]},
            {"$set": {"status": "order_created", "order_number": order_number, "finalized_at": now}}
        )
        orders_created += 1

    # 2. Create ONE aggregated vendor back order
    vbo_number = f"VBO-{doc['campaign_id']}-{now.strftime('%Y%m%d')}"
    vendor_back_order = {
        "vbo_number": vbo_number,
        "campaign_id": str(doc["_id"]),
        "campaign_code": doc["campaign_id"],
        "product_name": doc["product_name"],
        "product_id": doc.get("product_id", ""),
        "category": doc.get("category", ""),
        "total_quantity": total_units,
        "vendor_unit_cost": doc["vendor_cost"],
        "vendor_total_cost": doc["vendor_cost"] * total_units,
        "buyer_unit_price": doc["discounted_price"],
        "buyer_total_revenue": doc["discounted_price"] * total_units,
        "total_margin": (doc["discounted_price"] - doc["vendor_cost"]) * total_units,
        "buyer_count": orders_created,
        "preparation_status": "pending",
        "notes": f"Aggregated vendor order for Group Deal campaign {doc['campaign_id']}",
        "created_at": now,
        "updated_at": now,
    }
    await db.vendor_back_orders.insert_one(vendor_back_order)

    # 3. Update campaign status — LOCKED after finalize
    await db.group_deal_campaigns.update_one(
        {"_id": doc["_id"]},
        {"$set": {
            "status": "finalized",
            "finalized_at": now,
            "orders_created": orders_created,
            "total_units_ordered": total_units,
            "vbo_number": vbo_number,
            "is_featured": False,
            "updated_at": now,
        }}
    )

    for c in commitments:
        await trigger_event(
            EventType.GROUP_DEAL_FINALIZED,
            recipient_phone=c.get("customer_phone"), recipient_email=c.get("customer_email"),
            recipient_name=c.get("customer_name"), entity_id=str(doc["_id"]),
            entity_number=doc["campaign_id"], entity_type="group_deal",
            amount=doc["discounted_price"] * c.get("quantity", 1),
            extra={"product_name": doc["product_name"], "vbo_number": vbo_number},
        )

    return {
        "status": "finalized",
        "orders_created": orders_created,
        "total_units": total_units,
        "vendor_back_order": vbo_number,
    }


@router.post("/campaigns/{campaign_id}/cancel")
async def cancel_campaign(campaign_id: str):
    """Cancel/fail a campaign — marks all committed buyers for refund."""
    doc = await db.group_deal_campaigns.find_one({"_id": ObjectId(campaign_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if doc.get("status") == "finalized":
        raise HTTPException(status_code=400, detail="Cannot cancel a finalized campaign.")

    now = datetime.now(timezone.utc)
    await db.group_deal_campaigns.update_one(
        {"_id": doc["_id"]},
        {"$set": {"status": "failed", "failed_at": now, "is_featured": False, "updated_at": now}}
    )
    committed_buyers = await db.group_deal_commitments.find(
        {"campaign_id": str(doc["_id"]), "status": "committed"}
    ).to_list(1000)

    await db.group_deal_commitments.update_many(
        {"campaign_id": str(doc["_id"]), "status": "committed"},
        {"$set": {"status": "refund_pending", "refund_marked_at": now}}
    )
    refund_count = len(committed_buyers)

    for c in committed_buyers:
        await trigger_event(
            EventType.GROUP_DEAL_FAILED,
            recipient_phone=c.get("customer_phone"), recipient_email=c.get("customer_email"),
            recipient_name=c.get("customer_name"), entity_id=str(doc["_id"]),
            entity_number=doc["campaign_id"], entity_type="group_deal",
            amount=c.get("amount", 0),
            extra={"product_name": doc["product_name"]},
        )

    return {"status": "failed", "refund_pending": refund_count}


@router.post("/campaigns/{campaign_id}/process-refunds")
async def process_refunds(campaign_id: str):
    """Admin marks refund_pending commitments as refunded."""
    doc = await db.group_deal_campaigns.find_one({"_id": ObjectId(campaign_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if doc.get("status") != "failed":
        raise HTTPException(status_code=400, detail="Refunds can only be processed for failed campaigns.")

    now = datetime.now(timezone.utc)
    result = await db.group_deal_commitments.update_many(
        {"campaign_id": str(doc["_id"]), "status": "refund_pending"},
        {"$set": {"status": "refunded", "refunded_at": now}}
    )
    return {"status": "refunds_processed", "refunded_count": result.modified_count}


# ─── VENDOR BACK ORDERS (Admin view) ───

@router.get("/vendor-back-orders")
async def list_vendor_back_orders():
    docs = await db.vendor_back_orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    for d in docs:
        for k, v in d.items():
            if isinstance(v, datetime):
                d[k] = v.isoformat()
    return docs


@router.patch("/vendor-back-orders/{vbo_number}")
async def update_vendor_back_order(vbo_number: str, payload: dict):
    """Update vendor back order preparation status."""
    vbo = await db.vendor_back_orders.find_one({"vbo_number": vbo_number})
    if not vbo:
        raise HTTPException(status_code=404, detail="Vendor back order not found")
    allowed = {"preparation_status", "notes"}
    updates = {k: payload[k] for k in allowed if k in payload}
    updates["updated_at"] = datetime.now(timezone.utc)
    await db.vendor_back_orders.update_one({"vbo_number": vbo_number}, {"$set": updates})
    return {"status": "updated", "vbo_number": vbo_number}


# ─── PUBLIC ENDPOINTS ───

public_router = APIRouter(prefix="/api/public/group-deals", tags=["Public Group Deals"])

HIDDEN_FIELDS = {
    "vendor_cost": 0, "vendor_threshold": 0, "margin_per_unit": 0, "margin_pct": 0,
    "commission_mode": 0, "affiliate_share_pct": 0, "created_by": 0, "threshold_met": 0,
}


def _add_buyer_count(doc, serialized):
    """Add buyer_count to serialized output for public display."""
    serialized["buyer_count"] = doc.get("buyer_count", 0)
    return serialized


@public_router.get("")
async def public_list_deals():
    """Public: list active campaigns, ranked by progress %, urgency, popularity."""
    docs = await db.group_deal_campaigns.find(
        {"status": "active"}, HIDDEN_FIELDS,
    ).sort("created_at", -1).to_list(50)

    now = datetime.now(timezone.utc)
    results = []
    for d in docs:
        s = _add_buyer_count(d, _s(d))
        progress = (d.get("current_committed", 0) / max(d.get("display_target", 1), 1)) * 100
        deadline = d.get("deadline")
        if deadline:
            if deadline.tzinfo is None:
                deadline = deadline.replace(tzinfo=timezone.utc)
            hours_left = max(0, (deadline - now).total_seconds() / 3600)
        else:
            hours_left = 9999
        s["_progress"] = progress
        s["_hours_left"] = hours_left
        s["_popularity"] = d.get("current_committed", 0)
        results.append(s)

    results.sort(key=lambda x: (-x["_progress"], x["_hours_left"], -x["_popularity"]))

    for r in results:
        r.pop("_progress", None)
        r.pop("_hours_left", None)
        r.pop("_popularity", None)

    return results


@public_router.get("/featured")
async def public_featured_deals():
    """Public: top 6 active deals for homepage integration, ranked by progress/urgency."""
    docs = await db.group_deal_campaigns.find(
        {"status": "active"}, HIDDEN_FIELDS,
    ).sort("created_at", -1).to_list(20)

    now = datetime.now(timezone.utc)
    results = []
    for d in docs:
        s = _add_buyer_count(d, _s(d))
        progress = (d.get("current_committed", 0) / max(d.get("display_target", 1), 1)) * 100
        deadline = d.get("deadline")
        if deadline:
            if deadline.tzinfo is None:
                deadline = deadline.replace(tzinfo=timezone.utc)
            hours_left = max(0, (deadline - now).total_seconds() / 3600)
        else:
            hours_left = 9999
        s["_progress"] = progress
        s["_hours_left"] = hours_left
        s["_popularity"] = d.get("current_committed", 0)
        results.append(s)

    results.sort(key=lambda x: (-x["_progress"], x["_hours_left"], -x["_popularity"]))

    for r in results:
        r.pop("_progress", None)
        r.pop("_hours_left", None)
        r.pop("_popularity", None)

    return results[:6]


@public_router.get("/deal-of-the-day")
async def public_deal_of_the_day():
    """Public: get the single featured deal (Deal of the Day)."""
    doc = await db.group_deal_campaigns.find_one(
        {"status": "active", "is_featured": True}, HIDDEN_FIELDS,
    )
    if not doc:
        return None
    return _add_buyer_count(doc, _s(doc))


@public_router.get("/{campaign_id}")
async def public_get_deal(campaign_id: str):
    """Public: get campaign detail (hides internal pricing data)."""
    doc = await db.group_deal_campaigns.find_one({"_id": ObjectId(campaign_id)})
    if not doc:
        doc = await db.group_deal_campaigns.find_one({"campaign_id": campaign_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Deal not found")
    result = _s(doc)
    result["buyer_count"] = doc.get("buyer_count", 0)
    for k in ["vendor_cost", "vendor_threshold", "margin_per_unit", "margin_pct",
              "commission_mode", "affiliate_share_pct", "created_by", "threshold_met"]:
        result.pop(k, None)
    return result


# ─── CUSTOMER ENDPOINTS (authenticated user's commitments) ───

customer_router = APIRouter(prefix="/api/customer/group-deals", tags=["Customer Group Deals"])


@customer_router.get("")
async def customer_list_commitments(phone: str = None, email: str = None):
    """List all group deal commitments for a customer (by phone or email)."""
    if not phone and not email:
        return []

    query = {"status": {"$in": ["committed", "order_created", "refund_pending", "refunded"]}}
    if phone:
        query["customer_phone"] = phone
    elif email:
        query["customer_email"] = email

    commitments = await db.group_deal_commitments.find(query).sort("created_at", -1).to_list(100)

    results = []
    for c in commitments:
        campaign = await db.group_deal_campaigns.find_one(
            {"_id": ObjectId(c["campaign_id"])},
            {"vendor_cost": 0, "vendor_threshold": 0, "margin_per_unit": 0, "margin_pct": 0,
             "commission_mode": 0, "affiliate_share_pct": 0, "created_by": 0, "threshold_met": 0}
        )
        c_data = {
            "commitment_id": str(c["_id"]),
            "campaign_id": c["campaign_id"],
            "campaign_name": c.get("campaign_name", ""),
            "quantity": c.get("quantity", 1),
            "amount": c.get("amount", 0),
            "unit_price": c.get("unit_price", 0),
            "status": c["status"],
            "order_number": c.get("order_number"),
            "created_at": c["created_at"].isoformat() if isinstance(c.get("created_at"), datetime) else str(c.get("created_at", "")),
        }
        if campaign:
            cs = _s(campaign)
            c_data["campaign"] = {
                "id": cs["id"],
                "product_name": cs.get("product_name", ""),
                "product_image": cs.get("product_image", ""),
                "discounted_price": cs.get("discounted_price", 0),
                "original_price": cs.get("original_price", 0),
                "discount_pct": cs.get("discount_pct", 0),
                "display_target": cs.get("display_target", 0),
                "current_committed": cs.get("current_committed", 0),
                "buyer_count": cs.get("buyer_count", 0),
                "deadline": cs.get("deadline", ""),
                "status": cs.get("status", ""),
            }
        results.append(c_data)

    # Sort: active first, then order_created, then refund_pending, then refunded
    status_order = {"committed": 0, "order_created": 1, "refund_pending": 2, "refunded": 3}
    results.sort(key=lambda x: status_order.get(x["status"], 99))

    return results
