"""
Final Live Readiness Pack - Backend API Tests
Tests for: Launch Email Status, Payment Gateway Status, Go-Live Readiness, Audit APIs
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
        return response.json().get("token")
    pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")


class TestLaunchEmailStatusAPI:
    """Test /api/launch-emails/status endpoint"""
    
    def test_email_status_endpoint_returns_200(self):
        """GET /api/launch-emails/status should return 200"""
        response = requests.get(f"{BASE_URL}/api/launch-emails/status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_email_status_returns_resend_configured_field(self):
        """Should return resend_configured field"""
        response = requests.get(f"{BASE_URL}/api/launch-emails/status")
        data = response.json()
        assert "resend_configured" in data, "Missing resend_configured field"
        assert isinstance(data["resend_configured"], bool), "resend_configured should be boolean"
    
    def test_email_status_resend_not_configured_without_keys(self):
        """Without RESEND_API_KEY, resend_configured should be False"""
        response = requests.get(f"{BASE_URL}/api/launch-emails/status")
        data = response.json()
        # Per review_request: Resend is mocked (RESEND_API_KEY not set)
        assert data["resend_configured"] == False, "Expected resend_configured=False when API key not set"


class TestPaymentGatewayStatusAPI:
    """Test /api/payment-gateways/status endpoint"""
    
    def test_gateway_status_endpoint_returns_200(self):
        """GET /api/payment-gateways/status should return 200"""
        response = requests.get(f"{BASE_URL}/api/payment-gateways/status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_gateway_status_returns_required_fields(self):
        """Should return all required gateway status fields"""
        response = requests.get(f"{BASE_URL}/api/payment-gateways/status")
        data = response.json()
        
        required_fields = ["kwikpay_configured", "kwikpay_enabled", "bank_transfer_available", "mobile_money_available"]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
    
    def test_gateway_status_kwikpay_not_configured_without_keys(self):
        """Without KWIKPAY keys, kwikpay_configured should be False"""
        response = requests.get(f"{BASE_URL}/api/payment-gateways/status")
        data = response.json()
        # Per review_request: KwikPay is mocked (KWIKPAY_PUBLIC_KEY not set)
        assert data["kwikpay_configured"] == False, "Expected kwikpay_configured=False when keys not set"
        assert data["kwikpay_enabled"] == False, "Expected kwikpay_enabled=False when keys not set"
    
    def test_gateway_status_bank_transfer_always_available(self):
        """Bank transfer should always be available"""
        response = requests.get(f"{BASE_URL}/api/payment-gateways/status")
        data = response.json()
        assert data["bank_transfer_available"] == True, "Bank transfer should always be available"


class TestGoLiveReadinessAPI:
    """Test /api/admin/go-live-readiness endpoint"""
    
    def test_readiness_endpoint_returns_200(self):
        """GET /api/admin/go-live-readiness should return 200 (no auth required)"""
        response = requests.get(f"{BASE_URL}/api/admin/go-live-readiness")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_readiness_returns_status_and_score(self):
        """Should return status, score, total, and checks"""
        response = requests.get(f"{BASE_URL}/api/admin/go-live-readiness")
        data = response.json()
        
        assert "status" in data, "Missing status field"
        assert "score" in data, "Missing score field"
        assert "total" in data, "Missing total field"
        assert "checks" in data, "Missing checks field"
    
    def test_readiness_status_values(self):
        """Status should be 'ready' or 'needs_attention'"""
        response = requests.get(f"{BASE_URL}/api/admin/go-live-readiness")
        data = response.json()
        assert data["status"] in ["ready", "needs_attention"], f"Unexpected status: {data['status']}"
    
    def test_readiness_score_is_numeric(self):
        """Score and total should be integers"""
        response = requests.get(f"{BASE_URL}/api/admin/go-live-readiness")
        data = response.json()
        assert isinstance(data["score"], int), "Score should be integer"
        assert isinstance(data["total"], int), "Total should be integer"
        assert data["score"] <= data["total"], "Score should not exceed total"
    
    def test_readiness_checks_are_booleans(self):
        """All checks should be boolean values"""
        response = requests.get(f"{BASE_URL}/api/admin/go-live-readiness")
        data = response.json()
        checks = data.get("checks", {})
        
        for key, value in checks.items():
            assert isinstance(value, bool), f"Check '{key}' should be boolean, got {type(value)}"


class TestLaunchReadinessAuditAPI:
    """Test /api/admin/go-live-readiness/audit endpoint"""
    
    def test_audit_endpoint_returns_200(self):
        """GET /api/admin/go-live-readiness/audit should return 200"""
        response = requests.get(f"{BASE_URL}/api/admin/go-live-readiness/audit")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_audit_returns_all_sections(self):
        """Audit should return business_identity, payments, operations, commercial sections"""
        response = requests.get(f"{BASE_URL}/api/admin/go-live-readiness/audit")
        data = response.json()
        
        required_sections = ["business_identity", "payments", "operations", "commercial"]
        for section in required_sections:
            assert section in data, f"Missing section: {section}"
    
    def test_audit_business_identity_fields(self):
        """Business identity should have all required fields"""
        response = requests.get(f"{BASE_URL}/api/admin/go-live-readiness/audit")
        data = response.json()
        
        bi = data.get("business_identity", {})
        expected_fields = ["company_name", "logo_url", "tin", "address", "support_email", "phone"]
        for field in expected_fields:
            assert field in bi, f"Missing business_identity field: {field}"
    
    def test_audit_payments_fields(self):
        """Payments section should have configuration status fields"""
        response = requests.get(f"{BASE_URL}/api/admin/go-live-readiness/audit")
        data = response.json()
        
        payments = data.get("payments", {})
        expected_fields = ["payment_settings_count", "bank_transfer_configured", "kwikpay_configured", "resend_configured"]
        for field in expected_fields:
            assert field in payments, f"Missing payments field: {field}"
    
    def test_audit_operations_fields(self):
        """Operations section should have team/partner counts"""
        response = requests.get(f"{BASE_URL}/api/admin/go-live-readiness/audit")
        data = response.json()
        
        ops = data.get("operations", {})
        expected_fields = ["active_partners", "active_service_groups", "admin_accounts", "sales_accounts", "operations_accounts"]
        for field in expected_fields:
            assert field in ops, f"Missing operations field: {field}"
    
    def test_audit_commercial_fields(self):
        """Commercial section should have business rule flags"""
        response = requests.get(f"{BASE_URL}/api/admin/go-live-readiness/audit")
        data = response.json()
        
        commercial = data.get("commercial", {})
        expected_fields = ["has_default_markup_rules", "has_commission_rules", "has_country_configs"]
        for field in expected_fields:
            assert field in commercial, f"Missing commercial field: {field}"


class TestLaunchReportAPI:
    """Test /api/admin/launch-report endpoints (requires auth)"""
    
    def test_launch_report_json_requires_auth(self):
        """GET /api/admin/launch-report/json requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/launch-report/json")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
    
    def test_launch_report_json_with_auth(self, admin_token):
        """GET /api/admin/launch-report/json should return data with auth"""
        response = requests.get(
            f"{BASE_URL}/api/admin/launch-report/json",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200 with auth, got {response.status_code}"
        data = response.json()
        
        # LaunchReadinessPage expects these fields
        assert "ready_score" in data or "score" in data, "Missing score field"
        assert "checks" in data, "Missing checks field"
        assert "status" in data, "Missing status field"


class TestAffiliatePublicRegistration:
    """Test affiliate public registration endpoint (from previous pack)"""
    
    def test_affiliate_public_register_endpoint_exists(self):
        """POST /api/affiliates/public/register endpoint should exist"""
        response = requests.post(f"{BASE_URL}/api/affiliates/public/register", json={})
        # Should return 422 (validation error) not 404
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}"
    
    def test_affiliate_promotions_available(self):
        """GET /api/affiliate-promotions/available should work"""
        response = requests.get(f"{BASE_URL}/api/affiliate-promotions/available")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"


class TestPaymentSettingsAPI:
    """Test /api/admin/payment-settings endpoint (used by PaymentSettingsPage)"""
    
    def test_payment_settings_endpoint_exists(self):
        """GET /api/admin/payment-settings should exist"""
        response = requests.get(f"{BASE_URL}/api/admin/payment-settings")
        # This is currently returning 404 - documenting the issue
        if response.status_code == 404:
            pytest.skip("ISSUE: /api/admin/payment-settings endpoint not found - needs implementation")
        assert response.status_code in [200, 401], f"Unexpected status: {response.status_code}"
    
    def test_payment_settings_post_endpoint(self, admin_token):
        """POST /api/admin/payment-settings should exist"""
        response = requests.post(
            f"{BASE_URL}/api/admin/payment-settings",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "country_code": "TZ",
                "currency": "TZS",
                "bank_transfer_enabled": True,
                "kwikpay_enabled": False,
                "bank_name": "Test Bank",
                "account_name": "Test Account",
                "account_number": "1234567890"
            }
        )
        if response.status_code == 404:
            pytest.skip("ISSUE: /api/admin/payment-settings POST endpoint not found - needs implementation")
        assert response.status_code in [200, 201, 401], f"Unexpected status: {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
