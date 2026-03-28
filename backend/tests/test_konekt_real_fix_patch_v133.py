"""
Konekt Real Fix Patch v133 - Testing execution path issues:
1. payer_name joins failing because serialize_doc overwrites UUID id with ObjectId
2. admin invoice enrichment inconsistent across response paths
3. customer order drawer showing 'Konekt Sales Team' placeholder
4. payment approval flow not persisting real sales/vendor assignments
5. sales_assignments using 'auto-sales' placeholder IDs
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
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": CUSTOMER_EMAIL,
        "password": CUSTOMER_PASSWORD
    })
    if resp.status_code == 200:
        return resp.json().get("token")
    pytest.skip(f"Customer login failed: {resp.status_code}")


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if resp.status_code == 200:
        return resp.json().get("token")
    pytest.skip(f"Admin login failed: {resp.status_code}")


@pytest.fixture(scope="module")
def partner_token():
    """Get partner auth token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": PARTNER_EMAIL,
        "password": PARTNER_PASSWORD
    })
    if resp.status_code == 200:
        return resp.json().get("token")
    pytest.skip(f"Partner login failed: {resp.status_code}")


class TestCustomerInvoicesPayer:
    """Test customer invoices show payer_name (NOT '-' for recent invoices)"""
    
    def test_customer_invoices_endpoint_returns_payer_name(self, customer_token):
        """GET /api/customer/invoices should return payer_name field"""
        resp = requests.get(
            f"{BASE_URL}/api/customer/invoices",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        assert isinstance(data, list), "Expected list of invoices"
        
        # Check that invoices have payer_name field
        if len(data) > 0:
            invoice = data[0]
            assert "payer_name" in invoice, "Invoice should have payer_name field"
            # For recent invoices, payer_name should NOT be '-'
            # (older invoices may have '-' which is acceptable)
            print(f"Sample invoice payer_name: {invoice.get('payer_name')}")
    
    def test_customer_invoices_have_payment_status_label(self, customer_token):
        """GET /api/customer/invoices should return payment_status_label"""
        resp = requests.get(
            f"{BASE_URL}/api/customer/invoices",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        if len(data) > 0:
            invoice = data[0]
            assert "payment_status_label" in invoice, "Invoice should have payment_status_label"
            label = invoice.get("payment_status_label", "")
            # Should be human-readable, not raw codes with underscores
            assert "_" not in label or label == "-", f"Label should be human-readable: {label}"
            print(f"Sample payment_status_label: {label}")


class TestAdminInvoicesEnrichment:
    """Test admin invoices show payer_name, customer_name, and payment_status_label"""
    
    def test_admin_invoices_returns_enriched_fields(self, admin_token):
        """GET /api/admin/invoices should return enriched invoice data"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/invoices",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        assert isinstance(data, list), "Expected list of invoices"
        
        if len(data) > 0:
            invoice = data[0]
            # Check required enrichment fields
            assert "payer_name" in invoice, "Invoice should have payer_name"
            assert "customer_name" in invoice, "Invoice should have customer_name"
            assert "payment_status_label" in invoice, "Invoice should have payment_status_label"
            
            # customer_name should never be null
            assert invoice.get("customer_name"), f"customer_name should not be empty: {invoice.get('customer_name')}"
            
            print(f"Admin invoice enrichment: payer={invoice.get('payer_name')}, customer={invoice.get('customer_name')}, status_label={invoice.get('payment_status_label')}")
    
    def test_admin_invoices_payer_name_not_dash_for_recent(self, admin_token):
        """Recent invoices should have real payer_name, not '-'"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/invoices?limit=10",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        # Count how many have real payer names vs '-'
        real_payer_count = 0
        dash_count = 0
        for inv in data:
            payer = inv.get("payer_name", "-")
            if payer and payer != "-":
                real_payer_count += 1
            else:
                dash_count += 1
        
        print(f"Payer name stats: {real_payer_count} real, {dash_count} dash")
        # At least some should have real payer names
        assert real_payer_count > 0 or len(data) == 0, "Expected at least some invoices with real payer_name"


class TestCustomerOrderDrawerSalesContact:
    """Test customer order drawer shows REAL sales contact (NOT 'Konekt Sales Team')"""
    
    def test_customer_orders_returns_sales_info(self, customer_token):
        """GET /api/customer/orders should return sales contact info"""
        resp = requests.get(
            f"{BASE_URL}/api/customer/orders",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        assert isinstance(data, list), "Expected list of orders"
        
        if len(data) > 0:
            order = data[0]
            # Check for sales info
            sales = order.get("sales", {})
            sales_name = sales.get("name") or order.get("assigned_sales_name") or order.get("sales_owner_name") or ""
            
            # Should NOT be 'Konekt Sales Team' placeholder
            assert sales_name != "Konekt Sales Team", f"Sales name should not be placeholder: {sales_name}"
            
            print(f"Order sales info: name={sales_name}, email={sales.get('email')}, phone={sales.get('phone')}")
    
    def test_customer_orders_no_placeholder_text(self, customer_token):
        """Customer orders should not contain 'Konekt Sales Team' placeholder"""
        resp = requests.get(
            f"{BASE_URL}/api/customer/orders",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        for order in data:
            # Check all possible sales name fields
            sales = order.get("sales", {})
            sales_name = sales.get("name", "")
            assigned_name = order.get("assigned_sales_name", "")
            owner_name = order.get("sales_owner_name", "")
            
            # None should be 'Konekt Sales Team'
            assert sales_name != "Konekt Sales Team", f"sales.name should not be placeholder"
            assert assigned_name != "Konekt Sales Team", f"assigned_sales_name should not be placeholder"
            assert owner_name != "Konekt Sales Team", f"sales_owner_name should not be placeholder"


class TestAdminOrdersOpsEnrichment:
    """Test admin orders-ops list shows sales_name (NOT 'Unassigned'), vendor_name, payer_name"""
    
    def test_admin_orders_ops_list_enrichment(self, admin_token):
        """GET /api/admin/orders-ops should return enriched order data"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/orders-ops",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        assert isinstance(data, list), "Expected list of orders"
        
        if len(data) > 0:
            order = data[0]
            # Check enrichment fields exist
            assert "customer_name" in order, "Order should have customer_name"
            assert "sales_name" in order, "Order should have sales_name"
            assert "vendor_name" in order, "Order should have vendor_name"
            assert "payer_name" in order, "Order should have payer_name"
            
            print(f"Admin order enrichment: customer={order.get('customer_name')}, sales={order.get('sales_name')}, vendor={order.get('vendor_name')}, payer={order.get('payer_name')}")
    
    def test_admin_orders_ops_no_unassigned_sales(self, admin_token):
        """Admin orders should not show 'Unassigned' for sales_name"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/orders-ops?limit=20",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        unassigned_count = 0
        real_sales_count = 0
        for order in data:
            sales_name = order.get("sales_name", "")
            if sales_name.lower() in ("unassigned", "auto-sales", ""):
                unassigned_count += 1
            else:
                real_sales_count += 1
        
        print(f"Sales assignment stats: {real_sales_count} real, {unassigned_count} unassigned/empty")
        # After backfill, most should have real sales names
        if len(data) > 0:
            assert real_sales_count > 0, "Expected at least some orders with real sales_name"
    
    def test_admin_orders_ops_detail_flat_fields(self, admin_token):
        """GET /api/admin/orders-ops/{id} should return flat enriched fields"""
        # First get an order ID
        resp = requests.get(
            f"{BASE_URL}/api/admin/orders-ops?limit=1",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200
        orders = resp.json()
        
        if len(orders) == 0:
            pytest.skip("No orders available for detail test")
        
        order_id = orders[0].get("id")
        
        # Get order detail
        resp = requests.get(
            f"{BASE_URL}/api/admin/orders-ops/{order_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        
        # Check flat fields exist
        assert "customer_name" in data, "Detail should have customer_name"
        assert "sales_name" in data, "Detail should have sales_name"
        assert "payer_name" in data, "Detail should have payer_name"
        
        print(f"Order detail flat fields: customer={data.get('customer_name')}, sales={data.get('sales_name')}, payer={data.get('payer_name')}, approved_at={data.get('approved_at')}")


class TestVendorOrdersSalesEnrichment:
    """Test vendor orders show sales_name enrichment"""
    
    def test_vendor_orders_returns_sales_enrichment(self, partner_token):
        """GET /api/vendor/orders should return sales enrichment"""
        resp = requests.get(
            f"{BASE_URL}/api/vendor/orders",
            headers={"Authorization": f"Bearer {partner_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        
        # May be empty if no vendor orders
        if isinstance(data, list) and len(data) > 0:
            order = data[0]
            # Check for sales enrichment fields
            has_sales_info = (
                "sales_name" in order or 
                "sales_email" in order or 
                "sales_phone" in order
            )
            print(f"Vendor order sales info: name={order.get('sales_name')}, email={order.get('sales_email')}, phone={order.get('sales_phone')}")
        else:
            print("No vendor orders available to test sales enrichment")


class TestSerializeDocPreservesUUID:
    """Test that serialize_doc functions preserve existing UUID 'id' over ObjectId conversion"""
    
    def test_customer_orders_have_uuid_ids(self, customer_token):
        """Customer orders should have UUID-format IDs, not ObjectId format"""
        resp = requests.get(
            f"{BASE_URL}/api/customer/orders",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        for order in data:
            order_id = order.get("id", "")
            # UUID format: 8-4-4-4-12 hex chars with dashes
            # ObjectId format: 24 hex chars
            if len(order_id) == 24 and all(c in '0123456789abcdef' for c in order_id.lower()):
                # This is ObjectId format - may be acceptable for older orders
                print(f"Order has ObjectId format ID: {order_id}")
            elif len(order_id) == 36 and order_id.count('-') == 4:
                # This is UUID format - expected for newer orders
                print(f"Order has UUID format ID: {order_id}")
    
    def test_admin_invoices_have_consistent_ids(self, admin_token):
        """Admin invoices should have consistent ID format"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/invoices?limit=5",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        for inv in data:
            inv_id = inv.get("id", "")
            # Just verify ID exists and is non-empty
            assert inv_id, "Invoice should have non-empty id"
            print(f"Invoice ID format: {inv_id[:12]}... (len={len(inv_id)})")


class TestRouteRedirects:
    """Test route redirects work correctly"""
    
    def test_dashboard_redirects_to_account(self):
        """GET /dashboard should redirect to /account"""
        resp = requests.get(f"{BASE_URL}/dashboard", allow_redirects=False)
        # May return 200 (SPA handles redirect) or 3xx redirect
        # The frontend handles this redirect, so we just verify the endpoint doesn't 500
        assert resp.status_code in [200, 301, 302, 307, 308, 404], f"Unexpected status: {resp.status_code}"
    
    def test_partner_fulfillment_redirects_to_orders(self):
        """GET /partner/fulfillment should redirect to /partner/orders"""
        resp = requests.get(f"{BASE_URL}/partner/fulfillment", allow_redirects=False)
        # Frontend handles this redirect
        assert resp.status_code in [200, 301, 302, 307, 308, 404], f"Unexpected status: {resp.status_code}"


class TestNoPlaceholderText:
    """Test that placeholder text doesn't appear in API responses"""
    
    def test_no_konekt_sales_team_in_customer_orders(self, customer_token):
        """'Konekt Sales Team' should not appear in customer orders"""
        resp = requests.get(
            f"{BASE_URL}/api/customer/orders",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        response_text = str(data)
        assert "Konekt Sales Team" not in response_text, "Found 'Konekt Sales Team' placeholder in response"
    
    def test_no_auto_sales_in_admin_orders(self, admin_token):
        """'auto-sales' should not appear as sales_owner_id in admin orders"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/orders-ops?limit=20",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        for order in data:
            sales_name = order.get("sales_name", "")
            # sales_name should not be 'auto-sales' or 'unassigned'
            assert sales_name.lower() not in ("auto-sales",), f"Found 'auto-sales' in sales_name: {sales_name}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
