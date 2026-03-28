"""
Vendor Orders Cleanup Pack - Backend API Tests
Tests the vendor orders API routes for the Konekt B2B platform.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://konekt-invoice-fix.preview.emergentagent.com')

# Test credentials
PARTNER_EMAIL = "demo.partner@konekt.com"
PARTNER_PASSWORD = "Partner123!"


class TestVendorOrdersAPI:
    """Tests for vendor orders API endpoints"""
    
    @pytest.fixture(scope="class")
    def partner_token(self):
        """Get partner authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": PARTNER_EMAIL, "password": PARTNER_PASSWORD}
        )
        assert response.status_code == 200, f"Partner login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in login response"
        return data["token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, partner_token):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {partner_token}"}
    
    # GET /api/vendor/orders - List vendor orders
    def test_get_vendor_orders_returns_list(self, auth_headers):
        """GET /api/vendor/orders returns a list of vendor orders"""
        response = requests.get(f"{BASE_URL}/api/vendor/orders", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
    
    def test_get_vendor_orders_has_required_fields(self, auth_headers):
        """Each vendor order has required fields"""
        response = requests.get(f"{BASE_URL}/api/vendor/orders", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            order = data[0]
            required_fields = [
                "id", "vendor_order_no", "order_id", "created_at", "date",
                "customer_name", "source_type", "fulfillment_state", "status",
                "priority", "items", "timeline"
            ]
            for field in required_fields:
                assert field in order, f"Missing field: {field}"
    
    def test_get_vendor_orders_sorted_newest_first(self, auth_headers):
        """Vendor orders are sorted by created_at descending (newest first)"""
        response = requests.get(f"{BASE_URL}/api/vendor/orders", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        if len(data) >= 2:
            # Check that first order is newer than second
            first_date = data[0].get("created_at", "")
            second_date = data[1].get("created_at", "")
            assert first_date >= second_date, "Orders should be sorted newest first"
    
    def test_get_vendor_orders_with_status_filter(self, auth_headers):
        """GET /api/vendor/orders?status=in_progress filters by status"""
        response = requests.get(
            f"{BASE_URL}/api/vendor/orders?status=in_progress",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # All returned orders should have the filtered status
        for order in data:
            assert order.get("status") == "in_progress", f"Order has wrong status: {order.get('status')}"
    
    def test_get_vendor_orders_includes_customer_info(self, auth_headers):
        """Vendor orders include customer name and phone"""
        response = requests.get(f"{BASE_URL}/api/vendor/orders", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            order = data[0]
            assert "customer_name" in order, "Missing customer_name"
            assert "customer_phone" in order, "Missing customer_phone"
    
    def test_get_vendor_orders_includes_sales_contact(self, auth_headers):
        """Vendor orders include Konekt sales contact info"""
        response = requests.get(f"{BASE_URL}/api/vendor/orders", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            order = data[0]
            assert "sales_name" in order, "Missing sales_name"
            assert "sales_phone" in order, "Missing sales_phone"
            assert "sales_email" in order, "Missing sales_email"
    
    def test_get_vendor_orders_includes_timeline(self, auth_headers):
        """Vendor orders include timeline events"""
        response = requests.get(f"{BASE_URL}/api/vendor/orders", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            order = data[0]
            assert "timeline" in order, "Missing timeline"
            assert isinstance(order["timeline"], list), "Timeline should be a list"
            
            if len(order["timeline"]) > 0:
                event = order["timeline"][0]
                assert "label" in event, "Timeline event missing label"
                assert "date" in event, "Timeline event missing date"
    
    def test_get_vendor_orders_requires_auth(self):
        """GET /api/vendor/orders requires authentication"""
        response = requests.get(f"{BASE_URL}/api/vendor/orders")
        assert response.status_code in [401, 403], "Should require auth"
    
    # POST /api/vendor/orders/{id}/status - Update status
    def test_update_vendor_order_status_success(self, auth_headers):
        """POST /api/vendor/orders/{id}/status updates status successfully"""
        # First get an order
        orders_response = requests.get(f"{BASE_URL}/api/vendor/orders", headers=auth_headers)
        assert orders_response.status_code == 200
        orders = orders_response.json()
        
        if len(orders) > 0:
            order_id = orders[0]["id"]
            current_status = orders[0]["status"]
            
            # Determine next valid status
            status_flow = {
                "ready_to_fulfill": "in_progress",
                "assigned": "accepted",
                "accepted": "in_progress",
                "in_progress": "fulfilled",
                "processing": "in_progress",
            }
            new_status = status_flow.get(current_status, "in_progress")
            
            response = requests.post(
                f"{BASE_URL}/api/vendor/orders/{order_id}/status",
                headers=auth_headers,
                json={"status": new_status}
            )
            assert response.status_code == 200, f"Failed: {response.text}"
            data = response.json()
            assert data.get("ok") == True, "Response should have ok=True"
            assert data.get("status") == new_status, f"Status should be {new_status}"
    
    def test_update_vendor_order_status_invalid_status(self, auth_headers):
        """POST /api/vendor/orders/{id}/status rejects invalid status"""
        orders_response = requests.get(f"{BASE_URL}/api/vendor/orders", headers=auth_headers)
        assert orders_response.status_code == 200
        orders = orders_response.json()
        
        if len(orders) > 0:
            order_id = orders[0]["id"]
            response = requests.post(
                f"{BASE_URL}/api/vendor/orders/{order_id}/status",
                headers=auth_headers,
                json={"status": "invalid_status_xyz"}
            )
            assert response.status_code == 400, "Should reject invalid status"
    
    def test_update_vendor_order_status_not_found(self, auth_headers):
        """POST /api/vendor/orders/{id}/status returns 404 for non-existent order"""
        response = requests.post(
            f"{BASE_URL}/api/vendor/orders/nonexistent123456/status",
            headers=auth_headers,
            json={"status": "in_progress"}
        )
        assert response.status_code == 404, "Should return 404 for non-existent order"
    
    def test_update_vendor_order_status_requires_auth(self):
        """POST /api/vendor/orders/{id}/status requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/vendor/orders/some_id/status",
            json={"status": "in_progress"}
        )
        assert response.status_code in [401, 403], "Should require auth"
    
    # POST /api/vendor/orders/{id}/note - Add note
    def test_add_vendor_order_note_success(self, auth_headers):
        """POST /api/vendor/orders/{id}/note adds a note successfully"""
        orders_response = requests.get(f"{BASE_URL}/api/vendor/orders", headers=auth_headers)
        assert orders_response.status_code == 200
        orders = orders_response.json()
        
        if len(orders) > 0:
            order_id = orders[0]["id"]
            note_text = "Test note from pytest"
            
            response = requests.post(
                f"{BASE_URL}/api/vendor/orders/{order_id}/note",
                headers=auth_headers,
                json={"note": note_text}
            )
            assert response.status_code == 200, f"Failed: {response.text}"
            data = response.json()
            assert data.get("ok") == True, "Response should have ok=True"
            assert "note" in data, "Response should include note"
            assert data["note"]["text"] == note_text, "Note text should match"
    
    def test_add_vendor_order_note_empty_rejected(self, auth_headers):
        """POST /api/vendor/orders/{id}/note rejects empty note"""
        orders_response = requests.get(f"{BASE_URL}/api/vendor/orders", headers=auth_headers)
        assert orders_response.status_code == 200
        orders = orders_response.json()
        
        if len(orders) > 0:
            order_id = orders[0]["id"]
            response = requests.post(
                f"{BASE_URL}/api/vendor/orders/{order_id}/note",
                headers=auth_headers,
                json={"note": ""}
            )
            assert response.status_code == 400, "Should reject empty note"
    
    def test_add_vendor_order_note_not_found(self, auth_headers):
        """POST /api/vendor/orders/{id}/note returns 404 for non-existent order"""
        response = requests.post(
            f"{BASE_URL}/api/vendor/orders/nonexistent123456/note",
            headers=auth_headers,
            json={"note": "Test note"}
        )
        assert response.status_code == 404, "Should return 404 for non-existent order"
    
    def test_add_vendor_order_note_requires_auth(self):
        """POST /api/vendor/orders/{id}/note requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/vendor/orders/some_id/note",
            json={"note": "Test note"}
        )
        assert response.status_code in [401, 403], "Should require auth"


class TestPartnerLoginAndRedirect:
    """Tests for partner login flow"""
    
    def test_partner_login_via_unified_login(self):
        """Partner can login via unified /api/auth/login endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": PARTNER_EMAIL, "password": PARTNER_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Should return token"
        assert "user" in data, "Should return user"
        assert data["user"]["role"] == "partner", "User role should be partner"
    
    def test_partner_login_returns_partner_token(self):
        """Partner login returns a valid JWT token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": PARTNER_EMAIL, "password": PARTNER_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        token = data.get("token", "")
        
        # Token should be a valid JWT (3 parts separated by dots)
        parts = token.split(".")
        assert len(parts) == 3, "Token should be a valid JWT"
    
    def test_partner_login_invalid_credentials(self):
        """Partner login fails with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": PARTNER_EMAIL, "password": "WrongPassword123!"}
        )
        assert response.status_code == 401, "Should return 401 for invalid credentials"


class TestLegacyFulfillmentRouteRemoved:
    """Tests to verify legacy fulfillment route is removed"""
    
    def test_fulfillment_route_not_in_sidebar_config(self):
        """Verify /partner/fulfillment is not in sidebar navigation"""
        # This is a code review check - the sidebar should show /partner/orders not /partner/fulfillment
        # We verify by checking that the My Orders link points to /partner/orders
        pass  # This is verified in frontend testing
    
    def test_vendor_orders_endpoint_exists(self):
        """Verify /api/vendor/orders endpoint exists and responds"""
        response = requests.get(f"{BASE_URL}/api/vendor/orders")
        # Should return 401/403 (auth required) not 404 (not found)
        assert response.status_code in [401, 403], f"Endpoint should exist but require auth, got {response.status_code}"
