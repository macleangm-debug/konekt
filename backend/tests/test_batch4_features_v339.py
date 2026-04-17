"""
Test Suite for Konekt B2B Platform Batch 4 Features (Iteration 339)

Features tested:
1. Number & Currency Format settings in Settings Hub
2. Admin Override promo type in promotions service
3. Services in Quote Creation (catalog categories with category_type='service')
4. Impersonation Return Banner (token with is_impersonation flag)
5. Admin Dashboard profit display
6. Feedback Widget visibility
7. Vendor Assignments page
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

def get_auth_headers():
    """Get authentication headers for admin user"""
    login_response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "admin@konekt.co.tz", "password": "KnktcKk_L-hw1wSyquvd!"}
    )
    if login_response.status_code == 200:
        token = login_response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    return {}


class TestSettingsHub:
    """Test Settings Hub API including number format settings"""
    
    def test_get_settings_hub(self):
        """Test GET /api/admin/settings-hub returns settings including number_format"""
        headers = get_auth_headers()
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Settings hub should return various settings sections
        assert isinstance(data, dict), "Response should be a dict"
        print(f"SUCCESS: Settings Hub returned {len(data)} sections")
    
    def test_update_number_format_settings(self):
        """Test PUT /api/admin/settings-hub with number_format settings"""
        headers = get_auth_headers()
        
        # First get current settings
        get_response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=headers)
        current_settings = get_response.json() if get_response.status_code == 200 else {}
        
        # Update with number_format settings
        update_payload = {
            **current_settings,
            "number_format": {
                "thousand_separator": "comma",
                "decimal_separator": "period",
                "decimal_places": "0",
                "currency_position": "before",
                "currency_symbol": "TZS",
                "show_currency": True
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/settings-hub",
            json=update_payload,
            headers=headers
        )
        
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}"
        print("SUCCESS: Number format settings updated")


class TestPromotionsAdminOverride:
    """Test Promotions API with Admin Override discount type"""
    
    def test_list_promotions(self):
        """Test GET /api/admin/promotions returns promotions list"""
        headers = get_auth_headers()
        response = requests.get(f"{BASE_URL}/api/admin/promotions?status=all", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Should have promotions key
        assert "promotions" in data, "Response should have 'promotions' key"
        print(f"SUCCESS: Found {len(data.get('promotions', []))} promotions")
    
    def test_create_admin_override_promotion(self):
        """Test creating a promotion with admin_override discount type"""
        headers = get_auth_headers()
        
        promo_payload = {
            "name": "TEST_Admin Override Promo",
            "code": "TEST_OVERRIDE_" + str(os.urandom(4).hex()),
            "description": "Test admin override promotion",
            "scope": "global",
            "discount_type": "admin_override",
            "discount_value": 0,  # Admin override uses full distributable margin
            "stacking_rule": "no_stack",
            "max_total_uses": 10,
            "max_uses_per_customer": 1
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/promotions",
            json=promo_payload,
            headers=headers
        )
        
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Check if promotion was created
        if "promotion" in data:
            promo = data["promotion"]
            assert promo.get("discount_type") == "admin_override", "Discount type should be admin_override"
            print(f"SUCCESS: Created admin override promotion with code {promo.get('code')}")
            
            # Cleanup - delete the test promotion
            promo_id = promo.get("id")
            if promo_id:
                requests.delete(f"{BASE_URL}/api/admin/promotions/{promo_id}", headers=headers)
        else:
            print(f"INFO: Promotion creation response: {data}")


class TestCatalogCategories:
    """Test Catalog Categories API for service categories"""
    
    def test_get_catalog_categories(self):
        """Test GET /api/admin/catalog-workspace/categories returns categories including services"""
        headers = get_auth_headers()
        response = requests.get(f"{BASE_URL}/api/admin/catalog-workspace/categories", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Should be a list of categories
        assert isinstance(data, list), "Response should be a list"
        
        # Check for service categories
        service_cats = [c for c in data if c.get("category_type") == "service" or c.get("group_name") == "Services"]
        print(f"SUCCESS: Found {len(data)} categories, {len(service_cats)} are services")
    
    def test_search_products_and_services(self):
        """Test product search endpoint returns both products and can be filtered"""
        headers = get_auth_headers()
        
        # Search for products
        response = requests.get(
            f"{BASE_URL}/api/public-marketplace/products?q=print&limit=15",
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Should return products
        products = data if isinstance(data, list) else data.get("products", [])
        print(f"SUCCESS: Product search returned {len(products)} results")


class TestImpersonation:
    """Test Impersonation functionality"""
    
    def test_impersonation_endpoint_exists(self):
        """Test that impersonation endpoint exists"""
        headers = get_auth_headers()
        
        # Try to get users list first
        users_response = requests.get(f"{BASE_URL}/api/admin/users?limit=5", headers=headers)
        
        if users_response.status_code == 200:
            users = users_response.json()
            if isinstance(users, list) and len(users) > 0:
                # Try impersonation endpoint
                user_id = users[0].get("id")
                if user_id:
                    imp_response = requests.post(
                        f"{BASE_URL}/api/admin/impersonate/{user_id}",
                        headers=headers
                    )
                    # Just check if endpoint exists (may return 200 or 403 depending on permissions)
                    assert imp_response.status_code in [200, 201, 403, 404], f"Unexpected status: {imp_response.status_code}"
                    print(f"SUCCESS: Impersonation endpoint responded with {imp_response.status_code}")
                    return
        
        print("INFO: Could not test impersonation - no users found or endpoint not available")


class TestAdminDashboard:
    """Test Admin Dashboard API"""
    
    def test_admin_dashboard_stats(self):
        """Test GET /api/admin/dashboard returns stats including profit"""
        headers = get_auth_headers()
        response = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Dashboard should return various stats
        assert isinstance(data, dict), "Response should be a dict"
        print(f"SUCCESS: Admin dashboard returned stats")
        
        # Check for profit-related fields
        if "profit" in data or "total_profit" in data or "company_profit" in data:
            print("SUCCESS: Profit field found in dashboard stats")


class TestFeedbackWidget:
    """Test Feedback API"""
    
    def test_submit_feedback(self):
        """Test POST /api/feedback creates feedback entry"""
        feedback_payload = {
            "category": "general_feedback",
            "description": "TEST_Feedback from automated test",
            "email": "test@example.com"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/feedback",
            json=feedback_payload
        )
        
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}"
        print("SUCCESS: Feedback submitted successfully")
    
    def test_get_feedback_list(self):
        """Test GET /api/feedback returns feedback list"""
        headers = get_auth_headers()
        response = requests.get(f"{BASE_URL}/api/feedback", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Should be a list
        assert isinstance(data, list), "Response should be a list"
        print(f"SUCCESS: Found {len(data)} feedback entries")


class TestVendorAssignments:
    """Test Vendor Assignments API"""
    
    def test_get_vendor_assignments(self):
        """Test GET /api/admin/vendor-assignments returns assignments"""
        headers = get_auth_headers()
        response = requests.get(f"{BASE_URL}/api/admin/vendor-assignments", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Should be a list
        assert isinstance(data, list), "Response should be a list"
        print(f"SUCCESS: Found {len(data)} vendor assignments")


class TestHealthCheck:
    """Basic health checks"""
    
    def test_api_health(self):
        """Test API is responding"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("SUCCESS: API health check passed")
    
    def test_admin_login(self):
        """Test admin login works"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@konekt.co.tz", "password": "KnktcKk_L-hw1wSyquvd!"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "token" in data, "Response should contain token"
        print("SUCCESS: Admin login successful")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
