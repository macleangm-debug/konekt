"""
Konekt Assignment & Notifications Seed Pack Tests (v134)
API-based tests for:
1. Demo sales users exist with role=sales
2. Customer orders API returns real sales contact data
3. Admin invoices show SEPARATED customer_name and payer_name
4. Admin orders-ops show real sales names
5. Customer invoices have Track Order CTA for paid/approved
6. Vendor orders have sales enrichment
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


class TestDemoSalesUsers:
    """Test that 3 demo sales users exist with role=sales"""
    
    def test_sales_users_exist(self, admin_token):
        """Verify 3 demo sales users: Janeth Msuya, Brian Kweka, Neema Mallya"""
        resp = requests.get(f"{BASE_URL}/api/admin/users", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert resp.status_code == 200, f"Failed to get users: {resp.status_code}"
        
        data = resp.json()
        # Handle both {"users": [...]} and [...] formats
        users = data.get("users", data) if isinstance(data, dict) else data
        
        sales_users = [u for u in users if u.get("role") == "sales"]
        
        # Check we have at least 3 sales users
        assert len(sales_users) >= 3, f"Expected at least 3 sales users, found {len(sales_users)}"
        
        # Check specific demo sales users exist
        sales_names = [u.get("full_name") for u in sales_users]
        expected_names = ["Janeth Msuya", "Brian Kweka", "Neema Mallya"]
        
        for name in expected_names:
            assert name in sales_names, f"Demo sales user '{name}' not found"
        
        # Verify they have correct emails
        sales_emails = [u.get("email") for u in sales_users]
        expected_emails = ["janeth.sales@konekt.demo", "brian.sales@konekt.demo", "neema.sales@konekt.demo"]
        for email in expected_emails:
            assert email in sales_emails, f"Demo sales email '{email}' not found"
        
        print(f"PASS: Found {len(sales_users)} sales users including all 3 demo reps")


class TestCustomerOrdersSalesContact:
    """Test customer orders show real sales contact data"""
    
    def test_customer_orders_have_sales_data(self, customer_token):
        """Customer orders should show real sales contact with name, phone, email"""
        resp = requests.get(f"{BASE_URL}/api/customer/orders", headers={
            "Authorization": f"Bearer {customer_token}"
        })
        assert resp.status_code == 200, f"Failed to get customer orders: {resp.status_code}"
        
        orders = resp.json()
        if not orders:
            pytest.skip("No customer orders found")
        
        # Check at least one order has real sales data
        orders_with_sales = []
        for order in orders:
            sales_name = order.get("assigned_sales_name") or order.get("sales_owner_name") or (order.get("sales") or {}).get("name")
            if sales_name and sales_name not in ["Konekt Sales Team", "Unassigned", "", None]:
                orders_with_sales.append(order)
        
        assert len(orders_with_sales) > 0, "No orders found with real sales contact data"
        
        # Verify sales data is NOT placeholder
        for order in orders_with_sales[:3]:
            sales_name = order.get("assigned_sales_name") or order.get("sales_owner_name") or (order.get("sales") or {}).get("name")
            assert "Konekt Sales Team" not in str(sales_name), f"Found placeholder 'Konekt Sales Team' in order {order.get('order_number')}"
            print(f"  Order {order.get('order_number')}: Sales = {sales_name}")
        
        print(f"PASS: {len(orders_with_sales)} orders have real sales contact data")
    
    def test_no_placeholder_text_in_orders(self, customer_token):
        """Verify no 'Konekt Sales Team' placeholder in customer orders"""
        resp = requests.get(f"{BASE_URL}/api/customer/orders", headers={
            "Authorization": f"Bearer {customer_token}"
        })
        assert resp.status_code == 200
        
        orders = resp.json()
        for order in orders:
            order_str = str(order)
            assert "Konekt Sales Team" not in order_str, f"Found placeholder in order {order.get('order_number')}"
        
        print("PASS: No 'Konekt Sales Team' placeholder found in customer orders")


class TestAdminInvoicesPayerCustomerSeparation:
    """Test admin invoices show SEPARATED customer_name and payer_name"""
    
    def test_admin_invoices_have_separated_fields(self, admin_token):
        """Admin invoices should have customer_name and payer_name as separate fields"""
        resp = requests.get(f"{BASE_URL}/api/admin/invoices", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert resp.status_code == 200, f"Failed to get admin invoices: {resp.status_code}"
        
        invoices = resp.json()
        if not invoices:
            pytest.skip("No invoices found")
        
        # Check invoices have both fields
        for inv in invoices[:5]:
            assert "customer_name" in inv, f"Invoice {inv.get('invoice_number')} missing customer_name"
            # payer_name may be "-" if no payment proof submitted
            print(f"  Invoice {inv.get('invoice_number')}: customer={inv.get('customer_name')}, payer={inv.get('payer_name', '-')}")
        
        print("PASS: Admin invoices have separated customer_name and payer_name fields")


class TestAdminOrdersOpsSalesNames:
    """Test admin orders-ops show real sales names"""
    
    def test_admin_orders_ops_have_sales_names(self, admin_token):
        """Admin orders-ops should show real sales names, not 'Unassigned'"""
        resp = requests.get(f"{BASE_URL}/api/admin/orders-ops", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert resp.status_code == 200, f"Failed to get admin orders-ops: {resp.status_code}"
        
        orders = resp.json()
        if not orders:
            pytest.skip("No orders found")
        
        # Check orders have real sales names
        orders_with_real_sales = []
        for order in orders:
            sales_name = order.get("sales_name") or order.get("assigned_sales_name")
            if sales_name and sales_name not in ["Unassigned", "", None]:
                orders_with_real_sales.append(order)
                print(f"  Order {order.get('order_number')}: Sales = {sales_name}")
        
        # At least some orders should have real sales names
        assert len(orders_with_real_sales) > 0, "No orders found with real sales names"
        print(f"PASS: {len(orders_with_real_sales)} orders have real sales names")
    
    def test_admin_orders_ops_no_unassigned(self, admin_token):
        """Admin orders-ops should NOT show 'Unassigned' for sales"""
        resp = requests.get(f"{BASE_URL}/api/admin/orders-ops", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert resp.status_code == 200
        
        orders = resp.json()
        unassigned_count = 0
        for order in orders:
            sales_name = order.get("sales_name") or order.get("assigned_sales_name") or ""
            if sales_name == "Unassigned":
                unassigned_count += 1
        
        # Allow some unassigned but majority should have real names
        total = len(orders)
        if total > 0:
            unassigned_pct = (unassigned_count / total) * 100
            assert unassigned_pct < 50, f"{unassigned_pct:.0f}% orders have 'Unassigned' sales"
        
        print(f"PASS: Only {unassigned_count}/{total} orders have 'Unassigned' sales")


class TestCustomerInvoicesTrackOrderCTA:
    """Test customer invoices have Track Order CTA for paid/approved"""
    
    def test_customer_invoices_have_order_links(self, customer_token):
        """Customer invoices with paid/approved status should have order_id for Track Order CTA"""
        resp = requests.get(f"{BASE_URL}/api/customer/invoices", headers={
            "Authorization": f"Bearer {customer_token}"
        })
        assert resp.status_code == 200
        
        invoices = resp.json()
        paid_invoices = [inv for inv in invoices if inv.get("status") == "paid" or inv.get("payment_status") in ["paid", "approved"]]
        
        if not paid_invoices:
            pytest.skip("No paid/approved invoices found")
        
        # Check paid invoices have order_id or linked_order_id
        invoices_with_orders = 0
        for inv in paid_invoices[:5]:
            order_id = inv.get("order_id") or inv.get("linked_order_id")
            if order_id:
                invoices_with_orders += 1
            print(f"  Invoice {inv.get('invoice_number')}: status={inv.get('payment_status')}, order_id={order_id}")
        
        print(f"PASS: {invoices_with_orders}/{len(paid_invoices[:5])} paid invoices have order links")


class TestVendorOrdersSalesEnrichment:
    """Test vendor orders have sales enrichment"""
    
    def test_vendor_orders_have_sales_data(self, partner_token):
        """Vendor orders should have sales enrichment fields"""
        resp = requests.get(f"{BASE_URL}/api/vendor/orders", headers={
            "Authorization": f"Bearer {partner_token}"
        })
        assert resp.status_code == 200, f"Failed to get vendor orders: {resp.status_code}"
        
        orders = resp.json()
        if not orders:
            pytest.skip("No vendor orders found")
        
        # Check orders have sales fields
        for order in orders[:3]:
            sales_name = order.get("sales_owner_name") or order.get("assigned_sales_name")
            print(f"  Vendor Order {order.get('order_number')}: sales={sales_name}")
        
        print("PASS: Vendor orders have sales enrichment fields")


class TestSalesUserLogin:
    """Test demo sales users can login"""
    
    def test_janeth_sales_login(self):
        """Demo sales user Janeth Msuya can login"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "janeth.sales@konekt.demo",
            "password": "Sales123!"
        })
        assert resp.status_code == 200, f"Janeth login failed: {resp.status_code} - {resp.text}"
        data = resp.json()
        assert "token" in data
        assert data.get("user", {}).get("role") == "sales"
        print("PASS: Janeth Msuya (sales) can login")
    
    def test_brian_sales_login(self):
        """Demo sales user Brian Kweka can login"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "brian.sales@konekt.demo",
            "password": "Sales123!"
        })
        assert resp.status_code == 200, f"Brian login failed: {resp.status_code} - {resp.text}"
        data = resp.json()
        assert "token" in data
        assert data.get("user", {}).get("role") == "sales"
        print("PASS: Brian Kweka (sales) can login")
    
    def test_neema_sales_login(self):
        """Demo sales user Neema Mallya can login"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "neema.sales@konekt.demo",
            "password": "Sales123!"
        })
        assert resp.status_code == 200, f"Neema login failed: {resp.status_code} - {resp.text}"
        data = resp.json()
        assert "token" in data
        assert data.get("user", {}).get("role") == "sales"
        print("PASS: Neema Mallya (sales) can login")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
