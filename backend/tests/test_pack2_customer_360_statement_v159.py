"""
Pack 2 - Customer 360 + Statement of Account Tests
Tests for:
- Admin Customers 360 API endpoints (list, stats, detail, statement, orders, invoices, quotes, requests, payments)
- Customer-facing statement endpoint
- CustomerLinkCell integration (clickable customer names)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://konekt-payments-fix.preview.emergentagent.com').rstrip('/')

# Test credentials from test_credentials.md
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
CUSTOMER_EMAIL = "demo.customer@konekt.com"
CUSTOMER_PASSWORD = "Demo123!"


class TestAdminAuth:
    """Admin authentication tests"""
    
    def test_admin_login_success(self):
        """Test admin login returns token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["role"] in ["admin", "sales", "marketing", "production"], f"Invalid role: {data['user']['role']}"
        print(f"✓ Admin login successful, role: {data['user']['role']}")


class TestCustomerAuth:
    """Customer authentication tests"""
    
    def test_customer_login_success(self):
        """Test customer login returns token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200, f"Customer login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert "user" in data, "No user in response"
        print(f"✓ Customer login successful, user: {data['user']['email']}")


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
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


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Admin request headers"""
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def customer_headers(customer_token):
    """Customer request headers"""
    return {"Authorization": f"Bearer {customer_token}", "Content-Type": "application/json"}


class TestCustomers360Stats:
    """Test /api/admin/customers-360/stats endpoint"""
    
    def test_stats_returns_correct_structure(self, admin_headers):
        """Stats endpoint returns all required fields"""
        response = requests.get(f"{BASE_URL}/api/admin/customers-360/stats", headers=admin_headers)
        assert response.status_code == 200, f"Stats failed: {response.text}"
        data = response.json()
        
        # Verify all required fields exist
        required_fields = ["total", "active", "at_risk", "inactive", "with_unpaid_invoices", "with_active_orders"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
            assert isinstance(data[field], int), f"Field {field} should be int, got {type(data[field])}"
        
        print(f"✓ Stats: total={data['total']}, active={data['active']}, at_risk={data['at_risk']}, inactive={data['inactive']}")
        print(f"  with_unpaid_invoices={data['with_unpaid_invoices']}, with_active_orders={data['with_active_orders']}")


class TestCustomers360List:
    """Test /api/admin/customers-360/list endpoint"""
    
    def test_list_returns_customers(self, admin_headers):
        """List endpoint returns customer array"""
        response = requests.get(f"{BASE_URL}/api/admin/customers-360/list", headers=admin_headers)
        assert response.status_code == 200, f"List failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Customer list returned {len(data)} customers")
        
        if len(data) > 0:
            customer = data[0]
            # Verify customer structure
            expected_fields = ["id", "name", "email", "status", "total_orders", "active_invoices"]
            for field in expected_fields:
                assert field in customer, f"Missing field in customer: {field}"
            print(f"  First customer: {customer.get('name')} ({customer.get('email')}), status={customer.get('status')}")
    
    def test_list_with_search_filter(self, admin_headers):
        """List endpoint supports search parameter"""
        response = requests.get(f"{BASE_URL}/api/admin/customers-360/list?search=demo", headers=admin_headers)
        assert response.status_code == 200, f"Search failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Search 'demo' returned {len(data)} customers")
    
    def test_list_with_status_filter(self, admin_headers):
        """List endpoint supports status filter"""
        for status in ["active", "at_risk", "inactive"]:
            response = requests.get(f"{BASE_URL}/api/admin/customers-360/list?status={status}", headers=admin_headers)
            assert response.status_code == 200, f"Status filter '{status}' failed: {response.text}"
            data = response.json()
            assert isinstance(data, list), "Response should be a list"
            # Verify all returned customers have the correct status
            for customer in data:
                assert customer.get("status") == status, f"Customer has wrong status: {customer.get('status')} != {status}"
            print(f"✓ Status filter '{status}' returned {len(data)} customers")


