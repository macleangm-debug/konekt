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

# Public router (defined early so it can be used throughout)
public_router = APIRouter(prefix="/api/public/group-deals", tags=["Public Group Deals"])


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


async def _get_gd_settings():
    """Read Group-Deal commission settings from settings_hub.
    Defaults: 5% affiliate commission, TZS 50,000 minimum per-attributee payout."""
    row = await db.admin_settings.find_one({"key": "settings_hub"})
    hub = (row or {}).get("value", {}) if row else {}
    gd = hub.get("group_deals", {}) or {}
    payouts = hub.get("payouts", {}) or {}
    return {
        "affiliate_pct": float(gd.get("affiliate_commission_pct", 5.0)),
        "min_payout": float(payouts.get("affiliate_minimum_payout", 50000.0)),
    }


async def _resolve_referral(code: str):
    """Resolve a referral/promo code to an attributee.
    Returns: dict with keys {type: 'affiliate'|'sales', id, email, name, promo_code} or None."""
    if not code:
        return None
    code = code.strip()
    if not code:
        return None
    # First try affiliates
    aff = await db.affiliates.find_one(
        {"promo_code": {"$regex": f"^{code}$", "$options": "i"}, "status": "active"}
    )
    if aff:
        return {
            "type": "affiliate",
            "id": str(aff.get("_id")),
            "email": aff.get("email") or "",
            "name": aff.get("name") or aff.get("full_name") or "",
            "promo_code": aff.get("promo_code") or code,
        }
    # Then try users with sales role + promo_code
    user = await db.users.find_one(
        {"promo_code": {"$regex": f"^{code}$", "$options": "i"}, "role": {"$in": ["sales", "staff", "sales_manager"]}}
    )
    if user:
        return {
            "type": "sales",
            "id": user.get("id") or str(user.get("_id")),
            "email": user.get("email") or "",
            "name": user.get("full_name") or user.get("name") or "",
            "promo_code": user.get("promo_code") or code,
        }
    return None


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
        "savings_amount": round(original_price - discounted_price),
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
    # Aggregate pending-payment counts per campaign in ONE query for perf
    pipeline = [
        {"$match": {"status": "payment_submitted"}},
        {"$group": {"_id": "$campaign_id", "count": {"$sum": 1}}},
    ]
    pending_map = {}
    async for row in db.group_deal_commitments.aggregate(pipeline):
        pending_map[row["_id"]] = row["count"]
    out = []
    for d in docs:
        row = _s(d)
        row["pending_payment_count"] = pending_map.get(str(d["_id"]), 0)
        out.append(row)
    return out


