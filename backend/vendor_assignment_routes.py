"""
Vendor-Category Assignment Routes
- Assign vendors to categories/subcategories
- Query which vendors serve a category
- Auto-split orders by vendor capability
"""
import os
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/vendor-assignments", tags=["Vendor Assignments"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


def _serialize(doc):
    if not doc:
        return None
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc


@router.post("")
async def assign_vendor_to_categories(payload: dict):
    """Assign a vendor to one or more categories with sourcing preference."""
    now = datetime.now(timezone.utc).isoformat()
    vendor_id = payload.get("vendor_id")
    if not vendor_id:
        raise HTTPException(status_code=400, detail="vendor_id required")

    # Get vendor info
    vendor = await db.partner_users.find_one({"partner_id": vendor_id})
    if not vendor:
        vendor = await db.users.find_one({"id": vendor_id})
    vendor_name = (vendor or {}).get("company_name") or (vendor or {}).get("full_name") or (vendor or {}).get("name") or vendor_id

    doc = {
        "id": str(uuid4()),
        "vendor_id": vendor_id,
        "vendor_name": vendor_name,
        "vendor_type": payload.get("vendor_type", "product"),  # product, service, both
        "categories": payload.get("categories", []),  # [{name, sourcing_mode}]
        "subcategories": payload.get("subcategories", []),
        "is_preferred": payload.get("is_preferred", False),
        "is_active": True,
        "notes": payload.get("notes", ""),
        "created_at": now,
        "updated_at": now,
    }

    # Upsert — one record per vendor
    existing = await db.vendor_assignments.find_one({"vendor_id": vendor_id})
    if existing:
        await db.vendor_assignments.update_one(
            {"vendor_id": vendor_id},
            {"$set": {
                "vendor_name": vendor_name,
                "vendor_type": doc["vendor_type"],
                "categories": doc["categories"],
                "subcategories": doc["subcategories"],
                "is_preferred": doc["is_preferred"],
                "notes": doc["notes"],
                "updated_at": now,
            }}
        )
        updated = await db.vendor_assignments.find_one({"vendor_id": vendor_id})
        return _serialize(updated)
    else:
        await db.vendor_assignments.insert_one(doc)
        return _serialize(doc)


@router.get("")
async def list_vendor_assignments():
    """List all vendor-category assignments."""
    docs = await db.vendor_assignments.find({"is_active": True}).sort("vendor_name", 1).to_list(length=500)
    return [_serialize(d) for d in docs]


@router.get("/by-category/{category_name}")
async def vendors_for_category(category_name: str):
    """Get all vendors assigned to a specific category."""
    docs = await db.vendor_assignments.find({
        "is_active": True,
        "categories": {"$elemMatch": {"name": category_name}},
    }).to_list(length=100)

    # Get category sourcing mode
    cat = await db.catalog_categories.find_one({"name": category_name})
    sourcing_mode = (cat or {}).get("sourcing_mode", "preferred")

    vendors = []
    for d in docs:
        d = _serialize(d)
        d["is_single_source"] = sourcing_mode == "preferred" and d.get("is_preferred", False)
        vendors.append(d)

    return {
        "category": category_name,
        "sourcing_mode": sourcing_mode,
        "vendors": vendors,
        "preferred_vendor": next((v for v in vendors if v.get("is_preferred")), None),
    }


@router.delete("/{vendor_id}")
async def remove_vendor_assignment(vendor_id: str):
    """Deactivate a vendor assignment."""
    result = await db.vendor_assignments.update_one(
        {"vendor_id": vendor_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return {"status": "success"}


@router.post("/split-order")
async def split_order_by_vendor(payload: dict):
    """Split an order's line items into vendor groups based on category assignments.
    
    Input: { items: [{category, subcategory, description, quantity, unit_price, ...}] }
    Output: { vendor_groups: [{vendor_id, vendor_name, sourcing_mode, items: [...], needs_quote: bool}] }
    """
    items = payload.get("items", [])
    if not items:
        return {"vendor_groups": [], "unassigned": []}

    vendor_groups = {}  # vendor_id -> {vendor info + items}
    unassigned = []

    for item in items:
        category = item.get("category", "")
        if not category:
            unassigned.append(item)
            continue

        # Find vendors for this category
        assignments = await db.vendor_assignments.find({
            "is_active": True,
            "categories": {"$elemMatch": {"name": category}},
        }).to_list(length=50)

        # Get sourcing mode
        cat_doc = await db.catalog_categories.find_one({"name": category})
        sourcing_mode = (cat_doc or {}).get("sourcing_mode", "preferred")

        if not assignments:
            unassigned.append({**item, "reason": f"No vendor assigned to {category}"})
            continue

        if sourcing_mode == "preferred":
            # Single source: use preferred vendor or first
            preferred = next((a for a in assignments if a.get("is_preferred")), assignments[0])
            vid = preferred.get("vendor_id", "")
            if vid not in vendor_groups:
                vendor_groups[vid] = {
                    "vendor_id": vid,
                    "vendor_name": preferred.get("vendor_name", ""),
                    "sourcing_mode": "single",
                    "items": [],
                    "needs_quote": False,
                }
            vendor_groups[vid]["items"].append(item)
        else:
            # Competitive: mark for quote request from all vendors
            for a in assignments:
                vid = a.get("vendor_id", "")
                if vid not in vendor_groups:
                    vendor_groups[vid] = {
                        "vendor_id": vid,
                        "vendor_name": a.get("vendor_name", ""),
                        "sourcing_mode": "competitive",
                        "items": [],
                        "needs_quote": True,
                    }
                vendor_groups[vid]["items"].append(item)

    return {
        "vendor_groups": list(vendor_groups.values()),
        "unassigned": unassigned,
        "total_vendors": len(vendor_groups),
    }
