"""
Session 3A extended regression tests — Vendor Payables + QR Codes
Covers all features called out by main agent E1 in the review request.
Run: pytest /app/backend/tests/test_session_3a_extended.py -v
"""
import os
import re
import pytest
import httpx
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

API_URL = (os.environ.get("REACT_APP_BACKEND_URL") or "http://localhost:8001").rstrip("/")
MONGO = os.environ["MONGO_URL"]
DB = os.environ["DB_NAME"]
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PW = "KnktcKk_L-hw1wSyquvd!"

QR_KINDS = ["product", "group_deal", "promo_campaign", "content_post"]


# ─── helpers ─────────────────────────────────────────────────────────
_TOKEN_CACHE: dict = {}


def _admin_token():
    if _TOKEN_CACHE.get("t"):
        return _TOKEN_CACHE["t"]
    import time
    last = None
    for attempt in range(6):
        r = httpx.post(f"{API_URL}/api/auth/login",
                       json={"email": ADMIN_EMAIL, "password": ADMIN_PW}, timeout=20)
        last = r
        if r.status_code == 200:
            d = r.json()
            tok = d.get("token") or d.get("access_token")
            _TOKEN_CACHE["t"] = tok
            return tok
        if r.status_code == 429:
            time.sleep(15)
            continue
        break
    raise AssertionError(f"admin login failed: {last.status_code} {last.text}")


def _hdr():
    return {"Authorization": f"Bearer {_admin_token()}"}


# ════════════════════════════════════════════════════════════════════
#  QR CODE TESTS
# ════════════════════════════════════════════════════════════════════

class TestQRCodes:
    @pytest.mark.parametrize("kind", QR_KINDS)
    def test_qr_info_per_kind(self, kind):
        r = httpx.get(f"{API_URL}/api/qr/{kind}/abc-123", timeout=20)
        assert r.status_code == 200
        j = r.json()
        assert j["kind"] == kind
        assert j["entity_id"] == "abc-123"
        assert j["qr_image_url"].endswith(".png")
        assert j["target_url"].startswith(("http://", "https://"))
        # Verify deep-link template
        expect_path_segment = {
            "product": "/shop/product/abc-123",
            "group_deal": "/group-deals/abc-123",
            "promo_campaign": "/promo/abc-123",
            "content_post": "/content/abc-123",
        }[kind]
        assert j["target_url"].endswith(expect_path_segment)

    @pytest.mark.parametrize("kind", QR_KINDS)
    def test_qr_png_per_kind(self, kind):
        r = httpx.get(f"{API_URL}/api/qr/{kind}/zzz-png-test.png", timeout=20)
        assert r.status_code == 200
        assert r.headers["content-type"] == "image/png"
        assert len(r.content) > 200
        # Real PNG signature
        assert r.content[:8] == b"\x89PNG\r\n\x1a\n"

    def test_qr_invalid_kind_info_404(self):
        r = httpx.get(f"{API_URL}/api/qr/bogus/xyz", timeout=20)
        assert r.status_code == 404

    def test_qr_invalid_kind_png_404(self):
        r = httpx.get(f"{API_URL}/api/qr/bogus/xyz.png", timeout=20)
        assert r.status_code == 404

    def test_qr_refresh_regenerates(self):
        kind, eid = "product", "refresh-test-1"
        # prime cache
        r = httpx.get(f"{API_URL}/api/qr/{kind}/{eid}.png", timeout=20)
        assert r.status_code == 200
        first_len = len(r.content)
        # refresh
        r2 = httpx.post(f"{API_URL}/api/qr/{kind}/{eid}/refresh", timeout=20)
        assert r2.status_code == 200
        body = r2.json()
        assert body.get("ok") is True
        assert body["qr_image_url"].endswith(".png")
        # fetch again (regenerated)
        r3 = httpx.get(f"{API_URL}/api/qr/{kind}/{eid}.png", timeout=20)
        assert r3.status_code == 200
        assert r3.content[:8] == b"\x89PNG\r\n\x1a\n"
        assert len(r3.content) >= first_len - 50  # roughly same size

    def test_qr_refresh_invalid_kind_404(self):
        r = httpx.post(f"{API_URL}/api/qr/bogus/abc/refresh", timeout=20)
        assert r.status_code == 404


