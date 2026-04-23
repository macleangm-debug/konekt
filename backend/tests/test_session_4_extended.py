"""
Extended coverage for Session 4 — Vendor Agreement + Ops Impersonation.

Focuses on edge cases not covered by test_session_4.py:
  • Vendor-agreement field validation (each required field enforced)
  • Agreement template endpoint shape (8 clauses, version, prefill keys)
  • Static PDF reachability under /uploads/vendor_agreements/
  • Admin list enrichment + stats coverage %
  • Impersonation: IP capture + duration calculation + admin projection
  • Impersonation input validation (partner with no active partner_users → 400)
  • Admin nav config entries for the new Session-4 pages
"""
import os
import re
import time
import pytest
import httpx
import asyncio
import jwt
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

API_URL = os.environ.get("REACT_APP_BACKEND_URL") or "http://localhost:8001"
MONGO = os.environ["MONGO_URL"]
DB = os.environ["DB_NAME"]
PARTNER_SECRET = os.environ.get("PARTNER_JWT_SECRET", "konekt-partner-secret-2024")
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PW = "KnktcKk_L-hw1wSyquvd!"


# ───────────────────── token caches (avoid brute-force lockout) ─────────────────────

_admin_cache = {"tok": None}


def admin_token():
    if _admin_cache["tok"]:
        return _admin_cache["tok"]
    r = httpx.post(f"{API_URL}/api/auth/login",
                   json={"email": ADMIN_EMAIL, "password": ADMIN_PW}, timeout=20)
    assert r.status_code == 200, r.text
    d = r.json()
    _admin_cache["tok"] = d.get("token") or d.get("access_token")
    return _admin_cache["tok"]


def admin_headers():
    return {"Authorization": f"Bearer {admin_token()}"}


def _active_partner_id():
    async def _g():
        cli = AsyncIOMotorClient(MONGO)
        db = cli[DB]
        u = await db.partner_users.find_one({"status": "active"})
        return u["partner_id"] if u else None
    return asyncio.run(_g())


_partner_cache = {"tok": None, "audit_id": None, "partner_id": None}


def fresh_partner_token(reason="extended-tests"):
    """Impersonate and cache one partner token for the duration of the test run."""
    if _partner_cache["tok"]:
        return _partner_cache["tok"]
    pid = _active_partner_id()
    if not pid:
        return None
    r = httpx.post(
        f"{API_URL}/api/admin/impersonate-partner/{pid}",
        headers=admin_headers(),
        json={"reason": reason},
        timeout=15,
    )
    if r.status_code != 200:
        return None
    j = r.json()
    _partner_cache["tok"] = j["access_token"]
    _partner_cache["audit_id"] = j["audit_id"]
    _partner_cache["partner_id"] = j["partner"]["id"]
    return _partner_cache["tok"]


def partner_headers():
    t = fresh_partner_token()
    return {"Authorization": f"Bearer {t}"} if t else None


# ════════════════════════════════════════════
# Agreement — template, field validation
# ════════════════════════════════════════════

