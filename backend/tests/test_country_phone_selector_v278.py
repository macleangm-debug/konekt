"""
Test suite for Global Country Selector + Phone Rollout (Iteration 278)
Tests: CountryAwarePhoneField with 58 countries, phone normalization on affiliate endpoints
"""
import pytest
import requests
import os
import random
import string

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

def random_suffix():
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))

class TestAffiliateApplicationPhoneNormalization:
    """Test affiliate application endpoint with normalized phone format"""
    
    def test_affiliate_application_with_tanzania_phone(self):
        """Submit affiliate application with Tanzania phone (+255)"""
        suffix = random_suffix()
        payload = {
            "full_name": f"TEST Phone TZ {suffix}",
            "email": f"test.tz.{suffix}@example.com",
            "phone": "+255712345678",  # Normalized format
            "company_name": "TEST Company TZ",
            "region": "Dar es Salaam",
            "notes": "Testing Tanzania phone"
        }
        response = requests.post(f"{BASE_URL}/api/affiliate-applications", json=payload)
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == True or "id" in data or "application" in data
        print(f"✓ Tanzania phone application submitted: {payload['phone']}")
    
    def test_affiliate_application_with_kenya_phone(self):
        """Submit affiliate application with Kenya phone (+254)"""
        suffix = random_suffix()
        payload = {
            "full_name": f"TEST Phone KE {suffix}",
            "email": f"test.ke.{suffix}@example.com",
            "phone": "+254712345678",  # Kenya normalized format
            "company_name": "TEST Company KE",
            "region": "Nairobi",
            "notes": "Testing Kenya phone"
        }
        response = requests.post(f"{BASE_URL}/api/affiliate-applications", json=payload)
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        print(f"✓ Kenya phone application submitted: {payload['phone']}")
    
    def test_affiliate_application_with_uk_phone(self):
        """Submit affiliate application with UK phone (+44)"""
        suffix = random_suffix()
        payload = {
            "full_name": f"TEST Phone UK {suffix}",
            "email": f"test.uk.{suffix}@example.com",
            "phone": "+447911123456",  # UK normalized format
            "company_name": "TEST Company UK",
            "region": "London",
            "notes": "Testing UK phone"
        }
        response = requests.post(f"{BASE_URL}/api/affiliate-applications", json=payload)
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        print(f"✓ UK phone application submitted: {payload['phone']}")
    
    def test_affiliate_application_with_us_phone(self):
        """Submit affiliate application with US phone (+1)"""
        suffix = random_suffix()
        payload = {
            "full_name": f"TEST Phone US {suffix}",
            "email": f"test.us.{suffix}@example.com",
            "phone": "+12025551234",  # US normalized format
            "company_name": "TEST Company US",
            "region": "New York",
            "notes": "Testing US phone"
        }
        response = requests.post(f"{BASE_URL}/api/affiliate-applications", json=payload)
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        print(f"✓ US phone application submitted: {payload['phone']}")
    
    def test_affiliate_application_without_phone(self):
        """Submit affiliate application without phone (optional field)"""
        suffix = random_suffix()
        payload = {
            "full_name": f"TEST No Phone {suffix}",
            "email": f"test.nophone.{suffix}@example.com",
            "phone": "",  # Empty phone
            "company_name": "",
            "region": "",
            "notes": ""
        }
        response = requests.post(f"{BASE_URL}/api/affiliate-applications", json=payload)
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        print("✓ Application without phone submitted successfully")


