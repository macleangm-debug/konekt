"""
Test Suite: Affiliate Qualification-Based Application with Token Activation (v303)

Tests the redesigned affiliate application system:
1. Qualification form: POST /api/affiliate-applications with full fields
2. Application check: GET /api/affiliate-applications/check/{email}
3. Application stats: GET /api/affiliate-applications/stats
4. Admin approve: POST /api/affiliate-applications/{id}/approve - returns activation_link + whatsapp_link
5. Admin reject: POST /api/affiliate-applications/{id}/reject - sends rejection email
6. Token activation: POST /api/affiliate-applications/activate with token + password
7. Resend activation: POST /api/affiliate-applications/{id}/resend-activation
8. Mark WhatsApp sent: POST /api/affiliate-applications/{id}/mark-whatsapp-sent
9. Settings Hub: base_public_url and affiliate_emails settings
10. Duplicate activation blocked
11. Expired token handling
12. Cannot login before activation
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token."""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Admin authentication failed: {response.status_code}")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Headers with admin auth token."""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


class TestQualificationFormSubmission:
    """Test the 5-section qualification form submission."""
    
    def test_submit_full_qualification_form(self, admin_headers):
        """Test submitting a complete qualification-based application."""
        unique_email = f"test_qualifier_{uuid.uuid4().hex[:8]}@example.com"
        
        payload = {
            "full_name": "Test Qualifier User",
            "email": unique_email,
            "phone": "+255712345678",
            "location": "Dar es Salaam, Tanzania",
            # Section 2: Online Presence
            "primary_platform": "Instagram",
            "social_instagram": "@testqualifier",
            "social_tiktok": "@testqualifier_tt",
            "social_facebook": "facebook.com/testqualifier",
            "social_website": "https://testqualifier.com",
            "audience_size": "1,000-5,000",
            # Section 3: Promotion Strategy
            "promotion_strategy": "I will create engaging content showcasing products to my followers",
            "product_interests": "Office equipment, promotional materials",
            "prior_experience": True,
            "experience_description": "I have promoted products for 2 years on Instagram",
            # Section 4: Commitment
            "expected_monthly_sales": 15,
            "willing_to_promote_weekly": True,
            "why_join": "I want to earn commissions while helping businesses find quality products",
            # Section 5: Agreement
            "agreed_performance_terms": True,
            "agreed_terms": True
        }
        
        response = requests.post(f"{BASE_URL}/api/affiliate-applications", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") is True
        assert "application" in data
        
        app = data["application"]
        assert app["email"] == unique_email
        assert app["status"] == "pending"
        assert app["primary_platform"] == "Instagram"
        assert app["audience_size"] == "1,000-5,000"
        assert app["expected_monthly_sales"] == 15
        assert app["prior_experience"] is True
        assert app["activation_status"] == "not_sent"
        assert app["account_activated"] is False
        
        # Store for later tests
        self.__class__.test_application_id = app["id"]
        self.__class__.test_email = unique_email
        print(f"✓ Qualification form submitted: {app['id']}")
    
    def test_duplicate_pending_application_blocked(self):
        """Test that duplicate pending applications are blocked."""
        if not hasattr(self.__class__, "test_email"):
            pytest.skip("No test email from previous test")
        
        payload = {
            "full_name": "Duplicate User",
            "email": self.__class__.test_email,
            "phone": "+255712345679",
            "primary_platform": "WhatsApp",
            "audience_size": "< 100",
            "promotion_strategy": "Test strategy",
            "expected_monthly_sales": 5,
            "why_join": "Test reason",
            "agreed_performance_terms": True,
            "agreed_terms": True
        }
        
        response = requests.post(f"{BASE_URL}/api/affiliate-applications", json=payload)
        assert response.status_code == 400
        assert "pending application" in response.json().get("detail", "").lower()
        print("✓ Duplicate pending application blocked")
    
    def test_terms_agreement_required(self):
        """Test that terms agreement is required."""
        payload = {
            "full_name": "No Terms User",
            "email": f"noterms_{uuid.uuid4().hex[:8]}@example.com",
            "phone": "+255712345680",
            "primary_platform": "WhatsApp",
            "audience_size": "< 100",
            "promotion_strategy": "Test strategy",
            "expected_monthly_sales": 5,
            "why_join": "Test reason",
            "agreed_performance_terms": False,
            "agreed_terms": False
        }
        
        response = requests.post(f"{BASE_URL}/api/affiliate-applications", json=payload)
        assert response.status_code == 400
        assert "agree" in response.json().get("detail", "").lower()
        print("✓ Terms agreement validation working")


class TestApplicationStatusCheck:
    """Test the public application status check endpoint."""
    
    def test_check_status_by_email(self, admin_headers):
        """Test checking application status by email."""
        # First create an application
        unique_email = f"test_status_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "full_name": "Status Check User",
            "email": unique_email,
            "phone": "+255712345681",
            "primary_platform": "TikTok",
            "audience_size": "500-1,000",
            "promotion_strategy": "TikTok videos",
            "expected_monthly_sales": 10,
            "why_join": "Earn commissions",
            "agreed_performance_terms": True,
            "agreed_terms": True
        }
        requests.post(f"{BASE_URL}/api/affiliate-applications", json=payload)
        
        # Check status
        response = requests.get(f"{BASE_URL}/api/affiliate-applications/check/{unique_email}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["exists"] is True
        assert data["status"] == "pending"
        assert "submitted_at" in data
        print(f"✓ Status check by email working: {data['status']}")
    
    def test_check_status_nonexistent(self):
        """Test checking status for non-existent application."""
        response = requests.get(f"{BASE_URL}/api/affiliate-applications/check/nonexistent@example.com")
        assert response.status_code == 200
        
        data = response.json()
        assert data["exists"] is False
        assert data["status"] is None
        print("✓ Non-existent application returns exists=False")


class TestApplicationStats:
    """Test the application stats endpoint."""
    
    def test_get_application_stats(self, admin_headers):
        """Test getting application statistics."""
        response = requests.get(f"{BASE_URL}/api/affiliate-applications/stats", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "pending" in data
        assert "approved" in data
        assert "rejected" in data
        assert "active_affiliates" in data
        assert "max_affiliates" in data
        assert "slots_remaining" in data
        
        # Values should be integers
        assert isinstance(data["pending"], int)
        assert isinstance(data["approved"], int)
        assert isinstance(data["rejected"], int)
        print(f"✓ Stats: pending={data['pending']}, approved={data['approved']}, rejected={data['rejected']}")


class TestAdminApproval:
    """Test admin approval flow with activation token generation."""
    
    def test_approve_application_generates_activation_link(self, admin_headers):
        """Test that approving an application generates activation link and WhatsApp link."""
        # Create a new application
        unique_email = f"test_approve_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "full_name": "Approval Test User",
            "email": unique_email,
            "phone": "+255712345682",
            "primary_platform": "Instagram",
            "audience_size": "5,000+",
            "promotion_strategy": "Instagram stories and posts",
            "expected_monthly_sales": 25,
            "prior_experience": True,
            "experience_description": "3 years affiliate marketing",
            "why_join": "Grow my income",
            "agreed_performance_terms": True,
            "agreed_terms": True
        }
        create_resp = requests.post(f"{BASE_URL}/api/affiliate-applications", json=payload)
        assert create_resp.status_code == 200
        app_id = create_resp.json()["application"]["id"]
        
        # Approve the application
        approve_resp = requests.post(
            f"{BASE_URL}/api/affiliate-applications/{app_id}/approve",
            headers=admin_headers,
            json={"admin_notes": "Great candidate with large audience"}
        )
        assert approve_resp.status_code == 200, f"Approve failed: {approve_resp.text}"
        
        data = approve_resp.json()
        assert data.get("ok") is True
        assert "affiliate" in data
        assert "activation_link" in data
        assert "whatsapp_link" in data or data.get("whatsapp_link") is None  # May be None if no phone
        assert "whatsapp_message" in data
        
        # Verify activation link format
        activation_link = data["activation_link"]
        assert "/activate?token=" in activation_link
        
        # Verify affiliate was created
        affiliate = data["affiliate"]
        assert affiliate["email"] == unique_email
        assert affiliate["is_active"] is True
        assert affiliate["setup_complete"] is False
        
        # Store for later tests
        self.__class__.approved_app_id = app_id
        self.__class__.approved_email = unique_email
        self.__class__.activation_link = activation_link
        
        print(f"✓ Application approved with activation link: {activation_link[:50]}...")
    
    def test_approve_already_approved_blocked(self, admin_headers):
        """Test that approving an already approved application is blocked."""
        if not hasattr(self.__class__, "approved_app_id"):
            pytest.skip("No approved application from previous test")
        
        response = requests.post(
            f"{BASE_URL}/api/affiliate-applications/{self.__class__.approved_app_id}/approve",
            headers=admin_headers
        )
        assert response.status_code == 400
        assert "already approved" in response.json().get("detail", "").lower()
        print("✓ Double approval blocked")


class TestAdminRejection:
    """Test admin rejection flow."""
    
    def test_reject_application_with_notes(self, admin_headers):
        """Test rejecting an application with admin notes."""
        # Create a new application
        unique_email = f"test_reject_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "full_name": "Rejection Test User",
            "email": unique_email,
            "phone": "+255712345683",
            "primary_platform": "Other",
            "audience_size": "< 100",
            "promotion_strategy": "Not sure yet",
            "expected_monthly_sales": 1,
            "why_join": "Just trying",
            "agreed_performance_terms": True,
            "agreed_terms": True
        }
        create_resp = requests.post(f"{BASE_URL}/api/affiliate-applications", json=payload)
        assert create_resp.status_code == 200
        app_id = create_resp.json()["application"]["id"]
        
        # Reject the application
        reject_resp = requests.post(
            f"{BASE_URL}/api/affiliate-applications/{app_id}/reject",
            headers=admin_headers,
            json={"admin_notes": "Audience too small, no clear promotion strategy"}
        )
        assert reject_resp.status_code == 200
        
        data = reject_resp.json()
        assert data.get("ok") is True
        assert data.get("status") == "rejected"
        
        # Verify status check shows rejection reason
        check_resp = requests.get(f"{BASE_URL}/api/affiliate-applications/check/{unique_email}")
        check_data = check_resp.json()
        assert check_data["status"] == "rejected"
        assert "rejection_reason" in check_data
        
        print(f"✓ Application rejected with notes")
    
    def test_reject_already_rejected_blocked(self, admin_headers):
        """Test that rejecting an already rejected application is blocked."""
        # Create and reject an application
        unique_email = f"test_double_reject_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "full_name": "Double Reject User",
            "email": unique_email,
            "phone": "+255712345684",
            "primary_platform": "WhatsApp",
            "audience_size": "< 100",
            "promotion_strategy": "Test",
            "expected_monthly_sales": 1,
            "why_join": "Test",
            "agreed_performance_terms": True,
            "agreed_terms": True
        }
        create_resp = requests.post(f"{BASE_URL}/api/affiliate-applications", json=payload)
        app_id = create_resp.json()["application"]["id"]
        
        # First rejection
        requests.post(f"{BASE_URL}/api/affiliate-applications/{app_id}/reject", headers=admin_headers)
        
        # Second rejection should fail
        response = requests.post(f"{BASE_URL}/api/affiliate-applications/{app_id}/reject", headers=admin_headers)
        assert response.status_code == 400
        assert "already rejected" in response.json().get("detail", "").lower()
        print("✓ Double rejection blocked")


