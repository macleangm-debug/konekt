"""
Regression tests for Session 4 — Vendor Agreement + Ops Impersonation.
"""
import os
import pytest
import httpx
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

API_URL = os.environ.get("REACT_APP_BACKEND_URL") or "http://localhost:8001"
MONGO = os.environ["MONGO_URL"]
DB = os.environ["DB_NAME"]
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PW = "KnktcKk_L-hw1wSyquvd!"


_cached_token = None
def admin_token():
    global _cached_token
    if _cached_token:
        return _cached_token
    r = httpx.post(f"{API_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PW}, timeout=20)
    assert r.status_code == 200, r.text
    d = r.json()
    _cached_token = d.get("token") or d.get("access_token")
    return _cached_token


# ───────── Vendor Agreement (admin side) ─────────

def test_agreement_admin_stats_and_list():
    tok = admin_token()
    h = {"Authorization": f"Bearer {tok}"}
    r = httpx.get(f"{API_URL}/api/admin/vendor-agreements/stats", headers=h, timeout=20)
    assert r.status_code == 200
    d = r.json()
    for k in ("total_vendors", "signed_current_version", "current_version", "coverage_pct"):
        assert k in d
    r = httpx.get(f"{API_URL}/api/admin/vendor-agreements", headers=h, timeout=20)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_agreement_vendor_endpoints_require_partner_token():
    for path in ("/api/vendor/agreement/template", "/api/vendor/agreement/status", "/api/vendor/agreement/history"):
        r = httpx.get(f"{API_URL}{path}", timeout=15)
        assert r.status_code in (401, 403)
    # Admin JWT is NOT valid for partner endpoints
    h = {"Authorization": f"Bearer {admin_token()}"}
    r = httpx.get(f"{API_URL}/api/vendor/agreement/status", headers=h, timeout=15)
    assert r.status_code in (401, 403)


# ───────── Impersonation ─────────

def _partner_id_with_active_user():
    import asyncio
    async def _g():
        cli = AsyncIOMotorClient(MONGO)
        db = cli[DB]
        u = await db.partner_users.find_one({"status": "active"})
        return u["partner_id"] if u else None
    return asyncio.get_event_loop().run_until_complete(_g()) if False else asyncio.run(_g())


def test_impersonate_requires_ops_role():
    r = httpx.post(f"{API_URL}/api/admin/impersonate-partner/anything", json={"reason": "x"}, timeout=15)
    assert r.status_code == 401


def test_impersonate_unknown_partner_404():
    h = {"Authorization": f"Bearer {admin_token()}"}
    r = httpx.post(f"{API_URL}/api/admin/impersonate-partner/000000000000000000000000",
                   headers=h, json={"reason": "test"}, timeout=15)
    assert r.status_code == 404


def test_impersonate_happy_path_issues_partner_token_and_audits():
    pid = _partner_id_with_active_user()
    if not pid:
        pytest.skip("no active partner_user in db")
    h = {"Authorization": f"Bearer {admin_token()}"}
    r = httpx.post(f"{API_URL}/api/admin/impersonate-partner/{pid}", headers=h,
                   json={"reason": "QA impersonation test"}, timeout=15)
    assert r.status_code == 200
    j = r.json()
    assert j["access_token"]
    assert j["audit_id"]
    assert j["partner"]["id"] == pid

    # Partner token must auth against /api/vendor/agreement/status
    p_h = {"Authorization": f"Bearer {j['access_token']}"}
    r = httpx.get(f"{API_URL}/api/vendor/agreement/status", headers=p_h, timeout=15)
    assert r.status_code == 200
    assert "signed" in r.json()

    # Log shows the session
    r = httpx.get(f"{API_URL}/api/admin/impersonation-log", headers=h, timeout=15)
    assert r.status_code == 200
    entries = r.json()
    assert any(e["id"] == j["audit_id"] for e in entries)

    # End the session
    r = httpx.post(f"{API_URL}/api/admin/impersonation-log/{j['audit_id']}/end", headers=h, timeout=15)
    assert r.status_code == 200


# ───────── Agreement full sign flow (live partner via impersonation) ─────────

def _fresh_partner_token():
    pid = _partner_id_with_active_user()
    if not pid:
        return None
    h = {"Authorization": f"Bearer {admin_token()}"}
    r = httpx.post(f"{API_URL}/api/admin/impersonate-partner/{pid}", headers=h,
                   json={"reason": "agreement-test"}, timeout=15)
    if r.status_code != 200:
        return None
    return r.json()["access_token"]


def test_agreement_sign_validates_and_prevents_double_sign():
    import asyncio
    tok = _fresh_partner_token()
    if not tok:
        pytest.skip("cannot get partner token")
    h = {"Authorization": f"Bearer {tok}"}

    # Wipe prior agreement for a clean run
    async def _wipe():
        cli = AsyncIOMotorClient(MONGO)
        db = cli[DB]
        # find current partner_id from token
        import jwt, os
        pay = jwt.decode(tok, os.environ.get("PARTNER_JWT_SECRET", "konekt-partner-secret-2024"), algorithms=["HS256"])
        await db.vendor_agreements.delete_many({"vendor_id": pay["partner_id"]})
    asyncio.run(_wipe())

    # Must 'agreed'
    r = httpx.post(f"{API_URL}/api/vendor/agreement/sign", headers=h, timeout=20, json={
        "vendor_legal_name": "Test Co", "vendor_address": "x", "signatory_name": "John Doe",
        "signatory_title": "CEO", "signatory_email": "j@t.co", "signature_text": "John Doe", "agreed": False,
    })
    assert r.status_code == 400

    # Signature must match
    r = httpx.post(f"{API_URL}/api/vendor/agreement/sign", headers=h, timeout=20, json={
        "vendor_legal_name": "Test Co", "vendor_address": "x", "signatory_name": "John Doe",
        "signatory_title": "CEO", "signatory_email": "j@t.co", "signature_text": "Janet", "agreed": True,
    })
    assert r.status_code == 400

    # Happy sign
    r = httpx.post(f"{API_URL}/api/vendor/agreement/sign", headers=h, timeout=30, json={
        "vendor_legal_name": "Test Co", "vendor_address": "Dar es Salaam", "vendor_phone": "+255700",
        "signatory_name": "John Doe", "signatory_title": "CEO", "signatory_email": "j@t.co",
        "signature_text": "John Doe", "agreed": True,
    })
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["ok"] and d["id"] and d["pdf_url"].endswith(".pdf")

    # Status reflects signed
    r = httpx.get(f"{API_URL}/api/vendor/agreement/status", headers=h, timeout=15)
    assert r.status_code == 200
    assert r.json()["signed"] is True

    # Double-sign blocked
    r = httpx.post(f"{API_URL}/api/vendor/agreement/sign", headers=h, timeout=20, json={
        "vendor_legal_name": "Test Co", "vendor_address": "Dar", "signatory_name": "John Doe",
        "signatory_title": "CEO", "signatory_email": "j@t.co", "signature_text": "John Doe", "agreed": True,
    })
    assert r.status_code == 400
    assert "already signed" in r.json()["detail"].lower()

    # History returns at least one
    r = httpx.get(f"{API_URL}/api/vendor/agreement/history", headers=h, timeout=15)
    assert r.status_code == 200 and len(r.json()) >= 1
