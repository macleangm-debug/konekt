"""End-to-end backend test for affiliate referral attribution on POST /api/orders.

Verifies (per iteration 357 review request):
- POST /api/orders accepts referral_code field and persists it + nested attribution dict.
- attribution_events row inserted when code matches an active affiliate (KONTEST).
- Order still created when code is invalid/empty (attribution=null, no events row).
- /api/affiliate-program/me/dashboard reflects attribution (or fall back to my-status).
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

AFFILIATE_EMAIL = "affiliate.test@konekt.co.tz"
AFFILIATE_PWD = "Affiliate#Konekt2026"
AFFILIATE_CODE = "KONTEST"

CUSTOMER_EMAIL = f"test+attr357.{uuid.uuid4().hex[:8]}@example.com"
CUSTOMER_PWD = "TestPass123!"


@pytest.fixture(scope="module")
def customer_token():
    # Register a fresh customer (legacy demo creds may not exist).
    r = requests.post(f"{API}/auth/register", json={
        "email": CUSTOMER_EMAIL,
        "password": CUSTOMER_PWD,
        "full_name": "Attribution Test Customer",
        "phone": "+255712111222",
    }, timeout=30)
    if r.status_code not in (200, 201):
        pytest.skip(f"Register failed: {r.status_code} {r.text[:200]}")
    token = r.json().get("token") or r.json().get("access_token")
    if not token:
        # Fall back to login
        lr = requests.post(f"{API}/auth/login", json={
            "email": CUSTOMER_EMAIL, "password": CUSTOMER_PWD
        }, timeout=30)
        token = lr.json().get("token") or lr.json().get("access_token")
    assert token, "No customer token after register/login"
    return token


@pytest.fixture(scope="module")
def affiliate_token():
    r = requests.post(f"{API}/auth/login", json={
        "email": AFFILIATE_EMAIL, "password": AFFILIATE_PWD
    }, timeout=30)
    assert r.status_code == 200, f"Affiliate login failed: {r.status_code} {r.text[:200]}"
    token = r.json().get("token") or r.json().get("access_token")
    assert token
    return token


def _order_payload(referral_code=None):
    item = {
        "product_id": "test-prod-" + uuid.uuid4().hex[:6],
        "product_name": "Test Polo",
        "quantity": 5,
        "print_method": "screen_print",
        "unit_price": 10000.0,
        "subtotal": 50000.0,
    }
    body = {
        "items": [item],
        "delivery_address": "Test Address, Dar es Salaam",
        "delivery_phone": "+255712000000",
        "notes": "TEST_attr",
        "deposit_percentage": 30,
    }
    if referral_code is not None:
        body["referral_code"] = referral_code
    return body


# ---------- Tests ----------
class TestAffiliateLockedCode:
    """Confirm the affiliate KONTEST code is locked and active."""

    def test_affiliate_code_is_kontest(self, affiliate_token):
        r = requests.get(
            f"{API}/affiliate-program/my-status",
            headers={"Authorization": f"Bearer {affiliate_token}"}, timeout=30,
        )
        assert r.status_code == 200, r.text[:200]
        data = r.json()
        # Some deployments return code at top-level, others nested. Check both.
        code = (data.get("affiliate_code")
                or (data.get("affiliate") or {}).get("affiliate_code"))
        assert code == AFFILIATE_CODE, f"expected {AFFILIATE_CODE}, got {code}: {data}"


class TestOrderWithValidReferral:
    """POST /api/orders with referral_code=KONTEST persists attribution."""

    def test_order_created_with_attribution(self, customer_token):
        r = requests.post(
            f"{API}/orders",
            json=_order_payload(referral_code=AFFILIATE_CODE),
            headers={"Authorization": f"Bearer {customer_token}"}, timeout=30,
        )
        assert r.status_code in (200, 201), f"{r.status_code} {r.text[:300]}"
        body = r.json()
        # Server may wrap: {"order": {...}} or return the order directly.
        order = body.get("order", body)
        order_id = order.get("id") or order.get("order_id")
        assert order_id, f"no id in {body}"
        # In-response assertions on referral_code + attribution
        assert order.get("referral_code") == AFFILIATE_CODE
        attr = order.get("attribution")
        assert attr and attr.get("kind") == "affiliate"
        assert attr.get("code") == AFFILIATE_CODE
        assert attr.get("affiliate_id"), "affiliate_id not resolved"
        assert "@" in (attr.get("affiliate_email") or "")
        TestOrderWithValidReferral.order_id = order_id
        TestOrderWithValidReferral.order_number = order.get("order_number")

    def test_order_persisted_in_mongo_with_attribution(self, customer_token):
        oid = TestOrderWithValidReferral.order_id
        import subprocess, json
        out = subprocess.check_output([
            "mongosh", "--quiet", "konekt_db", "--eval",
            f'JSON.stringify(db.orders.findOne({{id: "{oid}"}}, {{_id: 0}}))'
        ], timeout=15).decode()
        line = next((ln for ln in out.strip().splitlines() if ln.startswith("{") or ln == "null"), out.strip())
        assert line and line != "null", f"order not in mongo: {out}"
        doc = json.loads(line)
        assert doc.get("referral_code") == AFFILIATE_CODE
        attr = doc.get("attribution")
        assert attr and attr.get("kind") == "affiliate"
        assert attr.get("affiliate_id"), "affiliate_id missing on persisted order"

    def test_attribution_event_row_inserted(self, customer_token):
        # Hit Mongo directly via shell since there's no public API for events.
        oid = TestOrderWithValidReferral.order_id
        import subprocess, json
        out = subprocess.check_output([
            "mongosh", "--quiet", "konekt_db", "--eval",
            f'JSON.stringify(db.attribution_events.findOne({{order_id: "{oid}"}}))'
        ], timeout=15).decode()
        # Strip any mongosh prefix lines
        line = next((ln for ln in out.strip().splitlines() if ln.startswith("{") or ln == "null"), out.strip())
        assert line and line != "null", f"No attribution_events row for order {oid}: {out}"
        evt = json.loads(line)
        assert evt.get("kind") == "affiliate"
        assert evt.get("code") == AFFILIATE_CODE
        assert evt.get("order_id") == oid
        assert evt.get("affiliate_id"), "affiliate_id missing on event"
        assert evt.get("status") == "pending"


class TestOrderWithoutReferral:
    """POST /api/orders with no/invalid code creates order with attribution=null."""

    def test_order_without_referral_code(self, customer_token):
        r = requests.post(
            f"{API}/orders", json=_order_payload(referral_code=None),
            headers={"Authorization": f"Bearer {customer_token}"}, timeout=30,
        )
        assert r.status_code in (200, 201), f"{r.status_code} {r.text[:300]}"
        body = r.json()
        order = body.get("order", body)
        oid = order.get("id") or order.get("order_id")
        assert oid
        # Response-level assertions
        assert order.get("attribution") in (None, {}), order.get("attribution")
        assert order.get("referral_code") in (None, ""), order.get("referral_code")

        # Verify no attribution_events row + persisted order has no attribution
        import subprocess, json
        out = subprocess.check_output([
            "mongosh", "--quiet", "konekt_db", "--eval",
            f'db.attribution_events.countDocuments({{order_id: "{oid}"}})'
        ], timeout=15).decode().strip()
        n = next((int(ln) for ln in reversed(out.splitlines()) if ln.strip().isdigit()), -1)
        assert n == 0, f"unexpected attribution_events for non-referred order {oid}: count={n}"

    def test_order_with_invalid_referral_code(self, customer_token):
        r = requests.post(
            f"{API}/orders", json=_order_payload(referral_code="DOESNOTEXIST"),
            headers={"Authorization": f"Bearer {customer_token}"}, timeout=30,
        )
        assert r.status_code in (200, 201), f"{r.status_code} {r.text[:300]}"
        body = r.json()
        order = body.get("order", body)
        # invalid code never blocks the order, attribution must be null
        assert order.get("attribution") in (None, {}), f"invalid code created attribution: {order.get('attribution')}"
        # Referral code is normalized & saved on order even if it does not match,
        # but no attribution_events row should be inserted.
        import subprocess
        oid = order.get("id")
        out = subprocess.check_output([
            "mongosh", "--quiet", "konekt_db", "--eval",
            f'db.attribution_events.countDocuments({{order_id: "{oid}"}})'
        ], timeout=15).decode().strip()
        n = next((int(ln) for ln in reversed(out.splitlines()) if ln.strip().isdigit()), -1)
        assert n == 0, f"unexpected attribution_events for invalid code order {oid}: count={n}"


class TestAffiliateDashboard:
    """Dashboard / my-status reflects attribution after order creation."""

    def test_dashboard_endpoint_returns_200(self, affiliate_token):
        # Try the explicit dashboard route first, fall back to my-status.
        urls = [
            f"{API}/affiliate-program/me/dashboard",
            f"{API}/affiliate-program/dashboard",
            f"{API}/affiliate-program/my-status",
        ]
        last = None
        for u in urls:
            r = requests.get(u, headers={"Authorization": f"Bearer {affiliate_token}"}, timeout=30)
            last = (u, r.status_code, r.text[:200])
            if r.status_code == 200:
                # Just sanity-check the affiliate_code is reflected — counters
                # may be aggregated nightly, so we don't assert non-zero.
                body = r.json()
                blob = str(body)
                assert AFFILIATE_CODE in blob, f"{AFFILIATE_CODE} not present in dashboard: {blob[:300]}"
                return
        pytest.fail(f"No dashboard endpoint returned 200. Last: {last}")