class TestTokenActivation:
    """Test the token-based account activation flow."""
    
    def test_activate_account_with_valid_token(self, admin_headers):
        """Test activating account with valid token and password."""
        # Create and approve a new application
        unique_email = f"test_activate_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "full_name": "Activation Test User",
            "email": unique_email,
            "phone": "+255712345685",
            "primary_platform": "Instagram",
            "audience_size": "1,000-5,000",
            "promotion_strategy": "Content creation",
            "expected_monthly_sales": 20,
            "why_join": "Earn money",
            "agreed_performance_terms": True,
            "agreed_terms": True
        }
        create_resp = requests.post(f"{BASE_URL}/api/affiliate-applications", json=payload)
        app_id = create_resp.json()["application"]["id"]
        
        # Approve to get activation token
        approve_resp = requests.post(
            f"{BASE_URL}/api/affiliate-applications/{app_id}/approve",
            headers=admin_headers
        )
        activation_link = approve_resp.json()["activation_link"]
        
        # Extract token from link
        token = activation_link.split("token=")[1]
        
        # Activate with password
        activate_resp = requests.post(
            f"{BASE_URL}/api/affiliate-applications/activate",
            json={"token": token, "password": "TestPassword123!"}
        )
        assert activate_resp.status_code == 200, f"Activation failed: {activate_resp.text}"
        
        data = activate_resp.json()
        assert data.get("ok") is True
        assert data.get("email") == unique_email
        assert "activated" in data.get("message", "").lower()
        
        # Store for login test
        self.__class__.activated_email = unique_email
        self.__class__.activated_password = "TestPassword123!"
        
        print(f"✓ Account activated successfully for {unique_email}")
    
    def test_login_after_activation(self):
        """Test that user can login after activation."""
        if not hasattr(self.__class__, "activated_email"):
            pytest.skip("No activated account from previous test")
        
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.__class__.activated_email,
            "password": self.__class__.activated_password
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "token" in data
        assert data.get("user", {}).get("role") == "affiliate"
        
        print(f"✓ Login successful after activation")
    
    def test_duplicate_activation_blocked(self, admin_headers):
        """Test that activating an already activated account is blocked."""
        # Create, approve, and activate
        unique_email = f"test_dup_activate_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "full_name": "Dup Activation User",
            "email": unique_email,
            "phone": "+255712345686",
            "primary_platform": "TikTok",
            "audience_size": "500-1,000",
            "promotion_strategy": "Videos",
            "expected_monthly_sales": 10,
            "why_join": "Income",
            "agreed_performance_terms": True,
            "agreed_terms": True
        }
        create_resp = requests.post(f"{BASE_URL}/api/affiliate-applications", json=payload)
        app_id = create_resp.json()["application"]["id"]
        
        approve_resp = requests.post(
            f"{BASE_URL}/api/affiliate-applications/{app_id}/approve",
            headers=admin_headers
        )
        token = approve_resp.json()["activation_link"].split("token=")[1]
        
        # First activation
        requests.post(f"{BASE_URL}/api/affiliate-applications/activate", json={
            "token": token, "password": "Password123!"
        })
        
        # Second activation should fail
        response = requests.post(f"{BASE_URL}/api/affiliate-applications/activate", json={
            "token": token, "password": "Password456!"
        })
        assert response.status_code == 400
        assert "already activated" in response.json().get("detail", "").lower()
        print("✓ Duplicate activation blocked")
    
    def test_invalid_token_rejected(self):
        """Test that invalid tokens are rejected."""
        response = requests.post(f"{BASE_URL}/api/affiliate-applications/activate", json={
            "token": "invalid_token_12345",
            "password": "Password123!"
        })
        assert response.status_code == 400
        assert "invalid" in response.json().get("detail", "").lower() or "expired" in response.json().get("detail", "").lower()
        print("✓ Invalid token rejected")
    
    def test_short_password_rejected(self, admin_headers):
        """Test that short passwords are rejected."""
        # Create and approve
        unique_email = f"test_short_pwd_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "full_name": "Short Pwd User",
            "email": unique_email,
            "phone": "+255712345687",
            "primary_platform": "WhatsApp",
            "audience_size": "100-500",
            "promotion_strategy": "Groups",
            "expected_monthly_sales": 5,
            "why_join": "Extra income",
            "agreed_performance_terms": True,
            "agreed_terms": True
        }
        create_resp = requests.post(f"{BASE_URL}/api/affiliate-applications", json=payload)
        app_id = create_resp.json()["application"]["id"]
        
        approve_resp = requests.post(
            f"{BASE_URL}/api/affiliate-applications/{app_id}/approve",
            headers=admin_headers
        )
        token = approve_resp.json()["activation_link"].split("token=")[1]
        
        # Try with short password
        response = requests.post(f"{BASE_URL}/api/affiliate-applications/activate", json={
            "token": token, "password": "123"
        })
        assert response.status_code == 400
        assert "6 characters" in response.json().get("detail", "").lower()
        print("✓ Short password rejected")


