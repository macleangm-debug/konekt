"""
Test Suite for Settings Hub Preview Panel, Discount Analytics Dashboard, and Public Endpoint Consolidation
Iteration 223 - Testing:
1. GET /api/public/business-context (consolidated endpoint)
2. GET /api/public/branding (backwards compatible)
3. GET /api/public/payment-info (backwards compatible)
4. GET /api/admin/settings-hub (requires admin auth)
5. PUT /api/admin/settings-hub (requires admin auth)
6. GET /api/admin/discount-analytics/kpis (requires admin auth)
7. GET /api/admin/discount-analytics/trend (requires admin auth)
8. GET /api/admin/discount-analytics/top-products (requires admin auth)
9. GET /api/admin/discount-analytics/sales-behavior (requires admin auth)
10. GET /api/admin/discount-analytics/high-risk (requires admin auth)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Admin credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin JWT token for authenticated requests"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")


@pytest.fixture
def auth_headers(admin_token):
    """Headers with admin auth token"""
    return {"Authorization": f"Bearer {admin_token}"}


class TestPublicEndpoints:
    """Test public endpoints that don't require authentication"""

    def test_public_business_context_returns_branding_and_payment(self):
        """GET /api/public/business-context returns both branding and payment_info sections"""
        response = requests.get(f"{BASE_URL}/api/public/business-context")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify branding section exists
        assert "branding" in data, "Response should contain 'branding' section"
        branding = data["branding"]
        assert "brand_name" in branding
        assert "legal_name" in branding
        assert "tagline" in branding
        assert "primary_logo_url" in branding
        assert "primary_color" in branding
        assert "accent_color" in branding
        
        # Verify payment_info section exists
        assert "payment_info" in data, "Response should contain 'payment_info' section"
        payment = data["payment_info"]
        assert "account_name" in payment
        assert "account_number" in payment
        assert "bank_name" in payment
        print(f"PASS: /api/public/business-context returns branding and payment_info")

    def test_public_branding_backwards_compatible(self):
        """GET /api/public/branding still works (backwards compatible)"""
        response = requests.get(f"{BASE_URL}/api/public/branding")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Verify required branding fields
        required_fields = ["brand_name", "legal_name", "tagline", "primary_logo_url", 
                          "primary_color", "accent_color", "dark_bg_color"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        print(f"PASS: /api/public/branding is backwards compatible")

    def test_public_payment_info_backwards_compatible(self):
        """GET /api/public/payment-info still works (backwards compatible)"""
        response = requests.get(f"{BASE_URL}/api/public/payment-info")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Verify payment info fields
        expected_fields = ["account_name", "account_number", "bank_name", "swift_code", "currency"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        print(f"PASS: /api/public/payment-info is backwards compatible")


class TestAdminSettingsHubAuth:
    """Test admin settings hub authentication requirements"""

    def test_settings_hub_get_requires_auth(self):
        """GET /api/admin/settings-hub should return 403 without auth"""
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub")
        # Should be 401 or 403 without auth
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"PASS: GET /api/admin/settings-hub requires auth (returns {response.status_code})")

    def test_settings_hub_put_requires_auth(self):
        """PUT /api/admin/settings-hub should return 403 without auth"""
        response = requests.put(
            f"{BASE_URL}/api/admin/settings-hub",
            json={"business_profile": {"brand_name": "Test"}}
        )
        # Should be 401 or 403 without auth
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"PASS: PUT /api/admin/settings-hub requires auth (returns {response.status_code})")

    def test_settings_hub_get_with_auth(self, auth_headers):
        """GET /api/admin/settings-hub works with admin auth"""
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200 with auth, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify settings hub structure
        assert "business_profile" in data
        assert "branding" in data
        assert "commercial" in data
        print(f"PASS: GET /api/admin/settings-hub works with admin auth")

    def test_settings_hub_put_with_auth(self, auth_headers):
        """PUT /api/admin/settings-hub works with admin auth"""
        # First get current settings
        get_response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=auth_headers)
        current = get_response.json()
        
        # Update with same data (no actual change)
        response = requests.put(
            f"{BASE_URL}/api/admin/settings-hub",
            headers=auth_headers,
            json=current
        )
        assert response.status_code == 200, f"Expected 200 with auth, got {response.status_code}: {response.text}"
        print(f"PASS: PUT /api/admin/settings-hub works with admin auth")


