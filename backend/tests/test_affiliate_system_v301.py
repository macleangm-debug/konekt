"""
Affiliate System Full Controlled Program Tests
Tests: Application flow, Admin review, Setup wizard, Dashboard, Content Studio, Contracts, Notifications
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
TEST_AFFILIATE_EMAIL = "wizard.test@example.com"
TEST_AFFILIATE_PASSWORD = "5cf702ec-737"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Admin authentication failed: {response.status_code}")


@pytest.fixture(scope="module")
def affiliate_token(api_client):
    """Get affiliate authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_AFFILIATE_EMAIL,
        "password": TEST_AFFILIATE_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Affiliate authentication failed: {response.status_code}")


class TestAffiliateApplicationPublic:
    """Public affiliate application endpoints - no auth required"""
    
    def test_submit_application_success(self, api_client):
        """Test submitting a new affiliate application"""
        unique_email = f"test_affiliate_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "full_name": "Test Affiliate User",
            "email": unique_email,
            "phone": "+255712345678",
            "company_name": "Test Company",
            "region": "Dar es Salaam",
            "notes": "I want to promote products"
        }
        response = api_client.post(f"{BASE_URL}/api/affiliate-applications", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == True
        assert "application" in data
        assert data["application"]["email"] == unique_email
        assert data["application"]["status"] == "pending"
        assert data["application"]["full_name"] == "Test Affiliate User"
    
    def test_submit_application_missing_required_fields(self, api_client):
        """Test application submission with missing required fields"""
        payload = {"full_name": "Test User"}  # Missing email
        response = api_client.post(f"{BASE_URL}/api/affiliate-applications", json=payload)
        
        assert response.status_code == 422, f"Expected 422 for validation error, got {response.status_code}"
    
    def test_check_application_status_by_email(self, api_client):
        """Test checking application status by email"""
        # First submit an application
        unique_email = f"test_status_{uuid.uuid4().hex[:8]}@example.com"
        api_client.post(f"{BASE_URL}/api/affiliate-applications", json={
            "full_name": "Status Check User",
            "email": unique_email
        })
        
        # Check status
        response = api_client.get(f"{BASE_URL}/api/affiliate-applications/check/{unique_email}")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("exists") == True
        assert data.get("status") == "pending"
        assert "submitted_at" in data
    
    def test_check_application_status_not_found(self, api_client):
        """Test checking status for non-existent application"""
        response = api_client.get(f"{BASE_URL}/api/affiliate-applications/check/nonexistent@example.com")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("exists") == False
        assert data.get("status") is None


class TestAffiliateApplicationAdmin:
    """Admin affiliate application management endpoints"""
    
    def test_list_applications(self, api_client, admin_token):
        """Test listing all affiliate applications"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/affiliate-applications", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "applications" in data
        assert isinstance(data["applications"], list)
    
    def test_list_applications_filter_by_status(self, api_client, admin_token):
        """Test filtering applications by status"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/affiliate-applications?status=pending", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "applications" in data
        # All returned applications should be pending
        for app in data["applications"]:
            assert app.get("status") == "pending"
    
    def test_application_stats(self, api_client, admin_token):
        """Test getting application statistics"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/affiliate-applications/stats", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "pending" in data
        assert "approved" in data
        assert "rejected" in data
        assert "active_affiliates" in data
        assert "max_affiliates" in data
        assert "slots_remaining" in data
    
    def test_approve_application(self, api_client, admin_token):
        """Test approving an affiliate application"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First create a new application
        unique_email = f"test_approve_{uuid.uuid4().hex[:8]}@example.com"
        submit_response = api_client.post(f"{BASE_URL}/api/affiliate-applications", json={
            "full_name": "Approve Test User",
            "email": unique_email,
            "phone": "+255700000001"
        })
        assert submit_response.status_code == 200
        app_id = submit_response.json()["application"]["id"]
        
        # Approve the application
        response = api_client.post(
            f"{BASE_URL}/api/affiliate-applications/{app_id}/approve",
            headers=headers,
            json={"admin_notes": "Approved for testing"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == True
        assert "affiliate" in data
        assert data["affiliate"]["email"] == unique_email
        assert data["affiliate"]["setup_complete"] == False  # Should require setup wizard
        assert data["affiliate"]["is_active"] == True
        
        # Check if temp password was returned (for new user)
        if data.get("user_created"):
            assert "temp_password" in data
    
    def test_reject_application(self, api_client, admin_token):
        """Test rejecting an affiliate application"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First create a new application
        unique_email = f"test_reject_{uuid.uuid4().hex[:8]}@example.com"
        submit_response = api_client.post(f"{BASE_URL}/api/affiliate-applications", json={
            "full_name": "Reject Test User",
            "email": unique_email
        })
        assert submit_response.status_code == 200
        app_id = submit_response.json()["application"]["id"]
        
        # Reject the application
        response = api_client.post(
            f"{BASE_URL}/api/affiliate-applications/{app_id}/reject",
            headers=headers,
            json={"admin_notes": "Not a good fit"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") == True
        assert data.get("status") == "rejected"
        
        # Verify status via check endpoint
        check_response = api_client.get(f"{BASE_URL}/api/affiliate-applications/check/{unique_email}")
        assert check_response.json().get("status") == "rejected"


class TestAffiliateSetupWizard:
    """Setup wizard endpoints for new affiliates"""
    
    def test_get_affiliate_status(self, api_client, affiliate_token):
        """Test getting current affiliate status"""
        headers = {"Authorization": f"Bearer {affiliate_token}"}
        response = api_client.get(f"{BASE_URL}/api/affiliate-program/my-status", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "email" in data
        assert "setup_complete" in data
        assert "affiliate_code" in data
        assert "payout_method" in data
        assert "contract_tier" in data
        assert "performance_status" in data
    
    def test_validate_promo_code_available(self, api_client):
        """Test validating an available promo code"""
        unique_code = f"TEST{uuid.uuid4().hex[:6].upper()}"
        response = api_client.get(f"{BASE_URL}/api/affiliate-program/validate-code/{unique_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("available") == True
    
    def test_validate_promo_code_invalid_format(self, api_client):
        """Test validating promo code with invalid format"""
        response = api_client.get(f"{BASE_URL}/api/affiliate-program/validate-code/ab")  # Too short
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("available") == False
        assert "Invalid format" in data.get("reason", "")


class TestAffiliateDashboard:
    """Affiliate dashboard and performance endpoints"""
    
    def test_get_my_performance(self, api_client, affiliate_token):
        """Test getting affiliate performance vs contract targets"""
        headers = {"Authorization": f"Bearer {affiliate_token}"}
        response = api_client.get(f"{BASE_URL}/api/affiliate-program/my-performance", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Contract info
        assert "contract_tier" in data
        assert "contract_label" in data
        assert "duration_months" in data
        assert "performance_status" in data
        
        # Targets
        assert "targets" in data
        assert "min_deals" in data["targets"]
        assert "min_earnings" in data["targets"]
        
        # Actuals
        assert "actuals" in data
        assert "total_deals" in data["actuals"]
        assert "total_earnings" in data["actuals"]
        assert "pending_earnings" in data["actuals"]
        assert "paid_earnings" in data["actuals"]
        
        # Progress percentages
        assert "progress" in data
        assert "deals_pct" in data["progress"]
        assert "earnings_pct" in data["progress"]
    
    def test_get_wallet_balance(self, api_client, affiliate_token):
        """Test getting affiliate wallet balance"""
        headers = {"Authorization": f"Bearer {affiliate_token}"}
        response = api_client.get(f"{BASE_URL}/api/affiliate/wallet", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "pending" in data
        assert "available" in data
        assert "paid_out" in data
        assert "minimum_payout" in data
        assert "can_withdraw" in data
    
    def test_get_dashboard_summary(self, api_client, affiliate_token):
        """Test getting affiliate dashboard summary"""
        headers = {"Authorization": f"Bearer {affiliate_token}"}
        response = api_client.get(f"{BASE_URL}/api/affiliate/dashboard/summary", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "affiliate_code" in data
        assert "name" in data
        assert "email" in data
        assert "total_sales" in data
        assert "total_commission" in data
        assert "pending_commission" in data
        assert "paid_commission" in data
        assert "share_link" in data


class TestContentStudio:
    """Content studio campaigns with auto-injected promo codes"""
    
    def test_get_campaigns(self, api_client, affiliate_token):
        """Test getting shareable campaigns with promo code injection"""
        headers = {"Authorization": f"Bearer {affiliate_token}"}
        response = api_client.get(f"{BASE_URL}/api/affiliate-program/campaigns", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "campaigns" in data
        assert "promo_code" in data
        assert "total" in data
        
        # If there are campaigns, verify structure
        if data["campaigns"]:
            campaign = data["campaigns"][0]
            assert "id" in campaign
            assert "name" in campaign
            assert "selling_price" in campaign
            assert "promo_code" in campaign
            assert "product_link" in campaign
            assert "caption" in campaign
            assert "your_earning" in campaign
            
            # Verify promo code is injected in caption
            assert data["promo_code"] in campaign["caption"]


class TestAffiliateNotifications:
    """Affiliate notification endpoints"""
    
    def test_get_notifications(self, api_client, affiliate_token):
        """Test getting affiliate notifications"""
        headers = {"Authorization": f"Bearer {affiliate_token}"}
        response = api_client.get(f"{BASE_URL}/api/affiliate-program/notifications", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "notifications" in data
        assert "unread_count" in data
        assert isinstance(data["notifications"], list)
        assert isinstance(data["unread_count"], int)


class TestAdminSettingsHub:
    """Admin Settings Hub affiliate tab"""
    
    def test_get_settings_hub(self, api_client, admin_token):
        """Test getting settings hub with affiliate contracts"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/admin/settings-hub", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Check affiliate settings exist
        if "affiliate" in data:
            affiliate = data["affiliate"]
            # Contract targets or commission settings should be present
            assert "contracts_starter_min_deals" in affiliate or "default_affiliate_commission_percent" in affiliate
            # Affiliate registration requires approval should be present
            assert "affiliate_registration_requires_approval" in affiliate


class TestPayoutAccounts:
    """Affiliate payout account management"""
    
    def test_list_payout_accounts(self, api_client, affiliate_token):
        """Test listing payout accounts"""
        headers = {"Authorization": f"Bearer {affiliate_token}"}
        response = api_client.get(f"{BASE_URL}/api/affiliate/payout-accounts", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "accounts" in data
        assert isinstance(data["accounts"], list)
    
    def test_get_payout_history(self, api_client, affiliate_token):
        """Test getting payout history"""
        headers = {"Authorization": f"Bearer {affiliate_token}"}
        response = api_client.get(f"{BASE_URL}/api/affiliate/payout-history", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "payouts" in data
        assert isinstance(data["payouts"], list)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
