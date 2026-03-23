"""
Commercial Operations Closeout Pack Backend Tests
Tests for: Business Pricing Admin, Numbering Rules, Client Profiles, 
Welcome Rewards, Runtime Settings, QA Seed APIs
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://konekt-go-live.preview.emergentagent.com').rstrip('/')

# Admin and customer credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
CUSTOMER_EMAIL = "demo.customer@konekt.com"
CUSTOMER_PASSWORD = "Demo123!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Admin authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def customer_token():
    """Get customer auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": CUSTOMER_EMAIL,
        "password": CUSTOMER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Customer authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Get headers with admin token"""
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def customer_headers(customer_token):
    """Get headers with customer token"""
    return {"Authorization": f"Bearer {customer_token}", "Content-Type": "application/json"}


# ===== Runtime Settings API Tests =====
class TestRuntimeSettingsAPI:
    """Test Runtime Settings API - /api/runtime-settings"""
    
    def test_get_runtime_settings(self):
        """Test GET /api/runtime-settings - returns integration status"""
        response = requests.get(f"{BASE_URL}/api/runtime-settings")
        assert response.status_code == 200
        
        data = response.json()
        # Verify expected keys exist
        assert "resend_configured" in data
        assert "kwikpay_configured" in data
        assert "stripe_configured" in data
        assert "mongo_configured" in data
        
        # mongo_configured should be True since MONGO_URL is set
        assert data["mongo_configured"] == True
        print(f"Runtime settings: {data}")


# ===== Welcome Rewards API Tests =====
class TestWelcomeRewardsAPI:
    """Test Welcome Rewards API - /api/welcome-rewards"""
    
    def test_capture_welcome_reward_new_email(self):
        """Test POST /api/welcome-rewards/capture - new user gets 1000 points"""
        test_email = f"test_welcome_{uuid.uuid4().hex[:8]}@example.com"
        
        response = requests.post(f"{BASE_URL}/api/welcome-rewards/capture", json={
            "email": test_email
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["ok"] == True
        assert data["is_new_user"] == True
        assert data["reward_type"] == "welcome_points"
        assert data["points_amount"] == 1000
        print(f"Welcome reward captured for new user: {data}")
    
    def test_capture_welcome_reward_empty_email(self):
        """Test POST /api/welcome-rewards/capture - missing email returns error"""
        response = requests.post(f"{BASE_URL}/api/welcome-rewards/capture", json={
            "email": ""
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["ok"] == False
        assert data["reason"] == "missing_email"
    
    def test_check_welcome_reward_eligibility(self):
        """Test GET /api/welcome-rewards/check/{email} - new email is eligible"""
        test_email = f"test_check_{uuid.uuid4().hex[:8]}@example.com"
        
        response = requests.get(f"{BASE_URL}/api/welcome-rewards/check/{test_email}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["eligible"] == True
        assert data["reward_type"] == "welcome_points"
        assert data["points_amount"] == 1000


# ===== Client Profile API Tests =====
class TestClientProfileAPI:
    """Test Client Profile API - /api/client-profiles"""
    
    def test_get_my_client_profile_authenticated(self, customer_headers):
        """Test GET /api/client-profiles/me - authenticated user"""
        response = requests.get(f"{BASE_URL}/api/client-profiles/me", headers=customer_headers)
        assert response.status_code == 200
        # May return null if no profile exists yet
        print(f"Client profile response: {response.json()}")
    
    def test_get_my_client_profile_unauthenticated(self):
        """Test GET /api/client-profiles/me - requires auth"""
        response = requests.get(f"{BASE_URL}/api/client-profiles/me")
        assert response.status_code == 401
    
    def test_create_update_client_profile(self, customer_headers):
        """Test POST /api/client-profiles/me - create/update profile"""
        profile_data = {
            "company_name": "TEST_Company_CloseoutPack",
            "buying_as": "company",
            "order_frequency": "monthly",
            "main_interest": "both",
            "monthly_budget_range": "2m_5m",
            "categories_of_interest": ["promotional", "office_supplies"],
            "preferred_contact_method": "email",
            "urgent_need": "Need supplies for upcoming event",
            "multi_location": True,
            "needs_contract_pricing": True,
            "needs_recurring_support": False
        }
        
        response = requests.post(f"{BASE_URL}/api/client-profiles/me", 
                                headers=customer_headers, 
                                json=profile_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["company_name"] == "TEST_Company_CloseoutPack"
        assert data["buying_as"] == "company"
        assert data["order_frequency"] == "monthly"
        assert data["multi_location"] == True
        print(f"Client profile created/updated: {data}")
        
        # Verify persistence with GET
        get_response = requests.get(f"{BASE_URL}/api/client-profiles/me", headers=customer_headers)
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["company_name"] == "TEST_Company_CloseoutPack"


# ===== Business Pricing Admin API Tests =====
class TestBusinessPricingAdminAPI:
    """Test Business Pricing Admin API - /api/admin/business-pricing-requests"""
    
    def test_list_business_pricing_requests(self, admin_headers):
        """Test GET /api/admin/business-pricing-requests - list all"""
        response = requests.get(f"{BASE_URL}/api/admin/business-pricing-requests", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Business pricing requests count: {len(data)}")
    
    def test_list_business_pricing_requests_with_filter(self, admin_headers):
        """Test GET /api/admin/business-pricing-requests?status=pending"""
        response = requests.get(f"{BASE_URL}/api/admin/business-pricing-requests?status=pending", 
                               headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        # All results should have pending status
        for req in data:
            assert req.get("status") == "pending"
    
    def test_get_request_stats(self, admin_headers):
        """Test GET /api/admin/business-pricing-requests/stats/summary"""
        response = requests.get(f"{BASE_URL}/api/admin/business-pricing-requests/stats/summary", 
                               headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "total" in data
        assert "pending" in data
        assert "contacted" in data
        assert "qualified" in data
        assert "converted" in data
        assert "declined" in data
        print(f"Business pricing stats: {data}")
    
    def test_business_pricing_requests_requires_auth(self):
        """Test that endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/business-pricing-requests")
        assert response.status_code == 401


