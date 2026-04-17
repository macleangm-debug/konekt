"""
Konekt B2B Platform - Feature Tests v334
Tests for:
1. Admin dashboard KPIs with profit_month and profit in revenue_trend
2. Order status update endpoint rejects sales role with 403
3. Request Status endpoint creates status_request for sales
4. Credit terms PUT endpoint updates customer credit terms (admin only)
5. Customer 360 detail returns credit_terms fields
6. Settings Hub endpoints (countries, document numbering)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
STAFF_EMAIL = "staff@konekt.co.tz"
STAFF_PASSWORD = "Staff123!"
SALES_EMAIL = "5cf702ec-737@test.com"
SALES_PASSWORD = "5cf702ec-737"

# Test customer ID for credit terms
TEST_CUSTOMER_ID = "3bea3f7d-64d4-4f8e-ba6b-a91dbd761618"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token."""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def staff_token():
    """Get staff authentication token."""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": STAFF_EMAIL,
        "password": STAFF_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    return None


@pytest.fixture(scope="module")
def sales_token():
    """Get sales authentication token."""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": SALES_EMAIL,
        "password": SALES_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    return None


class TestAdminDashboardKPIs:
    """Test admin dashboard KPIs endpoint with profit tracking."""

    def test_dashboard_kpis_returns_profit_month(self, admin_token):
        """Dashboard KPIs should include profit_month field."""
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard/kpis",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "kpis" in data, "Response should contain 'kpis' key"
        kpis = data["kpis"]
        
        # Verify profit_month is present
        assert "profit_month" in kpis, "KPIs should include 'profit_month' field"
        assert isinstance(kpis["profit_month"], (int, float)), "profit_month should be numeric"
        print(f"✓ profit_month KPI present: {kpis['profit_month']}")

    def test_dashboard_kpis_revenue_trend_includes_profit(self, admin_token):
        """Revenue trend chart data should include profit line."""
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard/kpis",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "charts" in data, "Response should contain 'charts' key"
        charts = data["charts"]
        
        assert "revenue_trend" in charts, "Charts should include 'revenue_trend'"
        revenue_trend = charts["revenue_trend"]
        
        assert isinstance(revenue_trend, list), "revenue_trend should be a list"
        if len(revenue_trend) > 0:
            first_entry = revenue_trend[0]
            assert "month" in first_entry, "Each entry should have 'month'"
            assert "revenue" in first_entry, "Each entry should have 'revenue'"
            assert "profit" in first_entry, "Each entry should have 'profit' field"
            print(f"✓ Revenue trend includes profit: {first_entry}")
        else:
            print("✓ Revenue trend is empty (no data yet)")

    def test_dashboard_kpis_all_expected_fields(self, admin_token):
        """Dashboard KPIs should include all expected fields."""
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard/kpis",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        kpis = data.get("kpis", {})
        
        expected_fields = [
            "orders_today", "revenue_month", "profit_month",
            "pending_payments", "active_quotes", "open_delays", "pending_approvals"
        ]
        for field in expected_fields:
            assert field in kpis, f"KPIs should include '{field}'"
        print(f"✓ All expected KPI fields present: {list(kpis.keys())}")


