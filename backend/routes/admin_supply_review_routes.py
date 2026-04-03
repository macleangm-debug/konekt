"""
Admin Vendor Supply Review Routes
Admin endpoints for reviewing vendor product submissions and import jobs.
"""
import os
import logging
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient
import jwt

from services.product_upload_service import (
    list_all_submissions,
    review_submission,
    get_submission_by_id,
)
from services.product_import_service import list_all_import_jobs, get_import_job
from services.approved_product_publish_service import publish_approved_submission

logger = logging.getLogger("admin_supply_review_routes")

router = APIRouter(prefix="/api/admin/vendor-supply", tags=["admin-vendor-supply"])

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ.get("DB_NAME", "konekt")
JWT_SECRET = os.environ.get("JWT_SECRET", "konekt-secret-key-2024")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


async def _get_admin(authorization: str):
    """Verify admin JWT and return user."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Authorization required")
    token = authorization.replace("Bearer ", "").strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(401, "User not found")
        if user.get("role") not in ("admin", "sales", "marketing"):
            raise HTTPException(403, "Admin access required")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")


# ─── Submissions ──────────────────────────────────────────

@router.get("/submissions")
async def admin_list_submissions(
    status: Optional[str] = None,
    vendor_id: Optional[str] = None,
    authorization: Optional[str] = Header(None),
):
    """Admin: list all vendor product submissions with optional filters."""
    await _get_admin(authorization)
    return await list_all_submissions(db, status=status, vendor_id=vendor_id)


@router.get("/submissions/{submission_id}")
async def admin_get_submission(
    submission_id: str,
    authorization: Optional[str] = Header(None),
):
    """Admin: get a specific submission with full details."""
    await _get_admin(authorization)
    sub = await get_submission_by_id(db, submission_id)
    if not sub:
        raise HTTPException(404, "Submission not found")
    return sub


class ReviewIn(BaseModel):
    status: str  # approved, rejected, changes_requested
    notes: str = ""


@router.post("/submissions/{submission_id}/review")
async def admin_review_submission(
    submission_id: str,
    payload: ReviewIn,
    authorization: Optional[str] = Header(None),
):
    """Admin: approve/reject a vendor product submission."""
    admin = await _get_admin(authorization)
    reviewed_by = admin.get("full_name", admin.get("email", "admin"))

    if payload.status not in ("approved", "rejected", "changes_requested"):
        raise HTTPException(400, "Status must be: approved, rejected, or changes_requested")

    result = await review_submission(db, submission_id, payload.status, payload.notes, reviewed_by)
    if not result:
        raise HTTPException(404, "Submission not found")

    # Auto-publish to canonical products collection on approval
    published_product = None
    if payload.status == "approved":
        published_product = await publish_approved_submission(db, result, reviewed_by)

    return {"ok": True, "submission": result, "published_product": published_product}


# ─── Import Jobs ──────────────────────────────────────────

@router.get("/import-jobs")
async def admin_list_import_jobs(
    status: Optional[str] = None,
    authorization: Optional[str] = Header(None),
):
    """Admin: list all vendor import jobs."""
    await _get_admin(authorization)
    return await list_all_import_jobs(db, status=status)


@router.get("/import-jobs/{job_id}")
async def admin_get_import_job(
    job_id: str,
    authorization: Optional[str] = Header(None),
):
    """Admin: get full import job details."""
    await _get_admin(authorization)
    job = await get_import_job(db, job_id)
    if not job:
        raise HTTPException(404, "Import job not found")
    return job
