"""
Test Suite for Phone+PIN Login and Role-Based Onboarding Features (Iteration 242)
Tests:
- Email+password login (existing flow)
- Phone+PIN login (new feature)
- Invalid credentials handling
- /api/auth/me returns onboarding_completed and has_pin
- POST /api/auth/onboarding-complete marks user as onboarding_completed=true
- POST /api/auth/set-pin sets PIN with password verification
- Admin login still works
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
CUSTOMER_EMAIL = "test@konekt.tz"
CUSTOMER_PASSWORD = "TestUser123!"
CUSTOMER_PHONE = "712345678"
CUSTOMER_PIN = "1234"
CUSTOMER_COUNTRY_CODE = "+255"

ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"

SALES_MANAGER_EMAIL = "sales.manager@konekt.co.tz"
SALES_MANAGER_PASSWORD = "Manager123!"

VENDOR_EMAIL = "demo.partner@konekt.com"
VENDOR_PASSWORD = "Partner123!"


class TestEmailPasswordLogin:
    """Test existing email+password login flow"""
    
    def test_email_login_success(self):
        """Test customer login with email+password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["email"] == CUSTOMER_EMAIL
        assert data["user"]["role"] == "customer"
        print(f"✓ Email login success: {data['user']['email']}")
    
    def test_email_login_invalid_password(self):
        """Test login with wrong password returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": "WrongPassword123!"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid password returns 401")
    
    def test_email_login_nonexistent_user(self):
        """Test login with non-existent email returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@test.com",
            "password": "SomePassword123!"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Non-existent user returns 401")


class TestPhonePinLogin:
    """Test new phone+PIN login flow"""
    
    def test_phone_pin_login_success(self):
        """Test customer login with phone+PIN"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": CUSTOMER_PHONE,
            "pin": CUSTOMER_PIN,
            "country_code": CUSTOMER_COUNTRY_CODE
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["email"] == CUSTOMER_EMAIL, f"Expected {CUSTOMER_EMAIL}, got {data['user']['email']}"
        print(f"✓ Phone+PIN login success: {data['user']['email']}")
    
    def test_phone_pin_login_invalid_pin(self):
        """Test login with wrong PIN returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": CUSTOMER_PHONE,
            "pin": "9999",
            "country_code": CUSTOMER_COUNTRY_CODE
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid PIN returns 401")
    
    def test_phone_pin_login_nonexistent_phone(self):
        """Test login with non-existent phone returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "999999999",
            "pin": "1234",
            "country_code": CUSTOMER_COUNTRY_CODE
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Non-existent phone returns 401")


class TestLoginValidation:
    """Test login validation and error handling"""
    
    def test_login_no_credentials_returns_400(self):
        """Test login with no credentials returns 400"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={})
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("✓ No credentials returns 400")
    
    def test_login_partial_email_credentials(self):
        """Test login with only email (no password) returns 400"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Partial email credentials returns 400")
    
    def test_login_partial_phone_credentials(self):
        """Test login with only phone (no PIN) returns 400"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": CUSTOMER_PHONE
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Partial phone credentials returns 400")


class TestAuthMe:
    """Test /api/auth/me endpoint returns onboarding_completed and has_pin"""
    
    def get_token(self):
        """Helper to get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        return None
    
    def test_auth_me_returns_onboarding_completed(self):
        """Test /api/auth/me returns onboarding_completed field"""
        token = self.get_token()
        assert token, "Failed to get auth token"
        
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "onboarding_completed" in data, "Response should contain onboarding_completed"
        assert isinstance(data["onboarding_completed"], bool), "onboarding_completed should be boolean"
        print(f"✓ /api/auth/me returns onboarding_completed: {data['onboarding_completed']}")
    
    def test_auth_me_returns_has_pin(self):
        """Test /api/auth/me returns has_pin field"""
        token = self.get_token()
        assert token, "Failed to get auth token"
        
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "has_pin" in data, "Response should contain has_pin"
        assert isinstance(data["has_pin"], bool), "has_pin should be boolean"
        print(f"✓ /api/auth/me returns has_pin: {data['has_pin']}")
    
    def test_auth_me_unauthorized(self):
        """Test /api/auth/me without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ /api/auth/me without token returns 401/403")


