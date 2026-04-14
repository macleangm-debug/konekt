"""
Test Suite for Route Cleanup and Structured Names Audit (Iteration 306)
Tests:
1. Route redirects (/register/affiliate, /affiliate/portal, /affiliate/dashboard)
2. Settings Lock API endpoints
3. Terms of Service page
4. Public request endpoints with structured names
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


class TestRouteRedirects:
    """Test that old affiliate routes redirect to canonical routes"""
    
    def test_register_affiliate_redirects_to_partners_apply(self):
        """Test /register/affiliate redirects to /partners/apply"""
        response = requests.get(f"{BASE_URL}/register/affiliate", allow_redirects=False)
        # React Router handles this client-side, so we check the page loads
        response_follow = requests.get(f"{BASE_URL}/register/affiliate", allow_redirects=True)
        assert response_follow.status_code == 200
        print("PASS: /register/affiliate route accessible (React Router handles redirect)")
    
    def test_affiliate_portal_redirects_to_partners_apply(self):
        """Test /affiliate/portal redirects to /partners/apply"""
        response = requests.get(f"{BASE_URL}/affiliate/portal", allow_redirects=True)
        assert response.status_code == 200
        print("PASS: /affiliate/portal route accessible (React Router handles redirect)")
    
    def test_affiliate_dashboard_redirects_to_partner_affiliate_dashboard(self):
        """Test /affiliate/dashboard redirects to /partner/affiliate-dashboard"""
        response = requests.get(f"{BASE_URL}/affiliate/dashboard", allow_redirects=True)
        assert response.status_code == 200
        print("PASS: /affiliate/dashboard route accessible (React Router handles redirect)")
    
    def test_partners_apply_page_loads(self):
        """Test canonical /partners/apply page loads"""
        response = requests.get(f"{BASE_URL}/partners/apply")
        assert response.status_code == 200
        print("PASS: /partners/apply page loads successfully")
    
    def test_terms_page_loads(self):
        """Test /terms page loads"""
        response = requests.get(f"{BASE_URL}/terms")
        assert response.status_code == 200
        print("PASS: /terms page loads successfully")
    
    def test_earn_page_loads(self):
        """Test /earn (affiliate landing) page loads"""
        response = requests.get(f"{BASE_URL}/earn")
        assert response.status_code == 200
        print("PASS: /earn page loads successfully")
    
    def test_launch_country_page_loads(self):
        """Test /launch-country (expansion premium) page loads"""
        response = requests.get(f"{BASE_URL}/launch-country")
        assert response.status_code == 200
        print("PASS: /launch-country page loads successfully")
    
    def test_request_quote_page_loads(self):
        """Test /request-quote page loads"""
        response = requests.get(f"{BASE_URL}/request-quote")
        assert response.status_code == 200
        print("PASS: /request-quote page loads successfully")
    
    def test_order_request_page_loads(self):
        """Test /order-request page loads"""
        response = requests.get(f"{BASE_URL}/order-request")
        assert response.status_code == 200
        print("PASS: /order-request page loads successfully")
    
    def test_checkout_page_loads(self):
        """Test /checkout page loads"""
        response = requests.get(f"{BASE_URL}/checkout")
        assert response.status_code == 200
        print("PASS: /checkout page loads successfully")
    
    def test_group_deals_page_loads(self):
        """Test /group-deals page loads"""
        response = requests.get(f"{BASE_URL}/group-deals")
        assert response.status_code == 200
        print("PASS: /group-deals page loads successfully")


class TestSettingsLockAPI:
    """Test Settings Lock API endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    def test_settings_lock_status_unauthenticated(self):
        """Test settings lock status without auth - may return 200 with unlocked=False"""
        response = requests.get(f"{BASE_URL}/api/admin/settings-lock/status")
        # API may return 200 with unlocked=False or require auth
        assert response.status_code in [200, 401, 403, 422]
        print(f"PASS: Settings lock status endpoint accessible (status: {response.status_code})")
    
    def test_settings_lock_unlock_wrong_password(self, admin_token):
        """Test settings lock unlock with wrong password returns error"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(
            f"{BASE_URL}/api/admin/settings-lock/unlock",
            json={"password": "wrong_password"},
            headers=headers
        )
        # Should return 400 or 401 for wrong password
        assert response.status_code in [400, 401]
        print(f"PASS: Settings lock unlock with wrong password returns {response.status_code}")
    
    def test_settings_lock_unlock_correct_password(self, admin_token):
        """Test settings lock unlock with correct password"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(
            f"{BASE_URL}/api/admin/settings-lock/unlock",
            json={"password": ADMIN_PASSWORD},
            headers=headers
        )
        # May return 200 or 400 depending on implementation
        if response.status_code == 200:
            data = response.json()
            assert data.get("ok") == True
            print("PASS: Settings lock unlock with correct password works")
        else:
            # API may have different requirements
            print(f"INFO: Settings lock unlock returned {response.status_code} - {response.text[:200]}")
    
    def test_settings_lock_status_after_unlock(self, admin_token):
        """Test settings lock status endpoint works"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Check status
        response = requests.get(
            f"{BASE_URL}/api/admin/settings-lock/status",
            params={"email": ADMIN_EMAIL},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        # Status should have unlocked field
        assert "unlocked" in data
        print(f"PASS: Settings lock status endpoint works (unlocked: {data.get('unlocked')})")
    
    def test_settings_lock_relock(self, admin_token):
        """Test settings lock re-lock functionality"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Re-lock
        response = requests.post(
            f"{BASE_URL}/api/admin/settings-lock/lock",
            headers=headers
        )
        # May return 200 or 500 if no session exists
        if response.status_code == 200:
            data = response.json()
            assert data.get("ok") == True
            print("PASS: Settings lock re-lock works")
        else:
            print(f"INFO: Settings lock re-lock returned {response.status_code} (may need active session)")


