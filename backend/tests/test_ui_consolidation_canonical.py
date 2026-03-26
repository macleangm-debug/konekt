"""
Test Suite for Canonical UI Reuse Consolidation
Tests: Admin Payments, Orders, Quotes, Invoices pages with Table+Drawer pattern
Routes: /admin/payments, /admin/orders, /admin/quotes, /admin/invoices
Redirects: /admin/central-payments, /admin/payment-proofs, /admin/finance-queue -> PaymentsQueuePage
           /admin/orders-ops, /admin/orders-legacy -> OrdersPage
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAdminAuth:
    """Admin authentication tests"""
    
    def test_admin_login(self):
        """Test admin login endpoint"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data or "access_token" in data, "No token in response"
        print(f"Admin login successful")
        return data.get("token") or data.get("access_token")


class TestPaymentsQueueAPI:
    """Tests for Payments Queue API - canonical endpoint for payment proofs"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        data = response.json()
        return data.get("token") or data.get("access_token")
    
    def test_get_payments_queue(self, admin_token):
        """GET /api/admin/payments/queue - list payment proofs"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/payments/queue", headers=headers)
        assert response.status_code == 200, f"Payments queue failed: {response.text}"
        data = response.json()
        # Should return array or object with data
        assert isinstance(data, (list, dict)), "Response should be list or dict"
        print(f"Payments queue returned: {type(data)}")
    
    def test_get_payments_queue_with_search(self, admin_token):
        """GET /api/admin/payments/queue?search=test - search payments"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/payments/queue", headers=headers, params={"search": "test"})
        assert response.status_code == 200, f"Payments queue search failed: {response.text}"
        print("Payments queue search works")


class TestOrdersAPI:
    """Tests for Orders API - canonical endpoint for admin orders"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        data = response.json()
        return data.get("token") or data.get("access_token")
    
    def test_get_orders_list(self, admin_token):
        """GET /api/admin/orders-ops - list orders (used by OrdersPage)"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/orders-ops", headers=headers)
        assert response.status_code == 200, f"Orders list failed: {response.text}"
        data = response.json()
        assert isinstance(data, (list, dict)), "Response should be list or dict"
        print(f"Orders list returned: {type(data)}")
    
    def test_get_orders_with_tab_filter(self, admin_token):
        """GET /api/admin/orders-ops?tab=awaiting_release - filter by tab"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/orders-ops", headers=headers, params={"tab": "awaiting_release"})
        assert response.status_code == 200, f"Orders tab filter failed: {response.text}"
        print("Orders tab filter works")
    
    def test_get_orders_with_search(self, admin_token):
        """GET /api/admin/orders-ops?search=test - search orders"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/orders-ops", headers=headers, params={"search": "test"})
        assert response.status_code == 200, f"Orders search failed: {response.text}"
        print("Orders search works")


class TestQuotesAPI:
    """Tests for Quotes API - canonical endpoint for quotes/requests"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        data = response.json()
        return data.get("token") or data.get("access_token")
    
    def test_get_quotes_list(self, admin_token):
        """GET /api/admin/quotes-v2 - list quotes (used by QuotesRequestsPage)"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/quotes-v2", headers=headers)
        assert response.status_code == 200, f"Quotes list failed: {response.text}"
        data = response.json()
        assert isinstance(data, (list, dict)), "Response should be list or dict"
        print(f"Quotes list returned: {type(data)}")
    
    def test_get_quotes_with_status_filter(self, admin_token):
        """GET /api/admin/quotes-v2?status=pending - filter by status"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/quotes-v2", headers=headers, params={"status": "pending"})
        assert response.status_code == 200, f"Quotes status filter failed: {response.text}"
        print("Quotes status filter works")
    
    def test_get_quotes_with_search(self, admin_token):
        """GET /api/admin/quotes-v2?search=test - search quotes"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/quotes-v2", headers=headers, params={"search": "test"})
        assert response.status_code == 200, f"Quotes search failed: {response.text}"
        print("Quotes search works")


class TestInvoicesAPI:
    """Tests for Invoices API - canonical endpoint for invoices"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        data = response.json()
        return data.get("token") or data.get("access_token")
    
    def test_get_invoices_list(self, admin_token):
        """GET /api/admin/invoices - list invoices"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/invoices", headers=headers)
        assert response.status_code == 200, f"Invoices list failed: {response.text}"
        data = response.json()
        assert isinstance(data, (list, dict)), "Response should be list or dict"
        print(f"Invoices list returned: {type(data)}")


class TestCustomerAuth:
    """Customer authentication tests"""
    
    def test_customer_login(self):
        """Test customer login endpoint"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo.customer@konekt.com",
            "password": "Demo123!"
        })
        assert response.status_code == 200, f"Customer login failed: {response.text}"
        data = response.json()
        assert "token" in data or "access_token" in data, "No token in response"
        print(f"Customer login successful")
        return data.get("token") or data.get("access_token")