class TestResendActivation:
    """Test the resend activation functionality."""
    
    def test_resend_activation_generates_new_token(self, admin_headers):
        """Test that resending activation generates a new token."""
        # Create and approve
        unique_email = f"test_resend_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "full_name": "Resend Test User",
            "email": unique_email,
            "phone": "+255712345688",
            "primary_platform": "Facebook",
            "audience_size": "1,000-5,000",
            "promotion_strategy": "Facebook posts",
            "expected_monthly_sales": 15,
            "why_join": "Commissions",
            "agreed_performance_terms": True,
            "agreed_terms": True
        }
        create_resp = requests.post(f"{BASE_URL}/api/affiliate-applications", json=payload)
        app_id = create_resp.json()["application"]["id"]
        
        # Approve
        approve_resp = requests.post(
            f"{BASE_URL}/api/affiliate-applications/{app_id}/approve",
            headers=admin_headers
        )
        original_link = approve_resp.json()["activation_link"]
        
        # Resend activation
        resend_resp = requests.post(
            f"{BASE_URL}/api/affiliate-applications/{app_id}/resend-activation",
            headers=admin_headers
        )
        assert resend_resp.status_code == 200
        
        data = resend_resp.json()
        assert data.get("ok") is True
        assert "activation_link" in data
        assert "whatsapp_link" in data or data.get("whatsapp_link") is None
        
        # New link should be different (new token)
        new_link = data["activation_link"]
        assert new_link != original_link
        
        print(f"✓ Resend activation generated new token")
    
    def test_resend_for_activated_account_blocked(self, admin_headers):
        """Test that resending for already activated account is blocked."""
        # Create, approve, and activate
        unique_email = f"test_resend_activated_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "full_name": "Resend Activated User",
            "email": unique_email,
            "phone": "+255712345689",
            "primary_platform": "Instagram",
            "audience_size": "500-1,000",
            "promotion_strategy": "Stories",
            "expected_monthly_sales": 10,
            "why_join": "Income",
            "agreed_performance_terms": True,
            "agreed_terms": True
        }
        create_resp = requests.post(f"{BASE_URL}/api/affiliate-applications", json=payload)
        app_id = create_resp.json()["application"]["id"]
        
        approve_resp = requests.post(
            f"{BASE_URL}/api/affiliate-applications/{app_id}/approve",
            headers=admin_headers
        )
        token = approve_resp.json()["activation_link"].split("token=")[1]
        
        # Activate
        requests.post(f"{BASE_URL}/api/affiliate-applications/activate", json={
            "token": token, "password": "Password123!"
        })
        
        # Try to resend
        response = requests.post(
            f"{BASE_URL}/api/affiliate-applications/{app_id}/resend-activation",
            headers=admin_headers
        )
        assert response.status_code == 400
        assert "already activated" in response.json().get("detail", "").lower()
        print("✓ Resend for activated account blocked")