class TestOnboardingComplete:
    """Test POST /api/auth/onboarding-complete endpoint"""
    
    def get_token(self):
        """Helper to get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        return None
    
    def test_onboarding_complete_success(self):
        """Test marking onboarding as complete"""
        token = self.get_token()
        assert token, "Failed to get auth token"
        
        response = requests.post(f"{BASE_URL}/api/auth/onboarding-complete", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("status") == "ok", "Response should have status: ok"
        print("✓ POST /api/auth/onboarding-complete returns 200")
        
        # Verify the change persisted
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert me_response.status_code == 200
        me_data = me_response.json()
        assert me_data.get("onboarding_completed") == True, "onboarding_completed should be True after marking complete"
        print("✓ onboarding_completed persisted as True")
    
    def test_onboarding_complete_unauthorized(self):
        """Test onboarding-complete without token returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/onboarding-complete")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ POST /api/auth/onboarding-complete without token returns 401/403")


class TestSetPin:
    """Test POST /api/auth/set-pin endpoint"""
    
    def get_token(self):
        """Helper to get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        return None
    
    def test_set_pin_success(self):
        """Test setting PIN with correct password"""
        token = self.get_token()
        assert token, "Failed to get auth token"
        
        response = requests.post(f"{BASE_URL}/api/auth/set-pin", 
            json={
                "pin": "1234",
                "current_password": CUSTOMER_PASSWORD
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("status") == "ok", "Response should have status: ok"
        print("✓ POST /api/auth/set-pin with correct password returns 200")
    
    def test_set_pin_wrong_password(self):
        """Test setting PIN with wrong password returns 401"""
        token = self.get_token()
        assert token, "Failed to get auth token"
        
        response = requests.post(f"{BASE_URL}/api/auth/set-pin", 
            json={
                "pin": "5678",
                "current_password": "WrongPassword123!"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ POST /api/auth/set-pin with wrong password returns 401")
    
    def test_set_pin_invalid_format_too_short(self):
        """Test setting PIN with too short PIN returns 400"""
        token = self.get_token()
        assert token, "Failed to get auth token"
        
        response = requests.post(f"{BASE_URL}/api/auth/set-pin", 
            json={
                "pin": "12",  # Too short (less than 4 digits)
                "current_password": CUSTOMER_PASSWORD
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ POST /api/auth/set-pin with too short PIN returns 400")
    
    def test_set_pin_invalid_format_too_long(self):
        """Test setting PIN with too long PIN returns 400"""
        token = self.get_token()
        assert token, "Failed to get auth token"
        
        response = requests.post(f"{BASE_URL}/api/auth/set-pin", 
            json={
                "pin": "1234567",  # Too long (more than 6 digits)
                "current_password": CUSTOMER_PASSWORD
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ POST /api/auth/set-pin with too long PIN returns 400")
    
    def test_set_pin_unauthorized(self):
        """Test set-pin without token returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/set-pin", json={
            "pin": "1234",
            "current_password": "test"
        })
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ POST /api/auth/set-pin without token returns 401/403")


class TestAdminLogin:
    """Test admin login still works"""
    
    def test_admin_login_success(self):
        """Test admin login with email+password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] == "admin"
        print(f"✓ Admin login success: {data['user']['email']}, role: {data['user']['role']}")
    
    def test_sales_manager_login_success(self):
        """Test sales manager login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SALES_MANAGER_EMAIL,
            "password": SALES_MANAGER_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["user"]["role"] == "sales_manager"
        print(f"✓ Sales manager login success: {data['user']['email']}, role: {data['user']['role']}")


class TestVendorLogin:
    """Test vendor/partner login still works"""
    
    def test_vendor_login_success(self):
        """Test vendor login with email+password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        print(f"✓ Vendor login success: {data['user']['email']}, role: {data['user'].get('role', 'partner')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
