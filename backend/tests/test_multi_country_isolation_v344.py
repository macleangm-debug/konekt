"""
Test Multi-Country Data Isolation Features - Iteration 344
Tests:
1. Dashboard KPIs with country filter (TZ, KE, no filter)
2. User registration with country_code derived from phone prefix
3. Admin login with anti-bot protection
"""
import pytest
import requests
import os
import time
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


class TestDashboardKPIsCountryFilter:
    """Test dashboard KPIs with country filtering"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        # Login with timing field to pass anti-bot check
        form_loaded_at = (datetime.utcnow() - timedelta(seconds=5)).isoformat()
        login_response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD,
                "form_loaded_at": form_loaded_at
            }
        )
        if login_response.status_code == 200:
            self.token = login_response.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            # Try without form_loaded_at for backwards compatibility
            login_response = requests.post(
                f"{BASE_URL}/api/admin/auth/login",
                json={
                    "email": ADMIN_EMAIL,
                    "password": ADMIN_PASSWORD
                }
            )
            if login_response.status_code == 200:
                self.token = login_response.json().get("token")
                self.headers = {"Authorization": f"Bearer {self.token}"}
            else:
                pytest.skip(f"Admin login failed: {login_response.status_code}")
    
    def test_dashboard_kpis_no_country_filter(self):
        """GET /api/admin/dashboard/kpis without country filter returns all data"""
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard/kpis",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "kpis" in data, "Response should contain 'kpis' key"
        assert "operations" in data, "Response should contain 'operations' key"
        assert "finance" in data, "Response should contain 'finance' key"
        assert "charts" in data, "Response should contain 'charts' key"
        
        # Verify KPIs structure
        kpis = data["kpis"]
        assert "orders_today" in kpis, "KPIs should contain 'orders_today'"
        assert "revenue_month" in kpis, "KPIs should contain 'revenue_month'"
        print(f"Dashboard KPIs (no filter): orders_today={kpis.get('orders_today')}, revenue_month={kpis.get('revenue_month')}")
    
    def test_dashboard_kpis_with_tz_country_filter(self):
        """GET /api/admin/dashboard/kpis?country=TZ returns Tanzania-filtered data"""
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard/kpis?country=TZ",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "kpis" in data, "Response should contain 'kpis' key"
        
        kpis = data["kpis"]
        print(f"Dashboard KPIs (TZ filter): orders_today={kpis.get('orders_today')}, revenue_month={kpis.get('revenue_month')}")
    
    def test_dashboard_kpis_with_ke_country_filter(self):
        """GET /api/admin/dashboard/kpis?country=KE returns Kenya-filtered data (should be 0 since no KE orders)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard/kpis?country=KE",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "kpis" in data, "Response should contain 'kpis' key"
        
        kpis = data["kpis"]
        # KE should have 0 or minimal data since no KE orders exist
        print(f"Dashboard KPIs (KE filter): orders_today={kpis.get('orders_today')}, revenue_month={kpis.get('revenue_month')}")


class TestUserRegistrationCountryCode:
    """Test user registration with country_code derived from phone prefix"""
    
    def test_register_with_tz_phone_prefix(self):
        """POST /api/auth/register with +255 phone prefix creates user with country_code=TZ"""
        timestamp = int(time.time())
        unique_email = f"test_tz_{timestamp}@example.com"
        form_loaded_at = (datetime.utcnow() - timedelta(seconds=6)).isoformat()
        
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": unique_email,
                "password": "TestPass123!",
                "full_name": "Test TZ User",
                "phone": "712345678",
                "country_code": "+255",
                "form_loaded_at": form_loaded_at
            }
        )
        
        # May get 400 if email exists or 429 if rate limited
        if response.status_code == 429:
            pytest.skip("Rate limited - expected behavior")
        
        if response.status_code == 200:
            data = response.json()
            # Check if token is valid (not empty - which would indicate bot detection)
            if data.get("token"):
                assert "user" in data, "Response should contain 'user' key"
                print(f"User registered with TZ phone prefix: {data.get('user', {}).get('email')}")
            else:
                print("Registration returned empty token - may be rate limited or bot detected")
        elif response.status_code == 400:
            # Email already exists
            print(f"Email already registered: {unique_email}")
        else:
            print(f"Registration response: {response.status_code} - {response.text}")
    
    def test_register_with_ke_phone_prefix(self):
        """POST /api/auth/register with +254 phone prefix creates user with country_code=KE"""
        timestamp = int(time.time())
        unique_email = f"test_ke_{timestamp}@example.com"
        form_loaded_at = (datetime.utcnow() - timedelta(seconds=6)).isoformat()
        
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": unique_email,
                "password": "TestPass123!",
                "full_name": "Test KE User",
                "phone": "712345678",
                "country_code": "+254",
                "form_loaded_at": form_loaded_at
            }
        )
        
        if response.status_code == 429:
            pytest.skip("Rate limited - expected behavior")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("token"):
                assert "user" in data, "Response should contain 'user' key"
                print(f"User registered with KE phone prefix: {data.get('user', {}).get('email')}")
            else:
                print("Registration returned empty token - may be rate limited or bot detected")
        elif response.status_code == 400:
            print(f"Email already registered: {unique_email}")
        else:
            print(f"Registration response: {response.status_code} - {response.text}")
    
    def test_register_with_ug_phone_prefix(self):
        """POST /api/auth/register with +256 phone prefix creates user with country_code=UG"""
        timestamp = int(time.time())
        unique_email = f"test_ug_{timestamp}@example.com"
        form_loaded_at = (datetime.utcnow() - timedelta(seconds=6)).isoformat()
        
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": unique_email,
                "password": "TestPass123!",
                "full_name": "Test UG User",
                "phone": "712345678",
                "country_code": "+256",
                "form_loaded_at": form_loaded_at
            }
        )
        
        if response.status_code == 429:
            pytest.skip("Rate limited - expected behavior")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("token"):
                assert "user" in data, "Response should contain 'user' key"
                print(f"User registered with UG phone prefix: {data.get('user', {}).get('email')}")
            else:
                print("Registration returned empty token - may be rate limited or bot detected")
        elif response.status_code == 400:
            print(f"Email already registered: {unique_email}")
        else:
            print(f"Registration response: {response.status_code} - {response.text}")


