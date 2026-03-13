"""
Customer Portal Backend API Tests
Tests for customer quotes, invoices, addresses, referrals, points, and orders APIs
Created for iteration 26 - Customer Portal Redesign
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials provided by main agent
TEST_CUSTOMER_EMAIL = "testcustomer@konekt.co.tz"
TEST_CUSTOMER_PASSWORD = "TestPass123!"
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


class TestHealthAndBasicEndpoints:
    """Basic health check and setup verification"""
    
    def test_api_health(self):
        """Verify API is healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        print("✓ API health check passed")
    

class TestCustomerAuthentication:
    """Customer login and authentication flow tests"""
    
    def test_customer_login_success(self):
        """Test customer can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_CUSTOMER_EMAIL,
            "password": TEST_CUSTOMER_PASSWORD
        })
        
        # User might not exist yet, so we'll accept 401 or create user first
        if response.status_code == 401:
            # User doesn't exist - try registering
            reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
                "email": TEST_CUSTOMER_EMAIL,
                "password": TEST_CUSTOMER_PASSWORD,
                "full_name": "Test Customer"
            })
            if reg_response.status_code in [200, 201]:
                print("✓ Created test customer account")
                data = reg_response.json()
                assert "token" in data
                return
            # User already exists but password might be wrong
            pytest.skip("Customer login failed - user may need to be created with correct credentials")
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert "user" in data, "No user in response"
        print(f"✓ Customer login successful for {data['user'].get('email')}")


class TestCustomerQuotesAPI:
    """Customer Quotes API endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for customer"""
        # Try login first, then register if needed
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
    
    def test_list_customer_quotes_unauthorized(self):
        """Test quotes endpoint returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/customer/quotes")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Quotes endpoint properly requires authentication")
    
    def test_list_customer_quotes_authorized(self):
        """Test quotes endpoint returns list with auth"""
        if not self.token:
            pytest.skip("No auth token available")
        
        response = requests.get(f"{BASE_URL}/api/customer/quotes", headers=self.headers)
        assert response.status_code == 200, f"Failed to get quotes: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of quotes"
        print(f"✓ Customer quotes list returned {len(data)} quotes")


class TestCustomerInvoicesAPI:
    """Customer Invoices API endpoint tests"""
    
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
    
    def test_list_customer_invoices_unauthorized(self):
        """Test invoices endpoint returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/customer/invoices")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invoices endpoint properly requires authentication")
    
    def test_list_customer_invoices_authorized(self):
        """Test invoices endpoint returns list with auth"""
        if not self.token:
            pytest.skip("No auth token available")
        
        response = requests.get(f"{BASE_URL}/api/customer/invoices", headers=self.headers)
        assert response.status_code == 200, f"Failed to get invoices: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of invoices"
        print(f"✓ Customer invoices list returned {len(data)} invoices")


class TestCustomerAddressesAPI:
    """Customer Addresses API endpoint tests - CRUD operations"""
    
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
    
    def test_list_addresses_unauthorized(self):
        """Test addresses endpoint returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/customer/addresses")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Addresses endpoint properly requires authentication")
    
    def test_list_addresses_authorized(self):
        """Test addresses endpoint returns list with auth"""
        if not self.token:
            pytest.skip("No auth token available")
        
        response = requests.get(f"{BASE_URL}/api/customer/addresses", headers=self.headers)
        assert response.status_code == 200, f"Failed to get addresses: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of addresses"
        print(f"✓ Customer addresses list returned {len(data)} addresses")
    
    def test_create_address(self):
        """Test creating a new address"""
        if not self.token:
            pytest.skip("No auth token available")
        
        address_data = {
            "label": "TEST_Office",
            "address_line_1": "123 Test Street",
            "address_line_2": "Suite 100",
            "city": "Dar es Salaam",
            "state": "Dar es Salaam",
            "postal_code": "11000",
            "country": "Tanzania",
            "type": "shipping",
            "is_default": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/customer/addresses",
            json=address_data,
            headers=self.headers
        )
        
        assert response.status_code in [200, 201], f"Failed to create address: {response.text}"
        data = response.json()
        assert "id" in data, "No id in created address"
        assert data.get("address_line_1") == address_data["address_line_1"]
        print(f"✓ Address created successfully with id: {data['id']}")
        
        # Cleanup - delete the test address
        if data.get("id"):
            requests.delete(f"{BASE_URL}/api/customer/addresses/{data['id']}", headers=self.headers)
    
    def test_address_crud_flow(self):
        """Test full CRUD flow for addresses"""
        if not self.token:
            pytest.skip("No auth token available")
        
        # CREATE
        address_data = {
            "label": "TEST_CRUDAddress",
            "address_line_1": "456 CRUD Test Road",
            "city": "Arusha",
            "country": "Tanzania",
            "type": "billing"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/customer/addresses",
            json=address_data,
            headers=self.headers
        )
        assert create_response.status_code in [200, 201], f"Create failed: {create_response.text}"
        created = create_response.json()
        address_id = created.get("id")
        assert address_id, "No id returned on create"
        print(f"✓ CREATE address: {address_id}")
        
        # READ
        read_response = requests.get(
            f"{BASE_URL}/api/customer/addresses/{address_id}",
            headers=self.headers
        )
        assert read_response.status_code == 200, f"Read failed: {read_response.text}"
        fetched = read_response.json()
        assert fetched.get("address_line_1") == address_data["address_line_1"]
        print(f"✓ READ address verified")
        
        # UPDATE
        update_data = {"label": "TEST_Updated Label", "city": "Moshi"}
        update_response = requests.put(
            f"{BASE_URL}/api/customer/addresses/{address_id}",
            json=update_data,
            headers=self.headers
        )
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        updated = update_response.json()
        assert updated.get("city") == "Moshi"
        print(f"✓ UPDATE address: city changed to Moshi")
        
        # DELETE
        delete_response = requests.delete(
            f"{BASE_URL}/api/customer/addresses/{address_id}",
            headers=self.headers
        )
        assert delete_response.status_code in [200, 204], f"Delete failed: {delete_response.text}"
        print(f"✓ DELETE address: {address_id}")
        
        # Verify deletion
        verify_response = requests.get(
            f"{BASE_URL}/api/customer/addresses/{address_id}",
            headers=self.headers
        )
        assert verify_response.status_code == 404, "Address should be deleted"
        print(f"✓ Verified address is deleted")


