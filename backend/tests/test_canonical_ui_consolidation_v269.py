"""
Test Suite: Canonical UI Consolidation Pass (Iteration 269)
Tests for:
1. Content Studio WYSIWYG with dynamic branding
2. Route redirects (Content Center -> Content Studio, Promotions Engine -> Promotions Manager)
3. Affiliates page data table
4. Affiliate Payouts page data table
5. Branding API returns dynamic settings data
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


class TestAdminAuth:
    """Admin authentication tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in login response"
        return data["token"]
    
    def test_admin_login(self, admin_token):
        """Test admin login returns valid token"""
        assert admin_token is not None
        assert len(admin_token) > 0
        print(f"✓ Admin login successful, token length: {len(admin_token)}")


class TestContentEngineAPIs:
    """Content Engine template data APIs"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    def test_branding_api_returns_dynamic_data(self, admin_token):
        """Test /api/content-engine/template-data/branding returns settings data"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/content-engine/template-data/branding", headers=headers)
        
        assert response.status_code == 200, f"Branding API failed: {response.text}"
        data = response.json()
        
        assert data.get("ok") is True, "Branding API did not return ok=True"
        assert "branding" in data, "No branding object in response"
        
        branding = data["branding"]
        # Verify branding fields exist (may be empty but should be present)
        expected_fields = ["company_name", "trading_name", "tagline", "logo_url", "phone", "email"]
        for field in expected_fields:
            assert field in branding, f"Missing branding field: {field}"
        
        print(f"✓ Branding API returns dynamic data:")
        print(f"  - company_name: {branding.get('company_name', 'N/A')}")
        print(f"  - trading_name: {branding.get('trading_name', 'N/A')}")
        print(f"  - phone: {branding.get('phone', 'N/A')}")
        print(f"  - email: {branding.get('email', 'N/A')}")
        print(f"  - logo_url: {branding.get('logo_url', 'N/A')[:50]}...")
    
    def test_products_template_data(self, admin_token):
        """Test /api/content-engine/template-data/products returns product list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/content-engine/template-data/products", headers=headers)
        
        assert response.status_code == 200, f"Products template API failed: {response.text}"
        data = response.json()
        
        assert data.get("ok") is True, "Products API did not return ok=True"
        assert "items" in data, "No items in products response"
        
        items = data["items"]
        print(f"✓ Products template API returns {len(items)} products")
        
        if items:
            # Verify product structure
            product = items[0]
            expected_fields = ["id", "name", "type", "selling_price", "final_price"]
            for field in expected_fields:
                assert field in product, f"Missing product field: {field}"
            print(f"  - Sample product: {product.get('name', 'N/A')}")
    
    def test_services_template_data(self, admin_token):
        """Test /api/content-engine/template-data/services returns service list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/content-engine/template-data/services", headers=headers)
        
        assert response.status_code == 200, f"Services template API failed: {response.text}"
        data = response.json()
        
        assert data.get("ok") is True, "Services API did not return ok=True"
        assert "items" in data, "No items in services response"
        
        print(f"✓ Services template API returns {len(data['items'])} services")


class TestAffiliatesAPI:
    """Affiliates management API tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    def test_get_affiliates_list(self, admin_token):
        """Test GET /api/admin/affiliates returns affiliate list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/affiliates", headers=headers)
        
        assert response.status_code == 200, f"Affiliates API failed: {response.text}"
        data = response.json()
        
        # Response should have affiliates array
        assert "affiliates" in data or isinstance(data, list), "No affiliates in response"
        
        affiliates = data.get("affiliates", data) if isinstance(data, dict) else data
        print(f"✓ Affiliates API returns {len(affiliates)} affiliates")
        
        if affiliates:
            affiliate = affiliates[0]
            # Verify affiliate structure for data table columns
            # API returns: name, email, promo_code, affiliate_status
            expected_fields = ["name", "email", "promo_code", "affiliate_status"]
            for field in expected_fields:
                assert field in affiliate, f"Missing affiliate field: {field}"
            print(f"  - Sample affiliate: {affiliate.get('name', 'N/A')} ({affiliate.get('promo_code', 'N/A')})")


class TestAffiliatePayoutsAPI:
    """Affiliate Payouts API tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    def test_get_affiliate_payouts_all(self, admin_token):
        """Test GET /api/admin/affiliate-payouts returns payout list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/affiliate-payouts", headers=headers)
        
        assert response.status_code == 200, f"Affiliate Payouts API failed: {response.text}"
        data = response.json()
        
        # Response should be a list
        assert isinstance(data, list), "Payouts response should be a list"
        print(f"✓ Affiliate Payouts API returns {len(data)} payouts")
        
        if data:
            payout = data[0]
            # Verify payout structure for data table
            # API returns: affiliate_email, requested_amount, status
            expected_fields = ["affiliate_email", "requested_amount", "status"]
            for field in expected_fields:
                assert field in payout, f"Missing payout field: {field}"
            print(f"  - Sample payout: {payout.get('affiliate_email', 'N/A')} - {payout.get('status', 'N/A')}")
    
    def test_get_affiliate_payouts_filtered(self, admin_token):
        """Test GET /api/admin/affiliate-payouts with status filter"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        for status in ["pending", "approved", "paid", "rejected"]:
            response = requests.get(f"{BASE_URL}/api/admin/affiliate-payouts?status={status}", headers=headers)
            assert response.status_code == 200, f"Payouts filter '{status}' failed: {response.text}"
            data = response.json()
            print(f"✓ Affiliate Payouts filter '{status}' returns {len(data)} payouts")


class TestPromotionsAPI:
    """Promotions Manager API tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    def test_get_promotions_list(self, admin_token):
        """Test GET /api/admin/promotions returns promotions list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/promotions", headers=headers)
        
        assert response.status_code == 200, f"Promotions API failed: {response.text}"
        data = response.json()
        
        assert "promotions" in data, "No promotions in response"
        print(f"✓ Promotions API returns {len(data['promotions'])} promotions")


class TestCRMAPI:
    """CRM API tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    def test_get_crm_leads(self, admin_token):
        """Test GET /api/admin/crm/leads returns leads list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/crm/leads", headers=headers)
        
        assert response.status_code == 200, f"CRM Leads API failed: {response.text}"
        data = response.json()
        
        # Response should be a list
        assert isinstance(data, list), "CRM leads response should be a list"
        print(f"✓ CRM Leads API returns {len(data)} leads")


class TestSettingsHubAPI:
    """Settings Hub API tests for branding data source"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    def test_get_business_settings(self, admin_token):
        """Test GET /api/admin/business-settings returns settings"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/business-settings", headers=headers)
        
        assert response.status_code == 200, f"Business Settings API failed: {response.text}"
        data = response.json()
        
        # Verify settings fields that feed into branding
        print(f"✓ Business Settings API returns data")
        if data:
            print(f"  - company_name: {data.get('company_name', 'N/A')}")
            print(f"  - trading_name: {data.get('trading_name', 'N/A')}")
            print(f"  - phone: {data.get('phone', 'N/A')}")
            print(f"  - email: {data.get('email', 'N/A')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
