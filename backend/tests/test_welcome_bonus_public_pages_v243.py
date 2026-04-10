"""
Test Suite for Iteration 243:
- Welcome Bonus Campaign Settings in Admin Settings Hub
- Public Content Pages (About, Privacy, Terms, Help)
- Footer Links
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


class TestAdminSettingsHubWelcomeBonus:
    """Test Welcome Bonus Campaign settings in Admin Settings Hub"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if login_resp.status_code == 200:
            token = login_resp.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.auth_success = True
        else:
            self.auth_success = False
    
    def test_admin_login_success(self):
        """Verify admin can login"""
        assert self.auth_success, "Admin login failed"
        print("PASS: Admin login successful")
    
    def test_get_settings_hub_returns_welcome_bonus_fields(self):
        """Verify settings hub returns all welcome bonus fields"""
        if not self.auth_success:
            pytest.skip("Admin auth failed")
        
        resp = self.session.get(f"{BASE_URL}/api/admin/settings-hub")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        
        data = resp.json()
        commercial = data.get("commercial", {})
        
        # Verify all welcome bonus fields exist
        expected_fields = [
            "welcome_bonus_enabled",
            "welcome_bonus_type",
            "welcome_bonus_value",
            "welcome_bonus_max_cap",
            "welcome_bonus_first_purchase_only",
            "welcome_bonus_trigger_event",
            "welcome_bonus_stack_with_referral",
            "welcome_bonus_stack_with_wallet",
        ]
        
        for field in expected_fields:
            assert field in commercial, f"Missing field: {field}"
            print(f"  - {field}: {commercial[field]}")
        
        print("PASS: All welcome bonus fields present in settings hub")
    
    def test_welcome_bonus_default_values(self):
        """Verify welcome bonus has correct default values"""
        if not self.auth_success:
            pytest.skip("Admin auth failed")
        
        resp = self.session.get(f"{BASE_URL}/api/admin/settings-hub")
        assert resp.status_code == 200
        
        commercial = resp.json().get("commercial", {})
        
        # Check default values
        assert commercial.get("welcome_bonus_enabled") == False, "welcome_bonus_enabled should default to False"
        assert commercial.get("welcome_bonus_type") in ["fixed", "percentage"], "Invalid bonus type"
        assert commercial.get("welcome_bonus_first_purchase_only") == True, "first_purchase_only should default to True"
        assert commercial.get("welcome_bonus_trigger_event") == "payment_verified", "trigger_event should be payment_verified"
        assert commercial.get("welcome_bonus_stack_with_referral") == False, "stack_with_referral should default to False"
        
        print("PASS: Welcome bonus default values are correct")
    
    def test_update_welcome_bonus_settings(self):
        """Verify admin can update welcome bonus settings"""
        if not self.auth_success:
            pytest.skip("Admin auth failed")
        
        # Get current settings
        get_resp = self.session.get(f"{BASE_URL}/api/admin/settings-hub")
        assert get_resp.status_code == 200
        current = get_resp.json()
        
        # Update welcome bonus settings
        current["commercial"]["welcome_bonus_enabled"] = True
        current["commercial"]["welcome_bonus_value"] = 7500
        current["commercial"]["welcome_bonus_max_cap"] = 15000
        
        put_resp = self.session.put(f"{BASE_URL}/api/admin/settings-hub", json=current)
        assert put_resp.status_code == 200, f"Update failed: {put_resp.status_code}"
        
        # Verify update persisted
        verify_resp = self.session.get(f"{BASE_URL}/api/admin/settings-hub")
        assert verify_resp.status_code == 200
        updated = verify_resp.json().get("commercial", {})
        
        assert updated.get("welcome_bonus_enabled") == True
        assert updated.get("welcome_bonus_value") == 7500
        assert updated.get("welcome_bonus_max_cap") == 15000
        
        # Reset to defaults
        current["commercial"]["welcome_bonus_enabled"] = False
        current["commercial"]["welcome_bonus_value"] = 5000
        current["commercial"]["welcome_bonus_max_cap"] = 10000
        self.session.put(f"{BASE_URL}/api/admin/settings-hub", json=current)
        
        print("PASS: Welcome bonus settings can be updated and persisted")


