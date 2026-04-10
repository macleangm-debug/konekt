"""
Admin Digest Routes
Preview and manually trigger the weekly operations digest.
"""
from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/admin/digest", tags=["Admin Digest"])


@router.get("/preview")
async def preview_digest(request: Request):
    """Preview the current weekly digest without delivering it."""
    from services.weekly_digest import generate_digest
    db = request.app.mongodb
    digest = await generate_digest(db)
    return digest


@router.post("/deliver")
async def trigger_digest(request: Request):
    """Manually trigger digest delivery (creates in-app notification)."""
    from services.weekly_digest import generate_digest, deliver_digest
    db = request.app.mongodb
    digest = await generate_digest(db)
    await deliver_digest(db, digest)
    return {"ok": True, "digest": digest}