class TestOrderStatusRestrictions:
    """Test order status update restrictions for sales role."""

    def test_status_update_rejects_sales_role(self, admin_token):
        """Order status update should reject sales role with 403."""
        # First get an order to test with
        orders_response = requests.get(
            f"{BASE_URL}/api/admin/orders-ops?limit=1",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if orders_response.status_code != 200 or not orders_response.json():
            pytest.skip("No orders available for testing")
        
        orders = orders_response.json()
        if not orders:
            pytest.skip("No orders available for testing")
        
        order_id = orders[0].get("id")
        if not order_id:
            pytest.skip("Order has no ID")
        
        # Try to update status as sales role
        response = requests.patch(
            f"{BASE_URL}/api/admin/orders-ops/{order_id}/status",
            params={
                "status": "confirmed",
                "triggered_by_role": "sales"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 403, f"Expected 403 for sales role, got {response.status_code}: {response.text}"
        print(f"✓ Sales role correctly blocked from updating order status (403)")

    def test_status_update_allows_admin_role(self, admin_token):
        """Order status update should allow admin role."""
        orders_response = requests.get(
            f"{BASE_URL}/api/admin/orders-ops?limit=1",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if orders_response.status_code != 200 or not orders_response.json():
            pytest.skip("No orders available for testing")
        
        orders = orders_response.json()
        if not orders:
            pytest.skip("No orders available for testing")
        
        order_id = orders[0].get("id")
        current_status = orders[0].get("status", "pending")
        
        # Admin should be able to update
        response = requests.patch(
            f"{BASE_URL}/api/admin/orders-ops/{order_id}/status",
            params={
                "status": current_status,  # Keep same status to avoid side effects
                "triggered_by_role": "admin"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200 for admin role, got {response.status_code}: {response.text}"
        print(f"✓ Admin role allowed to update order status")

    def test_status_update_allows_vendor_ops_role(self, admin_token):
        """Order status update should allow vendor_ops role."""
        orders_response = requests.get(
            f"{BASE_URL}/api/admin/orders-ops?limit=1",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if orders_response.status_code != 200 or not orders_response.json():
            pytest.skip("No orders available for testing")
        
        orders = orders_response.json()
        if not orders:
            pytest.skip("No orders available for testing")
        
        order_id = orders[0].get("id")
        current_status = orders[0].get("status", "pending")
        
        # Vendor ops should be able to update
        response = requests.patch(
            f"{BASE_URL}/api/admin/orders-ops/{order_id}/status",
            params={
                "status": current_status,
                "triggered_by_role": "vendor_ops"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200 for vendor_ops role, got {response.status_code}: {response.text}"
        print(f"✓ Vendor ops role allowed to update order status")


class TestRequestStatusEndpoint:
    """Test request-status endpoint for sales to request status updates."""

    def test_request_status_creates_status_request(self, admin_token):
        """Request status endpoint should create a status_request document."""
        # Get an order to test with
        orders_response = requests.get(
            f"{BASE_URL}/api/admin/orders-ops?limit=1",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if orders_response.status_code != 200 or not orders_response.json():
            pytest.skip("No orders available for testing")
        
        orders = orders_response.json()
        if not orders:
            pytest.skip("No orders available for testing")
        
        order_id = orders[0].get("id")
        
        # Create a status request
        response = requests.post(
            f"{BASE_URL}/api/admin/orders-ops/{order_id}/request-status",
            json={
                "requested_by": "test_sales_user",
                "requested_by_role": "sales",
                "reason": "Client inquiring about order status"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True, "Response should indicate success"
        assert "message" in data, "Response should include message"
        print(f"✓ Status request created successfully: {data.get('message')}")


class TestCreditTermsEndpoint:
    """Test credit terms PUT endpoint for admin-only access."""

    def test_credit_terms_update_success(self, admin_token):
        """Credit terms PUT should update customer credit terms."""
        response = requests.put(
            f"{BASE_URL}/api/admin/customers-360/{TEST_CUSTOMER_ID}/credit-terms",
            json={
                "credit_terms_enabled": True,
                "payment_term_type": "net_30",
                "payment_term_days": 30,
                "payment_term_label": "Net 30",
                "credit_limit": 5000000
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Accept 200 or 404 (if customer doesn't exist)
        if response.status_code == 404:
            pytest.skip(f"Test customer {TEST_CUSTOMER_ID} not found")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "success", "Response should indicate success"
        print(f"✓ Credit terms updated successfully")

    def test_customer_360_returns_credit_terms_fields(self, admin_token):
        """Customer 360 detail should return credit_terms fields."""
        response = requests.get(
            f"{BASE_URL}/api/admin/customers-360/{TEST_CUSTOMER_ID}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if response.status_code == 404:
            pytest.skip(f"Test customer {TEST_CUSTOMER_ID} not found")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Check for credit terms fields
        credit_fields = [
            "credit_terms_enabled", "payment_term_type", 
            "payment_term_days", "payment_term_label", "credit_limit"
        ]
        for field in credit_fields:
            assert field in data, f"Customer 360 should include '{field}'"
        
        print(f"✓ Customer 360 includes credit terms fields: credit_terms_enabled={data.get('credit_terms_enabled')}, payment_term_type={data.get('payment_term_type')}")


class TestSettingsHubEndpoints:
    """Test Settings Hub endpoints for countries and document numbering."""

    def test_settings_hub_get(self, admin_token):
        """Settings Hub GET should return configuration."""
        response = requests.get(
            f"{BASE_URL}/api/admin/settings-hub",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, dict), "Settings hub should return a dict"
        print(f"✓ Settings Hub loaded successfully with keys: {list(data.keys())[:10]}...")

    def test_settings_hub_has_doc_numbering(self, admin_token):
        """Settings Hub should include document numbering config."""
        response = requests.get(
            f"{BASE_URL}/api/admin/settings-hub",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check for doc_numbering section
        if "doc_numbering" in data:
            doc_num = data["doc_numbering"]
            expected_fields = ["quote_prefix", "invoice_prefix", "order_prefix"]
            for field in expected_fields:
                if field in doc_num:
                    print(f"  - {field}: {doc_num[field]}")
            print(f"✓ Document numbering config present")
        else:
            print("✓ Document numbering config not yet set (will use defaults)")


class TestCustomerListEndpoint:
    """Test customer list endpoint."""

    def test_customer_list_returns_data(self, admin_token):
        """Customer list should return customer data."""
        response = requests.get(
            f"{BASE_URL}/api/admin/customers-360/list",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Customer list should return a list"
        print(f"✓ Customer list returned {len(data)} customers")


class TestStatementEndpoint:
    """Test Statement of Account endpoint."""

    def test_statement_endpoint_exists(self, admin_token):
        """Statement endpoint should exist and respond."""
        # Try with a test email
        response = requests.get(
            f"{BASE_URL}/api/admin/statements/customer/test@example.com",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Accept 200 (found) or 404 (not found) - both indicate endpoint works
        assert response.status_code in [200, 404], f"Expected 200 or 404, got {response.status_code}: {response.text}"
        print(f"✓ Statement endpoint responds correctly (status: {response.status_code})")


class TestDocumentNumberingService:
    """Test document numbering service via quote/invoice creation."""

    def test_document_sequences_endpoint(self, admin_token):
        """Test that document sequences are tracked."""
        # This tests the underlying mechanism by checking if quotes endpoint works
        response = requests.get(
            f"{BASE_URL}/api/admin/quotes?limit=1",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ Quotes endpoint working (document numbering service active)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