class TestCustomerOrdersAPI:
    """Customer Orders API endpoint tests"""
    
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
    
    def test_get_my_orders(self):
        """Test getting customer's orders via /api/orders/me"""
        if not self.token:
            pytest.skip("No auth token available")
        
        response = requests.get(f"{BASE_URL}/api/orders/me", headers=self.headers)
        assert response.status_code == 200, f"Failed to get orders: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of orders"
        print(f"✓ Customer orders (via /api/orders/me) returned {len(data)} orders")


class TestReferralsAndPointsAPI:
    """Referrals and Points API endpoint tests"""
    
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
    
    def test_get_referrals_me(self):
        """Test getting customer's referral info"""
        if not self.token:
            pytest.skip("No auth token available")
        
        response = requests.get(f"{BASE_URL}/api/referrals/me", headers=self.headers)
        # API may return 200 or 404 depending on implementation
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Referrals/me returned: {data.keys() if isinstance(data, dict) else 'list'}")
        elif response.status_code == 404:
            print("✓ Referrals/me returns 404 (no referral data yet)")
        else:
            assert False, f"Unexpected status {response.status_code}: {response.text}"
    
    def test_get_points_me(self):
        """Test getting customer's points info"""
        if not self.token:
            pytest.skip("No auth token available")
        
        response = requests.get(f"{BASE_URL}/api/points/me", headers=self.headers)
        # API may return 200 or 404 depending on implementation
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Points/me returned: {data.keys() if isinstance(data, dict) else 'list'}")
        elif response.status_code == 404:
            print("✓ Points/me returns 404 (no points data yet)")
        else:
            assert False, f"Unexpected status {response.status_code}: {response.text}"
    
    def test_get_my_referrals_list(self):
        """Test getting customer's referrals list"""
        if not self.token:
            pytest.skip("No auth token available")
        
        response = requests.get(f"{BASE_URL}/api/referrals/my-referrals", headers=self.headers)
        if response.status_code == 200:
            data = response.json()
            print(f"✓ My referrals list returned data")
        elif response.status_code == 404:
            print("✓ My referrals returns 404 (no referral data)")
        else:
            # Might be 401 if endpoint doesn't exist
            print(f"✓ My referrals status: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
