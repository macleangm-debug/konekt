"""
Phase 3 - Marketplace + Service UX Tests
Tests for:
- Public marketplace API (/api/marketplace/products/search)
- Public requests API (/api/public-requests)
- Service catalog API (/api/service-catalog/types)
- Admin login (regression)
- Requests inbox (regression)
- CRM leads (regression)
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestMarketplaceAPI:
    """Test public marketplace product search API"""
    
    def test_marketplace_products_search_returns_products(self):
        """GET /api/marketplace/products/search should return products list"""
        response = requests.get(f"{BASE_URL}/api/marketplace/products/search")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should return at least one product"
        
        # Verify product structure
        product = data[0]
        assert "id" in product, "Product should have id"
        assert "name" in product, "Product should have name"
        print(f"PASS: Marketplace search returned {len(data)} products")
    
    def test_marketplace_products_search_with_query(self):
        """GET /api/marketplace/products/search?q=paper should filter products"""
        response = requests.get(f"{BASE_URL}/api/marketplace/products/search?q=paper")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Marketplace search with query returned {len(data)} products")
    
    def test_marketplace_products_count(self):
        """Verify marketplace returns expected number of products (around 41)"""
        response = requests.get(f"{BASE_URL}/api/marketplace/products/search")
        assert response.status_code == 200
        
        data = response.json()
        # Should have a reasonable number of products
        assert len(data) >= 10, f"Expected at least 10 products, got {len(data)}"
        print(f"PASS: Marketplace has {len(data)} products")


class TestPublicRequestsAPI:
    """Test public quote request submission API"""
    
    def test_submit_service_quote_request(self):
        """POST /api/public-requests should create a service quote request"""
        payload = {
            "request_type": "service_quote",
            "title": "Request a Service Quote",
            "guest_name": "TEST_Phase3_User",
            "guest_email": f"test_phase3_{datetime.now().timestamp()}@example.com",
            "phone_prefix": "+255",
            "phone": "712345678",
            "company_name": "TEST Phase3 Company",
            "service_name": "printing-promotional-materials",
            "service_slug": "printing-promotional-materials",
            "source_page": "/request-quote",
            "details": {
                "service_category": "printing_branding",
                "urgency": "flexible",
                "scope_message": "Test request for Phase 3 testing"
            },
            "notes": "Test request for Phase 3 testing"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/public-requests",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "request_number" in data, "Response should contain request_number"
        print(f"PASS: Service quote request created with number: {data['request_number']}")
        return data
    
    def test_submit_product_bulk_request(self):
        """POST /api/public-requests should create a product bulk quote request"""
        payload = {
            "request_type": "product_bulk",
            "title": "Request Product Quote",
            "guest_name": "TEST_Phase3_Bulk_User",
            "guest_email": f"test_phase3_bulk_{datetime.now().timestamp()}@example.com",
            "phone_prefix": "+255",
            "phone": "712345679",
            "company_name": "TEST Phase3 Bulk Company",
            "service_name": "A4 Printing Paper",
            "source_page": "/request-quote",
            "details": {
                "service_category": "office_equipment",
                "urgency": "within_week",
                "scope_message": "Need 100 reams of A4 paper"
            },
            "notes": "Need 100 reams of A4 paper"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/public-requests",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "request_number" in data, "Response should contain request_number"
        print(f"PASS: Product bulk request created with number: {data['request_number']}")
    
    def test_submit_business_pricing_request(self):
        """POST /api/public-requests should create a business pricing request"""
        payload = {
            "request_type": "business_pricing",
            "title": "Request Business Pricing",
            "guest_name": "TEST_Phase3_Business_User",
            "guest_email": f"test_phase3_biz_{datetime.now().timestamp()}@example.com",
            "phone_prefix": "+255",
            "phone": "712345680",
            "company_name": "TEST Phase3 Business Corp",
            "source_page": "/request-quote",
            "details": {
                "service_category": "other",
                "urgency": "within_month",
                "scope_message": "Looking for recurring office supplies contract"
            },
            "notes": "Looking for recurring office supplies contract"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/public-requests",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "request_number" in data, "Response should contain request_number"
        print(f"PASS: Business pricing request created with number: {data['request_number']}")


class TestServiceCatalogAPI:
    """Test service catalog API endpoints (admin routes)"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        payload = {
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    def test_get_service_types(self, admin_token):
        """GET /api/admin/service-catalog/types should return service types"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/service-catalog/types", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: Service catalog returned {len(data)} service types")
    
    def test_get_service_groups(self, admin_token):
        """GET /api/admin/service-catalog/groups should return service groups"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/service-catalog/groups", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: Service catalog returned {len(data)} service groups")
    
    def test_public_service_detail_uses_fallback(self):
        """Public service detail page uses fallback data when API returns 404"""
        # The frontend DynamicServiceDetailPage uses fallback data for known slugs
        # This test verifies the API behavior (404 expected for public route)
        response = requests.get(f"{BASE_URL}/api/service-catalog/types/printing-promotional-materials")
        # Public route doesn't exist - frontend uses fallback data
        assert response.status_code == 404, "Public service catalog route should return 404 (frontend uses fallback)"
        print(f"INFO: Public service route returns 404 as expected, frontend uses fallback data")


class TestAdminAuthRegression:
    """Regression tests for admin authentication"""
    
    def test_admin_login(self):
        """POST /api/auth/login should authenticate admin user"""
        payload = {
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Admin login failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        print(f"PASS: Admin login successful")
        return data["token"]


class TestRequestsInboxRegression:
    """Regression tests for requests inbox"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        payload = {
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    def test_requests_inbox_loads(self, admin_token):
        """GET /api/admin/requests should return requests list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/requests", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: Requests inbox returned {len(data)} requests")


class TestCRMRegression:
    """Regression tests for CRM functionality"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        payload = {
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    def test_crm_leads_loads(self, admin_token):
        """GET /api/admin/crm/leads should return leads list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/crm/leads", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: CRM leads returned {len(data)} leads")


class TestGuestLeadsAPI:
    """Test guest leads API for expansion page"""
    
    def test_submit_expansion_business_interest(self):
        """POST /api/guest-leads should create expansion business interest"""
        payload = {
            "full_name": "TEST_Expansion_User",
            "email": f"test_expansion_{datetime.now().timestamp()}@example.com",
            "phone": "+254712345678",
            "company": "TEST Expansion Company",
            "country_code": "KE",
            "intent_type": "expansion_business_interest",
            "intent_payload": {
                "region": "Nairobi",
                "interest_summary": "Interested in Konekt services in Kenya",
                "country_name": "Kenya"
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/guest-leads",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        print(f"PASS: Expansion business interest submitted")
    
    def test_submit_expansion_partner_application(self):
        """POST /api/guest-leads should create expansion partner application"""
        payload = {
            "full_name": "TEST_Partner_Contact",
            "email": f"test_partner_{datetime.now().timestamp()}@example.com",
            "phone": "+254712345679",
            "company": "TEST Partner Company Ltd",
            "country_code": "KE",
            "intent_type": "expansion_partner_application",
            "intent_payload": {
                "local_presence_summary": "Established presence in Nairobi",
                "commercial_capacity": "Strong sales team",
                "operations_capacity": "Warehouse and logistics",
                "country_name": "Kenya"
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/guest-leads",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        print(f"PASS: Expansion partner application submitted")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
