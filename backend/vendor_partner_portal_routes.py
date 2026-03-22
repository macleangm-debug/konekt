from datetime import datetime
from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/partner/vendor", tags=["Vendor Partner Portal"])

def serialize(doc):
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc

@router.get("/jobs")
async def vendor_jobs(request: Request):
    db = request.app.mongodb
    user = getattr(request.state, "user", None)
    vendor_id = str((user or {}).get("_id")) if (user or {}).get("_id") else None
    rows = await db.vendor_jobs.find({"vendor_user_id": vendor_id}).sort("created_at", -1).to_list(length=500)
    return [serialize(x) for x in rows]

@router.post("/jobs/{job_id}/progress")
async def update_vendor_progress(job_id: str, payload: dict, request: Request):
    db = request.app.mongodb
    await db.vendor_jobs.update_one(
        {"job_id": job_id},
        {"$set": {
            "internal_status": payload.get("internal_status", "in_progress"),
            "progress_note": payload.get("progress_note", ""),
            "updated_at": datetime.utcnow(),
        }},
        upsert=False,
    )
    return {"ok": True}

@router.get("/performance")
async def vendor_performance(request: Request):
    db = request.app.mongodb
    user = getattr(request.state, "user", None)
    vendor_id = str((user or {}).get("_id")) if (user or {}).get("_id") else None
    rows = await db.vendor_jobs.find({"vendor_user_id": vendor_id}).to_list(length=1000)
    total = len(rows)
    completed = len([x for x in rows if x.get("internal_status") == "completed"])
    completion_rate = round((completed / total) * 100.0, 2) if total else 0
    avg_quality_score = round(sum(float(x.get("quality_score", 0) or 0) for x in rows) / total, 2) if total else 0
    return {
        "total_jobs": total,
        "completed_jobs": completed,
        "completion_rate": completion_rate,
        "avg_quality_score": avg_quality_score,
    }
