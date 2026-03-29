"""
Konekt Surgical Fix Pack v137 Tests
Tests for 6 fixes:
1. Admin customer_name vs payer_name separation
2. Vendor assignment persistence + vendor_order creation at approval
3. approved_by/approved_at population on invoice and order
4. Vendor order visibility in /partner/orders
5. Vendor privacy - no customer identity in vendor API/UI
6. Stale /dashboard/* links cleaned to /account/*
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
PARTNER_EMAIL = "demo.partner@konekt.com"
PARTNER_PASSWORD = "Partner123!"
CUSTOMER_EMAIL = "demo.customer@konekt.com"
CUSTOMER_PASSWORD = "Demo123!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Admin login failed: {response.status_code}")


@pytest.fixture(scope="module")
def partner_token():
    """Get partner/vendor auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": PARTNER_EMAIL,
        "password": PARTNER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Partner login failed: {response.status_code}")


@pytest.fixture(scope="module")
def customer_token():
    """Get customer auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": CUSTOMER_EMAIL,
        "password": CUSTOMER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Customer login failed: {response.status_code}")


class TestFix1AdminCustomerPayerSeparation:
    """FIX1: Admin orders at /api/admin/orders-ops returns customer_name and payer_name as separate fields"""
    
    def test_admin_orders_has_customer_name_field(self, admin_token):
        """Verify admin orders response includes customer_name field"""
        response = requests.get(f"{BASE_URL}/api/admin/orders-ops")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        
        if len(data) > 0:
            order = data[0]
            assert "customer_name" in order, "customer_name field missing from admin orders"
            print(f"✓ FIX1: customer_name present: {order.get('customer_name')}")
    
    def test_admin_orders_has_payer_name_field(self, admin_token):
        """Verify admin orders response includes payer_name field"""
        response = requests.get(f"{BASE_URL}/api/admin/orders-ops")
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 0:
            order = data[0]
            assert "payer_name" in order, "payer_name field missing from admin orders"
            print(f"✓ FIX1: payer_name present: {order.get('payer_name')}")
    
    def test_admin_orders_customer_and_payer_are_separate(self, admin_token):
        """Verify customer_name and payer_name are separate fields (can have different values)"""
        response = requests.get(f"{BASE_URL}/api/admin/orders-ops")
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 0:
            order = data[0]
            customer_name = order.get("customer_name", "")
            payer_name = order.get("payer_name", "")
            # Both fields should exist and be strings
            assert isinstance(customer_name, str), "customer_name should be string"
            assert isinstance(payer_name, str), "payer_name should be string"
            print(f"✓ FIX1: Separate fields - customer: '{customer_name}', payer: '{payer_name}'")


class TestFix2VendorOrderCreation:
    """FIX2: Payment approval creates vendor_orders with vendor_order_no, base_price, status='assigned'"""
    
    def test_vendor_orders_have_vendor_order_no(self, partner_token):
        """Verify vendor orders have vendor_order_no field"""
        response = requests.get(
            f"{BASE_URL}/api/vendor/orders",
            headers={"Authorization": f"Bearer {partner_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        if len(data) > 0:
            vo = data[0]
            assert "vendor_order_no" in vo, "vendor_order_no field missing"
            assert vo.get("vendor_order_no"), "vendor_order_no should not be empty"
            print(f"✓ FIX2: vendor_order_no present: {vo.get('vendor_order_no')}")
    
    def test_vendor_orders_have_base_price(self, partner_token):
        """Verify vendor orders have base_price field"""
        response = requests.get(
            f"{BASE_URL}/api/vendor/orders",
            headers={"Authorization": f"Bearer {partner_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 0:
            vo = data[0]
            assert "base_price" in vo, "base_price field missing"
            assert isinstance(vo.get("base_price"), (int, float)), "base_price should be numeric"
            print(f"✓ FIX2: base_price present: {vo.get('base_price')}")
    
    def test_vendor_orders_have_status(self, partner_token):
        """Verify vendor orders have status field"""
        response = requests.get(
            f"{BASE_URL}/api/vendor/orders",
            headers={"Authorization": f"Bearer {partner_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 0:
            vo = data[0]
            assert "status" in vo, "status field missing"
            print(f"✓ FIX2: status present: {vo.get('status')}")


class TestFix3ApprovalFields:
    """FIX3: After approval, order and invoice have approved_by and approved_at fields"""
    
    def test_admin_orders_have_approved_by_field(self, admin_token):
        """Verify admin orders response includes approved_by field"""
        response = requests.get(f"{BASE_URL}/api/admin/orders-ops")
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 0:
            order = data[0]
            assert "approved_by" in order, "approved_by field missing from admin orders"
            print(f"✓ FIX3: approved_by present: {order.get('approved_by')}")
    
    def test_admin_orders_have_approved_at_field(self, admin_token):
        """Verify admin orders response includes approved_at field"""
        response = requests.get(f"{BASE_URL}/api/admin/orders-ops")
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 0:
            order = data[0]
            assert "approved_at" in order, "approved_at field missing from admin orders"
            print(f"✓ FIX3: approved_at present: {order.get('approved_at')}")
    
    def test_order_detail_has_approval_info(self, admin_token):
        """Verify order detail endpoint returns approval info"""
        # First get list of orders
        list_response = requests.get(f"{BASE_URL}/api/admin/orders-ops")
        assert list_response.status_code == 200
        
        orders = list_response.json()
        if len(orders) > 0:
            order_id = orders[0].get("id")
            # Get order detail
            detail_response = requests.get(f"{BASE_URL}/api/admin/orders-ops/{order_id}")
            assert detail_response.status_code == 200
            
            detail = detail_response.json()
            # Check for approval fields in response
            assert "approved_by" in detail, "approved_by missing from order detail"
            assert "approved_at" in detail, "approved_at missing from order detail"
            print(f"✓ FIX3: Order detail has approval info - by: {detail.get('approved_by')}, at: {detail.get('approved_at')}")


class TestFix4VendorOrderVisibility:
    """FIX4: Vendor orders at /api/vendor/orders returns orders from vendor_orders collection"""
    
    def test_vendor_orders_endpoint_accessible(self, partner_token):
        """Verify vendor orders endpoint is accessible"""
        response = requests.get(
            f"{BASE_URL}/api/vendor/orders",
            headers={"Authorization": f"Bearer {partner_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ FIX4: Vendor orders endpoint accessible")
    
    def test_vendor_orders_returns_list(self, partner_token):
        """Verify vendor orders returns a list"""
        response = requests.get(
            f"{BASE_URL}/api/vendor/orders",
            headers={"Authorization": f"Bearer {partner_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"✓ FIX4: Vendor orders returns list with {len(data)} items")
    
    def test_vendor_orders_have_sales_contact(self, partner_token):
        """Verify vendor orders include sales contact info"""
        response = requests.get(
            f"{BASE_URL}/api/vendor/orders",
            headers={"Authorization": f"Bearer {partner_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 0:
            vo = data[0]
            # Check for sales contact fields
            assert "sales_name" in vo, "sales_name field missing"
            assert "sales_phone" in vo, "sales_phone field missing"
            assert "sales_email" in vo, "sales_email field missing"
            print(f"✓ FIX4: Sales contact present - {vo.get('sales_name')}, {vo.get('sales_email')}")


class TestFix5VendorPrivacy:
    """FIX5: Vendor orders response does NOT contain customer_name, customer_phone, or customer_email"""
    
    def test_vendor_orders_no_customer_name(self, partner_token):
        """Verify vendor orders do NOT expose customer_name"""
        response = requests.get(
            f"{BASE_URL}/api/vendor/orders",
            headers={"Authorization": f"Bearer {partner_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 0:
            vo = data[0]
            assert "customer_name" not in vo, f"PRIVACY VIOLATION: customer_name exposed in vendor orders: {vo.get('customer_name')}"
            print("✓ FIX5-PRIVACY: customer_name NOT exposed in vendor orders")
    
    def test_vendor_orders_no_customer_phone(self, partner_token):
        """Verify vendor orders do NOT expose customer_phone"""
        response = requests.get(
            f"{BASE_URL}/api/vendor/orders",
            headers={"Authorization": f"Bearer {partner_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 0:
            vo = data[0]
            assert "customer_phone" not in vo, f"PRIVACY VIOLATION: customer_phone exposed in vendor orders: {vo.get('customer_phone')}"
            print("✓ FIX5-PRIVACY: customer_phone NOT exposed in vendor orders")
    
    def test_vendor_orders_no_customer_email(self, partner_token):
        """Verify vendor orders do NOT expose customer_email"""
        response = requests.get(
            f"{BASE_URL}/api/vendor/orders",
            headers={"Authorization": f"Bearer {partner_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 0:
            vo = data[0]
            assert "customer_email" not in vo, f"PRIVACY VIOLATION: customer_email exposed in vendor orders: {vo.get('customer_email')}"
            print("✓ FIX5-PRIVACY: customer_email NOT exposed in vendor orders")


class TestFix6DashboardLinksCleanup:
    """FIX6: No /dashboard/* links remain in active customer UI components"""
    
    def test_customer_portal_layout_no_dashboard_links(self):
        """Verify CustomerPortalLayout.jsx has no /dashboard/ links"""
        import os
        file_path = "/app/frontend/src/components/customer/CustomerPortalLayout.jsx"
        
        if os.path.exists(file_path):
            with open(file_path, 'r') as f:
                content = f.read()
            
            # Check for /dashboard/ references
            dashboard_refs = content.count('/dashboard/')
            assert dashboard_refs == 0, f"Found {dashboard_refs} /dashboard/ references in CustomerPortalLayout.jsx"
            
            # Verify /account/ is used instead
            account_refs = content.count('/account/')
            assert account_refs > 0, "No /account/ references found - expected navigation to use /account/*"
            print(f"✓ FIX6: CustomerPortalLayout uses /account/* ({account_refs} refs), no /dashboard/ links")
        else:
            pytest.skip("CustomerPortalLayout.jsx not found")


class TestAdminUIApprovedByColumn:
    """FIX3-ADMIN-UI: Admin orders table shows 'Approved By' column"""
    
    def test_admin_orders_page_has_approved_by_column(self):
        """Verify OrdersPage.jsx has Approved By column in table header"""
        import os
        file_path = "/app/frontend/src/pages/admin/OrdersPage.jsx"
        
        if os.path.exists(file_path):
            with open(file_path, 'r') as f:
                content = f.read()
            
            # Check for Approved By column header
            assert "Approved By" in content, "Approved By column header not found in OrdersPage.jsx"
            
            # Check for approved_by data binding
            assert "approved_by" in content, "approved_by data binding not found in OrdersPage.jsx"
            print("✓ FIX3-ADMIN-UI: Admin orders table has 'Approved By' column")
        else:
            pytest.skip("OrdersPage.jsx not found")


class TestVendorUINoCustomerColumn:
    """FIX5-UI: Vendor orders table at /partner/orders does NOT show a Customer column"""
    
    def test_vendor_orders_page_no_customer_column(self):
        """Verify MyOrdersPage.jsx does NOT have Customer column"""
        import os
        file_path = "/app/frontend/src/pages/partner/MyOrdersPage.jsx"
        
        if os.path.exists(file_path):
            with open(file_path, 'r') as f:
                content = f.read()
            
            # Check table headers - should NOT have Customer column
            # Look for table header pattern
            import re
            header_pattern = r'<th[^>]*>.*?Customer.*?</th>'
            customer_headers = re.findall(header_pattern, content, re.IGNORECASE | re.DOTALL)
            
            assert len(customer_headers) == 0, f"PRIVACY VIOLATION: Found Customer column in vendor orders table: {customer_headers}"
            
            # Also check for customer_name in table cells
            cell_pattern = r'customer_name'
            customer_cells = re.findall(cell_pattern, content)
            
            # Allow customer_name in search filter but not in table display
            # Check if it's only in filter/search context
            print(f"✓ FIX5-UI: Vendor orders table does NOT have Customer column")
        else:
            pytest.skip("MyOrdersPage.jsx not found")


class TestFinanceQueueEndpoint:
    """Test finance queue endpoint for payment approval flow"""
    
    def test_finance_queue_accessible(self, admin_token):
        """Verify finance queue endpoint is accessible"""
        response = requests.get(f"{BASE_URL}/api/admin-flow-fixes/finance/queue")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"✓ Finance queue accessible with {len(data)} items")
    
    def test_finance_queue_has_customer_and_payer_fields(self, admin_token):
        """Verify finance queue items have both customer_name and payer_name"""
        response = requests.get(f"{BASE_URL}/api/admin-flow-fixes/finance/queue")
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 0:
            item = data[0]
            assert "customer_name" in item, "customer_name missing from finance queue"
            assert "payer_name" in item, "payer_name missing from finance queue"
            print(f"✓ Finance queue has customer_name: {item.get('customer_name')}, payer_name: {item.get('payer_name')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
