"""
Test Data Integrity Dashboard & Customer Portal Enhancements - Iteration 287
Tests:
1. Data Integrity Summary endpoint - health_score, total_issues, categories
2. Data Integrity Details endpoints - stuck_orders, overdue_invoices, pending_efd
3. Customer portal order detail endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
CUSTOMER_EMAIL = "test@konekt.tz"
CUSTOMER_PASSWORD = "TestUser123!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed")


@pytest.fixture(scope="module")
def customer_token():
    """Get customer authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": CUSTOMER_EMAIL,
        "password": CUSTOMER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Customer authentication failed")


class TestDataIntegritySummary:
    """Tests for GET /api/admin/data-integrity/summary"""
    
    def test_summary_returns_200(self, admin_token):
        """Summary endpoint returns 200 OK"""
        response = requests.get(
            f"{BASE_URL}/api/admin/data-integrity/summary",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        print(f"Summary endpoint returned 200 OK")
    
    def test_summary_has_health_score(self, admin_token):
        """Summary contains health_score (0-100)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/data-integrity/summary",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        assert "health_score" in data
        assert isinstance(data["health_score"], int)
        assert 0 <= data["health_score"] <= 100
        print(f"Health score: {data['health_score']}")
    
    def test_summary_has_total_issues(self, admin_token):
        """Summary contains total_issues count"""
        response = requests.get(
            f"{BASE_URL}/api/admin/data-integrity/summary",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        assert "total_issues" in data
        assert isinstance(data["total_issues"], int)
        assert data["total_issues"] >= 0
        print(f"Total issues: {data['total_issues']}")
    
    def test_summary_has_categories(self, admin_token):
        """Summary contains categories (compliance, orders, fulfillment)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/data-integrity/summary",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        assert "categories" in data
        categories = data["categories"]
        
        # Check compliance category
        assert "compliance" in categories
        compliance = categories["compliance"]
        assert "missing_vrn" in compliance
        assert "missing_brn" in compliance
        assert "pending_efd" in compliance
        print(f"Compliance: missing_vrn={compliance['missing_vrn']}, missing_brn={compliance['missing_brn']}, pending_efd={compliance['pending_efd']}")
        
        # Check orders category
        assert "orders" in categories
        orders = categories["orders"]
        assert "stuck_orders" in orders
        assert "orphan_orders" in orders
        assert "overdue_invoices" in orders
        print(f"Orders: stuck={orders['stuck_orders']}, orphan={orders['orphan_orders']}, overdue={orders['overdue_invoices']}")
        
        # Check fulfillment category
        assert "fulfillment" in categories
        fulfillment = categories["fulfillment"]
        assert "unconfirmed_deliveries" in fulfillment
        print(f"Fulfillment: unconfirmed_deliveries={fulfillment['unconfirmed_deliveries']}")
    
    def test_summary_has_context(self, admin_token):
        """Summary contains context with totals"""
        response = requests.get(
            f"{BASE_URL}/api/admin/data-integrity/summary",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        assert "context" in data
        context = data["context"]
        assert "total_customers" in context
        assert "total_orders" in context
        assert "total_invoices" in context
        print(f"Context: {context['total_customers']} customers, {context['total_orders']} orders, {context['total_invoices']} invoices")


class TestDataIntegrityDetails:
    """Tests for GET /api/admin/data-integrity/details/{category}"""
    
    def test_stuck_orders_returns_list(self, admin_token):
        """Stuck orders endpoint returns list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/data-integrity/details/stuck_orders",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Stuck orders: {len(data)} records")
        
        # Verify structure if records exist
        if len(data) > 0:
            record = data[0]
            assert "id" in record
            assert "order_number" in record or "status" in record
            print(f"Sample stuck order: {record.get('order_number', 'N/A')} - {record.get('status', 'N/A')}")
    
    def test_overdue_invoices_returns_list(self, admin_token):
        """Overdue invoices endpoint returns list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/data-integrity/details/overdue_invoices",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Overdue invoices: {len(data)} records")
        
        # Verify structure if records exist
        if len(data) > 0:
            record = data[0]
            assert "id" in record
            assert "invoice_number" in record or "due_date" in record
            print(f"Sample overdue invoice: {record.get('invoice_number', 'N/A')} - due {record.get('due_date', 'N/A')}")
    
    def test_pending_efd_returns_list(self, admin_token):
        """Pending EFD endpoint returns list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/data-integrity/details/pending_efd",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Pending EFD: {len(data)} records")
        
        # Verify structure if records exist
        if len(data) > 0:
            record = data[0]
            assert "id" in record
            assert "status" in record
            print(f"Sample pending EFD: {record.get('invoice_number', 'N/A')} - {record.get('status', 'N/A')}")
    
    def test_missing_vrn_returns_list(self, admin_token):
        """Missing VRN endpoint returns list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/data-integrity/details/missing_vrn",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Missing VRN: {len(data)} records")
    
    def test_unconfirmed_deliveries_returns_list(self, admin_token):
        """Unconfirmed deliveries endpoint returns list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/data-integrity/details/unconfirmed_deliveries",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Unconfirmed deliveries: {len(data)} records")
    
    def test_unknown_category_returns_empty(self, admin_token):
        """Unknown category returns empty list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/data-integrity/details/unknown_category",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0
        print("Unknown category returns empty list as expected")


class TestCustomerPortal:
    """Tests for customer portal endpoints"""
    
    def test_customer_login_works(self, customer_token):
        """Customer can login successfully"""
        assert customer_token is not None
        print("Customer login successful")
    
    def test_customer_orders_endpoint(self, customer_token):
        """Customer orders endpoint returns list"""
        response = requests.get(
            f"{BASE_URL}/api/customer/orders",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        # May return 200 with orders or 404 if no orders
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            print(f"Customer has {len(data) if isinstance(data, list) else 'some'} orders")
        else:
            print("Customer has no orders (404)")
    
    def test_customer_quotes_endpoint(self, customer_token):
        """Customer quotes endpoint returns list"""
        response = requests.get(
            f"{BASE_URL}/api/customer/quotes",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        # May return 200 with quotes or 404 if no quotes
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            print(f"Customer has {len(data) if isinstance(data, list) else 'some'} quotes")
        else:
            print("Customer has no quotes (404)")
    
    def test_customer_invoices_endpoint(self, customer_token):
        """Customer invoices endpoint returns list"""
        response = requests.get(
            f"{BASE_URL}/api/customer/invoices",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        # May return 200 with invoices or 404 if no invoices
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            print(f"Customer has {len(data) if isinstance(data, list) else 'some'} invoices")
        else:
            print("Customer has no invoices (404)")


class TestAdminNavigation:
    """Tests to verify Data Integrity is accessible in admin navigation"""
    
    def test_admin_can_access_data_integrity(self, admin_token):
        """Admin can access data integrity endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/admin/data-integrity/summary",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        print("Admin can access Data Integrity dashboard")
