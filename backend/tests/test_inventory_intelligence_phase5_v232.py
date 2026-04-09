"""
Phase 5: Inventory & Product Intelligence Tests
Tests for GET /api/admin/reports/inventory-intelligence endpoint
and regression tests for existing dashboards and reports.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
SALES_MANAGER_EMAIL = "sales.manager@konekt.co.tz"
SALES_MANAGER_PASSWORD = "Manager123!"
FINANCE_MANAGER_EMAIL = "finance@konekt.co.tz"
FINANCE_MANAGER_PASSWORD = "Finance123!"


def get_auth_token(email: str, password: str) -> str:
    """Get JWT token for a user."""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
    if resp.status_code == 200:
        return resp.json().get("token", "")
    return ""


@pytest.fixture(scope="module")
def admin_token():
    """Admin auth token."""
    token = get_auth_token(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not token:
        pytest.skip("Admin login failed - skipping tests")
    return token


@pytest.fixture(scope="module")
def sales_manager_token():
    """Sales Manager auth token."""
    token = get_auth_token(SALES_MANAGER_EMAIL, SALES_MANAGER_PASSWORD)
    if not token:
        pytest.skip("Sales Manager login failed - skipping tests")
    return token


@pytest.fixture(scope="module")
def finance_manager_token():
    """Finance Manager auth token."""
    token = get_auth_token(FINANCE_MANAGER_EMAIL, FINANCE_MANAGER_PASSWORD)
    if not token:
        pytest.skip("Finance Manager login failed - skipping tests")
    return token


class TestInventoryIntelligenceAPI:
    """Tests for GET /api/admin/reports/inventory-intelligence endpoint."""

    def test_endpoint_returns_200(self, admin_token):
        """Test that the endpoint returns 200 OK."""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/inventory-intelligence?days=180",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print("✓ Inventory Intelligence endpoint returns 200")

    def test_response_has_kpis(self, admin_token):
        """Test that response contains kpis object with required fields."""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/inventory-intelligence?days=180",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = resp.json()
        assert "kpis" in data, "Response missing 'kpis' object"
        kpis = data["kpis"]
        
        required_kpi_fields = [
            "total_products", "total_units_sold", "total_product_revenue",
            "top_product", "fast_products", "slow_products", "dead_products"
        ]
        for field in required_kpi_fields:
            assert field in kpis, f"KPIs missing '{field}'"
        print(f"✓ KPIs present: total_products={kpis['total_products']}, fast={kpis['fast_products']}, slow={kpis['slow_products']}, dead={kpis['dead_products']}")

    def test_response_has_products_array(self, admin_token):
        """Test that response contains products array with classification and trend."""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/inventory-intelligence?days=180",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = resp.json()
        assert "products" in data, "Response missing 'products' array"
        products = data["products"]
        assert isinstance(products, list), "products should be a list"
        
        if len(products) > 0:
            product = products[0]
            assert "classification" in product, "Product missing 'classification'"
            assert "trend" in product, "Product missing 'trend'"
            assert product["classification"] in ["fast", "moderate", "slow", "dead"], f"Invalid classification: {product['classification']}"
            assert product["trend"] in ["increasing", "decreasing", "stable"], f"Invalid trend: {product['trend']}"
            print(f"✓ Products array has {len(products)} items with classification and trend")
        else:
            print("✓ Products array is empty (no product data)")

    def test_response_has_charts(self, admin_token):
        """Test that response contains charts object with required chart data."""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/inventory-intelligence?days=180",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = resp.json()
        assert "charts" in data, "Response missing 'charts' object"
        charts = data["charts"]
        
        required_charts = ["top_10_revenue", "classification_distribution", "sales_trend"]
        for chart in required_charts:
            assert chart in charts, f"Charts missing '{chart}'"
        
        # Validate classification_distribution structure
        class_dist = charts["classification_distribution"]
        assert isinstance(class_dist, list), "classification_distribution should be a list"
        if len(class_dist) > 0:
            assert "name" in class_dist[0], "classification_distribution items should have 'name'"
            assert "value" in class_dist[0], "classification_distribution items should have 'value'"
        
        print(f"✓ Charts present: top_10_revenue ({len(charts['top_10_revenue'])} items), classification_distribution ({len(class_dist)} items), sales_trend ({len(charts['sales_trend'])} items)")

    def test_response_has_procurement(self, admin_token):
        """Test that response contains procurement object with required fields."""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/inventory-intelligence?days=180",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = resp.json()
        assert "procurement" in data, "Response missing 'procurement' object"
        procurement = data["procurement"]
        
        required_procurement_fields = [
            "restock_recommendations", "review_remove", "top_vendors", "weak_vendors"
        ]
        for field in required_procurement_fields:
            assert field in procurement, f"Procurement missing '{field}'"
            assert isinstance(procurement[field], list), f"procurement.{field} should be a list"
        
        print(f"✓ Procurement present: restock={len(procurement['restock_recommendations'])}, review_remove={len(procurement['review_remove'])}, top_vendors={len(procurement['top_vendors'])}, weak_vendors={len(procurement['weak_vendors'])}")

    def test_days_filter_works(self, admin_token):
        """Test that days filter parameter works for different values."""
        for days in [30, 90, 180, 365]:
            resp = requests.get(
                f"{BASE_URL}/api/admin/reports/inventory-intelligence?days={days}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert resp.status_code == 200, f"Days={days} failed with {resp.status_code}"
        print("✓ Days filter works for 30/90/180/365")


class TestInventoryIntelligenceRoleAccess:
    """Test that different roles can access the inventory intelligence endpoint."""

    def test_admin_can_access(self, admin_token):
        """Admin should be able to access inventory intelligence."""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/inventory-intelligence?days=180",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200, f"Admin access failed: {resp.status_code}"
        print("✓ Admin can access Inventory Intelligence API")

    def test_sales_manager_can_access(self, sales_manager_token):
        """Sales Manager should be able to access inventory intelligence."""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/inventory-intelligence?days=180",
            headers={"Authorization": f"Bearer {sales_manager_token}"}
        )
        assert resp.status_code == 200, f"Sales Manager access failed: {resp.status_code}"
        print("✓ Sales Manager can access Inventory Intelligence API")

    def test_finance_manager_can_access(self, finance_manager_token):
        """Finance Manager should be able to access inventory intelligence."""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/inventory-intelligence?days=180",
            headers={"Authorization": f"Bearer {finance_manager_token}"}
        )
        assert resp.status_code == 200, f"Finance Manager access failed: {resp.status_code}"
        print("✓ Finance Manager can access Inventory Intelligence API")


class TestRegressionDashboards:
    """Regression tests for existing dashboards."""

    def test_admin_dashboard_kpis_still_works(self, admin_token):
        """Admin dashboard KPIs endpoint should still work."""
        resp = requests.get(
            f"{BASE_URL}/api/admin/dashboard/kpis",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200, f"Admin dashboard KPIs failed: {resp.status_code}"
        data = resp.json()
        assert "kpis" in data, "Admin dashboard missing 'kpis'"
        print("✓ Admin dashboard KPIs endpoint still works")

    def test_sales_manager_team_kpis_still_works(self, sales_manager_token):
        """Sales Manager team KPIs endpoint should still work."""
        resp = requests.get(
            f"{BASE_URL}/api/admin/dashboard/team-kpis",
            headers={"Authorization": f"Bearer {sales_manager_token}"}
        )
        assert resp.status_code == 200, f"Sales Manager team KPIs failed: {resp.status_code}"
        data = resp.json()
        assert "team_kpis" in data, "Sales Manager dashboard missing 'team_kpis'"
        print("✓ Sales Manager team KPIs endpoint still works")

    def test_finance_manager_finance_kpis_still_works(self, finance_manager_token):
        """Finance Manager finance KPIs endpoint should still work."""
        resp = requests.get(
            f"{BASE_URL}/api/admin/dashboard/finance-kpis",
            headers={"Authorization": f"Bearer {finance_manager_token}"}
        )
        assert resp.status_code == 200, f"Finance Manager finance KPIs failed: {resp.status_code}"
        data = resp.json()
        assert "finance_kpis" in data, "Finance Manager dashboard missing 'finance_kpis'"
        print("✓ Finance Manager finance KPIs endpoint still works")


class TestRegressionReports:
    """Regression tests for existing report endpoints."""

    def test_business_health_report_still_works(self, admin_token):
        """Business Health report endpoint should still work."""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/business-health?days=180",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200, f"Business Health report failed: {resp.status_code}"
        data = resp.json()
        assert "kpis" in data, "Business Health missing 'kpis'"
        assert "charts" in data, "Business Health missing 'charts'"
        print("✓ Business Health report endpoint still works")

    def test_financial_reports_still_works(self, admin_token):
        """Financial Reports endpoint should still work."""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/financial?days=180",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200, f"Financial Reports failed: {resp.status_code}"
        data = resp.json()
        assert "kpis" in data, "Financial Reports missing 'kpis'"
        assert "charts" in data, "Financial Reports missing 'charts'"
        print("✓ Financial Reports endpoint still works")

    def test_sales_reports_still_works(self, admin_token):
        """Sales Reports endpoint should still work."""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/sales?days=180",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200, f"Sales Reports failed: {resp.status_code}"
        data = resp.json()
        assert "kpis" in data, "Sales Reports missing 'kpis'"
        assert "team_table" in data, "Sales Reports missing 'team_table'"
        print("✓ Sales Reports endpoint still works")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