class TestDiscountAnalyticsAuth:
    """Test discount analytics endpoints require admin authentication"""

    def test_kpis_requires_auth(self):
        """GET /api/admin/discount-analytics/kpis requires admin auth"""
        response = requests.get(f"{BASE_URL}/api/admin/discount-analytics/kpis?days=30")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"PASS: /api/admin/discount-analytics/kpis requires auth")

    def test_trend_requires_auth(self):
        """GET /api/admin/discount-analytics/trend requires admin auth"""
        response = requests.get(f"{BASE_URL}/api/admin/discount-analytics/trend?days=30")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"PASS: /api/admin/discount-analytics/trend requires auth")

    def test_top_products_requires_auth(self):
        """GET /api/admin/discount-analytics/top-products requires admin auth"""
        response = requests.get(f"{BASE_URL}/api/admin/discount-analytics/top-products?days=30")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"PASS: /api/admin/discount-analytics/top-products requires auth")

    def test_sales_behavior_requires_auth(self):
        """GET /api/admin/discount-analytics/sales-behavior requires admin auth"""
        response = requests.get(f"{BASE_URL}/api/admin/discount-analytics/sales-behavior?days=30")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"PASS: /api/admin/discount-analytics/sales-behavior requires auth")

    def test_high_risk_requires_auth(self):
        """GET /api/admin/discount-analytics/high-risk requires admin auth"""
        response = requests.get(f"{BASE_URL}/api/admin/discount-analytics/high-risk?days=30")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"PASS: /api/admin/discount-analytics/high-risk requires auth")


class TestDiscountAnalyticsWithAuth:
    """Test discount analytics endpoints with admin authentication"""

    def test_kpis_returns_data(self, auth_headers):
        """GET /api/admin/discount-analytics/kpis returns KPI data"""
        response = requests.get(
            f"{BASE_URL}/api/admin/discount-analytics/kpis?days=30",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify KPI fields exist (values may be 0 if no data)
        expected_fields = [
            "total_discounts_given", "average_discount_percent", "discounted_orders_count",
            "total_orders", "revenue_after_discounts", "approval_rate", "period_days"
        ]
        for field in expected_fields:
            assert field in data, f"Missing KPI field: {field}"
        print(f"PASS: /api/admin/discount-analytics/kpis returns KPI data: {data}")

    def test_trend_returns_array(self, auth_headers):
        """GET /api/admin/discount-analytics/trend returns trend array"""
        response = requests.get(
            f"{BASE_URL}/api/admin/discount-analytics/trend?days=30",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Trend should return a list"
        print(f"PASS: /api/admin/discount-analytics/trend returns array with {len(data)} items")

    def test_top_products_returns_array(self, auth_headers):
        """GET /api/admin/discount-analytics/top-products returns product array"""
        response = requests.get(
            f"{BASE_URL}/api/admin/discount-analytics/top-products?days=30",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Top products should return a list"
        print(f"PASS: /api/admin/discount-analytics/top-products returns array with {len(data)} items")

    def test_sales_behavior_returns_array(self, auth_headers):
        """GET /api/admin/discount-analytics/sales-behavior returns sales data"""
        response = requests.get(
            f"{BASE_URL}/api/admin/discount-analytics/sales-behavior?days=30",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Sales behavior should return a list"
        print(f"PASS: /api/admin/discount-analytics/sales-behavior returns array with {len(data)} items")

    def test_high_risk_returns_classified_data(self, auth_headers):
        """GET /api/admin/discount-analytics/high-risk returns risk-classified data"""
        response = requests.get(
            f"{BASE_URL}/api/admin/discount-analytics/high-risk?days=30",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "High risk should return a list"
        # If there's data, verify risk_level field
        if len(data) > 0:
            assert "risk_level" in data[0], "High risk items should have risk_level"
            assert data[0]["risk_level"] in ["safe", "warning", "critical"], "Invalid risk level"
        print(f"PASS: /api/admin/discount-analytics/high-risk returns array with {len(data)} items")


class TestDiscountAnalyticsQueryParams:
    """Test discount analytics query parameters"""

    def test_kpis_accepts_days_param(self, auth_headers):
        """KPIs endpoint accepts different days values"""
        for days in [7, 14, 30, 90]:
            response = requests.get(
                f"{BASE_URL}/api/admin/discount-analytics/kpis?days={days}",
                headers=auth_headers
            )
            assert response.status_code == 200, f"Failed for days={days}"
            data = response.json()
            assert data.get("period_days") == days, f"Expected period_days={days}"
        print(f"PASS: KPIs endpoint accepts various days parameters")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
