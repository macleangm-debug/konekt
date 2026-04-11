"""
Test: Promotion Display + Affiliate Attribution Correctness (v273)

Tests for:
1. POST /api/admin/promotions - creates promotion with discount_type=policy_driven, discount_value=0 (no discount fields required)
2. POST /api/admin/affiliates - creates affiliate with auto-commission from settings (no commission input)
3. Attribution helper captures ?aff= URL parameter
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Admin credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


class TestAdminAuth:
    """Admin authentication for subsequent tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        token = data.get("token") or data.get("access_token")
        assert token, "No token in response"
        return token


class TestPromotionCreationWithoutDiscountFields(TestAdminAuth):
    """Test promotion creation without discount_type/discount_value fields"""
    
    def test_create_promotion_without_discount_fields(self, admin_token):
        """POST /api/admin/promotions with only name, code, scope, stacking_rule should succeed"""
        unique_code = f"TEST{uuid.uuid4().hex[:8].upper()}"
        
        payload = {
            "name": f"Test Promo {unique_code}",
            "code": unique_code,
            "scope": "global",
            "stacking_rule": "no_stack"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/promotions",
            json=payload,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code in [200, 201], f"Promotion creation failed: {response.text}"
        data = response.json()
        
        # Verify promotion was created
        promo = data.get("promotion") or data
        assert promo.get("code") == unique_code
        assert promo.get("name") == f"Test Promo {unique_code}"
        
        # Verify discount_type defaults to policy_driven
        assert promo.get("discount_type") == "policy_driven", f"Expected discount_type='policy_driven', got '{promo.get('discount_type')}'"
        
        # Verify discount_value defaults to 0
        assert promo.get("discount_value") == 0, f"Expected discount_value=0, got {promo.get('discount_value')}"
        
        # Cleanup
        promo_id = promo.get("id")
        if promo_id:
            requests.delete(
                f"{BASE_URL}/api/admin/promotions/{promo_id}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
        
        print(f"✓ Promotion created with policy_driven discount_type and discount_value=0")
    
    def test_create_promotion_with_category_scope(self, admin_token):
        """Test promotion with category scope defaults to policy_driven"""
        unique_code = f"TESTCAT{uuid.uuid4().hex[:6].upper()}"
        
        payload = {
            "name": f"Category Promo {unique_code}",
            "code": unique_code,
            "scope": "category",
            "target_category_id": "test-category-id",
            "target_category_name": "Test Category",
            "stacking_rule": "stack_with_cap"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/promotions",
            json=payload,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code in [200, 201], f"Category promotion creation failed: {response.text}"
        data = response.json()
        promo = data.get("promotion") or data
        
        assert promo.get("discount_type") == "policy_driven"
        assert promo.get("discount_value") == 0
        assert promo.get("scope") == "category"
        
        # Cleanup
        promo_id = promo.get("id")
        if promo_id:
            requests.delete(
                f"{BASE_URL}/api/admin/promotions/{promo_id}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
        
        print(f"✓ Category promotion created with policy_driven discount")


class TestAffiliateCreationWithoutCommission(TestAdminAuth):
    """Test affiliate creation without commission input - auto-fetched from settings"""
    
    def test_create_affiliate_without_commission_fields(self, admin_token):
        """POST /api/admin/affiliates with identity + payout fields only (no commission)"""
        unique_code = f"TESTAFF{uuid.uuid4().hex[:6].upper()}"
        unique_email = f"testaff{uuid.uuid4().hex[:6]}@test.com"
        
        payload = {
            "name": "Test Affiliate Partner",
            "phone": "+255712345678",
            "email": unique_email,
            "affiliate_code": unique_code,
            "is_active": True,
            "payout_method": "mobile_money",
            "mobile_money_number": "0712345678",
            "mobile_money_provider": "M-Pesa"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/affiliates",
            json=payload,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code in [200, 201], f"Affiliate creation failed: {response.text}"
        data = response.json()
        
        affiliate = data.get("affiliate") or data
        assert affiliate.get("affiliate_code") == unique_code
        assert affiliate.get("email") == unique_email
        
        # Verify commission was auto-set from settings (not from form input)
        # Commission should be present and set by system
        assert "commission_type" in affiliate, "commission_type should be auto-set"
        assert "commission_value" in affiliate, "commission_value should be auto-set"
        
        print(f"✓ Affiliate created with auto-commission: {affiliate.get('commission_type')}={affiliate.get('commission_value')}")
        
        # Cleanup
        aff_id = affiliate.get("id")
        if aff_id:
            requests.delete(
                f"{BASE_URL}/api/admin/affiliates/{aff_id}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
    
    def test_list_affiliates_returns_commission_from_settings(self, admin_token):
        """GET /api/admin/affiliates should return affiliates with commission from settings"""
        response = requests.get(
            f"{BASE_URL}/api/admin/affiliates",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"List affiliates failed: {response.text}"
        data = response.json()
        affiliates = data.get("affiliates", [])
        
        # If there are affiliates, verify they have commission fields
        # Note: older affiliates may have commission_rate, newer ones have commission_type/commission_value
        if affiliates:
            for aff in affiliates[:3]:  # Check first 3
                has_commission = (
                    "commission_type" in aff or 
                    "commission_value" in aff or 
                    "commission_rate" in aff  # Legacy field
                )
                assert has_commission, \
                    f"Affiliate {aff.get('affiliate_code')} missing commission fields"
        
        print(f"✓ Listed {len(affiliates)} affiliates with commission data")


class TestPromotionListingPolicyDriven(TestAdminAuth):
    """Test that promotions list returns policy_driven promotions correctly"""
    
    def test_list_promotions_shows_policy_driven(self, admin_token):
        """GET /api/admin/promotions should return promotions with discount_type"""
        response = requests.get(
            f"{BASE_URL}/api/admin/promotions",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"List promotions failed: {response.text}"
        data = response.json()
        promotions = data.get("promotions", [])
        
        # Check that policy_driven promotions exist and have correct structure
        policy_driven_count = 0
        for promo in promotions:
            if promo.get("discount_type") == "policy_driven":
                policy_driven_count += 1
                assert promo.get("discount_value") == 0, \
                    f"Policy-driven promo {promo.get('code')} should have discount_value=0"
        
        print(f"✓ Found {policy_driven_count} policy-driven promotions out of {len(promotions)} total")


class TestCheckoutAttributionDetection:
    """Test checkout attribution detection endpoint"""
    
    def test_detect_attribution_with_affiliate_code(self):
        """Test /api/checkout/detect-attribution with affiliate code"""
        # First, we need to check if there's an affiliate to test with
        # Try with a test code
        response = requests.get(
            f"{BASE_URL}/api/checkout/detect-attribution?affiliate=TESTCODE"
        )
        
        # Should return 200 even if no affiliate found
        assert response.status_code == 200, f"Attribution detection failed: {response.text}"
        data = response.json()
        
        # Response should have has_attribution field
        assert "has_attribution" in data, "Response should have has_attribution field"
        
        print(f"✓ Attribution detection endpoint working: has_attribution={data.get('has_attribution')}")


class TestCleanup(TestAdminAuth):
    """Cleanup test data"""
    
    def test_cleanup_test_promotions(self, admin_token):
        """Delete all TEST* promotions"""
        response = requests.get(
            f"{BASE_URL}/api/admin/promotions",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            promotions = data.get("promotions", [])
            deleted = 0
            for promo in promotions:
                code = promo.get("code", "")
                if code.startswith("TEST"):
                    promo_id = promo.get("id")
                    if promo_id:
                        requests.delete(
                            f"{BASE_URL}/api/admin/promotions/{promo_id}",
                            headers={"Authorization": f"Bearer {admin_token}"}
                        )
                        deleted += 1
            print(f"✓ Cleaned up {deleted} test promotions")
    
    def test_cleanup_test_affiliates(self, admin_token):
        """Delete all TESTAFF* affiliates"""
        response = requests.get(
            f"{BASE_URL}/api/admin/affiliates",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            affiliates = data.get("affiliates", [])
            deleted = 0
            for aff in affiliates:
                code = aff.get("affiliate_code", "")
                if code.startswith("TESTAFF"):
                    aff_id = aff.get("id")
                    if aff_id:
                        requests.delete(
                            f"{BASE_URL}/api/admin/affiliates/{aff_id}",
                            headers={"Authorization": f"Bearer {admin_token}"}
                        )
                        deleted += 1
            print(f"✓ Cleaned up {deleted} test affiliates")