@router.get("/campaigns/{campaign_id}")
async def get_campaign(campaign_id: str):
    doc = await db.group_deal_campaigns.find_one({"_id": ObjectId(campaign_id)})
    if not doc:
        doc = await db.group_deal_campaigns.find_one({"campaign_id": campaign_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Campaign not found")
    commitments = await db.group_deal_commitments.find(
        {"campaign_id": str(doc["_id"])},
        {"_id": 0, "commitment_ref": 1, "customer_name": 1, "customer_phone": 1, "amount": 1, "quantity": 1, "status": 1, "created_at": 1, "payment_proof": 1}
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

    # Allow repeat buyers — only prevent duplicate pending payment submissions
    if customer_phone:
        existing_pending = await db.group_deal_commitments.find_one({
            "campaign_id": str(doc["_id"]),
            "customer_phone": customer_phone,
            "status": "pending_payment",
        })
        if existing_pending:
            raise HTTPException(status_code=400, detail="You have a pending payment for this deal. Please complete it first.")

    amount = doc["discounted_price"]
    qty = max(1, int(payload.get("quantity", 1)))
    payment_method = payload.get("payment_method", "cash")

    now = datetime.now(timezone.utc)
    commitment_ref = f"GDC-{doc['campaign_id']}-{uuid4().hex[:6].upper()}"
    commitment = {
        "commitment_ref": commitment_ref,
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
        "payment_status": "pending_payment",
        "referral_code": payload.get("referral_code", ""),
        "status": "pending_payment",
        "quantity": qty,
        "created_at": now,
    }
    await db.group_deal_commitments.insert_one(commitment)

    # Do NOT increment count yet — count only after payment approval
    # Just record the commitment as pending_payment

    await trigger_event(
        EventType.GROUP_DEAL_JOINED,
        recipient_phone=customer_phone, recipient_email=customer_email,
        recipient_name=customer_name, entity_id=str(doc["_id"]),
        entity_number=doc["campaign_id"], entity_type="group_deal",
        amount=amount * qty, extra={"product_name": doc["product_name"], "quantity": qty},
    )

    return {
        "status": "pending_payment",
        "commitment_ref": commitment_ref,
        "amount": amount * qty,
        "quantity": qty,
        "current_committed": doc.get("current_committed", 0),
        "buyer_count": doc.get("buyer_count", 0),
        "target": doc["display_target"],
        "campaign_status": "active",
    }



# ─── PAYMENT FLOW ───

@public_router.post("/submit-payment")
async def submit_group_deal_payment(payload: dict):
    """
    Public: Submit payment proof for a group deal commitment.
    Reuses the same concept as normal checkout payment proof.
    """
    commitment_ref = payload.get("commitment_ref", "")
    if not commitment_ref:
        raise HTTPException(status_code=400, detail="commitment_ref is required.")

    commitment = await db.group_deal_commitments.find_one({"commitment_ref": commitment_ref})
    if not commitment:
        raise HTTPException(status_code=404, detail="Commitment not found.")
    if commitment.get("payment_status") not in ("pending_payment",):
        raise HTTPException(status_code=400, detail="Payment already submitted or processed.")

    now = datetime.now(timezone.utc)
    payment_data = {
        "payer_name": payload.get("payer_name", commitment.get("customer_name", "")),
        "amount_paid": float(payload.get("amount_paid", commitment.get("amount", 0))),
        "bank_reference": payload.get("bank_reference", ""),
        "payment_method": payload.get("payment_method", "bank_transfer"),
        "payment_date": payload.get("payment_date", now.isoformat()),
        "notes": payload.get("notes", ""),
    }
    await db.group_deal_commitments.update_one(
        {"_id": commitment["_id"]},
        {"$set": {
            "status": "payment_submitted",
            "payment_status": "payment_submitted",
            "payment_proof": payment_data,
            "payment_submitted_at": now,
        }}
    )
    return {
        "status": "payment_submitted",
        "commitment_ref": commitment_ref,
        "message": "Payment proof submitted. We will verify and confirm your participation.",
    }


@router.post("/commitments/{commitment_ref}/approve-payment")
async def approve_commitment_payment(commitment_ref: str):
    """Admin approves payment for a group deal commitment — counts towards campaign."""
    commitment = await db.group_deal_commitments.find_one({"commitment_ref": commitment_ref})
    if not commitment:
        raise HTTPException(status_code=404, detail="Commitment not found.")
    if commitment.get("payment_status") not in ("payment_submitted",):
        raise HTTPException(status_code=400, detail=f"Cannot approve: status is '{commitment.get('payment_status')}'.")

    now = datetime.now(timezone.utc)
    await db.group_deal_commitments.update_one(
        {"_id": commitment["_id"]},
        {"$set": {
            "status": "committed",
            "payment_status": "approved",
            "payment_approved_at": now,
        }}
    )

    # NOW increment the campaign count
    campaign = await db.group_deal_campaigns.find_one({"_id": ObjectId(commitment["campaign_id"])})
    if campaign:
        qty = commitment.get("quantity", 1)
        new_count = campaign.get("current_committed", 0) + qty
        new_buyers = campaign.get("buyer_count", 0) + 1
        update_fields = {"current_committed": new_count, "buyer_count": new_buyers, "updated_at": now}

        target = campaign.get("vendor_threshold", campaign.get("display_target", 1))
        if new_count >= target:
            update_fields["threshold_met"] = True
            # Quantity-based immediate closure — deal is successful
            update_fields["status"] = "successful"
            update_fields["completed_at"] = now

        await db.group_deal_campaigns.update_one({"_id": campaign["_id"]}, {"$set": update_fields})

        # Send group deal success email if just became successful
        if new_count >= target and not campaign.get("threshold_met"):
            try:
                from services.canonical_email_engine import send_group_deal_success_email
                committed_docs = await db.group_deal_commitments.find(
                    {"campaign_id": str(campaign["_id"]), "payment_status": "approved"},
                    {"_id": 0, "customer_email": 1, "customer_name": 1}
                ).to_list(500)
                for cdoc in committed_docs:
                    if cdoc.get("customer_email"):
                        await send_group_deal_success_email(
                            db, cdoc["customer_email"], cdoc.get("customer_name", ""),
                            campaign.get("product_name", ""), str(campaign["_id"])
                        )
            except Exception as e:
                print(f"Warning: Group deal success email error: {e}")

    return {"status": "approved", "commitment_ref": commitment_ref}


@router.get("/commitments/pending-payments")
async def list_pending_payments():
    """Admin: list all commitments with payment_submitted status awaiting approval."""
    docs = await db.group_deal_commitments.find(
        {"payment_status": "payment_submitted"},
    ).sort("payment_submitted_at", -1).to_list(100)
    results = []
    for d in docs:
        r = {
            "commitment_ref": d.get("commitment_ref", ""),
            "campaign_id": d.get("campaign_id", ""),
            "campaign_name": d.get("campaign_name", ""),
            "customer_name": d.get("customer_name", ""),
            "customer_phone": d.get("customer_phone", ""),
            "amount": d.get("amount", 0),
            "quantity": d.get("quantity", 1),
            "payment_proof": d.get("payment_proof", {}),
            "payment_submitted_at": d.get("payment_submitted_at", ""),
        }
        for k, v in r.items():
            if isinstance(v, datetime):
                r[k] = v.isoformat()
        results.append(r)
    return results


# ─── PUBLIC TRACK GROUP DEAL ───

@public_router.get("/track")
async def track_group_deal(phone: str = None, ref: str = None):
    """Public: Track group deal commitment by phone or commitment ref."""
    if ref:
        commitment = await db.group_deal_commitments.find_one({"commitment_ref": ref})
        if not commitment:
            raise HTTPException(status_code=404, detail="Commitment not found.")
        commitments = [commitment]
    elif phone:
        commitments = await db.group_deal_commitments.find(
            {"customer_phone": phone}
        ).sort("created_at", -1).to_list(20)
    else:
        raise HTTPException(status_code=400, detail="Phone or commitment ref required.")

    results = []
    for c in commitments:
        campaign = await db.group_deal_campaigns.find_one(
            {"_id": ObjectId(c["campaign_id"])},
            {"vendor_cost": 0, "vendor_threshold": 0, "margin_per_unit": 0, "margin_pct": 0,
             "commission_mode": 0, "affiliate_share_pct": 0, "created_by": 0, "threshold_met": 0}
        )
        cs = _s(campaign) if campaign else {}
        r = {
            "type": "group_deal",
            "commitment_ref": c.get("commitment_ref", ""),
            "campaign_name": c.get("campaign_name", ""),
            "customer_name": c.get("customer_name", ""),
            "quantity": c.get("quantity", 1),
            "amount": c.get("amount", 0),
            "status": c.get("status", ""),
            "payment_status": c.get("payment_status", ""),
            "order_number": c.get("order_number"),
            "created_at": c["created_at"].isoformat() if isinstance(c.get("created_at"), datetime) else str(c.get("created_at", "")),
            "campaign": {
                "id": cs.get("id", ""),
                "product_name": cs.get("product_name", ""),
                "product_image": cs.get("product_image", ""),
                "display_target": cs.get("display_target", 0),
                "current_committed": cs.get("current_committed", 0),
                "buyer_count": cs.get("buyer_count", 0),
                "deadline": cs.get("deadline", ""),
                "status": cs.get("status", ""),
            } if cs else {},
        }
        results.append(r)
    return results



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

    # Commission config — per-campaign override wins; otherwise use global settings
    gd_settings = await _get_gd_settings()
    affiliate_pct = float(doc.get("affiliate_share_pct") or 0) or gd_settings["affiliate_pct"]
    min_payout = gd_settings["min_payout"]
    vendor_cost = float(doc.get("vendor_cost", 0))
    margin_per_unit = float(doc.get("margin_per_unit") or (float(doc.get("discounted_price", 0)) - vendor_cost))

    # Per-attributee commission accumulator: { "affiliate:email@x.com": {..., "amount": N, "commitments": [...]}, ... }
    attributions = {}

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

        # Accumulate commission by attributee (resolve promo/referral code)
        referral = c.get("referral_code") or ""
        if referral and affiliate_pct > 0 and margin_per_unit > 0:
            attributee = await _resolve_referral(referral)
            if attributee:
                key = f"{attributee['type']}:{attributee.get('email') or attributee.get('id')}"
                commission_amt = round(margin_per_unit * qty * (affiliate_pct / 100.0), 2)
                if key not in attributions:
                    attributions[key] = {
                        **attributee,
                        "amount": 0,
                        "units": 0,
                        "commitments": [],
                    }
                attributions[key]["amount"] += commission_amt
                attributions[key]["units"] += qty
                attributions[key]["commitments"].append(c.get("commitment_ref", ""))

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

    # 2b. Create an aggregated vendor_order so the vendor sees it in their dashboard
    # — This is modelled on regular vendor_orders but with NO customer details and a group_deal flag.
    vendor_order_id = ""
    vendor_id = ""
    vendor_name = ""
    try:
        category = doc.get("category", "") or ""
        if category:
            assignment = await db.vendor_assignments.find_one({
                "is_active": True,
                "categories": {"$elemMatch": {"name": category}},
            }, sort=[("is_preferred", -1)])
            if assignment:
                vendor_id = assignment.get("vendor_id") or ""
                vendor_name = assignment.get("vendor_name") or ""
        # Virtual parent order id — links back to the campaign
        virtual_parent_id = f"GD-{doc.get('campaign_id')}"
        vendor_order_id = f"VO-GD-{doc.get('campaign_id')}-{uuid4().hex[:5].upper()}"
        vendor_order_doc = {
            "id": vendor_order_id,
            "vendor_order_no": f"GD-{doc.get('campaign_id')}",
            "vendor_id": vendor_id,
            "vendor_name": vendor_name,
            "order_id": virtual_parent_id,
            "source": "group_deal",
            "is_group_deal": True,
            "campaign_id": str(doc["_id"]),
            "campaign_code": doc.get("campaign_id"),
            "vbo_number": vbo_number,
            "product_id": doc.get("product_id", ""),
            "product_name": doc.get("product_name"),
            "product_image": doc.get("product_image", ""),
            "category": category,
            "description": doc.get("description", ""),
            "items": [{
                "name": doc.get("product_name"),
                "description": doc.get("description", ""),
                "quantity": total_units,
                "vendor_price": vendor_cost,
                "unit_price": vendor_cost,
                "total": vendor_cost * total_units,
            }],
            "line_items": [{
                "name": doc.get("product_name"),
                "description": doc.get("description", ""),
                "quantity": total_units,
                "unit_price": vendor_cost,
                "total": vendor_cost * total_units,
            }],
            "total_quantity": total_units,
            "buyer_count": orders_created,
            "base_price": vendor_cost * total_units,
            "base_cost": vendor_cost * total_units,
            "base_cost_per_unit": vendor_cost,
            "vendor_total": vendor_cost * total_units,
            "total_amount": vendor_cost * total_units,
            "status": "assigned",
            "release_status": "released",
            "sourcing_mode": "single",
            "vendor_payment_status": "pending",  # admin will toggle when paid
            "created_at": now,
            "updated_at": now,
        }
        await db.vendor_orders.insert_one(vendor_order_doc)
        # Notify vendor
        if vendor_id:
            await db.notifications.insert_one({
                "id": str(ObjectId()),
                "target_type": "vendor",
                "target_id": vendor_id,
                "title": f"New Group Deal order — {doc.get('product_name')}",
                "message": f"{total_units} units aggregated from {orders_created} buyers. Campaign {doc.get('campaign_id')}.",
                "read": False,
                "link": "/partner/vendor/orders",
                "created_at": now,
            })
    except Exception:
        # Vendor-order creation is non-blocking — campaign still finalizes even if this fails
        import traceback
        traceback.print_exc()

    # 3. Record commissions (one row per attributee) — only if total per-attributee >= floor
    commissions_recorded = []
    commissions_skipped = []
    total_commission_paid = 0.0
    for key, data in attributions.items():
        amt = round(data["amount"], 2)
        if amt >= min_payout:
            await db.affiliate_commissions.insert_one({
                "affiliate_email": data.get("email") or "",
                "affiliate_name": data.get("name") or "",
                "attributee_type": data.get("type"),
                "attributee_id": data.get("id"),
                "promo_code": data.get("promo_code"),
                "source": "group_deal",
                "campaign_id": str(doc["_id"]),
                "campaign_code": doc.get("campaign_id"),
                "product_name": doc.get("product_name"),
                "commission_amount": amt,
                "commission_pct": affiliate_pct,
                "units_attributed": data.get("units", 0),
                "commitment_refs": data.get("commitments", []),
                "status": "approved",  # credited immediately on finalize
                "created_at": now,
                "approved_at": now,
            })
            commissions_recorded.append({"name": data.get("name"), "email": data.get("email"), "type": data.get("type"), "amount": amt})
            total_commission_paid += amt
        else:
            commissions_skipped.append({"name": data.get("name"), "email": data.get("email"), "type": data.get("type"), "amount": amt, "reason": f"Below minimum payout of {min_payout}"})

    # P&L totals
    buyer_total_revenue = float(doc["discounted_price"]) * total_units
    vendor_total_cost = vendor_cost * total_units
    total_margin = buyer_total_revenue - vendor_total_cost
    konekt_net_profit = total_margin - total_commission_paid

    # 4. Update campaign status — LOCKED after finalize
    await db.group_deal_campaigns.update_one(
        {"_id": doc["_id"]},
        {"$set": {
            "status": "finalized",
            "finalized_at": now,
            "orders_created": orders_created,
            "total_units_ordered": total_units,
            "vbo_number": vbo_number,
            "is_featured": False,
            "buyer_total_revenue": buyer_total_revenue,
            "vendor_total_cost": vendor_total_cost,
            "total_margin": total_margin,
            "total_commission_paid": total_commission_paid,
            "konekt_net_profit": konekt_net_profit,
            "applied_affiliate_pct": affiliate_pct,
            "vendor_payout_status": "pending",
            "vendor_order_id": vendor_order_id,
            "vendor_id": vendor_id,
            "vendor_name": vendor_name,
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
        "pnl": {
            "revenue": buyer_total_revenue,
            "vendor_cost": vendor_total_cost,
            "gross_margin": total_margin,
            "commissions_paid": total_commission_paid,
            "konekt_net_profit": konekt_net_profit,
            "applied_affiliate_pct": affiliate_pct,
        },
        "commissions": {
            "recorded": commissions_recorded,
            "skipped_below_floor": commissions_skipped,
        },
    }


@router.get("/campaigns/{campaign_id}/buyers.csv")
async def export_buyers_csv(campaign_id: str):
    """Admin: download CSV of all buyers for a campaign — to share with vendor for fulfillment coordination."""
    from fastapi.responses import Response
    import csv
    from io import StringIO

    doc = await db.group_deal_campaigns.find_one({"_id": ObjectId(campaign_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Campaign not found")
    commitments = await db.group_deal_commitments.find(
        {"campaign_id": str(doc["_id"])}
    ).to_list(2000)

    buf = StringIO()
    writer = csv.writer(buf)
    writer.writerow([
        "Commitment Ref", "Customer Name", "Customer Phone", "Customer Email",
        "Quantity", "Amount (TZS)", "Status", "Payment Method", "Payment Reference",
        "Referral Code", "Order Number", "Joined At", "Finalized At",
    ])
    for c in commitments:
        writer.writerow([
            c.get("commitment_ref", ""),
            c.get("customer_name", ""),
            c.get("customer_phone", ""),
            c.get("customer_email", ""),
            c.get("quantity", 0),
            c.get("amount", 0),
            c.get("status", ""),
            c.get("payment_method", ""),
            c.get("payment_reference", ""),
            c.get("referral_code", ""),
            c.get("order_number", ""),
            c.get("created_at").isoformat() if isinstance(c.get("created_at"), datetime) else "",
            c.get("finalized_at").isoformat() if isinstance(c.get("finalized_at"), datetime) else "",
        ])
    csv_data = buf.getvalue()
    filename = f"group-deal-{doc.get('campaign_id','export')}-buyers.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/campaigns/{campaign_id}/vendor-payout")
async def mark_vendor_payout(campaign_id: str, payload: dict):
    """Admin: toggle vendor payout status on a finalized campaign.
    payload: {status: 'paid'|'pending', reference?: str, paid_at?: iso-date}"""
    doc = await db.group_deal_campaigns.find_one({"_id": ObjectId(campaign_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if doc.get("status") != "finalized":
        raise HTTPException(status_code=400, detail="Only finalized campaigns can have vendor payouts.")
    status = (payload.get("status") or "pending").lower()
    if status not in ("paid", "pending"):
        raise HTTPException(status_code=400, detail="Invalid status.")
    now = datetime.now(timezone.utc)
    update = {"vendor_payout_status": status, "updated_at": now}
    if status == "paid":
        update["vendor_payout_reference"] = payload.get("reference", "")
        update["vendor_payout_paid_at"] = now
    else:
        update["vendor_payout_reference"] = ""
        update["vendor_payout_paid_at"] = None
    await db.group_deal_campaigns.update_one({"_id": doc["_id"]}, {"$set": update})
    # Sync to the aggregated vendor_order so vendor sees payment status on their end
    voi = doc.get("vendor_order_id") or ""
    if voi:
        vo_update = {"vendor_payment_status": status, "updated_at": now}
        if status == "paid":
            vo_update["vendor_payment_reference"] = payload.get("reference", "")
            vo_update["vendor_paid_at"] = now
        await db.vendor_orders.update_one({"id": voi}, {"$set": vo_update})
    return {"status": status, "reference": update.get("vendor_payout_reference", ""), "paid_at": now.isoformat() if status == "paid" else None}


@router.post("/campaigns/{campaign_id}/broadcast")
async def log_buyer_broadcast(campaign_id: str, payload: dict):
    """Admin: log that a broadcast message was sent to buyers (actual sending is done client-side via WhatsApp/email).
    payload: {channel: 'whatsapp'|'email'|'manual', message: str, recipient_count: int}"""
    doc = await db.group_deal_campaigns.find_one({"_id": ObjectId(campaign_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Campaign not found")
    now = datetime.now(timezone.utc)
    await db.group_deal_broadcasts.insert_one({
        "campaign_id": str(doc["_id"]),
        "campaign_code": doc.get("campaign_id"),
        "channel": payload.get("channel", "manual"),
        "message": (payload.get("message") or "")[:2000],
        "recipient_count": int(payload.get("recipient_count") or 0),
        "created_at": now,
    })
    return {"ok": True, "at": now.isoformat()}


@router.get("/campaigns/{campaign_id}/broadcasts")
async def list_broadcasts(campaign_id: str):
    """Admin: list all broadcasts sent for a campaign."""
    doc = await db.group_deal_campaigns.find_one({"_id": ObjectId(campaign_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Campaign not found")
    rows = await db.group_deal_broadcasts.find(
        {"campaign_id": str(doc["_id"])}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    for r in rows:
        if isinstance(r.get("created_at"), datetime):
            r["created_at"] = r["created_at"].isoformat()
    return rows




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
        {"campaign_id": str(doc["_id"]), "status": {"$in": ["committed", "pending_payment", "payment_submitted"]}}
    ).to_list(1000)

    await db.group_deal_commitments.update_many(
        {"campaign_id": str(doc["_id"]), "status": {"$in": ["committed", "pending_payment", "payment_submitted"]}},
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
    """Public: get the single featured deal (Deal of the Day). Falls back to best active deal if none featured.
    Expired campaigns (deadline in the past) are excluded — even if their status is still 'active'.
    """
    now = datetime.now(timezone.utc)
    # Only surface deals whose deadline hasn't passed yet (or has no deadline set)
    not_expired_clause = {"$or": [{"deadline": {"$gt": now}}, {"deadline": None}, {"deadline": {"$exists": False}}]}
    doc = await db.group_deal_campaigns.find_one(
        {"status": "active", "is_featured": True, **not_expired_clause}, HIDDEN_FIELDS,
    )
    if not doc:
        # Fallback: pick best active, non-expired deal (highest progress, closest deadline)
        active_docs = await db.group_deal_campaigns.find(
            {"status": "active", **not_expired_clause}, HIDDEN_FIELDS,
        ).sort("created_at", -1).to_list(10)
        if not active_docs:
            return None
        best = None
        best_score = -1
        for d in active_docs:
            progress = (d.get("current_committed", 0) / max(d.get("display_target", 1), 1)) * 100
            deadline = d.get("deadline")
            if deadline:
                if deadline.tzinfo is None:
                    deadline = deadline.replace(tzinfo=timezone.utc)
                hours_left = max(0, (deadline - now).total_seconds() / 3600)
            else:
                hours_left = 9999
            score = progress * 10 + (1000 / max(hours_left, 1))
            if score > best_score:
                best_score = score
                best = d
        doc = best
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

    query = {"status": {"$in": ["pending_payment", "payment_submitted", "committed", "order_created", "refund_pending", "refunded"]}}
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
    status_order = {"pending_payment": 0, "payment_submitted": 1, "committed": 2, "order_created": 3, "refund_pending": 4, "refunded": 5}
    results.sort(key=lambda x: status_order.get(x["status"], 99))

    return results