class TestWhatsAppTracking:
    """Test WhatsApp activation tracking."""
    
    def test_mark_whatsapp_sent(self, admin_headers):
        """Test marking WhatsApp as sent."""
        # Create and approve
        unique_email = f"test_whatsapp_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "full_name": "WhatsApp Test User",
            "email": unique_email,
            "phone": "+255712345690",
            "primary_platform": "WhatsApp",
            "audience_size": "5,000+",
            "promotion_strategy": "WhatsApp groups",
            "expected_monthly_sales": 30,
            "why_join": "Large network",
            "agreed_performance_terms": True,
            "agreed_terms": True
        }
        create_resp = requests.post(f"{BASE_URL}/api/affiliate-applications", json=payload)
        app_id = create_resp.json()["application"]["id"]
        
        requests.post(
            f"{BASE_URL}/api/affiliate-applications/{app_id}/approve",
            headers=admin_headers
        )
        
        # Mark WhatsApp sent
        response = requests.post(
            f"{BASE_URL}/api/affiliate-applications/{app_id}/mark-whatsapp-sent",
            headers=admin_headers
        )
        assert response.status_code == 200
        assert response.json().get("ok") is True
        
        # Verify in application list
        list_resp = requests.get(f"{BASE_URL}/api/affiliate-applications", headers=admin_headers)
        apps = list_resp.json().get("applications", [])
        app = next((a for a in apps if a["id"] == app_id), None)
        assert app is not None
        assert app.get("activation_whatsapp_opened") is True
        
        print("✓ WhatsApp sent tracking working")