# ===== Numbering Rules API Tests =====
class TestNumberingRulesAPI:
    """Test Numbering Rules API - /api/admin/numbering-rules"""
    
    def test_list_numbering_rules(self, admin_headers):
        """Test GET /api/admin/numbering-rules - list configured rules"""
        response = requests.get(f"{BASE_URL}/api/admin/numbering-rules", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Numbering rules count: {len(data)}")
    
    def test_create_numbering_rule(self, admin_headers):
        """Test POST /api/admin/numbering-rules - create/update rule"""
        rule_data = {
            "entity_type": "test_entity",
            "entity_code": "TST",
            "format_string": "[CompanyCode]-[EntityCode]-[YY]-[SEQ]",
            "allow_manual_input": False,
            "auto_generate": True,
            "alnum_length": 6,
            "is_active": True
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/numbering-rules", 
                                headers=admin_headers, 
                                json=rule_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["entity_type"] == "test_entity"
        assert data["entity_code"] == "TST"
        assert data["auto_generate"] == True
        print(f"Numbering rule created: {data}")
    
    def test_preview_numbering_rule(self, admin_headers):
        """Test POST /api/admin/numbering-rules/preview - generate preview"""
        preview_data = {
            "entity_type": "order",
            "company_code": "KON",
            "country_code": "TZ"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/numbering-rules/preview", 
                                headers=admin_headers, 
                                json=preview_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "preview" in data
        print(f"Numbering preview: {data['preview']}")
    
    def test_numbering_rules_requires_admin(self):
        """Test that endpoints require admin auth"""
        response = requests.get(f"{BASE_URL}/api/admin/numbering-rules")
        assert response.status_code == 401


# ===== QA Seed API Tests =====
class TestQASeedAPI:
    """Test QA Seed API - /api/admin/qa-seed"""
    
    def test_qa_seed_status(self, admin_headers):
        """Test GET /api/admin/qa-seed/status - check seed status"""
        response = requests.get(f"{BASE_URL}/api/admin/qa-seed/status", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "numbering_rules_configured" in data
        assert "points_rules_configured" in data
        assert "products_count" in data
        assert "services_count" in data
        assert "ready_for_qa" in data
        print(f"QA seed status: {data}")
    
    def test_full_launch_seed(self, admin_headers):
        """Test POST /api/admin/qa-seed/full-launch-seed - initialize seed data"""
        response = requests.post(f"{BASE_URL}/api/admin/qa-seed/full-launch-seed", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["ok"] == True
        assert "seeded_at" in data
        print(f"Full launch seed: {data}")
    
    def test_qa_seed_requires_admin(self):
        """Test that endpoints require admin auth"""
        response = requests.get(f"{BASE_URL}/api/admin/qa-seed/status")
        assert response.status_code == 401


# ===== Test that stats endpoint uses correct path =====
class TestRouteOrderFix:
    """Verify that /stats/summary doesn't conflict with /{request_id} route"""
    
    def test_stats_summary_before_request_id(self, admin_headers):
        """Ensure stats/summary route works (must be defined before /{request_id} in code)"""
        # This tests that the route order is correct
        response = requests.get(f"{BASE_URL}/api/admin/business-pricing-requests/stats/summary", 
                               headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        # Should return stats object, not a 404 trying to find request with id="stats"
        assert "total" in data
