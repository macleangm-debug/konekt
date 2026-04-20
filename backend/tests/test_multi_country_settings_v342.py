"""
Test Multi-Country Settings Architecture - Iteration 342
Tests:
1. GET /api/admin/settings-hub?country=TZ returns TZ settings with 18% VAT
2. GET /api/admin/settings-hub?country=KE returns KE-specific settings with 16% VAT and KES currency
3. POST /api/admin/settings-hub/replicate copies settings from source to target with country adjustments
4. PUT /api/admin/settings-hub?country=KE saves settings under settings_hub_KE key
5. Dashboard loads with KPI cards
6. Sidebar feedback badge shows count
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")


@pytest.fixture
def admin_headers(admin_token):
    """Headers with admin auth token"""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json",
    }


class TestMultiCountrySettingsHub:
    """Test multi-country settings hub endpoints"""

    def test_get_settings_hub_tz_default(self, admin_headers):
        """GET /api/admin/settings-hub?country=TZ returns TZ settings with 18% VAT"""
        response = requests.get(
            f"{BASE_URL}/api/admin/settings-hub?country=TZ",
            headers=admin_headers,
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Check VAT is 18% for TZ
        commercial = data.get("commercial", {})
        vat_percent = commercial.get("vat_percent")
        assert vat_percent == 18, f"Expected TZ VAT 18%, got {vat_percent}"
        
        # Check payment_accounts has TZS currency
        payment_accounts = data.get("payment_accounts", {})
        currency = payment_accounts.get("currency")
        assert currency == "TZS", f"Expected TZS currency, got {currency}"
        
        print(f"✓ TZ settings: VAT={vat_percent}%, Currency={currency}")

    def test_get_settings_hub_ke_specific(self, admin_headers):
        """GET /api/admin/settings-hub?country=KE returns KE-specific settings with 16% VAT and KES currency"""
        response = requests.get(
            f"{BASE_URL}/api/admin/settings-hub?country=KE",
            headers=admin_headers,
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Check VAT is 16% for KE
        commercial = data.get("commercial", {})
        vat_percent = commercial.get("vat_percent")
        assert vat_percent == 16, f"Expected KE VAT 16%, got {vat_percent}"
        
        # Check payment_accounts has KES currency
        payment_accounts = data.get("payment_accounts", {})
        currency = payment_accounts.get("currency")
        assert currency == "KES", f"Expected KES currency, got {currency}"
        
        print(f"✓ KE settings: VAT={vat_percent}%, Currency={currency}")

    def test_get_settings_hub_ug(self, admin_headers):
        """GET /api/admin/settings-hub?country=UG returns UG settings"""
        response = requests.get(
            f"{BASE_URL}/api/admin/settings-hub?country=UG",
            headers=admin_headers,
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # UG should have 18% VAT and UGX currency (if replicated)
        commercial = data.get("commercial", {})
        vat_percent = commercial.get("vat_percent")
        payment_accounts = data.get("payment_accounts", {})
        currency = payment_accounts.get("currency")
        
        print(f"✓ UG settings: VAT={vat_percent}%, Currency={currency}")

    def test_replicate_settings_tz_to_ug(self, admin_headers):
        """POST /api/admin/settings-hub/replicate copies settings from TZ to UG with country adjustments"""
        response = requests.post(
            f"{BASE_URL}/api/admin/settings-hub/replicate",
            headers=admin_headers,
            json={
                "source_country": "TZ",
                "target_country": "UG",
            },
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "success", f"Expected success status, got {data}"
        assert "UG" in data.get("message", ""), f"Expected UG in message, got {data.get('message')}"
        
        print(f"✓ Replicate TZ→UG: {data.get('message')}")
        
        # Verify UG settings were updated with correct country-specific values
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/settings-hub?country=UG",
            headers=admin_headers,
        )
        assert verify_response.status_code == 200
        
        ug_data = verify_response.json()
        commercial = ug_data.get("commercial", {})
        payment_accounts = ug_data.get("payment_accounts", {})
        
        # UG should have 18% VAT and UGX currency after replication
        assert commercial.get("vat_percent") == 18, f"Expected UG VAT 18%, got {commercial.get('vat_percent')}"
        assert payment_accounts.get("currency") == "UGX", f"Expected UGX currency, got {payment_accounts.get('currency')}"
        
        print(f"✓ UG settings after replication: VAT={commercial.get('vat_percent')}%, Currency={payment_accounts.get('currency')}")

    def test_replicate_settings_validation_same_country(self, admin_headers):
        """POST /api/admin/settings-hub/replicate returns 400 for same source and target"""
        response = requests.post(
            f"{BASE_URL}/api/admin/settings-hub/replicate",
            headers=admin_headers,
            json={
                "source_country": "TZ",
                "target_country": "TZ",
            },
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("✓ Replicate same country validation works")

    def test_replicate_settings_validation_missing_target(self, admin_headers):
        """POST /api/admin/settings-hub/replicate returns 400 for missing target_country"""
        response = requests.post(
            f"{BASE_URL}/api/admin/settings-hub/replicate",
            headers=admin_headers,
            json={
                "source_country": "TZ",
            },
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("✓ Replicate missing target validation works")

    def test_put_settings_hub_ke(self, admin_headers):
        """PUT /api/admin/settings-hub?country=KE saves settings under settings_hub_KE key"""
        # First get current KE settings
        get_response = requests.get(
            f"{BASE_URL}/api/admin/settings-hub?country=KE",
            headers=admin_headers,
        )
        assert get_response.status_code == 200
        current_settings = get_response.json()
        
        # Update a field
        test_tagline = f"TEST_KE_Tagline_{os.urandom(4).hex()}"
        current_settings["business_profile"] = current_settings.get("business_profile", {})
        current_settings["business_profile"]["tagline"] = test_tagline
        
        # Save
        put_response = requests.put(
            f"{BASE_URL}/api/admin/settings-hub?country=KE",
            headers=admin_headers,
            json=current_settings,
        )
        assert put_response.status_code == 200, f"Expected 200, got {put_response.status_code}: {put_response.text}"
        
        # Verify the update persisted
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/settings-hub?country=KE",
            headers=admin_headers,
        )
        assert verify_response.status_code == 200
        
        verify_data = verify_response.json()
        saved_tagline = verify_data.get("business_profile", {}).get("tagline")
        assert saved_tagline == test_tagline, f"Expected tagline '{test_tagline}', got '{saved_tagline}'"
        
        print(f"✓ PUT KE settings saved and verified: tagline={test_tagline}")


class TestDashboardAndSidebar:
    """Test dashboard and sidebar functionality"""

    def test_admin_dashboard_loads(self, admin_headers):
        """Dashboard endpoint returns data for KPI cards"""
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard/kpis",
            headers=admin_headers,
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Dashboard should have some KPI data
        assert isinstance(data, dict), f"Expected dict response, got {type(data)}"
        print(f"✓ Dashboard KPIs loads with keys: {list(data.keys())[:10]}")

    def test_sidebar_counts_feedback_badge(self, admin_headers):
        """Sidebar counts endpoint returns feedback_new count"""
        response = requests.get(
            f"{BASE_URL}/api/admin/sidebar-counts",
            headers=admin_headers,
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Should have feedback_new as integer
        feedback_new = data.get("feedback_new")
        assert isinstance(feedback_new, int), f"Expected feedback_new as int, got {type(feedback_new)}"
        
        print(f"✓ Sidebar counts: feedback_new={feedback_new}")


class TestCountryExpansionEndpoints:
    """Test endpoints used by country expansion pages"""

    def test_feedback_endpoint_for_expansion_registration(self):
        """POST /api/feedback accepts expansion interest registration"""
        response = requests.post(
            f"{BASE_URL}/api/feedback",
            json={
                "category": "feature_request",
                "description": "Country expansion interest — Kenya: Test User (test@example.com), Type: customer",
                "user_email": "test@example.com",
                "user_name": "Test User",
                "user_role": "customer",
                "page_url": f"{BASE_URL}/account/expand/ke",
            },
        )
        # Should accept the feedback (200 or 201)
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        print("✓ Feedback endpoint accepts expansion registration")


class TestActiveCountryConfig:
    """Test active country configuration endpoint"""

    def test_active_country_config(self, admin_headers):
        """GET /api/admin/active-country-config returns current country settings"""
        response = requests.get(
            f"{BASE_URL}/api/admin/active-country-config",
            headers=admin_headers,
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Should have country code, currency, vat_rate
        assert "code" in data or "country" in data, f"Expected country code in response: {data}"
        
        print(f"✓ Active country config: {data}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
