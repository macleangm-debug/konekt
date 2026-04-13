"""
Group Deal Campaign System Tests — Iteration 290
Tests for GroupDealCampaign + GroupDealCommitment entities with create, join, finalize, cancel endpoints.
Public endpoints hide internal pricing fields (vendor_cost, margin).
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


@pytest.fixture(scope="module")
def auth_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    pytest.skip(f"Authentication failed: {response.status_code}")


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Authenticated requests session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


@pytest.fixture(scope="module")
def public_client():
    """Public requests session (no auth)"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestGroupDealCampaignCreation:
    """Test campaign creation with margin calculation and safety checks"""
    
    def test_create_campaign_success(self, api_client):
        """POST /api/admin/group-deals/campaigns creates a campaign with margin calculation"""
        payload = {
            "product_name": "TEST_Group Deal Laptop",
            "description": "Test group deal for laptops",
            "vendor_cost": 800000,
            "original_price": 1200000,
            "discounted_price": 1000000,
            "display_target": 50,
            "vendor_threshold": 30,
            "duration_days": 14
        }
        response = api_client.post(f"{BASE_URL}/api/admin/group-deals/campaigns", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify campaign created with correct fields
        assert data.get("product_name") == "TEST_Group Deal Laptop"
        assert data.get("vendor_cost") == 800000
        assert data.get("discounted_price") == 1000000
        assert data.get("display_target") == 50
        assert data.get("vendor_threshold") == 30
        assert data.get("status") == "active"
        
        # Verify margin calculation
        expected_margin = 1000000 - 800000  # 200000
        expected_margin_pct = round((expected_margin / 1000000) * 100, 1)  # 20%
        assert data.get("margin_per_unit") == expected_margin
        assert data.get("margin_pct") == expected_margin_pct
        
        # Verify campaign_id generated
        assert "campaign_id" in data
        assert "id" in data
        
        # Store for cleanup
        TestGroupDealCampaignCreation.created_campaign_id = data.get("id")
        print(f"Created campaign: {data.get('id')} with margin {data.get('margin_pct')}%")
    
    def test_create_campaign_margin_below_threshold_returns_400(self, api_client):
        """POST /api/admin/group-deals/campaigns with margin below threshold returns 400 error"""
        payload = {
            "product_name": "TEST_Low Margin Product",
            "vendor_cost": 950000,  # Very high vendor cost
            "discounted_price": 1000000,  # Only 5% margin (at threshold)
            "display_target": 50,
            "duration_days": 14
        }
        # This should be at exactly 5% margin, let's try below
        payload_below = {
            "product_name": "TEST_Below Margin Product",
            "vendor_cost": 960000,  # 4% margin - below 5% threshold
            "discounted_price": 1000000,
            "display_target": 50,
            "duration_days": 14
        }
        response = api_client.post(f"{BASE_URL}/api/admin/group-deals/campaigns", json=payload_below)
        
        assert response.status_code == 400, f"Expected 400 for low margin, got {response.status_code}"
        data = response.json()
        assert "margin" in data.get("detail", "").lower() or "threshold" in data.get("detail", "").lower()
        print(f"Correctly rejected low margin campaign: {data.get('detail')}")
    
    def test_create_campaign_price_below_cost_returns_400(self, api_client):
        """POST /api/admin/group-deals/campaigns with price below vendor cost returns 400"""
        payload = {
            "product_name": "TEST_Negative Margin Product",
            "vendor_cost": 1100000,
            "discounted_price": 1000000,  # Below vendor cost
            "display_target": 50,
            "duration_days": 14
        }
        response = api_client.post(f"{BASE_URL}/api/admin/group-deals/campaigns", json=payload)
        
        assert response.status_code == 400, f"Expected 400 for negative margin, got {response.status_code}"
        data = response.json()
        assert "below" in data.get("detail", "").lower() or "cost" in data.get("detail", "").lower()
        print(f"Correctly rejected negative margin: {data.get('detail')}")
    
    def test_create_campaign_missing_required_fields(self, api_client):
        """POST /api/admin/group-deals/campaigns with missing fields returns 400"""
        payload = {
            "product_name": "TEST_Incomplete Product"
            # Missing vendor_cost, discounted_price, display_target, duration_days
        }
        response = api_client.post(f"{BASE_URL}/api/admin/group-deals/campaigns", json=payload)
        
        assert response.status_code == 400, f"Expected 400 for missing fields, got {response.status_code}"
        print(f"Correctly rejected incomplete payload")


class TestGroupDealCampaignList:
    """Test campaign listing"""
    
    def test_list_campaigns(self, api_client):
        """GET /api/admin/group-deals/campaigns returns campaign list"""
        response = api_client.get(f"{BASE_URL}/api/admin/group-deals/campaigns")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} campaigns")
        
        # Verify campaign structure
        if len(data) > 0:
            campaign = data[0]
            assert "id" in campaign
            assert "product_name" in campaign
            assert "status" in campaign
            assert "current_committed" in campaign
    
    def test_list_campaigns_filter_by_status(self, api_client):
        """GET /api/admin/group-deals/campaigns?status=active filters correctly"""
        response = api_client.get(f"{BASE_URL}/api/admin/group-deals/campaigns?status=active")
        
        assert response.status_code == 200
        data = response.json()
        
        # All returned campaigns should be active
        for campaign in data:
            assert campaign.get("status") == "active", f"Expected active, got {campaign.get('status')}"
        print(f"Found {len(data)} active campaigns")


