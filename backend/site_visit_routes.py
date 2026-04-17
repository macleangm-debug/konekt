"""
Site Visit Workflow Routes — Complete 2-stage service quote flow.

Stage 1: Request → Site Visit Quote (visit fee only) → Client pays → Vendor visits
Stage 2: Visit complete → Ops enters actual costs → Full Service Quote → Client pays

Flow:
  POST /api/site-visits/initiate       ← From request, creates site visit + visit-fee quote
  PATCH /api/site-visits/{id}/status   ← Ops updates visit status (scheduled→in_progress→completed)
  POST /api/site-visits/{id}/submit-findings ← Ops enters actual costs after visit
  POST /api/site-visits/{id}/generate-service-quote ← Creates the real service quote
"""
import os
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Query
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/site-visits", tags=["Site Visits"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


def serialize_doc(doc):
    if doc is None:
        return None
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    for key, value in doc.items():
        if isinstance(value, ObjectId):
            doc[key] = str(value)
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
    return doc


async def _find_visit(visit_id: str):
    """Find a site visit by id field or ObjectId."""
    visit = await db.site_visits.find_one({"id": visit_id})
    if not visit:
        try:
            visit = await db.site_visits.find_one({"_id": ObjectId(visit_id)})
        except Exception:
            pass
    return visit


async def _update_visit(visit, updates: dict):
    """Update a site visit, handling both id and _id lookups."""
    vid = visit.get("id")
    if vid:
        await db.site_visits.update_one({"id": vid}, {"$set": updates})
    elif "_id" in visit:
        await db.site_visits.update_one({"_id": visit["_id"]}, {"$set": updates})


# ─── List & Get ─────────────────────────────────────────────────────
@router.get("")
async def list_site_visits(status: str = None, customer_id: str = None):
    query = {}
    if status:
        query["status"] = status
    if customer_id:
        query["customer_id"] = customer_id
    docs = await db.site_visits.find(query).sort("created_at", -1).to_list(length=500)
    return [serialize_doc(doc) for doc in docs]


