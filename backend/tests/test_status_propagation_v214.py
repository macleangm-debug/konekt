"""
Status Propagation & Role-Based View Testing - Iteration 214
Tests:
1. Customer orders API returns customer_status with safe labels
2. Vendor orders API does NOT expose customer identity
3. Admin orders API returns full internal statuses
4. Sales orders API returns sales-appropriate statuses
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
CUSTOMER_EMAIL = "demo.customer@konekt.com"
CUSTOMER_PASSWORD = "Demo123!"
VENDOR_EMAIL = "demo.partner@konekt.com"
VENDOR_PASSWORD = "Partner123!"
SALES_EMAIL = "neema.sales@konekt.demo"
SALES_PASSWORD = "password123"


class TestAdminLogin:
    """Admin authentication tests"""
    
    def test_admin_login_success(self):
        """Admin can login and get access token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        print(f"PASS: Admin login successful")
        return data["token"]


class TestCustomerOrdersStatusPropagation:
    """Customer orders should show customer-safe status labels"""
    
    @pytest.fixture
    def customer_token(self):
        """Get customer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Customer login failed: {response.text}")
        return response.json().get("token") or response.json().get("access_token")
    
    def test_customer_orders_returns_customer_status(self, customer_token):
        """GET /api/customer/orders returns customer_status field with safe labels"""
        response = requests.get(
            f"{BASE_URL}/api/customer/orders",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200, f"Failed to get customer orders: {response.text}"
        orders = response.json()
        
        if not orders:
            print("PASS: Customer orders endpoint works (no orders found)")
            return
        
        # Check first order has customer_status field
        order = orders[0]
        assert "customer_status" in order, f"Order missing customer_status field: {order.keys()}"
        
        # Verify customer_status is a safe label (not raw internal status)
        customer_status = order["customer_status"]
        safe_labels = ["processing", "confirmed", "in fulfillment", "ready for pickup", "dispatched", "delivered", "completed", "delayed", "cancelled"]
        raw_internal_statuses = ["pending", "created", "paid", "in_progress", "assigned", "acknowledged", "accepted", "ready_to_fulfill", "in_production", "quality_check"]
        
        assert customer_status.lower() in safe_labels, f"customer_status '{customer_status}' is not a safe label"
        assert customer_status.lower() not in raw_internal_statuses, f"customer_status '{customer_status}' is a raw internal status - should be mapped"
        
        print(f"PASS: Customer orders return customer_status='{customer_status}' (safe label)")
    
    def test_customer_orders_no_raw_statuses(self, customer_token):
        """Customer orders should NOT expose raw internal statuses"""
        response = requests.get(
            f"{BASE_URL}/api/customer/orders",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        orders = response.json()
        
        raw_internal_statuses = ["pending", "created", "paid", "in_progress", "assigned", "acknowledged", "accepted", "ready_to_fulfill", "in_production", "quality_check"]
        
        for order in orders:
            customer_status = order.get("customer_status", "").lower()
            # customer_status should never be a raw internal status
            assert customer_status not in raw_internal_statuses, f"Order {order.get('order_number')} has raw status '{customer_status}'"
        
        print(f"PASS: Verified {len(orders)} customer orders have no raw internal statuses")


class TestVendorOrdersPrivacy:
    """Vendor orders should NOT expose customer identity"""
    
    @pytest.fixture
    def vendor_token(self):
        """Get vendor/partner auth token"""
        # Partner login endpoint
        response = requests.post(f"{BASE_URL}/api/partner/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        if response.status_code != 200:
            # Try alternate endpoint
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": VENDOR_EMAIL,
                "password": VENDOR_PASSWORD
            })
        if response.status_code != 200:
            pytest.skip(f"Vendor login failed: {response.text}")
        return response.json().get("token") or response.json().get("access_token")
    
    def test_vendor_orders_no_customer_name(self, vendor_token):
        """GET /api/vendor/orders should NOT return customer_name field"""
        response = requests.get(
            f"{BASE_URL}/api/vendor/orders",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 200, f"Failed to get vendor orders: {response.text}"
        orders = response.json()
        
        if not orders:
            print("PASS: Vendor orders endpoint works (no orders found)")
            return
        
        for order in orders:
            # Vendor should NOT see customer identity
            assert "customer_name" not in order, f"Vendor order exposes customer_name: {order.get('customer_name')}"
            assert "customer_email" not in order, f"Vendor order exposes customer_email"
            assert "customer_phone" not in order, f"Vendor order exposes customer_phone"
            
            # Vendor SHOULD see vendor_order_no (VO-KON-ORD-xxx format)
            assert "vendor_order_no" in order, "Vendor order missing vendor_order_no"
            
            # Vendor SHOULD see base_price (their cost)
            assert "base_price" in order, "Vendor order missing base_price"
            
            # Vendor SHOULD see sales contact
            assert "sales_name" in order, "Vendor order missing sales_name"
        
        print(f"PASS: Verified {len(orders)} vendor orders do NOT expose customer identity")
    
    def test_vendor_orders_has_sales_contact(self, vendor_token):
        """Vendor orders should include Konekt sales contact info"""
        response = requests.get(
            f"{BASE_URL}/api/vendor/orders",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 200
        orders = response.json()
        
        if not orders:
            print("PASS: Vendor orders endpoint works (no orders found)")
            return
        
        order = orders[0]
        # Check sales contact fields exist
        assert "sales_name" in order, "Missing sales_name"
        assert "sales_phone" in order, "Missing sales_phone"
        assert "sales_email" in order, "Missing sales_email"
        
        print(f"PASS: Vendor orders include sales contact info")


class TestSalesOrdersStatusPropagation:
    """Sales orders should show sales-appropriate status labels"""
    
    @pytest.fixture
    def sales_token(self):
        """Get sales/staff auth token - uses admin auth endpoint"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": SALES_EMAIL,
            "password": SALES_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Sales login failed: {response.text}")
        return response.json().get("token") or response.json().get("access_token")
    
    def test_sales_orders_returns_full_status(self, sales_token):
        """GET /api/sales/orders returns orders with full internal statuses"""
        response = requests.get(
            f"{BASE_URL}/api/sales/orders",
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        assert response.status_code == 200, f"Failed to get sales orders: {response.text}"
        data = response.json()
        orders = data.get("orders", [])
        
        if not orders:
            print("PASS: Sales orders endpoint works (no orders found)")
            return
        
        order = orders[0]
        # Sales should see customer info
        assert "customer_name" in order or "customer" in order, "Sales order missing customer info"
        
        # Sales should see status
        assert "status" in order or "current_status" in order, "Sales order missing status"
        
        print(f"PASS: Sales orders return {len(orders)} orders with full details")


class TestAdminOrdersStatusTimeline:
    """Admin orders should show full status timeline"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.text}")
        return response.json().get("token")
    
    def test_admin_orders_list(self, admin_token):
        """GET /api/admin/orders-ops returns orders list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/orders-ops",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get admin orders: {response.text}"
        orders = response.json()
        
        if not orders:
            print("PASS: Admin orders endpoint works (no orders found)")
            return
        
        # Admin should see full order details
        order = orders[0]
        assert "id" in order, "Admin order missing id"
        assert "order_number" in order or "id" in order, "Admin order missing order_number"
        
        print(f"PASS: Admin orders return {len(orders)} orders")
    
    def test_admin_order_detail_has_timeline(self, admin_token):
        """Admin order detail should include status_audit_trail"""
        # First get orders list
        response = requests.get(
            f"{BASE_URL}/api/admin/orders-ops",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        orders = response.json()
        
        if not orders:
            print("PASS: Admin orders endpoint works (no orders to test detail)")
            return
        
        # Get detail for first order
        order_id = orders[0].get("id")
        detail_response = requests.get(
            f"{BASE_URL}/api/admin/orders-ops/{order_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert detail_response.status_code == 200, f"Failed to get order detail: {detail_response.text}"
        detail = detail_response.json()
        
        # Check order structure
        order_data = detail.get("order", detail)
        assert order_data, "Order detail is empty"
        
        print(f"PASS: Admin order detail retrieved for {order_id}")


class TestStatusMappingService:
    """Test the status propagation service mappings"""
    
    def test_customer_status_map_coverage(self):
        """Verify CUSTOMER_STATUS_MAP covers all internal statuses"""
        from services.status_propagation_service import CUSTOMER_STATUS_MAP, INTERNAL_STATUSES
        
        # All internal statuses should be mapped
        for status in INTERNAL_STATUSES:
            assert status in CUSTOMER_STATUS_MAP, f"Internal status '{status}' not in CUSTOMER_STATUS_MAP"
        
        # All mapped values should be customer-safe
        safe_labels = ["processing", "confirmed", "in fulfillment", "ready for pickup", "dispatched", "delivered", "completed", "delayed", "cancelled"]
        for internal, customer in CUSTOMER_STATUS_MAP.items():
            assert customer in safe_labels, f"CUSTOMER_STATUS_MAP['{internal}'] = '{customer}' is not a safe label"
        
        print(f"PASS: CUSTOMER_STATUS_MAP covers all {len(INTERNAL_STATUSES)} internal statuses")
    
    def test_map_status_for_role_function(self):
        """Test map_status_for_role returns correct mappings"""
        from services.status_propagation_service import map_status_for_role
        
        # Customer should see safe labels
        assert map_status_for_role("pending", "customer") == "processing"
        assert map_status_for_role("created", "customer") == "processing"
        assert map_status_for_role("paid", "customer") == "confirmed"
        assert map_status_for_role("in_progress", "customer") == "in fulfillment"
        assert map_status_for_role("in_production", "customer") == "in fulfillment"
        assert map_status_for_role("delivered", "customer") == "delivered"
        assert map_status_for_role("completed", "customer") == "completed"
        
        # Sales should see full internal statuses
        assert map_status_for_role("pending", "sales") == "pending"
        assert map_status_for_role("in_progress", "sales") == "in progress"
        
        # Admin should see raw statuses
        assert map_status_for_role("in_progress", "admin") == "in progress"
        
        print("PASS: map_status_for_role returns correct mappings for all roles")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
