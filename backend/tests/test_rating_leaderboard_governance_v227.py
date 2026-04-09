"""
Test Suite for Iteration 227 Features:
1. Configurable alert thresholds in Settings Hub (discount_governance)
2. Sales rating system (customer rates completed orders)
3. Sales dashboard rating KPI (avg_rating, recent_ratings)
4. Sales leaderboard (ranked table with deals, revenue, commission, rating)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
STAFF_EMAIL = "staff@konekt.co.tz"
STAFF_PASSWORD = "Staff123!"
CUSTOMER_EMAIL = "test@konekt.tz"
CUSTOMER_PASSWORD = "TestUser123!"

# Test order ID (already rated by test user - for duplicate rejection test)
RATED_ORDER_ID = "69b192362d4f87d8d578845e"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def staff_token():
    """Get staff authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": STAFF_EMAIL,
        "password": STAFF_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Staff login failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def customer_token():
    """Get customer authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": CUSTOMER_EMAIL,
        "password": CUSTOMER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Customer login failed: {response.status_code} - {response.text}")


class TestDiscountGovernanceSettings:
    """Test configurable alert thresholds in Settings Hub"""

    def test_get_settings_hub_returns_discount_governance(self, admin_token):
        """GET /api/admin/settings-hub returns discount_governance section with defaults"""
        response = requests.get(
            f"{BASE_URL}/api/admin/settings-hub",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "discount_governance" in data, "discount_governance section missing"
        
        dg = data["discount_governance"]
        # Verify all expected fields exist
        assert "enabled" in dg, "enabled field missing"
        assert "critical_threshold" in dg, "critical_threshold field missing"
        assert "warning_threshold" in dg, "warning_threshold field missing"
        assert "rolling_window_days" in dg, "rolling_window_days field missing"
        assert "dedup_window_hours" in dg, "dedup_window_hours field missing"
        
        # Verify default values
        assert isinstance(dg["enabled"], bool), "enabled should be boolean"
        assert isinstance(dg["critical_threshold"], int), "critical_threshold should be int"
        assert isinstance(dg["warning_threshold"], int), "warning_threshold should be int"
        assert isinstance(dg["rolling_window_days"], int), "rolling_window_days should be int"
        assert isinstance(dg["dedup_window_hours"], int), "dedup_window_hours should be int"
        
        print(f"✓ discount_governance defaults: enabled={dg['enabled']}, critical={dg['critical_threshold']}, warning={dg['warning_threshold']}, window={dg['rolling_window_days']}d, dedup={dg['dedup_window_hours']}h")

    def test_update_discount_governance_settings(self, admin_token):
        """PUT /api/admin/settings-hub can update discount_governance settings"""
        # First get current settings
        get_response = requests.get(
            f"{BASE_URL}/api/admin/settings-hub",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_response.status_code == 200
        current = get_response.json()
        
        # Update discount_governance with new values
        updated_settings = {
            **current,
            "discount_governance": {
                "enabled": True,
                "critical_threshold": 4,
                "warning_threshold": 6,
                "rolling_window_days": 14,
                "dedup_window_hours": 48
            }
        }
        
        put_response = requests.put(
            f"{BASE_URL}/api/admin/settings-hub",
            json=updated_settings,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert put_response.status_code == 200, f"Expected 200, got {put_response.status_code}: {put_response.text}"
        
        # Verify the update
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/settings-hub",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert verify_response.status_code == 200
        verified = verify_response.json()
        
        dg = verified["discount_governance"]
        assert dg["critical_threshold"] == 4, f"Expected critical_threshold=4, got {dg['critical_threshold']}"
        assert dg["warning_threshold"] == 6, f"Expected warning_threshold=6, got {dg['warning_threshold']}"
        assert dg["rolling_window_days"] == 14, f"Expected rolling_window_days=14, got {dg['rolling_window_days']}"
        assert dg["dedup_window_hours"] == 48, f"Expected dedup_window_hours=48, got {dg['dedup_window_hours']}"
        
        print("✓ discount_governance settings updated and verified")
        
        # Restore defaults
        restored_settings = {
            **current,
            "discount_governance": {
                "enabled": True,
                "critical_threshold": 3,
                "warning_threshold": 5,
                "rolling_window_days": 7,
                "dedup_window_hours": 24
            }
        }
        requests.put(
            f"{BASE_URL}/api/admin/settings-hub",
            json=restored_settings,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print("✓ discount_governance settings restored to defaults")


class TestCustomerOrderRating:
    """Test customer rating system for completed orders"""

    def test_rate_order_rejects_invalid_stars(self, customer_token):
        """POST /api/customer/orders/{order_id}/rate rejects stars outside 1-5"""
        # Test with 0 stars
        response = requests.post(
            f"{BASE_URL}/api/customer/orders/{RATED_ORDER_ID}/rate",
            json={"stars": 0, "comment": "Test"},
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 400, f"Expected 400 for 0 stars, got {response.status_code}"
        assert "1-5" in response.json().get("detail", ""), "Error should mention 1-5 range"
        print("✓ Rejected 0 stars with proper error")
        
        # Test with 6 stars
        response = requests.post(
            f"{BASE_URL}/api/customer/orders/{RATED_ORDER_ID}/rate",
            json={"stars": 6, "comment": "Test"},
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 400, f"Expected 400 for 6 stars, got {response.status_code}"
        assert "1-5" in response.json().get("detail", ""), "Error should mention 1-5 range"
        print("✓ Rejected 6 stars with proper error")

    def test_rate_order_rejects_duplicate(self, customer_token):
        """POST /api/customer/orders/{order_id}/rate rejects duplicate ratings"""
        # The order 69b192362d4f87d8d578845e has already been rated
        response = requests.post(
            f"{BASE_URL}/api/customer/orders/{RATED_ORDER_ID}/rate",
            json={"stars": 5, "comment": "Duplicate test"},
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        # Should be 400 (already rated) or 404 (order not found for this user)
        assert response.status_code in [400, 404], f"Expected 400 or 404, got {response.status_code}: {response.text}"
        
        if response.status_code == 400:
            detail = response.json().get("detail", "")
            assert "already" in detail.lower() or "rated" in detail.lower(), f"Error should mention already rated: {detail}"
            print("✓ Duplicate rating rejected with 'already rated' message")
        else:
            print("✓ Order not found for this customer (expected if order belongs to different user)")

    def test_rate_order_requires_auth(self):
        """POST /api/customer/orders/{order_id}/rate requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/customer/orders/{RATED_ORDER_ID}/rate",
            json={"stars": 5, "comment": "Test"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Rating endpoint requires authentication")


class TestSalesDashboardRatingKPI:
    """Test sales dashboard rating KPI and leaderboard"""

    def test_sales_dashboard_returns_rating_data(self, staff_token):
        """GET /api/staff/sales-dashboard returns avg_rating, total_ratings, recent_ratings"""
        response = requests.get(
            f"{BASE_URL}/api/staff/sales-dashboard",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True, "Response should have ok=True"
        
        # Verify rating fields exist
        assert "avg_rating" in data, "avg_rating field missing"
        assert "total_ratings" in data, "total_ratings field missing"
        assert "recent_ratings" in data, "recent_ratings field missing"
        
        # Verify types
        assert isinstance(data["avg_rating"], (int, float)), "avg_rating should be numeric"
        assert isinstance(data["total_ratings"], int), "total_ratings should be int"
        assert isinstance(data["recent_ratings"], list), "recent_ratings should be list"
        
        print(f"✓ Rating KPIs: avg_rating={data['avg_rating']}, total_ratings={data['total_ratings']}, recent_ratings count={len(data['recent_ratings'])}")
        
        # Verify recent_ratings structure if any exist
        if data["recent_ratings"]:
            rating = data["recent_ratings"][0]
            assert "order_number" in rating, "recent_rating should have order_number"
            assert "customer_name" in rating, "recent_rating should have customer_name"
            assert "stars" in rating, "recent_rating should have stars"
            print(f"✓ Recent rating structure verified: order={rating.get('order_number')}, stars={rating.get('stars')}")

    def test_sales_dashboard_returns_leaderboard(self, staff_token):
        """GET /api/staff/sales-dashboard returns leaderboard data"""
        response = requests.get(
            f"{BASE_URL}/api/staff/sales-dashboard",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "leaderboard" in data, "leaderboard field missing"
        assert isinstance(data["leaderboard"], list), "leaderboard should be list"
        
        print(f"✓ Leaderboard returned with {len(data['leaderboard'])} entries")
        
        # Verify leaderboard structure if any entries exist
        if data["leaderboard"]:
            entry = data["leaderboard"][0]
            required_fields = ["rank", "name", "deals", "revenue", "commission", "avg_rating"]
            for field in required_fields:
                assert field in entry, f"Leaderboard entry missing {field}"
            
            print(f"✓ Leaderboard entry structure: rank={entry['rank']}, name={entry['name']}, deals={entry['deals']}, revenue={entry['revenue']}, commission={entry['commission']}, avg_rating={entry['avg_rating']}")

    def test_leaderboard_sorted_by_deals_descending(self, staff_token):
        """Leaderboard is sorted by deals closed descending"""
        response = requests.get(
            f"{BASE_URL}/api/staff/sales-dashboard",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        assert response.status_code == 200
        
        leaderboard = response.json().get("leaderboard", [])
        
        if len(leaderboard) >= 2:
            # Verify descending order by deals
            for i in range(len(leaderboard) - 1):
                current_deals = leaderboard[i]["deals"]
                next_deals = leaderboard[i + 1]["deals"]
                assert current_deals >= next_deals, f"Leaderboard not sorted: {current_deals} < {next_deals}"
            print("✓ Leaderboard is sorted by deals descending")
        else:
            print("✓ Leaderboard has fewer than 2 entries, sorting check skipped")

    def test_leaderboard_has_correct_ranks(self, staff_token):
        """Leaderboard entries have sequential ranks starting from 1"""
        response = requests.get(
            f"{BASE_URL}/api/staff/sales-dashboard",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        assert response.status_code == 200
        
        leaderboard = response.json().get("leaderboard", [])
        
        for i, entry in enumerate(leaderboard):
            expected_rank = i + 1
            assert entry["rank"] == expected_rank, f"Expected rank {expected_rank}, got {entry['rank']}"
        
        print(f"✓ Leaderboard ranks are sequential (1 to {len(leaderboard)})")


class TestCustomerOrdersEndpoint:
    """Test customer orders endpoint for rating display"""

    def test_get_customer_orders(self, customer_token):
        """GET /api/customer/orders returns orders list"""
        response = requests.get(
            f"{BASE_URL}/api/customer/orders",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        orders = response.json()
        assert isinstance(orders, list), "Response should be a list"
        print(f"✓ Customer orders endpoint returned {len(orders)} orders")
        
        # Check if any orders have ratings
        rated_orders = [o for o in orders if o.get("rating")]
        print(f"✓ {len(rated_orders)} orders have ratings")


class TestAuthEndpoints:
    """Verify auth endpoints work for all user types"""

    def test_admin_login(self):
        """Admin can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.status_code}"
        assert "token" in response.json(), "Token missing from response"
        print("✓ Admin login successful")

    def test_staff_login(self):
        """Staff can login via login endpoint"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": STAFF_EMAIL,
            "password": STAFF_PASSWORD
        })
        assert response.status_code == 200, f"Staff login failed: {response.status_code}"
        assert "token" in response.json(), "Token missing from response"
        print("✓ Staff login successful")

    def test_customer_login(self):
        """Customer can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200, f"Customer login failed: {response.status_code}"
        assert "token" in response.json(), "Token missing from response"
        print("✓ Customer login successful")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
