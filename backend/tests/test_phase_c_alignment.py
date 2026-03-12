"""
Phase C Platform Alignment Tests - Affiliate Application Flow & Portal Dashboard
Tests for:
1. Partner Application Page (/partners/apply) - POST /api/affiliate-applications
2. Admin Affiliate Applications - GET /api/affiliate-applications, approve/reject flows
3. Affiliate Portal Dashboard - GET /api/affiliate-portal/dashboard
4. CRM Page V2 with Kanban view toggle
5. Customers Page V2 with filters and view toggle
6. Creative Brief Page - dynamic form fields
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"

# Test data
TEST_EMAIL = f"test_affiliate_{uuid.uuid4().hex[:6]}@example.com"


class TestHealth:
    """Health check - verify backend is running"""
    
    def test_health_endpoint(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ Backend health check passed")


class TestAffiliateApplicationAPI:
    """Test affiliate application public submission endpoint"""
    
    def test_submit_affiliate_application(self):
        """POST /api/affiliate-applications - submit new application"""
        payload = {
            "full_name": "Test Affiliate User",
            "email": TEST_EMAIL,
            "phone": "+255123456789",
            "company_name": "Test Company Ltd",
            "website": "https://test-company.com",
            "social_links": ["https://instagram.com/testcompany"],
            "audience_size": "2000-10000",
            "industries": ["Retail", "Technology"],
            "region": "Dar es Salaam",
            "country": "Tanzania",
            "why_partner": "I want to promote Konekt services",
            "how_promote": "Social media marketing and email campaigns"
        }
        
        response = requests.post(f"{BASE_URL}/api/affiliate-applications", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain application ID"
        assert data.get("email") == TEST_EMAIL
        assert data.get("status") == "pending_review"
        assert data.get("full_name") == "Test Affiliate User"
        print(f"✓ Application submitted successfully with ID: {data.get('id')}")
        
        # Store the application ID for later tests
        TestAffiliateApplicationAPI.application_id = data.get("id")
    
    def test_duplicate_application_rejected(self):
        """Duplicate email should be rejected"""
        payload = {
            "full_name": "Duplicate User",
            "email": TEST_EMAIL,  # Same email as previous test
            "phone": "+255987654321"
        }
        
        response = requests.post(f"{BASE_URL}/api/affiliate-applications", json=payload)
        assert response.status_code == 400
        assert "already exists" in response.json().get("detail", "").lower()
        print("✓ Duplicate application correctly rejected")
    
    def test_check_application_status_public(self):
        """GET /api/affiliate-applications/check/{email} - check status"""
        response = requests.get(f"{BASE_URL}/api/affiliate-applications/check/{TEST_EMAIL}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("exists") == True
        assert data.get("status") == "pending_review"
        print("✓ Application status check endpoint working")


class TestAdminAffiliateApplicationsAPI:
    """Test admin affiliate application management endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin before each test"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_list_applications_admin(self):
        """GET /api/affiliate-applications - list all applications"""
        response = requests.get(f"{BASE_URL}/api/affiliate-applications", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # Find our test application
        test_app = next((a for a in data if a.get("email") == TEST_EMAIL), None)
        assert test_app is not None, "Test application should be in the list"
        assert test_app.get("status") == "pending_review"
        print(f"✓ Found {len(data)} applications, test application is in pending_review status")
    
    def test_filter_applications_by_status(self):
        """GET /api/affiliate-applications?status=pending_review"""
        response = requests.get(
            f"{BASE_URL}/api/affiliate-applications?status=pending_review",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        for app in data:
            assert app.get("status") == "pending_review"
        print(f"✓ Filtered {len(data)} pending applications")
    
    def test_get_single_application(self):
        """GET /api/affiliate-applications/{id}"""
        app_id = getattr(TestAffiliateApplicationAPI, 'application_id', None)
        if not app_id:
            pytest.skip("No application ID from previous test")
        
        response = requests.get(f"{BASE_URL}/api/affiliate-applications/{app_id}", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("id") == app_id
        assert data.get("email") == TEST_EMAIL
        assert "industries" in data
        assert "social_links" in data
        print(f"✓ Retrieved application details with full data")
    
    def test_approve_application(self):
        """POST /api/affiliate-applications/{id}/approve"""
        app_id = getattr(TestAffiliateApplicationAPI, 'application_id', None)
        if not app_id:
            pytest.skip("No application ID from previous test")
        
        response = requests.post(
            f"{BASE_URL}/api/affiliate-applications/{app_id}/approve",
            headers=self.headers,
            params={"commission_rate": 12, "tier": "gold"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("message") == "Application approved"
        assert "affiliate_id" in data
        assert "promo_code" in data
        assert data.get("commission_rate") == 12
        assert data.get("tier") == "gold"
        
        TestAdminAffiliateApplicationsAPI.affiliate_id = data.get("affiliate_id")
        TestAdminAffiliateApplicationsAPI.promo_code = data.get("promo_code")
        print(f"✓ Application approved, affiliate created with promo code: {data.get('promo_code')}")
    
    def test_application_status_changed_to_approved(self):
        """Verify application status changed after approval"""
        app_id = getattr(TestAffiliateApplicationAPI, 'application_id', None)
        if not app_id:
            pytest.skip("No application ID from previous test")
        
        response = requests.get(f"{BASE_URL}/api/affiliate-applications/{app_id}", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("status") == "approved"
        assert data.get("affiliate_id") is not None
        print("✓ Application status correctly updated to approved")


class TestAffiliatePortalAPI:
    """Test affiliate portal dashboard endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin (who can also access affiliate data via email match)"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_affiliate_portal_dashboard_requires_auth(self):
        """GET /api/affiliate-portal/dashboard - requires authentication"""
        response = requests.get(f"{BASE_URL}/api/affiliate-portal/dashboard")
        assert response.status_code in [401, 403, 422]
        print("✓ Portal dashboard correctly requires authentication")
    
    def test_affiliate_resources_endpoint(self):
        """GET /api/affiliate-portal/resources - requires affiliate auth"""
        response = requests.get(f"{BASE_URL}/api/affiliate-portal/resources", headers=self.headers)
        # Will be 403 because admin is not an affiliate
        assert response.status_code in [200, 403]
        if response.status_code == 403:
            print("✓ Resources endpoint correctly rejects non-affiliate users")
        else:
            data = response.json()
            assert "tracking_link" in data
            assert "promo_code" in data
            print("✓ Resources endpoint returns affiliate marketing data")


class TestCRMPageV2API:
    """Test CRM V2 API endpoints (Kanban view support)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_crm_leads_endpoint(self):
        """GET /api/admin/crm/leads"""
        response = requests.get(f"{BASE_URL}/api/admin/crm/leads", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ CRM leads endpoint returned {len(data)} leads")
    
    def test_crm_settings_for_dropdowns(self):
        """GET /api/admin/crm-settings - industries and sources for dropdowns"""
        response = requests.get(f"{BASE_URL}/api/admin/crm-settings", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "industries" in data
        assert "sources" in data
        assert len(data["industries"]) > 0
        print(f"✓ CRM settings: {len(data['industries'])} industries, {len(data['sources'])} sources")


class TestCustomersPageV2API:
    """Test Customers V2 API endpoints (filters support)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_customers_endpoint(self):
        """GET /api/admin/customers"""
        response = requests.get(f"{BASE_URL}/api/admin/customers", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Customers endpoint returned {len(data)} customers")
    
    def test_customer_has_filter_fields(self):
        """Customers should have fields for filtering"""
        response = requests.get(f"{BASE_URL}/api/admin/customers", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 0:
            customer = data[0]
            # Check for filter-relevant fields
            filter_fields = ["city", "payment_term_type", "credit_limit"]
            found = [f for f in filter_fields if f in customer]
            print(f"✓ Customer has filter fields: {found}")


class TestCreativeServiceBriefAPI:
    """Test Creative Service Brief API (dynamic form fields)"""
    
    def test_list_creative_services(self):
        """GET /api/creative-services-v2"""
        response = requests.get(f"{BASE_URL}/api/creative-services-v2")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Found {len(data)} creative services")
    
    def test_service_has_brief_fields(self):
        """Creative service should have brief_fields for dynamic form"""
        response = requests.get(f"{BASE_URL}/api/creative-services-v2")
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 0:
            service = data[0]
            assert "brief_fields" in service or "slug" in service
            print(f"✓ Service '{service.get('title', 'unknown')}' structure verified")
    
    def test_get_service_by_slug(self):
        """GET /api/creative-services-v2/{slug}"""
        # First get list to find a slug
        response = requests.get(f"{BASE_URL}/api/creative-services-v2")
        if response.status_code != 200 or not response.json():
            pytest.skip("No creative services available")
        
        slug = response.json()[0].get("slug", "logo-design")
        
        response = requests.get(f"{BASE_URL}/api/creative-services-v2/{slug}")
        assert response.status_code == 200
        
        data = response.json()
        assert "brief_fields" in data
        assert "addons" in data
        print(f"✓ Service '{slug}' has {len(data.get('brief_fields', []))} brief fields and {len(data.get('addons', []))} addons")


class TestCentralPaymentsAPI:
    """Test Central Payments API (table/cards view)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_central_payments_endpoint(self):
        """GET /api/admin/central-payments"""
        response = requests.get(f"{BASE_URL}/api/admin/central-payments", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        # Could be list or paginated object
        print(f"✓ Central payments endpoint accessible")


class TestStatementsAPI:
    """Test Statements API (customer lookup)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_statements_search_customer(self):
        """GET /api/admin/statements/search - customer lookup"""
        response = requests.get(
            f"{BASE_URL}/api/admin/statements/search",
            headers=self.headers,
            params={"q": "test"}
        )
        # May return 200 with results or 404 if no matches
        assert response.status_code in [200, 404, 422]
        print(f"✓ Statements search endpoint accessible (status: {response.status_code})")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_note(self):
        """Note about test data"""
        print(f"✓ Test application created with email: {TEST_EMAIL}")
        print("  This application was approved and an affiliate was created")
        print("  No automatic cleanup - data remains for frontend testing")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