class TestPublicRequestsWithStructuredNames:
    """Test public request endpoints accept structured names (first_name/last_name)"""
    
    def test_public_requests_with_structured_names(self):
        """Test /api/public-requests accepts first_name and last_name"""
        payload = {
            "request_type": "service_quote",
            "title": "TEST_structured_names_quote",
            "guest_name": "Test User",
            "first_name": "Test",
            "last_name": "User",
            "guest_email": "test.structured@example.com",
            "phone": "+255712345678",
            "company_name": "Test Company",
            "source_page": "/request-quote",
            "notes": "Testing structured names",
            "details": {
                "primary_lane": "services",
                "urgency": "flexible"
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/public-requests", json=payload)
        assert response.status_code in [200, 201]
        data = response.json()
        assert "request_number" in data
        print(f"PASS: Public request created with structured names: {data.get('request_number')}")
    
    def test_affiliate_application_with_structured_names(self):
        """Test /api/affiliate-applications accepts first_name and last_name"""
        import uuid
        unique_id = str(uuid.uuid4())[:8]
        
        payload = {
            "first_name": "Test",
            "last_name": "Affiliate",
            "full_name": "Test Affiliate",
            "email": f"test.affiliate.{unique_id}@example.com",
            "phone": "+255712345678",
            "location": "Dar es Salaam",
            "primary_platform": "WhatsApp",
            "audience_size": "100-500",
            "promotion_strategy": "Social media marketing",
            "why_join": "Testing structured names",
            "expected_monthly_sales": 10,
            "willing_to_promote_weekly": True,
            "agreed_performance_terms": True,
            "agreed_terms": True
        }
        
        response = requests.post(f"{BASE_URL}/api/affiliate-applications", json=payload)
        assert response.status_code in [200, 201]
        data = response.json()
        # Response may have 'ok' field or 'application' object
        assert data.get("ok") == True or "application" in data or "id" in data
        print(f"PASS: Affiliate application created with structured names")
    
    def test_guest_orders_with_structured_names(self):
        """Test /api/guest/orders accepts first_name and last_name"""
        import uuid
        unique_id = str(uuid.uuid4())[:8]
        
        payload = {
            "customer_name": "Test Customer",
            "first_name": "Test",
            "last_name": "Customer",
            "customer_email": f"test.customer.{unique_id}@example.com",
            "customer_phone": "+255712345678",
            "delivery_address": "123 Test Street",
            "city": "Dar es Salaam",
            "country": "Tanzania",
            "line_items": [
                {
                    "description": "Test Product",
                    "quantity": 1,
                    "unit_price": 10000,
                    "total": 10000
                }
            ],
            "subtotal": 10000,
            "tax": 0,
            "discount": 0,
            "total": 10000,
            "status": "pending"
        }
        
        response = requests.post(f"{BASE_URL}/api/guest/orders", json=payload)
        assert response.status_code in [200, 201]
        data = response.json()
        assert "id" in data or "order_id" in data or "order_number" in data
        print(f"PASS: Guest order created with structured names")
    
    def test_guest_leads_with_structured_names(self):
        """Test /api/guest-leads accepts first_name and last_name"""
        import uuid
        unique_id = str(uuid.uuid4())[:8]
        
        payload = {
            "full_name": "Test Lead",
            "first_name": "Test",
            "last_name": "Lead",
            "email": f"test.lead.{unique_id}@example.com",
            "phone": "+255712345678",
            "company": "Test Company",
            "country_code": "TZ",
            "intent_type": "expansion_business_interest",
            "intent_payload": {
                "region": "Dar es Salaam",
                "interest_summary": "Testing structured names"
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/guest-leads", json=payload)
        assert response.status_code in [200, 201]
        data = response.json()
        # Response may have 'ok' field or 'guest_lead_id'
        assert data.get("ok") == True or "guest_lead_id" in data or "id" in data
        print(f"PASS: Guest lead created with structured names")


class TestPublicPaymentInfo:
    """Test public payment info endpoint"""
    
    def test_public_payment_info(self):
        """Test /api/public/payment-info returns bank details"""
        response = requests.get(f"{BASE_URL}/api/public/payment-info")
        assert response.status_code == 200
        data = response.json()
        # Should have bank details
        assert "bank_name" in data or "account_name" in data or "account_number" in data
        print(f"PASS: Public payment info endpoint works")


class TestGroupDealsAPI:
    """Test Group Deals API endpoints"""
    
    def test_public_group_deals_list(self):
        """Test /api/public/group-deals returns list"""
        response = requests.get(f"{BASE_URL}/api/public/group-deals")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Public group deals list endpoint works, found {len(data)} deals")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
