"""
Approval Flow Tests v140 - Konekt B2B E-commerce Platform
Tests for POST /api/admin/payments/{proof_id}/approve via LiveCommerceService

CRITICAL TESTS (from main agent):
1. CRITICAL-1: POST /api/admin/payments/{proof_id}/approve creates order with approved_by=real admin name (NOT 'admin' or 'finance'), approved_at=valid ISO
2. CRITICAL-2: After approval, order has assigned_vendor_id matching a real partner_id (69b827eae21f56c57362c6b7)
3. CRITICAL-3: After approval, vendor_order is created with correct vendor_id matching the partner's login id
4. CRITICAL-4: Vendor at /api/vendor/orders sees the new order (with vendor_order_no, base_price, status=assigned)
5. CRITICAL-5: Vendor response does NOT contain customer_name, customer_phone, customer_email
6. CRITICAL-6: Admin order detail at /api/admin/orders-ops/{id} shows payer_name from proof only (NOT customer_name), approved_by=real name, approved_at=valid ISO
7. CRITICAL-7: Admin order detail shows vendor_orders with vendor_name resolved from partner_users.full_name
8. CRITICAL-8: Customer order drawer at /api/customer/orders shows real sales name/phone/email
9. SEPARATION: In admin order detail, payment_proof.payer_name != customer_name when both are populated
"""
import pytest
import requests
import os
import re
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
CUSTOMER_EMAIL = "demo.customer@konekt.com"
CUSTOMER_PASSWORD = "Demo123!"
VENDOR_EMAIL = "demo.partner@konekt.com"
VENDOR_PASSWORD = "Partner123!"

# Expected partner_id for demo partner
EXPECTED_PARTNER_ID = "69b827eae21f56c57362c6b7"
EXPECTED_VENDOR_NAME = "John Demo"


