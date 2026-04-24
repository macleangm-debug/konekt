"""Iteration 349 - Verify marketplace cart flow, pricing engine, price override, and quote request.
Review Request:
 1. Variant grouping + detail cards for Cooltex
 2. Pricing engine: customer_price = round(vendor_cost * (1 + tier.total_margin_pct/100))
 3. Price override endpoints (fixed/percentage_off/clear + bulk)
 4. Public /api/public/quote-requests endpoint
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or "http://localhost:8001"
# prefer frontend .env if available
try:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
except Exception:
    pass

ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"

TIERS = [
    (0, 100_000, 35),
    (100_000, 500_000, 30),
    (500_000, 2_000_000, 25),
    (2_000_000, 10_000_000, 20),
    (10_000_000, float("inf"), 15),
]


def expected_price(vendor_cost: float) -> float:
    for lo, hi, pct in TIERS:
        if lo <= vendor_cost < hi:
            return round(vendor_cost * (1 + pct / 100.0))
    return round(vendor_cost * 1.15)


@pytest.fixture(scope="module")
def admin_token():
    # Try admin login endpoints
    for path in ["/api/auth/login", "/api/admin/auth/login"]:
        try:
            r = requests.post(
                f"{BASE_URL}{path}",
                json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
                timeout=15,
            )
            if r.status_code == 200:
                data = r.json()
                token = (
                    data.get("access_token")
                    or data.get("token")
                    or (data.get("data") or {}).get("token")
                )
                if token:
                    return token
        except Exception:
            continue
    pytest.skip("Could not obtain admin token")


def _as_list(data):
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        for k in ("items", "products", "results", "data"):
            v = data.get(k)
            if isinstance(v, list):
                return v
    return []


# ---------------- 1. VARIANT GROUPING ----------------
class TestVariantGrouping:
    def test_cooltex_grouped_cards_count(self):
        r = requests.get(
            f"{BASE_URL}/api/marketplace/products/search",
            params={"q": "cooltex"},
            timeout=60,
        )
        assert r.status_code == 200, r.text
        items = _as_list(r.json())
        names = [i.get("name", "") for i in items]
        print(f"Cooltex grouped cards: {len(items)}; names: {names}")
        assert 5 <= len(items) <= 15, f"Expected ~10 cards, got {len(items)}"

    def test_cooltex_maroon_has_6_sizes(self):
        r = requests.get(
            f"{BASE_URL}/api/marketplace/products/search",
            params={"q": "cooltex", "group_variants": "false"},
            timeout=20,
        )
        assert r.status_code == 200
        items = _as_list(r.json())
        # Filter maroon polo (not Polo W)
        maroon = [
            p for p in items
            if p.get("name", "").startswith("Cooltex Polo - Maroon")
        ]
        print(f"Maroon SKUs: {len(maroon)}")
        sizes = sorted({p.get("size") or p.get("name", "").split(" - ")[-1] for p in maroon})
        print(f"Sizes: {sizes}")
        assert len(maroon) == 6, f"Expected 6 maroon SKUs, got {len(maroon)}"


# ---------------- 2. PRICING ENGINE ----------------
class TestPricingEngine:
    def test_customer_price_matches_tier_formula(self):
        r = requests.get(
            f"{BASE_URL}/api/marketplace/products/search",
            params={"q": "cooltex", "group_variants": "false"},
            timeout=20,
        )
        assert r.status_code == 200, r.text
        items = _as_list(r.json())
        assert items, "No cooltex SKUs"

        mismatches = []
        missing_tier_label = 0
        checked = 0
        for p in items[:30]:
            vc = float(p.get("vendor_cost") or 0)
            cp = float(p.get("customer_price") or 0)
            if vc <= 0 or p.get("customer_price_override"):
                continue
            checked += 1
            expected = expected_price(vc)
            if abs(cp - expected) > 2:
                mismatches.append({"name": p.get("name"), "vc": vc, "cp": cp, "expected": expected})
            assert cp > vc, f"customer_price {cp} <= vendor_cost {vc} for {p.get('name')}"
            if not p.get("pricing_tier_label"):
                missing_tier_label += 1
        print(f"Checked {checked}; mismatches={mismatches}; missing tier_label={missing_tier_label}")
        assert not mismatches, f"Pricing engine mismatches: {mismatches[:3]}"
        # This is a soft-asserted but the review demands it
        assert missing_tier_label == 0, (
            f"{missing_tier_label}/{checked} products missing pricing_tier_label field"
        )


# ---------------- 3. PRICE OVERRIDE ----------------
class TestPriceOverride:
    @pytest.fixture(scope="class")
    def sample_products(self):
        r = requests.get(
            f"{BASE_URL}/api/marketplace/products/search",
            params={"q": "cooltex", "group_variants": "false"},
            timeout=20,
        )
        assert r.status_code == 200
        items = _as_list(r.json())
        assert len(items) >= 3
        return items[:3]

    def test_percentage_off(self, admin_token, sample_products):
        p = sample_products[0]
        pid = p.get("id") or p.get("_id")
        headers = {"Authorization": f"Bearer {admin_token}"}
        r = requests.post(
            f"{BASE_URL}/api/admin/products/{pid}/price-override",
            headers=headers,
            json={"mode": "percentage_off", "value": 15, "reason": "Clearance"},
            timeout=15,
        )
        print(f"percentage_off: {r.status_code} -> {r.text[:300]}")
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("success") is True
        base = body.get("base_price")
        final = body.get("final_customer_price")
        assert base and final
        assert abs(final - round(base * 0.85)) <= 2, f"base={base} final={final}"

    def test_clear_override(self, admin_token, sample_products):
        p = sample_products[0]
        pid = p.get("id") or p.get("_id")
        headers = {"Authorization": f"Bearer {admin_token}"}
        r = requests.post(
            f"{BASE_URL}/api/admin/products/{pid}/price-override",
            headers=headers,
            json={"mode": "clear"},
            timeout=15,
        )
        print(f"clear: {r.status_code} -> {r.text[:300]}")
        assert r.status_code == 200
        body = r.json()
        assert body.get("success") is True
        # after clear, override values must be null
        assert body["override"]["mode"] is None
        assert body["final_customer_price"] == body["base_price"]

    def test_fixed_override(self, admin_token, sample_products):
        p = sample_products[1]
        pid = p.get("id") or p.get("_id")
        headers = {"Authorization": f"Bearer {admin_token}"}
        r = requests.post(
            f"{BASE_URL}/api/admin/products/{pid}/price-override",
            headers=headers,
            json={"mode": "fixed", "value": 25000, "reason": "Promo"},
            timeout=15,
        )
        print(f"fixed: {r.status_code} -> {r.text[:300]}")
        assert r.status_code == 200
        assert r.json()["final_customer_price"] == 25000
        # cleanup
        requests.post(
            f"{BASE_URL}/api/admin/products/{pid}/price-override",
            headers=headers,
            json={"mode": "clear"},
            timeout=15,
        )

    def test_bulk_percentage_off(self, admin_token, sample_products):
        ids = [p.get("id") or p.get("_id") for p in sample_products]
        headers = {"Authorization": f"Bearer {admin_token}"}
        r = requests.post(
            f"{BASE_URL}/api/admin/products/bulk-price-override",
            headers=headers,
            json={"product_ids": ids, "mode": "percentage_off", "value": 10},
            timeout=30,
        )
        print(f"bulk: {r.status_code} -> {r.text[:300]}")
        assert r.status_code == 200
        body = r.json()
        assert body.get("success") is True
        assert body.get("updated") >= 3, f"Expected 3 updated, got {body}"
        # cleanup
        requests.post(
            f"{BASE_URL}/api/admin/products/bulk-price-override",
            headers=headers,
            json={"product_ids": ids, "mode": "clear"},
            timeout=30,
        )


# ---------------- 4. PUBLIC QUOTE ----------------
class TestPublicQuoteRequest:
    def test_submit_quote_request(self):
        payload = {
            "custom_items": [
                {"name": "TEST_ServiceRequest", "quantity": 5, "description": "Test desc"}
            ],
            "category": "Services",
            "customer_note": "Iteration 349 test",
            "customer": {
                "first_name": "Test",
                "last_name": "User",
                "phone": "+255700000000",
                "email": "test349@example.com",
                "company": "TestCo",
            },
            "source": "iteration_349",
        }
        r = requests.post(
            f"{BASE_URL}/api/public/quote-requests", json=payload, timeout=15
        )
        print(f"quote req: {r.status_code} -> {r.text[:400]}")
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("success") is True
        assert body.get("id")
        # verify persisted
        rid = body["id"]
        r2 = requests.get(
            f"{BASE_URL}/api/public/quote-requests/{rid}", timeout=15
        )
        assert r2.status_code == 200
        got = r2.json()
        assert got["customer"]["phone"] == "+255700000000"

    def test_missing_phone_rejected(self):
        r = requests.post(
            f"{BASE_URL}/api/public/quote-requests",
            json={
                "custom_items": [{"name": "x", "quantity": 1}],
                "customer": {"first_name": "N", "phone": ""},
            },
            timeout=15,
        )
        assert r.status_code in (400, 422), r.text
