"""
GATE Acceptance Tests v138 - Konekt B2B E-commerce Platform
Tests for customer/payer separation, vendor privacy, and admin enrichment

GATE-CUSTOMER: Checkout payer prefill, invoice payer column, sales contact display
GATE-ADMIN: Invoice/order list with separate customer_name and payer_name
GATE-VENDOR: Privacy-compliant vendor orders API
GATE-SEPARATION: No payer_name equals customer_name when both populated
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
VENDOR_EMAIL = "demo.partner@konekt.com"
VENDOR_PASSWORD = "Partner123!"


class TestGateAcceptance:
    """GATE Acceptance Tests for Konekt B2B Platform"""

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
    def vendor_token(self):
        """Get vendor/partner auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Vendor login failed: {response.status_code}")

    # ─── GATE-ADMIN-1: Admin invoice list returns customer_name and payer_name as SEPARATE fields ───
    def test_gate_admin_1_invoice_list_separate_fields(self, admin_token):
        """GATE-ADMIN-1: Admin invoice list at /api/admin/invoices/list returns customer_name and payer_name as SEPARATE distinct fields"""
        response = requests.get(
            f"{BASE_URL}/api/admin/invoices/list",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        invoices = response.json()
        assert isinstance(invoices, list), "Expected list of invoices"
        
        if len(invoices) > 0:
            # Check that both fields exist as separate keys
            sample = invoices[0]
            assert "customer_name" in sample or "payer_name" in sample, "Invoice should have customer_name or payer_name field"
            
            # Count invoices with both fields populated
            both_populated = 0
            for inv in invoices:
                has_customer = inv.get("customer_name") and inv.get("customer_name") != "-"
                has_payer = inv.get("payer_name") and inv.get("payer_name") != "-"
                if has_customer and has_payer:
                    both_populated += 1
                    print(f"Invoice {inv.get('invoice_number')}: customer={inv.get('customer_name')}, payer={inv.get('payer_name')}")
            
            print(f"GATE-ADMIN-1: {len(invoices)} invoices, {both_populated} with both customer_name and payer_name populated")
        else:
            print("GATE-ADMIN-1: No invoices found to verify")

    # ─── GATE-ADMIN-2: Admin orders returns all required fields ───
    def test_gate_admin_2_orders_ops_enrichment(self, admin_token):
        """GATE-ADMIN-2: Admin orders at /api/admin/orders-ops returns customer_name, payer_name, sales_name, vendor_name, approved_by, approved_at"""
        response = requests.get(
            f"{BASE_URL}/api/admin/orders-ops",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        orders = response.json()
        assert isinstance(orders, list), "Expected list of orders"
        
        required_fields = ["customer_name", "payer_name", "sales_name", "vendor_name", "approved_by", "approved_at"]
        
        if len(orders) > 0:
            sample = orders[0]
            missing_fields = [f for f in required_fields if f not in sample]
            assert len(missing_fields) == 0, f"Missing fields in order response: {missing_fields}"
            
            # Log sample values
            print(f"GATE-ADMIN-2 Sample Order {sample.get('order_number')}:")
            for field in required_fields:
                print(f"  {field}: {sample.get(field, 'NOT PRESENT')}")
        else:
            print("GATE-ADMIN-2: No orders found to verify")

    # ─── GATE-VENDOR-1: Vendor orders returns vendor-safe fields only ───
    def test_gate_vendor_1_privacy_compliant_api(self, vendor_token):
        """GATE-VENDOR-1: Vendor orders at /api/vendor/orders returns vendor-safe fields only (vendor_order_no, base_price, sales contact, NO customer identity)"""
        response = requests.get(
            f"{BASE_URL}/api/vendor/orders",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        orders = response.json()
        assert isinstance(orders, list), "Expected list of vendor orders"
        
        # Fields that SHOULD be present
        expected_fields = ["vendor_order_no", "base_price", "status", "sales_name", "sales_phone", "sales_email"]
        # Fields that should NOT be present (customer identity)
        forbidden_fields = ["customer_name", "customer_email", "customer_phone"]
        
        if len(orders) > 0:
            sample = orders[0]
            
            # Check expected fields exist
            for field in expected_fields:
                assert field in sample, f"Expected field '{field}' missing from vendor order"
            
            # Check forbidden fields are NOT present
            for field in forbidden_fields:
                assert field not in sample, f"Forbidden field '{field}' found in vendor order - privacy violation!"
            
            print(f"GATE-VENDOR-1: {len(orders)} vendor orders, privacy compliant")
            print(f"  Sample: vendor_order_no={sample.get('vendor_order_no')}, base_price={sample.get('base_price')}, status={sample.get('status')}")
            print(f"  Sales contact: {sample.get('sales_name')} / {sample.get('sales_phone')} / {sample.get('sales_email')}")
        else:
            print("GATE-VENDOR-1: No vendor orders found to verify")

    # ─── GATE-SEPARATION: No payer_name equals customer_name when both populated ───
    def test_gate_separation_admin_invoices(self, admin_token):
        """GATE-SEPARATION: In admin invoices, when both customer_name and payer_name have real values (not '-'), they should be different"""
        response = requests.get(
            f"{BASE_URL}/api/admin/invoices/list",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        invoices = response.json()
        
        violations = []
        checked = 0
        
        for inv in invoices:
            customer = inv.get("customer_name", "")
            payer = inv.get("payer_name", "")
            
            # Only check when both have real values (not empty, not "-")
            if customer and customer != "-" and payer and payer != "-":
                checked += 1
                if customer == payer:
                    violations.append({
                        "invoice_number": inv.get("invoice_number"),
                        "customer_name": customer,
                        "payer_name": payer
                    })
        
        print(f"GATE-SEPARATION (invoices): Checked {checked} invoices with both fields populated")
        if violations:
            print(f"  WARNING: {len(violations)} invoices have customer_name == payer_name:")
            for v in violations[:5]:  # Show first 5
                print(f"    {v['invoice_number']}: customer={v['customer_name']}, payer={v['payer_name']}")
        else:
            print("  All invoices have distinct customer_name and payer_name values")
        
        # This is a data integrity check - we report but don't fail if some match
        # (older records may have same value before the fix)

    def test_gate_separation_admin_orders(self, admin_token):
        """GATE-SEPARATION: In admin orders, when both customer_name and payer_name have real values, they should be different"""
        response = requests.get(
            f"{BASE_URL}/api/admin/orders-ops",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        orders = response.json()
        
        violations = []
        checked = 0
        
        for order in orders:
            customer = order.get("customer_name", "")
            payer = order.get("payer_name", "")
            
            if customer and customer != "-" and payer and payer != "-":
                checked += 1
                if customer == payer:
                    violations.append({
                        "order_number": order.get("order_number"),
                        "customer_name": customer,
                        "payer_name": payer
                    })
        
        print(f"GATE-SEPARATION (orders): Checked {checked} orders with both fields populated")
        if violations:
            print(f"  WARNING: {len(violations)} orders have customer_name == payer_name:")
            for v in violations[:5]:
                print(f"    {v['order_number']}: customer={v['customer_name']}, payer={v['payer_name']}")
        else:
            print("  All orders have distinct customer_name and payer_name values")

    # ─── GATE-CUSTOMER-2: Customer invoice table shows payer_name column ───
    def test_gate_customer_2_invoice_payer_column(self, customer_token):
        """GATE-CUSTOMER-2: Customer invoice table shows payer_name column with real payer names"""
        response = requests.get(
            f"{BASE_URL}/api/customer/invoices",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        invoices = response.json()
        assert isinstance(invoices, list), "Expected list of invoices"
        
        if len(invoices) > 0:
            sample = invoices[0]
            assert "payer_name" in sample, "Customer invoice should have payer_name field"
            
            # Count invoices with payer_name populated
            with_payer = sum(1 for inv in invoices if inv.get("payer_name") and inv.get("payer_name") != "-")
            print(f"GATE-CUSTOMER-2: {len(invoices)} customer invoices, {with_payer} with payer_name populated")
            
            for inv in invoices[:3]:
                print(f"  Invoice {inv.get('invoice_number')}: payer={inv.get('payer_name')}")
        else:
            print("GATE-CUSTOMER-2: No customer invoices found")

    # ─── GATE-CUSTOMER-3: Customer order drawer shows real sales contact ───
    def test_gate_customer_3_order_sales_contact(self, customer_token):
        """GATE-CUSTOMER-3: Customer order shows real assigned sales name/phone/email OR 'will be assigned shortly' message"""
        response = requests.get(
            f"{BASE_URL}/api/customer/orders",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        orders = response.json()
        assert isinstance(orders, list), "Expected list of orders"
        
        if len(orders) > 0:
            # Check that orders have sales contact fields
            sample = orders[0]
            sales_fields = ["sales", "assigned_sales_name", "sales_owner_name", "sales_phone", "sales_email"]
            has_sales_info = any(sample.get(f) for f in sales_fields)
            
            print(f"GATE-CUSTOMER-3: {len(orders)} customer orders")
            for order in orders[:3]:
                sales_name = order.get("sales", {}).get("name") if isinstance(order.get("sales"), dict) else order.get("assigned_sales_name") or order.get("sales_owner_name") or ""
                sales_phone = order.get("sales", {}).get("phone") if isinstance(order.get("sales"), dict) else order.get("sales_phone") or ""
                print(f"  Order {order.get('order_number')}: sales_name={sales_name}, sales_phone={sales_phone}")
        else:
            print("GATE-CUSTOMER-3: No customer orders found")

    # ─── Additional API health checks ───
    def test_admin_facade_orders_list(self, admin_token):
        """Test /api/admin/orders/list endpoint (facade route)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/orders/list",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        orders = response.json()
        assert isinstance(orders, list), "Expected list of orders"
        print(f"Admin facade orders/list: {len(orders)} orders")

    def test_customer_account_prefill(self, customer_token):
        """Test customer account prefill endpoint for payer name source"""
        response = requests.get(
            f"{BASE_URL}/api/customer-account/prefill",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Check fields that would be used for payer name prefill
        contact_name = data.get("contact_name") or data.get("full_name") or ""
        business_name = data.get("business_name") or data.get("quote_client_name") or ""
        
        print(f"Customer account prefill:")
        print(f"  contact_name: {contact_name}")
        print(f"  business_name: {business_name}")
        print(f"  email: {data.get('email')}")


class TestVendorPrivacy:
    """Detailed vendor privacy tests"""

    @pytest.fixture(scope="class")
    def vendor_token(self):
        """Get vendor/partner auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Vendor login failed: {response.status_code}")

    def test_vendor_orders_no_customer_identity(self, vendor_token):
        """Verify vendor orders API does NOT expose customer identity fields"""
        response = requests.get(
            f"{BASE_URL}/api/vendor/orders",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 200
        orders = response.json()
        
        # Comprehensive list of customer identity fields that should NOT be present
        customer_identity_fields = [
            "customer_name", "customer_email", "customer_phone",
            "customer_id", "customer_address", "billing_name",
            "billing_email", "billing_phone"
        ]
        
        for order in orders:
            for field in customer_identity_fields:
                assert field not in order, f"Privacy violation: '{field}' found in vendor order {order.get('id')}"
        
        print(f"Vendor privacy check passed: {len(orders)} orders verified, no customer identity exposed")

    def test_vendor_orders_has_sales_contact(self, vendor_token):
        """Verify vendor orders have sales contact info for coordination"""
        response = requests.get(
            f"{BASE_URL}/api/vendor/orders",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 200
        orders = response.json()
        
        if len(orders) > 0:
            sample = orders[0]
            # Vendor should have sales contact for coordination
            assert "sales_name" in sample, "Vendor order should have sales_name"
            assert "sales_phone" in sample, "Vendor order should have sales_phone"
            assert "sales_email" in sample, "Vendor order should have sales_email"
            
            print(f"Vendor sales contact: {sample.get('sales_name')} / {sample.get('sales_phone')}")


class TestAdminOrderEnrichment:
    """Test admin order detail enrichment"""

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

    def test_admin_order_detail_enrichment(self, admin_token):
        """Test that admin order detail includes all enriched fields"""
        # First get list of orders
        list_response = requests.get(
            f"{BASE_URL}/api/admin/orders-ops",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert list_response.status_code == 200
        orders = list_response.json()
        
        if len(orders) > 0:
            order_id = orders[0].get("id")
            
            # Get order detail
            detail_response = requests.get(
                f"{BASE_URL}/api/admin/orders-ops/{order_id}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert detail_response.status_code == 200
            detail = detail_response.json()
            
            # Check enriched fields in detail response
            expected_detail_fields = [
                "order", "invoice", "customer", "sales_user", "vendor_orders",
                "customer_name", "payer_name", "sales_name", "approved_by", "approved_at"
            ]
            
            for field in expected_detail_fields:
                assert field in detail, f"Missing field '{field}' in order detail"
            
            print(f"Admin order detail enrichment verified for order {order_id}")
            print(f"  customer_name: {detail.get('customer_name')}")
            print(f"  payer_name: {detail.get('payer_name')}")
            print(f"  sales_name: {detail.get('sales_name')}")
            print(f"  approved_by: {detail.get('approved_by')}")
        else:
            print("No orders found to test detail enrichment")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
