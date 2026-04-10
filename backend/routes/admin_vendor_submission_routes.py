"""
Admin Vendor Submission Review Routes
Admin endpoints for reviewing, approving, rejecting vendor product submissions.
Includes bulk actions.
"""
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from services.vendor_product_submission_service import list_submissions, update_submission_status

router = APIRouter(prefix="/api/admin/vendor-submissions", tags=["Admin Vendor Submissions"])


class ReviewAction(BaseModel):
    notes: Optional[str] = ""
    customer_price: Optional[float] = None
    publish: bool = False


class BulkAction(BaseModel):
    ids: List[str]
    notes: Optional[str] = ""
    publish: bool = False


@router.get("/stats")
async def submission_stats(request: Request):
    """Get submission review stats."""
    db = request.app.mongodb
    pipeline = [
        {"$group": {"_id": "$review_status", "count": {"$sum": 1}}}
    ]
    counts = {}
    async for row in db.vendor_product_submissions.aggregate(pipeline):
        counts[row["_id"] or "unknown"] = row["count"]

    total = sum(counts.values())
    return {
        "total": total,
        "pending": counts.get("pending", 0),
        "approved": counts.get("approved", 0),
        "rejected": counts.get("rejected", 0),
        "changes_requested": counts.get("changes_requested", 0),
    }


@router.get("")
async def list_all_submissions(
    request: Request,
    status: Optional[str] = None,
    vendor_id: Optional[str] = None,
):
    """List all vendor product submissions for admin review."""
    db = request.app.mongodb
    query = {}
    if status:
        query["review_status"] = status
    if vendor_id:
        query["vendor_id"] = vendor_id

    subs = []
    async for doc in db.vendor_product_submissions.find(query, {"_id": 0}).sort("created_at", -1):
        # Enrich with vendor name
        if doc.get("vendor_id") and doc["vendor_id"] != "unknown":
            vendor = await db.users.find_one({"id": doc["vendor_id"]}, {"_id": 0, "name": 1, "email": 1})
            if vendor:
                doc["vendor_name"] = vendor.get("name", vendor.get("email", ""))
            else:
                partner = await db.partners.find_one({"id": doc["vendor_id"]}, {"_id": 0, "name": 1})
                doc["vendor_name"] = partner.get("name", "") if partner else ""
        # Enrich with taxonomy names
        if doc.get("group_id"):
            grp = await db.product_groups.find_one({"id": doc["group_id"]}, {"_id": 0, "name": 1})
            doc["group_name"] = grp.get("name", "") if grp else ""
        if doc.get("category_id"):
            cat = await db.catalog_categories.find_one({"id": doc["category_id"]}, {"_id": 0, "name": 1})
            doc["category_name"] = cat.get("name", "") if cat else ""

        subs.append(doc)
    return subs


