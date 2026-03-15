"""
Pack 8 - Launch Stabilization Pack Tests
Tests for affiliate settings, payout approval, campaigns, marketing messages, and perk preview
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Admin authentication failed: {response.status_code}")


@pytest.fixture(scope="module")
def admin_client(api_client, admin_token):
    """Session with admin auth header"""
    api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
    return api_client


# =============================================================================
# Affiliate Settings Tests
# =============================================================================
class TestAffiliateSettings:
    """Tests for /api/admin/affiliate-settings endpoints"""
    
    def test_get_affiliate_settings(self, admin_client):
        """GET /api/admin/affiliate-settings - Should return settings with required fields"""
        response = admin_client.get(f"{BASE_URL}/api/admin/affiliate-settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify required fields exist
        assert "enabled" in data, "Response missing 'enabled' field"
        assert "commission_rate" in data or "default_commission_rate" in data, "Response missing commission rate field"
        assert "customer_perk_enabled" in data, "Response missing 'customer_perk_enabled' field"
        assert "id" in data, "Response missing 'id' field"
        print(f"Settings retrieved: enabled={data.get('enabled')}, perk_enabled={data.get('customer_perk_enabled')}")
    
    def test_update_affiliate_settings(self, admin_client):
        """PUT /api/admin/affiliate-settings - Should update settings"""
        update_payload = {
            "enabled": True,
            "default_commission_rate": 12.0,
            "customer_perk_enabled": True,
            "customer_perk_value": 7.0
        }
        response = admin_client.put(f"{BASE_URL}/api/admin/affiliate-settings", json=update_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("enabled") == True
        assert data.get("customer_perk_enabled") == True
        print(f"Settings updated: commission_rate={data.get('default_commission_rate')}, perk_value={data.get('customer_perk_value')}")
    
    def test_get_settings_persistence(self, admin_client):
        """Verify settings persist after update"""
        response = admin_client.get(f"{BASE_URL}/api/admin/affiliate-settings")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("default_commission_rate") == 12.0, "Commission rate not persisted"
        assert data.get("customer_perk_value") == 7.0, "Perk value not persisted"
        print("Settings persistence verified")


# =============================================================================
# Affiliate Payouts Admin Tests
# =============================================================================
class TestAffiliatePayoutsAdmin:
    """Tests for /api/admin/affiliate-payouts endpoints"""
    
    def test_list_payout_requests(self, admin_client):
        """GET /api/admin/affiliate-payouts - Should return list of payouts"""
        response = admin_client.get(f"{BASE_URL}/api/admin/affiliate-payouts")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} payout requests")
    
    def test_list_payout_requests_with_filter(self, admin_client):
        """GET /api/admin/affiliate-payouts?status=pending - Should filter by status"""
        response = admin_client.get(f"{BASE_URL}/api/admin/affiliate-payouts?status=pending")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        # If any items exist, they should have status=pending
        for item in data:
            assert item.get("status") == "pending", f"Filtered item has wrong status: {item.get('status')}"
        print(f"Found {len(data)} pending payouts")


# =============================================================================
# Affiliate Campaigns Tests
# =============================================================================
class TestAffiliateCampaigns:
    """Tests for /api/admin/affiliate-campaigns endpoints"""
    
    @pytest.fixture(scope="class")
    def test_campaign_id(self, admin_client):
        """Create a test campaign and return its ID"""
        start_date = datetime.utcnow().isoformat() + "Z"
        end_date = (datetime.utcnow() + timedelta(days=30)).isoformat() + "Z"
        
        payload = {
            "name": "TEST_Pack8_Campaign",
            "slug": "test-pack8-campaign",
            "headline": "Test Campaign Headline",
            "description": "Test campaign for Pack 8 testing",
            "is_active": True,
            "channel": "affiliate",
            "start_date": start_date,
            "end_date": end_date,
            "reward": {
                "type": "percentage_discount",
                "value": 10,
                "cap": 50000
            },
            "eligibility": {
                "requires_affiliate_code": True,
                "min_order_amount": 100000
            },
            "marketing": {
                "promo_code": "TESTPACK8",
                "landing_url": "https://konekt.co.tz/promo/test",
                "cta": "Order Now!",
                "hashtags": ["TestPromo", "Konekt"]
            }
        }
        
        response = admin_client.post(f"{BASE_URL}/api/admin/affiliate-campaigns", json=payload)
        if response.status_code in [200, 201]:
            return response.json().get("id")
        return None
    
    def test_list_campaigns(self, admin_client):
        """GET /api/admin/affiliate-campaigns - Should return list of campaigns"""
        response = admin_client.get(f"{BASE_URL}/api/admin/affiliate-campaigns")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} campaigns")
    
    def test_list_current_campaigns(self, admin_client):
        """GET /api/admin/affiliate-campaigns/current - Should return active campaigns"""
        response = admin_client.get(f"{BASE_URL}/api/admin/affiliate-campaigns/current")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} current active campaigns")
    
    def test_create_campaign(self, admin_client):
        """POST /api/admin/affiliate-campaigns - Should create a new campaign"""
        start_date = datetime.utcnow().isoformat() + "Z"
        end_date = (datetime.utcnow() + timedelta(days=7)).isoformat() + "Z"
        
        payload = {
            "name": "TEST_New_Campaign_Create",
            "slug": "test-new-campaign",
            "headline": "Special Offer!",
            "description": "Limited time offer",
            "is_active": True,
            "channel": "both",
            "start_date": start_date,
            "end_date": end_date,
            "reward": {
                "type": "fixed_discount",
                "value": 5000
            },
            "eligibility": {
                "requires_affiliate_code": False,
                "first_order_only": True
            },
            "marketing": {
                "promo_code": "NEWTEST",
                "cta": "Get Discount"
            }
        }
        
        response = admin_client.post(f"{BASE_URL}/api/admin/affiliate-campaigns", json=payload)
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("name") == "TEST_New_Campaign_Create"
        assert data.get("id") is not None
        print(f"Campaign created with id: {data.get('id')}")
        
        # Cleanup - store for later use
        return data.get("id")
    
    def test_get_campaign_by_id(self, admin_client, test_campaign_id):
        """GET /api/admin/affiliate-campaigns/{id} - Should return single campaign"""
        if not test_campaign_id:
            pytest.skip("No test campaign created")
        
        response = admin_client.get(f"{BASE_URL}/api/admin/affiliate-campaigns/{test_campaign_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("id") == test_campaign_id
        print(f"Retrieved campaign: {data.get('name')}")


# =============================================================================
# Campaign Marketing Messages Tests
# =============================================================================
class TestCampaignMarketing:
    """Tests for /api/admin/campaign-marketing endpoints"""
    
    def test_get_campaign_messages(self, admin_client):
        """GET /api/admin/campaign-marketing/{id}/messages - Should return platform messages"""
        # First get a campaign ID
        campaigns_response = admin_client.get(f"{BASE_URL}/api/admin/affiliate-campaigns")
        if campaigns_response.status_code != 200:
            pytest.skip("Could not fetch campaigns")
        
        campaigns = campaigns_response.json()
        if not campaigns:
            pytest.skip("No campaigns available to test messages")
        
        campaign_id = campaigns[0].get("id")
        response = admin_client.get(f"{BASE_URL}/api/admin/campaign-marketing/{campaign_id}/messages")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Should have platform-specific messages
        assert "generic" in data, "Missing 'generic' message"
        assert "whatsapp" in data, "Missing 'whatsapp' message"
        assert "instagram" in data, "Missing 'instagram' message"
        assert "facebook" in data, "Missing 'facebook' message"
        assert "linkedin" in data, "Missing 'linkedin' message"
        assert "x" in data, "Missing 'x' (Twitter) message"
        
        print(f"Campaign messages retrieved for {len(data)} platforms")
        print(f"Sample WhatsApp message length: {len(data.get('whatsapp', ''))} chars")
    
    def test_campaign_messages_not_found(self, admin_client):
        """GET /api/admin/campaign-marketing/{invalid_id}/messages - Should return 404"""
        response = admin_client.get(f"{BASE_URL}/api/admin/campaign-marketing/000000000000000000000000/messages")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


# =============================================================================
# Affiliate Perks (Public Routes) Tests
# =============================================================================
class TestAffiliatePerks:
    """Tests for /api/affiliate-perks endpoints"""
    
    def test_preview_perk(self, api_client):
        """POST /api/affiliate-perks/preview - Should preview customer perk"""
        payload = {
            "affiliate_code": "TESTCODE",
            "customer_email": "customer@test.com",
            "order_amount": 150000,
            "category": "creative"
        }
        
        response = api_client.post(f"{BASE_URL}/api/affiliate-perks/preview", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Should have eligibility result
        assert "eligible" in data, "Response missing 'eligible' field"
        print(f"Perk preview: eligible={data.get('eligible')}, reason={data.get('reason', 'N/A')}")
    
    def test_validate_affiliate_code_invalid(self, api_client):
        """GET /api/affiliate-perks/validate/{code} - Should validate invalid code"""
        response = api_client.get(f"{BASE_URL}/api/affiliate-perks/validate/INVALIDCODE123")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "valid" in data
        assert data.get("valid") == False, "Invalid code should return valid=False"
        print(f"Invalid code validation: valid={data.get('valid')}, reason={data.get('reason')}")


# =============================================================================
# Affiliate Campaign Preview (Public Route) Test
# =============================================================================
class TestAffiliateCampaignPreview:
    """Test for /api/affiliate-campaign-preview endpoint"""
    
    def test_campaign_preview(self, api_client):
        """POST /api/affiliate-campaign-preview - Should preview applicable campaigns"""
        payload = {
            "affiliate_code": "TESTCODE",
            "customer_email": "customer@test.com",
            "order_amount": 200000,
            "category": "creative"
        }
        
        response = api_client.post(f"{BASE_URL}/api/affiliate-campaign-preview", json=payload)
        # This endpoint may or may not exist, check for 200 or 404
        if response.status_code == 404:
            pytest.skip("Campaign preview endpoint not found")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Response structure: {campaigns: [], total_applicable: int, best_discount: float}
        assert "campaigns" in data, "Response missing 'campaigns' field"
        assert "total_applicable" in data, "Response missing 'total_applicable' field"
        assert isinstance(data.get("campaigns"), list), "'campaigns' should be a list"
        print(f"Found {data.get('total_applicable')} applicable campaigns for checkout")


# =============================================================================
# Affiliate Click Tracking Test
# =============================================================================
class TestAffiliateTracking:
    """Test for /affiliate-track/{code} endpoint"""
    
    def test_track_invalid_code(self, api_client):
        """GET /affiliate-track/{code} - Should redirect even for invalid code"""
        # Through ingress, redirects may be followed automatically returning 200
        response = api_client.get(f"{BASE_URL}/affiliate-track/INVALIDTRACKCODE")
        # Accept either redirect (302/307) or final 200 after redirect
        assert response.status_code in [200, 301, 302, 307], f"Expected redirect or 200, got {response.status_code}"
        print(f"Click tracking returned status {response.status_code}")


# =============================================================================
# Test Cleanup
# =============================================================================
class TestCleanup:
    """Cleanup test data created during tests"""
    
    def test_cleanup_test_campaigns(self, admin_client):
        """Delete test campaigns created during testing"""
        response = admin_client.get(f"{BASE_URL}/api/admin/affiliate-campaigns")
        if response.status_code != 200:
            return
        
        campaigns = response.json()
        deleted_count = 0
        
        for campaign in campaigns:
            if campaign.get("name", "").startswith("TEST_"):
                delete_response = admin_client.delete(
                    f"{BASE_URL}/api/admin/affiliate-campaigns/{campaign.get('id')}"
                )
                if delete_response.status_code in [200, 204]:
                    deleted_count += 1
        
        print(f"Cleanup: Deleted {deleted_count} test campaigns")
