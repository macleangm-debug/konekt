"""
Customer Portal Pack 1 Backend API Tests
Tests for Codebase Pack 1: Customer Portal & Service Flow Alignment
- Customer Orders API (/api/customer/orders)
- Customer Referrals Overview API (/api/customer/referrals/overview)
- Address CRUD with country/phone prefix support
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_CUSTOMER_EMAIL = "testcustomer@konekt.co.tz"
TEST_CUSTOMER_PASSWORD = "TestPass123!"


class TestCustomerOrdersNewAPI:
    """Test new /api/customer/orders endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for customer"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_CUSTOMER_EMAIL,
            "password": TEST_CUSTOMER_PASSWORD
        })
        
        if response.status_code == 401:
            response = requests.post(f"{BASE_URL}/api/auth/register", json={
                "email": TEST_CUSTOMER_EMAIL,
                "password": TEST_CUSTOMER_PASSWORD,
                "full_name": "Test Customer"
            })
        
        if response.status_code in [200, 201]:
            self.token = response.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            self.token = None
            self.headers = {}
    
    def test_customer_orders_unauthorized(self):
        """Test /api/customer/orders returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/customer/orders")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ /api/customer/orders properly requires authentication")
    
    def test_customer_orders_authorized(self):
        """Test /api/customer/orders returns list with auth"""
        if not self.token:
            pytest.skip("No auth token available")
        
        response = requests.get(f"{BASE_URL}/api/customer/orders", headers=self.headers)
        assert response.status_code == 200, f"Failed to get orders: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of orders"
        print(f"✓ /api/customer/orders returned {len(data)} orders")


class TestReferralsOverviewAPI:
    """Test new /api/customer/referrals/overview endpoint for dashboard"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for customer"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_CUSTOMER_EMAIL,
            "password": TEST_CUSTOMER_PASSWORD
        })
        
        if response.status_code in [200, 201]:
            self.token = response.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            self.token = None
            self.headers = {}
    
    def test_referrals_overview_unauthorized(self):
        """Test /api/customer/referrals/overview returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/customer/referrals/overview")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ /api/customer/referrals/overview properly requires authentication")
    
    def test_referrals_overview_authorized(self):
        """Test /api/customer/referrals/overview returns referral data"""
        if not self.token:
            pytest.skip("No auth token available")
        
        response = requests.get(f"{BASE_URL}/api/customer/referrals/overview", headers=self.headers)
        assert response.status_code == 200, f"Failed to get referrals overview: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "referral_code" in data, "Missing referral_code in response"
        assert "points_balance" in data, "Missing points_balance in response"
        assert "total_referrals" in data, "Missing total_referrals in response"
        
        # Verify wallet sub-object
        assert "wallet" in data, "Missing wallet in response"
        assert "points_balance" in data["wallet"], "Missing wallet.points_balance in response"
        
        print(f"✓ /api/customer/referrals/overview returned: code={data['referral_code']}, points={data['points_balance']}")


class TestAddressWithCountrySupport:
    """Test address CRUD with country and phone prefix support"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for customer"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_CUSTOMER_EMAIL,
            "password": TEST_CUSTOMER_PASSWORD
        })
        
        if response.status_code in [200, 201]:
            self.token = response.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            self.token = None
            self.headers = {}
    
    def test_create_address_with_country_phone_prefix(self):
        """Test creating address with country code and phone prefix"""
        if not self.token:
            pytest.skip("No auth token available")
        
        # Create address with Kenya country code
        address_data = {
            "label": "TEST_Kenya_Office",
            "full_name": "Test Kenya User",
            "company_name": "Test Company Kenya",
            "country": "KE",  # Using country code
            "city": "Nairobi",
            "address_line_1": "456 Kenyatta Ave",
            "phone_prefix": "+254",  # Kenya dial code
            "phone_number": "712345678",
            "is_default": False,
            "type": "shipping"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/customer/addresses",
            json=address_data,
            headers=self.headers
        )
        
        assert response.status_code in [200, 201], f"Failed to create address: {response.text}"
        data = response.json()
        
        # Verify address was created with correct data
        assert "id" in data, "No id in created address"
        assert data.get("country") == "KE", f"Country should be KE, got {data.get('country')}"
        assert data.get("phone_prefix") == "+254", f"Phone prefix should be +254, got {data.get('phone_prefix')}"
        assert data.get("city") == "Nairobi", f"City should be Nairobi, got {data.get('city')}"
        
        print(f"✓ Created address with country={data['country']}, phone_prefix={data['phone_prefix']}")
        
        # Cleanup
        if data.get("id"):
            requests.delete(f"{BASE_URL}/api/customer/addresses/{data['id']}", headers=self.headers)
            print(f"✓ Cleaned up test address {data['id']}")
    
    def test_create_address_with_uganda_country(self):
        """Test creating address with Uganda country code"""
        if not self.token:
            pytest.skip("No auth token available")
        
        address_data = {
            "label": "TEST_Uganda_Branch",
            "country": "UG",  # Uganda
            "city": "Kampala",
            "address_line_1": "789 Kampala Road",
            "phone_prefix": "+256",
            "phone_number": "700123456",
            "type": "shipping"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/customer/addresses",
            json=address_data,
            headers=self.headers
        )
        
        assert response.status_code in [200, 201], f"Failed to create address: {response.text}"
        data = response.json()
        
        assert data.get("country") == "UG", f"Country should be UG"
        assert data.get("phone_prefix") == "+256", f"Phone prefix should be +256"
        
        print(f"✓ Created Uganda address with phone_prefix={data['phone_prefix']}")
        
        # Cleanup
        if data.get("id"):
            requests.delete(f"{BASE_URL}/api/customer/addresses/{data['id']}", headers=self.headers)


class TestQuoteApprovalFlow:
    """Test quote approval and conversion to invoice flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for customer"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_CUSTOMER_EMAIL,
            "password": TEST_CUSTOMER_PASSWORD
        })
        
        if response.status_code in [200, 201]:
            self.token = response.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            self.token = None
            self.headers = {}
    
    def test_get_quotes_list(self):
        """Test getting customer quotes list"""
        if not self.token:
            pytest.skip("No auth token available")
        
        response = requests.get(f"{BASE_URL}/api/customer/quotes", headers=self.headers)
        assert response.status_code == 200, f"Failed to get quotes: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of quotes"
        print(f"✓ Customer has {len(data)} quotes")
    
    def test_get_invoices_list(self):
        """Test getting customer invoices list"""
        if not self.token:
            pytest.skip("No auth token available")
        
        response = requests.get(f"{BASE_URL}/api/customer/invoices", headers=self.headers)
        assert response.status_code == 200, f"Failed to get invoices: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of invoices"
        print(f"✓ Customer has {len(data)} invoices")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