class TestCustomer360Detail:
    """Test /api/admin/customers-360/{id} endpoint"""
    
    @pytest.fixture
    def customer_id(self, admin_headers):
        """Get a customer ID from the list"""
        response = requests.get(f"{BASE_URL}/api/admin/customers-360/list?limit=1", headers=admin_headers)
        if response.status_code == 200 and len(response.json()) > 0:
            return response.json()[0]["id"]
        pytest.skip("No customers available for testing")
    
    def test_detail_returns_enriched_data(self, admin_headers, customer_id):
        """Detail endpoint returns enriched customer data with profile_kpis and summary"""
        response = requests.get(f"{BASE_URL}/api/admin/customers-360/{customer_id}", headers=admin_headers)
        assert response.status_code == 200, f"Detail failed: {response.text}"
        data = response.json()
        
        # Verify basic fields
        basic_fields = ["id", "name", "email", "status", "created_at"]
        for field in basic_fields:
            assert field in data, f"Missing basic field: {field}"
        
        # Verify profile_kpis (enriched KPIs)
        assert "profile_kpis" in data, "Missing profile_kpis"
        kpi_fields = ["total_revenue", "outstanding_balance", "total_paid", "avg_order_value", "payment_punctuality_pct"]
        for field in kpi_fields:
            assert field in data["profile_kpis"], f"Missing KPI field: {field}"
        
        # Verify summary counts
        assert "summary" in data, "Missing summary"
        summary_fields = ["total_orders", "active_orders", "total_invoices", "unpaid_invoices", "total_quotes", "total_requests", "total_payments"]
        for field in summary_fields:
            assert field in data["summary"], f"Missing summary field: {field}"
        
        # Verify assigned_sales structure
        assert "assigned_sales" in data, "Missing assigned_sales"
        
        print(f"✓ Customer detail for {data['name']}")
        print(f"  KPIs: revenue={data['profile_kpis']['total_revenue']}, outstanding={data['profile_kpis']['outstanding_balance']}")
        print(f"  Summary: orders={data['summary']['total_orders']}, invoices={data['summary']['total_invoices']}")
    
    def test_detail_not_found(self, admin_headers):
        """Detail endpoint returns 404 for non-existent customer"""
        response = requests.get(f"{BASE_URL}/api/admin/customers-360/nonexistent-id-12345", headers=admin_headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent customer returns 404")


class TestCustomer360Statement:
    """Test /api/admin/customers-360/{id}/statement endpoint"""
    
    @pytest.fixture
    def customer_id(self, admin_headers):
        """Get a customer ID from the list"""
        response = requests.get(f"{BASE_URL}/api/admin/customers-360/list?limit=1", headers=admin_headers)
        if response.status_code == 200 and len(response.json()) > 0:
            return response.json()[0]["id"]
        pytest.skip("No customers available for testing")
    
    def test_statement_returns_correct_structure(self, admin_headers, customer_id):
        """Statement endpoint returns ledger with opening/closing balance"""
        response = requests.get(f"{BASE_URL}/api/admin/customers-360/{customer_id}/statement", headers=admin_headers)
        assert response.status_code == 200, f"Statement failed: {response.text}"
        data = response.json()
        
        # Verify required fields
        required_fields = [
            "customer_id", "customer_name", "period_from", "period_to",
            "opening_balance", "opening_balance_fmt",
            "closing_balance", "closing_balance_fmt",
            "total_debits", "total_debits_fmt",
            "total_credits", "total_credits_fmt",
            "entries", "entry_count"
        ]
        for field in required_fields:
            assert field in data, f"Missing statement field: {field}"
        
        # Verify entries is a list
        assert isinstance(data["entries"], list), "entries should be a list"
        
        # Verify balance calculations
        assert isinstance(data["opening_balance"], (int, float)), "opening_balance should be numeric"
        assert isinstance(data["closing_balance"], (int, float)), "closing_balance should be numeric"
        
        print(f"✓ Statement for customer {data['customer_name']}")
        print(f"  Period: {data['period_from'][:10]} to {data['period_to'][:10]}")
        print(f"  Opening: {data['opening_balance_fmt']}, Closing: {data['closing_balance_fmt']}")
        print(f"  Entries: {data['entry_count']}")
    
    def test_statement_with_date_range(self, admin_headers, customer_id):
        """Statement endpoint supports date range filtering"""
        response = requests.get(
            f"{BASE_URL}/api/admin/customers-360/{customer_id}/statement?date_from=2024-01-01&date_to=2024-12-31",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Statement with date range failed: {response.text}"
        data = response.json()
        assert "entries" in data, "Missing entries"
        print(f"✓ Statement with date range returned {data['entry_count']} entries")


class TestCustomer360TransactionLists:
    """Test transaction list endpoints for Customer 360"""
    
    @pytest.fixture
    def customer_id(self, admin_headers):
        """Get a customer ID from the list"""
        response = requests.get(f"{BASE_URL}/api/admin/customers-360/list?limit=1", headers=admin_headers)
        if response.status_code == 200 and len(response.json()) > 0:
            return response.json()[0]["id"]
        pytest.skip("No customers available for testing")
    
    def test_orders_endpoint(self, admin_headers, customer_id):
        """Orders endpoint returns order list"""
        response = requests.get(f"{BASE_URL}/api/admin/customers-360/{customer_id}/orders", headers=admin_headers)
        assert response.status_code == 200, f"Orders failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Customer orders: {len(data)} orders")
        
        if len(data) > 0:
            order = data[0]
            assert "order_no" in order or "id" in order, "Order should have order_no or id"
    
    def test_invoices_endpoint(self, admin_headers, customer_id):
        """Invoices endpoint returns invoice list"""
        response = requests.get(f"{BASE_URL}/api/admin/customers-360/{customer_id}/invoices", headers=admin_headers)
        assert response.status_code == 200, f"Invoices failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Customer invoices: {len(data)} invoices")
    
    def test_quotes_endpoint(self, admin_headers, customer_id):
        """Quotes endpoint returns quote list"""
        response = requests.get(f"{BASE_URL}/api/admin/customers-360/{customer_id}/quotes", headers=admin_headers)
        assert response.status_code == 200, f"Quotes failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Customer quotes: {len(data)} quotes")
    
    def test_requests_endpoint(self, admin_headers, customer_id):
        """Requests endpoint returns request list"""
        response = requests.get(f"{BASE_URL}/api/admin/customers-360/{customer_id}/requests", headers=admin_headers)
        assert response.status_code == 200, f"Requests failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Customer requests: {len(data)} requests")
    
    def test_payments_endpoint(self, admin_headers, customer_id):
        """Payments endpoint returns payment list"""
        response = requests.get(f"{BASE_URL}/api/admin/customers-360/{customer_id}/payments", headers=admin_headers)
        assert response.status_code == 200, f"Payments failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Customer payments: {len(data)} payments")


