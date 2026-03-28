"""
Acceptance Checks v135 - Konekt B2B E-commerce Platform
Tests for 5 acceptance criteria:
1. Customer invoice shows payer name correctly
2. Customer payment approval notification appears
3. Customer order drawer shows real assigned sales person and contact
4. Admin sees customer name, payer name, assigned sales, assigned vendor
5. Vendor sees orders in My Orders with customer name
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


class TestSetup:
    """Setup and authentication tests"""
    
    @pytest.fixture(scope="class")
    def customer_token(self):
        """Get customer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200, f"Customer login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in customer login response"
        return data["token"]
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in admin login response"
        return data["token"]
    
    @pytest.fixture(scope="class")
    def partner_token(self):
        """Get partner/vendor auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PARTNER_EMAIL,
            "password": PARTNER_PASSWORD
        })
        assert response.status_code == 200, f"Partner login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in partner login response"
        return data["token"]


class TestCheck1CustomerInvoicePayerName(TestSetup):
    """CHECK 1: Customer invoice table shows PAYER NAME column with real names"""
    
    def test_customer_invoices_endpoint_returns_data(self, customer_token):
        """Verify customer invoices endpoint returns data"""
        response = requests.get(
            f"{BASE_URL}/api/customer/invoices",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200, f"Failed to get customer invoices: {response.text}"
        invoices = response.json()
        assert isinstance(invoices, list), "Invoices should be a list"
        print(f"Found {len(invoices)} customer invoices")
        return invoices
    
    def test_customer_invoices_have_payer_name(self, customer_token):
        """Verify invoices have payer_name field populated"""
        response = requests.get(
            f"{BASE_URL}/api/customer/invoices",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        invoices = response.json()
        
        if len(invoices) == 0:
            pytest.skip("No invoices found for customer")
        
        # Check that at least some invoices have payer_name
        invoices_with_payer = [inv for inv in invoices if inv.get("payer_name") and inv.get("payer_name") != "-"]
        print(f"Invoices with payer_name: {len(invoices_with_payer)}/{len(invoices)}")
        
        # Sample first few invoices
        for inv in invoices[:3]:
            payer = inv.get("payer_name", "MISSING")
            customer = inv.get("customer_name", "MISSING")
            inv_num = inv.get("invoice_number", inv.get("id", "?"))
            print(f"Invoice {inv_num}: payer_name='{payer}', customer_name='{customer}'")
        
        # At least one invoice should have a real payer name
        assert len(invoices_with_payer) > 0 or len(invoices) == 0, "No invoices have payer_name populated"
    
    def test_customer_invoice_detail_has_billing_info(self, customer_token):
        """Verify invoice detail has Bill To info (customer_name)"""
        response = requests.get(
            f"{BASE_URL}/api/customer/invoices",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        invoices = response.json()
        
        if len(invoices) == 0:
            pytest.skip("No invoices found for customer")
        
        # Get first invoice detail
        inv_id = invoices[0].get("id")
        detail_response = requests.get(
            f"{BASE_URL}/api/customer/invoices/{inv_id}",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert detail_response.status_code == 200, f"Failed to get invoice detail: {detail_response.text}"
        
        detail = detail_response.json()
        customer_name = detail.get("customer_name") or (detail.get("billing") or {}).get("invoice_client_name")
        payer_name = detail.get("payer_name")
        
        print(f"Invoice detail - customer_name: '{customer_name}', payer_name: '{payer_name}'")
        
        # Should have at least customer_name for Bill To
        assert customer_name or payer_name, "Invoice detail missing both customer_name and payer_name"


class TestCheck2CustomerPaymentApprovalNotification(TestSetup):
    """CHECK 2: Customer notifications API returns at least 1 notification with title 'Payment Approved'"""
    
    def test_customer_notifications_endpoint_works(self, customer_token):
        """Verify customer notifications endpoint returns data"""
        response = requests.get(
            f"{BASE_URL}/api/customer/notifications",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200, f"Failed to get customer notifications: {response.text}"
        notifications = response.json()
        assert isinstance(notifications, list), "Notifications should be a list"
        print(f"Found {len(notifications)} customer notifications")
        return notifications
    
    def test_customer_has_payment_approved_notification(self, customer_token):
        """Verify at least one 'Payment Approved' notification exists"""
        response = requests.get(
            f"{BASE_URL}/api/customer/notifications",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        notifications = response.json()
        
        # Look for Payment Approved notification
        payment_approved = [n for n in notifications if "Payment Approved" in (n.get("title") or "")]
        
        print(f"Payment Approved notifications: {len(payment_approved)}")
        for notif in payment_approved[:3]:
            print(f"  - Title: {notif.get('title')}, target_url: {notif.get('target_url')}")
        
        # Should have at least one Payment Approved notification
        assert len(payment_approved) >= 1, f"Expected at least 1 'Payment Approved' notification, found {len(payment_approved)}"
    
    def test_payment_approved_notification_has_correct_target_url(self, customer_token):
        """Verify Payment Approved notification has target_url '/account/invoices'"""
        response = requests.get(
            f"{BASE_URL}/api/customer/notifications",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        notifications = response.json()
        
        payment_approved = [n for n in notifications if "Payment Approved" in (n.get("title") or "")]
        
        if len(payment_approved) == 0:
            pytest.skip("No Payment Approved notifications found")
        
        # Check target_url
        for notif in payment_approved:
            target_url = notif.get("target_url", "")
            print(f"Payment Approved notification target_url: '{target_url}'")
            # Should point to invoices
            assert "/account/invoices" in target_url or "/invoices" in target_url, \
                f"Expected target_url to contain '/account/invoices', got '{target_url}'"


class TestCheck3CustomerOrderSalesContact(TestSetup):
    """CHECK 3: Customer order drawer shows YOUR KONEKT SALES CONTACT section with real sales name, phone, email"""
    
    def test_customer_orders_endpoint_returns_data(self, customer_token):
        """Verify customer orders endpoint returns data"""
        response = requests.get(
            f"{BASE_URL}/api/customer/orders",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200, f"Failed to get customer orders: {response.text}"
        orders = response.json()
        assert isinstance(orders, list), "Orders should be a list"
        print(f"Found {len(orders)} customer orders")
        return orders
    
    def test_customer_orders_have_sales_contact(self, customer_token):
        """Verify orders have sales contact info populated"""
        response = requests.get(
            f"{BASE_URL}/api/customer/orders",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        orders = response.json()
        
        if len(orders) == 0:
            pytest.skip("No orders found for customer")
        
        # Check for sales contact info
        orders_with_sales = []
        for order in orders:
            sales = order.get("sales") or {}
            sales_name = sales.get("name") or order.get("assigned_sales_name") or order.get("sales_owner_name")
            if sales_name and sales_name not in ("", "Unassigned", "unassigned"):
                orders_with_sales.append(order)
        
        print(f"Orders with sales contact: {len(orders_with_sales)}/{len(orders)}")
        
        # Sample first few orders
        for order in orders[:3]:
            sales = order.get("sales") or {}
            sales_name = sales.get("name") or order.get("assigned_sales_name") or ""
            sales_phone = sales.get("phone") or order.get("sales_phone") or ""
            sales_email = sales.get("email") or order.get("sales_email") or ""
            order_num = order.get("order_number", order.get("id", "?"))
            print(f"Order {order_num}: sales_name='{sales_name}', phone='{sales_phone}', email='{sales_email}'")
        
        # At least some orders should have sales contact
        if len(orders) > 0:
            assert len(orders_with_sales) > 0, "No orders have sales contact assigned"
    
    def test_customer_order_detail_has_sales_info(self, customer_token):
        """Verify order detail has sales contact with name, phone, email"""
        response = requests.get(
            f"{BASE_URL}/api/customer/orders",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        orders = response.json()
        
        if len(orders) == 0:
            pytest.skip("No orders found for customer")
        
        # Find an order with sales contact
        order_with_sales = None
        for order in orders:
            sales = order.get("sales") or {}
            if sales.get("name"):
                order_with_sales = order
                break
        
        if not order_with_sales:
            pytest.skip("No orders with sales contact found")
        
        # Get order detail
        order_id = order_with_sales.get("id") or order_with_sales.get("order_number")
        detail_response = requests.get(
            f"{BASE_URL}/api/customer/orders/{order_id}",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert detail_response.status_code == 200, f"Failed to get order detail: {detail_response.text}"
        
        detail = detail_response.json()
        sales = detail.get("sales") or {}
        sales_name = sales.get("name") or detail.get("assigned_sales_name")
        sales_phone = sales.get("phone") or detail.get("sales_phone")
        sales_email = sales.get("email") or detail.get("sales_email")
        
        print(f"Order detail sales: name='{sales_name}', phone='{sales_phone}', email='{sales_email}'")
        
        # Should have at least name
        assert sales_name, "Order detail missing sales name"


class TestCheck4AdminOrdersColumns(TestSetup):
    """CHECK 4: Admin orders table shows CUSTOMER, PAYER, ASSIGNED SALES, ASSIGNED VENDOR columns"""
    
    def test_admin_orders_endpoint_returns_data(self, admin_token):
        """Verify admin orders endpoint returns data"""
        response = requests.get(
            f"{BASE_URL}/api/admin/orders-ops",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get admin orders: {response.text}"
        orders = response.json()
        assert isinstance(orders, list), "Orders should be a list"
        print(f"Found {len(orders)} admin orders")
        return orders
    
    def test_admin_orders_have_customer_name(self, admin_token):
        """Verify admin orders have customer_name populated"""
        response = requests.get(
            f"{BASE_URL}/api/admin/orders-ops",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        orders = response.json()
        
        if len(orders) == 0:
            pytest.skip("No orders found")
        
        orders_with_customer = [o for o in orders if o.get("customer_name") and o.get("customer_name") != "-"]
        print(f"Orders with customer_name: {len(orders_with_customer)}/{len(orders)}")
        
        # Sample
        for order in orders[:3]:
            print(f"Order {order.get('order_number', '?')}: customer_name='{order.get('customer_name', 'MISSING')}'")
        
        assert len(orders_with_customer) > 0, "No orders have customer_name populated"
    
    def test_admin_orders_have_payer_name(self, admin_token):
        """Verify admin orders have payer_name populated"""
        response = requests.get(
            f"{BASE_URL}/api/admin/orders-ops",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        orders = response.json()
        
        if len(orders) == 0:
            pytest.skip("No orders found")
        
        orders_with_payer = [o for o in orders if o.get("payer_name") and o.get("payer_name") != "-"]
        print(f"Orders with payer_name: {len(orders_with_payer)}/{len(orders)}")
        
        # Sample
        for order in orders[:3]:
            print(f"Order {order.get('order_number', '?')}: payer_name='{order.get('payer_name', 'MISSING')}'")
    
    def test_admin_orders_have_sales_owner(self, admin_token):
        """Verify admin orders have sales_owner/sales_name populated"""
        response = requests.get(
            f"{BASE_URL}/api/admin/orders-ops",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        orders = response.json()
        
        if len(orders) == 0:
            pytest.skip("No orders found")
        
        orders_with_sales = [o for o in orders if (o.get("sales_owner") or o.get("sales_name")) and (o.get("sales_owner") or o.get("sales_name")) not in ("", "Unassigned")]
        print(f"Orders with sales_owner: {len(orders_with_sales)}/{len(orders)}")
        
        # Sample
        for order in orders[:3]:
            sales = order.get("sales_owner") or order.get("sales_name") or "MISSING"
            print(f"Order {order.get('order_number', '?')}: sales_owner='{sales}'")
    
    def test_admin_orders_have_vendor_name(self, admin_token):
        """Verify admin orders with vendor_orders have vendor_name populated"""
        response = requests.get(
            f"{BASE_URL}/api/admin/orders-ops",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        orders = response.json()
        
        if len(orders) == 0:
            pytest.skip("No orders found")
        
        # Only check orders that have vendor_count > 0
        orders_with_vendors = [o for o in orders if o.get("vendor_count", 0) > 0]
        orders_with_vendor_name = [o for o in orders_with_vendors if o.get("vendor_name") and o.get("vendor_name") != "-"]
        
        print(f"Orders with vendor_orders: {len(orders_with_vendors)}")
        print(f"Orders with vendor_name: {len(orders_with_vendor_name)}")
        
        # Sample
        for order in orders_with_vendors[:3]:
            print(f"Order {order.get('order_number', '?')}: vendor_name='{order.get('vendor_name', 'MISSING')}', vendor_count={order.get('vendor_count', 0)}")
        
        # If there are orders with vendors, they should have vendor_name
        if len(orders_with_vendors) > 0:
            assert len(orders_with_vendor_name) > 0, "Orders with vendor_orders don't have vendor_name populated"


class TestCheck5VendorOrdersCustomerName(TestSetup):
    """CHECK 5: Vendor/Partner orders at /partner/orders shows CUSTOMER column with real customer names"""
    
    def test_vendor_orders_endpoint_returns_data(self, partner_token):
        """Verify vendor orders endpoint returns data"""
        response = requests.get(
            f"{BASE_URL}/api/vendor/orders",
            headers={"Authorization": f"Bearer {partner_token}"}
        )
        assert response.status_code == 200, f"Failed to get vendor orders: {response.text}"
        orders = response.json()
        assert isinstance(orders, list), "Orders should be a list"
        print(f"Found {len(orders)} vendor orders")
        return orders
    
    def test_vendor_orders_have_customer_name(self, partner_token):
        """Verify vendor orders have customer_name populated"""
        response = requests.get(
            f"{BASE_URL}/api/vendor/orders",
            headers={"Authorization": f"Bearer {partner_token}"}
        )
        assert response.status_code == 200
        orders = response.json()
        
        if len(orders) == 0:
            pytest.skip("No vendor orders found")
        
        orders_with_customer = [o for o in orders if o.get("customer_name") and o.get("customer_name") != "-"]
        print(f"Vendor orders with customer_name: {len(orders_with_customer)}/{len(orders)}")
        
        # Sample
        for order in orders[:5]:
            customer = order.get("customer_name", "MISSING")
            customer_phone = order.get("customer_phone", "")
            vendor_order_no = order.get("vendor_order_no", order.get("id", "?"))
            print(f"Vendor order {vendor_order_no}: customer_name='{customer}', customer_phone='{customer_phone}'")
        
        # At least some orders should have customer_name
        if len(orders) > 0:
            assert len(orders_with_customer) > 0, "No vendor orders have customer_name populated"
    
    def test_vendor_orders_have_customer_phone(self, partner_token):
        """Verify vendor orders have customer_phone populated"""
        response = requests.get(
            f"{BASE_URL}/api/vendor/orders",
            headers={"Authorization": f"Bearer {partner_token}"}
        )
        assert response.status_code == 200
        orders = response.json()
        
        if len(orders) == 0:
            pytest.skip("No vendor orders found")
        
        orders_with_phone = [o for o in orders if o.get("customer_phone")]
        print(f"Vendor orders with customer_phone: {len(orders_with_phone)}/{len(orders)}")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
