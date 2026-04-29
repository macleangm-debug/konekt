"""
Ops Impersonation polish — Session 4

Adds a PARTNER-token impersonation endpoint so Admin/Ops can step into a vendor's
partner portal (which is authed via the partner JWT, not the admin JWT).  Also
writes an audit log entry per impersonation so we can trace every session.

Endpoints
---------
POST /api/admin/impersonate-partner/{partner_id}
    Body (optional): { "reason": "..." }
    Returns {access_token, partner_user, partner, audit_id}

GET  /api/admin/impersonation-log
    Admin audit view.  Filter by partner_id / admin_id.
"""
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Header, Request
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import Optional
from uuid import uuid4
from bson import ObjectId
import os
import jwt

router = APIRouter(prefix="/api/admin", tags=["Impersonation"])

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ.get("DB_NAME", "konekt")]

PARTNER_SECRET = os.environ.get("PARTNER_JWT_SECRET", "konekt-partner-secret-2024")
ADMIN_SECRET = os.environ.get("JWT_SECRET", "konekt-secret-key-2024")
ALG = "HS256"


def _client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return (request.client.host if request.client else "") or ""


async def _assert_ops(request: Request) -> dict:
    """Decode admin JWT and ensure caller is admin or vendor_ops."""
    auth = request.headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authorization header required")
    token = auth.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, ADMIN_SECRET, algorithms=[ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    role = payload.get("role")
    if role not in ("admin", "vendor_ops", "ops"):
        raise HTTPException(status_code=403, detail="Only admin and operations can impersonate")
    return payload


class ImpersonatePayload(BaseModel):
    reason: Optional[str] = ""


@router.post("/impersonate-partner/{partner_id}")
async def impersonate_partner(partner_id: str, payload: ImpersonatePayload, request: Request):
    """Issue a partner JWT for the admin/ops caller to step into a vendor account."""
    admin = await _assert_ops(request)

    # Find partner record
    partner = None
    try:
        if len(partner_id) == 24:
            partner = await db.partners.find_one({"_id": ObjectId(partner_id)})
    except Exception:
        partner = None
    if not partner:
        partner = await db.partners.find_one({"id": partner_id})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")

    # Find an active partner_user to anchor the token on — prefer admin role, else any active user
    real_partner_id = str(partner.get("_id") or partner.get("id") or partner_id)
    partner_user = await db.partner_users.find_one(
        {"partner_id": real_partner_id, "status": "active", "role": "admin"},
    ) or await db.partner_users.find_one(
        {"partner_id": real_partner_id, "status": "active"},
    )
    if not partner_user:
        raise HTTPException(
            status_code=400,
            detail="This partner has no active users — create one via Vendor Onboarding before impersonating.",
        )

    now = datetime.now(timezone.utc)
    audit_id = str(uuid4())
    token_payload = {
        "sub": partner_user["email"],
        "partner_id": real_partner_id,
        "partner_user_id": str(partner_user.get("_id") or partner_user.get("id")),
        "role": "partner_user",
        "is_impersonation": True,
        "impersonator_id": admin.get("user_id") or admin.get("id") or admin.get("email") or "admin",
        "impersonator_role": admin.get("role"),
        "audit_id": audit_id,
        "iat": now,
        "exp": now + timedelta(hours=2),
    }
    token = jwt.encode(token_payload, PARTNER_SECRET, algorithm=ALG)

    # Audit log
    await db.impersonation_audit.insert_one({
        "id": audit_id,
        "started_at": now,
        "impersonator_id": admin.get("user_id") or admin.get("email") or "admin",
        "impersonator_email": admin.get("email", ""),
        "impersonator_role": admin.get("role", ""),
        "target_type": "partner",
        "target_id": real_partner_id,
        "target_name": partner.get("company_name") or partner.get("name") or "—",
        "reason": (payload.reason or "").strip(),
        "ip": _client_ip(request),
        "user_agent": request.headers.get("user-agent", "")[:250],
        "ended_at": None,
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "audit_id": audit_id,
        "partner": {
            "id": real_partner_id,
            "name": partner.get("company_name") or partner.get("name") or "—",
            "partner_type": partner.get("partner_type") or "vendor",
            "country_code": partner.get("country_code", ""),
        },
        "partner_user": {
            "email": partner_user.get("email"),
            "role": partner_user.get("role"),
        },
        "expires_in": 7200,
    }


@router.post("/impersonation-log/{audit_id}/end")
async def end_impersonation(audit_id: str, request: Request):
    """Called by the frontend banner's 'Return to Admin' button to close the audit session."""
    await _assert_ops(request)
    now = datetime.now(timezone.utc)
    res = await db.impersonation_audit.update_one(
        {"id": audit_id, "ended_at": None},
        {"$set": {"ended_at": now}},
    )
    return {"ok": res.modified_count > 0}


@router.get("/impersonation-log")
async def impersonation_log(
    request: Request,
    partner_id: Optional[str] = None,
    impersonator_id: Optional[str] = None,
    limit: int = 100,
):
    await _assert_ops(request)
    q = {}
    if partner_id:
        q["target_id"] = partner_id
    if impersonator_id:
        q["impersonator_id"] = impersonator_id
    docs = await db.impersonation_audit.find(q, {"_id": 0}).sort("started_at", -1).limit(min(limit, 500)).to_list(limit)
    # ISO-isoformat datetimes
    for d in docs:
        for k in ("started_at", "ended_at"):
            if isinstance(d.get(k), datetime):
                d[k] = d[k].isoformat()
        if d.get("started_at") and d.get("ended_at"):
            try:
                start = datetime.fromisoformat(d["started_at"])
                end = datetime.fromisoformat(d["ended_at"])
                d["duration_seconds"] = int((end - start).total_seconds())
            except Exception:
                pass
    return docs