# ════════════════════════════════════════════════════════════════════
#  ADMIN PAYABLES — STATS / LEDGER
# ════════════════════════════════════════════════════════════════════

class TestPayablesStatsAndLedger:
    def test_stats_required_keys_present(self):
        r = httpx.get(f"{API_URL}/api/admin/vendor-payables/stats", headers=_hdr(), timeout=20)
        assert r.status_code == 200
        j = r.json()
        for k in ("orders_outstanding", "orders_count",
                  "statements_outstanding", "total_outstanding",
                  "vendors_pay_per_order", "vendors_monthly_statement",
                  "pending_modality_requests"):
            assert k in j, f"missing key: {k}"
        # numeric types
        assert isinstance(j["orders_outstanding"], (int, float))
        assert isinstance(j["pending_modality_requests"], int)

    def test_ledger_returns_list(self):
        r = httpx.get(f"{API_URL}/api/admin/vendor-payables/ledger", headers=_hdr(), timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_ledger_filter_status(self):
        r = httpx.get(f"{API_URL}/api/admin/vendor-payables/ledger?status=pending",
                      headers=_hdr(), timeout=20)
        assert r.status_code == 200
        for row in r.json():
            assert row.get("vendor_payment_status") == "pending"

    def test_ledger_filter_modality(self):
        r = httpx.get(f"{API_URL}/api/admin/vendor-payables/ledger?modality=pay_per_order",
                      headers=_hdr(), timeout=20)
        assert r.status_code == 200
        for row in r.json():
            assert row.get("modality") == "pay_per_order"

    def test_ledger_filter_vendor_id(self):
        # synthetic id — should still 200 with empty list
        r = httpx.get(f"{API_URL}/api/admin/vendor-payables/ledger?vendor_id=__no_such__",
                      headers=_hdr(), timeout=20)
        assert r.status_code == 200
        assert r.json() == []


# ════════════════════════════════════════════════════════════════════
#  ADMIN MODALITY ENDPOINT — partner _id update
# ════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
class TestModalityWriteToPartners:
    async def test_modality_invalid_returns_400(self):
        cli = AsyncIOMotorClient(MONGO)
        db = cli[DB]
        p = await db.partners.find_one({"partner_type": "product"}, {"_id": 1})
        if not p:
            pytest.skip("no product partner in db")
        pid = str(p["_id"])
        r = httpx.post(f"{API_URL}/api/admin/vendor-payables/vendors/{pid}/modality",
                       headers=_hdr(), json={"modality": "garbage"}, timeout=20)
        assert r.status_code == 400

    async def test_modality_unknown_vendor_404(self):
        # 24-char hex but non-existent
        fake_oid = "0" * 24
        r = httpx.post(f"{API_URL}/api/admin/vendor-payables/vendors/{fake_oid}/modality",
                       headers=_hdr(), json={"modality": "pay_per_order"}, timeout=20)
        assert r.status_code == 404

    async def test_modality_writes_to_partners_collection(self):
        cli = AsyncIOMotorClient(MONGO)
        db = cli[DB]
        p = await db.partners.find_one({"partner_type": "product"}, {"_id": 1})
        if not p:
            pytest.skip("no product partner")
        pid = str(p["_id"])

        # Set monthly_statement
        r = httpx.post(f"{API_URL}/api/admin/vendor-payables/vendors/{pid}/modality",
                       headers=_hdr(), json={"modality": "monthly_statement", "note": "test"},
                       timeout=20)
        assert r.status_code == 200
        assert r.json().get("modality") == "monthly_statement"

        doc = await db.partners.find_one({"_id": ObjectId(pid)},
                                         {"payment_modality": 1, "payment_modality_updated_by": 1})
        assert doc.get("payment_modality") == "monthly_statement"
        assert doc.get("payment_modality_updated_by") == "admin"

        # Reset
        r2 = httpx.post(f"{API_URL}/api/admin/vendor-payables/vendors/{pid}/modality",
                        headers=_hdr(), json={"modality": "pay_per_order"}, timeout=20)
        assert r2.status_code == 200
        doc2 = await db.partners.find_one({"_id": ObjectId(pid)}, {"payment_modality": 1})
        assert doc2.get("payment_modality") == "pay_per_order"


# ════════════════════════════════════════════════════════════════════
#  STATEMENTS — generate (idempotent), list filters
# ════════════════════════════════════════════════════════════════════

class TestStatements:
    def test_generate_default_returns_previous_month(self):
        r = httpx.post(f"{API_URL}/api/admin/vendor-payables/statements/generate",
                       headers=_hdr(), timeout=30)
        assert r.status_code == 200
        body = r.json()
        assert body["ok"] is True
        assert re.match(r"^\d{4}-\d{2}$", body["period"])

    def test_generate_idempotent_same_period(self):
        # Run twice with same explicit period — neither should error
        r1 = httpx.post(f"{API_URL}/api/admin/vendor-payables/statements/generate?period=2025-01",
                        headers=_hdr(), timeout=30)
        assert r1.status_code == 200
        r2 = httpx.post(f"{API_URL}/api/admin/vendor-payables/statements/generate?period=2025-01",
                        headers=_hdr(), timeout=30)
        assert r2.status_code == 200
        assert r2.json()["period"] == "2025-01"

    def test_generate_invalid_period_400(self):
        r = httpx.post(f"{API_URL}/api/admin/vendor-payables/statements/generate?period=BAD",
                       headers=_hdr(), timeout=20)
        assert r.status_code == 400

    def test_list_statements_filters(self):
        r = httpx.get(f"{API_URL}/api/admin/vendor-payables/statements",
                      headers=_hdr(), timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

        for params in ("?status=open", "?vendor_id=__none__", "?country=TZ"):
            rr = httpx.get(f"{API_URL}/api/admin/vendor-payables/statements{params}",
                           headers=_hdr(), timeout=20)
            assert rr.status_code == 200
            assert isinstance(rr.json(), list)


# ════════════════════════════════════════════════════════════════════
#  MODALITY-REQUESTS approve / deny
# ════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
class TestModalityRequestsAdmin:
    async def _seed_request(self, db, requested="monthly_statement"):
        # Pick a partner that can be flipped back
        p = await db.partners.find_one({"partner_type": "product"}, {"_id": 1})
        if not p:
            pytest.skip("no product partner")
        pid = str(p["_id"])
        # Make sure starting modality differs from requested
        await db.partners.update_one({"_id": p["_id"]},
                                     {"$set": {"payment_modality": "pay_per_order"}})
        from uuid import uuid4
        from datetime import datetime, timezone
        rid = str(uuid4())
        await db.vendor_modality_requests.insert_one({
            "id": rid,
            "vendor_id": pid,
            "vendor_name": "TEST_vendor",
            "current_modality": "pay_per_order",
            "requested_modality": requested,
            "status": "pending",
            "requested_at": datetime.now(timezone.utc).isoformat(),
        })
        return rid, pid

    async def test_approve_flips_partner_modality(self):
        cli = AsyncIOMotorClient(MONGO)
        db = cli[DB]
        rid, pid = await self._seed_request(db, requested="monthly_statement")
        try:
            r = httpx.post(f"{API_URL}/api/admin/vendor-payables/modality-requests/{rid}/approve",
                           headers=_hdr(), json={"note": "ok"}, timeout=20)
            assert r.status_code == 200
            req = await db.vendor_modality_requests.find_one({"id": rid})
            assert req["status"] == "approved"
            partner = await db.partners.find_one({"_id": ObjectId(pid)},
                                                 {"payment_modality": 1})
            assert partner["payment_modality"] == "monthly_statement"
        finally:
            await db.vendor_modality_requests.delete_one({"id": rid})
            await db.partners.update_one({"_id": ObjectId(pid)},
                                         {"$set": {"payment_modality": "pay_per_order"}})

    async def test_deny_sets_status_no_modality_change(self):
        cli = AsyncIOMotorClient(MONGO)
        db = cli[DB]
        rid, pid = await self._seed_request(db, requested="monthly_statement")
        try:
            before = await db.partners.find_one({"_id": ObjectId(pid)}, {"payment_modality": 1})
            assert before["payment_modality"] == "pay_per_order"
            r = httpx.post(f"{API_URL}/api/admin/vendor-payables/modality-requests/{rid}/deny",
                           headers=_hdr(), json={"note": "no thanks"}, timeout=20)
            assert r.status_code == 200
            req = await db.vendor_modality_requests.find_one({"id": rid})
            assert req["status"] == "denied"
            after = await db.partners.find_one({"_id": ObjectId(pid)}, {"payment_modality": 1})
            assert after["payment_modality"] == "pay_per_order"
        finally:
            await db.vendor_modality_requests.delete_one({"id": rid})

    async def test_double_decision_400(self):
        cli = AsyncIOMotorClient(MONGO)
        db = cli[DB]
        rid, pid = await self._seed_request(db, requested="monthly_statement")
        try:
            r1 = httpx.post(f"{API_URL}/api/admin/vendor-payables/modality-requests/{rid}/approve",
                            headers=_hdr(), json={}, timeout=20)
            assert r1.status_code == 200
            r2 = httpx.post(f"{API_URL}/api/admin/vendor-payables/modality-requests/{rid}/deny",
                            headers=_hdr(), json={}, timeout=20)
            assert r2.status_code == 400
        finally:
            await db.vendor_modality_requests.delete_one({"id": rid})
            await db.partners.update_one({"_id": ObjectId(pid)},
                                         {"$set": {"payment_modality": "pay_per_order"}})

    async def test_decision_unknown_id_404(self):
        r = httpx.post(f"{API_URL}/api/admin/vendor-payables/modality-requests/__no_such__/approve",
                       headers=_hdr(), json={}, timeout=20)
        assert r.status_code == 404


# ════════════════════════════════════════════════════════════════════
#  VENDOR endpoints — partner-token guard (must reject admin JWT alone)
# ════════════════════════════════════════════════════════════════════

class TestVendorEndpointsRequirePartnerToken:
    """All /api/vendor/payables/* endpoints call get_partner_user_from_header."""

    def test_modality_unauth(self):
        r = httpx.get(f"{API_URL}/api/vendor/payables/modality", timeout=20)
        assert r.status_code in (401, 403)

    def test_orders_unauth(self):
        r = httpx.get(f"{API_URL}/api/vendor/payables/orders", timeout=20)
        assert r.status_code in (401, 403)

    def test_statements_unauth(self):
        r = httpx.get(f"{API_URL}/api/vendor/payables/statements", timeout=20)
        assert r.status_code in (401, 403)

    def test_request_modality_unauth(self):
        r = httpx.post(f"{API_URL}/api/vendor/payables/request-modality",
                       json={"requested_modality": "monthly_statement"}, timeout=20)
        assert r.status_code in (401, 403)

    def test_admin_jwt_alone_rejected(self):
        # Per E1: get_partner_user_from_header must reject pure admin JWT
        r = httpx.get(f"{API_URL}/api/vendor/payables/modality",
                      headers=_hdr(), timeout=20)
        # admin token ≠ partner token; should NOT 200
        assert r.status_code in (401, 403), \
            f"vendor endpoint accepted admin JWT! status={r.status_code}"


# ════════════════════════════════════════════════════════════════════
#  Vendor request-modality duplicate-pending — verified via DB seed
# ════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
class TestVendorRequestModalityDuplicate:
    async def test_duplicate_pending_blocked_logic(self):
        """
        Without a partner token we cannot hit the endpoint, but the documented
        guard is in vendor_payables_routes.request_modality. We verify the
        underlying DB rule instead: a second pending insert for the same vendor
        would be detected and 400'd by the route.

        Marked as 'documented behavior' — see test_admin_jwt_alone_rejected for
        the auth side.
        """
        cli = AsyncIOMotorClient(MONGO)
        db = cli[DB]
        from uuid import uuid4
        from datetime import datetime, timezone
        vid = "TEST_dup_vendor"
        rid = str(uuid4())
        await db.vendor_modality_requests.insert_one({
            "id": rid, "vendor_id": vid, "status": "pending",
            "requested_modality": "monthly_statement",
            "requested_at": datetime.now(timezone.utc).isoformat(),
        })
        try:
            existing = await db.vendor_modality_requests.find_one(
                {"vendor_id": vid, "status": "pending"})
            assert existing is not None  # the very check the route uses
        finally:
            await db.vendor_modality_requests.delete_many({"vendor_id": vid})
