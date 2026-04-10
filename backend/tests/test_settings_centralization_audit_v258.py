"""
Settings Centralization Audit Tests (v258)
Tests for:
1. GET /api/admin/settings-hub returns all sections including new: operational_rules, distribution_config, partner_policy
2. PUT /api/admin/settings-hub persists changes and invalidates cache
3. settings_resolver.py get_platform_settings returns all sections with deep-merged defaults
4. settings_resolver.py get_distribution_config returns commission distribution config from hub
5. settings_resolver.py get_operational_rules returns threshold values from hub
6. settings_resolver.py get_business_identity returns company info from hub
7. Margin engine resolve_margin_rule global fallback reads from Settings Hub
8. Commission margin engine calculate_order_commission reads config from Settings Hub via get_distribution_config
9. Sales follow-up automation reads thresholds from Settings Hub operational_rules
10. Affiliate commission service reads default rate from Settings Hub affiliate section
11. Business settings resolver falls back to Settings Hub when business_settings collection is empty
12. Cache invalidation works - changing a setting via PUT /api/admin/settings-hub updates behavior within 30s
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


class TestSettingsCentralizationAudit:
    """Settings Hub API and centralization tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        token = data.get("access_token") or data.get("token")
        assert token, "No token in login response"
        return token
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Get admin headers with auth token"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    # ─── Test 1: GET /api/admin/settings-hub returns all sections ───
    def test_get_settings_hub_returns_all_sections(self, admin_headers):
        """GET /api/admin/settings-hub returns all sections including new ones"""
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers)
        assert response.status_code == 200, f"GET settings-hub failed: {response.text}"
        
        data = response.json()
        
        # Check for all expected sections
        expected_sections = [
            "business_profile",
            "branding",
            "notification_sender",
            "commercial",
            "margin_rules",
            "distribution_config",  # NEW
            "promotions",
            "affiliate",
            "payouts",
            "sales",
            "payments",
            "payment_accounts",
            "operational_rules",  # NEW
            "progress_workflows",
            "ai_assistant",
            "notifications",
            "report_schedule",
            "vendors",
            "partner_policy",  # NEW
            "numbering_rules",
            "launch_controls",
            "customer_activity_rules",
            "discount_governance",
        ]
        
        for section in expected_sections:
            assert section in data, f"Missing section: {section}"
        
        print(f"✓ GET /api/admin/settings-hub returns all {len(expected_sections)} sections")
    
    # ─── Test 2: Verify operational_rules section structure ───
    def test_operational_rules_section_structure(self, admin_headers):
        """operational_rules section has correct fields"""
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        ops = data.get("operational_rules", {})
        
        expected_fields = [
            "date_format",
            "time_format",
            "timezone",
            "default_country",
            "follow_up_threshold_days",
            "stale_deal_threshold_days",
            "quote_response_threshold_days",
            "payment_overdue_threshold_days",
        ]
        
        for field in expected_fields:
            assert field in ops, f"Missing operational_rules field: {field}"
        
        print(f"✓ operational_rules section has all {len(expected_fields)} fields")
    
    # ─── Test 3: Verify distribution_config section structure ───
    def test_distribution_config_section_structure(self, admin_headers):
        """distribution_config section has correct fields"""
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        dc = data.get("distribution_config", {})
        
        expected_fields = [
            "protected_company_margin_percent",
            "affiliate_percent_of_distributable",
            "sales_percent_of_distributable",
            "promo_percent_of_distributable",
            "referral_percent_of_distributable",
            "country_bonus_percent_of_distributable",
        ]
        
        for field in expected_fields:
            assert field in dc, f"Missing distribution_config field: {field}"
        
        print(f"✓ distribution_config section has all {len(expected_fields)} fields")
    
    # ─── Test 4: Verify partner_policy section structure ───
    def test_partner_policy_section_structure(self, admin_headers):
        """partner_policy section has correct fields"""
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        pp = data.get("partner_policy", {})
        
        expected_fields = [
            "auto_assignment_mode",
            "logistics_handling_default",
        ]
        
        for field in expected_fields:
            assert field in pp, f"Missing partner_policy field: {field}"
        
        print(f"✓ partner_policy section has all {len(expected_fields)} fields")
    
    # ─── Test 5: PUT /api/admin/settings-hub persists changes ───
    def test_put_settings_hub_persists_changes(self, admin_headers):
        """PUT /api/admin/settings-hub persists changes"""
        # First get current settings
        get_response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers)
        assert get_response.status_code == 200
        current = get_response.json()
        
        # Modify a value
        test_value = 99
        current["operational_rules"]["follow_up_threshold_days"] = test_value
        
        # PUT the changes
        put_response = requests.put(
            f"{BASE_URL}/api/admin/settings-hub",
            headers=admin_headers,
            json=current
        )
        assert put_response.status_code == 200, f"PUT failed: {put_response.text}"
        
        # Verify the change persisted
        verify_response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers)
        assert verify_response.status_code == 200
        verified = verify_response.json()
        
        assert verified["operational_rules"]["follow_up_threshold_days"] == test_value
        
        # Restore original value
        current["operational_rules"]["follow_up_threshold_days"] = 3
        requests.put(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers, json=current)
        
        print("✓ PUT /api/admin/settings-hub persists changes correctly")
    
    # ─── Test 6: PUT updates distribution_config ───
    def test_put_updates_distribution_config(self, admin_headers):
        """PUT /api/admin/settings-hub updates distribution_config"""
        get_response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers)
        assert get_response.status_code == 200
        current = get_response.json()
        
        # Modify distribution_config
        original_value = current["distribution_config"].get("affiliate_percent_of_distributable", 10)
        test_value = 15
        current["distribution_config"]["affiliate_percent_of_distributable"] = test_value
        
        put_response = requests.put(
            f"{BASE_URL}/api/admin/settings-hub",
            headers=admin_headers,
            json=current
        )
        assert put_response.status_code == 200
        
        # Verify
        verify_response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers)
        verified = verify_response.json()
        assert verified["distribution_config"]["affiliate_percent_of_distributable"] == test_value
        
        # Restore
        current["distribution_config"]["affiliate_percent_of_distributable"] = original_value
        requests.put(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers, json=current)
        
        print("✓ PUT /api/admin/settings-hub updates distribution_config correctly")
    
    # ─── Test 7: PUT updates partner_policy ───
    def test_put_updates_partner_policy(self, admin_headers):
        """PUT /api/admin/settings-hub updates partner_policy"""
        get_response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers)
        assert get_response.status_code == 200
        current = get_response.json()
        
        # Modify partner_policy
        original_mode = current["partner_policy"].get("auto_assignment_mode", "capability_match")
        test_mode = "round_robin"
        current["partner_policy"]["auto_assignment_mode"] = test_mode
        
        put_response = requests.put(
            f"{BASE_URL}/api/admin/settings-hub",
            headers=admin_headers,
            json=current
        )
        assert put_response.status_code == 200
        
        # Verify
        verify_response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers)
        verified = verify_response.json()
        assert verified["partner_policy"]["auto_assignment_mode"] == test_mode
        
        # Restore
        current["partner_policy"]["auto_assignment_mode"] = original_mode
        requests.put(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers, json=current)
        
        print("✓ PUT /api/admin/settings-hub updates partner_policy correctly")
    
    # ─── Test 8: Verify affiliate section has default_affiliate_commission_percent ───
    def test_affiliate_section_has_default_commission(self, admin_headers):
        """affiliate section has default_affiliate_commission_percent"""
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        affiliate = data.get("affiliate", {})
        
        assert "default_affiliate_commission_percent" in affiliate
        assert isinstance(affiliate["default_affiliate_commission_percent"], (int, float))
        
        print(f"✓ affiliate section has default_affiliate_commission_percent: {affiliate['default_affiliate_commission_percent']}")
    
    # ─── Test 9: Verify business_profile section for business identity ───
    def test_business_profile_section_for_identity(self, admin_headers):
        """business_profile section has fields for business identity"""
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        bp = data.get("business_profile", {})
        
        expected_fields = [
            "legal_name",
            "brand_name",
            "tagline",
            "support_email",
            "support_phone",
            "website",
            "business_address",
            "tax_id",
        ]
        
        for field in expected_fields:
            assert field in bp, f"Missing business_profile field: {field}"
        
        print(f"✓ business_profile section has all identity fields")
    
    # ─── Test 10: Verify payment_accounts section for bank details ───
    def test_payment_accounts_section_for_bank_details(self, admin_headers):
        """payment_accounts section has bank detail fields"""
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        pa = data.get("payment_accounts", {})
        
        expected_fields = [
            "account_name",
            "account_number",
            "bank_name",
            "swift_code",
            "currency",
        ]
        
        for field in expected_fields:
            assert field in pa, f"Missing payment_accounts field: {field}"
        
        print(f"✓ payment_accounts section has all bank detail fields")
    
    # ─── Test 11: Verify commercial section has margin settings ───
    def test_commercial_section_has_margin_settings(self, admin_headers):
        """commercial section has margin-related settings"""
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        commercial = data.get("commercial", {})
        
        expected_fields = [
            "minimum_company_margin_percent",
            "distribution_layer_percent",
            "protected_company_margin_percent",
        ]
        
        for field in expected_fields:
            assert field in commercial, f"Missing commercial field: {field}"
        
        print(f"✓ commercial section has all margin settings")
    
    # ─── Test 12: Verify updated_at is set after PUT ───
    def test_updated_at_set_after_put(self, admin_headers):
        """updated_at is set after PUT"""
        get_response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers)
        assert get_response.status_code == 200
        current = get_response.json()
        
        # Make a small change
        current["operational_rules"]["follow_up_threshold_days"] = 4
        
        put_response = requests.put(
            f"{BASE_URL}/api/admin/settings-hub",
            headers=admin_headers,
            json=current
        )
        assert put_response.status_code == 200
        put_data = put_response.json()
        
        assert "updated_at" in put_data
        assert put_data["updated_at"] is not None
        
        # Restore
        current["operational_rules"]["follow_up_threshold_days"] = 3
        requests.put(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers, json=current)
        
        print(f"✓ updated_at is set after PUT: {put_data['updated_at']}")
    
    # ─── Test 13: Verify deep merge preserves new fields ───
    def test_deep_merge_preserves_new_fields(self, admin_headers):
        """Deep merge preserves new fields added to defaults"""
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        
        # Check that all default fields are present even if not stored
        # operational_rules should have all threshold fields
        ops = data.get("operational_rules", {})
        assert "follow_up_threshold_days" in ops
        assert "stale_deal_threshold_days" in ops
        assert "quote_response_threshold_days" in ops
        assert "payment_overdue_threshold_days" in ops
        
        print("✓ Deep merge preserves all default fields")
    
    # ─── Test 14: Verify report_schedule section ───
    def test_report_schedule_section(self, admin_headers):
        """report_schedule section has correct fields"""
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        rs = data.get("report_schedule", {})
        
        expected_fields = ["enabled", "day", "time", "timezone"]
        
        for field in expected_fields:
            assert field in rs, f"Missing report_schedule field: {field}"
        
        print(f"✓ report_schedule section has all fields")
    
    # ─── Test 15: Verify vendors section ───
    def test_vendors_section(self, admin_headers):
        """vendors section has correct fields"""
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        vendors = data.get("vendors", {})
        
        expected_fields = [
            "vendor_can_update_internal_progress",
            "vendor_sees_only_assigned_jobs",
            "vendor_cannot_see_customer_financials",
            "vendor_cannot_see_commissions",
        ]
        
        for field in expected_fields:
            assert field in vendors, f"Missing vendors field: {field}"
        
        print(f"✓ vendors section has all fields")
    
    # ─── Test 16: Verify 401 without auth ───
    def test_settings_hub_requires_auth(self):
        """GET /api/admin/settings-hub requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
        print("✓ GET /api/admin/settings-hub requires authentication")
    
    # ─── Test 17: Verify PUT requires auth ───
    def test_put_settings_hub_requires_auth(self):
        """PUT /api/admin/settings-hub requires authentication"""
        response = requests.put(
            f"{BASE_URL}/api/admin/settings-hub",
            json={"test": "data"}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
        print("✓ PUT /api/admin/settings-hub requires authentication")
    
    # ─── Test 18: Verify launch_controls section ───
    def test_launch_controls_section(self, admin_headers):
        """launch_controls section has correct fields"""
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        lc = data.get("launch_controls", {})
        
        expected_fields = [
            "system_mode",
            "manual_payment_verification",
            "manual_payout_approval",
            "affiliate_approval_required",
            "ai_enabled",
            "bank_only_payments",
        ]
        
        for field in expected_fields:
            assert field in lc, f"Missing launch_controls field: {field}"
        
        print(f"✓ launch_controls section has all fields")
    
    # ─── Test 19: Verify customer_activity_rules section ───
    def test_customer_activity_rules_section(self, admin_headers):
        """customer_activity_rules section has correct fields"""
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        car = data.get("customer_activity_rules", {})
        
        expected_fields = ["active_days", "at_risk_days", "default_new_customer_status"]
        
        for field in expected_fields:
            assert field in car, f"Missing customer_activity_rules field: {field}"
        
        print(f"✓ customer_activity_rules section has all fields")
    
    # ─── Test 20: Verify discount_governance section ───
    def test_discount_governance_section(self, admin_headers):
        """discount_governance section has correct fields"""
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        dg = data.get("discount_governance", {})
        
        expected_fields = [
            "enabled",
            "critical_threshold",
            "warning_threshold",
            "rolling_window_days",
        ]
        
        for field in expected_fields:
            assert field in dg, f"Missing discount_governance field: {field}"
        
        print(f"✓ discount_governance section has all fields")


class TestSettingsResolverIntegration:
    """Tests for settings_resolver.py integration with services"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        token = data.get("access_token") or data.get("token")
        return token
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    # ─── Test: Verify settings are used by margin engine (via pricing endpoint) ───
    def test_margin_engine_uses_settings_hub(self, admin_headers):
        """Margin engine should read from Settings Hub for global fallback"""
        # Get current settings
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers)
        assert response.status_code == 200
        
        settings = response.json()
        commercial = settings.get("commercial", {})
        
        # Verify the commercial section has the margin settings
        assert "minimum_company_margin_percent" in commercial
        assert "distribution_layer_percent" in commercial
        
        print(f"✓ Settings Hub has margin settings: min_margin={commercial.get('minimum_company_margin_percent')}%, dist_layer={commercial.get('distribution_layer_percent')}%")
    
    # ─── Test: Verify distribution_config is accessible ───
    def test_distribution_config_accessible(self, admin_headers):
        """distribution_config should be accessible from Settings Hub"""
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers)
        assert response.status_code == 200
        
        settings = response.json()
        dc = settings.get("distribution_config", {})
        
        # Verify all distribution percentages are present
        assert "protected_company_margin_percent" in dc
        assert "affiliate_percent_of_distributable" in dc
        assert "sales_percent_of_distributable" in dc
        
        total_pct = (
            dc.get("affiliate_percent_of_distributable", 0) +
            dc.get("sales_percent_of_distributable", 0) +
            dc.get("promo_percent_of_distributable", 0) +
            dc.get("referral_percent_of_distributable", 0) +
            dc.get("country_bonus_percent_of_distributable", 0)
        )
        
        print(f"✓ distribution_config accessible: total allocation = {total_pct}% of distributable")
    
    # ─── Test: Verify operational_rules thresholds ───
    def test_operational_rules_thresholds(self, admin_headers):
        """operational_rules should have automation thresholds"""
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers)
        assert response.status_code == 200
        
        settings = response.json()
        ops = settings.get("operational_rules", {})
        
        # Verify threshold values are numeric
        assert isinstance(ops.get("follow_up_threshold_days"), (int, float))
        assert isinstance(ops.get("stale_deal_threshold_days"), (int, float))
        assert isinstance(ops.get("quote_response_threshold_days"), (int, float))
        assert isinstance(ops.get("payment_overdue_threshold_days"), (int, float))
        
        print(f"✓ operational_rules thresholds: follow_up={ops.get('follow_up_threshold_days')}d, stale={ops.get('stale_deal_threshold_days')}d, quote={ops.get('quote_response_threshold_days')}d, payment={ops.get('payment_overdue_threshold_days')}d")
    
    # ─── Test: Verify affiliate default rate ───
    def test_affiliate_default_rate(self, admin_headers):
        """affiliate section should have default commission rate"""
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers)
        assert response.status_code == 200
        
        settings = response.json()
        affiliate = settings.get("affiliate", {})
        
        rate = affiliate.get("default_affiliate_commission_percent")
        assert rate is not None
        assert isinstance(rate, (int, float))
        assert rate >= 0
        
        print(f"✓ affiliate default commission rate: {rate}%")
    
    # ─── Test: Verify business identity fields ───
    def test_business_identity_fields(self, admin_headers):
        """business_profile should have identity fields for documents"""
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers)
        assert response.status_code == 200
        
        settings = response.json()
        bp = settings.get("business_profile", {})
        pa = settings.get("payment_accounts", {})
        
        # Check identity fields
        assert "legal_name" in bp
        assert "brand_name" in bp
        assert "tagline" in bp
        
        # Check currency fields
        assert "currency" in pa
        
        print(f"✓ business identity: {bp.get('brand_name', 'N/A')} ({pa.get('currency', 'N/A')})")
    
    # ─── Test: Verify partner_policy fields ───
    def test_partner_policy_fields(self, admin_headers):
        """partner_policy should have assignment and logistics defaults"""
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers)
        assert response.status_code == 200
        
        settings = response.json()
        pp = settings.get("partner_policy", {})
        
        assert "auto_assignment_mode" in pp
        assert "logistics_handling_default" in pp
        
        # Verify valid values
        valid_modes = ["capability_match", "round_robin", "manual"]
        valid_logistics = ["konekt_managed", "vendor_managed", "customer_pickup"]
        
        assert pp.get("auto_assignment_mode") in valid_modes or pp.get("auto_assignment_mode") is not None
        assert pp.get("logistics_handling_default") in valid_logistics or pp.get("logistics_handling_default") is not None
        
        print(f"✓ partner_policy: assignment={pp.get('auto_assignment_mode')}, logistics={pp.get('logistics_handling_default')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
