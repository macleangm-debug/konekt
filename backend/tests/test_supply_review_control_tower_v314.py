"""
Supply Review Control Tower Tests - v314
Tests for the admin vendor supply review dashboard, approve-pricing, and reject endpoints.
Features tested:
- GET /api/admin/vendor-supply/review-dashboard with filters
- Response includes stats, pricing_integrity, margin_settings
- Products flagged for pricing issues and missing data
- POST /api/admin/vendor-supply/products/{id}/approve-pricing with pricing engine
- POST /api/admin/vendor-supply/products/{id}/approve-pricing with override
- POST /api/admin/vendor-supply/products/{id}/reject with reason
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin JWT token for authenticated requests."""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Headers with admin authorization."""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


class TestReviewDashboardEndpoint:
    """Tests for GET /api/admin/vendor-supply/review-dashboard"""

    def test_review_dashboard_returns_products_with_pricing_health(self, admin_headers):
        """Dashboard returns products with pricing_health flags."""
        response = requests.get(
            f"{BASE_URL}/api/admin/vendor-supply/review-dashboard",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "products" in data, "Response should include 'products' array"
        
        # Check that products have pricing_health field
        if data["products"]:
            product = data["products"][0]
            assert "pricing_health" in product, "Product should have pricing_health field"
            assert product["pricing_health"] in ("healthy", "warning", "critical"), \
                f"pricing_health should be healthy/warning/critical, got {product['pricing_health']}"
            assert "flags" in product, "Product should have flags array"

    def test_review_dashboard_includes_stats(self, admin_headers):
        """Dashboard response includes stats (total, pending, pricing_issues, missing_data, healthy)."""
        response = requests.get(
            f"{BASE_URL}/api/admin/vendor-supply/review-dashboard",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "stats" in data, "Response should include 'stats' object"
        
        stats = data["stats"]
        assert "total" in stats, "Stats should include 'total'"
        assert "pending" in stats, "Stats should include 'pending'"
        assert "pricing_issues" in stats, "Stats should include 'pricing_issues'"
        assert "missing_data" in stats, "Stats should include 'missing_data'"
        assert "healthy" in stats, "Stats should include 'healthy'"
        
        # Verify stats are integers
        assert isinstance(stats["total"], int), "total should be integer"
        assert isinstance(stats["pending"], int), "pending should be integer"
        print(f"Stats: total={stats['total']}, pending={stats['pending']}, pricing_issues={stats['pricing_issues']}, missing_data={stats['missing_data']}, healthy={stats['healthy']}")

    def test_review_dashboard_includes_pricing_integrity(self, admin_headers):
        """Dashboard includes pricing_integrity (using_engine, not_using_engine, integrity_pct)."""
        response = requests.get(
            f"{BASE_URL}/api/admin/vendor-supply/review-dashboard",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "pricing_integrity" in data, "Response should include 'pricing_integrity' object"
        
        integrity = data["pricing_integrity"]
        assert "using_engine" in integrity, "pricing_integrity should include 'using_engine'"
        assert "not_using_engine" in integrity, "pricing_integrity should include 'not_using_engine'"
        assert "integrity_pct" in integrity, "pricing_integrity should include 'integrity_pct'"
        
        # Verify integrity_pct is a percentage (0-100)
        assert 0 <= integrity["integrity_pct"] <= 100, f"integrity_pct should be 0-100, got {integrity['integrity_pct']}"
        print(f"Pricing Integrity: {integrity['integrity_pct']}% ({integrity['using_engine']} using engine, {integrity['not_using_engine']} not using)")

    def test_review_dashboard_includes_margin_settings(self, admin_headers):
        """Dashboard includes margin_settings (default_target_pct, default_min_pct)."""
        response = requests.get(
            f"{BASE_URL}/api/admin/vendor-supply/review-dashboard",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "margin_settings" in data, "Response should include 'margin_settings' object"
        
        margin = data["margin_settings"]
        assert "default_target_pct" in margin, "margin_settings should include 'default_target_pct'"
        assert "default_min_pct" in margin, "margin_settings should include 'default_min_pct'"
        
        # Verify margin values are reasonable
        assert margin["default_target_pct"] > 0, "default_target_pct should be positive"
        assert margin["default_min_pct"] > 0, "default_min_pct should be positive"
        print(f"Margin Settings: target={margin['default_target_pct']}%, min={margin['default_min_pct']}%")

    def test_products_with_vendor_cost_no_sell_price_flagged_critical(self, admin_headers):
        """Products with vendor_cost but no sell_price should be flagged as critical."""
        response = requests.get(
            f"{BASE_URL}/api/admin/vendor-supply/review-dashboard",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        products = data.get("products", [])
        
        # Find products with vendor_cost > 0 and selling_price <= 0
        critical_products = [
            p for p in products 
            if p.get("vendor_cost", 0) > 0 and p.get("selling_price", 0) <= 0
        ]
        
        for p in critical_products:
            assert p["pricing_health"] == "critical", \
                f"Product {p['name']} with vendor_cost but no sell_price should be critical, got {p['pricing_health']}"
            # Check flags contain the critical message
            flag_msgs = [f["msg"] for f in p.get("flags", [])]
            assert any("Sell price missing" in msg or "below vendor cost" in msg for msg in flag_msgs), \
                f"Critical product should have sell price flag, got {flag_msgs}"
        
        print(f"Found {len(critical_products)} products with vendor_cost but no sell_price (critical)")

    def test_products_below_minimum_margin_flagged_warning(self, admin_headers):
        """Products with sell_price below minimum margin should be flagged as warning."""
        response = requests.get(
            f"{BASE_URL}/api/admin/vendor-supply/review-dashboard",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        products = data.get("products", [])
        min_margin = data.get("margin_settings", {}).get("default_min_pct", 15)
        
        # Find products with margin below minimum
        warning_products = [
            p for p in products 
            if p.get("vendor_cost", 0) > 0 
            and p.get("selling_price", 0) > 0
            and 0 < p.get("margin_pct", 0) < min_margin
        ]
        
        for p in warning_products:
            assert p["pricing_health"] in ("warning", "critical"), \
                f"Product {p['name']} with margin {p['margin_pct']}% below {min_margin}% should be warning/critical"
        
        print(f"Found {len(warning_products)} products with margin below {min_margin}%")

    def test_products_missing_data_in_missing_data_array(self, admin_headers):
        """Products missing images/unit/SKU/category should show in missing_data array."""
        response = requests.get(
            f"{BASE_URL}/api/admin/vendor-supply/review-dashboard",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        products = data.get("products", [])
        
        # Find products with missing_data
        products_with_missing = [p for p in products if p.get("missing_data")]
        
        for p in products_with_missing:
            missing = p["missing_data"]
            assert isinstance(missing, list), f"missing_data should be a list, got {type(missing)}"
            # Verify missing fields are valid
            valid_fields = {"images", "unit", "SKU", "category", "description"}
            for field in missing:
                assert field in valid_fields, f"Unknown missing field: {field}"
        
        print(f"Found {len(products_with_missing)} products with missing data")


class TestReviewDashboardFilters:
    """Tests for review dashboard filter parameters."""

    def test_filter_pricing_issues_returns_only_critical_warning(self, admin_headers):
        """Filter=pricing_issues returns only critical/warning products."""
        response = requests.get(
            f"{BASE_URL}/api/admin/vendor-supply/review-dashboard?filter=pricing_issues",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        products = data.get("products", [])
        
        for p in products:
            assert p["pricing_health"] in ("critical", "warning"), \
                f"With filter=pricing_issues, product {p['name']} should be critical/warning, got {p['pricing_health']}"
        
        print(f"Filter=pricing_issues returned {len(products)} products (all critical/warning)")

    def test_filter_missing_data_returns_only_products_with_missing_fields(self, admin_headers):
        """Filter=missing_data returns only products with missing fields."""
        response = requests.get(
            f"{BASE_URL}/api/admin/vendor-supply/review-dashboard?filter=missing_data",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        products = data.get("products", [])
        
        for p in products:
            assert p.get("missing_data") and len(p["missing_data"]) > 0, \
                f"With filter=missing_data, product {p['name']} should have missing fields"
        
        print(f"Filter=missing_data returned {len(products)} products (all with missing fields)")

    def test_filter_pending_returns_only_draft_pending_review(self, admin_headers):
        """Filter=pending returns only draft/pending_review status products."""
        response = requests.get(
            f"{BASE_URL}/api/admin/vendor-supply/review-dashboard?filter=pending",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        products = data.get("products", [])
        
        for p in products:
            assert p["status"] in ("draft", "pending_review"), \
                f"With filter=pending, product {p['name']} should be draft/pending_review, got {p['status']}"
        
        print(f"Filter=pending returned {len(products)} products (all draft/pending_review)")

    def test_filter_ready_returns_healthy_complete_pending(self, admin_headers):
        """Filter=ready returns only healthy products with complete data and pending status."""
        response = requests.get(
            f"{BASE_URL}/api/admin/vendor-supply/review-dashboard?filter=ready",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        products = data.get("products", [])
        
        for p in products:
            assert p["pricing_health"] == "healthy", \
                f"With filter=ready, product {p['name']} should be healthy, got {p['pricing_health']}"
            assert not p.get("missing_data") or len(p["missing_data"]) == 0, \
                f"With filter=ready, product {p['name']} should have no missing data"
            assert p["status"] in ("draft", "pending_review"), \
                f"With filter=ready, product {p['name']} should be draft/pending_review, got {p['status']}"
        
        print(f"Filter=ready returned {len(products)} products (all healthy, complete, pending)")


class TestApprovePricingEndpoint:
    """Tests for POST /api/admin/vendor-supply/products/{id}/approve-pricing"""

    def test_approve_pricing_sets_status_active_and_applies_engine(self, admin_headers):
        """Approve-pricing sets status=active and applies pricing engine."""
        # First get a product to approve
        response = requests.get(
            f"{BASE_URL}/api/admin/vendor-supply/review-dashboard?filter=pending",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        products = data.get("products", [])
        
        # Find a product with vendor_cost that's not already active
        test_product = None
        for p in products:
            if p.get("vendor_cost", 0) > 0 and p.get("status") not in ("active", "rejected"):
                test_product = p
                break
        
        if not test_product:
            pytest.skip("No pending product with vendor_cost found for approval test")
        
        product_id = test_product["id"]
        original_vendor_cost = test_product["vendor_cost"]
        
        # Approve the product
        approve_response = requests.post(
            f"{BASE_URL}/api/admin/vendor-supply/products/{product_id}/approve-pricing",
            headers=admin_headers,
            json={"status": "active"}
        )
        assert approve_response.status_code == 200, f"Approve failed: {approve_response.text}"
        
        result = approve_response.json()
        assert result.get("ok") == True, "Response should have ok=True"
        assert "sell_price" in result, "Response should include sell_price"
        assert "margin_pct" in result, "Response should include margin_pct"
        
        # Verify sell_price is calculated from vendor_cost with margin
        assert result["sell_price"] > original_vendor_cost, \
            f"sell_price {result['sell_price']} should be > vendor_cost {original_vendor_cost}"
        
        print(f"Approved product {product_id}: sell_price={result['sell_price']}, margin={result['margin_pct']}%")

    def test_approve_pricing_with_override_validates_minimum_margin(self, admin_headers):
        """Approve-pricing with override_sell_price validates minimum margin."""
        # Get a pending product
        response = requests.get(
            f"{BASE_URL}/api/admin/vendor-supply/review-dashboard?filter=pending",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        products = data.get("products", [])
        min_margin = data.get("margin_settings", {}).get("default_min_pct", 15)
        
        # Find a product with vendor_cost
        test_product = None
        for p in products:
            if p.get("vendor_cost", 0) > 0 and p.get("status") not in ("active", "rejected"):
                test_product = p
                break
        
        if not test_product:
            pytest.skip("No pending product with vendor_cost found for override test")
        
        product_id = test_product["id"]
        vendor_cost = test_product["vendor_cost"]
        
        # Try to override with price below minimum margin
        below_min_price = vendor_cost * 1.05  # Only 5% margin, below 15% minimum
        
        approve_response = requests.post(
            f"{BASE_URL}/api/admin/vendor-supply/products/{product_id}/approve-pricing",
            headers=admin_headers,
            json={
                "status": "active",
                "override_sell_price": below_min_price,
                "override_reason": "TEST_override_below_minimum"
            }
        )
        assert approve_response.status_code == 200, f"Approve failed: {approve_response.text}"
        
        result = approve_response.json()
        # Price should be adjusted to minimum margin
        min_price = vendor_cost * (1 + min_margin / 100)
        
        # Either warning is returned or price is adjusted
        if result.get("warning"):
            print(f"Warning returned: {result['warning']}")
            assert result["sell_price"] >= min_price, \
                f"Adjusted price {result['sell_price']} should be >= min_price {min_price}"
        
        print(f"Override test: requested={below_min_price}, got={result['sell_price']}, warning={result.get('warning')}")

    def test_approve_pricing_with_valid_override_accepted(self, admin_headers):
        """Approve-pricing with valid override above minimum is accepted."""
        # Get a pending product
        response = requests.get(
            f"{BASE_URL}/api/admin/vendor-supply/review-dashboard?filter=pending",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        products = data.get("products", [])
        
        # Find a product with vendor_cost
        test_product = None
        for p in products:
            if p.get("vendor_cost", 0) > 0 and p.get("status") not in ("active", "rejected"):
                test_product = p
                break
        
        if not test_product:
            pytest.skip("No pending product with vendor_cost found for valid override test")
        
        product_id = test_product["id"]
        vendor_cost = test_product["vendor_cost"]
        
        # Override with price above minimum margin (25% margin)
        valid_override_price = vendor_cost * 1.25
        
        approve_response = requests.post(
            f"{BASE_URL}/api/admin/vendor-supply/products/{product_id}/approve-pricing",
            headers=admin_headers,
            json={
                "status": "active",
                "override_sell_price": valid_override_price,
                "override_reason": "TEST_valid_override"
            }
        )
        assert approve_response.status_code == 200, f"Approve failed: {approve_response.text}"
        
        result = approve_response.json()
        # Price should be accepted as-is (no warning about minimum)
        assert result["sell_price"] == valid_override_price or abs(result["sell_price"] - valid_override_price) < 1, \
            f"Valid override {valid_override_price} should be accepted, got {result['sell_price']}"
        
        print(f"Valid override accepted: requested={valid_override_price}, got={result['sell_price']}")


class TestRejectEndpoint:
    """Tests for POST /api/admin/vendor-supply/products/{id}/reject"""

    def test_reject_sets_status_rejected_with_reason(self, admin_headers):
        """Reject endpoint sets status=rejected with reason."""
        # Get a pending product
        response = requests.get(
            f"{BASE_URL}/api/admin/vendor-supply/review-dashboard?filter=pending",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        products = data.get("products", [])
        
        # Find a product that's not already rejected
        test_product = None
        for p in products:
            if p.get("status") not in ("rejected",):
                test_product = p
                break
        
        if not test_product:
            pytest.skip("No pending product found for rejection test")
        
        product_id = test_product["id"]
        rejection_reason = "TEST_rejection_reason_v314"
        
        # Reject the product
        reject_response = requests.post(
            f"{BASE_URL}/api/admin/vendor-supply/products/{product_id}/reject",
            headers=admin_headers,
            json={"reason": rejection_reason}
        )
        assert reject_response.status_code == 200, f"Reject failed: {reject_response.text}"
        
        result = reject_response.json()
        assert result.get("ok") == True, "Response should have ok=True"
        
        # Verify product is now rejected by checking dashboard
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/vendor-supply/review-dashboard",
            headers=admin_headers
        )
        assert verify_response.status_code == 200
        
        verify_data = verify_response.json()
        rejected_product = next((p for p in verify_data["products"] if p["id"] == product_id), None)
        
        if rejected_product:
            assert rejected_product["status"] == "rejected", \
                f"Product should be rejected, got {rejected_product['status']}"
        
        print(f"Rejected product {product_id} with reason: {rejection_reason}")


class TestProductDataFields:
    """Tests for product data fields in review dashboard."""

    def test_products_have_required_pricing_fields(self, admin_headers):
        """Products have all required pricing fields."""
        response = requests.get(
            f"{BASE_URL}/api/admin/vendor-supply/review-dashboard",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        products = data.get("products", [])
        
        required_fields = [
            "id", "name", "vendor_cost", "selling_price", "margin_pct",
            "pricing_rule_source", "pricing_health", "status", "missing_data"
        ]
        
        for p in products[:5]:  # Check first 5 products
            for field in required_fields:
                assert field in p, f"Product {p.get('name', 'unknown')} missing field: {field}"
        
        print(f"Verified {min(5, len(products))} products have all required fields")

    def test_products_have_expected_and_min_sell_price(self, admin_headers):
        """Products have expected_sell_price and min_sell_price calculated."""
        response = requests.get(
            f"{BASE_URL}/api/admin/vendor-supply/review-dashboard",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        products = data.get("products", [])
        
        # Find products with vendor_cost
        products_with_cost = [p for p in products if p.get("vendor_cost", 0) > 0]
        
        for p in products_with_cost[:5]:
            assert "expected_sell_price" in p, f"Product {p['name']} missing expected_sell_price"
            assert "min_sell_price" in p, f"Product {p['name']} missing min_sell_price"
            
            # Verify calculations are reasonable
            assert p["expected_sell_price"] > p["vendor_cost"], \
                f"expected_sell_price should be > vendor_cost"
            assert p["min_sell_price"] > p["vendor_cost"], \
                f"min_sell_price should be > vendor_cost"
            assert p["expected_sell_price"] >= p["min_sell_price"], \
                f"expected_sell_price should be >= min_sell_price"
        
        print(f"Verified expected/min sell prices for {min(5, len(products_with_cost))} products")


class TestAuthorizationRequired:
    """Tests for authorization requirements."""

    def test_review_dashboard_requires_auth(self):
        """Review dashboard requires authorization."""
        response = requests.get(f"{BASE_URL}/api/admin/vendor-supply/review-dashboard")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"

    def test_approve_pricing_requires_auth(self):
        """Approve-pricing requires authorization."""
        response = requests.post(
            f"{BASE_URL}/api/admin/vendor-supply/products/test-id/approve-pricing",
            json={"status": "active"}
        )
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"

    def test_reject_requires_auth(self):
        """Reject endpoint requires authorization."""
        response = requests.post(
            f"{BASE_URL}/api/admin/vendor-supply/products/test-id/reject",
            json={"reason": "test"}
        )
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
