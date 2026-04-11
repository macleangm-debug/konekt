"""
Test Suite for Konekt B2B Platform - Critical Stabilization Pass (v270)

Tests:
1. Team Performance API - /api/admin/team-performance/summary
2. Promotions wiring - products should show has_promotion=false (all promotions inactive)
3. Content Engine template data APIs
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
    response = requests.post(
        f"{BASE_URL}/api/admin/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed")


@pytest.fixture
def auth_headers(admin_token):
    """Headers with admin auth token"""
    return {"Authorization": f"Bearer {admin_token}"}


class TestTeamPerformanceAPI:
    """Tests for the new team performance summary endpoint"""

    def test_team_performance_summary_returns_200(self, auth_headers):
        """Test that team performance summary endpoint returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/admin/team-performance/summary",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("SUCCESS: Team performance summary returns 200")

    def test_team_performance_summary_has_kpis(self, auth_headers):
        """Test that response contains KPIs object with required fields"""
        response = requests.get(
            f"{BASE_URL}/api/admin/team-performance/summary",
            headers=auth_headers
        )
        data = response.json()
        
        assert "kpis" in data, "Response missing 'kpis' field"
        kpis = data["kpis"]
        
        # Check for 6 required KPI fields
        required_kpis = [
            "total_revenue", "deals_closed", "active_leads",
            "conversion_rate", "avg_rating", "overdue_followups"
        ]
        for kpi in required_kpis:
            assert kpi in kpis, f"KPIs missing '{kpi}' field"
        
        print(f"SUCCESS: KPIs found - {kpis}")

    def test_team_performance_summary_has_reps(self, auth_headers):
        """Test that response contains reps array with ranked data"""
        response = requests.get(
            f"{BASE_URL}/api/admin/team-performance/summary",
            headers=auth_headers
        )
        data = response.json()
        
        assert "reps" in data, "Response missing 'reps' field"
        reps = data["reps"]
        assert isinstance(reps, list), "'reps' should be a list"
        
        if len(reps) > 0:
            rep = reps[0]
            # Check for required rep fields
            required_fields = [
                "id", "name", "email", "active_leads", "quotes_sent",
                "deals_won", "revenue", "conversion_rate", "avg_rating",
                "overdue_followups", "score", "label", "rank"
            ]
            for field in required_fields:
                assert field in rep, f"Rep missing '{field}' field"
            
            # Verify ranking is correct (first rep should be rank 1)
            assert rep["rank"] == 1, f"First rep should have rank 1, got {rep['rank']}"
            
            # Verify label is one of expected values
            valid_labels = ["Top Performer", "Strong", "Improving", "Needs Attention"]
            assert rep["label"] in valid_labels, f"Invalid label: {rep['label']}"
        
        print(f"SUCCESS: Reps found - {len(reps)} team members")

    def test_team_performance_summary_has_alerts(self, auth_headers):
        """Test that response contains alerts array"""
        response = requests.get(
            f"{BASE_URL}/api/admin/team-performance/summary",
            headers=auth_headers
        )
        data = response.json()
        
        assert "alerts" in data, "Response missing 'alerts' field"
        alerts = data["alerts"]
        assert isinstance(alerts, list), "'alerts' should be a list"
        
        if len(alerts) > 0:
            alert = alerts[0]
            # Check for required alert fields
            required_fields = ["type", "severity", "message"]
            for field in required_fields:
                assert field in alert, f"Alert missing '{field}' field"
            
            # Verify severity is valid
            valid_severities = ["critical", "warning", "info"]
            assert alert["severity"] in valid_severities, f"Invalid severity: {alert['severity']}"
        
        print(f"SUCCESS: Alerts found - {len(alerts)} alerts")


class TestPromotionsWiring:
    """Tests for promotions wiring fix - products should show has_promotion=false"""

    def test_products_have_no_active_promotions(self):
        """Test that all products show has_promotion=false (all promotions inactive)"""
        response = requests.get(f"{BASE_URL}/api/content-engine/template-data/products")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        items = data.get("items", [])
        
        # All products should have has_promotion=false since all promotions are inactive
        for item in items:
            assert item.get("has_promotion") == False, \
                f"Product '{item.get('name')}' should have has_promotion=false"
        
        print(f"SUCCESS: All {len(items)} products have has_promotion=false")


class TestContentEngineAPIs:
    """Tests for content engine template data APIs"""

    def test_products_endpoint(self):
        """Test products template data endpoint"""
        response = requests.get(f"{BASE_URL}/api/content-engine/template-data/products")
        assert response.status_code == 200
        
        data = response.json()
        assert "items" in data
        assert isinstance(data["items"], list)
        
        if len(data["items"]) > 0:
            item = data["items"][0]
            required_fields = ["id", "name", "category", "type"]
            for field in required_fields:
                assert field in item, f"Product missing '{field}' field"
        
        print(f"SUCCESS: Products endpoint returns {len(data['items'])} items")

    def test_services_endpoint(self):
        """Test services template data endpoint"""
        response = requests.get(f"{BASE_URL}/api/content-engine/template-data/services")
        assert response.status_code == 200
        
        data = response.json()
        assert "items" in data
        assert isinstance(data["items"], list)
        
        print(f"SUCCESS: Services endpoint returns {len(data['items'])} items")

    def test_branding_endpoint(self):
        """Test branding template data endpoint"""
        response = requests.get(f"{BASE_URL}/api/content-engine/template-data/branding")
        assert response.status_code == 200
        
        data = response.json()
        assert "branding" in data
        
        branding = data["branding"]
        # Check for expected branding fields
        expected_fields = ["company_name", "trading_name", "tagline"]
        for field in expected_fields:
            assert field in branding, f"Branding missing '{field}' field"
        
        print(f"SUCCESS: Branding endpoint returns data - {branding.get('company_name', 'N/A')}")


class TestAdminAuth:
    """Tests for admin authentication"""

    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "token" in data, "Response missing 'token'"
        assert "user" in data, "Response missing 'user'"
        assert data["user"]["role"] == "admin", "User should have admin role"
        
        print("SUCCESS: Admin login successful")

    def test_admin_login_invalid_credentials(self):
        """Test admin login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": "wrong@email.com", "password": "wrongpassword"}
        )
        assert response.status_code in [401, 400], f"Expected 401/400, got {response.status_code}"
        print("SUCCESS: Invalid credentials rejected")


class TestAffiliatesAPI:
    """Tests for affiliates API"""

    def test_get_affiliates(self, auth_headers):
        """Test getting affiliates list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/affiliates",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # API returns list directly or {"affiliates": [...]}
        if isinstance(data, list):
            affiliates = data
        else:
            affiliates = data.get("affiliates", [])
        
        assert isinstance(affiliates, list), "Affiliates should be a list"
        
        print(f"SUCCESS: Affiliates endpoint returns {len(affiliates)} affiliates")


class TestCRMAPI:
    """Tests for CRM API"""

    def test_get_leads(self, auth_headers):
        """Test getting CRM leads"""
        response = requests.get(
            f"{BASE_URL}/api/admin/crm/leads",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list of leads"
        
        print(f"SUCCESS: CRM leads endpoint returns {len(data)} leads")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
