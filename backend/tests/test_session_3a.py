"""
Regression tests for Session 3A — Vendor Payables + QR Codes
Run with: pytest /app/backend/tests/test_session_3a.py
"""
import os
import pytest
import httpx
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

API_URL = os.environ.get("REACT_APP_BACKEND_URL") or "http://localhost:8001"
MONGO = os.environ["MONGO_URL"]
DB = os.environ["DB_NAME"]
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PW = "KnktcKk_L-hw1wSyquvd!"


def admin_token():
    r = httpx.post(f"{API_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PW}, timeout=20)
    assert r.status_code == 200
    d = r.json()
    return d.get("token") or d.get("access_token")


def test_qr_info_all_kinds():
    for kind in ["product", "group_deal", "promo_campaign", "content_post"]:
        r = httpx.get(f"{API_URL}/api/qr/{kind}/test-id-123", timeout=20)
        assert r.status_code == 200
        j = r.json()
        assert j["kind"] == kind
        assert j["qr_image_url"].endswith(".png")


def test_qr_image_png():
    r = httpx.get(f"{API_URL}/api/qr/product/abc.png", timeout=20)
    assert r.status_code == 200
    assert r.headers["content-type"] == "image/png"
    assert len(r.content) > 200


def test_qr_invalid_kind():
    r = httpx.get(f"{API_URL}/api/qr/bogus/xyz", timeout=20)
    assert r.status_code == 404


def test_payables_stats_reachable():
    tok = admin_token()
    r = httpx.get(f"{API_URL}/api/admin/vendor-payables/stats",
                  headers={"Authorization": f"Bearer {tok}"}, timeout=20)
    assert r.status_code == 200
    j = r.json()
    for k in ("orders_outstanding", "total_outstanding", "pending_modality_requests"):
        assert k in j


def test_payables_ledger_reachable():
    tok = admin_token()
    r = httpx.get(f"{API_URL}/api/admin/vendor-payables/ledger",
                  headers={"Authorization": f"Bearer {tok}"}, timeout=20)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_statements_generate_and_list():
    tok = admin_token()
    r = httpx.post(f"{API_URL}/api/admin/vendor-payables/statements/generate",
                   headers={"Authorization": f"Bearer {tok}"}, timeout=20)
    assert r.status_code == 200
    assert r.json()["ok"] is True

    r = httpx.get(f"{API_URL}/api/admin/vendor-payables/statements",
                  headers={"Authorization": f"Bearer {tok}"}, timeout=20)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


@pytest.mark.asyncio
async def test_set_modality_and_read_back():
    """End-to-end: change modality on a real partner, verify via stats."""
    cli = AsyncIOMotorClient(MONGO)
    db = cli[DB]
    p = await db.partners.find_one({"partner_type": "product"}, {"_id": 1})
    if not p:
        pytest.skip("no product partner in db")
    pid = str(p["_id"])

    tok = admin_token()
    r = httpx.post(
        f"{API_URL}/api/admin/vendor-payables/vendors/{pid}/modality",
        headers={"Authorization": f"Bearer {tok}"}, json={"modality": "monthly_statement"}, timeout=20,
    )
    assert r.status_code == 200
    assert r.json()["modality"] == "monthly_statement"

    # Verify stored
    p2 = await db.partners.find_one({"_id": ObjectId(pid)}, {"payment_modality": 1})
    assert p2.get("payment_modality") == "monthly_statement"

    # Reset
    r = httpx.post(
        f"{API_URL}/api/admin/vendor-payables/vendors/{pid}/modality",
        headers={"Authorization": f"Bearer {tok}"}, json={"modality": "pay_per_order"}, timeout=20,
    )
    assert r.status_code == 200