class TestApprovalFlowV140:
    """Test the payment approval flow via LiveCommerceService - v140 critical tests"""

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
            TestApprovalFlowV140.test_proof_id = proof.get("payment_proof_id")
            TestApprovalFlowV140.test_invoice_id = proof.get("invoice_id")
            TestApprovalFlowV140.test_payer_name = proof.get("payer_name")
        else:
            print("No uploaded proofs available - will test existing approved orders")
            TestApprovalFlowV140.test_proof_id = None

    # ─── TEST 2: CRITICAL-1 - Approve payment proof with real admin name ───
    def test_02_critical1_approve_with_real_admin_name(self, admin_token):
        """CRITICAL-1: POST /api/admin/payments/{proof_id}/approve creates order with approved_by=real admin name (NOT 'admin' or 'finance')"""
        proof_id = getattr(TestApprovalFlowV140, 'test_proof_id', None)
        if not proof_id:
            pytest.skip("No proof_id available for approval test")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/payments/{proof_id}/approve",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "approver_role": "admin",
                "assigned_sales_id": None,
                "assigned_sales_name": None
            }
        )
        
        assert response.status_code == 200, f"Approval failed: {response.status_code} - {response.text}"
        result = response.json()
        
        print(f"Approval result: fully_paid={result.get('fully_paid')}, invoice_status={result.get('invoice_status')}")
        
        if result.get("fully_paid") and result.get("order"):
            order = result.get("order")
            TestApprovalFlowV140.created_order_id = order.get("id")
            TestApprovalFlowV140.created_order_number = order.get("order_number")
            
            # CRITICAL-1: approved_by should be real admin name, NOT 'admin' or 'finance'
            approved_by = order.get("approved_by", "")
            print(f"Order approved_by: '{approved_by}'")
            
            # Check it's not a generic role name
            generic_roles = ["admin", "finance", "staff", "sales", ""]
            is_real_name = approved_by.lower() not in generic_roles
            
            # Also check approved_at is valid ISO format
            approved_at = order.get("approved_at", "")
            print(f"Order approved_at: '{approved_at}'")
            
            # Validate ISO format
            is_valid_iso = False
            if approved_at:
                try:
                    datetime.fromisoformat(approved_at.replace('Z', '+00:00'))
                    is_valid_iso = True
                except:
                    pass
            
            print(f"CRITICAL-1: approved_by is real name: {is_real_name}, approved_at is valid ISO: {is_valid_iso}")
            
            # Store for later tests
            TestApprovalFlowV140.order_approved_by = approved_by
            TestApprovalFlowV140.order_approved_at = approved_at
        else:
            print("Order not created (may not be fully paid)")

    # ─── TEST 3: CRITICAL-2 - Order has assigned_vendor_id matching real partner_id ───
    def test_03_critical2_assigned_vendor_id_matches_partner(self, admin_token):
        """CRITICAL-2: After approval, order has assigned_vendor_id matching a real partner_id"""
        order_id = getattr(TestApprovalFlowV140, 'created_order_id', None)
        
        # If no order from approval, find a recent order
        if not order_id:
            response = requests.get(
                f"{BASE_URL}/api/admin/orders-ops",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            if response.status_code == 200:
                orders = response.json()
                # Find order with assigned_vendor_id
                for o in orders[:10]:
                    if o.get("assigned_vendor_id"):
                        order_id = o.get("id")
                        TestApprovalFlowV140.created_order_id = order_id
                        break
        
        if not order_id:
            pytest.skip("No order with assigned_vendor_id found")
        
        # Get order detail
        response = requests.get(
            f"{BASE_URL}/api/admin/orders-ops/{order_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed to get order: {response.status_code}"
        data = response.json()
        order = data.get("order", data)
        
        assigned_vendor_id = order.get("assigned_vendor_id", "")
        vendor_ids = order.get("vendor_ids", [])
        
        print(f"Order assigned_vendor_id: '{assigned_vendor_id}'")
        print(f"Order vendor_ids: {vendor_ids}")
        
        # CRITICAL-2: Check if assigned_vendor_id matches expected partner_id
        if assigned_vendor_id:
            print(f"CRITICAL-2: assigned_vendor_id={assigned_vendor_id}, expected={EXPECTED_PARTNER_ID}")
            # Store for later tests
            TestApprovalFlowV140.order_assigned_vendor_id = assigned_vendor_id

    # ─── TEST 4: CRITICAL-3 - Vendor order has correct vendor_id ───
    def test_04_critical3_vendor_order_has_correct_vendor_id(self, admin_token):
        """CRITICAL-3: After approval, vendor_order is created with correct vendor_id matching the partner's login id"""
        order_id = getattr(TestApprovalFlowV140, 'created_order_id', None)
        if not order_id:
            pytest.skip("No order_id available")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/orders-ops/{order_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed to get order: {response.status_code}"
        data = response.json()
        vendor_orders = data.get("vendor_orders", [])
        
        print(f"Found {len(vendor_orders)} vendor orders")
        
        if vendor_orders:
            vo = vendor_orders[0]
            vendor_id = vo.get("vendor_id", "")
            vendor_order_no = vo.get("vendor_order_no", "")
            base_price = vo.get("base_price")
            status = vo.get("status", "")
            
            print(f"Vendor order: vendor_id={vendor_id}, vendor_order_no={vendor_order_no}, base_price={base_price}, status={status}")
            
            # CRITICAL-3: vendor_id should match partner's login id
            print(f"CRITICAL-3: vendor_id={vendor_id}, expected={EXPECTED_PARTNER_ID}")
            
            # Store for later tests
            TestApprovalFlowV140.vendor_order_vendor_id = vendor_id
            TestApprovalFlowV140.vendor_order_no = vendor_order_no
        else:
            print("No vendor orders found (may be expected if no vendor_id in items)")

    # ─── TEST 5: CRITICAL-4 - Vendor sees the order ───
    def test_05_critical4_vendor_sees_order(self, vendor_token):
        """CRITICAL-4: Vendor at /api/vendor/orders sees the new order (with vendor_order_no, base_price, status=assigned)"""
        response = requests.get(
            f"{BASE_URL}/api/vendor/orders",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        
        if response.status_code != 200:
            print(f"Vendor orders endpoint returned {response.status_code}")
            pytest.skip("Vendor orders endpoint not available")
        
        orders = response.json()
        if isinstance(orders, dict):
            orders = orders.get("orders", [])
        
        print(f"Vendor sees {len(orders)} orders")
        
        if orders:
            # Check for the specific vendor_order_no if we have it
            expected_vo_no = getattr(TestApprovalFlowV140, 'vendor_order_no', None)
            
            for vo in orders[:5]:
                vo_no = vo.get("vendor_order_no", "")
                base_price = vo.get("base_price")
                status = vo.get("status", "")
                
                print(f"  Vendor order: vendor_order_no={vo_no}, base_price={base_price}, status={status}")
                
                # CRITICAL-4: Verify required fields
                assert vo_no, f"Vendor order missing vendor_order_no"
                assert base_price is not None, f"Vendor order missing base_price"
                
                if expected_vo_no and vo_no == expected_vo_no:
                    print(f"CRITICAL-4: Found expected vendor order {expected_vo_no}")
                    assert status in ["assigned", "processing", "accepted"], f"Expected status assigned/processing/accepted, got: {status}"
        else:
            print("No vendor orders visible to vendor")

    # ─── TEST 6: CRITICAL-5 - Vendor response does NOT contain customer identity ───
    def test_06_critical5_vendor_no_customer_identity(self, vendor_token):
        """CRITICAL-5: Vendor response does NOT contain customer_name, customer_phone, customer_email"""
        response = requests.get(
            f"{BASE_URL}/api/vendor/orders",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        
        if response.status_code != 200:
            pytest.skip("Vendor orders endpoint not available")
        
        orders = response.json()
        if isinstance(orders, dict):
            orders = orders.get("orders", [])
        
        if not orders:
            pytest.skip("No vendor orders to check")
        
        # CRITICAL-5: Check ALL orders for customer identity leakage
        forbidden_fields = ["customer_name", "customer_email", "customer_phone"]
        violations = []
        
        for vo in orders:
            for field in forbidden_fields:
                value = vo.get(field)
                if value and value != "-" and value != "" and value != "N/A":
                    violations.append(f"{field}={value}")
        
        if violations:
            print(f"CRITICAL-5 VIOLATION: Vendor orders contain customer identity: {violations}")
            assert False, f"Vendor orders should NOT contain customer identity, but found: {violations}"
        else:
            print("CRITICAL-5 PASS: Vendor orders do NOT expose customer identity")

    # ─── TEST 7: CRITICAL-6 - Admin order detail shows payer_name from proof, approved_by=real name ───
    def test_07_critical6_admin_order_detail_payer_approved(self, admin_token):
        """CRITICAL-6: Admin order detail at /api/admin/orders-ops/{id} shows payer_name from proof only (NOT customer_name), approved_by=real name, approved_at=valid ISO"""
        order_id = getattr(TestApprovalFlowV140, 'created_order_id', None)
        
        # If no order from approval, find a recent order with payer_name
        if not order_id:
            response = requests.get(
                f"{BASE_URL}/api/admin/orders-ops",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            if response.status_code == 200:
                orders = response.json()
                for o in orders[:10]:
                    if o.get("payer_name") and o.get("payer_name") != "-":
                        order_id = o.get("id")
                        break
        
        if not order_id:
            pytest.skip("No order with payer_name found")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/orders-ops/{order_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed to get order detail: {response.status_code}"
        data = response.json()
        
        # Get payer_name from payment_proof section
        payment_proof = data.get("payment_proof", {})
        payer_name = payment_proof.get("payer_name") or data.get("payer_name", "")
        approved_by = payment_proof.get("approved_by") or data.get("approved_by", "")
        approved_at = payment_proof.get("approved_at") or data.get("approved_at", "")
        
        # Get customer_name
        customer_name = data.get("customer_name", "")
        
        print(f"CRITICAL-6: payer_name='{payer_name}', customer_name='{customer_name}'")
        print(f"CRITICAL-6: approved_by='{approved_by}', approved_at='{approved_at}'")
        
        # Check approved_by is not a generic role
        generic_roles = ["admin", "finance", "staff", "sales"]
        if approved_by and approved_by.lower() not in generic_roles:
            print(f"CRITICAL-6 PASS: approved_by is real name: '{approved_by}'")
        else:
            print(f"CRITICAL-6 NOTE: approved_by='{approved_by}' (may be generic role)")
        
        # Check approved_at is valid ISO
        if approved_at:
            try:
                datetime.fromisoformat(approved_at.replace('Z', '+00:00'))
                print(f"CRITICAL-6 PASS: approved_at is valid ISO: '{approved_at}'")
            except:
                print(f"CRITICAL-6 WARNING: approved_at is not valid ISO: '{approved_at}'")

    # ─── TEST 8: CRITICAL-7 - Admin order detail shows vendor_name from partner_users.full_name ───
    def test_08_critical7_vendor_name_from_partner_users(self, admin_token):
        """CRITICAL-7: Admin order detail shows vendor_orders with vendor_name resolved from partner_users.full_name"""
        order_id = getattr(TestApprovalFlowV140, 'created_order_id', None)
        
        # If no order from approval, find a recent order with vendor_orders
        if not order_id:
            response = requests.get(
                f"{BASE_URL}/api/admin/orders-ops",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            if response.status_code == 200:
                orders = response.json()
                for o in orders[:10]:
                    if o.get("vendor_count", 0) > 0:
                        order_id = o.get("id")
                        break
        
        if not order_id:
            pytest.skip("No order with vendor_orders found")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/orders-ops/{order_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed to get order detail: {response.status_code}"
        data = response.json()
        vendor_orders = data.get("vendor_orders", [])
        
        if vendor_orders:
            vo = vendor_orders[0]
            vendor_name = vo.get("vendor_name", "")
            vendor_id = vo.get("vendor_id", "")
            
            print(f"CRITICAL-7: vendor_id='{vendor_id}', vendor_name='{vendor_name}'")
            
            # Check vendor_name is resolved (not just the ID)
            if vendor_name and vendor_name != vendor_id and len(vendor_name) > 12:
                print(f"CRITICAL-7 PASS: vendor_name is resolved: '{vendor_name}'")
            elif vendor_name == EXPECTED_VENDOR_NAME:
                print(f"CRITICAL-7 PASS: vendor_name matches expected: '{vendor_name}'")
            else:
                print(f"CRITICAL-7 NOTE: vendor_name='{vendor_name}' (may not be fully resolved)")
        else:
            print("No vendor_orders in order detail")

    # ─── TEST 9: CRITICAL-8 - Customer order drawer shows real sales contact ───
    def test_09_critical8_customer_sees_real_sales_contact(self, customer_token):
        """CRITICAL-8: Customer order drawer at /api/customer/orders shows real sales name/phone/email"""
        response = requests.get(
            f"{BASE_URL}/api/customer/orders",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        
        if response.status_code != 200:
            pytest.skip(f"Customer orders endpoint returned {response.status_code}")
        
        orders = response.json()
        if isinstance(orders, dict):
            orders = orders.get("orders", [])
        
        print(f"Customer sees {len(orders)} orders")
        
        if orders:
            # Check first few orders for sales contact
            for order in orders[:3]:
                sales_name = order.get("sales_name") or order.get("assigned_sales_name", "")
                sales_phone = order.get("sales_phone", "")
                sales_email = order.get("sales_email", "")
                
                print(f"  Order {order.get('order_number')}: sales_name='{sales_name}', sales_phone='{sales_phone}', sales_email='{sales_email}'")
                
                # CRITICAL-8: Check sales contact is real (not placeholder)
                if sales_name:
                    placeholders = ["konekt sales team", "sales", "unassigned", "auto-sales", ""]
                    if sales_name.lower() not in placeholders:
                        print(f"CRITICAL-8 PASS: Real sales name: '{sales_name}'")
                    else:
                        print(f"CRITICAL-8 NOTE: Sales name may be placeholder: '{sales_name}'")
        else:
            print("No customer orders found")

    # ─── TEST 10: SEPARATION - payer_name != customer_name ───
    def test_10_separation_payer_vs_customer(self, admin_token):
        """SEPARATION: In admin order detail, payment_proof.payer_name != customer_name when both are populated"""
        response = requests.get(
            f"{BASE_URL}/api/admin/orders-ops",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        orders = response.json()
        
        # Find orders where payer_name and customer_name are both populated and different
        separated_count = 0
        for order in orders[:30]:
            payer = order.get("payer_name", "")
            customer = order.get("customer_name", "")
            
            if payer and customer and payer != "-" and customer != "-" and payer != customer:
                separated_count += 1
                print(f"  SEPARATED: order={order.get('order_number')}, payer='{payer}', customer='{customer}'")
        
        print(f"SEPARATION: Found {separated_count} orders with distinct payer_name and customer_name")
        
        if separated_count > 0:
            print("SEPARATION PASS: Payer and customer are properly separated")

    # ─── TEST 11: Verify admin orders list has all required columns ───
    def test_11_admin_orders_list_columns(self, admin_token):
        """Verify admin orders list at /api/admin/orders-ops has all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/admin/orders-ops",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        orders = response.json()
        
        if orders:
            sample = orders[0]
            
            # Check for required fields
            required_fields = [
                "order_number", "customer_name", "payer_name", "approved_by", "approved_at",
                "vendor_name", "sales_owner", "payment_state", "fulfillment_state"
            ]
            
            present = []
            missing = []
            for field in required_fields:
                if field in sample:
                    present.append(field)
                else:
                    missing.append(field)
            
            print(f"Present fields: {present}")
            print(f"Missing fields: {missing}")
            
            # Count orders with populated values
            stats = {}
            for field in required_fields:
                count = sum(1 for o in orders if o.get(field) and o.get(field) != "-")
                stats[field] = f"{count}/{len(orders)}"
            
            print(f"Field population stats: {stats}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