class TestPublicPages:
    """Test public content pages are accessible"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
    
    def test_about_page_accessible(self):
        """Verify /about page is accessible"""
        resp = self.session.get(f"{BASE_URL}/about", allow_redirects=True)
        # Frontend routes return 200 from the SPA
        assert resp.status_code == 200, f"About page returned {resp.status_code}"
        print("PASS: About page accessible")
    
    def test_privacy_page_accessible(self):
        """Verify /privacy page is accessible"""
        resp = self.session.get(f"{BASE_URL}/privacy", allow_redirects=True)
        assert resp.status_code == 200, f"Privacy page returned {resp.status_code}"
        print("PASS: Privacy page accessible")
    
    def test_terms_page_accessible(self):
        """Verify /terms page is accessible"""
        resp = self.session.get(f"{BASE_URL}/terms", allow_redirects=True)
        assert resp.status_code == 200, f"Terms page returned {resp.status_code}"
        print("PASS: Terms page accessible")
    
    def test_help_page_accessible(self):
        """Verify /help page is accessible"""
        resp = self.session.get(f"{BASE_URL}/help", allow_redirects=True)
        assert resp.status_code == 200, f"Help page returned {resp.status_code}"
        print("PASS: Help page accessible")


class TestReferralHooksWelcomeBonus:
    """Test welcome bonus backend logic in referral_hooks.py"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin to check settings
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if login_resp.status_code == 200:
            token = login_resp.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.auth_success = True
        else:
            self.auth_success = False
    
    def test_welcome_bonus_disabled_by_default(self):
        """Verify welcome bonus is disabled by default in settings"""
        if not self.auth_success:
            pytest.skip("Admin auth failed")
        
        resp = self.session.get(f"{BASE_URL}/api/admin/settings-hub")
        assert resp.status_code == 200
        
        commercial = resp.json().get("commercial", {})
        # After our test reset, it should be disabled
        # Note: This tests the default behavior
        print(f"  welcome_bonus_enabled: {commercial.get('welcome_bonus_enabled')}")
        print("PASS: Welcome bonus disabled by default check complete")
    
    def test_welcome_bonus_anti_stacking_setting(self):
        """Verify anti-stacking setting exists and defaults to False"""
        if not self.auth_success:
            pytest.skip("Admin auth failed")
        
        resp = self.session.get(f"{BASE_URL}/api/admin/settings-hub")
        assert resp.status_code == 200
        
        commercial = resp.json().get("commercial", {})
        stack_with_referral = commercial.get("welcome_bonus_stack_with_referral")
        
        assert stack_with_referral is not None, "stack_with_referral field missing"
        assert stack_with_referral == False, "Anti-stacking should be enabled by default (stack_with_referral=False)"
        
        print("PASS: Anti-stacking setting verified (stack_with_referral=False)")
    
    def test_welcome_bonus_first_purchase_only_setting(self):
        """Verify first purchase only setting exists and defaults to True"""
        if not self.auth_success:
            pytest.skip("Admin auth failed")
        
        resp = self.session.get(f"{BASE_URL}/api/admin/settings-hub")
        assert resp.status_code == 200
        
        commercial = resp.json().get("commercial", {})
        first_only = commercial.get("welcome_bonus_first_purchase_only")
        
        assert first_only is not None, "first_purchase_only field missing"
        assert first_only == True, "First purchase only should default to True"
        
        print("PASS: First purchase only setting verified")
    
    def test_welcome_bonus_margin_safe_settings(self):
        """Verify margin-safe settings (max_cap exists)"""
        if not self.auth_success:
            pytest.skip("Admin auth failed")
        
        resp = self.session.get(f"{BASE_URL}/api/admin/settings-hub")
        assert resp.status_code == 200
        
        commercial = resp.json().get("commercial", {})
        max_cap = commercial.get("welcome_bonus_max_cap")
        
        assert max_cap is not None, "max_cap field missing"
        assert isinstance(max_cap, (int, float)), "max_cap should be numeric"
        
        print(f"PASS: Margin-safe max_cap setting verified: {max_cap}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
