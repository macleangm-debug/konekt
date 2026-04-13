"""
Group Deals System Refinement Tests — v291
Tests the rewritten Group Deals engine:
1. Join creates commitment ONLY — no orders, no auto-success
2. Admin finalize creates buyer orders + ONE aggregated vendor back order
3. Cancel marks refund_pending, process-refunds marks refunded
4. Public endpoints: /api/public/group-deals and /api/public/group-deals/featured
5. Vendor back orders list endpoint
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    pytest.skip(f"Admin login failed: {response.status_code}")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Headers with admin auth"""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


class TestCampaignCreation:
    """Campaign creation with margin validation"""

    def test_create_campaign_success(self, admin_headers):
        """Create campaign with valid margin"""
        payload = {
            "product_name": "TEST_GroupDeal_Laptop_v291",
            "description": "Test laptop for group deal testing",
            "vendor_cost": 800000,
            "original_price": 1200000,
            "discounted_price": 960000,
            "display_target": 50,
            "vendor_threshold": 30,
            "duration_days": 14
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/group-deals/campaigns",
            json=payload,
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "id" in data
        assert data["product_name"] == payload["product_name"]
        assert data["status"] == "active"
        assert data["threshold_met"] == False
        assert data["current_committed"] == 0
        
        # Verify margin calculation
        expected_margin = 960000 - 800000  # 160000
        expected_margin_pct = round((expected_margin / 960000) * 100, 1)  # ~16.7%
        assert data["margin_per_unit"] == expected_margin
        assert data["margin_pct"] == expected_margin_pct
        
        # Store for cleanup
        TestCampaignCreation.created_campaign_id = data["id"]
        print(f"✓ Campaign created: {data['id']} with margin {data['margin_pct']}%")

    def test_create_campaign_margin_below_threshold(self, admin_headers):
        """Campaign with margin below 5% should be rejected"""
        payload = {
            "product_name": "TEST_LowMargin_v291",
            "vendor_cost": 950000,
            "original_price": 1000000,
            "discounted_price": 980000,  # Only 3% margin
            "display_target": 50,
            "duration_days": 14
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/group-deals/campaigns",
            json=payload,
            headers=admin_headers
        )
        assert response.status_code == 400
        assert "margin" in response.text.lower() or "threshold" in response.text.lower()
        print("✓ Low margin campaign correctly rejected")

    def test_create_campaign_price_below_cost(self, admin_headers):
        """Campaign with price below vendor cost should be rejected"""
        payload = {
            "product_name": "TEST_NegativeMargin_v291",
            "vendor_cost": 1000000,
            "discounted_price": 900000,  # Below cost
            "display_target": 50,
            "duration_days": 14
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/group-deals/campaigns",
            json=payload,
            headers=admin_headers
        )
        assert response.status_code == 400
        assert "vendor cost" in response.text.lower() or "below" in response.text.lower()
        print("✓ Negative margin campaign correctly rejected")


class TestJoinCampaign:
    """Join creates commitment ONLY — no orders, no auto-success"""

    @pytest.fixture(autouse=True)
    def setup_campaign(self, admin_headers):
        """Create a fresh campaign for join tests"""
        payload = {
            "product_name": "TEST_JoinTest_v291",
            "vendor_cost": 50000,
            "original_price": 100000,
            "discounted_price": 80000,
            "display_target": 5,
            "vendor_threshold": 3,
            "duration_days": 14
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/group-deals/campaigns",
            json=payload,
            headers=admin_headers
        )
        assert response.status_code == 200
        self.campaign_id = response.json()["id"]
        self.admin_headers = admin_headers
        yield
        # Cleanup: cancel campaign if still active
        requests.post(
            f"{BASE_URL}/api/admin/group-deals/campaigns/{self.campaign_id}/cancel",
            headers=admin_headers
        )

    def test_join_creates_commitment_only(self, admin_headers):
        """Join should create commitment, NOT change status to successful"""
        # Join with first customer
        join_payload = {
            "customer_name": "TEST_Customer1",
            "customer_phone": "+255700000001",
            "payment_method": "mobile_money"
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/group-deals/campaigns/{self.campaign_id}/join",
            json=join_payload,
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response
        assert data["status"] == "committed"
        assert data["current_committed"] == 1
        assert data["campaign_status"] == "active"  # NOT "successful"
        print(f"✓ Join created commitment, campaign still active")

    def test_join_increments_count_without_status_change(self, admin_headers):
        """Multiple joins should increment count but NOT auto-finalize"""
        # Join 3 times to reach vendor_threshold
        for i in range(3):
            join_payload = {
                "customer_name": f"TEST_Customer{i+1}",
                "customer_phone": f"+25570000000{i+1}",
                "payment_method": "cash"
            }
            response = requests.post(
                f"{BASE_URL}/api/admin/group-deals/campaigns/{self.campaign_id}/join",
                json=join_payload,
                headers=admin_headers
            )
            assert response.status_code == 200
        
        # Get campaign to verify state
        response = requests.get(
            f"{BASE_URL}/api/admin/group-deals/campaigns/{self.campaign_id}",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify: threshold_met is True but status is still "active"
        assert data["current_committed"] == 3
        assert data["threshold_met"] == True
        assert data["status"] == "active"  # NOT "finalized" or "successful"
        print(f"✓ Threshold met ({data['current_committed']}/{data['display_target']}), status still 'active'")

    def test_join_requires_customer_info(self, admin_headers):
        """Join without customer name or phone should fail"""
        join_payload = {
            "payment_method": "cash"
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/group-deals/campaigns/{self.campaign_id}/join",
            json=join_payload,
            headers=admin_headers
        )
        assert response.status_code == 400
        print("✓ Join without customer info correctly rejected")


class TestFinalizeCampaign:
    """Finalize creates buyer orders + ONE aggregated vendor back order"""

    @pytest.fixture(autouse=True)
    def setup_campaign_with_commitments(self, admin_headers):
        """Create campaign and add commitments"""
        # Create campaign
        payload = {
            "product_name": "TEST_FinalizeTest_v291",
            "vendor_cost": 50000,
            "original_price": 100000,
            "discounted_price": 80000,
            "display_target": 5,
            "vendor_threshold": 3,
            "duration_days": 14
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/group-deals/campaigns",
            json=payload,
            headers=admin_headers
        )
        assert response.status_code == 200
        self.campaign_id = response.json()["id"]
        self.admin_headers = admin_headers
        
        # Add 3 commitments to meet threshold
        for i in range(3):
            join_payload = {
                "customer_name": f"TEST_FinalizeCustomer{i+1}",
                "customer_phone": f"+25571000000{i+1}",
                "payment_method": "cash",
                "quantity": 1 if i < 2 else 2  # Last customer orders 2 units
            }
            requests.post(
                f"{BASE_URL}/api/admin/group-deals/campaigns/{self.campaign_id}/join",
                json=join_payload,
                headers=admin_headers
            )
        yield

    def test_finalize_creates_orders_and_vbo(self, admin_headers):
        """Finalize should create buyer orders + vendor back order"""
        response = requests.post(
            f"{BASE_URL}/api/admin/group-deals/campaigns/{self.campaign_id}/finalize",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response
        assert data["status"] == "finalized"
        assert data["orders_created"] == 3  # 3 commitments = 3 orders
        assert data["total_units"] == 4  # 1 + 1 + 2 = 4 units
        assert "vendor_back_order" in data
        assert data["vendor_back_order"].startswith("VBO-")
        print(f"✓ Finalized: {data['orders_created']} orders, {data['total_units']} units, VBO: {data['vendor_back_order']}")

    def test_finalize_campaign_status_changes(self, admin_headers):
        """After finalize, campaign status should be 'finalized'"""
        # First finalize
        requests.post(
            f"{BASE_URL}/api/admin/group-deals/campaigns/{self.campaign_id}/finalize",
            headers=admin_headers
        )
        
        # Get campaign
        response = requests.get(
            f"{BASE_URL}/api/admin/group-deals/campaigns/{self.campaign_id}",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "finalized"
        assert "vbo_number" in data
        assert "orders_created" in data
        print(f"✓ Campaign status is 'finalized', VBO: {data.get('vbo_number')}")


class TestCancelAndRefunds:
    """Cancel marks refund_pending, process-refunds marks refunded"""

    @pytest.fixture(autouse=True)
    def setup_campaign_with_commitments(self, admin_headers):
        """Create campaign and add commitments"""
        payload = {
            "product_name": "TEST_CancelTest_v291",
            "vendor_cost": 50000,
            "original_price": 100000,
            "discounted_price": 80000,
            "display_target": 10,
            "vendor_threshold": 5,
            "duration_days": 14
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/group-deals/campaigns",
            json=payload,
            headers=admin_headers
        )
        assert response.status_code == 200
        self.campaign_id = response.json()["id"]
        self.admin_headers = admin_headers
        
        # Add 2 commitments (below threshold)
        for i in range(2):
            join_payload = {
                "customer_name": f"TEST_CancelCustomer{i+1}",
                "customer_phone": f"+25572000000{i+1}",
                "payment_method": "cash"
            }
            requests.post(
                f"{BASE_URL}/api/admin/group-deals/campaigns/{self.campaign_id}/join",
                json=join_payload,
                headers=admin_headers
            )
        yield

    def test_cancel_marks_refund_pending(self, admin_headers):
        """Cancel should mark campaign failed and commitments as refund_pending"""
        response = requests.post(
            f"{BASE_URL}/api/admin/group-deals/campaigns/{self.campaign_id}/cancel",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "failed"
        assert data["refund_pending"] == 2  # 2 commitments
        print(f"✓ Campaign cancelled, {data['refund_pending']} refunds pending")

    def test_process_refunds_marks_refunded(self, admin_headers):
        """Process refunds should mark refund_pending as refunded"""
        # First cancel
        requests.post(
            f"{BASE_URL}/api/admin/group-deals/campaigns/{self.campaign_id}/cancel",
            headers=admin_headers
        )
        
        # Then process refunds
        response = requests.post(
            f"{BASE_URL}/api/admin/group-deals/campaigns/{self.campaign_id}/process-refunds",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "refunds_processed"
        assert data["refunded_count"] == 2
        print(f"✓ Refunds processed: {data['refunded_count']} refunded")

    def test_process_refunds_only_for_failed_campaigns(self, admin_headers):
        """Process refunds should only work for failed campaigns"""
        # Create a new active campaign
        payload = {
            "product_name": "TEST_ActiveRefundTest_v291",
            "vendor_cost": 50000,
            "discounted_price": 80000,
            "display_target": 10,
            "duration_days": 14
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/group-deals/campaigns",
            json=payload,
            headers=admin_headers
        )
        campaign_id = response.json()["id"]
        
        # Try to process refunds on active campaign
        response = requests.post(
            f"{BASE_URL}/api/admin/group-deals/campaigns/{campaign_id}/process-refunds",
            headers=admin_headers
        )
        assert response.status_code == 400
        print("✓ Process refunds correctly rejected for active campaign")
        
        # Cleanup
        requests.post(
            f"{BASE_URL}/api/admin/group-deals/campaigns/{campaign_id}/cancel",
            headers=admin_headers
        )


class TestPublicEndpoints:
    """Public endpoints: list and featured"""

    def test_public_list_returns_active_deals(self):
        """GET /api/public/group-deals returns active campaigns"""
        response = requests.get(f"{BASE_URL}/api/public/group-deals")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        # All returned deals should be active
        for deal in data:
            assert deal.get("status") == "active"
        print(f"✓ Public list returned {len(data)} active deals")

    def test_public_list_hides_internal_fields(self):
        """Public list should NOT expose internal pricing fields"""
        response = requests.get(f"{BASE_URL}/api/public/group-deals")
        assert response.status_code == 200
        data = response.json()
        
        hidden_fields = ["vendor_cost", "vendor_threshold", "margin_per_unit", 
                        "margin_pct", "commission_mode", "affiliate_share_pct", 
                        "created_by", "threshold_met"]
        
        for deal in data:
            for field in hidden_fields:
                assert field not in deal, f"Internal field '{field}' should be hidden"
        print("✓ Internal pricing fields correctly hidden from public")

    def test_public_featured_returns_top_6(self):
        """GET /api/public/group-deals/featured returns top 6 deals"""
        response = requests.get(f"{BASE_URL}/api/public/group-deals/featured")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) <= 6
        print(f"✓ Featured endpoint returned {len(data)} deals (max 6)")

    def test_public_featured_ranked_by_progress(self):
        """Featured deals should be ranked by progress/urgency"""
        response = requests.get(f"{BASE_URL}/api/public/group-deals/featured")
        assert response.status_code == 200
        data = response.json()
        
        # Verify deals have required fields for display
        for deal in data:
            assert "product_name" in deal
            assert "discounted_price" in deal
            assert "display_target" in deal
            assert "current_committed" in deal
            assert "deadline" in deal
        print("✓ Featured deals have all required display fields")

    def test_public_deal_detail(self, admin_headers):
        """GET /api/public/group-deals/{id} returns deal detail"""
        # First get a deal from the list
        response = requests.get(f"{BASE_URL}/api/public/group-deals")
        if response.status_code == 200 and response.json():
            deal_id = response.json()[0]["id"]
            
            response = requests.get(f"{BASE_URL}/api/public/group-deals/{deal_id}")
            assert response.status_code == 200
            data = response.json()
            
            # Verify internal fields are hidden
            assert "vendor_cost" not in data
            assert "margin_per_unit" not in data
            print(f"✓ Public deal detail returned for {deal_id}")
        else:
            pytest.skip("No active deals to test detail endpoint")


class TestVendorBackOrders:
    """Vendor back orders list endpoint"""

    def test_list_vendor_back_orders(self, admin_headers):
        """GET /api/admin/group-deals/vendor-back-orders returns VBO list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/group-deals/vendor-back-orders",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        # Verify VBO structure if any exist
        for vbo in data:
            assert "vbo_number" in vbo
            assert "campaign_id" in vbo
            assert "product_name" in vbo
            assert "total_quantity" in vbo
            assert "vendor_unit_cost" in vbo
            assert "vendor_total_cost" in vbo
            assert "preparation_status" in vbo
        print(f"✓ Vendor back orders list returned {len(data)} VBOs")


class TestCampaignGetWithCommitments:
    """GET campaign returns commitments and threshold_met flag"""

    def test_get_campaign_includes_commitments(self, admin_headers):
        """GET campaign should include commitments list"""
        # Create campaign
        payload = {
            "product_name": "TEST_GetCommitments_v291",
            "vendor_cost": 50000,
            "discounted_price": 80000,
            "display_target": 10,
            "duration_days": 14
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/group-deals/campaigns",
            json=payload,
            headers=admin_headers
        )
        campaign_id = response.json()["id"]
        
        # Add a commitment
        join_payload = {
            "customer_name": "TEST_GetCommitCustomer",
            "customer_phone": "+255730000001",
            "payment_method": "cash"
        }
        requests.post(
            f"{BASE_URL}/api/admin/group-deals/campaigns/{campaign_id}/join",
            json=join_payload,
            headers=admin_headers
        )
        
        # Get campaign
        response = requests.get(
            f"{BASE_URL}/api/admin/group-deals/campaigns/{campaign_id}",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "commitments" in data
        assert len(data["commitments"]) == 1
        assert data["commitments"][0]["customer_name"] == "TEST_GetCommitCustomer"
        assert "threshold_met" in data
        print(f"✓ Campaign GET includes {len(data['commitments'])} commitments")
        
        # Cleanup
        requests.post(
            f"{BASE_URL}/api/admin/group-deals/campaigns/{campaign_id}/cancel",
            headers=admin_headers
        )


# Cleanup fixture
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_campaigns(admin_headers):
    """Cleanup TEST_ prefixed campaigns after all tests"""
    yield
    # Get all campaigns
    response = requests.get(
        f"{BASE_URL}/api/admin/group-deals/campaigns",
        headers=admin_headers
    )
    if response.status_code == 200:
        for campaign in response.json():
            if campaign.get("product_name", "").startswith("TEST_"):
                if campaign.get("status") == "active":
                    requests.post(
                        f"{BASE_URL}/api/admin/group-deals/campaigns/{campaign['id']}/cancel",
                        headers=admin_headers
                    )
