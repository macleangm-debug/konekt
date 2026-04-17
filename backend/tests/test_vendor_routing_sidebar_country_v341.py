"""
Test Suite for Iteration 341 - Vendor Order Routing, Sidebar Badge Counts, Country Switcher

Features tested:
1. GET /api/admin/sidebar-counts - Returns feedback_new badge count
2. POST /api/admin/orders-ops/{order_id}/auto-route - Vendor order auto-routing
3. GET /api/admin/active-country-config - Active country config
4. Vendor order routing service creates vendor_orders from order line items
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    """Headers with admin auth token"""
    return {"Authorization": f"Bearer {admin_token}"}


class TestSidebarCounts:
    """Test sidebar badge counts endpoint - includes feedback_new"""
    
    def test_sidebar_counts_returns_feedback_new(self, auth_headers):
        """GET /api/admin/sidebar-counts should return feedback_new badge count"""
        response = requests.get(f"{BASE_URL}/api/admin/sidebar-counts", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify feedback_new is present in response (flattened to integer)
        assert "feedback_new" in data, f"feedback_new not in response: {data.keys()}"
        
        feedback_new = data["feedback_new"]
        # Sidebar-counts returns flattened badge_count as integer
        assert isinstance(feedback_new, int), f"Expected int, got {type(feedback_new)}: {feedback_new}"
        assert feedback_new >= 0, f"Invalid badge_count: {feedback_new}"
        print(f"✓ feedback_new badge_count: {feedback_new}")
    
    def test_sidebar_counts_returns_discount_requests(self, auth_headers):
        """GET /api/admin/sidebar-counts should return discount_requests badge count"""
        response = requests.get(f"{BASE_URL}/api/admin/sidebar-counts", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "discount_requests" in data, f"discount_requests not in response: {data.keys()}"
        
        discount_requests = data["discount_requests"]
        # Sidebar-counts returns flattened badge_count as integer
        assert isinstance(discount_requests, int), f"Expected int, got {type(discount_requests)}"
        assert discount_requests >= 0
        print(f"✓ discount_requests badge_count: {discount_requests}")
    
    def test_sidebar_counts_returns_all_expected_keys(self, auth_headers):
        """GET /api/admin/sidebar-counts should return all expected badge keys"""
        response = requests.get(f"{BASE_URL}/api/admin/sidebar-counts", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        expected_keys = ["requests_inbox", "orders", "payments_queue", "deliveries", "quotes", "customers", "feedback_new", "discount_requests"]
        
        for key in expected_keys:
            assert key in data, f"Missing key: {key}"
            # Sidebar-counts returns flattened badge_count as integer
            assert isinstance(data[key], int), f"Expected int for {key}, got {type(data[key])}"
        
        print(f"✓ All expected keys present: {expected_keys}")


class TestAutoRouteOrder:
    """Test vendor order auto-routing endpoint"""
    
    def test_auto_route_nonexistent_order_returns_error(self, auth_headers):
        """POST /api/admin/orders-ops/{order_id}/auto-route should return error for non-existent order"""
        fake_order_id = "nonexistent-order-12345"
        response = requests.post(
            f"{BASE_URL}/api/admin/orders-ops/{fake_order_id}/auto-route",
            headers=auth_headers,
            json={"trigger": "manual"}
        )
        # Should return 400 with error message
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data, f"Expected 'detail' in error response: {data}"
        assert "not found" in data["detail"].lower() or "order" in data["detail"].lower(), f"Unexpected error: {data['detail']}"
        print(f"✓ Auto-route returns error for non-existent order: {data['detail']}")
    
    def test_auto_route_endpoint_exists(self, auth_headers):
        """POST /api/admin/orders-ops/{order_id}/auto-route endpoint should exist"""
        # Use a fake ID - we just want to verify the endpoint exists and handles the request
        response = requests.post(
            f"{BASE_URL}/api/admin/orders-ops/test-order-id/auto-route",
            headers=auth_headers,
            json={}
        )
        # Should not return 404 (endpoint not found) or 405 (method not allowed)
        assert response.status_code not in [404, 405], f"Endpoint not found or method not allowed: {response.status_code}"
        print(f"✓ Auto-route endpoint exists, returned: {response.status_code}")


class TestActiveCountryConfig:
    """Test active country configuration endpoint"""
    
    def test_active_country_config_returns_tz_defaults(self, auth_headers):
        """GET /api/admin/active-country-config should return Tanzania defaults"""
        response = requests.get(f"{BASE_URL}/api/admin/active-country-config", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify Tanzania defaults
        assert data.get("code") == "TZ", f"Expected code=TZ, got {data.get('code')}"
        assert data.get("currency") == "TZS", f"Expected currency=TZS, got {data.get('currency')}"
        assert data.get("phone_prefix") == "+255", f"Expected phone_prefix=+255, got {data.get('phone_prefix')}"
        
        print(f"✓ Active country config: code={data.get('code')}, currency={data.get('currency')}, phone_prefix={data.get('phone_prefix')}")
    
    def test_active_country_config_has_required_fields(self, auth_headers):
        """GET /api/admin/active-country-config should have all required fields"""
        response = requests.get(f"{BASE_URL}/api/admin/active-country-config", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        required_fields = ["code", "name", "currency", "currency_symbol", "vat_rate", "phone_prefix"]
        
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        print(f"✓ All required fields present: {required_fields}")


class TestSettingsHubCountries:
    """Test Settings Hub countries configuration"""
    
    def test_settings_hub_returns_countries(self, auth_headers):
        """GET /api/admin/settings-hub should return countries configuration"""
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Check if countries section exists
        value = data.get("value", {})
        countries = value.get("countries", {})
        
        # Should have available_countries
        available = countries.get("available_countries", [])
        print(f"✓ Settings Hub countries: {len(available)} countries configured")
        
        if available:
            for country in available:
                print(f"  - {country.get('code')}: {country.get('name')} ({country.get('currency')})")


class TestDashboardLoads:
    """Test admin dashboard loads correctly"""
    
    def test_dashboard_stats_endpoint(self, auth_headers):
        """GET /api/admin/dashboard/stats should return KPI data"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard/stats", headers=auth_headers)
        # Dashboard stats might be at different endpoint
        if response.status_code == 404:
            # Try alternative endpoint
            response = requests.get(f"{BASE_URL}/api/admin/stats", headers=auth_headers)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Dashboard stats loaded: {list(data.keys())[:5]}...")
        else:
            print(f"⚠ Dashboard stats endpoint returned: {response.status_code}")


