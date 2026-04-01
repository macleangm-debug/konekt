"""
Pack 3 - List Page Standardization + Notifications Tests
Tests for:
1. Sidebar notification badges (sidebar-counts endpoint)
2. Orders page stat cards (orders-ops/stats)
3. Payments Queue stat cards (payments/stats)
4. Invoices stat cards (invoices/stats)
5. Deliveries page API
6. Requests Inbox company_name enrichment
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
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/admin/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    data = response.json()
    assert "token" in data, "No token in login response"
    return data["token"]


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    """Auth headers for API requests"""
    return {"Authorization": f"Bearer {admin_token}"}


class TestAdminLogin:
    """Test admin authentication"""
    
    def test_admin_login_success(self):
        """Admin login works with correct credentials"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] in ["admin", "sales", "marketing", "production"]


class TestSidebarCounts:
    """Test sidebar notification badge counts endpoint"""
    
    def test_sidebar_counts_endpoint_exists(self, auth_headers):
        """GET /api/admin/sidebar-counts returns correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/admin/sidebar-counts",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Sidebar counts failed: {response.text}"
        data = response.json()
        
        # Verify all required keys exist
        assert "orders" in data, "Missing 'orders' key in sidebar counts"
        assert "requests_inbox" in data, "Missing 'requests_inbox' key in sidebar counts"
        assert "payments_queue" in data, "Missing 'payments_queue' key in sidebar counts"
        assert "deliveries" in data, "Missing 'deliveries' key in sidebar counts"
        
        # Verify values are integers
        assert isinstance(data["orders"], int), "orders should be an integer"
        assert isinstance(data["requests_inbox"], int), "requests_inbox should be an integer"
        assert isinstance(data["payments_queue"], int), "payments_queue should be an integer"
        assert isinstance(data["deliveries"], int), "deliveries should be an integer"
        
        # Values should be non-negative
        assert data["orders"] >= 0
        assert data["requests_inbox"] >= 0
        assert data["payments_queue"] >= 0
        assert data["deliveries"] >= 0
        
        print(f"Sidebar counts: orders={data['orders']}, requests_inbox={data['requests_inbox']}, payments_queue={data['payments_queue']}, deliveries={data['deliveries']}")
    
    def test_sidebar_counts_requires_auth(self):
        """Sidebar counts endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/sidebar-counts")
        assert response.status_code == 401, "Should require authentication"


