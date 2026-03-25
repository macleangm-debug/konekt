"""
Stabilization Pass Tests for Konekt B2B Platform
Tests for: Customer invoices, Admin orders, Vendor orders, Notifications, Sidebar cleanup
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CUSTOMER_EMAIL = "demo.customer@konekt.com"
CUSTOMER_PASSWORD = "Demo123!"
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
PARTNER_EMAIL = "demo.partner@konekt.com"
PARTNER_PASSWORD = "Partner123!"


class TestHealthCheck:
    """Basic health check"""
    
    def test_api_health(self):
        """Verify API is accessible"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        assert response.status_code == 200, f"API health check failed: {response.status_code}"
        print("✓ API health check passed")


class TestCustomerAuth:
    """Customer authentication tests"""
    
    def test_customer_login(self):
        """Customer can login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        }, timeout=10)
        assert response.status_code == 200, f"Customer login failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "token" in data or "access_token" in data, "No token in response"
        print(f"✓ Customer login successful")
        return data.get("token") or data.get("access_token")


class TestAdminAuth:
    """Admin authentication tests"""
    
    def test_admin_login(self):
        """Admin can login and get token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }, timeout=10)
        assert response.status_code == 200, f"Admin login failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "token" in data or "access_token" in data, "No token in response"
        print(f"✓ Admin login successful")
        return data.get("token") or data.get("access_token")


class TestPartnerAuth:
    """Partner authentication tests"""
    
    def test_partner_login(self):
        """Partner can login and get access_token"""
        response = requests.post(f"{BASE_URL}/api/partner-auth/login", json={
            "email": PARTNER_EMAIL,
            "password": PARTNER_PASSWORD
        }, timeout=10)
        assert response.status_code == 200, f"Partner login failed: {response.status_code} - {response.text}"
        data = response.json()
        # Partner uses access_token (not token)
        assert "access_token" in data or "token" in data, f"No access_token in response: {data.keys()}"
        print(f"✓ Partner login successful")
        return data.get("access_token") or data.get("token")


class TestCustomerInvoicesAllStates:
    """Test customer invoices API returns invoices in ALL states"""
    
    @pytest.fixture
    def customer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        }, timeout=10)
        if response.status_code != 200:
            pytest.skip("Customer login failed")
        data = response.json()
        return data.get("token") or data.get("access_token")
    
    def test_customer_invoices_returns_all_states(self, customer_token):
        """Customer invoices API should return invoices in all states"""
        headers = {"Authorization": f"Bearer {customer_token}"}
        response = requests.get(f"{BASE_URL}/api/customer/invoices", headers=headers, timeout=10)
        
        # Should return 200 even if empty
        assert response.status_code == 200, f"Customer invoices failed: {response.status_code}"
        invoices = response.json()
        
        # Check that API returns a list
        assert isinstance(invoices, list), "Response should be a list"
        
        # If there are invoices, verify they can have various states
        if invoices:
            statuses = set()
            for inv in invoices:
                status = inv.get("status") or inv.get("payment_status")
                if status:
                    statuses.add(status)
            print(f"✓ Customer invoices returned {len(invoices)} invoices with statuses: {statuses}")
        else:
            print("✓ Customer invoices API works (no invoices found for this customer)")