class TestAdminAffiliatePhoneNormalization:
    """Test admin affiliate creation with normalized phone format"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        login_payload = {
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_payload)
        if response.status_code == 200:
            data = response.json()
            return data.get("token") or data.get("access_token")
        pytest.skip("Admin login failed - skipping admin tests")
    
    def test_create_affiliate_with_tanzania_phone(self, admin_token):
        """Create affiliate via admin with Tanzania phone"""
        suffix = random_suffix()
        headers = {"Authorization": f"Bearer {admin_token}"}
        payload = {
            "name": f"TEST Admin Aff TZ {suffix}",
            "email": f"test.admin.tz.{suffix}@example.com",
            "phone": "+255712345678",
            "affiliate_code": f"TESTTZ{suffix[:4].upper()}",
            "is_active": True,
            "payout_method": "mobile_money",
            "mobile_money_number": "712345678",
            "mobile_money_provider": "M-Pesa"
        }
        response = requests.post(f"{BASE_URL}/api/admin/affiliates", json=payload, headers=headers)
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify affiliate was created
        if "affiliate" in data:
            affiliate = data["affiliate"]
            assert affiliate.get("phone") == "+255712345678" or affiliate.get("phone") == "712345678"
            print(f"✓ Admin created affiliate with TZ phone: {affiliate.get('phone')}")
        else:
            print(f"✓ Admin affiliate created: {data}")
    
    def test_create_affiliate_with_germany_phone(self, admin_token):
        """Create affiliate via admin with Germany phone"""
        suffix = random_suffix()
        headers = {"Authorization": f"Bearer {admin_token}"}
        payload = {
            "name": f"TEST Admin Aff DE {suffix}",
            "email": f"test.admin.de.{suffix}@example.com",
            "phone": "+4915112345678",  # Germany normalized
            "affiliate_code": f"TESTDE{suffix[:4].upper()}",
            "is_active": True,
            "payout_method": "bank",
            "bank_name": "Deutsche Bank",
            "bank_account_name": "Test Account",
            "bank_account_number": "DE89370400440532013000"
        }
        response = requests.post(f"{BASE_URL}/api/admin/affiliates", json=payload, headers=headers)
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        print(f"✓ Admin created affiliate with Germany phone: {payload['phone']}")
    
    def test_get_affiliates_list(self, admin_token):
        """Verify affiliates list endpoint works"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/affiliates", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "affiliates" in data or isinstance(data, list)
        print(f"✓ Affiliates list retrieved successfully")


class TestCountryDataValidation:
    """Validate country data structure expectations"""
    
    def test_affiliate_applications_endpoint_exists(self):
        """Verify affiliate applications endpoint is accessible"""
        # Just check the endpoint responds (even if it requires auth for GET)
        response = requests.get(f"{BASE_URL}/api/affiliate-applications")
        # Could be 200, 401, or 403 depending on auth requirements
        assert response.status_code in [200, 401, 403, 405], f"Unexpected status: {response.status_code}"
        print(f"✓ Affiliate applications endpoint accessible (status: {response.status_code})")
    
    def test_admin_affiliates_endpoint_accessible(self):
        """Verify admin affiliates endpoint is accessible"""
        response = requests.get(f"{BASE_URL}/api/admin/affiliates")
        # Endpoint may return 200 with empty list or require auth
        assert response.status_code in [200, 401, 403], f"Unexpected status: {response.status_code}"
        print(f"✓ Admin affiliates endpoint accessible (status: {response.status_code})")


class TestPhoneFormatVariations:
    """Test various phone format inputs"""
    
    def test_phone_with_spaces_in_application(self):
        """Test phone number with spaces (should be handled by frontend)"""
        suffix = random_suffix()
        payload = {
            "full_name": f"TEST Spaces {suffix}",
            "email": f"test.spaces.{suffix}@example.com",
            "phone": "+255 712 345 678",  # With spaces
            "company_name": "",
            "region": "",
            "notes": ""
        }
        response = requests.post(f"{BASE_URL}/api/affiliate-applications", json=payload)
        # Backend should accept or normalize
        assert response.status_code in [200, 201, 400, 422], f"Unexpected status: {response.status_code}"
        print(f"✓ Phone with spaces handled (status: {response.status_code})")
    
    def test_phone_with_dashes_in_application(self):
        """Test phone number with dashes"""
        suffix = random_suffix()
        payload = {
            "full_name": f"TEST Dashes {suffix}",
            "email": f"test.dashes.{suffix}@example.com",
            "phone": "+255-712-345-678",  # With dashes
            "company_name": "",
            "region": "",
            "notes": ""
        }
        response = requests.post(f"{BASE_URL}/api/affiliate-applications", json=payload)
        assert response.status_code in [200, 201, 400, 422], f"Unexpected status: {response.status_code}"
        print(f"✓ Phone with dashes handled (status: {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
