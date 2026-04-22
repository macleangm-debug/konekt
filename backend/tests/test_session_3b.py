"""
Regression tests for Session 3B — AI-Assisted Smart Import.

These tests cover validation, auth, session persistence, and commit compatibility.
A live LLM call is included at the end but SKIPPED if no EMERGENT_LLM_KEY is set,
so the suite stays runnable in CI.
"""
import io
import os
import json
import pytest
import httpx
from motor.motor_asyncio import AsyncIOMotorClient

API_URL = os.environ.get("REACT_APP_BACKEND_URL") or "http://localhost:8001"
MONGO = os.environ["MONGO_URL"]
DB = os.environ["DB_NAME"]
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PW = "KnktcKk_L-hw1wSyquvd!"


_cached_token = None
def _admin_token():
    global _cached_token
    if _cached_token:
        return _cached_token
    r = httpx.post(f"{API_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PW}, timeout=20)
    assert r.status_code == 200, r.text
    d = r.json()
    _cached_token = d.get("token") or d.get("access_token")
    return _cached_token


def test_ai_parse_requires_auth():
    r = httpx.post(f"{API_URL}/api/smart-import/ai-parse",
                   data={"source": "text", "text": "foo"}, timeout=20)
    assert r.status_code == 401


def test_ai_parse_invalid_source():
    r = httpx.post(
        f"{API_URL}/api/smart-import/ai-parse",
        data={"source": "bogus", "text": "foo"},
        headers={"Authorization": f"Bearer {_admin_token()}"}, timeout=20,
    )
    assert r.status_code == 400
    assert "source" in r.json()["detail"].lower()


def test_ai_parse_text_required():
    r = httpx.post(
        f"{API_URL}/api/smart-import/ai-parse",
        data={"source": "text"},  # no text
        headers={"Authorization": f"Bearer {_admin_token()}"}, timeout=20,
    )
    assert r.status_code == 400


def test_ai_parse_file_required_for_pdf():
    r = httpx.post(
        f"{API_URL}/api/smart-import/ai-parse",
        data={"source": "pdf"},  # no file
        headers={"Authorization": f"Bearer {_admin_token()}"}, timeout=20,
    )
    assert r.status_code == 400


def test_ai_parse_photos_required_for_photos_mode():
    r = httpx.post(
        f"{API_URL}/api/smart-import/ai-parse",
        data={"source": "photos"},
        headers={"Authorization": f"Bearer {_admin_token()}"}, timeout=20,
    )
    assert r.status_code == 400


@pytest.mark.skipif(not os.environ.get("EMERGENT_LLM_KEY"), reason="LLM key not set")
def test_ai_parse_text_live_extracts_and_returns_session():
    sample = (
        "Printer Cartridge HP 912 Black | SKU HP-912-BLK | INK | 48000 TSH | 8 pcs | HP\n"
        "Stapler Pilot 10 | SKU STP-PIL-10 | STATIONERY | 6500 | 35 pcs | Pilot\n"
    )
    r = httpx.post(
        f"{API_URL}/api/smart-import/ai-parse",
        data={"source": "text", "text": sample, "target": "partner_catalog", "country_code": "TZ"},
        headers={"Authorization": f"Bearer {_admin_token()}"}, timeout=90,
    )
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["source"] == "ai"
    assert j["ai_source_kind"] == "text"
    assert j["total_rows"] >= 1
    assert "session_id" in j
    # auto_map should be identity for canonical columns
    assert j["auto_map"]["name"] == "name"
    assert j["auto_map"]["vendor_sku"] == "vendor_sku"
    # Sample rows should have normalised fields
    row = j["sample"][0]
    assert "name" in row and row["name"]


@pytest.mark.asyncio
@pytest.mark.skipif(not os.environ.get("EMERGENT_LLM_KEY"), reason="LLM key not set")
async def test_ai_session_persisted_in_mongo_for_commit():
    sample = "Eco Notebook A5 | SKU NB-A5-ECO | STATIONERY | 3500 | 100 pcs | Generic"
    r = httpx.post(
        f"{API_URL}/api/smart-import/ai-parse",
        data={"source": "text", "text": sample, "target": "partner_catalog", "country_code": "TZ"},
        headers={"Authorization": f"Bearer {_admin_token()}"}, timeout=90,
    )
    assert r.status_code == 200
    sid = r.json()["session_id"]
    cli = AsyncIOMotorClient(MONGO)
    db = cli[DB]
    doc = await db.smart_import_sessions.find_one({"id": sid}, {"_id": 0})
    assert doc is not None
    assert doc["source"] == "ai"
    rows = json.loads(doc["rows_json"])
    assert len(rows) >= 1
    assert rows[0]["name"]


def test_ai_parse_text_oversize_rejected():
    big = "x" * 210_000
    r = httpx.post(
        f"{API_URL}/api/smart-import/ai-parse",
        data={"source": "text", "text": big},
        headers={"Authorization": f"Bearer {_admin_token()}"}, timeout=30,
    )
    assert r.status_code == 413