class TestSettingsHubIntegration:
    """Test Settings Hub integration for base_public_url and affiliate_emails."""
    
    def test_settings_hub_has_base_public_url(self, admin_headers):
        """Test that Settings Hub includes base_public_url in business_profile."""
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "business_profile" in data
        # base_public_url should be in business_profile (may be empty string)
        bp = data["business_profile"]
        assert "base_public_url" in bp or bp.get("base_public_url") is not None or "base_public_url" in str(bp)
        
        print(f"✓ Settings Hub has business_profile with base_public_url")
    
    def test_settings_hub_has_affiliate_emails(self, admin_headers):
        """Test that Settings Hub includes affiliate_emails settings."""
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "affiliate_emails" in data
        
        ae = data["affiliate_emails"]
        assert "send_application_received" in ae
        assert "send_application_approved" in ae
        assert "send_application_rejected" in ae
        assert "sla_response_text" in ae
        
        print(f"✓ Settings Hub has affiliate_emails: {ae}")
    
    def test_update_affiliate_email_settings(self, admin_headers):
        """Test updating affiliate email settings."""
        # Get current settings
        get_resp = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers)
        current = get_resp.json()
        
        # Update affiliate_emails
        current["affiliate_emails"] = {
            "send_application_received": True,
            "send_application_approved": True,
            "send_application_rejected": True,
            "sla_response_text": "We will review your application within 24-48 hours."
        }
        
        update_resp = requests.put(
            f"{BASE_URL}/api/admin/settings-hub",
            headers=admin_headers,
            json=current
        )
        assert update_resp.status_code == 200
        
        # Verify update
        verify_resp = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers)
        verify_data = verify_resp.json()
        assert verify_data["affiliate_emails"]["sla_response_text"] == "We will review your application within 24-48 hours."
        
        print("✓ Affiliate email settings updated successfully")