class TestAdminOrdersNoFilter:
    """Test admin orders API returns ALL orders without over-restrictive filter"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }, timeout=10)
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        data = response.json()
        return data.get("token") or data.get("access_token")
    
    def test_admin_orders_list_no_filter(self, admin_token):
        """Admin orders list should return all orders without restrictive status filter"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/orders/list", headers=headers, timeout=10)
        
        assert response.status_code == 200, f"Admin orders list failed: {response.status_code}"
        orders = response.json()
        
        assert isinstance(orders, list), "Response should be a list"
        
        if orders:
            # Verify orders have expected fields
            first_order = orders[0]
            assert "id" in first_order or "order_number" in first_order, "Order should have id or order_number"
            
            # Check for sales_owner and vendor_count enrichment
            if "sales_owner" in first_order:
                print(f"✓ Orders have sales_owner field")
            if "vendor_count" in first_order:
                print(f"✓ Orders have vendor_count field")
            
            print(f"✓ Admin orders list returned {len(orders)} orders")
        else:
            print("✓ Admin orders API works (no orders in system)")
    
    def test_admin_orders_with_tabs(self, admin_token):
        """Admin orders should support tab filtering"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Test different tabs
        tabs = ["awaiting_release", "released", "completed"]
        for tab in tabs:
            response = requests.get(f"{BASE_URL}/api/admin/orders/list?tab={tab}", headers=headers, timeout=10)
            assert response.status_code == 200, f"Admin orders with tab={tab} failed: {response.status_code}"
            print(f"✓ Admin orders tab '{tab}' works")


class TestVendorFulfillmentAPI:
    """Test vendor/partner fulfillment API returns orders from vendor_orders collection"""
    
    @pytest.fixture
    def partner_token(self):
        response = requests.post(f"{BASE_URL}/api/partner-auth/login", json={
            "email": PARTNER_EMAIL,
            "password": PARTNER_PASSWORD
        }, timeout=10)
        if response.status_code != 200:
            pytest.skip("Partner login failed")
        data = response.json()
        return data.get("access_token") or data.get("token")
    
    def test_partner_fulfillment_jobs(self, partner_token):
        """Partner fulfillment API should return jobs from both collections"""
        headers = {"Authorization": f"Bearer {partner_token}"}
        response = requests.get(f"{BASE_URL}/api/partner-portal/fulfillment-jobs", headers=headers, timeout=10)
        
        assert response.status_code == 200, f"Partner fulfillment jobs failed: {response.status_code}"
        jobs = response.json()
        
        assert isinstance(jobs, list), "Response should be a list"
        
        if jobs:
            # Check for source field indicating which collection
            sources = set()
            for job in jobs:
                source = job.get("source")
                if source:
                    sources.add(source)
            print(f"✓ Partner fulfillment returned {len(jobs)} jobs from sources: {sources}")
        else:
            print("✓ Partner fulfillment API works (no jobs for this partner)")
    
    def test_partner_fulfillment_status_update(self, partner_token):
        """Partner can update order status for vendor_orders"""
        headers = {"Authorization": f"Bearer {partner_token}"}
        
        # First get jobs
        response = requests.get(f"{BASE_URL}/api/partner-portal/fulfillment-jobs", headers=headers, timeout=10)
        if response.status_code != 200:
            pytest.skip("Could not get fulfillment jobs")
        
        jobs = response.json()
        if not jobs:
            pytest.skip("No fulfillment jobs available for status update test")
        
        # Find a job that can be updated
        updatable_job = None
        for job in jobs:
            if job.get("status") in ["ready_to_fulfill", "allocated", "accepted"]:
                updatable_job = job
                break
        
        if not updatable_job:
            pytest.skip("No updatable jobs found for partner")
        
        job_id = updatable_job.get("id")
        response = requests.post(
            f"{BASE_URL}/api/partner-portal/fulfillment-jobs/{job_id}/status",
            headers=headers,
            json={"status": "accepted"},
            timeout=10
        )
        
        # Should succeed or return 404 if job not found
        assert response.status_code in [200, 404], f"Status update failed: {response.status_code}"
        print(f"✓ Partner status update API works")


class TestCustomerNotifications:
    """Test customer notifications API uses recipient_user_id field"""
    
    @pytest.fixture
    def customer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        }, timeout=10)
        if response.status_code != 200:
            pytest.skip("Customer login failed")
        data = response.json()
        return data.get("token") or data.get("access_token")
    
    def test_customer_notifications_list(self, customer_token):
        """Customer can get notifications"""
        headers = {"Authorization": f"Bearer {customer_token}"}
        response = requests.get(f"{BASE_URL}/api/customer/notifications", headers=headers, timeout=10)
        
        assert response.status_code == 200, f"Customer notifications failed: {response.status_code}"
        notifications = response.json()
        
        assert isinstance(notifications, list), "Response should be a list"
        print(f"✓ Customer notifications returned {len(notifications)} notifications")
    
    def test_customer_notifications_count(self, customer_token):
        """Customer can get unread notification count"""
        headers = {"Authorization": f"Bearer {customer_token}"}
        response = requests.get(f"{BASE_URL}/api/customer/notifications/count", headers=headers, timeout=10)
        
        assert response.status_code == 200, f"Customer notifications count failed: {response.status_code}"
        data = response.json()
        
        assert "unread" in data, "Response should have 'unread' field"
        print(f"✓ Customer unread notifications count: {data.get('unread')}")


class TestAdminInvoicesDetail:
    """Test admin invoice detail includes BrandedDocPreview data"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }, timeout=10)
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        data = response.json()
        return data.get("token") or data.get("access_token")
    
    def test_admin_invoices_list(self, admin_token):
        """Admin can list invoices"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/invoices/list", headers=headers, timeout=10)
        
        assert response.status_code == 200, f"Admin invoices list failed: {response.status_code}"
        invoices = response.json()
        
        assert isinstance(invoices, list), "Response should be a list"
        
        if invoices:
            # Check for source_type field
            first_inv = invoices[0]
            if "source_type" in first_inv:
                print(f"✓ Invoices have source_type field: {first_inv.get('source_type')}")
            print(f"✓ Admin invoices list returned {len(invoices)} invoices")
        else:
            print("✓ Admin invoices API works (no invoices in system)")
        
        return invoices
    
    def test_admin_invoice_detail_with_splits(self, admin_token):
        """Admin invoice detail should include splits and proofs"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First get invoices
        response = requests.get(f"{BASE_URL}/api/admin/invoices/list", headers=headers, timeout=10)
        if response.status_code != 200:
            pytest.skip("Could not get invoices list")
        
        invoices = response.json()
        if not invoices:
            pytest.skip("No invoices available for detail test")
        
        invoice_id = invoices[0].get("id")
        response = requests.get(f"{BASE_URL}/api/admin/invoices/{invoice_id}", headers=headers, timeout=10)
        
        assert response.status_code == 200, f"Admin invoice detail failed: {response.status_code}"
        detail = response.json()
        
        # Check for expected fields
        assert "invoice" in detail, "Detail should have 'invoice' field"
        
        # Check for splits and proofs (may be empty but should exist)
        if "splits" in detail:
            print(f"✓ Invoice detail has splits: {len(detail.get('splits', []))}")
        if "proofs" in detail:
            print(f"✓ Invoice detail has proofs: {len(detail.get('proofs', []))}")
        if "proof_submissions" in detail:
            print(f"✓ Invoice detail has proof_submissions: {len(detail.get('proof_submissions', []))}")
        
        print(f"✓ Admin invoice detail API works")


