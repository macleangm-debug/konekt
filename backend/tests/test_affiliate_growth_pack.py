"""
Backend API tests for Affiliate Growth Pack
Testing: Registration, Dashboard Summary, Available Promotions
"""
import pytest
import requests
import os
import hashlib
import jwt
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
JWT_SECRET = 'konekt-secret-key-2024'

class TestAffiliatePublicRegistration:
    """Test affiliate public registration endpoint"""
    
    def test_register_affiliate_success(self):
        """Test successful affiliate registration"""
        unique_email = f"test.aff.{datetime.now().strftime('%Y%m%d%H%M%S')}@example.com"
        payload = {
            "full_name": "Test Affiliate User",
            "email": unique_email,
            "phone": "+255700000001",
            "country": "Tanzania",
            "password": "TestPass123!"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/affiliates/public/register",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert data.get("ok") == True
        assert "affiliate_code" in data
        assert "message" in data
        assert len(data["affiliate_code"]) > 0
        print(f"✓ Affiliate registered successfully with code: {data['affiliate_code']}")
    
    def test_register_affiliate_missing_email(self):
        """Test registration fails without email"""
        payload = {
            "full_name": "Test User",
            "phone": "+255700000001",
            "password": "TestPass123!"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/affiliates/public/register",
            json=payload
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"✓ Correctly rejected missing email: {data['detail']}")
    
    def test_register_affiliate_missing_password(self):
        """Test registration fails without password"""
        unique_email = f"test.nopass.{datetime.now().strftime('%Y%m%d%H%M%S')}@example.com"
        payload = {
            "full_name": "Test User",
            "email": unique_email,
            "phone": "+255700000001"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/affiliates/public/register",
            json=payload
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"✓ Correctly rejected missing password: {data['detail']}")
    
    def test_register_affiliate_duplicate_email(self):
        """Test registration fails for duplicate email"""
        unique_email = f"test.dup.{datetime.now().strftime('%Y%m%d%H%M%S')}@example.com"
        payload = {
            "full_name": "Test Affiliate Dup",
            "email": unique_email,
            "phone": "+255700000001",
            "country": "Tanzania",
            "password": "TestPass123!"
        }
        
        # First registration should succeed
        response1 = requests.post(
            f"{BASE_URL}/api/affiliates/public/register",
            json=payload
        )
        assert response1.status_code == 200, f"First registration should succeed: {response1.text}"
        
        # Second registration should fail
        response2 = requests.post(
            f"{BASE_URL}/api/affiliates/public/register",
            json=payload
        )
        assert response2.status_code == 400
        data = response2.json()
        assert "already exists" in data.get("detail", "").lower()
        print(f"✓ Correctly rejected duplicate email")


class TestAffiliatePromotionsAvailable:
    """Test available affiliate promotions endpoint"""
    
    def test_get_available_promotions(self):
        """Test fetching available promotions"""
        response = requests.get(f"{BASE_URL}/api/affiliate-promotions/available")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Should return a list (possibly empty if no active campaigns)
        assert isinstance(data, list)
        print(f"✓ Available promotions endpoint returned {len(data)} campaigns")
        
        # If there are campaigns, validate structure
        if len(data) > 0:
            campaign = data[0]
            expected_fields = ["campaign_id", "campaign_name", "promotion_type", "scope_type"]
            for field in expected_fields:
                assert field in campaign, f"Missing field: {field}"
            print(f"✓ Campaign structure validated")


class TestAffiliateDashboardSummary:
    """Test affiliate dashboard summary endpoint"""
    
    def test_dashboard_summary_unauthorized(self):
        """Test dashboard returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/affiliate/dashboard/summary")
        
        assert response.status_code == 401
        print(f"✓ Dashboard correctly requires authentication")
    
    def test_dashboard_summary_invalid_token(self):
        """Test dashboard returns 401 with invalid token"""
        response = requests.get(
            f"{BASE_URL}/api/affiliate/dashboard/summary",
            headers={"Authorization": "Bearer invalid_token"}
        )
        
        assert response.status_code == 401
        print(f"✓ Dashboard correctly rejects invalid token")


class TestAffiliateCodeLookup:
    """Test affiliate code lookup endpoint"""
    
    def test_get_affiliate_by_invalid_code(self):
        """Test looking up non-existent affiliate code"""
        response = requests.get(f"{BASE_URL}/api/affiliates/code/INVALIDCODE99999")
        
        assert response.status_code == 404
        print(f"✓ Correctly returns 404 for invalid affiliate code")
    
    def test_get_affiliate_by_valid_code(self):
        """Test looking up a valid affiliate code"""
        # First register an affiliate to get a valid code
        unique_email = f"test.lookup.{datetime.now().strftime('%Y%m%d%H%M%S')}@example.com"
        payload = {
            "full_name": "Test Lookup User",
            "email": unique_email,
            "phone": "+255700000001",
            "country": "Tanzania",
            "password": "TestPass123!"
        }
        
        reg_response = requests.post(
            f"{BASE_URL}/api/affiliates/public/register",
            json=payload
        )
        
        if reg_response.status_code == 200:
            code = reg_response.json().get("affiliate_code")
            
            # Now lookup that code
            response = requests.get(f"{BASE_URL}/api/affiliates/code/{code}")
            
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            data = response.json()
            assert data.get("affiliate_code") == code
            assert "name" in data
            print(f"✓ Successfully looked up affiliate code: {code}")
        else:
            pytest.skip("Could not create test affiliate for lookup test")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