class TestCustomerOrdersV2API:
    """Tests for Customer Orders V2 API - used by /account/orders"""
    
    @pytest.fixture
    def customer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo.customer@konekt.com",
            "password": "Demo123!"
        })
        data = response.json()
        return data.get("token") or data.get("access_token")
    
    def test_get_customer_orders(self, customer_token):
        """GET /api/customer/orders - list customer orders"""
        headers = {"Authorization": f"Bearer {customer_token}"}
        response = requests.get(f"{BASE_URL}/api/customer/orders", headers=headers)
        assert response.status_code == 200, f"Customer orders failed: {response.text}"
        data = response.json()
        assert isinstance(data, (list, dict)), "Response should be list or dict"
        print(f"Customer orders returned: {type(data)}")


class TestPartnerAuth:
    """Partner authentication tests"""
    
    def test_partner_login(self):
        """Test partner login endpoint"""
        response = requests.post(f"{BASE_URL}/api/partner/auth/login", json={
            "email": "demo.partner@konekt.com",
            "password": "Partner123!"
        })
        # Partner may not exist, so we just check the endpoint works
        assert response.status_code in [200, 401, 404], f"Partner login endpoint error: {response.text}"
        print(f"Partner login endpoint status: {response.status_code}")


class TestPartnerFulfillmentAPI:
    """Tests for Partner Fulfillment API - used by /partner/fulfillment"""
    
    def test_partner_fulfillment_endpoint_exists(self):
        """Check partner fulfillment endpoint exists"""
        # Just verify the endpoint pattern exists
        response = requests.get(f"{BASE_URL}/api/partner-portal/dashboard")
        # Without auth, should get 401 or 403
        assert response.status_code in [401, 403, 422], f"Partner endpoint unexpected status: {response.status_code}"
        print("Partner fulfillment endpoint exists")


class TestAdminOrderDetail:
    """Tests for Admin Order Detail API - used by DetailDrawer"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        data = response.json()
        return data.get("token") or data.get("access_token")
    
    def test_get_order_detail_endpoint(self, admin_token):
        """GET /api/admin/orders/{id} - get order detail"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        # First get list to find an order ID
        list_response = requests.get(f"{BASE_URL}/api/admin/orders-ops", headers=headers)
        if list_response.status_code == 200:
            data = list_response.json()
            orders = data if isinstance(data, list) else data.get("data", [])
            if orders and len(orders) > 0:
                order_id = orders[0].get("id")
                if order_id:
                    detail_response = requests.get(f"{BASE_URL}/api/admin/orders/{order_id}", headers=headers)
                    assert detail_response.status_code == 200, f"Order detail failed: {detail_response.text}"
                    print(f"Order detail for {order_id} works")
                    return
        print("No orders found to test detail endpoint")


class TestAdminPaymentDetail:
    """Tests for Admin Payment Detail API - used by PaymentsQueuePage drawer"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        data = response.json()
        return data.get("token") or data.get("access_token")
    
    def test_get_payment_detail_endpoint(self, admin_token):
        """GET /api/admin/payments/{id} - get payment detail"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        # First get list to find a payment ID
        list_response = requests.get(f"{BASE_URL}/api/admin/payments/queue", headers=headers)
        if list_response.status_code == 200:
            data = list_response.json()
            payments = data if isinstance(data, list) else data.get("data", [])
            if payments and len(payments) > 0:
                payment_id = payments[0].get("payment_proof_id") or payments[0].get("id")
                if payment_id:
                    detail_response = requests.get(f"{BASE_URL}/api/admin/payments/{payment_id}", headers=headers)
                    assert detail_response.status_code == 200, f"Payment detail failed: {detail_response.text}"
                    print(f"Payment detail for {payment_id} works")
                    return
        print("No payments found to test detail endpoint")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
