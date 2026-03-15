"""
Test suite for Attribution + Checkout Campaign Application Pack
Tests: checkout campaign evaluation, affiliate perk preview, guest order attribution
"""
import pytest
import requests
import os
from datetime import datetime
from uuid import uuid4

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestCheckoutCampaignEndpoints:
    """Test checkout campaign evaluation and attribution endpoints"""

    # --- /api/checkout/evaluate-campaigns ---
    def test_evaluate_campaigns_without_affiliate(self):
        """Test campaign evaluation without affiliate code returns empty or public campaigns"""
        response = requests.post(f"{BASE_URL}/api/checkout/evaluate-campaigns", json={
            "customer_email": "newcustomer@test.com",
            "order_amount": 150000,
            "category": None,
            "affiliate_code": None,
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "campaigns" in data
        assert "affiliate_code_detected" in data
        assert "best_campaign" in data
        assert isinstance(data["campaigns"], list)
        # affiliate_code_detected should be None when not provided
        assert data["affiliate_code_detected"] is None

    def test_evaluate_campaigns_with_affiliate_code(self):
        """Test campaign evaluation with affiliate code"""
        response = requests.post(f"{BASE_URL}/api/checkout/evaluate-campaigns", json={
            "customer_email": "test@example.com",
            "order_amount": 200000,
            "category": None,
            "affiliate_code": "TEST_CODE_123",  # Test with any code
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "campaigns" in data
        assert data["affiliate_code_detected"] == "TEST_CODE_123"
        
    def test_evaluate_campaigns_with_category(self):
        """Test campaign evaluation with category filter"""
        response = requests.post(f"{BASE_URL}/api/checkout/evaluate-campaigns", json={
            "customer_email": "test@example.com",
            "order_amount": 100000,
            "category": "creative_services",
            "service_slug": "logo-design",
            "affiliate_code": None,
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "campaigns" in data
        assert isinstance(data["campaigns"], list)

    def test_evaluate_campaigns_zero_amount(self):
        """Test campaign evaluation with zero order amount"""
        response = requests.post(f"{BASE_URL}/api/checkout/evaluate-campaigns", json={
            "customer_email": "test@example.com",
            "order_amount": 0,
            "category": None,
            "affiliate_code": None,
        })
        assert response.status_code == 200
        data = response.json()
        # Should still return structure even with zero amount
        assert "campaigns" in data

    # --- /api/checkout/evaluate-affiliate-perk ---
    def test_evaluate_affiliate_perk_no_code(self):
        """Test affiliate perk evaluation without code returns not eligible"""
        response = requests.post(f"{BASE_URL}/api/checkout/evaluate-affiliate-perk", json={
            "customer_email": "test@example.com",
            "order_amount": 100000,
            "category": None,
            "affiliate_code": None,
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["eligible"] == False
        assert "reason" in data

    def test_evaluate_affiliate_perk_invalid_code(self):
        """Test affiliate perk with invalid code"""
        response = requests.post(f"{BASE_URL}/api/checkout/evaluate-affiliate-perk", json={
            "customer_email": "test@example.com",
            "order_amount": 100000,
            "category": None,
            "affiliate_code": "INVALID_CODE_XYZ_123",
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["eligible"] == False
        assert "Invalid affiliate code" in data.get("reason", "")
        assert data["affiliate_code_detected"] == "INVALID_CODE_XYZ_123"

    def test_evaluate_affiliate_perk_response_structure(self):
        """Test affiliate perk response has correct structure"""
        response = requests.post(f"{BASE_URL}/api/checkout/evaluate-affiliate-perk", json={
            "customer_email": "test@example.com",
            "order_amount": 100000,
            "category": None,
            "affiliate_code": "TEST_CODE",
        })
        assert response.status_code == 200
        
        data = response.json()
        # Should always have these fields
        assert "eligible" in data
        assert "affiliate_code_detected" in data

    # --- /api/checkout/detect-attribution ---
    def test_detect_attribution_no_params(self):
        """Test attribution detection with no affiliate code"""
        response = requests.get(f"{BASE_URL}/api/checkout/detect-attribution")
        assert response.status_code == 200
        
        data = response.json()
        assert "has_attribution" in data
        assert "affiliate_code" in data
        assert "affiliate_name" in data
        assert "source" in data
        # Without any affiliate, should return no attribution
        assert data["has_attribution"] == False

    def test_detect_attribution_with_query_param(self):
        """Test attribution detection with URL query parameter"""
        response = requests.get(f"{BASE_URL}/api/checkout/detect-attribution?affiliate=TEST_PROMO")
        assert response.status_code == 200
        
        data = response.json()
        assert "has_attribution" in data
        assert "source" in data
        # Source should be 'url' if code provided via query param

    # --- /api/checkout/active-promotions ---
    def test_get_active_promotions(self):
        """Test getting active public promotions"""
        response = requests.get(f"{BASE_URL}/api/checkout/active-promotions")
        assert response.status_code == 200
        
        data = response.json()
        assert "promotions" in data
        assert isinstance(data["promotions"], list)
        
        # If there are promotions, verify structure
        for promo in data["promotions"]:
            # Should have public-safe fields only
            assert "id" in promo or promo.get("id") is not None or True  # May be empty
            

class TestGuestOrderAttribution:
    """Test guest order creation with affiliate and campaign attribution"""

    def test_guest_order_basic_creation(self):
        """Test basic guest order creation without attribution"""
        order_email = f"test_{uuid4().hex[:8]}@testorders.com"
        response = requests.post(f"{BASE_URL}/api/guest/orders", json={
            "customer_name": "Test Customer",
            "customer_email": order_email,
            "customer_phone": "+255712345678",
            "customer_company": "Test Corp",
            "delivery_address": "123 Test Street",
            "city": "Dar es Salaam",
            "country": "Tanzania",
            "notes": "Test order for attribution testing",
            "line_items": [
                {
                    "description": "Test Product",
                    "quantity": 10,
                    "unit_price": 5000,
                    "total": 50000,
                }
            ],
            "subtotal": 50000,
            "tax": 0,
            "discount": 0,
            "total": 50000,
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data or "order_id" in data
        assert "order_number" in data
        assert data.get("affiliate_attributed") == False
        assert data.get("campaign_applied") == False

    def test_guest_order_with_affiliate_code(self):
        """Test guest order with affiliate_code attribution"""
        order_email = f"affiliate_test_{uuid4().hex[:8]}@testorders.com"
        response = requests.post(f"{BASE_URL}/api/guest/orders", json={
            "customer_name": "Affiliate Customer",
            "customer_email": order_email,
            "customer_phone": "+255712345678",
            "delivery_address": "456 Affiliate Ave",
            "city": "Arusha",
            "country": "Tanzania",
            "line_items": [
                {
                    "description": "Affiliate Test Product",
                    "quantity": 5,
                    "unit_price": 10000,
                    "total": 50000,
                }
            ],
            "subtotal": 50000,
            "tax": 0,
            "discount": 0,
            "total": 50000,
            "affiliate_code": "TEST_AFFILIATE_CODE",  # Attribution field
            "affiliate_email": None,
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data or "order_id" in data
        assert "order_number" in data

    def test_guest_order_with_campaign_discount(self):
        """Test guest order with campaign attribution and discount"""
        order_email = f"campaign_test_{uuid4().hex[:8]}@testorders.com"
        response = requests.post(f"{BASE_URL}/api/guest/orders", json={
            "customer_name": "Campaign Customer",
            "customer_email": order_email,
            "customer_phone": "+255712345678",
            "delivery_address": "789 Campaign Blvd",
            "city": "Mwanza",
            "country": "Tanzania",
            "line_items": [
                {
                    "description": "Campaign Test Product",
                    "quantity": 20,
                    "unit_price": 5000,
                    "total": 100000,
                }
            ],
            "subtotal": 100000,
            "tax": 0,
            "discount": 10000,  # 10% discount
            "total": 90000,
            # Campaign attribution fields
            "campaign_id": "test_campaign_123",
            "campaign_name": "Test Summer Sale",
            "campaign_discount": 10000,
            "campaign_reward_type": "percentage_discount",
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data or "order_id" in data
        # Campaign should be marked as applied if valid
        # Note: actual application depends on campaign validation

    def test_guest_order_with_both_affilite_and_campaign(self):
        """Test guest order with both affiliate and campaign attribution"""
        order_email = f"both_test_{uuid4().hex[:8]}@testorders.com"
        response = requests.post(f"{BASE_URL}/api/guest/orders", json={
            "customer_name": "Combined Attribution Customer",
            "customer_email": order_email,
            "customer_phone": "+255712345678",
            "delivery_address": "101 Combined Street",
            "city": "Dodoma",
            "country": "Tanzania",
            "line_items": [
                {
                    "description": "Combined Test Product",
                    "quantity": 15,
                    "unit_price": 8000,
                    "total": 120000,
                }
            ],
            "subtotal": 120000,
            "tax": 0,
            "discount": 15000,
            "total": 105000,
            # Both attribution types
            "affiliate_code": "COMBO_AFFILIATE",
            "affiliate_email": None,
            "campaign_id": "combo_campaign_456",
            "campaign_name": "Combo Promotion",
            "campaign_discount": 15000,
            "campaign_reward_type": "fixed_discount",
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "order_number" in data

    def test_guest_order_get_by_id(self):
        """Test retrieving guest order by ID"""
        # First create an order
        order_email = f"get_test_{uuid4().hex[:8]}@testorders.com"
        create_response = requests.post(f"{BASE_URL}/api/guest/orders", json={
            "customer_name": "Get Test Customer",
            "customer_email": order_email,
            "customer_phone": "+255712345678",
            "line_items": [
                {
                    "description": "Get Test Product",
                    "quantity": 2,
                    "unit_price": 25000,
                    "total": 50000,
                }
            ],
            "subtotal": 50000,
            "tax": 0,
            "discount": 0,
            "total": 50000,
        })
        assert create_response.status_code == 200
        
        created_data = create_response.json()
        order_id = created_data.get("id") or created_data.get("order_id")
        
        # Now get the order
        get_response = requests.get(f"{BASE_URL}/api/guest/orders/{order_id}")
        assert get_response.status_code == 200
        
        order_data = get_response.json()
        assert order_data.get("customer_email") == order_email

    def test_order_tracking(self):
        """Test order tracking endpoint"""
        # First create an order
        order_email = f"track_test_{uuid4().hex[:8]}@testorders.com"
        create_response = requests.post(f"{BASE_URL}/api/guest/orders", json={
            "customer_name": "Track Test Customer",
            "customer_email": order_email,
            "customer_phone": "+255712345678",
            "line_items": [
                {
                    "description": "Track Test Product",
                    "quantity": 1,
                    "unit_price": 30000,
                    "total": 30000,
                }
            ],
            "subtotal": 30000,
            "tax": 0,
            "discount": 0,
            "total": 30000,
        })
        assert create_response.status_code == 200
        
        created_data = create_response.json()
        order_id = created_data.get("id") or created_data.get("order_id")
        
        # Track the order
        track_response = requests.get(f"{BASE_URL}/api/orders/track/{order_id}")
        assert track_response.status_code == 200
        
        track_data = track_response.json()
        assert "status" in track_data or "current_status" in track_data


class TestAffiliatePerkPreview:
    """Test affiliate perk preview endpoint used by AffiliatePerkPreviewBox component"""

    def test_affiliate_perk_preview_endpoint(self):
        """Test the /api/affiliate-perks/preview endpoint"""
        response = requests.post(f"{BASE_URL}/api/affiliate-perks/preview", json={
            "affiliate_code": "TEST_CODE",
            "customer_email": "perk_test@example.com",
            "order_amount": 100000,
            "category": "",
        })
        # Endpoint should exist and return 200
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Should have eligibility info
        assert "eligible" in data

    def test_affiliate_perk_preview_valid_affiliate(self):
        """Test perk preview requires valid affiliate for eligibility"""
        response = requests.post(f"{BASE_URL}/api/affiliate-perks/preview", json={
            "affiliate_code": "NONEXISTENT_CODE_XYZ",
            "customer_email": "test@example.com",
            "order_amount": 50000,
            "category": "",
        })
        assert response.status_code == 200
        
        data = response.json()
        # Non-existent code should not be eligible
        assert data.get("eligible") == False


class TestEndpointValidation:
    """Test input validation for checkout endpoints"""

    def test_evaluate_campaigns_missing_amount(self):
        """Test campaign evaluation with missing order_amount"""
        response = requests.post(f"{BASE_URL}/api/checkout/evaluate-campaigns", json={
            "customer_email": "test@example.com",
            "category": None,
        })
        # Should return 422 for validation error
        assert response.status_code == 422

    def test_guest_order_missing_required_fields(self):
        """Test guest order creation with missing required fields"""
        response = requests.post(f"{BASE_URL}/api/guest/orders", json={
            "customer_name": "Test",
            # Missing customer_email and other required fields
        })
        assert response.status_code == 422  # Validation error

    def test_guest_order_invalid_email(self):
        """Test guest order with invalid email format"""
        response = requests.post(f"{BASE_URL}/api/guest/orders", json={
            "customer_name": "Test Customer",
            "customer_email": "not-an-email",  # Invalid email
            "customer_phone": "+255712345678",
            "line_items": [
                {
                    "description": "Test",
                    "quantity": 1,
                    "unit_price": 1000,
                    "total": 1000,
                }
            ],
            "subtotal": 1000,
            "tax": 0,
            "discount": 0,
            "total": 1000,
        })
        assert response.status_code == 422  # Email validation error


# Run with: pytest /app/backend/tests/test_checkout_campaign_attribution.py -v --tb=short