class TestGroupDealJoin:
    """Test joining a campaign (commitment creation)"""
    
    @pytest.fixture(autouse=True)
    def setup_campaign(self, api_client):
        """Create a test campaign for join tests"""
        payload = {
            "product_name": "TEST_Join Test Product",
            "vendor_cost": 500000,
            "discounted_price": 700000,
            "display_target": 10,
            "vendor_threshold": 5,
            "duration_days": 7
        }
        response = api_client.post(f"{BASE_URL}/api/admin/group-deals/campaigns", json=payload)
        if response.status_code == 200:
            self.campaign_id = response.json().get("id")
            self.campaign_price = 700000
        else:
            pytest.skip("Could not create test campaign")
    
    def test_join_campaign_creates_commitment(self, api_client):
        """POST /api/admin/group-deals/campaigns/{id}/join creates commitment and increments count"""
        payload = {
            "customer_name": "TEST_John Doe",
            "customer_phone": "+255712345678",
            "payment_method": "mobile_money"
        }
        response = api_client.post(f"{BASE_URL}/api/admin/group-deals/campaigns/{self.campaign_id}/join", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify commitment response
        assert data.get("status") == "committed"
        assert data.get("amount") == self.campaign_price
        assert data.get("current_committed") >= 1
        print(f"Joined campaign, current committed: {data.get('current_committed')}")
    
    def test_join_campaign_requires_name_or_phone(self, api_client):
        """POST /api/admin/group-deals/campaigns/{id}/join requires customer info"""
        payload = {
            "payment_method": "cash"
            # Missing customer_name and customer_phone
        }
        response = api_client.post(f"{BASE_URL}/api/admin/group-deals/campaigns/{self.campaign_id}/join", json=payload)
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("Correctly rejected join without customer info")


class TestGroupDealFinalize:
    """Test campaign finalization (order creation)"""
    
    @pytest.fixture(autouse=True)
    def setup_successful_campaign(self, api_client):
        """Create a campaign that reaches threshold"""
        # Create campaign with low threshold
        payload = {
            "product_name": "TEST_Finalize Test Product",
            "vendor_cost": 100000,
            "discounted_price": 150000,
            "display_target": 3,
            "vendor_threshold": 2,
            "duration_days": 7
        }
        response = api_client.post(f"{BASE_URL}/api/admin/group-deals/campaigns", json=payload)
        if response.status_code != 200:
            pytest.skip("Could not create test campaign")
        
        self.campaign_id = response.json().get("id")
        
        # Add commitments to reach threshold
        for i in range(2):
            join_payload = {
                "customer_name": f"TEST_Customer {i+1}",
                "customer_phone": f"+25571234567{i}",
                "payment_method": "cash"
            }
            api_client.post(f"{BASE_URL}/api/admin/group-deals/campaigns/{self.campaign_id}/join", json=join_payload)
    
    def test_finalize_campaign_creates_orders(self, api_client):
        """POST /api/admin/group-deals/campaigns/{id}/finalize creates orders for all committed buyers"""
        response = api_client.post(f"{BASE_URL}/api/admin/group-deals/campaigns/{self.campaign_id}/finalize")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify finalization response
        assert data.get("status") == "finalized"
        assert data.get("orders_created") >= 2
        print(f"Finalized campaign, created {data.get('orders_created')} orders")
        
        # Verify campaign status changed
        get_response = api_client.get(f"{BASE_URL}/api/admin/group-deals/campaigns/{self.campaign_id}")
        if get_response.status_code == 200:
            campaign = get_response.json()
            assert campaign.get("status") == "finalized"


class TestGroupDealCancel:
    """Test campaign cancellation"""
    
    @pytest.fixture(autouse=True)
    def setup_active_campaign(self, api_client):
        """Create an active campaign with commitments"""
        payload = {
            "product_name": "TEST_Cancel Test Product",
            "vendor_cost": 200000,
            "discounted_price": 300000,
            "display_target": 20,
            "vendor_threshold": 10,
            "duration_days": 7
        }
        response = api_client.post(f"{BASE_URL}/api/admin/group-deals/campaigns", json=payload)
        if response.status_code != 200:
            pytest.skip("Could not create test campaign")
        
        self.campaign_id = response.json().get("id")
        
        # Add a commitment
        join_payload = {
            "customer_name": "TEST_Cancel Customer",
            "customer_phone": "+255712345699",
            "payment_method": "cash"
        }
        api_client.post(f"{BASE_URL}/api/admin/group-deals/campaigns/{self.campaign_id}/join", json=join_payload)
    
    def test_cancel_campaign_marks_failed_and_refund(self, api_client):
        """POST /api/admin/group-deals/campaigns/{id}/cancel marks campaign failed and commitments for refund"""
        response = api_client.post(f"{BASE_URL}/api/admin/group-deals/campaigns/{self.campaign_id}/cancel")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify cancellation response
        assert data.get("status") == "failed"
        assert "refund_pending" in data
        print(f"Cancelled campaign, {data.get('refund_pending')} refunds pending")
        
        # Verify campaign status changed
        get_response = api_client.get(f"{BASE_URL}/api/admin/group-deals/campaigns/{self.campaign_id}")
        if get_response.status_code == 200:
            campaign = get_response.json()
            assert campaign.get("status") == "failed"


class TestPublicGroupDealEndpoints:
    """Test public endpoints hide internal pricing fields"""
    
    def test_public_list_deals_hides_internal_fields(self, public_client):
        """GET /api/public/group-deals returns active campaigns WITHOUT internal pricing fields"""
        response = public_client.get(f"{BASE_URL}/api/public/group-deals")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Public API returned {len(data)} deals")
        
        # Verify internal fields are hidden
        for deal in data:
            assert "vendor_cost" not in deal, "vendor_cost should be hidden from public"
            assert "margin_per_unit" not in deal, "margin_per_unit should be hidden from public"
            assert "margin_pct" not in deal, "margin_pct should be hidden from public"
            assert "vendor_threshold" not in deal, "vendor_threshold should be hidden from public"
            assert "commission_mode" not in deal, "commission_mode should be hidden from public"
            assert "affiliate_share_pct" not in deal, "affiliate_share_pct should be hidden from public"
            assert "created_by" not in deal, "created_by should be hidden from public"
            
            # Verify public fields are present
            assert "product_name" in deal
            assert "discounted_price" in deal
            assert "display_target" in deal
            assert "current_committed" in deal
        
        print("Public list correctly hides internal pricing fields")
    
    def test_public_get_deal_detail_hides_internal_fields(self, public_client, api_client):
        """GET /api/public/group-deals/{id} returns deal detail without internal fields"""
        # First get a campaign ID from admin endpoint
        admin_response = api_client.get(f"{BASE_URL}/api/admin/group-deals/campaigns")
        if admin_response.status_code != 200 or len(admin_response.json()) == 0:
            pytest.skip("No campaigns available for testing")
        
        campaign_id = admin_response.json()[0].get("id")
        
        # Get public detail
        response = public_client.get(f"{BASE_URL}/api/public/group-deals/{campaign_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        deal = response.json()
        
        # Verify internal fields are hidden
        assert "vendor_cost" not in deal, "vendor_cost should be hidden from public"
        assert "margin_per_unit" not in deal, "margin_per_unit should be hidden from public"
        assert "margin_pct" not in deal, "margin_pct should be hidden from public"
        assert "vendor_threshold" not in deal, "vendor_threshold should be hidden from public"
        
        # Verify public fields are present
        assert "product_name" in deal
        assert "discounted_price" in deal
        assert "display_target" in deal
        assert "current_committed" in deal
        assert "deadline" in deal
        
        print(f"Public detail for {deal.get('product_name')} correctly hides internal fields")


class TestKnownCampaign:
    """Test with known campaign from context: 69dc7e32fec3b55b31c5765e (HP ProBook)"""
    
    def test_get_known_campaign(self, api_client):
        """GET /api/admin/group-deals/campaigns/{id} returns known HP ProBook campaign"""
        campaign_id = "69dc7e32fec3b55b31c5765e"
        response = api_client.get(f"{BASE_URL}/api/admin/group-deals/campaigns/{campaign_id}")
        
        # Campaign may or may not exist depending on DB state
        if response.status_code == 200:
            data = response.json()
            print(f"Found campaign: {data.get('product_name')}, status: {data.get('status')}, committed: {data.get('current_committed')}")
            assert "id" in data
            assert "product_name" in data
        elif response.status_code == 404:
            print("Known campaign not found (may have been cleaned up)")
        else:
            print(f"Unexpected status: {response.status_code}")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_campaigns(self, api_client):
        """Cancel all TEST_ prefixed campaigns"""
        response = api_client.get(f"{BASE_URL}/api/admin/group-deals/campaigns")
        if response.status_code == 200:
            campaigns = response.json()
            cleaned = 0
            for c in campaigns:
                if c.get("product_name", "").startswith("TEST_"):
                    if c.get("status") not in ("finalized", "failed"):
                        cancel_resp = api_client.post(f"{BASE_URL}/api/admin/group-deals/campaigns/{c.get('id')}/cancel")
                        if cancel_resp.status_code == 200:
                            cleaned += 1
            print(f"Cleaned up {cleaned} test campaigns")