@router.get("/{visit_id}")
async def get_site_visit(visit_id: str):
    doc = await _find_visit(visit_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Site visit not found")
    return serialize_doc(doc)


# ─── Stage 1: Initiate Site Visit from Request ──────────────────────
@router.post("/initiate")
async def initiate_site_visit(payload: dict):
    """Create a site visit record + site visit fee quote.
    
    Called when a service request is for a category with requires_site_visit=True.
    Creates:
      1. A site_visit document tracking the visit
      2. A "site visit fee" quote with a single line item for the visit fee
    """
    now = datetime.now(timezone.utc)
    visit_id = str(uuid4())

    # Lookup category for visit fee config
    category_name = payload.get("category_name", "")
    visit_fee = float(payload.get("visit_fee", 0) or 0)
    
    if not visit_fee and category_name:
        cat = await db.catalog_categories.find_one({"name": category_name})
        if cat:
            visit_fee = float(cat.get("site_visit_fee", 50000) or 50000)
    if not visit_fee:
        visit_fee = 50000  # Default TZS 50,000

    # Create site visit document
    visit_doc = {
        "id": visit_id,
        "request_id": payload.get("request_id", ""),
        "category_name": category_name,
        "service_name": payload.get("service_name", ""),
        "subcategories": payload.get("subcategories", []),
        "customer_id": payload.get("customer_id", ""),
        "customer_email": payload.get("customer_email", ""),
        "customer_name": payload.get("customer_name", ""),
        "customer_phone": payload.get("customer_phone", ""),
        "location": payload.get("location", ""),
        "address": payload.get("address", ""),
        "visit_fee": visit_fee,
        "fee_paid": False,
        "visit_fee_quote_id": None,
        "assigned_vendor_id": None,
        "assigned_vendor_name": None,
        "scheduled_date": payload.get("preferred_date", ""),
        "scheduled_time": payload.get("preferred_time", ""),
        "findings": None,
        "actual_service_cost": None,
        "service_quote_id": None,
        "stage": "pending_visit_fee_payment",  # pending_visit_fee_payment → visit_scheduled → visit_in_progress → visit_completed → service_quoted → service_accepted
        "status": "pending",
        "notes": payload.get("notes", ""),
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }

    await db.site_visits.insert_one({k: v for k, v in visit_doc.items() if k != "id" and k != "_id"} | {"id": visit_id})

    # Create site visit fee quote
    quote_id = str(uuid4())
    quote_number = f"SVQ-{now.strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}"
    
    visit_fee_quote = {
        "id": quote_id,
        "quote_number": quote_number,
        "quote_type": "site_visit_fee",
        "site_visit_id": visit_id,
        "request_id": payload.get("request_id", ""),
        "customer_id": payload.get("customer_id", ""),
        "customer_email": payload.get("customer_email", ""),
        "customer_name": payload.get("customer_name", ""),
        "items": [{
            "description": f"Site Visit Assessment — {category_name}",
            "category": category_name,
            "quantity": 1,
            "unit_price": visit_fee,
            "total": visit_fee,
        }],
        "subtotal": visit_fee,
        "tax": 0,
        "total": visit_fee,
        "currency": "TZS",
        "status": "pending",
        "notes": f"Site visit assessment fee for {category_name}. Upon payment, a technician will be scheduled to visit your site and provide an accurate service quotation.",
        "valid_until": "",
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }

    await db.quotes.insert_one(visit_fee_quote)

    # Link quote back to site visit
    await db.site_visits.update_one({"id": visit_id}, {"$set": {"visit_fee_quote_id": quote_id}})

    # Update request if provided
    if payload.get("request_id"):
        await db.requests.update_one(
            {"id": payload["request_id"]},
            {"$set": {
                "site_visit_id": visit_id,
                "site_visit_stage": "pending_visit_fee_payment",
                "updated_at": now.isoformat(),
            }}
        )

    return {
        "site_visit": serialize_doc(await db.site_visits.find_one({"id": visit_id})),
        "visit_fee_quote": serialize_doc(await db.quotes.find_one({"id": quote_id})),
    }


# ─── Update Visit Status ────────────────────────────────────────────
@router.patch("/{visit_id}/status")
async def update_visit_status(visit_id: str, payload: dict):
    """Operations updates site visit status through the workflow stages."""
    visit = await _find_visit(visit_id)
    if not visit:
        raise HTTPException(status_code=404, detail="Site visit not found")

    now = datetime.now(timezone.utc)
    new_stage = payload.get("stage", "")
    new_status = payload.get("status", "")

    updates = {"updated_at": now.isoformat()}

    if new_stage:
        updates["stage"] = new_stage
    if new_status:
        updates["status"] = new_status

    # Handle fee payment confirmation
    if new_stage == "visit_scheduled" or payload.get("fee_paid"):
        updates["fee_paid"] = True
        updates["stage"] = "visit_scheduled"

    if payload.get("assigned_vendor_id"):
        updates["assigned_vendor_id"] = payload["assigned_vendor_id"]
        updates["assigned_vendor_name"] = payload.get("assigned_vendor_name", "")
    if payload.get("scheduled_date"):
        updates["scheduled_date"] = payload["scheduled_date"]
    if payload.get("scheduled_time"):
        updates["scheduled_time"] = payload["scheduled_time"]

    # Track stage transitions
    if new_stage == "visit_in_progress":
        updates["visit_started_at"] = now.isoformat()
    if new_stage == "visit_completed":
        updates["visit_completed_at"] = now.isoformat()

    await _update_visit(visit, updates)

    # Sync back to request
    request_id = visit.get("request_id")
    if request_id and new_stage:
        await db.requests.update_one(
            {"id": request_id},
            {"$set": {"site_visit_stage": new_stage, "updated_at": now.isoformat()}}
        )

    updated = await _find_visit(visit_id)
    return serialize_doc(updated)


# ─── Stage 2: Submit Findings + Generate Service Quote ───────────────
@router.post("/{visit_id}/submit-findings")
async def submit_visit_findings(visit_id: str, payload: dict):
    """Ops submits findings and actual service cost after completing a site visit."""
    visit = await _find_visit(visit_id)
    if not visit:
        raise HTTPException(status_code=404, detail="Site visit not found")

    now = datetime.now(timezone.utc)
    updates = {
        "findings": payload.get("findings", ""),
        "actual_service_cost": float(payload.get("actual_service_cost", 0) or 0),
        "recommended_items": payload.get("items", []),
        "stage": "visit_completed",
        "status": "completed",
        "visit_completed_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }

    await _update_visit(visit, updates)
    updated = await _find_visit(visit_id)
    return serialize_doc(updated)


@router.post("/{visit_id}/generate-service-quote")
async def generate_service_quote(visit_id: str, payload: dict = {}):
    """Generate the actual service quote after site visit is completed."""
    visit = await _find_visit(visit_id)
    if not visit:
        raise HTTPException(status_code=404, detail="Site visit not found")

    stage = visit.get("stage", "")
    if stage not in ("visit_completed",):
        raise HTTPException(status_code=400, detail="Site visit must be completed before generating service quote")

    now = datetime.now(timezone.utc)

    # Use items from payload or from findings
    items = payload.get("items") or visit.get("recommended_items", [])
    if not items and visit.get("actual_service_cost"):
        items = [{
            "description": f"{visit.get('service_name', visit.get('category_name', 'Service'))} — based on site assessment",
            "category": visit.get("category_name", ""),
            "quantity": 1,
            "unit_price": float(visit.get("actual_service_cost", 0)),
            "total": float(visit.get("actual_service_cost", 0)),
        }]

    # Apply pricing engine to each item
    from services.pricing_engine import calculate_sell_price
    enriched_items = []
    subtotal = 0
    for item in items:
        vendor_cost = float(item.get("base_cost") or item.get("unit_price") or 0)
        result = await calculate_sell_price(db, vendor_cost, category=visit.get("category_name"))
        sell_price = result["sell_price"]
        qty = int(item.get("quantity", 1))
        enriched_items.append({
            "description": item.get("description", ""),
            "category": item.get("category", visit.get("category_name", "")),
            "quantity": qty,
            "base_cost": vendor_cost,
            "unit_price": sell_price,
            "total": sell_price * qty,
            "margin_pct": result["margin_pct"],
            "pricing_source": result["rule_source"],
        })
        subtotal += sell_price * qty

    # Create service quote
    quote_id = str(uuid4())
    quote_number = f"SQ-{now.strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}"

    service_quote = {
        "id": quote_id,
        "quote_number": quote_number,
        "quote_type": "service",
        "source": "site_visit",
        "site_visit_id": visit_id,
        "request_id": visit.get("request_id", ""),
        "customer_id": visit.get("customer_id", ""),
        "customer_email": visit.get("customer_email", ""),
        "customer_name": visit.get("customer_name", ""),
        "items": enriched_items,
        "subtotal": subtotal,
        "tax": 0,
        "total": subtotal,
        "currency": "TZS",
        "status": "pending",
        "notes": payload.get("notes", f"Service quote based on site visit assessment.\nFindings: {visit.get('findings', '')}"),
        "valid_until": payload.get("valid_until", ""),
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }

    await db.quotes.insert_one(service_quote)

    # Update site visit
    await _update_visit(visit, {
        "service_quote_id": quote_id,
        "stage": "service_quoted",
        "updated_at": now.isoformat(),
    })

    # Update request
    if visit.get("request_id"):
        await db.requests.update_one(
            {"id": visit["request_id"]},
            {"$set": {
                "site_visit_stage": "service_quoted",
                "service_quote_id": quote_id,
                "updated_at": now.isoformat(),
            }}
        )

    return {
        "service_quote": serialize_doc(await db.quotes.find_one({"id": quote_id})),
        "site_visit": serialize_doc(await _find_visit(visit_id)),
    }


# ─── Check if category requires site visit ──────────────────────────
@router.get("/check-category/{category_name}")
async def check_category_site_visit(category_name: str):
    """Check if a category requires a site visit."""
    cat = await db.catalog_categories.find_one({"name": category_name})
    if not cat:
        # Try settings hub
        hub = await db.admin_settings.find_one({"key": "settings_hub"})
        cats = (hub or {}).get("value", {}).get("catalog", {}).get("product_categories", [])
        return {"requires_site_visit": False, "found": False}
    return {
        "requires_site_visit": bool(cat.get("requires_site_visit", False)),
        "site_visit_optional": bool(cat.get("site_visit_optional", False)),
        "site_visit_fee": float(cat.get("site_visit_fee", 50000) or 50000),
        "found": True,
    }
