"""
Test Campaign Performance API Endpoints
Tests the new campaign performance metrics endpoint for admin dashboard
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.status_code}")
    return response.json().get("token")


@pytest.fixture(scope="module")
def admin_client(admin_token):
    """Session with admin auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_token}"
    })
    return session


class TestCampaignPerformanceAPI:
    """Test /api/admin/campaign-performance/summary endpoint"""

    def test_campaign_performance_summary_returns_200(self, admin_client):
        """Test that the campaign performance endpoint returns 200"""
        response = admin_client.get(f"{BASE_URL}/api/admin/campaign-performance/summary")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
    def test_campaign_performance_summary_structure(self, admin_client):
        """Test that the response has correct structure"""
        response = admin_client.get(f"{BASE_URL}/api/admin/campaign-performance/summary")
        assert response.status_code == 200
        
        data = response.json()
        
        # Check top-level keys
        assert "campaigns" in data, "Missing 'campaigns' key in response"
        assert "totals" in data, "Missing 'totals' key in response"
        
        # Check totals structure
        totals = data["totals"]
        assert "clicks" in totals, "Missing 'clicks' in totals"
        assert "redemptions" in totals, "Missing 'redemptions' in totals"
        assert "revenue" in totals, "Missing 'revenue' in totals"
        assert "commissions" in totals, "Missing 'commissions' in totals"
        assert "conversion_rate" in totals, "Missing 'conversion_rate' in totals"
        
    def test_campaign_performance_totals_are_numeric(self, admin_client):
        """Test that totals values are numeric"""
        response = admin_client.get(f"{BASE_URL}/api/admin/campaign-performance/summary")
        assert response.status_code == 200
        
        data = response.json()
        totals = data["totals"]
        
        # Verify numeric types
        assert isinstance(totals["clicks"], (int, float)), "clicks should be numeric"
        assert isinstance(totals["redemptions"], (int, float)), "redemptions should be numeric"
        assert isinstance(totals["revenue"], (int, float)), "revenue should be numeric"
        assert isinstance(totals["commissions"], (int, float)), "commissions should be numeric"
        assert isinstance(totals["conversion_rate"], (int, float)), "conversion_rate should be numeric"
        
    def test_campaign_performance_campaigns_is_list(self, admin_client):
        """Test that campaigns is a list"""
        response = admin_client.get(f"{BASE_URL}/api/admin/campaign-performance/summary")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data["campaigns"], list), "campaigns should be a list"


class TestCheckoutAttributionEndpoints:
    """Test checkout attribution endpoints from previous iteration"""
    
    def test_checkout_active_promotions(self):
        """Test /api/checkout/active-promotions returns 200"""
        response = requests.get(f"{BASE_URL}/api/checkout/active-promotions")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "promotions" in data, "Missing 'promotions' key"
        assert isinstance(data["promotions"], list), "promotions should be a list"
        
    def test_checkout_detect_attribution(self):
        """Test /api/checkout/detect-attribution returns 200"""
        response = requests.get(f"{BASE_URL}/api/checkout/detect-attribution")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "has_attribution" in data, "Missing 'has_attribution' key"
        assert isinstance(data["has_attribution"], bool), "has_attribution should be boolean"

    def test_checkout_evaluate_campaigns(self):
        """Test /api/checkout/evaluate-campaigns returns 200"""
        response = requests.post(
            f"{BASE_URL}/api/checkout/evaluate-campaigns",
            json={"order_amount": 50000, "affiliate_code": None}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "campaigns" in data, "Missing 'campaigns' key"


class TestAdminAffiliateCampaigns:
    """Test admin affiliate campaigns endpoints"""
    
    def test_get_affiliate_campaigns(self, admin_client):
        """Test GET /api/admin/affiliate-campaigns"""
        response = admin_client.get(f"{BASE_URL}/api/admin/affiliate-campaigns")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list of campaigns"
        
    def test_get_affiliate_settings(self, admin_client):
        """Test GET /api/admin/affiliate-settings"""
        response = admin_client.get(f"{BASE_URL}/api/admin/affiliate-settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