class TestAgreementTemplate:
    def test_template_has_version_and_eight_clauses(self):
        h = partner_headers()
        if not h:
            pytest.skip("no active partner_user")
        r = httpx.get(f"{API_URL}/api/vendor/agreement/template", headers=h, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["version"] and re.match(r"^\d+\.\d+$", d["version"])
        tpl = d["template"]
        assert tpl["title"] and "KONEKT" in tpl["title"].upper()
        assert isinstance(tpl["clauses"], list) and len(tpl["clauses"]) == 8
        for c in tpl["clauses"]:
            assert c.get("heading") and c.get("body")
        # Prefill keys must be present (values may be empty)
        for k in ("vendor_legal_name", "vendor_address", "vendor_phone",
                  "signatory_email", "signatory_name"):
            assert k in d["prefill"]

    def test_status_has_required_fields(self):
        h = partner_headers()
        if not h:
            pytest.skip("no active partner_user")
        r = httpx.get(f"{API_URL}/api/vendor/agreement/status", headers=h, timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("signed", "required_version", "record"):
            assert k in d
        assert d["required_version"]


class TestAgreementFieldValidation:
    """Every required field must be enforced; signature match case-insensitive."""

    def _wipe_partner_agreements(self, h):
        # Decode token to find partner_id
        tok = h["Authorization"].split(" ", 1)[1]
        p = jwt.decode(tok, PARTNER_SECRET, algorithms=["HS256"])

        async def _w():
            cli = AsyncIOMotorClient(MONGO)
            db = cli[DB]
            await db.vendor_agreements.delete_many({"vendor_id": p["partner_id"]})
        asyncio.run(_w())

    def _base_payload(self):
        return {
            "vendor_legal_name": "Edge Co",
            "vendor_address": "Dar es Salaam",
            "signatory_name": "Jane Smith",
            "signatory_title": "CEO",
            "signatory_email": "jane@edge.co",
            "signature_text": "Jane Smith",
            "agreed": True,
        }

    # NOTE: 'signatory_name' is intentionally excluded — if it is blank, the
    # signature-match check (step 3 in /sign) fires before the required-field
    # loop, so the field-level message is unreachable.  The sign endpoint still
    # rejects the request with 400 (verified by test_signature_mismatch path).
    @pytest.mark.parametrize("field", [
        "vendor_legal_name", "vendor_address",
        "signatory_title", "signatory_email",
    ])
    def test_missing_required_field_returns_400(self, field):
        h = partner_headers()
        if not h:
            pytest.skip("no partner token")
        self._wipe_partner_agreements(h)
        p = self._base_payload()
        p[field] = "   "  # blank
        r = httpx.post(f"{API_URL}/api/vendor/agreement/sign", headers=h, json=p, timeout=20)
        assert r.status_code == 400, f"{field} -> {r.status_code} {r.text}"
        assert field.replace("_", " ").lower() in r.json()["detail"].lower()

    def test_empty_signature_text_400(self):
        h = partner_headers()
        if not h:
            pytest.skip("no partner token")
        self._wipe_partner_agreements(h)
        p = self._base_payload()
        p["signature_text"] = "   "
        r = httpx.post(f"{API_URL}/api/vendor/agreement/sign", headers=h, json=p, timeout=20)
        assert r.status_code == 400
        assert "signature" in r.json()["detail"].lower()

    def test_signature_match_is_case_sensitive(self):
        """After fix: typed signature must match signatory_name EXACTLY (case-sensitive)."""
        h = partner_headers()
        if not h:
            pytest.skip("no partner token")
        self._wipe_partner_agreements(h)
        p = self._base_payload()
        p["signature_text"] = "jane smith"  # lower-case
        p["signatory_name"] = "JANE SMITH"  # upper-case → mismatch
        r = httpx.post(f"{API_URL}/api/vendor/agreement/sign", headers=h, json=p, timeout=30)
        assert r.status_code == 400
        assert "match" in r.json()["detail"].lower()

    def test_sign_persists_ip_and_writes_pdf_on_disk(self):
        h = partner_headers()
        if not h:
            pytest.skip("no partner token")
        self._wipe_partner_agreements(h)
        p = self._base_payload()
        r = httpx.post(
            f"{API_URL}/api/vendor/agreement/sign",
            headers={**h, "X-Forwarded-For": "203.0.113.42, 10.0.0.1"},
            json=p,
            timeout=30,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        # After the public-URL fix, pdf_url is an /api/* path (auth-gated)
        assert d["pdf_url"].startswith("/api/vendor/agreement/pdf/")

        # PDF file written to disk at the documented absolute path
        async def _chk():
            cli = AsyncIOMotorClient(MONGO)
            db = cli[DB]
            doc = await db.vendor_agreements.find_one({"id": d["id"]})
            return doc
        doc = asyncio.run(_chk())
        assert doc is not None
        pdf_path = Path("/app/uploads/vendor_agreements") / f"{doc['vendor_id']}_{d['id']}.pdf"
        assert pdf_path.exists(), f"PDF not written at {pdf_path}"
        assert pdf_path.stat().st_size > 1000
        assert pdf_path.read_bytes()[:4] == b"%PDF"

        # IP captured from X-Forwarded-For
        assert doc["signed_ip"].startswith("203.0.113.42")
        assert doc["version"]

    def test_signed_pdf_is_reachable_via_public_url(self):
        """Advertised pdf_url must be fetchable by the authenticated vendor client."""
        h = partner_headers()
        if not h:
            pytest.skip("no partner token")
        self._wipe_partner_agreements(h)
        r = httpx.post(f"{API_URL}/api/vendor/agreement/sign", headers=h,
                       json=self._base_payload(), timeout=30)
        assert r.status_code == 200
        pdf_url = r.json()["pdf_url"]

        # With partner auth
        pdf = httpx.get(f"{API_URL}{pdf_url}", headers=h, timeout=20, follow_redirects=True)
        assert pdf.status_code == 200, (
            f"Advertised pdf_url {pdf_url} is NOT reachable (got {pdf.status_code})."
        )
        assert (pdf.headers.get("content-type", "").startswith("application/pdf")
                or pdf.content[:4] == b"%PDF"), \
            f"URL returned non-PDF body (ctype={pdf.headers.get('content-type')})"

        # Without auth → 401/403 (previously was 200 SPA HTML — the bug)
        r2 = httpx.get(f"{API_URL}{pdf_url}", timeout=20, follow_redirects=True)
        assert r2.status_code in (401, 403)


# ════════════════════════════════════════════
# Admin agreements list + stats
# ════════════════════════════════════════════

class TestAdminAgreementList:
    def test_stats_shape_and_coverage_within_0_100(self):
        r = httpx.get(f"{API_URL}/api/admin/vendor-agreements/stats",
                      headers=admin_headers(), timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d["current_version"]
        assert isinstance(d["total_vendors"], int)
        assert isinstance(d["signed_current_version"], int)
        assert 0 <= d["coverage_pct"] <= 100

    def test_admin_list_excludes_mongo_objectid_and_includes_vendor_display(self):
        r = httpx.get(f"{API_URL}/api/admin/vendor-agreements",
                      headers=admin_headers(), timeout=20)
        assert r.status_code == 200
        arr = r.json()
        assert isinstance(arr, list)
        if arr:
            row = arr[0]
            assert "_id" not in row, "MongoDB _id must be stripped"
            assert "vendor_display_name" in row
            for k in ("id", "vendor_id", "version", "status", "signed_at", "pdf_url"):
                assert k in row

    def test_admin_list_status_filter(self):
        r = httpx.get(f"{API_URL}/api/admin/vendor-agreements?status=signed",
                      headers=admin_headers(), timeout=20)
        assert r.status_code == 200
        arr = r.json()
        for row in arr:
            assert row["status"] == "signed"


# ════════════════════════════════════════════
# Impersonation edge cases
# ════════════════════════════════════════════

class TestImpersonationEdgeCases:
    def test_impersonate_partner_without_active_user_returns_400(self):
        """Seed a partner doc with NO active partner_users → expect 400."""
        async def _seed():
            cli = AsyncIOMotorClient(MONGO)
            db = cli[DB]
            _id = ObjectId()
            await db.partners.insert_one({
                "_id": _id,
                "name": "TEST_NoUserPartner",
                "company_name": "TEST_NoUserPartner Ltd",
                "partner_type": "vendor",
            })
            return str(_id)
        pid = asyncio.run(_seed())
        try:
            r = httpx.post(
                f"{API_URL}/api/admin/impersonate-partner/{pid}",
                headers=admin_headers(), json={"reason": "no-user test"}, timeout=15,
            )
            assert r.status_code == 400, r.text
            assert "no active users" in r.json()["detail"].lower()
        finally:
            async def _cleanup():
                cli = AsyncIOMotorClient(MONGO)
                db = cli[DB]
                await db.partners.delete_one({"_id": ObjectId(pid)})
            asyncio.run(_cleanup())

    def test_impersonation_log_end_sets_ended_at_and_duration(self):
        pid = _active_partner_id()
        if not pid:
            pytest.skip("no active partner_user")
        r = httpx.post(
            f"{API_URL}/api/admin/impersonate-partner/{pid}",
            headers=admin_headers(), json={"reason": "duration-test"}, timeout=15,
        )
        assert r.status_code == 200
        audit_id = r.json()["audit_id"]

        time.sleep(1.1)

        r2 = httpx.post(
            f"{API_URL}/api/admin/impersonation-log/{audit_id}/end",
            headers=admin_headers(), timeout=15,
        )
        assert r2.status_code == 200
        assert r2.json()["ok"] is True

        # Second end-call must be a no-op (already ended)
        r3 = httpx.post(
            f"{API_URL}/api/admin/impersonation-log/{audit_id}/end",
            headers=admin_headers(), timeout=15,
        )
        assert r3.status_code == 200
        assert r3.json()["ok"] is False

        # Log includes duration_seconds + ip
        r4 = httpx.get(
            f"{API_URL}/api/admin/impersonation-log?partner_id={pid}",
            headers=admin_headers(), timeout=15,
        )
        assert r4.status_code == 200
        entries = r4.json()
        entry = next((e for e in entries if e["id"] == audit_id), None)
        assert entry, "audit entry must appear in the log"
        assert entry["ended_at"]
        assert entry.get("duration_seconds", 0) >= 1
        assert "ip" in entry
        assert entry["target_type"] == "partner"
        assert entry["target_id"] == pid

    def test_impersonation_token_is_partner_token(self):
        pid = _active_partner_id()
        if not pid:
            pytest.skip("no active partner_user")
        r = httpx.post(
            f"{API_URL}/api/admin/impersonate-partner/{pid}",
            headers=admin_headers(), json={"reason": "token-shape"}, timeout=15,
        )
        assert r.status_code == 200
        tok = r.json()["access_token"]
        # Must decode with PARTNER_SECRET (not admin secret)
        payload = jwt.decode(tok, PARTNER_SECRET, algorithms=["HS256"])
        assert payload["role"] == "partner_user"
        assert payload["is_impersonation"] is True
        assert payload["impersonator_role"] in ("admin", "vendor_ops", "ops")
        assert payload["partner_id"] == pid
        assert payload["audit_id"]

    def test_impersonation_log_requires_auth(self):
        r = httpx.get(f"{API_URL}/api/admin/impersonation-log", timeout=15)
        assert r.status_code == 401

    def test_impersonation_log_rejects_partner_token(self):
        """Admin audit endpoints must NOT accept partner JWT."""
        h = partner_headers()
        if not h:
            pytest.skip("no partner token")
        r = httpx.get(f"{API_URL}/api/admin/impersonation-log", headers=h, timeout=15)
        assert r.status_code in (401, 403)


# ════════════════════════════════════════════
# Frontend nav config wiring (static file inspection)
# ════════════════════════════════════════════

class TestAdminNavConfig:
    NAV_FILE = Path("/app/frontend/src/config/adminNavigation.js")

    def test_nav_contains_vendor_agreements_under_payments_finance(self):
        src = self.NAV_FILE.read_text()
        assert "Payments & Finance" in src
        # Slice from 'Payments & Finance' label up to the next top-level `key:`
        start = src.index('label: "Payments & Finance"')
        rest = src[start:]
        next_group = re.search(r"\n\s{2}\},\s*\n\s{2}\{\s*\n\s+key:", rest)
        group = rest[: next_group.start()] if next_group else rest
        assert "/admin/vendor-agreements" in group, group[:200]
        assert "Vendor Agreements" in group

    def test_nav_contains_impersonation_log_under_people_control(self):
        src = self.NAV_FILE.read_text()
        assert "People & Control" in src
        m = re.search(r'label:\s*"People & Control".+', src, re.DOTALL)
        assert m
        group = m.group(0)
        assert "/admin/impersonation-log" in group
        assert "Impersonation Log" in group
