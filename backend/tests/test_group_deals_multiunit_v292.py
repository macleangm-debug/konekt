"""
Group Deals Multi-Unit & Deal of the Day Testing - v292
Tests for:
- SCENARIO A: Group Deal SUCCESS (multi-unit, finalize, orders + VBO)
- SCENARIO B: Group Deal FAILURE (cancel, refunds)
- SCENARIO E: Multi-Unit (1 user 10 units + another 5 = 15 total)
- Duplicate join prevention (same phone on same campaign)
- Campaign lock after finalize (finalized campaign rejects new joins)
- Deal of the Day (set-featured, unset-featured, /deal-of-the-day endpoint)
- Customer group deals endpoint (/api/customer/group-deals?phone=X)
"""

import pytest
import requests
import os
import time
from uuid import uuid4

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@konekt.co.tz",
        "password": "KnktcKk_L-hw1wSyquvd!"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed")

@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


class TestScenarioA_GroupDealSuccess:
    """SCENARIO A: Group Deal SUCCESS — create campaign, join multiple buyers (multi-unit), hit threshold, finalize"""
    
    campaign_id = None
    
    def test_01_create_campaign(self, admin_headers):
        """Create a test campaign for success scenario"""
        payload = {
            "product_name": f"TEST_SUCCESS_PRODUCT_{uuid4().hex[:6]}",
            "description": "Test product for success scenario",
            "vendor_cost": 8000,
            "original_price": 15000,
            "discounted_price": 12000,
            "display_target": 15,
            "vendor_threshold": 10,
            "duration_days": 7
        }
        response = requests.post(f"{BASE_URL}/api/admin/group-deals/campaigns", json=payload, headers=admin_headers)
        assert response.status_code == 200, f"Failed to create campaign: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["product_name"] == payload["product_name"]
        assert data["status"] == "active"
        assert data["current_committed"] == 0
        assert data["buyer_count"] == 0
        TestScenarioA_GroupDealSuccess.campaign_id = data["id"]
        print(f"Created campaign: {data['id']}")
    
    def test_02_join_buyer1_multiunit(self, admin_headers):
        """Buyer 1 joins with 5 units"""
        campaign_id = TestScenarioA_GroupDealSuccess.campaign_id
        payload = {
            "customer_name": "Test Buyer 1",
            "customer_phone": f"+255700{uuid4().hex[:6]}",
            "quantity": 5,
            "payment_method": "cash"
        }
        response = requests.post(f"{BASE_URL}/api/admin/group-deals/campaigns/{campaign_id}/join", json=payload, headers=admin_headers)
        assert response.status_code == 200, f"Failed to join: {response.text}"
        data = response.json()
        assert data["status"] == "committed"
        assert data["quantity"] == 5
        assert data["current_committed"] == 5
        assert data["buyer_count"] == 1
        print(f"Buyer 1 joined with 5 units, total: {data['current_committed']}")
    
    def test_03_join_buyer2_multiunit(self, admin_headers):
        """Buyer 2 joins with 3 units"""
        campaign_id = TestScenarioA_GroupDealSuccess.campaign_id
        payload = {
            "customer_name": "Test Buyer 2",
            "customer_phone": f"+255701{uuid4().hex[:6]}",
            "quantity": 3,
            "payment_method": "mobile_money"
        }
        response = requests.post(f"{BASE_URL}/api/admin/group-deals/campaigns/{campaign_id}/join", json=payload, headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["current_committed"] == 8
        assert data["buyer_count"] == 2
        print(f"Buyer 2 joined with 3 units, total: {data['current_committed']}")
    
    def test_04_join_buyer3_hits_threshold(self, admin_headers):
        """Buyer 3 joins with 5 units — hits threshold (10)"""
        campaign_id = TestScenarioA_GroupDealSuccess.campaign_id
        payload = {
            "customer_name": "Test Buyer 3",
            "customer_phone": f"+255702{uuid4().hex[:6]}",
            "quantity": 5,
            "payment_method": "bank_transfer"
        }
        response = requests.post(f"{BASE_URL}/api/admin/group-deals/campaigns/{campaign_id}/join", json=payload, headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["current_committed"] == 13
        assert data["buyer_count"] == 3
        # Campaign should still be active, threshold_met flag should be set
        assert data["campaign_status"] == "active"
        print(f"Buyer 3 joined with 5 units, total: {data['current_committed']}, threshold met!")
    
    def test_05_verify_threshold_met_flag(self, admin_headers):
        """Verify campaign has threshold_met flag set"""
        campaign_id = TestScenarioA_GroupDealSuccess.campaign_id
        response = requests.get(f"{BASE_URL}/api/admin/group-deals/campaigns/{campaign_id}", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "active"
        assert data["threshold_met"] == True
        assert data["current_committed"] == 13
        assert data["buyer_count"] == 3
        assert len(data.get("commitments", [])) == 3
        print(f"Campaign threshold_met: {data['threshold_met']}, status: {data['status']}")
    
    def test_06_finalize_campaign(self, admin_headers):
        """Finalize the campaign — creates orders + VBO"""
        campaign_id = TestScenarioA_GroupDealSuccess.campaign_id
        response = requests.post(f"{BASE_URL}/api/admin/group-deals/campaigns/{campaign_id}/finalize", headers=admin_headers)
        assert response.status_code == 200, f"Failed to finalize: {response.text}"
        data = response.json()
        assert data["status"] == "finalized"
        assert data["orders_created"] == 3
        assert data["total_units"] == 13
        assert "vendor_back_order" in data
        assert data["vendor_back_order"].startswith("VBO-")
        print(f"Finalized: {data['orders_created']} orders, {data['total_units']} units, VBO: {data['vendor_back_order']}")
    
    def test_07_verify_finalized_state(self, admin_headers):
        """Verify campaign is finalized with VBO"""
        campaign_id = TestScenarioA_GroupDealSuccess.campaign_id
        response = requests.get(f"{BASE_URL}/api/admin/group-deals/campaigns/{campaign_id}", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "finalized"
        assert data["orders_created"] == 3
        assert data["total_units_ordered"] == 13
        assert "vendor_back_order" in data
        vbo = data["vendor_back_order"]
        assert vbo["total_quantity"] == 13
        assert vbo["buyer_count"] == 3
        print(f"VBO verified: {vbo['vbo_number']}, qty: {vbo['total_quantity']}")
    
    def test_08_commitment_states_after_finalize(self, admin_headers):
        """Verify all commitments are order_created"""
        campaign_id = TestScenarioA_GroupDealSuccess.campaign_id
        response = requests.get(f"{BASE_URL}/api/admin/group-deals/campaigns/{campaign_id}", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        for c in data.get("commitments", []):
            assert c["status"] == "order_created"
        print(f"All {len(data['commitments'])} commitments are order_created")


class TestScenarioB_GroupDealFailure:
    """SCENARIO B: Group Deal FAILURE — create campaign, partial join, cancel, process-refunds"""
    
    campaign_id = None
    buyer_phone = None
    
    def test_01_create_campaign(self, admin_headers):
        """Create a test campaign for failure scenario"""
        payload = {
            "product_name": f"TEST_FAILURE_PRODUCT_{uuid4().hex[:6]}",
            "description": "Test product for failure scenario",
            "vendor_cost": 5000,
            "original_price": 10000,
            "discounted_price": 8000,
            "display_target": 20,
            "vendor_threshold": 15,
            "duration_days": 5
        }
        response = requests.post(f"{BASE_URL}/api/admin/group-deals/campaigns", json=payload, headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        TestScenarioB_GroupDealFailure.campaign_id = data["id"]
        print(f"Created failure scenario campaign: {data['id']}")
    
    def test_02_partial_join(self, admin_headers):
        """Join with only 3 units (below threshold)"""
        campaign_id = TestScenarioB_GroupDealFailure.campaign_id
        phone = f"+255710{uuid4().hex[:6]}"
        TestScenarioB_GroupDealFailure.buyer_phone = phone
        payload = {
            "customer_name": "Partial Buyer",
            "customer_phone": phone,
            "quantity": 3,
            "payment_method": "cash"
        }
        response = requests.post(f"{BASE_URL}/api/admin/group-deals/campaigns/{campaign_id}/join", json=payload, headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["current_committed"] == 3
        assert data["buyer_count"] == 1
        print(f"Partial join: {data['current_committed']} units")
    
    def test_03_cancel_campaign(self, admin_headers):
        """Cancel the campaign"""
        campaign_id = TestScenarioB_GroupDealFailure.campaign_id
        response = requests.post(f"{BASE_URL}/api/admin/group-deals/campaigns/{campaign_id}/cancel", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "failed"
        assert data["refund_pending"] == 1
        print(f"Campaign cancelled, {data['refund_pending']} refunds pending")
    
    def test_04_verify_refund_pending_state(self, admin_headers):
        """Verify commitment is refund_pending"""
        campaign_id = TestScenarioB_GroupDealFailure.campaign_id
        response = requests.get(f"{BASE_URL}/api/admin/group-deals/campaigns/{campaign_id}", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "failed"
        for c in data.get("commitments", []):
            assert c["status"] == "refund_pending"
        print("Commitment status: refund_pending")
    
    def test_05_process_refunds(self, admin_headers):
        """Process refunds"""
        campaign_id = TestScenarioB_GroupDealFailure.campaign_id
        response = requests.post(f"{BASE_URL}/api/admin/group-deals/campaigns/{campaign_id}/process-refunds", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "refunds_processed"
        assert data["refunded_count"] == 1
        print(f"Refunds processed: {data['refunded_count']}")
    
    def test_06_verify_refunded_state(self, admin_headers):
        """Verify commitment is refunded"""
        campaign_id = TestScenarioB_GroupDealFailure.campaign_id
        response = requests.get(f"{BASE_URL}/api/admin/group-deals/campaigns/{campaign_id}", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        for c in data.get("commitments", []):
            assert c["status"] == "refunded"
        print("Commitment status: refunded")


class TestScenarioE_MultiUnit:
    """SCENARIO E: Multi-Unit — 1 user buys 10 units + another buys 5 = 15 total"""
    
    campaign_id = None
    
    def test_01_create_campaign(self, admin_headers):
        """Create campaign with target 15"""
        payload = {
            "product_name": f"TEST_MULTIUNIT_PRODUCT_{uuid4().hex[:6]}",
            "description": "Multi-unit test",
            "vendor_cost": 3000,
            "original_price": 6000,
            "discounted_price": 5000,
            "display_target": 15,
            "vendor_threshold": 15,
            "duration_days": 7
        }
        response = requests.post(f"{BASE_URL}/api/admin/group-deals/campaigns", json=payload, headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        TestScenarioE_MultiUnit.campaign_id = data["id"]
        print(f"Created multi-unit campaign: {data['id']}")
    
    def test_02_buyer1_10_units(self, admin_headers):
        """Buyer 1 commits 10 units"""
        campaign_id = TestScenarioE_MultiUnit.campaign_id
        payload = {
            "customer_name": "Big Buyer",
            "customer_phone": f"+255720{uuid4().hex[:6]}",
            "quantity": 10,
            "payment_method": "bank_transfer"
        }
        response = requests.post(f"{BASE_URL}/api/admin/group-deals/campaigns/{campaign_id}/join", json=payload, headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["quantity"] == 10
        assert data["current_committed"] == 10
        assert data["buyer_count"] == 1
        # Progress tracks units not buyers
        print(f"Buyer 1: 10 units, total committed: {data['current_committed']}, buyers: {data['buyer_count']}")
    
    def test_03_buyer2_5_units_hits_target(self, admin_headers):
        """Buyer 2 commits 5 units — hits target 15"""
        campaign_id = TestScenarioE_MultiUnit.campaign_id
        payload = {
            "customer_name": "Small Buyer",
            "customer_phone": f"+255721{uuid4().hex[:6]}",
            "quantity": 5,
            "payment_method": "mobile_money"
        }
        response = requests.post(f"{BASE_URL}/api/admin/group-deals/campaigns/{campaign_id}/join", json=payload, headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["quantity"] == 5
        assert data["current_committed"] == 15
        assert data["buyer_count"] == 2
        print(f"Buyer 2: 5 units, total committed: {data['current_committed']}, buyers: {data['buyer_count']}")
    
    def test_04_verify_progress_tracks_units(self, admin_headers):
        """Verify progress is based on units, not buyers"""
        campaign_id = TestScenarioE_MultiUnit.campaign_id
        response = requests.get(f"{BASE_URL}/api/admin/group-deals/campaigns/{campaign_id}", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["current_committed"] == 15  # Units
        assert data["buyer_count"] == 2  # Buyers
        assert data["display_target"] == 15
        assert data["threshold_met"] == True
        print(f"Progress: {data['current_committed']}/{data['display_target']} units, {data['buyer_count']} buyers")
    
    def test_05_finalize_and_verify_vbo(self, admin_headers):
        """Finalize and verify VBO total_quantity = 15"""
        campaign_id = TestScenarioE_MultiUnit.campaign_id
        response = requests.post(f"{BASE_URL}/api/admin/group-deals/campaigns/{campaign_id}/finalize", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total_units"] == 15
        assert data["orders_created"] == 2
        
        # Verify VBO
        response = requests.get(f"{BASE_URL}/api/admin/group-deals/campaigns/{campaign_id}", headers=admin_headers)
        vbo = response.json().get("vendor_back_order", {})
        assert vbo["total_quantity"] == 15
        assert vbo["buyer_count"] == 2
        print(f"VBO total_quantity: {vbo['total_quantity']}, buyer_count: {vbo['buyer_count']}")


class TestDuplicateJoinPrevention:
    """Duplicate join prevention: same phone on same campaign should return 400"""
    
    campaign_id = None
    test_phone = None
    
    def test_01_create_campaign(self, admin_headers):
        """Create test campaign"""
        payload = {
            "product_name": f"TEST_DUPLICATE_PRODUCT_{uuid4().hex[:6]}",
            "vendor_cost": 2000,
            "original_price": 4000,
            "discounted_price": 3500,
            "display_target": 10,
            "duration_days": 7
        }
        response = requests.post(f"{BASE_URL}/api/admin/group-deals/campaigns", json=payload, headers=admin_headers)
        assert response.status_code == 200
        TestDuplicateJoinPrevention.campaign_id = response.json()["id"]
        TestDuplicateJoinPrevention.test_phone = f"+255730{uuid4().hex[:6]}"
        print(f"Created campaign: {TestDuplicateJoinPrevention.campaign_id}")
    
    def test_02_first_join_succeeds(self, admin_headers):
        """First join with phone succeeds"""
        campaign_id = TestDuplicateJoinPrevention.campaign_id
        phone = TestDuplicateJoinPrevention.test_phone
        payload = {
            "customer_name": "First Join",
            "customer_phone": phone,
            "quantity": 2
        }
        response = requests.post(f"{BASE_URL}/api/admin/group-deals/campaigns/{campaign_id}/join", json=payload, headers=admin_headers)
        assert response.status_code == 200
        print(f"First join succeeded with phone: {phone}")
    
    def test_03_duplicate_join_fails(self, admin_headers):
        """Second join with same phone returns 400"""
        campaign_id = TestDuplicateJoinPrevention.campaign_id
        phone = TestDuplicateJoinPrevention.test_phone
        payload = {
            "customer_name": "Duplicate Join",
            "customer_phone": phone,
            "quantity": 1
        }
        response = requests.post(f"{BASE_URL}/api/admin/group-deals/campaigns/{campaign_id}/join", json=payload, headers=admin_headers)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "already joined" in response.json().get("detail", "").lower()
        print(f"Duplicate join correctly rejected: {response.json()['detail']}")


class TestCampaignLockAfterFinalize:
    """Campaign lock after finalize: finalized campaign must reject new joins"""
    
    campaign_id = None
    
    def test_01_create_and_finalize_campaign(self, admin_headers):
        """Create campaign, join to meet threshold, finalize"""
        # Create
        payload = {
            "product_name": f"TEST_LOCK_PRODUCT_{uuid4().hex[:6]}",
            "vendor_cost": 1000,
            "original_price": 2000,
            "discounted_price": 1800,
            "display_target": 5,
            "vendor_threshold": 2,
            "duration_days": 7
        }
        response = requests.post(f"{BASE_URL}/api/admin/group-deals/campaigns", json=payload, headers=admin_headers)
        assert response.status_code == 200
        campaign_id = response.json()["id"]
        TestCampaignLockAfterFinalize.campaign_id = campaign_id
        
        # Join to meet threshold
        for i in range(2):
            join_payload = {
                "customer_name": f"Lock Test Buyer {i}",
                "customer_phone": f"+255740{uuid4().hex[:6]}",
                "quantity": 1
            }
            requests.post(f"{BASE_URL}/api/admin/group-deals/campaigns/{campaign_id}/join", json=join_payload, headers=admin_headers)
        
        # Finalize
        response = requests.post(f"{BASE_URL}/api/admin/group-deals/campaigns/{campaign_id}/finalize", headers=admin_headers)
        assert response.status_code == 200
        print(f"Campaign finalized: {campaign_id}")
    
    def test_02_join_after_finalize_fails(self, admin_headers):
        """Attempt to join finalized campaign returns 400"""
        campaign_id = TestCampaignLockAfterFinalize.campaign_id
        payload = {
            "customer_name": "Late Joiner",
            "customer_phone": f"+255741{uuid4().hex[:6]}",
            "quantity": 1
        }
        response = requests.post(f"{BASE_URL}/api/admin/group-deals/campaigns/{campaign_id}/join", json=payload, headers=admin_headers)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "no longer accepting" in response.json().get("detail", "").lower()
        print(f"Join after finalize correctly rejected: {response.json()['detail']}")


class TestDealOfTheDay:
    """Deal of the Day: set-featured, unset-featured, /deal-of-the-day endpoint"""
    
    campaign_id = None
    
    def test_01_create_campaign_with_progress(self, admin_headers):
        """Create campaign and add some progress (>30% for featured eligibility)"""
        payload = {
            "product_name": f"TEST_DOTD_PRODUCT_{uuid4().hex[:6]}",
            "vendor_cost": 4000,
            "original_price": 8000,
            "discounted_price": 7000,
            "display_target": 10,
            "duration_days": 7
        }
        response = requests.post(f"{BASE_URL}/api/admin/group-deals/campaigns", json=payload, headers=admin_headers)
        assert response.status_code == 200
        campaign_id = response.json()["id"]
        TestDealOfTheDay.campaign_id = campaign_id
        
        # Add 4 units (40% progress) to meet featured eligibility
        for i in range(4):
            join_payload = {
                "customer_name": f"DOTD Buyer {i}",
                "customer_phone": f"+255750{uuid4().hex[:6]}",
                "quantity": 1
            }
            requests.post(f"{BASE_URL}/api/admin/group-deals/campaigns/{campaign_id}/join", json=join_payload, headers=admin_headers)
        print(f"Created campaign with 40% progress: {campaign_id}")
    
    def test_02_set_featured(self, admin_headers):
        """Set campaign as Deal of the Day"""
        campaign_id = TestDealOfTheDay.campaign_id
        response = requests.post(f"{BASE_URL}/api/admin/group-deals/campaigns/{campaign_id}/set-featured", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "featured"
        print(f"Campaign set as featured")
    
    def test_03_verify_featured_flag(self, admin_headers):
        """Verify is_featured flag is set"""
        campaign_id = TestDealOfTheDay.campaign_id
        response = requests.get(f"{BASE_URL}/api/admin/group-deals/campaigns/{campaign_id}", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["is_featured"] == True
        print(f"is_featured: {data['is_featured']}")
    
    def test_04_public_deal_of_the_day_endpoint(self):
        """GET /api/public/group-deals/deal-of-the-day returns featured deal"""
        response = requests.get(f"{BASE_URL}/api/public/group-deals/deal-of-the-day")
        assert response.status_code == 200
        data = response.json()
        assert data is not None
        assert data["id"] == TestDealOfTheDay.campaign_id
        # Verify internal fields are hidden
        assert "vendor_cost" not in data
        assert "margin_per_unit" not in data
        assert "buyer_count" in data  # buyer_count should be visible
        print(f"Deal of the Day: {data['product_name']}, buyer_count: {data['buyer_count']}")
    
    def test_05_only_one_featured_at_a_time(self, admin_headers):
        """Setting another campaign as featured unfeatured the first"""
        # Create another campaign with progress
        payload = {
            "product_name": f"TEST_DOTD2_PRODUCT_{uuid4().hex[:6]}",
            "vendor_cost": 3000,
            "original_price": 6000,
            "discounted_price": 5000,
            "display_target": 10,
            "duration_days": 7
        }
        response = requests.post(f"{BASE_URL}/api/admin/group-deals/campaigns", json=payload, headers=admin_headers)
        new_campaign_id = response.json()["id"]
        
        # Add progress
        for i in range(4):
            join_payload = {
                "customer_name": f"DOTD2 Buyer {i}",
                "customer_phone": f"+255760{uuid4().hex[:6]}",
                "quantity": 1
            }
            requests.post(f"{BASE_URL}/api/admin/group-deals/campaigns/{new_campaign_id}/join", json=join_payload, headers=admin_headers)
        
        # Set new campaign as featured
        response = requests.post(f"{BASE_URL}/api/admin/group-deals/campaigns/{new_campaign_id}/set-featured", headers=admin_headers)
        assert response.status_code == 200
        
        # Verify old campaign is no longer featured
        response = requests.get(f"{BASE_URL}/api/admin/group-deals/campaigns/{TestDealOfTheDay.campaign_id}", headers=admin_headers)
        assert response.json()["is_featured"] == False
        
        # Verify new campaign is featured
        response = requests.get(f"{BASE_URL}/api/public/group-deals/deal-of-the-day")
        assert response.json()["id"] == new_campaign_id
        print(f"Only one featured at a time verified")
    
    def test_06_unset_featured(self, admin_headers):
        """Unset featured status"""
        campaign_id = TestDealOfTheDay.campaign_id
        response = requests.post(f"{BASE_URL}/api/admin/group-deals/campaigns/{campaign_id}/unset-featured", headers=admin_headers)
        assert response.status_code == 200
        assert response.json()["status"] == "unfeatured"
        print("Unset featured successful")


class TestCustomerGroupDealsEndpoint:
    """GET /api/customer/group-deals?phone=X returns user's commitments with campaign data"""
    
    campaign_id = None
    test_phone = None
    
    def test_01_create_campaign_and_join(self, admin_headers):
        """Create campaign and join with test phone"""
        payload = {
            "product_name": f"TEST_CUSTOMER_GD_{uuid4().hex[:6]}",
            "vendor_cost": 2500,
            "original_price": 5000,
            "discounted_price": 4000,
            "display_target": 10,
            "duration_days": 7
        }
        response = requests.post(f"{BASE_URL}/api/admin/group-deals/campaigns", json=payload, headers=admin_headers)
        campaign_id = response.json()["id"]
        TestCustomerGroupDealsEndpoint.campaign_id = campaign_id
        
        test_phone = f"+255770{uuid4().hex[:6]}"
        TestCustomerGroupDealsEndpoint.test_phone = test_phone
        
        join_payload = {
            "customer_name": "Customer GD Test",
            "customer_phone": test_phone,
            "quantity": 3
        }
        response = requests.post(f"{BASE_URL}/api/admin/group-deals/campaigns/{campaign_id}/join", json=join_payload, headers=admin_headers)
        assert response.status_code == 200
        print(f"Created commitment for phone: {test_phone}")
    
    def test_02_customer_endpoint_returns_commitments(self):
        """GET /api/customer/group-deals?phone=X returns commitments"""
        import urllib.parse
        phone = TestCustomerGroupDealsEndpoint.test_phone
        encoded_phone = urllib.parse.quote(phone, safe='')
        response = requests.get(f"{BASE_URL}/api/customer/group-deals?phone={encoded_phone}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        
        commitment = data[0]
        assert "commitment_id" in commitment
        assert "campaign_id" in commitment
        assert "quantity" in commitment
        assert commitment["quantity"] == 3
        assert "amount" in commitment
        assert "status" in commitment
        assert commitment["status"] == "committed"
        
        # Verify campaign data is included
        assert "campaign" in commitment
        campaign = commitment["campaign"]
        assert "product_name" in campaign
        assert "discounted_price" in campaign
        assert "display_target" in campaign
        assert "current_committed" in campaign
        assert "buyer_count" in campaign
        print(f"Customer endpoint returned {len(data)} commitments with campaign data")
    
    def test_03_empty_phone_returns_empty_list(self):
        """GET /api/customer/group-deals without phone returns empty list"""
        response = requests.get(f"{BASE_URL}/api/customer/group-deals")
        assert response.status_code == 200
        assert response.json() == []
        print("Empty phone returns empty list")


class TestPublicEndpoints:
    """Test public group deals endpoints"""
    
    def test_public_list_deals(self):
        """GET /api/public/group-deals returns active deals"""
        response = requests.get(f"{BASE_URL}/api/public/group-deals")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Verify internal fields are hidden
        for deal in data[:3]:  # Check first 3
            assert "vendor_cost" not in deal
            assert "margin_per_unit" not in deal
            assert "vendor_threshold" not in deal
            assert "buyer_count" in deal  # buyer_count should be visible
        print(f"Public list returned {len(data)} deals")
    
    def test_public_featured_deals(self):
        """GET /api/public/group-deals/featured returns top 6"""
        response = requests.get(f"{BASE_URL}/api/public/group-deals/featured")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) <= 6
        print(f"Featured deals returned {len(data)} deals")
    
    def test_deal_of_the_day_returns_null_or_deal(self):
        """GET /api/public/group-deals/deal-of-the-day returns deal or null"""
        response = requests.get(f"{BASE_URL}/api/public/group-deals/deal-of-the-day")
        assert response.status_code == 200
        # Can be null or a deal object
        data = response.json()
        if data is not None:
            assert "id" in data
            assert "product_name" in data
            assert "buyer_count" in data
        print(f"Deal of the day: {data['product_name'] if data else 'None'}")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_campaigns(self, admin_headers):
        """List and note test campaigns for manual cleanup if needed"""
        response = requests.get(f"{BASE_URL}/api/admin/group-deals/campaigns", headers=admin_headers)
        if response.status_code == 200:
            campaigns = response.json()
            test_campaigns = [c for c in campaigns if c.get("product_name", "").startswith("TEST_")]
            print(f"Test campaigns created: {len(test_campaigns)}")
            # Note: In production, you'd delete these. For now, just log them.