class TestOrdersStats:
    """Test Orders page stat cards endpoint"""
    
    def test_orders_stats_endpoint(self, auth_headers):
        """GET /api/admin/orders-ops/stats returns correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/admin/orders-ops/stats",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Orders stats failed: {response.text}"
        data = response.json()
        
        # Verify all required keys
        assert "total" in data, "Missing 'total' key"
        assert "new" in data, "Missing 'new' key"
        assert "assigned" in data, "Missing 'assigned' key"
        assert "in_progress" in data, "Missing 'in_progress' key"
        assert "completed" in data, "Missing 'completed' key"
        
        # Verify values are integers
        for key in ["total", "new", "assigned", "in_progress", "completed"]:
            assert isinstance(data[key], int), f"{key} should be an integer"
            assert data[key] >= 0, f"{key} should be non-negative"
        
        print(f"Orders stats: total={data['total']}, new={data['new']}, assigned={data['assigned']}, in_progress={data['in_progress']}, completed={data['completed']}")
    
    def test_orders_list_with_tab_filter(self, auth_headers):
        """Orders list supports tab filtering"""
        # Test each tab filter
        for tab in ["new", "assigned", "in_progress", "completed"]:
            response = requests.get(
                f"{BASE_URL}/api/admin/orders-ops",
                headers=auth_headers,
                params={"tab": tab}
            )
            assert response.status_code == 200, f"Orders list with tab={tab} failed: {response.text}"
            data = response.json()
            assert isinstance(data, list), f"Orders list should return array for tab={tab}"
            print(f"Orders with tab={tab}: {len(data)} records")


class TestPaymentsStats:
    """Test Payments Queue stat cards endpoint"""
    
    def test_payments_stats_endpoint(self, auth_headers):
        """GET /api/admin/payments/stats returns correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/admin/payments/stats",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Payments stats failed: {response.text}"
        data = response.json()
        
        # Verify all required keys
        assert "total" in data, "Missing 'total' key"
        assert "pending" in data, "Missing 'pending' key"
        assert "approved" in data, "Missing 'approved' key"
        assert "rejected" in data, "Missing 'rejected' key"
        
        # Verify values are integers
        for key in ["total", "pending", "approved", "rejected"]:
            assert isinstance(data[key], int), f"{key} should be an integer"
            assert data[key] >= 0, f"{key} should be non-negative"
        
        print(f"Payments stats: total={data['total']}, pending={data['pending']}, approved={data['approved']}, rejected={data['rejected']}")
    
    def test_payments_queue_list(self, auth_headers):
        """Payments queue list endpoint works"""
        response = requests.get(
            f"{BASE_URL}/api/admin/payments/queue",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Payments queue failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Payments queue should return array"
        print(f"Payments queue: {len(data)} records")


class TestInvoicesStats:
    """Test Invoices page stat cards endpoint"""
    
    def test_invoices_stats_endpoint(self, auth_headers):
        """GET /api/admin/invoices/stats returns correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/admin/invoices/stats",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Invoices stats failed: {response.text}"
        data = response.json()
        
        # Verify all required keys
        assert "total" in data, "Missing 'total' key"
        assert "draft" in data, "Missing 'draft' key"
        assert "sent" in data, "Missing 'sent' key"
        assert "paid" in data, "Missing 'paid' key"
        assert "overdue" in data, "Missing 'overdue' key"
        assert "unpaid" in data, "Missing 'unpaid' key"
        
        # Verify values are integers
        for key in ["total", "draft", "sent", "paid", "overdue", "unpaid"]:
            assert isinstance(data[key], int), f"{key} should be an integer"
            assert data[key] >= 0, f"{key} should be non-negative"
        
        print(f"Invoices stats: total={data['total']}, draft={data['draft']}, sent={data['sent']}, paid={data['paid']}, overdue={data['overdue']}, unpaid={data['unpaid']}")
    
    def test_invoices_list(self, auth_headers):
        """Invoices list endpoint works"""
        response = requests.get(
            f"{BASE_URL}/api/admin/invoices/list",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Invoices list failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Invoices list should return array"
        print(f"Invoices list: {len(data)} records")
        
        # Check that invoices have customer_name populated
        if data:
            sample = data[0]
            assert "customer_name" in sample or "customer_company" in sample, "Invoice should have customer info"


class TestDeliveriesPage:
    """Test Deliveries page API"""
    
    def test_deliveries_list_endpoint(self, auth_headers):
        """GET /api/admin/deliveries returns list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/deliveries",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Deliveries list failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Deliveries should return array"
        print(f"Deliveries: {len(data)} records")
        
        # Check structure if data exists
        if data:
            sample = data[0]
            # Should have standard fields
            assert "id" in sample or "_id" in sample, "Delivery should have id"
            print(f"Sample delivery keys: {list(sample.keys())[:10]}")
    
    def test_deliveries_status_filter(self, auth_headers):
        """Deliveries list supports status filtering"""
        for status in ["pending", "ready_for_pickup", "in_transit", "delivered"]:
            response = requests.get(
                f"{BASE_URL}/api/admin/deliveries",
                headers=auth_headers,
                params={"status": status}
            )
            assert response.status_code == 200, f"Deliveries with status={status} failed: {response.text}"
            data = response.json()
            assert isinstance(data, list), f"Deliveries should return array for status={status}"
            print(f"Deliveries with status={status}: {len(data)} records")


class TestRequestsInbox:
    """Test Requests Inbox company_name enrichment"""
    
    def test_requests_list_endpoint(self, auth_headers):
        """GET /api/admin/requests returns list with enriched data"""
        response = requests.get(
            f"{BASE_URL}/api/admin/requests",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Requests list failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Requests should return array"
        print(f"Requests inbox: {len(data)} records")
        
        # Check that requests have company_name populated for registered users
        registered_requests = [r for r in data if r.get("customer_user_id")]
        if registered_requests:
            sample = registered_requests[0]
            # company_name should be populated from user profile
            assert "company_name" in sample, "Request should have company_name field"
            print(f"Sample request with customer_user_id has company_name: '{sample.get('company_name', '')}'")
    
    def test_requests_type_filter(self, auth_headers):
        """Requests list supports type filtering"""
        for req_type in ["contact_general", "service_quote", "business_pricing"]:
            response = requests.get(
                f"{BASE_URL}/api/admin/requests",
                headers=auth_headers,
                params={"request_type": req_type}
            )
            assert response.status_code == 200, f"Requests with type={req_type} failed: {response.text}"
            data = response.json()
            assert isinstance(data, list), f"Requests should return array for type={req_type}"
            print(f"Requests with type={req_type}: {len(data)} records")


class TestOrdersPageIntegration:
    """Test Orders page data enrichment"""
    
    def test_orders_list_has_customer_info(self, auth_headers):
        """Orders list includes customer_name for CustomerLinkCell"""
        response = requests.get(
            f"{BASE_URL}/api/admin/orders-ops",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Orders list failed: {response.text}"
        data = response.json()
        
        if data:
            sample = data[0]
            # Should have customer info for CustomerLinkCell
            has_customer_info = "customer_name" in sample or "customer_id" in sample
            assert has_customer_info, "Order should have customer info"
            print(f"Sample order customer_name: '{sample.get('customer_name', '')}', customer_id: '{sample.get('customer_id', '')}'")


class TestPaymentsQueueIntegration:
    """Test Payments Queue page data enrichment"""
    
    def test_payments_queue_has_customer_info(self, auth_headers):
        """Payments queue includes customer_name for CustomerLinkCell"""
        response = requests.get(
            f"{BASE_URL}/api/admin/payments/queue",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Payments queue failed: {response.text}"
        data = response.json()
        
        if data:
            sample = data[0]
            # Should have customer info for CustomerLinkCell
            has_customer_info = "customer_name" in sample or "customer_id" in sample
            assert has_customer_info, "Payment should have customer info"
            print(f"Sample payment customer_name: '{sample.get('customer_name', '')}', customer_id: '{sample.get('customer_id', '')}'")


class TestInvoicesPageIntegration:
    """Test Invoices page data enrichment"""
    
    def test_invoices_list_has_customer_info(self, auth_headers):
        """Invoices list includes customer_name for CustomerLinkCell"""
        response = requests.get(
            f"{BASE_URL}/api/admin/invoices/list",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Invoices list failed: {response.text}"
        data = response.json()
        
        if data:
            sample = data[0]
            # Should have customer info for CustomerLinkCell
            has_customer_info = "customer_name" in sample or "customer_id" in sample or "customer_company" in sample
            assert has_customer_info, "Invoice should have customer info"
            print(f"Sample invoice customer_name: '{sample.get('customer_name', '')}', customer_id: '{sample.get('customer_id', '')}'")


class TestExistingFunctionality:
    """Test that existing drawers/filters continue to work (no regression)"""
    
    def test_order_detail_endpoint(self, auth_headers):
        """Order detail endpoint works"""
        # First get an order ID
        response = requests.get(
            f"{BASE_URL}/api/admin/orders-ops",
            headers=auth_headers,
            params={"limit": 1}
        )
        assert response.status_code == 200
        orders = response.json()
        
        if orders:
            order_id = orders[0].get("id")
            if order_id:
                detail_response = requests.get(
                    f"{BASE_URL}/api/admin/orders-ops/{order_id}",
                    headers=auth_headers
                )
                assert detail_response.status_code == 200, f"Order detail failed: {detail_response.text}"
                detail = detail_response.json()
                assert "order" in detail or "id" in detail, "Order detail should have order data"
                print(f"Order detail endpoint works for order {order_id}")
    
    def test_payment_detail_endpoint(self, auth_headers):
        """Payment detail endpoint works"""
        # First get a payment proof ID
        response = requests.get(
            f"{BASE_URL}/api/admin/payments/queue",
            headers=auth_headers
        )
        assert response.status_code == 200
        payments = response.json()
        
        if payments:
            proof_id = payments[0].get("payment_proof_id") or payments[0].get("id")
            if proof_id:
                detail_response = requests.get(
                    f"{BASE_URL}/api/admin/payments/{proof_id}",
                    headers=auth_headers
                )
                assert detail_response.status_code == 200, f"Payment detail failed: {detail_response.text}"
                detail = detail_response.json()
                assert "proof" in detail or "id" in detail, "Payment detail should have proof data"
                print(f"Payment detail endpoint works for proof {proof_id}")
    
    def test_invoice_detail_endpoint(self, auth_headers):
        """Invoice detail endpoint works"""
        # First get an invoice ID
        response = requests.get(
            f"{BASE_URL}/api/admin/invoices/list",
            headers=auth_headers
        )
        assert response.status_code == 200
        invoices = response.json()
        
        if invoices:
            invoice_id = invoices[0].get("id")
            if invoice_id:
                detail_response = requests.get(
                    f"{BASE_URL}/api/admin/invoices/{invoice_id}",
                    headers=auth_headers
                )
                assert detail_response.status_code == 200, f"Invoice detail failed: {detail_response.text}"
                detail = detail_response.json()
                assert "invoice" in detail or "id" in detail, "Invoice detail should have invoice data"
                print(f"Invoice detail endpoint works for invoice {invoice_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
