"""
Phase C.5: Quick Reorder API Tests
Tests the reorder endpoint, pricing engine integration, and Phase E discount requests verification.
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CUSTOMER_EMAIL = "demo.customer@konekt.com"
CUSTOMER_PASSWORD = "Demo123!"
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
STAFF_EMAIL = "neema.sales@konekt.demo"
STAFF_PASSWORD = "password123"


class TestQuickReorderAPI:
    """Tests for POST /api/customer/orders/{order_id}/reorder endpoint"""
    
    @pytest.fixture(scope="class")
    def customer_token(self):
        """Get customer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("token") or data.get("access_token")
        pytest.skip(f"Customer login failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def customer_orders(self, customer_token):
        """Get customer's orders"""
        response = requests.get(
            f"{BASE_URL}/api/customer/orders",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200, f"Failed to get orders: {response.text}"
        return response.json()
    
    def test_reorder_requires_authentication(self):
        """Test that reorder endpoint returns 401 without auth"""
        response = requests.post(f"{BASE_URL}/api/customer/orders/fake-order-id/reorder")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: Reorder endpoint requires authentication")
    
    def test_reorder_nonexistent_order_returns_404(self, customer_token):
        """Test that reorder returns 404 for non-existent order"""
        fake_order_id = f"nonexistent-{uuid.uuid4()}"
        response = requests.post(
            f"{BASE_URL}/api/customer/orders/{fake_order_id}/reorder",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("PASS: Reorder returns 404 for non-existent order")
    
    def test_reorder_existing_order_returns_cart_items(self, customer_token, customer_orders):
        """Test reorder on an existing order returns cart_items structure"""
        if not customer_orders:
            pytest.skip("No orders found for customer")
        
        # Use first order
        order = customer_orders[0]
        order_id = order.get("id") or order.get("order_number")
        
        response = requests.post(
            f"{BASE_URL}/api/customer/orders/{order_id}/reorder",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        
        assert response.status_code == 200, f"Reorder failed: {response.status_code} - {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "ok" in data, "Response missing 'ok' field"
        assert "cart_items" in data, "Response missing 'cart_items' field"
        assert "warnings" in data, "Response missing 'warnings' field"
        assert isinstance(data["cart_items"], list), "cart_items should be a list"
        assert isinstance(data["warnings"], list), "warnings should be a list"
        
        print(f"PASS: Reorder returned {len(data['cart_items'])} cart items, {len(data['warnings'])} warnings")
        print(f"  - ok: {data['ok']}")
        print(f"  - added_count: {data.get('added_count', 'N/A')}")
        print(f"  - skipped_count: {data.get('skipped_count', 'N/A')}")
        
        # If there are warnings, they should be about unavailable products (expected behavior)
        if data["warnings"]:
            print(f"  - Warnings (expected for old orders with deleted products):")
            for w in data["warnings"][:3]:
                print(f"    - {w}")
    
    def test_reorder_cart_item_structure(self, customer_token, customer_orders):
        """Test that cart items have correct structure with pricing info"""
        if not customer_orders:
            pytest.skip("No orders found for customer")
        
        order = customer_orders[0]
        order_id = order.get("id") or order.get("order_number")
        
        response = requests.post(
            f"{BASE_URL}/api/customer/orders/{order_id}/reorder",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        if data["cart_items"]:
            item = data["cart_items"][0]
            
            # Required fields
            required_fields = ["product_id", "name", "quantity", "unit_price", "subtotal"]
            for field in required_fields:
                assert field in item, f"Cart item missing required field: {field}"
            
            # Promo fields should be present
            assert "promo_applied" in item, "Cart item missing promo_applied field"
            
            if item.get("promo_applied"):
                assert "promo_label" in item, "Promo applied but missing promo_label"
                assert "original_price" in item, "Promo applied but missing original_price"
                print(f"PASS: Cart item has promo info - {item.get('promo_label')}")
            else:
                print("PASS: Cart item structure verified (no promo applied)")
            
            print(f"  - product_id: {item['product_id']}")
            print(f"  - name: {item['name']}")
            print(f"  - unit_price: {item['unit_price']}")
            print(f"  - quantity: {item['quantity']}")
        else:
            print("PASS: No cart items (all products unavailable - expected for old orders)")


class TestReorderWithValidProducts:
    """Test reorder with orders that have valid product references"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("token") or data.get("access_token")
        pytest.skip(f"Admin login failed: {response.status_code}")
    
    @pytest.fixture(scope="class")
    def customer_token(self):
        """Get customer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("token") or data.get("access_token")
        pytest.skip("Customer login failed")
    
    @pytest.fixture(scope="class")
    def valid_products(self, admin_token):
        """Get valid products from the database"""
        response = requests.get(
            f"{BASE_URL}/api/admin/products",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if response.status_code == 200:
            data = response.json()
            products = data.get("products") or data if isinstance(data, list) else []
            # Filter for active products with valid IDs
            valid = [p for p in products if p.get("id") and p.get("status") != "inactive"]
            return valid[:3]  # Return up to 3 products
        return []
    
    def test_get_valid_products(self, valid_products):
        """Verify we can get valid products for testing"""
        print(f"Found {len(valid_products)} valid products for testing")
        for p in valid_products[:3]:
            print(f"  - {p.get('name')} (id: {p.get('id')}, price: {p.get('selling_price') or p.get('price')})")
        # This is informational - products may not be available via admin API
        if len(valid_products) == 0:
            print("INFO: No products found via admin API - this is expected if products are managed differently")
            pytest.skip("No products available via admin API")


class TestPhaseEDiscountRequestsVerification:
    """Verify Phase E (Discount Requests) still works after Phase C.5 changes"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("token") or data.get("access_token")
        pytest.skip(f"Admin login failed: {response.status_code}")
    
    @pytest.fixture(scope="class")
    def staff_token(self):
        """Get staff auth token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": STAFF_EMAIL,
            "password": STAFF_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("token") or data.get("access_token")
        pytest.skip(f"Staff login failed: {response.status_code}")
    
    def test_admin_discount_requests_endpoint(self, admin_token):
        """Test GET /api/admin/discount-requests returns data"""
        response = requests.get(
            f"{BASE_URL}/api/admin/discount-requests",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Admin discount requests failed: {response.status_code} - {response.text}"
        data = response.json()
        
        # Verify response structure - API returns 'items' not 'requests'
        assert "items" in data or "requests" in data or isinstance(data, list), "Response should have items/requests"
        assert "kpis" in data or "total" in data, "Response should have KPIs"
        
        print("PASS: GET /api/admin/discount-requests works")
        if "kpis" in data:
            kpis = data["kpis"]
            print(f"  - Total: {kpis.get('total', 'N/A')}")
            print(f"  - Pending: {kpis.get('pending', 'N/A')}")
            print(f"  - Approved: {kpis.get('approved', 'N/A')}")
            print(f"  - Rejected: {kpis.get('rejected', 'N/A')}")
    
    def test_staff_create_discount_request(self, staff_token):
        """Test POST /api/staff/discount-requests creates a request"""
        test_request = {
            "quote_ref": f"TEST_QUOTE_{uuid.uuid4().hex[:8]}",
            "customer_name": "Test Customer Phase C5",
            "customer_email": "test.c5@example.com",
            "discount_type": "percentage",
            "discount_value": 5,
            "urgency": "normal",
            "reason": "Phase C.5 verification test",
            "notes": "Testing that Phase E still works after Phase C.5 implementation"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/staff/discount-requests",
            headers={"Authorization": f"Bearer {staff_token}"},
            json=test_request
        )
        
        assert response.status_code in [200, 201], f"Create discount request failed: {response.status_code} - {response.text}"
        data = response.json()
        
        assert data.get("ok") or data.get("id"), "Response should indicate success"
        print("PASS: POST /api/staff/discount-requests works")
        print(f"  - Created request: {data.get('id', 'N/A')}")
    
    def test_staff_list_discount_requests(self, staff_token):
        """Test GET /api/staff/discount-requests lists staff's requests"""
        response = requests.get(
            f"{BASE_URL}/api/staff/discount-requests",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        
        assert response.status_code == 200, f"Staff list discount requests failed: {response.status_code} - {response.text}"
        data = response.json()
        
        requests_list = data.get("requests") or data if isinstance(data, list) else []
        print(f"PASS: GET /api/staff/discount-requests works - {len(requests_list)} requests found")


class TestCustomerOrdersAPI:
    """Test customer orders API endpoints"""
    
    @pytest.fixture(scope="class")
    def customer_token(self):
        """Get customer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("token") or data.get("access_token")
        pytest.skip("Customer login failed")
    
    def test_get_customer_orders(self, customer_token):
        """Test GET /api/customer/orders returns orders list"""
        response = requests.get(
            f"{BASE_URL}/api/customer/orders",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        
        assert response.status_code == 200, f"Get orders failed: {response.status_code} - {response.text}"
        orders = response.json()
        
        assert isinstance(orders, list), "Orders should be a list"
        print(f"PASS: GET /api/customer/orders returns {len(orders)} orders")
        
        if orders:
            order = orders[0]
            # Verify order has expected fields
            expected_fields = ["id", "status"]
            for field in expected_fields:
                if field not in order:
                    print(f"  - Warning: Order missing field '{field}'")
            
            print(f"  - First order: {order.get('order_number') or order.get('id')}")
            print(f"  - Status: {order.get('customer_status') or order.get('status')}")
    
    def test_get_customer_order_detail(self, customer_token):
        """Test GET /api/customer/orders/{order_id} returns order detail"""
        # First get orders list
        response = requests.get(
            f"{BASE_URL}/api/customer/orders",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        
        if response.status_code != 200:
            pytest.skip("Could not get orders list")
        
        orders = response.json()
        if not orders:
            pytest.skip("No orders found")
        
        order_id = orders[0].get("id") or orders[0].get("order_number")
        
        # Get order detail
        response = requests.get(
            f"{BASE_URL}/api/customer/orders/{order_id}",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        
        assert response.status_code == 200, f"Get order detail failed: {response.status_code} - {response.text}"
        order = response.json()
        
        # Verify enriched fields
        assert "timeline_steps" in order, "Order should have timeline_steps"
        assert "customer_status" in order, "Order should have customer_status"
        
        print(f"PASS: GET /api/customer/orders/{order_id} returns enriched order")
        print(f"  - Customer status: {order.get('customer_status')}")
        print(f"  - Timeline steps: {len(order.get('timeline_steps', []))}")


class TestReorderEdgeCases:
    """Test edge cases for reorder functionality"""
    
    @pytest.fixture(scope="class")
    def customer_token(self):
        """Get customer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("token") or data.get("access_token")
        pytest.skip("Customer login failed")
    
    def test_reorder_with_invalid_token(self):
        """Test reorder with invalid token returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/customer/orders/some-order-id/reorder",
            headers={"Authorization": "Bearer invalid-token-12345"}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: Reorder with invalid token returns 401/403")
    
    def test_reorder_response_has_source_order(self, customer_token):
        """Test reorder response includes source_order reference"""
        # Get orders
        response = requests.get(
            f"{BASE_URL}/api/customer/orders",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        
        if response.status_code != 200:
            pytest.skip("Could not get orders")
        
        orders = response.json()
        if not orders:
            pytest.skip("No orders found")
        
        order_id = orders[0].get("id") or orders[0].get("order_number")
        
        # Reorder
        response = requests.post(
            f"{BASE_URL}/api/customer/orders/{order_id}/reorder",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "source_order" in data, "Response should include source_order"
        print(f"PASS: Reorder response includes source_order: {data['source_order']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