class TestCustomerFacingStatement:
    """Test customer-facing statement endpoint /api/account/me/statement"""
    
    def test_customer_statement_returns_data(self, customer_headers):
        """Customer can access their own statement"""
        response = requests.get(f"{BASE_URL}/api/account/me/statement", headers=customer_headers)
        assert response.status_code == 200, f"Customer statement failed: {response.text}"
        data = response.json()
        
        # Verify required fields
        required_fields = [
            "customer_id", "opening_balance", "closing_balance",
            "total_debits", "total_credits", "entries"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"✓ Customer statement: opening={data.get('opening_balance_fmt', data['opening_balance'])}, closing={data.get('closing_balance_fmt', data['closing_balance'])}")
    
    def test_customer_statement_with_date_range(self, customer_headers):
        """Customer statement supports date range"""
        response = requests.get(
            f"{BASE_URL}/api/account/me/statement?date_from=2024-01-01&date_to=2025-12-31",
            headers=customer_headers
        )
        assert response.status_code == 200, f"Customer statement with date range failed: {response.text}"
        data = response.json()
        assert "entries" in data, "Missing entries"
        print(f"✓ Customer statement with date range: {data.get('entry_count', len(data['entries']))} entries")


class TestCustomerInvoicesAndPayments:
    """Test customer-facing invoices and payments endpoints"""
    
    def test_customer_invoices(self, customer_headers):
        """Customer can access their invoices"""
        response = requests.get(f"{BASE_URL}/api/account/me/invoices", headers=customer_headers)
        assert response.status_code == 200, f"Customer invoices failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Customer invoices: {len(data)} invoices")
    
    def test_customer_payments(self, customer_headers):
        """Customer can access their payments"""
        response = requests.get(f"{BASE_URL}/api/account/me/payments", headers=customer_headers)
        assert response.status_code == 200, f"Customer payments failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Customer payments: {len(data)} payments")


