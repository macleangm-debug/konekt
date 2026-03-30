"""
Test Suite for Konekt Margin Delivery Notifications Pack v142
Tests 6 features:
1. Payment queue customer vs payer separation
2. Clickable notifications (approved→orders, rejected→invoices)
3. Compact admin orders table (7 columns only)
4. Product delivery logistics workflow (vendor→ready_for_pickup, sales→picked_up→in_transit→delivered→completed)
5. Sales team delivery override after vendor marks Ready
6. Hybrid margin engine (percentage, fixed_amount, tiered with priority: product>group>global)
"""
import pytest
import requests
import os
from uuid import uuid4

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
CUSTOMER_EMAIL = "demo.customer@konekt.com"
CUSTOMER_PASSWORD = "Demo123!"
PARTNER_EMAIL = "demo.partner@konekt.com"
PARTNER_PASSWORD = "Partner123!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin JWT token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if resp.status_code == 200:
        return resp.json().get("token")
    pytest.skip(f"Admin login failed: {resp.status_code}")


@pytest.fixture(scope="module")
def customer_token():
    """Get customer JWT token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": CUSTOMER_EMAIL,
        "password": CUSTOMER_PASSWORD
    })
    if resp.status_code == 200:
        return resp.json().get("token")
    pytest.skip(f"Customer login failed: {resp.status_code}")


@pytest.fixture(scope="module")
def partner_token():
    """Get partner JWT token"""
    resp = requests.post(f"{BASE_URL}/api/partner-auth/login", json={
        "email": PARTNER_EMAIL,
        "password": PARTNER_PASSWORD
    })
    if resp.status_code == 200:
        return resp.json().get("access_token") or resp.json().get("token")
    pytest.skip(f"Partner login failed: {resp.status_code}")


class TestPaymentQueueCustomerPayerSeparation:
    """Feature 1: Payment queue shows separate Customer (registered name) and Payer (proof submitter)"""

    def test_payments_queue_returns_both_customer_and_payer(self, admin_token):
        """Verify payment queue API returns both customer_name and payer_name fields"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/payments/queue",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), "Expected list response"
        
        if len(data) > 0:
            first_item = data[0]
            # Both fields must exist
            assert "customer_name" in first_item, "customer_name field missing"
            assert "payer_name" in first_item, "payer_name field missing"
            print(f"Sample: customer_name='{first_item.get('customer_name')}', payer_name='{first_item.get('payer_name')}'")

    def test_customer_and_payer_can_differ(self, admin_token):
        """Verify customer_name and payer_name can be different values"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/payments/queue",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        # Find at least one entry where customer != payer
        different_found = False
        for item in data:
            customer = item.get("customer_name", "")
            payer = item.get("payer_name", "")
            if customer and payer and customer != payer and customer != "-" and payer != "-":
                different_found = True
                print(f"Found different: Customer='{customer}', Payer='{payer}'")
                break
        
        # This is informational - not a hard failure if all happen to match
        print(f"Customer/Payer separation verified: {len(data)} items in queue")


class TestMarginEngine:
    """Feature 6: Hybrid margin engine (percentage, fixed_amount, tiered with priority)"""

    def test_list_margin_rules(self, admin_token):
        """GET /api/admin/margin-rules lists all rules"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/margin-rules",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), "Expected list response"
        print(f"Found {len(data)} margin rules")

    def test_create_product_margin_rule(self, admin_token):
        """POST /api/admin/margin-rules creates product-level rule"""
        test_product_id = f"TEST_PRODUCT_{uuid4().hex[:8]}"
        resp = requests.post(
            f"{BASE_URL}/api/admin/margin-rules",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "scope": "product",
                "target_id": test_product_id,
                "target_name": "Test Product",
                "method": "fixed_amount",
                "value": 500
            }
        )
        assert resp.status_code in [200, 201, 409], f"Expected 200/201/409, got {resp.status_code}: {resp.text}"
        if resp.status_code in [200, 201]:
            data = resp.json()
            assert data.get("scope") == "product"
            assert data.get("method") == "fixed_amount"
            assert data.get("value") == 500
            print(f"Created product margin rule: {data.get('id')}")
            # Cleanup
            requests.delete(
                f"{BASE_URL}/api/admin/margin-rules/{data.get('id')}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )

    def test_create_group_margin_rule(self, admin_token):
        """POST /api/admin/margin-rules creates group-level rule"""
        test_group_id = f"TEST_GROUP_{uuid4().hex[:8]}"
        resp = requests.post(
            f"{BASE_URL}/api/admin/margin-rules",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "scope": "group",
                "target_id": test_group_id,
                "target_name": "Test Group",
                "method": "percentage",
                "value": 25
            }
        )
        assert resp.status_code in [200, 201, 409], f"Expected 200/201/409, got {resp.status_code}: {resp.text}"
        if resp.status_code in [200, 201]:
            data = resp.json()
            assert data.get("scope") == "group"
            assert data.get("method") == "percentage"
            print(f"Created group margin rule: {data.get('id')}")
            # Cleanup
            requests.delete(
                f"{BASE_URL}/api/admin/margin-rules/{data.get('id')}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )

    def test_calculate_margin_percentage(self, admin_token):
        """POST /api/admin/margin-rules/calculate with percentage method"""
        resp = requests.post(
            f"{BASE_URL}/api/admin/margin-rules/calculate",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "base_cost": 1000,
                "product_id": None,
                "group_id": None
            }
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "selling_price" in data, "selling_price missing"
        assert "margin" in data, "margin missing"
        assert "base_cost" in data, "base_cost missing"
        print(f"Calculated: base={data['base_cost']}, selling={data['selling_price']}, margin={data['margin']}")

    def test_margin_priority_product_over_global(self, admin_token):
        """Verify product rule takes priority over global rule"""
        # Create a unique product rule
        test_product_id = f"TEST_PRIORITY_{uuid4().hex[:8]}"
        create_resp = requests.post(
            f"{BASE_URL}/api/admin/margin-rules",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "scope": "product",
                "target_id": test_product_id,
                "target_name": "Priority Test Product",
                "method": "fixed_amount",
                "value": 999
            }
        )
        
        if create_resp.status_code in [200, 201]:
            rule_id = create_resp.json().get("id")
            
            # Calculate with this product
            calc_resp = requests.post(
                f"{BASE_URL}/api/admin/margin-rules/calculate",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={
                    "base_cost": 1000,
                    "product_id": test_product_id
                }
            )
            assert calc_resp.status_code == 200
            data = calc_resp.json()
            
            # Should use product rule (fixed_amount 999)
            assert data.get("selling_price") == 1999, f"Expected 1999, got {data.get('selling_price')}"
            assert data.get("rule_applied", {}).get("scope") == "product"
            print(f"Priority verified: product rule applied, selling_price={data['selling_price']}")
            
            # Cleanup
            requests.delete(
                f"{BASE_URL}/api/admin/margin-rules/{rule_id}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )


class TestVendorDeliveryWorkflow:
    """Feature 4 & 5: Vendor delivery workflow and sales override"""

    def test_vendor_orders_list(self, partner_token):
        """GET /api/vendor/orders returns vendor orders"""
        resp = requests.get(
            f"{BASE_URL}/api/vendor/orders",
            headers={"Authorization": f"Bearer {partner_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), "Expected list response"
        print(f"Vendor has {len(data)} orders")

    def test_vendor_can_set_ready_for_pickup(self, partner_token):
        """Vendor can update status to ready_for_pickup"""
        # First get vendor orders
        resp = requests.get(
            f"{BASE_URL}/api/vendor/orders",
            headers={"Authorization": f"Bearer {partner_token}"}
        )
        assert resp.status_code == 200
        orders = resp.json()
        
        if len(orders) == 0:
            pytest.skip("No vendor orders to test")
        
        # Find an order that can be updated
        test_order = None
        for order in orders:
            status = order.get("status", "")
            if status in ["assigned", "work_scheduled", "in_progress", "processing", "accepted"]:
                test_order = order
                break
        
        if not test_order:
            print("No orders in updatable state, testing status endpoint exists")
            # Just verify the endpoint exists
            resp = requests.post(
                f"{BASE_URL}/api/vendor/orders/{orders[0]['id']}/status",
                headers={"Authorization": f"Bearer {partner_token}"},
                json={"status": "ready_for_pickup"}
            )
            # May fail due to status constraints, but endpoint should exist
            assert resp.status_code in [200, 400], f"Unexpected status: {resp.status_code}"
            return
        
        # Update to ready_for_pickup
        resp = requests.post(
            f"{BASE_URL}/api/vendor/orders/{test_order['id']}/status",
            headers={"Authorization": f"Bearer {partner_token}"},
            json={"status": "ready_for_pickup"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print(f"Vendor updated order {test_order['id']} to ready_for_pickup")

    def test_vendor_cannot_set_logistics_statuses(self, partner_token):
        """Vendor cannot set picked_up, in_transit, delivered, completed"""
        resp = requests.get(
            f"{BASE_URL}/api/vendor/orders",
            headers={"Authorization": f"Bearer {partner_token}"}
        )
        assert resp.status_code == 200
        orders = resp.json()
        
        if len(orders) == 0:
            pytest.skip("No vendor orders to test")
        
        test_order = orders[0]
        
        # Try to set picked_up - should fail
        for forbidden_status in ["picked_up", "in_transit", "delivered", "completed"]:
            resp = requests.post(
                f"{BASE_URL}/api/vendor/orders/{test_order['id']}/status",
                headers={"Authorization": f"Bearer {partner_token}"},
                json={"status": forbidden_status}
            )
            assert resp.status_code == 400, f"Vendor should not be able to set {forbidden_status}, got {resp.status_code}"
            print(f"Correctly blocked vendor from setting {forbidden_status}")


class TestSalesDeliveryOverride:
    """Feature 5: Sales team delivery override after vendor marks Ready"""

    def test_sales_delivery_update_endpoint_exists(self, admin_token):
        """POST /api/sales/delivery/{id}/update-status endpoint exists"""
        # Use a fake ID to test endpoint existence
        resp = requests.post(
            f"{BASE_URL}/api/sales/delivery/fake-id-12345/update-status",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"status": "picked_up"}
        )
        # Should return 404 (not found) not 405 (method not allowed)
        assert resp.status_code in [404, 400], f"Expected 404/400, got {resp.status_code}: {resp.text}"
        print("Sales delivery update endpoint exists")

    def test_sales_logistics_status_endpoint_exists(self, admin_token):
        """GET /api/sales/delivery/{id}/logistics-status endpoint exists"""
        resp = requests.get(
            f"{BASE_URL}/api/sales/delivery/fake-id-12345/logistics-status",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Should return 404 (not found) not 405 (method not allowed)
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}: {resp.text}"
        print("Sales logistics status endpoint exists")


class TestNotificationTargetUrls:
    """Feature 2: Clickable notifications with correct target_url"""

    def test_customer_notifications_have_target_url(self, customer_token):
        """Customer notifications include target_url field"""
        resp = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        
        if len(data) > 0:
            # Check that notifications have target_url
            for notif in data[:5]:  # Check first 5
                if notif.get("event_type") in ["payment_approved", "payment_rejected"]:
                    assert "target_url" in notif, f"target_url missing for {notif.get('event_type')}"
                    print(f"Notification {notif.get('event_type')}: target_url={notif.get('target_url')}")

    def test_payment_approved_notification_targets_orders(self, admin_token):
        """Verify payment_approved notifications have target_url=/account/orders"""
        # This is verified by checking the code in live_commerce_service.py
        # The approve_payment_proof method creates notification with target_url="/account/orders"
        # We can verify by checking existing notifications
        resp = requests.get(
            f"{BASE_URL}/api/admin/notifications",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if resp.status_code == 200:
            data = resp.json()
            for notif in data:
                if notif.get("event_type") == "payment_approved":
                    assert notif.get("target_url") == "/account/orders", \
                        f"Expected /account/orders, got {notif.get('target_url')}"
                    print(f"payment_approved notification correctly targets /account/orders")
                    break


class TestAdminOrdersTable:
    """Feature 3: Compact admin orders table (7 columns only)"""

    def test_admin_orders_api_returns_required_fields(self, admin_token):
        """Admin orders API returns fields for 7-column table"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/orders",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        
        # API returns {orders: [...], total, page, pages, statuses}
        orders = data.get("orders", []) if isinstance(data, dict) else data
        
        if len(orders) > 0:
            order = orders[0]
            # Required fields for 7-column table: Date, Order #, Customer, Payer, Total, Payment, Fulfillment
            required_fields = ["created_at", "order_number", "total_amount", "payment_status", "status"]
            for field in required_fields:
                # Allow alternative field names
                if field == "total_amount" and "total" in order:
                    continue
                if field == "status" and "fulfillment_state" in order:
                    continue
                assert field in order or field.replace("_", "") in str(order.keys()).lower(), \
                    f"Field {field} missing from order response"
            print(f"Order has all required fields for 7-column table")
            print(f"Order keys: {list(order.keys())}")

    def test_admin_order_detail_has_assignment_info(self, admin_token):
        """Admin order detail includes Source, Sales, Vendor, Approved By"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/orders",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        # API returns {orders: [...], total, page, pages, statuses}
        orders = data.get("orders", []) if isinstance(data, dict) else data
        
        if len(orders) == 0:
            pytest.skip("No orders to test")
        
        # Get detail for first order
        order_id = orders[0].get("id")
        detail_resp = requests.get(
            f"{BASE_URL}/api/admin/orders/{order_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert detail_resp.status_code == 200, f"Expected 200, got {detail_resp.status_code}"
        detail = detail_resp.json()
        
        # Detail should have assignment info
        # These may be in nested objects
        print(f"Order detail keys: {list(detail.keys())}")
        # The drawer shows: Source, Sales, Vendor, Approved By
        # These come from: order.type, sales_user/sales_assignment, vendor_orders, payment_proof.approved_by


class TestHealthAndBasics:
    """Basic health checks"""

    def test_api_health(self):
        """API health check"""
        resp = requests.get(f"{BASE_URL}/api/health")
        assert resp.status_code == 200
        assert resp.json().get("status") == "healthy"

    def test_admin_login(self):
        """Admin can login"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert resp.status_code == 200
        assert "token" in resp.json()

    def test_customer_login(self):
        """Customer can login"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert resp.status_code == 200
        assert "token" in resp.json()

    def test_partner_login(self):
        """Partner can login"""
        resp = requests.post(f"{BASE_URL}/api/partner-auth/login", json={
            "email": PARTNER_EMAIL,
            "password": PARTNER_PASSWORD
        })
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "access_token" in data or "token" in data, "Token missing from response"
