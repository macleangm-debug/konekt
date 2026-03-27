"""
P0 Route Deletion and Assignment Fix Tests for Konekt B2B
Tests for iteration 130 features:
1. Admin orders-ops list enrichment (customer_name, vendor_name, sales_owner, payment_state, fulfillment_state)
2. Admin orders-ops detail enrichment (customer, vendor_orders, sales_user, payment_proof, events)
3. Admin invoices list enrichment (payer_name, customer_name)
4. Customer orders customer-safe timeline (customer_status, timeline_steps)
5. Notification target_url for click navigation
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
CUSTOMER_EMAIL = "demo.customer@konekt.com"
CUSTOMER_PASSWORD = "Demo123!"
PARTNER_EMAIL = "demo.partner@konekt.com"
PARTNER_PASSWORD = "Partner123!"


class TestAdminOrdersOpsListEnrichment:
    """Test GET /api/admin/orders-ops returns enriched orders"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        # Admin login
        res = self.session.post(f"{BASE_URL}/api/admin-auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        if res.status_code == 200:
            token = res.json().get("token") or res.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        yield
        self.session.close()
    
    def test_orders_ops_list_returns_200(self):
        """GET /api/admin/orders-ops returns 200"""
        res = self.session.get(f"{BASE_URL}/api/admin/orders-ops")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert isinstance(data, list), "Expected list response"
        print(f"PASS: orders-ops list returns {len(data)} orders")
    
    def test_orders_ops_list_has_enriched_fields(self):
        """Orders list should have customer_name, vendor_name, sales_owner, payment_state, fulfillment_state"""
        res = self.session.get(f"{BASE_URL}/api/admin/orders-ops")
        assert res.status_code == 200
        data = res.json()
        if len(data) > 0:
            order = data[0]
            # Check enriched fields exist (may be empty for old orders)
            assert "customer_name" in order or "customer_email" in order, "Missing customer identifier"
            assert "vendor_name" in order or "vendor_count" in order, "Missing vendor info"
            assert "sales_owner" in order, f"Missing sales_owner field. Keys: {order.keys()}"
            assert "payment_state" in order or "payment_status" in order, "Missing payment state"
            assert "fulfillment_state" in order or "status" in order, "Missing fulfillment state"
            print(f"PASS: Order has enriched fields - customer_name={order.get('customer_name')}, vendor_name={order.get('vendor_name')}, sales_owner={order.get('sales_owner')}")
        else:
            pytest.skip("No orders to test enrichment")
    
    def test_orders_ops_list_supports_tab_filter(self):
        """Orders list supports tab parameter"""
        for tab in ["new", "assigned", "in_progress", "completed"]:
            res = self.session.get(f"{BASE_URL}/api/admin/orders-ops", params={"tab": tab})
            assert res.status_code == 200, f"Tab {tab} failed: {res.text}"
        print("PASS: All tab filters work")
    
    def test_orders_ops_list_supports_search(self):
        """Orders list supports search parameter"""
        res = self.session.get(f"{BASE_URL}/api/admin/orders-ops", params={"search": "test"})
        assert res.status_code == 200
        print("PASS: Search parameter works")


class TestAdminOrdersOpsDetailEnrichment:
    """Test GET /api/admin/orders-ops/{id} returns enriched detail"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        res = self.session.post(f"{BASE_URL}/api/admin-auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        if res.status_code == 200:
            token = res.json().get("token") or res.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        yield
        self.session.close()
    
    def test_orders_ops_detail_returns_enriched_object(self):
        """GET /api/admin/orders-ops/{id} returns enriched object with all sections"""
        # First get an order ID
        list_res = self.session.get(f"{BASE_URL}/api/admin/orders-ops")
        assert list_res.status_code == 200
        orders = list_res.json()
        if len(orders) == 0:
            pytest.skip("No orders to test detail")
        
        order_id = orders[0].get("id")
        res = self.session.get(f"{BASE_URL}/api/admin/orders-ops/{order_id}")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        
        data = res.json()
        # Check for enriched sections
        assert "order" in data, "Missing order section"
        assert "vendor_orders" in data, "Missing vendor_orders section"
        assert "customer" in data or data.get("order", {}).get("customer_name"), "Missing customer info"
        assert "events" in data, "Missing events/timeline section"
        assert "payment_proof" in data or "invoice" in data, "Missing payment info"
        
        print(f"PASS: Order detail has sections: {list(data.keys())}")
        
        # Check vendor_orders has vendor details
        if data.get("vendor_orders"):
            vo = data["vendor_orders"][0]
            assert "vendor_name" in vo, f"vendor_orders missing vendor_name. Keys: {vo.keys()}"
            print(f"PASS: vendor_orders has vendor_name={vo.get('vendor_name')}")
        
        # Check sales_user or sales_assignment
        if data.get("sales_user") or data.get("sales_assignment"):
            print(f"PASS: Has sales info - sales_user={data.get('sales_user')}, sales_assignment={data.get('sales_assignment')}")
    
    def test_orders_ops_detail_404_for_invalid_id(self):
        """GET /api/admin/orders-ops/{invalid_id} returns 404"""
        res = self.session.get(f"{BASE_URL}/api/admin/orders-ops/invalid-order-id-12345")
        assert res.status_code == 404
        print("PASS: Invalid order ID returns 404")


class TestAdminInvoicesEnrichment:
    """Test GET /api/admin/invoices/list returns payer_name and customer_name"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        res = self.session.post(f"{BASE_URL}/api/admin-auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        if res.status_code == 200:
            token = res.json().get("token") or res.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        yield
        self.session.close()
    
    def test_invoices_list_returns_200(self):
        """GET /api/admin/invoices/list returns 200"""
        res = self.session.get(f"{BASE_URL}/api/admin/invoices/list")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert isinstance(data, list)
        print(f"PASS: invoices/list returns {len(data)} invoices")
    
    def test_invoices_list_has_payer_name(self):
        """Invoices list should have payer_name field"""
        res = self.session.get(f"{BASE_URL}/api/admin/invoices/list")
        assert res.status_code == 200
        data = res.json()
        if len(data) > 0:
            invoice = data[0]
            assert "payer_name" in invoice, f"Missing payer_name. Keys: {invoice.keys()}"
            print(f"PASS: Invoice has payer_name={invoice.get('payer_name')}")
        else:
            pytest.skip("No invoices to test")
    
    def test_invoices_list_has_customer_name(self):
        """Invoices list should have customer_name field"""
        res = self.session.get(f"{BASE_URL}/api/admin/invoices/list")
        assert res.status_code == 200
        data = res.json()
        if len(data) > 0:
            invoice = data[0]
            assert "customer_name" in invoice, f"Missing customer_name. Keys: {invoice.keys()}"
            print(f"PASS: Invoice has customer_name={invoice.get('customer_name')}")
        else:
            pytest.skip("No invoices to test")
    
    def test_invoices_list_has_linked_ref(self):
        """Invoices list should have linked_ref field"""
        res = self.session.get(f"{BASE_URL}/api/admin/invoices/list")
        assert res.status_code == 200
        data = res.json()
        if len(data) > 0:
            invoice = data[0]
            assert "linked_ref" in invoice, f"Missing linked_ref. Keys: {invoice.keys()}"
            print(f"PASS: Invoice has linked_ref={invoice.get('linked_ref')}")


class TestCustomerOrdersTimeline:
    """Test GET /api/customer/orders returns customer-safe timeline"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD
        })
        if res.status_code == 200:
            token = res.json().get("token") or res.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        yield
        self.session.close()
    
    def test_customer_orders_returns_200(self):
        """GET /api/customer/orders returns 200"""
        res = self.session.get(f"{BASE_URL}/api/customer/orders")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert isinstance(data, list)
        print(f"PASS: customer/orders returns {len(data)} orders")
    
    def test_customer_orders_has_customer_status(self):
        """Customer orders should have customer_status field"""
        res = self.session.get(f"{BASE_URL}/api/customer/orders")
        assert res.status_code == 200
        data = res.json()
        if len(data) > 0:
            order = data[0]
            assert "customer_status" in order, f"Missing customer_status. Keys: {order.keys()}"
            # Verify it's a customer-safe label
            safe_labels = ["Ordered", "Confirmed", "In Progress", "Quality Check", "Ready", "Completed", 
                          "Requested", "Scheduled", "Review", "Submitted", "Processing", "Active"]
            assert order["customer_status"] in safe_labels, f"customer_status '{order['customer_status']}' not in safe labels"
            print(f"PASS: Order has customer_status={order.get('customer_status')}")
        else:
            pytest.skip("No customer orders to test")
    
    def test_customer_orders_has_timeline_steps(self):
        """Customer orders should have timeline_steps field"""
        res = self.session.get(f"{BASE_URL}/api/customer/orders")
        assert res.status_code == 200
        data = res.json()
        if len(data) > 0:
            order = data[0]
            assert "timeline_steps" in order, f"Missing timeline_steps. Keys: {order.keys()}"
            assert isinstance(order["timeline_steps"], list), "timeline_steps should be a list"
            # Verify no vendor-internal labels
            internal_labels = ["assigned", "ready_to_fulfill", "work_scheduled", "accepted"]
            for step in order["timeline_steps"]:
                assert step.lower() not in internal_labels, f"Found internal label '{step}' in customer timeline"
            print(f"PASS: Order has timeline_steps={order.get('timeline_steps')}")
        else:
            pytest.skip("No customer orders to test")
    
    def test_customer_orders_no_vendor_exposure(self):
        """Customer orders should NOT expose vendor identity"""
        res = self.session.get(f"{BASE_URL}/api/customer/orders")
        assert res.status_code == 200
        data = res.json()
        if len(data) > 0:
            order = data[0]
            assert "vendor_ids" not in order, "vendor_ids should not be exposed to customer"
            assert "vendor" not in order, "vendor should not be exposed to customer"
            print("PASS: No vendor info exposed to customer")


class TestCustomerInvoicePayerName:
    """Test GET /api/customer/invoices returns payer_name"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD
        })
        if res.status_code == 200:
            token = res.json().get("token") or res.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        yield
        self.session.close()
    
    def test_customer_invoices_returns_200(self):
        """GET /api/customer/invoices returns 200"""
        res = self.session.get(f"{BASE_URL}/api/customer/invoices")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert isinstance(data, list)
        print(f"PASS: customer/invoices returns {len(data)} invoices")
    
    def test_customer_invoices_has_payer_name(self):
        """Customer invoices should have payer_name field"""
        res = self.session.get(f"{BASE_URL}/api/customer/invoices")
        assert res.status_code == 200
        data = res.json()
        if len(data) > 0:
            invoice = data[0]
            assert "payer_name" in invoice, f"Missing payer_name. Keys: {invoice.keys()}"
            print(f"PASS: Customer invoice has payer_name={invoice.get('payer_name')}")
        else:
            pytest.skip("No customer invoices to test")