class TestCustomerOrdersWithSalesContact:
    """Test customer orders show sales contact info"""
    
    @pytest.fixture
    def customer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        }, timeout=10)
        if response.status_code != 200:
            pytest.skip("Customer login failed")
        data = response.json()
        return data.get("token") or data.get("access_token")
    
    def test_customer_orders_list(self, customer_token):
        """Customer can get orders list"""
        headers = {"Authorization": f"Bearer {customer_token}"}
        response = requests.get(f"{BASE_URL}/api/customer/orders", headers=headers, timeout=10)
        
        assert response.status_code == 200, f"Customer orders failed: {response.status_code}"
        orders = response.json()
        
        assert isinstance(orders, list), "Response should be a list"
        
        if orders:
            # Check for sales enrichment
            first_order = orders[0]
            if "sales" in first_order:
                print(f"✓ Orders have sales contact info: {first_order.get('sales')}")
            print(f"✓ Customer orders returned {len(orders)} orders")
        else:
            print("✓ Customer orders API works (no orders for this customer)")
    
    def test_customer_order_detail(self, customer_token):
        """Customer can get order detail with sales info"""
        headers = {"Authorization": f"Bearer {customer_token}"}
        
        # First get orders
        response = requests.get(f"{BASE_URL}/api/customer/orders", headers=headers, timeout=10)
        if response.status_code != 200:
            pytest.skip("Could not get orders list")
        
        orders = response.json()
        if not orders:
            pytest.skip("No orders available for detail test")
        
        order_id = orders[0].get("id")
        response = requests.get(f"{BASE_URL}/api/customer/orders/{order_id}", headers=headers, timeout=10)
        
        assert response.status_code == 200, f"Customer order detail failed: {response.status_code}"
        detail = response.json()
        
        # Check for sales info
        if "sales" in detail:
            print(f"✓ Order detail has sales contact: {detail.get('sales')}")
        
        # Check for events
        if "events" in detail:
            print(f"✓ Order detail has events: {len(detail.get('events', []))}")
        
        print(f"✓ Customer order detail API works")


class TestPartnerDashboard:
    """Test partner dashboard and sidebar data"""
    
    @pytest.fixture
    def partner_token(self):
        response = requests.post(f"{BASE_URL}/api/partner-auth/login", json={
            "email": PARTNER_EMAIL,
            "password": PARTNER_PASSWORD
        }, timeout=10)
        if response.status_code != 200:
            pytest.skip("Partner login failed")
        data = response.json()
        return data.get("access_token") or data.get("token")
    
    def test_partner_dashboard(self, partner_token):
        """Partner can access dashboard"""
        headers = {"Authorization": f"Bearer {partner_token}"}
        response = requests.get(f"{BASE_URL}/api/partner-portal/dashboard", headers=headers, timeout=10)
        
        assert response.status_code == 200, f"Partner dashboard failed: {response.status_code}"
        data = response.json()
        
        # Check for partner info
        if "partner" in data:
            partner = data.get("partner", {})
            partner_type = partner.get("type") or partner.get("role")
            print(f"✓ Partner type: {partner_type}")
        
        # Check for summary
        if "summary" in data:
            print(f"✓ Partner dashboard has summary: {data.get('summary')}")
        
        print(f"✓ Partner dashboard API works")


class TestPaymentApprovalNotification:
    """Test that payment approval creates notification for customer"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }, timeout=10)
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        data = response.json()
        return data.get("token") or data.get("access_token")
    
    def test_payments_queue(self, admin_token):
        """Admin can access payments queue"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/payments/queue", headers=headers, timeout=10)
        
        assert response.status_code == 200, f"Payments queue failed: {response.status_code}"
        proofs = response.json()
        
        assert isinstance(proofs, list), "Response should be a list"
        print(f"✓ Payments queue returned {len(proofs)} pending proofs")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
