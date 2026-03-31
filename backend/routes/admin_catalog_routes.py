"""
Admin Catalog Management Routes
Admin endpoints for managing vendor submissions and publishing.
"""
from fastapi import APIRouter, HTTPException
import os
from motor.motor_asyncio import AsyncIOMotorClient
from services.vendor_product_submission_service import (
    list_submissions,
    update_submission_status,
)
from services.marketplace_publish_service import publish_from_submission

router = APIRouter(prefix="/api/admin/catalog", tags=["admin-catalog"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


@router.get("/submissions")
async def admin_list_submissions(status: str = None):
    """Admin lists all vendor submissions, optionally filtered by status."""
    return await list_submissions(db, status=status)


@router.get("/submissions/{submission_id}")
async def admin_get_submission(submission_id: str):
    """Admin gets a single submission."""
    doc = await db.vendor_product_submissions.find_one({"id": submission_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Submission not found")
    return doc


@router.post("/submissions/{submission_id}/approve")
async def admin_approve_submission(submission_id: str, payload: dict = None):
    """Admin approves a vendor submission and publishes to marketplace."""
    payload = payload or {}
    margin_percent = float(payload.get("margin_percent", 20.0))

    sub = await db.vendor_product_submissions.find_one({"id": submission_id}, {"_id": 0})
    if not sub:
        raise HTTPException(404, "Submission not found")
    if sub.get("review_status") == "approved":
        raise HTTPException(400, "Already approved")

    product = await publish_from_submission(db, submission_id, margin_percent=margin_percent)
    if not product:
        raise HTTPException(500, "Failed to publish product")

    return {"ok": True, "product": product}


@router.post("/submissions/{submission_id}/reject")
async def admin_reject_submission(submission_id: str, payload: dict = None):
    """Admin rejects a vendor submission."""
    payload = payload or {}
    notes = payload.get("notes", "Rejected by admin")
    doc = await update_submission_status(db, submission_id, "rejected", notes)
    if not doc:
        raise HTTPException(404, "Submission not found")
    return {"ok": True, "submission": doc}


@router.post("/submissions/{submission_id}/request-changes")
async def admin_request_changes(submission_id: str, payload: dict = None):
    """Admin requests changes from vendor."""
    payload = payload or {}
    notes = payload.get("notes", "Please update and resubmit")
    doc = await update_submission_status(db, submission_id, "changes_requested", notes)
    if not doc:
        raise HTTPException(404, "Submission not found")
    return {"ok": True, "submission": doc}