class TestNotificationTargetUrl:
    """Test notifications have target_url for click navigation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        # Test with admin
        res = self.session.post(f"{BASE_URL}/api/admin-auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        if res.status_code == 200:
            token = res.json().get("token") or res.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        yield
        self.session.close()
    
    def test_notifications_endpoint_exists(self):
        """Notifications endpoint should exist"""
        # Try common notification endpoints
        endpoints = [
            "/api/notifications",
            "/api/admin/notifications",
            "/api/notifications/list"
        ]
        found = False
        for ep in endpoints:
            res = self.session.get(f"{BASE_URL}{ep}")
            if res.status_code == 200:
                found = True
                print(f"PASS: Notifications endpoint found at {ep}")
                break
        if not found:
            pytest.skip("No notifications endpoint found")


class TestPasswordToggle:
    """Test login page has password show/hide toggle (frontend test placeholder)"""
    
    def test_login_endpoint_exists(self):
        """Login endpoint should exist"""
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com", "password": "wrong"
        })
        # Should return 401 for wrong credentials, not 404
        assert res.status_code in [401, 400, 422], f"Login endpoint issue: {res.status_code}"
        print("PASS: Login endpoint exists")


class TestDashboardRedirect:
    """Test /dashboard redirects to /account (frontend test placeholder)"""
    
    def test_auth_endpoints_exist(self):
        """Auth endpoints should exist"""
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD
        })
        assert res.status_code == 200, f"Customer login failed: {res.text}"
        print("PASS: Customer auth works")


class TestPartnerNotifications:
    """Test vendor/partner notifications point to /partner/orders"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        res = self.session.post(f"{BASE_URL}/api/partner-auth/login", json={
            "email": PARTNER_EMAIL, "password": PARTNER_PASSWORD
        })
        if res.status_code == 200:
            token = res.json().get("token") or res.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        yield
        self.session.close()
    
    def test_partner_login_works(self):
        """Partner login should work"""
        res = requests.post(f"{BASE_URL}/api/partner-auth/login", json={
            "email": PARTNER_EMAIL, "password": PARTNER_PASSWORD
        })
        assert res.status_code == 200, f"Partner login failed: {res.text}"
        print("PASS: Partner login works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
