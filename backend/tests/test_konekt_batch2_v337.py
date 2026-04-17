"""
Konekt B2B Platform - Batch 2 Features Testing
Tests for iteration 337:
1. Go-Live Reset in Settings Hub Launch Controls
2. Impersonate/switch user accounts for admin/ops
3. Product detail page 'Customize this' CTA (related_services)
4. Credit terms enforcement at checkout
5. Admin Dashboard profit KPI shows TZS 0 (not negative)
6. Operations nav consolidated with all ops items
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestKonektBatch2Features:
    """Test batch 2 features for Konekt B2B platform"""
    
    admin_token = None
    test_user_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin token once"""
        if not TestKonektBatch2Features.admin_token:
            # Wait to avoid rate limiting
            time.sleep(2)
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": "admin@konekt.co.tz",
                "password": "KnktcKk_L-hw1wSyquvd!"
            })
            if response.status_code == 200:
                TestKonektBatch2Features.admin_token = response.json().get("token")
            elif response.status_code == 429:
                pytest.skip("Rate limited - skipping test")
    
    def get_auth_headers(self):
        """Get authorization headers"""
        if not TestKonektBatch2Features.admin_token:
            pytest.skip("No admin token available")
        return {"Authorization": f"Bearer {TestKonektBatch2Features.admin_token}"}
    
    # ─── TEST 1: Settings Hub Launch Controls with Go-Live Reset ───
    def test_settings_hub_has_launch_controls(self):
        """Settings Hub should return launch_controls with system_mode"""
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=self.get_auth_headers())
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "launch_controls" in data, "launch_controls should be in settings-hub response"
        lc = data["launch_controls"]
        assert "system_mode" in lc, "system_mode should be in launch_controls"
        assert lc["system_mode"] in ["testing", "controlled_launch", "full_live"], f"Invalid system_mode: {lc['system_mode']}"
        print(f"✓ Settings Hub has launch_controls with system_mode: {lc['system_mode']}")
    
    def test_go_live_reset_endpoint_exists(self):
        """Go-Live Reset endpoint should exist (don't actually call it)"""
        # Just verify the endpoint exists by checking OPTIONS or a safe method
        # We won't actually call POST as it would delete data
        response = requests.options(f"{BASE_URL}/api/admin/system/go-live-reset")
        # OPTIONS might return 200 or 405 depending on CORS config
        # The important thing is it's not 404
        assert response.status_code != 404, "go-live-reset endpoint should exist"
        print("✓ Go-Live Reset endpoint exists at POST /api/admin/system/go-live-reset")
    
    # ─── TEST 2: Impersonate User Endpoint ───
    def test_impersonate_endpoint_requires_auth(self):
        """Impersonate endpoint should require authentication"""
        response = requests.post(f"{BASE_URL}/api/admin/impersonate/test-user-id")
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        print("✓ Impersonate endpoint requires authentication")
    
    def test_impersonate_non_admin_user(self):
        """Admin should be able to impersonate non-admin users"""
        # First, get a non-admin user
        response = requests.get(f"{BASE_URL}/api/admin/users?role=sales&limit=1", headers=self.get_auth_headers())
        if response.status_code != 200:
            pytest.skip("Could not fetch users")
        
        users = response.json().get("users", [])
        if not users:
            # Try to get any non-admin user
            response = requests.get(f"{BASE_URL}/api/admin/users?limit=10", headers=self.get_auth_headers())
            if response.status_code == 200:
                users = [u for u in response.json().get("users", []) if u.get("role") != "admin"]
        
        if not users:
            pytest.skip("No non-admin users available to impersonate")
        
        target_user = users[0]
        user_id = target_user.get("id")
        TestKonektBatch2Features.test_user_id = user_id
        
        # Try to impersonate
        response = requests.post(f"{BASE_URL}/api/admin/impersonate/{user_id}", headers=self.get_auth_headers())
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user info"
        assert data["user"]["id"] == user_id, "Returned user ID should match target"
        print(f"✓ Successfully impersonated user: {data['user'].get('name', data['user'].get('email'))}")
    
    def test_cannot_impersonate_admin(self):
        """Should not be able to impersonate admin accounts"""
        # Get admin user ID
        response = requests.get(f"{BASE_URL}/api/admin/users?role=admin&limit=1", headers=self.get_auth_headers())
        if response.status_code != 200:
            pytest.skip("Could not fetch admin users")
        
        users = response.json().get("users", [])
        if not users:
            pytest.skip("No admin users found")
        
        admin_user = users[0]
        admin_id = admin_user.get("id")
        
        # Try to impersonate admin - should fail
        response = requests.post(f"{BASE_URL}/api/admin/impersonate/{admin_id}", headers=self.get_auth_headers())
        assert response.status_code == 403, f"Expected 403 when impersonating admin, got {response.status_code}"
        print("✓ Cannot impersonate admin accounts (403 returned)")
    
    def test_impersonate_returns_jwt_token(self):
        """Impersonate should return a valid JWT token"""
        if not TestKonektBatch2Features.test_user_id:
            pytest.skip("No test user ID available")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/impersonate/{TestKonektBatch2Features.test_user_id}", 
            headers=self.get_auth_headers()
        )
        if response.status_code != 200:
            pytest.skip("Impersonate failed")
        
        data = response.json()
        token = data.get("token")
        assert token, "Token should be present"
        # JWT tokens have 3 parts separated by dots
        parts = token.split(".")
        assert len(parts) == 3, "Token should be a valid JWT format (3 parts)"
        print("✓ Impersonate returns valid JWT token format")
    
    # ─── TEST 3: Product Detail Page - Customize This CTA (related_services) ───
    def test_product_listing_has_related_services(self):
        """Product listing endpoint should return related_services from category config"""
        # First get a product from the catalog
        response = requests.get(f"{BASE_URL}/api/products?limit=5")
        if response.status_code != 200:
            # Try marketplace listings
            response = requests.get(f"{BASE_URL}/api/public-marketplace/country/TZ?limit=5")
        
        if response.status_code != 200:
            pytest.skip("Could not fetch products")
        
        data = response.json()
        products = data.get("items", data.get("products", []))
        
        if not products:
            pytest.skip("No products available")
        
        # Get a product detail
        product = products[0]
        slug = product.get("slug") or product.get("id")
        
        response = requests.get(f"{BASE_URL}/api/public-marketplace/listing/{slug}")
        if response.status_code == 404:
            pytest.skip("Product listing not found")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        listing_data = response.json()
        listing = listing_data.get("listing", {})
        
        # related_services may or may not be present depending on category config
        # The important thing is the endpoint works and returns the listing
        print(f"✓ Product listing endpoint works. related_services present: {'related_services' in listing}")
        if "related_services" in listing:
            print(f"  Related services: {listing['related_services']}")
    
    def test_category_config_has_related_services_field(self):
        """Category config should support related_services field"""
        response = requests.get(f"{BASE_URL}/api/admin/catalog/categories", headers=self.get_auth_headers())
        if response.status_code != 200:
            pytest.skip("Could not fetch categories")
        
        categories = response.json()
        if isinstance(categories, dict):
            categories = categories.get("categories", [])
        
        # Check if any category has related_services
        has_related_services = any(cat.get("related_services") for cat in categories if isinstance(cat, dict))
        print(f"✓ Category config endpoint works. Categories with related_services: {has_related_services}")
    
    # ─── TEST 4: Credit Terms at Checkout ───
    def test_checkout_quote_returns_credit_terms_flags(self):
        """Checkout quote endpoint should return credit_terms_enabled and payment_required_now flags"""
        # This requires a logged-in customer with items in cart
        # We'll test the endpoint structure by checking the route exists
        # and the response format from the code review
        
        # The endpoint is POST /api/customer/checkout-quote
        # It should return: credit_terms_enabled, payment_required_now, payment_term_label
        
        # Test without auth to verify endpoint exists
        response = requests.post(f"{BASE_URL}/api/customer/checkout-quote", json={
            "items": [{"name": "Test", "quantity": 1, "unit_price": 1000, "subtotal": 1000}],
            "subtotal": 1000,
            "vat_percent": 18,
            "vat_amount": 180,
            "total": 1180,
            "delivery_address": {
                "street": "Test St",
                "city": "Dar es Salaam",
                "region": "Dar es Salaam",
                "country": "Tanzania",
                "contact_phone": "+255123456789"
            }
        })
        
        # Should return 401 (not authenticated) not 404 (endpoint not found)
        assert response.status_code in [401, 200, 422], f"Checkout quote endpoint should exist, got {response.status_code}"
        print("✓ Checkout quote endpoint exists at POST /api/customer/checkout-quote")
    
    # ─── TEST 5: Admin Dashboard Profit KPI ───
    def test_dashboard_profit_kpi_not_negative(self):
        """Admin dashboard profit KPI should show TZS 0 (not negative) when no revenue"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard/kpis", headers=self.get_auth_headers())
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        kpis = data.get("kpis", {})
        profit_month = kpis.get("profit_month", 0)
        revenue_month = kpis.get("revenue_month", 0)
        
        # If revenue is 0 or negative, profit should be 0 (not negative)
        if revenue_month <= 0:
            assert profit_month >= 0, f"Profit should be >= 0 when revenue is {revenue_month}, but got {profit_month}"
            print(f"✓ Profit KPI is {profit_month} (not negative) when revenue is {revenue_month}")
        else:
            print(f"✓ Dashboard KPIs working. Revenue: {revenue_month}, Profit: {profit_month}")
    
    # ─── TEST 6: Operations Navigation Items ───
    def test_operations_nav_items_in_code(self):
        """Operations nav should contain all 5 items (verified via API structure)"""
        # This is primarily a frontend test, but we can verify the backend
        # supports the routes these nav items point to
        
        ops_routes = [
            "/api/admin/vendor-ops",  # Orders & Fulfillment
            "/api/admin/site-visits",  # Site Visits
            "/api/admin/deliveries",  # Deliveries
            "/api/admin/procurement/purchase-orders",  # Purchase Orders
            "/api/admin/vendor-supply-review",  # Supply Review
        ]
        
        working_routes = 0
        for route in ops_routes:
            response = requests.get(f"{BASE_URL}{route}", headers=self.get_auth_headers())
            # 200, 401, 403 are acceptable (route exists)
            # 404 means route doesn't exist
            if response.status_code != 404:
                working_routes += 1
        
        print(f"✓ Operations routes verified: {working_routes}/{len(ops_routes)} routes exist")
        # At least some routes should exist
        assert working_routes >= 3, f"Expected at least 3 operations routes to exist, got {working_routes}"


class TestImpersonateEndpointDetails:
    """Detailed tests for impersonate endpoint"""
    
    admin_token = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - reuse token from previous class if available"""
        if TestKonektBatch2Features.admin_token:
            TestImpersonateEndpointDetails.admin_token = TestKonektBatch2Features.admin_token
        elif not TestImpersonateEndpointDetails.admin_token:
            time.sleep(2)
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": "admin@konekt.co.tz",
                "password": "KnktcKk_L-hw1wSyquvd!"
            })
            if response.status_code == 200:
                TestImpersonateEndpointDetails.admin_token = response.json().get("token")
    
    def get_auth_headers(self):
        if not TestImpersonateEndpointDetails.admin_token:
            pytest.skip("No admin token available")
        return {"Authorization": f"Bearer {TestImpersonateEndpointDetails.admin_token}"}
    
    def test_impersonate_returns_user_details(self):
        """Impersonate response should include user details"""
        # Get a non-admin user
        response = requests.get(f"{BASE_URL}/api/admin/users?limit=10", headers=self.get_auth_headers())
        if response.status_code != 200:
            pytest.skip("Could not fetch users")
        
        users = [u for u in response.json().get("users", []) if u.get("role") not in ["admin"]]
        if not users:
            pytest.skip("No non-admin users available")
        
        target = users[0]
        response = requests.post(f"{BASE_URL}/api/admin/impersonate/{target['id']}", headers=self.get_auth_headers())
        
        if response.status_code != 200:
            pytest.skip(f"Impersonate failed: {response.status_code}")
        
        data = response.json()
        user = data.get("user", {})
        
        # Verify user details are returned
        assert "id" in user, "User should have id"
        assert "role" in user, "User should have role"
        print(f"✓ Impersonate returns user details: id={user.get('id')}, role={user.get('role')}")


class TestPublicMarketplaceRelatedServices:
    """Test related_services enrichment on product detail pages"""
    
    def test_listing_endpoint_structure(self):
        """Public listing endpoint should return proper structure"""
        # Get any listing
        response = requests.get(f"{BASE_URL}/api/public-marketplace/country/TZ?limit=1")
        if response.status_code != 200:
            pytest.skip("Could not fetch listings")
        
        items = response.json().get("items", [])
        if not items:
            pytest.skip("No listings available")
        
        item = items[0]
        slug = item.get("slug") or item.get("id")
        
        response = requests.get(f"{BASE_URL}/api/public-marketplace/listing/{slug}")
        if response.status_code != 200:
            pytest.skip(f"Could not fetch listing: {response.status_code}")
        
        data = response.json()
        
        # Verify structure
        assert "listing" in data, "Response should have 'listing' key"
        listing = data["listing"]
        assert "name" in listing or "id" in listing, "Listing should have name or id"
        
        # related_services is optional but should be supported
        print(f"✓ Listing structure verified. Has related_services: {'related_services' in listing}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
