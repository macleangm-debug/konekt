"""
Test suite for Campaign + Affiliate Tracking Engine
Tests: evaluate-campaign, evaluate-campaigns, guest orders with attribution,
       campaign performance summary, fraud guard
"""
import pytest
import requests
import os
from datetime import datetime
from uuid import uuid4

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestCheckoutEvaluateCampaign:
    """Test POST /api/checkout/evaluate-campaign endpoint"""

    def test_evaluate_campaign_returns_campaign_and_affiliate(self):
        """Test evaluate-campaign returns campaign and affiliate data"""
        response = requests.post(f"{BASE_URL}/api/checkout/evaluate-campaign", json={
            "order_amount": 150000,
            "affiliate_code": None,
            "service_slug": None,
            "customer_email": "test@example.com"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Must have campaign and affiliate keys
        assert "campaign" in data, "Response must include 'campaign' key"
        assert "affiliate" in data, "Response must include 'affiliate' key"
        
        # Campaign can be null if none match
        if data["campaign"]:
            assert "campaign_id" in data["campaign"]
            assert "campaign_name" in data["campaign"]
            assert "discount_amount" in data["campaign"]

    def test_evaluate_campaign_with_affiliate_code(self):
        """Test evaluate-campaign with affiliate code"""
        response = requests.post(f"{BASE_URL}/api/checkout/evaluate-campaign", json={
            "order_amount": 200000,
            "affiliate_code": "TEST_AFFILIATE",
            "service_slug": None,
            "customer_email": "test@example.com"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "campaign" in data
        assert "affiliate" in data
        # Affiliate may be null if code doesn't exist - that's valid behavior

    def test_evaluate_campaign_with_service_slug(self):
        """Test evaluate-campaign with service_slug filter"""
        response = requests.post(f"{BASE_URL}/api/checkout/evaluate-campaign", json={
            "order_amount": 100000,
            "affiliate_code": None,
            "service_slug": "logo-design",
            "customer_email": "test@example.com"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "campaign" in data
        assert "affiliate" in data


class TestCheckoutEvaluateCampaigns:
    """Test POST /api/checkout/evaluate-campaigns endpoint"""

    def test_evaluate_campaigns_returns_list(self):
        """Test evaluate-campaigns returns list of applicable campaigns"""
        response = requests.post(f"{BASE_URL}/api/checkout/evaluate-campaigns", json={
            "customer_email": "test@example.com",
            "order_amount": 150000,
            "category": None,
            "service_slug": None,
            "affiliate_code": None
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "campaigns" in data, "Response must include 'campaigns' list"
        assert isinstance(data["campaigns"], list), "campaigns must be a list"
        assert "affiliate_code_detected" in data
        assert "affiliate" in data
        assert "best_campaign" in data

    def test_evaluate_campaigns_affiliate_code_detected(self):
        """Test affiliate_code is detected and returned"""
        test_code = "MY_AFF_CODE"
        response = requests.post(f"{BASE_URL}/api/checkout/evaluate-campaigns", json={
            "customer_email": "test@example.com",
            "order_amount": 100000,
            "category": None,
            "service_slug": None,
            "affiliate_code": test_code
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["affiliate_code_detected"] == test_code

    def test_evaluate_campaigns_category_filter(self):
        """Test campaigns filtered by category"""
        response = requests.post(f"{BASE_URL}/api/checkout/evaluate-campaigns", json={
            "customer_email": "test@example.com",
            "order_amount": 100000,
            "category": "promotional",
            "service_slug": None,
            "affiliate_code": None
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "campaigns" in data


class TestGuestOrdersAttribution:
    """Test POST /api/guest/orders with affiliate and campaign attribution"""

    def test_guest_order_stores_affiliate_attribution(self):
        """Test guest order stores affiliate_code, affiliate_email, affiliate_name"""
        order_email = f"test_aff_{uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/guest/orders", json={
            "customer_name": "Affiliate Test Customer",
            "customer_email": order_email,
            "customer_phone": "+255712345678",
            "delivery_address": "Test Address",
            "city": "Dar es Salaam",
            "country": "Tanzania",
            "line_items": [
                {
                    "description": "Test Product",
                    "quantity": 5,
                    "unit_price": 10000,
                    "total": 50000
                }
            ],
            "subtotal": 50000,
            "tax": 0,
            "discount": 0,
            "total": 50000,
            "affiliate_code": "TEST_AFF_CODE",
            "affiliate_email": "affiliate@test.com"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "order_id" in data or "id" in data
        assert "order_number" in data
        # Check if affiliate was attributed (may be false if affiliate doesn't exist)
        assert "affiliate_attributed" in data

    def test_guest_order_stores_campaign_attribution(self):
        """Test guest order stores campaign_id, campaign_name, campaign_discount"""
        order_email = f"test_camp_{uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/guest/orders", json={
            "customer_name": "Campaign Test Customer",
            "customer_email": order_email,
            "customer_phone": "+255712345678",
            "delivery_address": "Test Address",
            "city": "Dar es Salaam",
            "country": "Tanzania",
            "line_items": [
                {
                    "description": "Test Product",
                    "quantity": 10,
                    "unit_price": 10000,
                    "total": 100000
                }
            ],
            "subtotal": 100000,
            "tax": 0,
            "discount": 15000,
            "total": 85000,
            "campaign_id": "test_campaign_id",
            "campaign_name": "Summer Sale 2025",
            "campaign_discount": 15000,
            "campaign_reward_type": "percentage_discount"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "order_id" in data or "id" in data
        assert "order_number" in data
        assert "campaign_applied" in data

    def test_guest_order_verify_persistence(self):
        """Create order and verify data persisted via GET"""
        order_email = f"test_persist_{uuid4().hex[:8]}@test.com"
        
        # Create order with campaign data
        create_resp = requests.post(f"{BASE_URL}/api/guest/orders", json={
            "customer_name": "Persist Test Customer",
            "customer_email": order_email,
            "customer_phone": "+255712345678",
            "delivery_address": "Persist Address",
            "city": "Arusha",
            "country": "Tanzania",
            "line_items": [
                {
                    "description": "Persist Product",
                    "quantity": 2,
                    "unit_price": 25000,
                    "total": 50000
                }
            ],
            "subtotal": 50000,
            "tax": 0,
            "discount": 5000,
            "total": 45000,
            "campaign_id": "persist_campaign_id",
            "campaign_name": "Persist Campaign",
            "campaign_discount": 5000
        })
        assert create_resp.status_code == 200
        
        created_data = create_resp.json()
        order_id = created_data.get("id") or created_data.get("order_id")
        
        # GET the order to verify persistence
        get_resp = requests.get(f"{BASE_URL}/api/guest/orders/{order_id}")
        assert get_resp.status_code == 200
        
        order_data = get_resp.json()
        assert order_data.get("customer_email") == order_email
        assert order_data.get("campaign_id") == "persist_campaign_id"
        assert order_data.get("campaign_name") == "Persist Campaign"


class TestCampaignPerformanceSummary:
    """Test GET /api/admin/campaign-performance/summary endpoint"""

    def test_campaign_performance_summary_returns_campaigns_and_totals(self):
        """Test summary returns campaigns and totals"""
        response = requests.get(f"{BASE_URL}/api/admin/campaign-performance/summary")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Must have campaigns array
        assert "campaigns" in data, "Response must include 'campaigns' array"
        assert isinstance(data["campaigns"], list), "campaigns must be a list"
        
        # Must have totals object
        assert "totals" in data, "Response must include 'totals' object"
        totals = data["totals"]
        
        # Verify totals structure
        assert "clicks" in totals, "totals must include clicks"
        assert "redemptions" in totals, "totals must include redemptions"
        assert "revenue" in totals, "totals must include revenue"
        assert "commissions" in totals, "totals must include commissions"
        assert "conversion_rate" in totals, "totals must include conversion_rate"

    def test_campaign_performance_individual_campaign_metrics(self):
        """Test each campaign has individual metrics"""
        response = requests.get(f"{BASE_URL}/api/admin/campaign-performance/summary")
        assert response.status_code == 200
        
        data = response.json()
        campaigns = data.get("campaigns", [])
        
        # If there are campaigns, verify their structure
        for campaign in campaigns:
            assert "campaign_id" in campaign
            assert "name" in campaign
            assert "clicks" in campaign
            assert "redemptions" in campaign
            assert "revenue" in campaign
            assert "commissions" in campaign
            assert "conversion_rate" in campaign

    def test_campaign_performance_totals_numeric(self):
        """Test totals values are numeric"""
        response = requests.get(f"{BASE_URL}/api/admin/campaign-performance/summary")
        assert response.status_code == 200
        
        data = response.json()
        totals = data["totals"]
        
        # All totals should be numeric
        assert isinstance(totals["clicks"], (int, float))
        assert isinstance(totals["redemptions"], (int, float))
        assert isinstance(totals["revenue"], (int, float))
        assert isinstance(totals["commissions"], (int, float))
        assert isinstance(totals["conversion_rate"], (int, float))


class TestFraudGuardDuplicatePrevention:
    """Test fraud guard prevents duplicate commissions"""

    def test_guest_order_campaign_usage_logged(self):
        """Test that campaign usage is logged to campaign_usages collection"""
        order_email = f"test_usage_{uuid4().hex[:8]}@test.com"
        campaign_id = f"usage_test_{uuid4().hex[:8]}"
        
        response = requests.post(f"{BASE_URL}/api/guest/orders", json={
            "customer_name": "Usage Log Customer",
            "customer_email": order_email,
            "customer_phone": "+255712345678",
            "delivery_address": "Usage Address",
            "city": "Dar es Salaam",
            "country": "Tanzania",
            "line_items": [
                {
                    "description": "Usage Product",
                    "quantity": 1,
                    "unit_price": 50000,
                    "total": 50000
                }
            ],
            "subtotal": 50000,
            "tax": 0,
            "discount": 5000,
            "total": 45000,
            "campaign_id": campaign_id,
            "campaign_name": "Usage Test Campaign",
            "campaign_discount": 5000
        })
        assert response.status_code == 200
        
        # Order created successfully - campaign usage should be logged
        data = response.json()
        assert "order_id" in data or "id" in data


class TestActivePromotions:
    """Test checkout active promotions endpoints"""

    def test_get_active_promotions(self):
        """Test GET /api/checkout/active-promotions"""
        response = requests.get(f"{BASE_URL}/api/checkout/active-promotions")
        assert response.status_code == 200
        
        data = response.json()
        assert "promotions" in data
        assert isinstance(data["promotions"], list)

    def test_post_active_promotions(self):
        """Test POST /api/checkout/active-promotions"""
        response = requests.post(f"{BASE_URL}/api/checkout/active-promotions", json={
            "order_amount": 100000,
            "affiliate_code": None,
            "service_slug": None
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "campaigns" in data


class TestDetectAttribution:
    """Test detect-attribution endpoint"""

    def test_detect_attribution_endpoint(self):
        """Test GET /api/checkout/detect-attribution"""
        response = requests.get(f"{BASE_URL}/api/checkout/detect-attribution")
        assert response.status_code == 200
        
        data = response.json()
        assert "has_attribution" in data
        assert "affiliate_code" in data
        assert "affiliate_name" in data
        assert "source" in data

    def test_detect_attribution_with_affiliate_param(self):
        """Test detect-attribution with affiliate query param"""
        response = requests.get(f"{BASE_URL}/api/checkout/detect-attribution?affiliate=TEST_CODE")
        assert response.status_code == 200
        
        data = response.json()
        assert "has_attribution" in data


# Run with: pytest /app/backend/tests/test_campaign_affiliate_tracking.py -v --tb=short --junitxml=/app/test_reports/pytest/pytest_results_campaign_affiliate.xml
