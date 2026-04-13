"""
Group Deal Campaign System — Demand aggregation engine.
Campaigns collect commitments; orders are created ONLY after campaign succeeds.
Reuses existing payment, order, fulfillment, and document systems.
"""
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/group-deals", tags=["Group Deals"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
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

    # Check minimum margin from settings
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
        "duration_days": duration_days,
        "deadline": deadline,
        "commission_mode": payload.get("commission_mode", "none"),
        "affiliate_share_pct": float(payload.get("affiliate_share_pct", 0)),
        "status": "active",
        "created_by": payload.get("created_by", ""),
        "created_at": now,
        "updated_at": now,
    }

    result = await db.group_deal_campaigns.insert_one(campaign)
    created = await db.group_deal_campaigns.find_one({"_id": result.inserted_id})
    return _s(created)


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
    # Include commitments
    commitments = await db.group_deal_commitments.find(
        {"campaign_id": str(doc["_id"])}, {"_id": 0, "customer_name": 1, "amount": 1, "status": 1, "created_at": 1}
    ).to_list(500)
    result = _s(doc)
    result["commitments"] = [{**c, "created_at": c["created_at"].isoformat() if isinstance(c.get("created_at"), datetime) else str(c.get("created_at", ""))} for c in commitments]
    return result


@router.patch("/campaigns/{campaign_id}")
async def update_campaign(campaign_id: str, payload: dict):
    doc = await db.group_deal_campaigns.find_one({"_id": ObjectId(campaign_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if doc.get("status") in ("successful", "failed"):
        raise HTTPException(status_code=400, detail="Cannot modify a completed campaign.")

    allowed = {"description", "product_image", "deadline", "status", "commission_mode", "affiliate_share_pct"}
    updates = {k: payload[k] for k in allowed if k in payload}
    updates["updated_at"] = datetime.now(timezone.utc)
    await db.group_deal_campaigns.update_one({"_id": ObjectId(campaign_id)}, {"$set": updates})
    updated = await db.group_deal_campaigns.find_one({"_id": ObjectId(campaign_id)})
    return _s(updated)


# ─── COMMITMENTS ───

@router.post("/campaigns/{campaign_id}/join")
async def join_campaign(campaign_id: str, payload: dict):
    """Customer commits to a group deal (full payment)."""
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

    amount = doc["discounted_price"]
    payment_method = payload.get("payment_method", "cash")

    now = datetime.now(timezone.utc)
    commitment = {
        "campaign_id": str(doc["_id"]),
        "campaign_name": doc["product_name"],
        "customer_name": customer_name,
        "customer_phone": customer_phone,
        "customer_email": customer_email,
        "customer_id": payload.get("customer_id", ""),
        "amount": amount,
        "payment_method": payment_method,
        "payment_reference": payload.get("payment_reference", ""),
        "status": "committed",
        "quantity": int(payload.get("quantity", 1)),
        "created_at": now,
    }
    await db.group_deal_commitments.insert_one(commitment)

    # Update count
    qty = commitment["quantity"]
    new_count = doc.get("current_committed", 0) + qty
    update_fields = {"current_committed": new_count, "updated_at": now}

    # Check if campaign succeeded
    if new_count >= doc["vendor_threshold"]:
        # Mark as successful if not already
        if doc.get("status") == "active":
            update_fields["status"] = "successful"
            update_fields["succeeded_at"] = now

    await db.group_deal_campaigns.update_one({"_id": doc["_id"]}, {"$set": update_fields})

    return {
        "status": "committed",
        "amount": amount,
        "current_committed": new_count,
        "target": doc["display_target"],
        "campaign_status": update_fields.get("status", doc["status"]),
    }


# ─── CAMPAIGN LIFECYCLE ───

@router.post("/campaigns/{campaign_id}/finalize")
async def finalize_campaign(campaign_id: str):
    """
    Admin finalizes a successful campaign: creates orders for all committed buyers.
    Reuses existing order system.
    """
    doc = await db.group_deal_campaigns.find_one({"_id": ObjectId(campaign_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if doc.get("status") not in ("successful", "active"):
        raise HTTPException(status_code=400, detail="Campaign cannot be finalized in current state.")
    if doc.get("current_committed", 0) < doc.get("vendor_threshold", 1):
        raise HTTPException(status_code=400, detail="Campaign has not reached vendor threshold yet.")

    commitments = await db.group_deal_commitments.find(
        {"campaign_id": str(doc["_id"]), "status": "committed"}
    ).to_list(1000)

    now = datetime.now(timezone.utc)
    orders_created = 0

    for c in commitments:
        order_number = f"GD-{now.strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}"
        order_doc = {
            "order_number": order_number,
            "customer_name": c.get("customer_name", ""),
            "customer_phone": c.get("customer_phone", ""),
            "customer_email": c.get("customer_email", ""),
            "customer_id": c.get("customer_id", ""),
            "line_items": [{
                "name": doc["product_name"],
                "description": doc["product_name"],
                "quantity": c.get("quantity", 1),
                "unit_price": doc["discounted_price"],
                "total": doc["discounted_price"] * c.get("quantity", 1),
            }],
            "subtotal": doc["discounted_price"] * c.get("quantity", 1),
            "total": doc["discounted_price"] * c.get("quantity", 1),
            "total_amount": doc["discounted_price"] * c.get("quantity", 1),
            "currency": "TZS",
            "status": "confirmed",
            "payment_status": "paid",
            "sales_channel": "group_deal",
            "sales_contribution_type": "campaign",
            "group_deal_campaign_id": str(doc["_id"]),
            "notes": f"Group Deal: {doc['product_name']}",
            "created_at": now,
            "updated_at": now,
        }
        await db.orders.insert_one(order_doc)
        await db.group_deal_commitments.update_one(
            {"_id": c["_id"]},
            {"$set": {"status": "order_created", "order_number": order_number}}
        )
        orders_created += 1

    await db.group_deal_campaigns.update_one(
        {"_id": doc["_id"]},
        {"$set": {"status": "finalized", "finalized_at": now, "orders_created": orders_created, "updated_at": now}}
    )

    return {"status": "finalized", "orders_created": orders_created}


@router.post("/campaigns/{campaign_id}/cancel")
async def cancel_campaign(campaign_id: str):
    """Cancel/fail a campaign — marks for refunds."""
    doc = await db.group_deal_campaigns.find_one({"_id": ObjectId(campaign_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if doc.get("status") == "finalized":
        raise HTTPException(status_code=400, detail="Cannot cancel a finalized campaign.")

    now = datetime.now(timezone.utc)
    await db.group_deal_campaigns.update_one(
        {"_id": doc["_id"]},
        {"$set": {"status": "failed", "failed_at": now, "updated_at": now}}
    )
    # Mark commitments for refund
    await db.group_deal_commitments.update_many(
        {"campaign_id": str(doc["_id"]), "status": "committed"},
        {"$set": {"status": "refund_pending"}}
    )
    refund_count = await db.group_deal_commitments.count_documents(
        {"campaign_id": str(doc["_id"]), "status": "refund_pending"}
    )
    return {"status": "failed", "refund_pending": refund_count}


# ─── PUBLIC ENDPOINTS ───

public_router = APIRouter(prefix="/api/public/group-deals", tags=["Public Group Deals"])


@public_router.get("")
async def public_list_deals():
    """Public: list active and successful campaigns."""
    docs = await db.group_deal_campaigns.find(
        {"status": {"$in": ["active", "successful"]}},
        {"vendor_cost": 0, "vendor_threshold": 0, "margin_per_unit": 0, "margin_pct": 0,
         "commission_mode": 0, "affiliate_share_pct": 0, "created_by": 0}
    ).sort("created_at", -1).to_list(50)
    return [_s(d) for d in docs]


@public_router.get("/{campaign_id}")
async def public_get_deal(campaign_id: str):
    """Public: get campaign detail (hides internal pricing data)."""
    doc = await db.group_deal_campaigns.find_one({"_id": ObjectId(campaign_id)})
    if not doc:
        doc = await db.group_deal_campaigns.find_one({"campaign_id": campaign_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Deal not found")
    result = _s(doc)
    # Hide internal fields from public
    for k in ["vendor_cost", "vendor_threshold", "margin_per_unit", "margin_pct", "commission_mode", "affiliate_share_pct", "created_by"]:
        result.pop(k, None)
    return result
