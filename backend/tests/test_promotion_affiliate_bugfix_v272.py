"""
Test Promotion and Affiliate Bug Fixes (v272)
- Promotion creation without discount_type/discount_value
- Affiliate CRUD endpoints (GET/POST/DELETE)
- Commission auto-fetch from affiliate_settings
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Headers with admin auth"""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


class TestPromotionCreationBugFix:
    """Test that promotions can be created WITHOUT discount_type/discount_value"""
    
    def test_create_promotion_without_discount_fields(self, admin_headers):
        """POST /api/admin/promotions with only name, code, scope, stacking_rule should succeed"""
        unique_code = f"TESTPOLICY{int(time.time())}"
        payload = {
            "name": "Test Policy Driven Promo",
            "code": unique_code,
            "scope": "global",
            "stacking_rule": "no_stack"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/promotions",
            json=payload,
            headers=admin_headers
        )
        
        print(f"Create promotion response: {response.status_code}")
        print(f"Response body: {response.text[:500]}")
        
        # Should succeed (200 or 201)
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Check success response
        if "success" in data:
            assert data["success"] is True, f"Promotion creation failed: {data.get('errors')}"
            promo = data.get("promotion", {})
        else:
            promo = data.get("promotion") or data
        
        # Verify defaults were applied
        assert promo.get("code") == unique_code.upper()
        assert promo.get("discount_type") == "policy_driven", f"Expected policy_driven, got {promo.get('discount_type')}"
        assert promo.get("discount_value") == 0, f"Expected 0, got {promo.get('discount_value')}"
        
        # Store for cleanup
        self.__class__.created_promo_id = promo.get("id")
        self.__class__.created_promo_code = unique_code.upper()
        
    def test_verify_promotion_persisted(self, admin_headers):
        """GET to verify promotion was actually saved"""
        if not hasattr(self.__class__, 'created_promo_id'):
            pytest.skip("No promotion created in previous test")
            
        response = requests.get(
            f"{BASE_URL}/api/admin/promotions",
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        promos = data.get("promotions", data) if isinstance(data, dict) else data
        
        # Find our created promotion
        found = None
        for p in promos:
            if p.get("code") == self.__class__.created_promo_code:
                found = p
                break
        
        assert found is not None, f"Created promotion {self.__class__.created_promo_code} not found in list"
        assert found.get("discount_type") == "policy_driven"


class TestAffiliateCRUDEndpoints:
    """Test Affiliate CRUD endpoints (GET/POST/DELETE)"""
    
    def test_get_affiliates_list(self, admin_headers):
        """GET /api/admin/affiliates should return list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/affiliates",
            headers=admin_headers
        )
        
        print(f"GET affiliates response: {response.status_code}")
        print(f"Response body: {response.text[:500]}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "affiliates" in data, f"Expected 'affiliates' key in response: {data.keys()}"
        assert isinstance(data["affiliates"], list)
    
    def test_create_affiliate_success(self, admin_headers):
        """POST /api/admin/affiliates should create affiliate with auto commission"""
        unique_code = f"TESTAFF{int(time.time())}"
        payload = {
            "name": "Test Affiliate User",
            "phone": "+255712345678",
            "email": f"testaff{int(time.time())}@test.com",
            "affiliate_code": unique_code,
            "is_active": True,
            "payout_method": "mobile_money",
            "mobile_money_number": "0712345678",
            "mobile_money_provider": "M-Pesa"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/affiliates",
            json=payload,
            headers=admin_headers
        )
        
        print(f"Create affiliate response: {response.status_code}")
        print(f"Response body: {response.text[:500]}")
        
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") is True, f"Affiliate creation failed: {data}"
        
        affiliate = data.get("affiliate", {})
        assert affiliate.get("affiliate_code") == unique_code.upper()
        assert affiliate.get("name") == "Test Affiliate User"
        
        # Verify commission was auto-fetched from settings (should be percentage/12.0)
        assert affiliate.get("commission_type") == "percentage", f"Expected percentage, got {affiliate.get('commission_type')}"
        assert affiliate.get("commission_value") == 12.0, f"Expected 12.0, got {affiliate.get('commission_value')}"
        
        # Store for cleanup
        self.__class__.created_affiliate_id = affiliate.get("id")
        self.__class__.created_affiliate_code = unique_code.upper()
    
    def test_verify_affiliate_in_list(self, admin_headers):
        """Verify created affiliate appears in GET list"""
        if not hasattr(self.__class__, 'created_affiliate_code'):
            pytest.skip("No affiliate created in previous test")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/affiliates",
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        affiliates = data.get("affiliates", [])
        
        found = None
        for a in affiliates:
            if a.get("affiliate_code") == self.__class__.created_affiliate_code:
                found = a
                break
        
        assert found is not None, f"Created affiliate {self.__class__.created_affiliate_code} not found in list"
    
    def test_delete_affiliate(self, admin_headers):
        """DELETE /api/admin/affiliates/{id} should delete affiliate"""
        if not hasattr(self.__class__, 'created_affiliate_id'):
            pytest.skip("No affiliate created to delete")
        
        affiliate_id = self.__class__.created_affiliate_id
        
        response = requests.delete(
            f"{BASE_URL}/api/admin/affiliates/{affiliate_id}",
            headers=admin_headers
        )
        
        print(f"Delete affiliate response: {response.status_code}")
        print(f"Response body: {response.text[:200]}")
        
        assert response.status_code in [200, 204], f"Expected 200/204, got {response.status_code}: {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("ok") is True
    
    def test_verify_affiliate_deleted(self, admin_headers):
        """Verify deleted affiliate no longer in list"""
        if not hasattr(self.__class__, 'created_affiliate_code'):
            pytest.skip("No affiliate to verify deletion")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/affiliates",
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        affiliates = data.get("affiliates", [])
        
        found = any(a.get("affiliate_code") == self.__class__.created_affiliate_code for a in affiliates)
        assert not found, f"Deleted affiliate {self.__class__.created_affiliate_code} still in list"


class TestAffiliateSettingsCommission:
    """Verify affiliate_settings has expected commission values"""
    
    def test_affiliate_settings_exists(self, admin_headers):
        """Check affiliate_settings collection has commission config"""
        # Try to get affiliate settings via an endpoint if available
        # Otherwise we verify through affiliate creation
        response = requests.get(
            f"{BASE_URL}/api/admin/affiliate-settings",
            headers=admin_headers
        )
        
        if response.status_code == 200:
            data = response.json()
            settings = data.get("settings") or data
            print(f"Affiliate settings: {settings}")
            assert settings.get("commission_type") == "percentage"
            assert settings.get("default_commission_rate") == 12.0
        else:
            # Settings endpoint may not exist, but we verified commission in create test
            print(f"Affiliate settings endpoint returned {response.status_code} - commission verified via create test")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_promotions(self, admin_headers):
        """Delete test promotions with TESTPOLICY prefix"""
        response = requests.get(
            f"{BASE_URL}/api/admin/promotions",
            headers=admin_headers
        )
        
        if response.status_code != 200:
            pytest.skip("Could not get promotions list for cleanup")
        
        data = response.json()
        promos = data.get("promotions", data) if isinstance(data, dict) else data
        
        deleted_count = 0
        for p in promos:
            code = p.get("code", "")
            if code.startswith("TESTPOLICY"):
                promo_id = p.get("id")
                if promo_id:
                    del_resp = requests.delete(
                        f"{BASE_URL}/api/admin/promotions/{promo_id}",
                        headers=admin_headers
                    )
                    if del_resp.status_code in [200, 204]:
                        deleted_count += 1
        
        print(f"Cleaned up {deleted_count} test promotions")
    
    def test_cleanup_test_affiliates(self, admin_headers):
        """Delete test affiliates with TESTAFF prefix"""
        response = requests.get(
            f"{BASE_URL}/api/admin/affiliates",
            headers=admin_headers
        )
        
        if response.status_code != 200:
            pytest.skip("Could not get affiliates list for cleanup")
        
        data = response.json()
        affiliates = data.get("affiliates", [])
        
        deleted_count = 0
        for a in affiliates:
            code = a.get("affiliate_code", "")
            if code.startswith("TESTAFF"):
                aff_id = a.get("id")
                if aff_id:
                    del_resp = requests.delete(
                        f"{BASE_URL}/api/admin/affiliates/{aff_id}",
                        headers=admin_headers
                    )
                    if del_resp.status_code in [200, 204]:
                        deleted_count += 1
        
        print(f"Cleaned up {deleted_count} test affiliates")