class TestAdminPagesWithCustomerLinks:
    """Test that admin pages that should have CustomerLinkCell have customer data"""
    
    def test_orders_page_has_customer_data(self, admin_headers):
        """Orders endpoint returns customer_id and customer_name for CustomerLinkCell"""
        response = requests.get(f"{BASE_URL}/api/admin/orders-ops", headers=admin_headers)
        assert response.status_code == 200, f"Orders failed: {response.text}"
        data = response.json()
        
        if isinstance(data, dict) and "orders" in data:
            orders = data["orders"]
        else:
            orders = data if isinstance(data, list) else []
        
        print(f"✓ Orders endpoint returned {len(orders)} orders")
        
        if len(orders) > 0:
            order = orders[0]
            # Check for customer fields that CustomerLinkCell needs
            has_customer_id = "customer_id" in order
            has_customer_name = "customer_name" in order
            print(f"  Order has customer_id: {has_customer_id}, customer_name: {has_customer_name}")
    
    def test_payments_queue_has_customer_data(self, admin_headers):
        """Payments queue returns customer_id and customer_name for CustomerLinkCell"""
        response = requests.get(f"{BASE_URL}/api/admin/payments/queue", headers=admin_headers)
        assert response.status_code == 200, f"Payments queue failed: {response.text}"
        data = response.json()
        
        payments = data if isinstance(data, list) else []
        print(f"✓ Payments queue returned {len(payments)} payments")
        
        if len(payments) > 0:
            payment = payments[0]
            has_customer_id = "customer_id" in payment
            has_customer_name = "customer_name" in payment
            print(f"  Payment has customer_id: {has_customer_id}, customer_name: {has_customer_name}")
    
    def test_invoices_has_customer_data(self, admin_headers):
        """Invoices endpoint returns customer_id and customer_name for CustomerLinkCell"""
        response = requests.get(f"{BASE_URL}/api/admin/invoices", headers=admin_headers)
        assert response.status_code == 200, f"Invoices failed: {response.text}"
        data = response.json()
        
        if isinstance(data, dict) and "invoices" in data:
            invoices = data["invoices"]
        else:
            invoices = data if isinstance(data, list) else []
        
        print(f"✓ Invoices endpoint returned {len(invoices)} invoices")
        
        if len(invoices) > 0:
            invoice = invoices[0]
            has_customer_id = "customer_id" in invoice
            has_customer_name = "customer_name" in invoice or "customer_company" in invoice
            print(f"  Invoice has customer_id: {has_customer_id}, customer_name: {has_customer_name}")
    
    def test_requests_inbox_has_customer_data(self, admin_headers):
        """Requests inbox returns customer_id for CustomerLinkCell"""
        response = requests.get(f"{BASE_URL}/api/admin/requests", headers=admin_headers)
        assert response.status_code == 200, f"Requests inbox failed: {response.text}"
        data = response.json()
        
        requests_list = data if isinstance(data, list) else []
        print(f"✓ Requests inbox returned {len(requests_list)} requests")
        
        if len(requests_list) > 0:
            req = requests_list[0]
            has_customer_id = "customer_id" in req
            has_guest_name = "guest_name" in req or "company_name" in req
            print(f"  Request has customer_id: {has_customer_id}, guest_name: {has_guest_name}")


class TestUnauthorizedAccess:
    """Test that endpoints require proper authentication"""
    
    def test_stats_requires_auth(self):
        """Stats endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/customers-360/stats")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Stats endpoint requires authentication")
    
    def test_list_requires_auth(self):
        """List endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/customers-360/list")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ List endpoint requires authentication")
    
    def test_customer_statement_requires_auth(self):
        """Customer statement requires authentication"""
        response = requests.get(f"{BASE_URL}/api/account/me/statement")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Customer statement requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