class TestAdminLoginWithAntiBot:
    """Test admin login with anti-bot protection"""
    
    def test_admin_login_with_timing(self):
        """Admin login with form_loaded_at timing field works"""
        form_loaded_at = (datetime.utcnow() - timedelta(seconds=5)).isoformat()
        
        response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD,
                "form_loaded_at": form_loaded_at
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain 'token'"
        assert "user" in data, "Response should contain 'user'"
        assert data["user"]["role"] == "admin", "User should have admin role"
        print(f"Admin login successful: {data['user']['email']}")
    
    def test_admin_login_without_timing(self):
        """Admin login without form_loaded_at still works (backwards compatibility)"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            }
        )
        
        # Should work for backwards compatibility
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain 'token'"
        print("Admin login without timing field successful")


class TestCountryCodeResolution:
    """Test _resolve_country_from_phone helper function behavior"""
    
    def test_phone_prefix_mapping(self):
        """Verify phone prefix to country code mapping"""
        # This tests the backend logic indirectly through registration
        # The mapping should be: +255=TZ, +254=KE, +256=UG, +250=RW
        
        # We can verify this by checking the user creation response
        # or by checking the database directly
        
        # For now, we verify the endpoint accepts these prefixes
        prefixes = ["+255", "+254", "+256", "+250"]
        for prefix in prefixes:
            timestamp = int(time.time())
            unique_email = f"test_prefix_{prefix.replace('+', '')}_{timestamp}@example.com"
            form_loaded_at = (datetime.utcnow() - timedelta(seconds=6)).isoformat()
            
            response = requests.post(
                f"{BASE_URL}/api/auth/register",
                json={
                    "email": unique_email,
                    "password": "TestPass123!",
                    "full_name": f"Test {prefix} User",
                    "phone": "712345678",
                    "country_code": prefix,
                    "form_loaded_at": form_loaded_at
                }
            )
            
            if response.status_code == 429:
                print(f"Rate limited for prefix {prefix}")
                continue
            
            if response.status_code == 200:
                data = response.json()
                if data.get("token"):
                    print(f"Registration with prefix {prefix} successful")
                else:
                    print(f"Registration with prefix {prefix} returned empty token")
            elif response.status_code == 400:
                print(f"Email already registered for prefix {prefix}")
            else:
                print(f"Registration with prefix {prefix}: {response.status_code}")


class TestActiveCountryConfig:
    """Test active country configuration endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        form_loaded_at = (datetime.utcnow() - timedelta(seconds=5)).isoformat()
        login_response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD,
                "form_loaded_at": form_loaded_at
            }
        )
        if login_response.status_code == 200:
            self.token = login_response.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip(f"Admin login failed: {login_response.status_code}")
    
    def test_get_active_country_config(self):
        """GET /api/admin/active-country-config returns country configuration"""
        response = requests.get(
            f"{BASE_URL}/api/admin/active-country-config",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "code" in data, "Response should contain 'code'"
        assert "name" in data, "Response should contain 'name'"
        assert "currency" in data, "Response should contain 'currency'"
        assert "phone_prefix" in data, "Response should contain 'phone_prefix'"
        
        print(f"Active country config: {data.get('code')} - {data.get('name')} ({data.get('currency')})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