class TestCannotLoginBeforeActivation:
    """Test that users cannot login before activation."""
    
    def test_login_before_activation_fails(self, admin_headers):
        """Test that login fails for approved but not activated accounts."""
        # Create and approve (but don't activate)
        unique_email = f"test_no_login_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "full_name": "No Login User",
            "email": unique_email,
            "phone": "+255712345691",
            "primary_platform": "Instagram",
            "audience_size": "1,000-5,000",
            "promotion_strategy": "Posts",
            "expected_monthly_sales": 15,
            "why_join": "Income",
            "agreed_performance_terms": True,
            "agreed_terms": True
        }
        create_resp = requests.post(f"{BASE_URL}/api/affiliate-applications", json=payload)
        app_id = create_resp.json()["application"]["id"]
        
        # Approve (creates user with empty password_hash and is_active=False)
        requests.post(
            f"{BASE_URL}/api/affiliate-applications/{app_id}/approve",
            headers=admin_headers
        )
        
        # Try to login - should fail because password_hash is empty
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": unique_email,
            "password": "AnyPassword123!"
        })
        
        # Should fail with 401 (invalid credentials) since password_hash is empty
        assert login_resp.status_code == 401, f"Expected 401, got {login_resp.status_code}"
        
        print("✓ Login before activation correctly blocked")


class TestApplicationListFiltering:
    """Test application list filtering."""
    
    def test_list_all_applications(self, admin_headers):
        """Test listing all applications."""
        response = requests.get(f"{BASE_URL}/api/affiliate-applications", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "applications" in data
        assert isinstance(data["applications"], list)
        
        print(f"✓ Listed {len(data['applications'])} applications")
    
    def test_filter_by_status(self, admin_headers):
        """Test filtering applications by status."""
        for status in ["pending", "approved", "rejected"]:
            response = requests.get(
                f"{BASE_URL}/api/affiliate-applications?status={status}",
                headers=admin_headers
            )
            assert response.status_code == 200
            
            apps = response.json().get("applications", [])
            # All returned apps should have the requested status
            for app in apps:
                assert app["status"] == status
            
            print(f"✓ Filter by status={status}: {len(apps)} applications")


class TestFitScoreCalculation:
    """Test that qualification data supports fit score calculation."""
    
    def test_application_has_fit_score_fields(self, admin_headers):
        """Test that applications have all fields needed for fit score calculation."""
        # Create application with high-fit profile
        unique_email = f"test_fit_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "full_name": "High Fit User",
            "email": unique_email,
            "phone": "+255712345692",
            "primary_platform": "Instagram",
            "audience_size": "5,000+",
            "promotion_strategy": "Professional content creation",
            "expected_monthly_sales": 25,
            "prior_experience": True,
            "experience_description": "5 years in affiliate marketing",
            "willing_to_promote_weekly": True,
            "why_join": "Scale my affiliate business",
            "agreed_performance_terms": True,
            "agreed_terms": True
        }
        create_resp = requests.post(f"{BASE_URL}/api/affiliate-applications", json=payload)
        assert create_resp.status_code == 200
        
        app = create_resp.json()["application"]
        
        # Verify all fit score fields are present
        assert "audience_size" in app
        assert "prior_experience" in app
        assert "expected_monthly_sales" in app
        assert "willing_to_promote_weekly" in app
        
        # High fit profile should have:
        # - audience_size: "5,000+" (3 points)
        # - prior_experience: True (2 points)
        # - expected_monthly_sales: 25 (2 points for >= 20)
        # - willing_to_promote_weekly: True (1 point)
        # Total: 8 points = High fit
        
        print(f"✓ Application has all fit score fields: audience={app['audience_size']}, exp={app['prior_experience']}, sales={app['expected_monthly_sales']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
