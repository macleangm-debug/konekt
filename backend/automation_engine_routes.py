"""Automation Engine admin routes.

Owner: Settings Hub → Automation tab.
Surfaces config CRUD, manual run, performance dashboard, and the
"promote everything now" override.
"""
import os
import jwt as pyjwt
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient

from services.automation_engine_service import (
    load_config,
    save_config,
    run_promotion_pass,
    run_group_deal_pass,
    silent_finalize_expired_deals,
    compute_performance_dashboard,
    promote_everything,
)

JWT_SECRET = os.environ.get("JWT_SECRET", "konekt-secret-key-change-in-production")

mongo_url = os.environ["MONGO_URL"]
db_name = os.environ["DB_NAME"]
_client = AsyncIOMotorClient(mongo_url)
db = _client[db_name]

router = APIRouter(prefix="/api/admin/automation", tags=["Admin Automation Engine"])


async def _assert_admin(request: Request) -> dict:
    auth = request.headers.get("authorization") or ""
    if not auth.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Admin JWT required")
    try:
        payload = pyjwt.decode(auth.split(" ", 1)[1], JWT_SECRET, algorithms=["HS256"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    role = (payload.get("role") or "").lower()
    if not (payload.get("is_admin") or role in ("admin", "super_admin", "ops")):
        raise HTTPException(status_code=403, detail="Admin only")
    return payload


# ── Config ──────────────────────────────────────────────────
@router.get("/config")
async def get_automation_config(request: Request):
    await _assert_admin(request)
    return await load_config(db)


@router.put("/config")
async def update_automation_config(payload: dict, request: Request):
    await _assert_admin(request)
    return await save_config(db, payload or {})


# ── Manual run ──────────────────────────────────────────────
class RunOptions(BaseModel):
    promotions: bool = True
    group_deals: bool = True
    finalize_deals: bool = True
    dry_run: bool = False


@router.post("/run")
async def run_now(request: Request, opts: Optional[RunOptions] = None):
    await _assert_admin(request)
    opts = opts or RunOptions()
    report: dict = {}
    if opts.promotions:
        report["promotions"] = await run_promotion_pass(db, dry_run=opts.dry_run)
    if opts.group_deals:
        report["group_deals"] = await run_group_deal_pass(db, dry_run=opts.dry_run)
    if opts.finalize_deals and not opts.dry_run:
        report["finalize_deals"] = await silent_finalize_expired_deals(db)
    return report


# ── Performance ─────────────────────────────────────────────
@router.get("/performance")
async def performance_dashboard(request: Request, lookback_days: int = 30):
    await _assert_admin(request)
    return await compute_performance_dashboard(db, lookback_days=lookback_days)


# ── Promote everything override ─────────────────────────────
class PromoteEverythingPayload(BaseModel):
    discount_pct: float = 10.0
    duration_days: int = 3


@router.post("/promote-everything")
async def promote_everything_now(payload: PromoteEverythingPayload, request: Request):
    await _assert_admin(request)
    if not (1 <= payload.discount_pct <= 90):
        raise HTTPException(status_code=400, detail="discount_pct must be 1..90")
    if not (1 <= payload.duration_days <= 30):
        raise HTTPException(status_code=400, detail="duration_days must be 1..30")
    return await promote_everything(
        db, discount_pct=payload.discount_pct, duration_days=payload.duration_days
    )
