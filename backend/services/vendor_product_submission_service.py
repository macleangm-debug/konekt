"""
Vendor Product Submission Service
Handles vendor product intake → admin review workflow.
"""
from datetime import datetime, timezone
from uuid import uuid4


def _now():
    return datetime.now(timezone.utc).isoformat()


async def create_submission(db, payload: dict, vendor_id: str, market_code: str = "TZ"):
    """Create a vendor product submission for admin review."""
    doc = {
        "id": str(uuid4()),
        "vendor_id": vendor_id,
        "vendor_name": payload.get("vendor_name", ""),
        "market_code": market_code,
        "product_name": payload.get("product_name", ""),
        "description": payload.get("description", ""),
        "base_cost": float(payload.get("base_cost", 0)),
        "currency_code": payload.get("currency_code", "TZS"),
        "visibility_mode": payload.get("visibility_mode", "request_quote"),
        "group_id": payload.get("group_id"),
        "category_id": payload.get("category_id"),
        "subcategory_id": payload.get("subcategory_id"),
        "image_url": payload.get("image_url", ""),
        "gallery_images": payload.get("gallery_images", []),
        "min_quantity": int(payload.get("min_quantity", 1)),
        "allocated_quantity": int(payload.get("allocated_quantity", 0)),
        "review_status": "pending",
        "review_notes": "",
        "approved_product_id": None,
        "created_at": _now(),
        "updated_at": _now(),
    }
    await db.vendor_product_submissions.insert_one(doc)
    doc.pop("_id", None)  # Remove MongoDB ObjectId before returning
    return doc


async def list_submissions(db, vendor_id: str = None, status: str = None):
    """List submissions, optionally filtered by vendor or status."""
    query = {}
    if vendor_id:
        query["vendor_id"] = vendor_id
    if status:
        query["review_status"] = status
    results = []
    async for doc in db.vendor_product_submissions.find(query, {"_id": 0}).sort("created_at", -1):
        results.append(doc)
    return results


async def update_submission_status(db, submission_id: str, status: str, notes: str = ""):
    """Admin updates submission status (approved, rejected, changes_requested)."""
    update = {
        "review_status": status,
        "review_notes": notes,
        "updated_at": _now(),
    }
    await db.vendor_product_submissions.update_one(
        {"id": submission_id},
        {"$set": update}
    )
    return await db.vendor_product_submissions.find_one({"id": submission_id}, {"_id": 0})