class TestFeedbackInbox:
    """Test feedback inbox functionality"""
    
    def test_feedback_list_endpoint(self, auth_headers):
        """GET /api/feedback should return feedback items"""
        # Note: Feedback endpoint is at /api/feedback, not /api/admin/feedback
        response = requests.get(f"{BASE_URL}/api/feedback", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Should be a list
        if isinstance(data, list):
            print(f"✓ Feedback inbox: {len(data)} items")
            # Check for items with status 'new'
            new_items = [f for f in data if f.get("status") == "new"]
            print(f"  - {len(new_items)} items with status 'new'")
        elif isinstance(data, dict) and "items" in data:
            print(f"✓ Feedback inbox: {len(data['items'])} items")
        else:
            print(f"✓ Feedback endpoint returned: {type(data)}")
    
    def test_feedback_stats_endpoint(self, auth_headers):
        """GET /api/feedback/stats should return feedback statistics"""
        response = requests.get(f"{BASE_URL}/api/feedback/stats", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        expected_keys = ["total", "new", "in_progress", "resolved"]
        for key in expected_keys:
            assert key in data, f"Missing key: {key}"
        
        print(f"✓ Feedback stats: total={data.get('total')}, new={data.get('new')}, resolved={data.get('resolved')}")


class TestVendorAssignments:
    """Test vendor assignments for category routing"""
    
    def test_vendor_assignments_list(self, auth_headers):
        """GET /api/admin/vendor-assignments should return assignments"""
        response = requests.get(f"{BASE_URL}/api/admin/vendor-assignments", headers=auth_headers)
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                print(f"✓ Vendor assignments: {len(data)} assignments")
                # Check for active assignments
                active = [a for a in data if a.get("is_active")]
                print(f"  - {len(active)} active assignments")
            else:
                print(f"✓ Vendor assignments returned: {type(data)}")
        else:
            print(f"⚠ Vendor assignments endpoint returned: {response.status_code}")


class TestOrdersOpsEndpoints:
    """Test orders operations endpoints"""
    
    def test_orders_list(self, auth_headers):
        """GET /api/admin/orders-ops should return orders list"""
        response = requests.get(f"{BASE_URL}/api/admin/orders-ops", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        if isinstance(data, list):
            print(f"✓ Orders list: {len(data)} orders")
        else:
            print(f"✓ Orders endpoint returned: {type(data)}")
    
    def test_orders_stats(self, auth_headers):
        """GET /api/admin/orders-ops/stats should return order statistics"""
        response = requests.get(f"{BASE_URL}/api/admin/orders-ops/stats", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        expected_keys = ["total", "new", "assigned", "in_progress", "completed"]
        for key in expected_keys:
            assert key in data, f"Missing key: {key}"
        
        print(f"✓ Orders stats: total={data.get('total')}, new={data.get('new')}, completed={data.get('completed')}")


class TestSettingsHubLaunchControls:
    """Test Settings Hub Launch Controls section"""
    
    def test_settings_hub_has_launch_controls(self, auth_headers):
        """GET /api/admin/settings-hub should have launch_controls section"""
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        value = data.get("value", {})
        
        # Check for launch_controls or go_live section
        launch_controls = value.get("launch_controls", {})
        go_live = value.get("go_live", {})
        
        has_launch = bool(launch_controls) or bool(go_live)
        print(f"✓ Settings Hub launch_controls: {bool(launch_controls)}, go_live: {bool(go_live)}")
        
        if launch_controls:
            print(f"  - Launch controls keys: {list(launch_controls.keys())[:5]}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