@router.get("/{submission_id}")
async def get_submission(submission_id: str, request: Request):
    """Get a single submission detail."""
    db = request.app.mongodb
    doc = await db.vendor_product_submissions.find_one({"id": submission_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Submission not found")
    return doc


@router.post("/{submission_id}/approve")
async def approve_submission(submission_id: str, body: ReviewAction, request: Request):
    """Approve a vendor product submission and create a catalog product."""
    db = request.app.mongodb
    sub = await db.vendor_product_submissions.find_one({"id": submission_id}, {"_id": 0})
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    if sub.get("review_status") == "approved":
        raise HTTPException(status_code=400, detail="Already approved")

    now = datetime.now(timezone.utc).isoformat()

    # Create a product in the catalog
    product_doc = {
        "name": sub.get("product_name", ""),
        "description": sub.get("description", ""),
        "base_price": float(sub.get("base_cost", 0)),
        "category": sub.get("category_name") or sub.get("category_id") or "",
        "group_id": sub.get("group_id"),
        "category_id": sub.get("category_id"),
        "subcategory_id": sub.get("subcategory_id"),
        "vendor_id": sub.get("vendor_id"),
        "source": "vendor_submission",
        "submission_id": submission_id,
        "currency": sub.get("currency_code", "TZS"),
        "min_quantity": sub.get("min_quantity", 1),
        "image_url": sub.get("image_url", ""),
        "is_active": body.publish,
        "status": "published" if body.publish else "approved",
        "visibility_mode": sub.get("visibility_mode", "request_quote"),
        "created_at": now,
        "updated_at": now,
    }
    if body.customer_price is not None:
        product_doc["customer_price"] = body.customer_price

    result = await db.products.insert_one(product_doc)
    product_id = str(result.inserted_id)

    # Update submission status
    await db.vendor_product_submissions.update_one(
        {"id": submission_id},
        {"$set": {
            "review_status": "approved",
            "review_notes": body.notes or "",
            "approved_product_id": product_id,
            "reviewed_at": now,
            "updated_at": now,
        }}
    )

    # Notify vendor
    await _notify_vendor(db, sub.get("vendor_id"), submission_id, "approved", sub.get("product_name", ""))

    return {"ok": True, "product_id": product_id}


@router.post("/{submission_id}/reject")
async def reject_submission(submission_id: str, body: ReviewAction, request: Request):
    """Reject a vendor product submission."""
    db = request.app.mongodb
    sub = await db.vendor_product_submissions.find_one({"id": submission_id}, {"_id": 0})
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    now = datetime.now(timezone.utc).isoformat()
    await db.vendor_product_submissions.update_one(
        {"id": submission_id},
        {"$set": {
            "review_status": "rejected",
            "review_notes": body.notes or "",
            "reviewed_at": now,
            "updated_at": now,
        }}
    )

    await _notify_vendor(db, sub.get("vendor_id"), submission_id, "rejected", sub.get("product_name", ""))
    return {"ok": True}


@router.post("/bulk-approve")
async def bulk_approve(body: BulkAction, request: Request):
    """Bulk approve multiple submissions."""
    db = request.app.mongodb
    now = datetime.now(timezone.utc).isoformat()
    approved = 0
    errors = []

    for sid in body.ids:
        sub = await db.vendor_product_submissions.find_one({"id": sid}, {"_id": 0})
        if not sub:
            errors.append(f"{sid}: not found")
            continue
        if sub.get("review_status") == "approved":
            errors.append(f"{sid}: already approved")
            continue

        # Create product
        product_doc = {
            "name": sub.get("product_name", ""),
            "description": sub.get("description", ""),
            "base_price": float(sub.get("base_cost", 0)),
            "category": sub.get("category_name") or sub.get("category_id") or "",
            "group_id": sub.get("group_id"),
            "category_id": sub.get("category_id"),
            "subcategory_id": sub.get("subcategory_id"),
            "vendor_id": sub.get("vendor_id"),
            "source": "vendor_submission",
            "submission_id": sid,
            "currency": sub.get("currency_code", "TZS"),
            "min_quantity": sub.get("min_quantity", 1),
            "image_url": sub.get("image_url", ""),
            "is_active": body.publish,
            "status": "published" if body.publish else "approved",
            "visibility_mode": sub.get("visibility_mode", "request_quote"),
            "created_at": now,
            "updated_at": now,
        }
        result = await db.products.insert_one(product_doc)

        await db.vendor_product_submissions.update_one(
            {"id": sid},
            {"$set": {
                "review_status": "approved",
                "review_notes": body.notes or "",
                "approved_product_id": str(result.inserted_id),
                "reviewed_at": now,
                "updated_at": now,
            }}
        )
        approved += 1
        await _notify_vendor(db, sub.get("vendor_id"), sid, "approved", sub.get("product_name", ""))

    return {"ok": True, "approved": approved, "errors": errors}


@router.post("/bulk-reject")
async def bulk_reject(body: BulkAction, request: Request):
    """Bulk reject multiple submissions."""
    db = request.app.mongodb
    now = datetime.now(timezone.utc).isoformat()
    rejected = 0
    errors = []

    for sid in body.ids:
        sub = await db.vendor_product_submissions.find_one({"id": sid}, {"_id": 0})
        if not sub:
            errors.append(f"{sid}: not found")
            continue
        if sub.get("review_status") == "rejected":
            errors.append(f"{sid}: already rejected")
            continue

        await db.vendor_product_submissions.update_one(
            {"id": sid},
            {"$set": {
                "review_status": "rejected",
                "review_notes": body.notes or "",
                "reviewed_at": now,
                "updated_at": now,
            }}
        )
        rejected += 1
        await _notify_vendor(db, sub.get("vendor_id"), sid, "rejected", sub.get("product_name", ""))

    return {"ok": True, "rejected": rejected, "errors": errors}


async def _notify_vendor(db, vendor_id: str, submission_id: str, status: str, product_name: str):
    """Create a notification for the vendor about their submission."""
    if not vendor_id or vendor_id == "unknown":
        return
    now = datetime.now(timezone.utc).isoformat()
    title = f"Product {'Approved' if status == 'approved' else 'Rejected'}"
    message = f'Your product "{product_name}" has been {status} by admin.'
    await db.notifications.insert_one({
        "user_id": vendor_id,
        "notification_type": f"product_submission_{status}",
        "entity_id": submission_id,
        "title": title,
        "message": message,
        "target_url": "/vendor/product-submissions" if status == "rejected" else "/vendor/product-submissions",
        "is_read": False,
        "priority": "normal",
        "created_at": now,
    })
