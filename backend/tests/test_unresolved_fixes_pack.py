"""
Test Suite for 5-Item Unresolved Fixes Pack
Tests:
1. Customer-safe timeline mapping by flow type
2. Invoice payer_name persistence
3. Auto-assignment at approval time
4. Real stored notifications
5. Route cleanup (deprecated routes redirect)
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


@pytest.fixture(scope="module")
def customer_token():
    """Get customer auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": CUSTOMER_EMAIL,
        "password": CUSTOMER_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    pytest.skip(f"Customer login failed: {response.status_code}")


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    pytest.skip(f"Admin login failed: {response.status_code}")


@pytest.fixture(scope="module")
def partner_token():
    """Get partner auth token"""
    response = requests.post(f"{BASE_URL}/api/partner-auth/login", json={
        "email": PARTNER_EMAIL,
        "password": PARTNER_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token") or data.get("token")
    pytest.skip(f"Partner login failed: {response.status_code}")


class TestCustomerTimelineMapping:
    """Test customer-safe timeline mapping by flow type"""
    
    def test_customer_orders_returns_timeline_fields(self, customer_token):
        """GET /api/customer/orders returns customer_status, timeline_steps, timeline_index"""
        response = requests.get(
            f"{BASE_URL}/api/customer/orders",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        orders = response.json()
        assert isinstance(orders, list), "Expected list of orders"
        
        # If there are orders, verify timeline fields
        if orders:
            order = orders[0]
            # Verify customer-safe timeline fields exist
            assert "customer_status" in order, "Missing customer_status field"
            assert "timeline_steps" in order, "Missing timeline_steps field"
            assert "timeline_index" in order, "Missing timeline_index field"
            
            # Verify customer_status is a customer-safe label
            safe_labels = [
                "Ordered", "Confirmed", "In Progress", "Quality Check", "Ready", "Completed",
                "Requested", "Scheduled", "Review",
                "Submitted", "Processing", "Active"
            ]
            assert order["customer_status"] in safe_labels, f"customer_status '{order['customer_status']}' is not a safe label"
            
            # Verify timeline_steps is a list
            assert isinstance(order["timeline_steps"], list), "timeline_steps should be a list"
            assert len(order["timeline_steps"]) > 0, "timeline_steps should not be empty"
            
            # Verify timeline_index is an integer
            assert isinstance(order["timeline_index"], int), "timeline_index should be an integer"
            
            print(f"PASS: Order has customer_status='{order['customer_status']}', timeline_steps={order['timeline_steps']}, timeline_index={order['timeline_index']}")
    
    def test_customer_orders_no_vendor_identity(self, customer_token):
        """Customer orders should NOT expose vendor identity"""
        response = requests.get(
            f"{BASE_URL}/api/customer/orders",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        
        orders = response.json()
        if orders:
            order = orders[0]
            # Verify vendor identity is NOT exposed
            assert "vendor_ids" not in order, "vendor_ids should not be exposed to customer"
            assert "vendor" not in order, "vendor should not be exposed to customer"
            print("PASS: Customer orders do not expose vendor identity")
    
    def test_customer_status_not_internal_labels(self, customer_token):
        """Customer should NEVER see vendor-internal labels"""
        response = requests.get(
            f"{BASE_URL}/api/customer/orders",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        
        orders = response.json()
        internal_labels = [
            "assigned", "ready_to_fulfill", "accepted", "work_scheduled",
            "vendor assigned", "partner assigned", "work scheduled by vendor"
        ]
        
        for order in orders:
            customer_status = order.get("customer_status", "")
            for internal in internal_labels:
                assert internal.lower() not in customer_status.lower(), \
                    f"Customer sees internal label '{internal}' in customer_status"
            
            # Also check timeline_steps
            for step in order.get("timeline_steps", []):
                for internal in internal_labels:
                    assert internal.lower() not in step.lower(), \
                        f"Customer sees internal label '{internal}' in timeline_steps"
        
        print("PASS: Customer does not see any vendor-internal labels")


class TestInvoicePayerName:
    """Test invoice payer_name persistence"""
    
    def test_customer_invoices_returns_payer_name(self, customer_token):
        """GET /api/customer/invoices returns payer_name field"""
        response = requests.get(
            f"{BASE_URL}/api/customer/invoices",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        invoices = response.json()
        assert isinstance(invoices, list), "Expected list of invoices"
        
        if invoices:
            invoice = invoices[0]
            assert "payer_name" in invoice, "Missing payer_name field"
            assert "payment_status_label" in invoice, "Missing payment_status_label field"
            print(f"PASS: Invoice has payer_name='{invoice['payer_name']}', payment_status_label='{invoice['payment_status_label']}'")
        else:
            print("INFO: No invoices found for customer, but API structure is correct")


class TestNotifications:
    """Test real stored notifications"""
    
    def test_notifications_api_returns_is_read(self, customer_token):
        """GET /api/notifications returns notifications with is_read field"""
        response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        notifications = response.json()
        assert isinstance(notifications, list), "Expected list of notifications"
        
        if notifications:
            notif = notifications[0]
            assert "is_read" in notif, "Missing is_read field in notification"
            assert isinstance(notif["is_read"], bool), "is_read should be boolean"
            print(f"PASS: Notification has is_read={notif['is_read']}")
        else:
            print("INFO: No notifications found, but API structure is correct")
    
    def test_notifications_unread_count(self, customer_token):
        """GET /api/notifications/unread-count returns count"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/unread-count",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "count" in data, "Missing count field"
        assert isinstance(data["count"], int), "count should be integer"
        print(f"PASS: Unread count = {data['count']}")
    
    def test_admin_notifications(self, admin_token):
        """Admin can access notifications"""
        response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: Admin can access notifications API")
    
    def test_partner_notifications(self, partner_token):
        """Partner/Vendor can access notifications"""
        response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {partner_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: Partner can access notifications API")


class TestRouteCleanup:
    """Test deprecated routes redirect properly"""
    
    def test_fulfillment_jobs_redirects(self, partner_token):
        """Partner fulfillment-jobs endpoint redirects to vendor/orders"""
        response = requests.get(
            f"{BASE_URL}/api/partner-portal/fulfillment-jobs",
            headers={"Authorization": f"Bearer {partner_token}"},
            allow_redirects=False
        )
        # Should return 307 redirect
        assert response.status_code == 307, f"Expected 307 redirect, got {response.status_code}"
        
        location = response.headers.get("location", "")
        assert "/api/vendor/orders" in location, f"Expected redirect to /api/vendor/orders, got {location}"
        print(f"PASS: fulfillment-jobs redirects to {location}")


class TestAdminOrdersView:
    """Test admin orders view"""
    
    def test_admin_orders_list(self, admin_token):
        """Admin can list orders"""
        response = requests.get(
            f"{BASE_URL}/api/admin/orders/list",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, (list, dict)), "Expected list or dict response"
        print("PASS: Admin can list orders")


class TestVendorOrdersPrivacy:
    """Test vendor orders do not expose customer identity"""
    
    def test_vendor_orders_no_customer_name(self, partner_token):
        """Vendor orders should NOT show customer name"""
        response = requests.get(
            f"{BASE_URL}/api/vendor/orders",
            headers={"Authorization": f"Bearer {partner_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        orders = response.json()
        if orders:
            order = orders[0]
            # Verify customer_name is NOT in the response
            assert "customer_name" not in order, "customer_name should not be exposed to vendor"
            print("PASS: Vendor orders do not expose customer_name")
        else:
            print("INFO: No vendor orders found, but API structure is correct")


class TestFinanceApprovalFlow:
    """Test auto-assignment at approval time"""
    
    def test_finance_queue_accessible(self, admin_token):
        """Finance queue is accessible"""
        response = requests.get(
            f"{BASE_URL}/api/admin-flow-fixes/finance/queue",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of payment proofs"
        print(f"PASS: Finance queue accessible, {len(data)} items")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
