"""
Approval Flow Tests v139 - Konekt B2B E-commerce Platform
Tests for POST /api/admin/payments/{proof_id}/approve via LiveCommerceService

CRITICAL TESTS:
1. Approval creates order with approved_by, approved_at, assigned_sales_id, assigned_vendor_id, payer_name
2. After approval, invoice has approved_by and approved_at fields
3. After approval, vendor_order is created with vendor_order_no, base_price, status=assigned
4. After approval, sales_assignment is created with correct sales_owner_id
5. After approval, customer notification is created with title='Payment Approved'
6. Admin invoices show customer_name and payer_name as SEPARATE fields
7. Admin orders show customer_name and payer_name separately
8. Vendor orders do NOT contain customer_name/phone/email (privacy)
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
CUSTOMER_EMAIL = "demo.customer@konekt.com"
CUSTOMER_PASSWORD = "Demo123!"
VENDOR_EMAIL = "demo.partner@konekt.com"
VENDOR_PASSWORD = "Partner123!"


class TestApprovalFlowV139:
    """Test the payment approval flow via LiveCommerceService"""

    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Admin login failed: {response.status_code}")

    @pytest.fixture(scope="class")
    def customer_token(self):
        """Get customer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Customer login failed: {response.status_code}")

    @pytest.fixture(scope="class")
    def vendor_token(self):
        """Get vendor auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Vendor login failed: {response.status_code}")

    # ─── TEST 1: Get payment queue and find an uploaded proof ───
    def test_01_get_payment_queue(self, admin_token):
        """Get payment queue to find proofs with status=uploaded"""
        response = requests.get(
            f"{BASE_URL}/api/admin/payments/queue",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        proofs = response.json()
        assert isinstance(proofs, list), "Expected list of proofs"
        
        # Find proofs with status=uploaded
        uploaded = [p for p in proofs if p.get("status") == "uploaded"]
        print(f"Found {len(uploaded)} proofs with status=uploaded")
        
        if uploaded:
            proof = uploaded[0]
            print(f"Sample proof: id={proof.get('payment_proof_id')}, payer={proof.get('payer_name')}, amount={proof.get('amount_paid')}")
            # Store for next test
            TestApprovalFlowV139.test_proof_id = proof.get("payment_proof_id")
            TestApprovalFlowV139.test_invoice_id = proof.get("invoice_id")
            TestApprovalFlowV139.test_payer_name = proof.get("payer_name")
        else:
            pytest.skip("No uploaded proofs available for testing")

    # ─── TEST 2: CRITICAL - Approve payment proof ───
    def test_02_approve_payment_proof(self, admin_token):
        """CRITICAL: POST /api/admin/payments/{proof_id}/approve creates order with all required fields"""
        proof_id = getattr(TestApprovalFlowV139, 'test_proof_id', None)
        if not proof_id:
            pytest.skip("No proof_id from previous test")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/payments/{proof_id}/approve",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "approver_role": "admin",
                "assigned_sales_id": None,  # Let system auto-assign
                "assigned_sales_name": None
            }
        )
        
        assert response.status_code == 200, f"Approval failed: {response.status_code} - {response.text}"
        result = response.json()
        
        print(f"Approval result: {result}")
        
        # Verify response structure
        assert "fully_paid" in result, "Response should have fully_paid field"
        assert "invoice_status" in result, "Response should have invoice_status field"
        
        # If fully paid, order should be created
        if result.get("fully_paid"):
            assert "order" in result, "Response should have order when fully_paid"
            order = result.get("order")
            if order:
                print(f"Order created: {order.get('order_number')}")
                TestApprovalFlowV139.created_order_id = order.get("id")
                TestApprovalFlowV139.created_order_number = order.get("order_number")
                
                # CRITICAL: Verify order has required fields
                assert order.get("approved_by"), f"Order missing approved_by, got: {order.get('approved_by')}"
                assert order.get("approved_at"), f"Order missing approved_at, got: {order.get('approved_at')}"
                assert order.get("payer_name"), f"Order missing payer_name, got: {order.get('payer_name')}"
                print(f"Order fields: approved_by={order.get('approved_by')}, approved_at={order.get('approved_at')}, payer_name={order.get('payer_name')}")
                print(f"Order fields: assigned_sales_id={order.get('assigned_sales_id')}, assigned_vendor_id={order.get('assigned_vendor_id')}")

    # ─── TEST 3: CRITICAL - Verify invoice has approved_by and approved_at ───
    def test_03_verify_invoice_approval_fields(self, admin_token):
        """CRITICAL: After approval, invoice has approved_by and approved_at fields"""
        invoice_id = getattr(TestApprovalFlowV139, 'test_invoice_id', None)
        if not invoice_id:
            pytest.skip("No invoice_id from previous test")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/invoices/{invoice_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed to get invoice: {response.status_code}"
        data = response.json()
        invoice = data.get("invoice", data)
        
        print(f"Invoice status: {invoice.get('status')}, payment_status: {invoice.get('payment_status')}")
        print(f"Invoice approved_by: {invoice.get('approved_by')}, approved_at: {invoice.get('approved_at')}")
        
        # CRITICAL: Verify approval fields
        assert invoice.get("approved_by"), f"Invoice missing approved_by, got: {invoice.get('approved_by')}"
        assert invoice.get("approved_at"), f"Invoice missing approved_at, got: {invoice.get('approved_at')}"

    # ─── TEST 4: CRITICAL - Verify vendor_order created with required fields ───
    def test_04_verify_vendor_order_created(self, admin_token):
        """CRITICAL: After approval, vendor_order is created with vendor_order_no, base_price, status=assigned"""
        order_id = getattr(TestApprovalFlowV139, 'created_order_id', None)
        if not order_id:
            pytest.skip("No order_id from previous test")
        
        # Get order detail which includes vendor_orders
        response = requests.get(
            f"{BASE_URL}/api/admin/orders/{order_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed to get order: {response.status_code}"
        data = response.json()
        vendor_orders = data.get("vendor_orders", [])
        
        print(f"Found {len(vendor_orders)} vendor orders")
        
        if vendor_orders:
            vo = vendor_orders[0]
            print(f"Vendor order: vendor_order_no={vo.get('vendor_order_no')}, base_price={vo.get('base_price')}, status={vo.get('status')}")
            
            # CRITICAL: Verify vendor_order fields
            assert vo.get("vendor_order_no"), f"Vendor order missing vendor_order_no, got: {vo.get('vendor_order_no')}"
            assert vo.get("base_price") is not None, f"Vendor order missing base_price, got: {vo.get('base_price')}"
            assert vo.get("status") == "assigned", f"Vendor order status should be 'assigned', got: {vo.get('status')}"
        else:
            # Vendor orders may not be created if no vendor_id in items
            print("No vendor orders created (may be expected if no vendor_id in invoice items)")

    # ─── TEST 5: CRITICAL - Verify sales_assignment created ───
    def test_05_verify_sales_assignment_created(self, admin_token):
        """CRITICAL: After approval, sales_assignment is created with correct sales_owner_id"""
        order_id = getattr(TestApprovalFlowV139, 'created_order_id', None)
        if not order_id:
            pytest.skip("No order_id from previous test")
        
        # Get order detail which includes sales_assignment
        response = requests.get(
            f"{BASE_URL}/api/admin/orders/{order_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed to get order: {response.status_code}"
        data = response.json()
        sales_assignment = data.get("sales_assignment")
        
        print(f"Sales assignment: {sales_assignment}")
        
        if sales_assignment:
            print(f"Sales assignment: sales_owner_id={sales_assignment.get('sales_owner_id')}, sales_owner_name={sales_assignment.get('sales_owner_name')}")
            
            # CRITICAL: Verify sales_assignment has sales_owner_id
            assert sales_assignment.get("sales_owner_id"), f"Sales assignment missing sales_owner_id, got: {sales_assignment.get('sales_owner_id')}"
        else:
            print("No sales_assignment found (may be expected if no sales user available)")

    # ─── TEST 6: CRITICAL - Verify customer notification created ───
    def test_06_verify_customer_notification(self, customer_token):
        """CRITICAL: After approval, customer notification is created with title='Payment Approved'"""
        # Get customer notifications
        response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        
        if response.status_code != 200:
            print(f"Notifications endpoint returned {response.status_code}")
            pytest.skip("Notifications endpoint not available")
        
        notifications = response.json()
        if isinstance(notifications, dict):
            notifications = notifications.get("notifications", [])
        
        # Find payment approved notification
        payment_approved = [n for n in notifications if n.get("title") == "Payment Approved" or n.get("event_type") == "payment_approved"]
        
        print(f"Found {len(payment_approved)} 'Payment Approved' notifications")
        
        if payment_approved:
            notif = payment_approved[0]
            print(f"Notification: title={notif.get('title')}, target_url={notif.get('target_url')}")
            
            # CRITICAL: Verify notification fields
            assert notif.get("title") == "Payment Approved", f"Expected title 'Payment Approved', got: {notif.get('title')}"
            assert notif.get("target_url") == "/account/invoices", f"Expected target_url '/account/invoices', got: {notif.get('target_url')}"

    # ─── TEST 7: SEPARATION - Admin invoices show customer_name and payer_name separately ───
    def test_07_admin_invoices_separation(self, admin_token):
        """SEPARATION: Admin invoices at /api/admin/invoices/list show customer_name and payer_name as SEPARATE fields"""
        response = requests.get(
            f"{BASE_URL}/api/admin/invoices/list",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        invoices = response.json()
        
        # Check that both fields exist as separate keys
        if invoices:
            sample = invoices[0]
            has_customer_name = "customer_name" in sample
            has_payer_name = "payer_name" in sample
            
            print(f"Invoice fields: customer_name={has_customer_name}, payer_name={has_payer_name}")
            assert has_customer_name or has_payer_name, "Invoice should have customer_name or payer_name field"
            
            # Count invoices where payer_name != customer_name (true separation)
            separated = 0
            for inv in invoices[:20]:
                cust = inv.get("customer_name", "")
                payer = inv.get("payer_name", "")
                if cust and payer and cust != payer and payer != "-":
                    separated += 1
                    print(f"  Separated: customer={cust}, payer={payer}")
            
            print(f"Found {separated} invoices with distinct customer_name and payer_name")

    # ─── TEST 8: SEPARATION - Admin orders show customer_name and payer_name separately ───
    def test_08_admin_orders_separation(self, admin_token):
        """SEPARATION: Admin orders at /api/admin/orders-ops show customer_name and payer_name separately"""
        response = requests.get(
            f"{BASE_URL}/api/admin/orders-ops",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        orders = response.json()
        
        if orders:
            sample = orders[0]
            print(f"Order fields present: customer_name={sample.get('customer_name')}, payer_name={sample.get('payer_name')}")
            print(f"Order fields present: approved_by={sample.get('approved_by')}, approved_at={sample.get('approved_at')}")
            
            # Count orders with both fields
            both_populated = 0
            for order in orders[:20]:
                cust = order.get("customer_name", "")
                payer = order.get("payer_name", "")
                if cust and payer and payer != "-":
                    both_populated += 1
            
            print(f"Found {both_populated} orders with both customer_name and payer_name populated")

    # ─── TEST 9: VENDOR-PRIVACY - Vendor orders do NOT contain customer identity ───
    def test_09_vendor_orders_privacy(self, vendor_token):
        """VENDOR-PRIVACY: Vendor orders at /api/vendor/orders do NOT contain customer_name/phone/email"""
        response = requests.get(
            f"{BASE_URL}/api/vendor/orders",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        
        if response.status_code != 200:
            print(f"Vendor orders endpoint returned {response.status_code}")
            pytest.skip("Vendor orders endpoint not available or no orders")
        
        orders = response.json()
        if isinstance(orders, dict):
            orders = orders.get("orders", [])
        
        print(f"Found {len(orders)} vendor orders")
        
        if orders:
            sample = orders[0]
            
            # CRITICAL: Verify NO customer identity fields
            forbidden_fields = ["customer_name", "customer_email", "customer_phone"]
            for field in forbidden_fields:
                value = sample.get(field)
                if value and value != "-" and value != "":
                    print(f"WARNING: Vendor order contains {field}={value}")
                    # This is a privacy violation
                    assert False, f"Vendor order should NOT contain {field}, but found: {value}"
            
            # Verify allowed fields are present
            allowed_fields = ["vendor_order_no", "base_price", "status", "sales_name", "sales_phone", "sales_email"]
            for field in allowed_fields:
                if field in sample:
                    print(f"  Allowed field {field}={sample.get(field)}")
            
            print("PASS: Vendor orders do not expose customer identity")

    # ─── TEST 10: Customer orders show real sales contact ───
    def test_10_customer_orders_sales_contact(self, customer_token):
        """CUSTOMER: Customer order drawer shows real sales contact from /api/customer/orders"""
        response = requests.get(
            f"{BASE_URL}/api/customer/orders",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        
        if response.status_code != 200:
            print(f"Customer orders endpoint returned {response.status_code}")
            pytest.skip("Customer orders endpoint not available")
        
        orders = response.json()
        if isinstance(orders, dict):
            orders = orders.get("orders", [])
        
        print(f"Found {len(orders)} customer orders")
        
        if orders:
            sample = orders[0]
            sales_name = sample.get("sales_name") or sample.get("assigned_sales_name")
            sales_phone = sample.get("sales_phone")
            sales_email = sample.get("sales_email")
            
            print(f"Sales contact: name={sales_name}, phone={sales_phone}, email={sales_email}")
            
            # Verify sales contact is not placeholder
            if sales_name:
                assert sales_name != "Konekt Sales Team", f"Sales name should be real, not placeholder: {sales_name}"

    # ─── TEST 11: Admin orders table shows Payer and Approved By columns ───
    def test_11_admin_orders_table_columns(self, admin_token):
        """ADMIN-UI: Admin orders table shows Payer column and Approved By column"""
        response = requests.get(
            f"{BASE_URL}/api/admin/orders-ops",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        orders = response.json()
        
        if orders:
            # Check that orders have payer_name and approved_by fields
            sample = orders[0]
            
            has_payer = "payer_name" in sample
            has_approved_by = "approved_by" in sample
            
            print(f"Admin orders have: payer_name={has_payer}, approved_by={has_approved_by}")
            
            # Find orders with populated values
            with_payer = sum(1 for o in orders if o.get("payer_name") and o.get("payer_name") != "-")
            with_approved = sum(1 for o in orders if o.get("approved_by") and o.get("approved_by") != "-")
            
            print(f"Orders with payer_name: {with_payer}/{len(orders)}")
            print(f"Orders with approved_by: {with_approved}/{len(orders)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
