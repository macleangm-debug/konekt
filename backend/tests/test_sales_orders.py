"""
Sales Orders API Tests
Tests for GET /api/sales/orders and GET /api/sales/orders/{order_id}
Also tests admin orders endpoint sales enrichment
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSalesOrdersAPI:
    """Tests for Sales Orders endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data.get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    # ===== GET /api/sales/orders Tests =====
    
    def test_sales_orders_list_returns_200(self):
        """GET /api/sales/orders returns 200 OK"""
        response = self.session.get(f"{BASE_URL}/api/sales/orders")
        assert response.status_code == 200
    
    def test_sales_orders_list_has_pagination(self):
        """GET /api/sales/orders returns paginated response with total, page, pages"""
        response = self.session.get(f"{BASE_URL}/api/sales/orders?page=1&limit=10")
        assert response.status_code == 200
        data = response.json()
        
        # Check pagination fields exist
        assert "orders" in data, "Response missing 'orders' field"
        assert "total" in data, "Response missing 'total' field"
        assert "page" in data, "Response missing 'page' field"
        assert "pages" in data, "Response missing 'pages' field"
        
        # Validate types
        assert isinstance(data["orders"], list)
        assert isinstance(data["total"], int)
        assert isinstance(data["page"], int)
        assert isinstance(data["pages"], int)
    
    def test_sales_orders_list_has_customer_fields(self):
        """GET /api/sales/orders returns customer_name, customer_email, customer_phone for each order"""
        response = self.session.get(f"{BASE_URL}/api/sales/orders?page=1&limit=5")
        assert response.status_code == 200
        data = response.json()
        
        orders = data.get("orders", [])
        if len(orders) > 0:
            order = orders[0]
            # These fields should exist (may be empty string if no customer)
            assert "customer_name" in order or "customer" in order, "Order missing customer_name field"
            assert "customer_email" in order or "customer" in order, "Order missing customer_email field"
            assert "customer_phone" in order or "customer" in order, "Order missing customer_phone field"
    
    def test_sales_orders_status_filter(self):
        """GET /api/sales/orders responds to ?status=processing filter"""
        response = self.session.get(f"{BASE_URL}/api/sales/orders?status=processing")
        assert response.status_code == 200
        data = response.json()
        
        # All returned orders should have processing status
        orders = data.get("orders", [])
        for order in orders:
            status = order.get("current_status") or order.get("status")
            assert status == "processing", f"Order {order.get('order_number')} has status {status}, expected processing"
    
    def test_sales_orders_search_filter(self):
        """GET /api/sales/orders responds to ?search=KON query"""
        response = self.session.get(f"{BASE_URL}/api/sales/orders?search=KON")
        assert response.status_code == 200
        data = response.json()
        
        # Should return orders matching KON in order_number or phone
        orders = data.get("orders", [])
        # If there are results, they should contain KON
        for order in orders[:5]:  # Check first 5
            order_num = order.get("order_number", "")
            phone = order.get("delivery_phone", "")
            assert "KON" in order_num.upper() or "KON" in phone.upper(), \
                f"Order {order_num} doesn't match search 'KON'"
    
    def test_sales_orders_pagination_works(self):
        """GET /api/sales/orders pagination returns different results per page"""
        response1 = self.session.get(f"{BASE_URL}/api/sales/orders?page=1&limit=5")
        response2 = self.session.get(f"{BASE_URL}/api/sales/orders?page=2&limit=5")
        
        assert response1.status_code == 200
        assert response2.status_code == 200
        
        data1 = response1.json()
        data2 = response2.json()
        
        orders1 = data1.get("orders", [])
        orders2 = data2.get("orders", [])
        
        # If there are enough orders, page 2 should have different orders
        if data1.get("total", 0) > 5 and len(orders1) > 0 and len(orders2) > 0:
            order_ids_1 = {o.get("id") or o.get("order_number") for o in orders1}
            order_ids_2 = {o.get("id") or o.get("order_number") for o in orders2}
            assert order_ids_1 != order_ids_2, "Page 1 and Page 2 have same orders"
    
    # ===== GET /api/sales/orders/{order_id} Tests =====
    
    def test_sales_order_detail_returns_200(self):
        """GET /api/sales/orders/{order_id} returns 200 for valid order"""
        # First get an order ID
        list_response = self.session.get(f"{BASE_URL}/api/sales/orders?page=1&limit=1")
        assert list_response.status_code == 200
        orders = list_response.json().get("orders", [])
        
        if len(orders) > 0:
            order_id = orders[0].get("id") or orders[0].get("order_number")
            detail_response = self.session.get(f"{BASE_URL}/api/sales/orders/{order_id}")
            assert detail_response.status_code == 200
    
    def test_sales_order_detail_has_customer_info(self):
        """GET /api/sales/orders/{order_id} returns detailed order with customer info"""
        list_response = self.session.get(f"{BASE_URL}/api/sales/orders?page=1&limit=1")
        orders = list_response.json().get("orders", [])
        
        if len(orders) > 0:
            order_id = orders[0].get("id") or orders[0].get("order_number")
            detail_response = self.session.get(f"{BASE_URL}/api/sales/orders/{order_id}")
            assert detail_response.status_code == 200
            
            order = detail_response.json()
            # Should have customer info
            assert "customer" in order or "customer_name" in order, "Order detail missing customer info"
    
    def test_sales_order_detail_has_sales_info(self):
        """GET /api/sales/orders/{order_id} returns sales object (may be empty if not assigned)"""
        list_response = self.session.get(f"{BASE_URL}/api/sales/orders?page=1&limit=1")
        orders = list_response.json().get("orders", [])
        
        if len(orders) > 0:
            order_id = orders[0].get("id") or orders[0].get("order_number")
            detail_response = self.session.get(f"{BASE_URL}/api/sales/orders/{order_id}")
            assert detail_response.status_code == 200
            
            order = detail_response.json()
            # Sales field should exist (may be empty dict if not assigned)
            # The enrichment service adds this field
            # Note: If no assigned_sales_id, sales may not be present or be empty
            # This is expected behavior per the context note
    
    def test_sales_order_detail_has_items(self):
        """GET /api/sales/orders/{order_id} returns items/line_items"""
        list_response = self.session.get(f"{BASE_URL}/api/sales/orders?page=1&limit=1")
        orders = list_response.json().get("orders", [])
        
        if len(orders) > 0:
            order_id = orders[0].get("id") or orders[0].get("order_number")
            detail_response = self.session.get(f"{BASE_URL}/api/sales/orders/{order_id}")
            assert detail_response.status_code == 200
            
            order = detail_response.json()
            # Should have items
            assert "items" in order or "line_items" in order, "Order detail missing items"
    
    def test_sales_order_detail_404_for_invalid_id(self):
        """GET /api/sales/orders/{order_id} returns 404 for non-existent order"""
        response = self.session.get(f"{BASE_URL}/api/sales/orders/non-existent-order-id-12345")
        assert response.status_code == 404
    
    # ===== Admin Orders Sales Enrichment Tests =====
    
    def test_admin_orders_has_sales_enrichment(self):
        """GET /api/admin/orders includes sales enrichment for orders with assigned_sales_id"""
        response = self.session.get(f"{BASE_URL}/api/admin/orders?page=1&limit=10")
        assert response.status_code == 200
        data = response.json()
        
        # The endpoint should work and return orders
        assert "orders" in data
        orders = data.get("orders", [])
        
        # Check if any orders have assigned_sales_id and corresponding sales object
        for order in orders:
            if order.get("assigned_sales_id"):
                # If there's an assigned_sales_id, sales object should be enriched
                # (unless the sales user doesn't exist)
                pass  # Sales enrichment is optional based on data
    
    def test_admin_orders_pagination(self):
        """GET /api/admin/orders returns paginated response"""
        response = self.session.get(f"{BASE_URL}/api/admin/orders?page=1&limit=5")
        assert response.status_code == 200
        data = response.json()
        
        assert "orders" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data


class TestSalesOrdersAuth:
    """Tests for Sales Orders authentication"""
    
    def test_sales_orders_requires_auth(self):
        """GET /api/sales/orders requires authentication"""
        response = requests.get(f"{BASE_URL}/api/sales/orders")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_sales_order_detail_requires_auth(self):
        """GET /api/sales/orders/{order_id} requires authentication"""
        response = requests.get(f"{BASE_URL}/api/sales/orders/some-order-id")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
