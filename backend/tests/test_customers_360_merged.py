"""
Test Suite: Merged Customers 360 Page
Tests the new /api/admin/customers-360 endpoints that combine customer list with aggregated data
and provide full 360 detail view with recent transactions.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
DEMO_CUSTOMER_ID = "7137e786-0978-42fc-99d4-f2395023b865"
DEMO_CUSTOMER_EMAIL = "demo.customer@konekt.com"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/admin/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Admin auth failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Headers with admin auth token"""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


class TestCustomers360ListEndpoint:
    """Tests for GET /api/admin/customers-360/list"""

    def test_list_returns_200(self, admin_headers):
        """Test that customers 360 list endpoint returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/admin/customers-360/list",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: GET /api/admin/customers-360/list returns 200 with {len(data)} customers")

    def test_list_contains_required_fields(self, admin_headers):
        """Test that each customer in list has required fields"""
        response = requests.get(
            f"{BASE_URL}/api/admin/customers-360/list",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            customer = data[0]
            required_fields = [
                "id", "name", "email", "company", "type",
                "total_orders", "active_invoices", "status", "last_activity_at"
            ]
            for field in required_fields:
                assert field in customer, f"Missing required field: {field}"
            print(f"PASS: Customer list contains all required fields: {required_fields}")
        else:
            pytest.skip("No customers in list to verify fields")

    def test_list_search_by_name(self, admin_headers):
        """Test search parameter filters by name"""
        response = requests.get(
            f"{BASE_URL}/api/admin/customers-360/list",
            headers=admin_headers,
            params={"search": "demo"}
        )
        assert response.status_code == 200
        data = response.json()
        # Should find demo customer
        print(f"PASS: Search by 'demo' returned {len(data)} results")

    def test_list_search_by_email(self, admin_headers):
        """Test search parameter filters by email"""
        response = requests.get(
            f"{BASE_URL}/api/admin/customers-360/list",
            headers=admin_headers,
            params={"search": "demo.customer@konekt.com"}
        )
        assert response.status_code == 200
        data = response.json()
        print(f"PASS: Search by email returned {len(data)} results")

    def test_list_filter_status_active(self, admin_headers):
        """Test status=active filter"""
        response = requests.get(
            f"{BASE_URL}/api/admin/customers-360/list",
            headers=admin_headers,
            params={"status": "active"}
        )
        assert response.status_code == 200
        data = response.json()
        # All returned customers should be active
        for customer in data:
            assert customer.get("status") == "active", f"Expected active status, got {customer.get('status')}"
        print(f"PASS: status=active filter returned {len(data)} active customers")

    def test_list_filter_status_inactive(self, admin_headers):
        """Test status=inactive filter"""
        response = requests.get(
            f"{BASE_URL}/api/admin/customers-360/list",
            headers=admin_headers,
            params={"status": "inactive"}
        )
        assert response.status_code == 200
        data = response.json()
        # All returned customers should be inactive
        for customer in data:
            assert customer.get("status") == "inactive", f"Expected inactive status, got {customer.get('status')}"
        print(f"PASS: status=inactive filter returned {len(data)} inactive customers")


class TestCustomers360DetailEndpoint:
    """Tests for GET /api/admin/customers-360/{customer_id}"""

    def test_detail_by_id_returns_200(self, admin_headers):
        """Test that customer 360 detail by ID returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/admin/customers-360/{DEMO_CUSTOMER_ID}",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("id") == DEMO_CUSTOMER_ID
        print(f"PASS: GET /api/admin/customers-360/{DEMO_CUSTOMER_ID} returns 200")

    def test_detail_by_email_returns_200(self, admin_headers):
        """Test that customer 360 detail by email returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/admin/customers-360/{DEMO_CUSTOMER_EMAIL}",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("email") == DEMO_CUSTOMER_EMAIL
        print(f"PASS: GET /api/admin/customers-360/{DEMO_CUSTOMER_EMAIL} returns 200")

    def test_detail_contains_summary_section(self, admin_headers):
        """Test that detail response contains summary with totals"""
        response = requests.get(
            f"{BASE_URL}/api/admin/customers-360/{DEMO_CUSTOMER_ID}",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "summary" in data, "Missing summary section"
        summary = data["summary"]
        summary_fields = ["total_quotes", "total_invoices", "total_orders", "unpaid_invoices"]
        for field in summary_fields:
            assert field in summary, f"Missing summary field: {field}"
        print(f"PASS: Detail contains summary with fields: {summary_fields}")
        print(f"  Summary values: quotes={summary['total_quotes']}, invoices={summary['total_invoices']}, orders={summary['total_orders']}, unpaid={summary['unpaid_invoices']}")

    def test_detail_contains_recent_transactions(self, admin_headers):
        """Test that detail response contains recent quotes, invoices, orders"""
        response = requests.get(
            f"{BASE_URL}/api/admin/customers-360/{DEMO_CUSTOMER_ID}",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "recent_quotes" in data, "Missing recent_quotes"
        assert "recent_invoices" in data, "Missing recent_invoices"
        assert "recent_orders" in data, "Missing recent_orders"
        
        assert isinstance(data["recent_quotes"], list)
        assert isinstance(data["recent_invoices"], list)
        assert isinstance(data["recent_orders"], list)
        
        print(f"PASS: Detail contains recent transactions:")
        print(f"  recent_quotes: {len(data['recent_quotes'])} items")
        print(f"  recent_invoices: {len(data['recent_invoices'])} items")
        print(f"  recent_orders: {len(data['recent_orders'])} items")

    def test_detail_contains_profile_fields(self, admin_headers):
        """Test that detail response contains profile fields"""
        response = requests.get(
            f"{BASE_URL}/api/admin/customers-360/{DEMO_CUSTOMER_ID}",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        profile_fields = ["name", "email", "company", "type", "phone", "status", "created_at", "last_activity_at"]
        for field in profile_fields:
            assert field in data, f"Missing profile field: {field}"
        print(f"PASS: Detail contains profile fields: {profile_fields}")

    def test_detail_contains_assigned_sales(self, admin_headers):
        """Test that detail response contains assigned_sales section"""
        response = requests.get(
            f"{BASE_URL}/api/admin/customers-360/{DEMO_CUSTOMER_ID}",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "assigned_sales" in data, "Missing assigned_sales section"
        sales = data["assigned_sales"]
        assert "name" in sales
        assert "phone" in sales
        assert "email" in sales
        print(f"PASS: Detail contains assigned_sales: {sales}")

    def test_detail_not_found_returns_404(self, admin_headers):
        """Test that non-existent customer returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/admin/customers-360/non-existent-id-12345",
            headers=admin_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Non-existent customer returns 404")


class TestRegressionOtherAdminRoutes:
    """Regression tests for other admin routes that should still work"""

    def test_payments_queue_still_works(self, admin_headers):
        """Regression: /admin/payments still loads PaymentsQueuePage"""
        response = requests.get(
            f"{BASE_URL}/api/admin/payments/queue",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: /api/admin/payments/queue still works")

    def test_orders_endpoint_still_works(self, admin_headers):
        """Regression: /admin/orders still loads OrdersPage"""
        response = requests.get(
            f"{BASE_URL}/api/admin/orders-ops",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: /api/admin/orders-ops still works")

    def test_quotes_endpoint_still_works(self, admin_headers):
        """Regression: /admin/quotes still loads QuotesRequestsPage"""
        response = requests.get(
            f"{BASE_URL}/api/admin/quotes-v2",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: /api/admin/quotes-v2 still works")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
