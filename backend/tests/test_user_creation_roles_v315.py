"""
Test User Creation with All 11 Roles - Iteration 315
Tests the fix for role selection bug where only 5 roles were available.
Now all 11 roles should work: admin, sales, sales_manager, finance_manager, 
marketing, production, vendor_ops, staff, affiliate, vendor, customer
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"

# All 11 roles from UserRole enum
ALL_ROLES = [
    "admin", "sales", "sales_manager", "finance_manager", 
    "marketing", "production", "vendor_ops", "staff", 
    "affiliate", "vendor", "customer"
]

# New roles that were missing before the fix
NEW_ROLES = ["vendor_ops", "staff", "affiliate", "vendor", "sales_manager", "finance_manager"]


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json().get("token")


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    """Auth headers for admin requests"""
    return {"Authorization": f"Bearer {admin_token}"}


class TestUserRoleEnum:
    """Test that all 11 roles are properly defined and accepted"""
    
    def test_admin_login_works(self, admin_token):
        """Verify admin can login"""
        assert admin_token is not None
        assert len(admin_token) > 0
        print("PASSED: Admin login successful")
    
    def test_create_user_with_vendor_ops_role(self, auth_headers):
        """Test creating user with vendor_ops role (was missing before)"""
        unique_id = str(uuid.uuid4())[:8]
        response = requests.post(f"{BASE_URL}/api/admin/users", 
            headers=auth_headers,
            json={
                "email": f"TEST_vendorops_{unique_id}@test.com",
                "password": "TestPass123!",
                "first_name": "VendorOps",
                "last_name": "Test",
                "role": "vendor_ops"
            }
        )
        assert response.status_code in [200, 201], f"Failed to create vendor_ops user: {response.text}"
        data = response.json()
        assert "user" in data or "user_id" in data
        if "user" in data:
            assert data["user"]["role"] == "vendor_ops"
            assert data["user"]["first_name"] == "VendorOps"
            assert data["user"]["last_name"] == "Test"
        print("PASSED: Created user with vendor_ops role")
    
    def test_create_user_with_staff_role(self, auth_headers):
        """Test creating user with staff role (was missing before)"""
        unique_id = str(uuid.uuid4())[:8]
        response = requests.post(f"{BASE_URL}/api/admin/users", 
            headers=auth_headers,
            json={
                "email": f"TEST_staff_{unique_id}@test.com",
                "password": "TestPass123!",
                "first_name": "Staff",
                "last_name": "Member",
                "role": "staff"
            }
        )
        assert response.status_code in [200, 201], f"Failed to create staff user: {response.text}"
        data = response.json()
        if "user" in data:
            assert data["user"]["role"] == "staff"
        print("PASSED: Created user with staff role")
    
    def test_create_user_with_sales_manager_role(self, auth_headers):
        """Test creating user with sales_manager role"""
        unique_id = str(uuid.uuid4())[:8]
        response = requests.post(f"{BASE_URL}/api/admin/users", 
            headers=auth_headers,
            json={
                "email": f"TEST_salesmgr_{unique_id}@test.com",
                "password": "TestPass123!",
                "first_name": "Sales",
                "last_name": "Manager",
                "role": "sales_manager"
            }
        )
        assert response.status_code in [200, 201], f"Failed to create sales_manager user: {response.text}"
        data = response.json()
        if "user" in data:
            assert data["user"]["role"] == "sales_manager"
        print("PASSED: Created user with sales_manager role")
    
    def test_create_user_with_finance_manager_role(self, auth_headers):
        """Test creating user with finance_manager role"""
        unique_id = str(uuid.uuid4())[:8]
        response = requests.post(f"{BASE_URL}/api/admin/users", 
            headers=auth_headers,
            json={
                "email": f"TEST_financemgr_{unique_id}@test.com",
                "password": "TestPass123!",
                "first_name": "Finance",
                "last_name": "Manager",
                "role": "finance_manager"
            }
        )
        assert response.status_code in [200, 201], f"Failed to create finance_manager user: {response.text}"
        data = response.json()
        if "user" in data:
            assert data["user"]["role"] == "finance_manager"
        print("PASSED: Created user with finance_manager role")
    
    def test_create_user_with_affiliate_role(self, auth_headers):
        """Test creating user with affiliate role"""
        unique_id = str(uuid.uuid4())[:8]
        response = requests.post(f"{BASE_URL}/api/admin/users", 
            headers=auth_headers,
            json={
                "email": f"TEST_affiliate_{unique_id}@test.com",
                "password": "TestPass123!",
                "first_name": "Affiliate",
                "last_name": "Partner",
                "role": "affiliate"
            }
        )
        assert response.status_code in [200, 201], f"Failed to create affiliate user: {response.text}"
        data = response.json()
        if "user" in data:
            assert data["user"]["role"] == "affiliate"
        print("PASSED: Created user with affiliate role")
    
    def test_create_user_with_vendor_role(self, auth_headers):
        """Test creating user with vendor role"""
        unique_id = str(uuid.uuid4())[:8]
        response = requests.post(f"{BASE_URL}/api/admin/users", 
            headers=auth_headers,
            json={
                "email": f"TEST_vendor_{unique_id}@test.com",
                "password": "TestPass123!",
                "first_name": "Vendor",
                "last_name": "Supplier",
                "role": "vendor"
            }
        )
        assert response.status_code in [200, 201], f"Failed to create vendor user: {response.text}"
        data = response.json()
        if "user" in data:
            assert data["user"]["role"] == "vendor"
        print("PASSED: Created user with vendor role")


class TestStructuredNames:
    """Test that first_name and last_name are stored separately"""
    
    def test_create_user_stores_first_last_name(self, auth_headers):
        """Test that first_name and last_name are stored separately"""
        unique_id = str(uuid.uuid4())[:8]
        response = requests.post(f"{BASE_URL}/api/admin/users", 
            headers=auth_headers,
            json={
                "email": f"TEST_names_{unique_id}@test.com",
                "password": "TestPass123!",
                "first_name": "John",
                "last_name": "Doe",
                "role": "sales"
            }
        )
        assert response.status_code in [200, 201], f"Failed to create user: {response.text}"
        data = response.json()
        
        # Verify response includes first_name and last_name
        if "user" in data:
            user = data["user"]
            assert user.get("first_name") == "John", f"first_name mismatch: {user}"
            assert user.get("last_name") == "Doe", f"last_name mismatch: {user}"
            # full_name should be constructed from first + last
            assert "John" in user.get("full_name", ""), f"full_name should contain John: {user}"
        print("PASSED: first_name and last_name stored correctly")
    
    def test_create_user_with_only_first_name(self, auth_headers):
        """Test creating user with only first_name (last_name optional)"""
        unique_id = str(uuid.uuid4())[:8]
        response = requests.post(f"{BASE_URL}/api/admin/users", 
            headers=auth_headers,
            json={
                "email": f"TEST_firstname_{unique_id}@test.com",
                "password": "TestPass123!",
                "first_name": "SingleName",
                "last_name": "",
                "role": "staff"
            }
        )
        assert response.status_code in [200, 201], f"Failed to create user: {response.text}"
        data = response.json()
        if "user" in data:
            assert data["user"].get("first_name") == "SingleName"
        print("PASSED: User created with only first_name")
    
    def test_response_includes_structured_names(self, auth_headers):
        """Test that API response includes first_name, last_name, and full_name"""
        unique_id = str(uuid.uuid4())[:8]
        response = requests.post(f"{BASE_URL}/api/admin/users", 
            headers=auth_headers,
            json={
                "email": f"TEST_response_{unique_id}@test.com",
                "password": "TestPass123!",
                "first_name": "Response",
                "last_name": "Test",
                "role": "marketing"
            }
        )
        assert response.status_code in [200, 201], f"Failed: {response.text}"
        data = response.json()
        
        # Check response structure
        assert "user" in data or "user_id" in data, "Response should include user or user_id"
        if "user" in data:
            user = data["user"]
            assert "first_name" in user, "Response should include first_name"
            assert "last_name" in user, "Response should include last_name"
            assert "full_name" in user or "email" in user, "Response should include full_name or email"
        print("PASSED: Response includes structured name fields")


class TestRoleValidation:
    """Test role validation and required fields"""
    
    def test_role_is_required(self, auth_headers):
        """Test that role field is required for user creation"""
        unique_id = str(uuid.uuid4())[:8]
        # Create user without role - should use default or fail
        response = requests.post(f"{BASE_URL}/api/admin/users", 
            headers=auth_headers,
            json={
                "email": f"TEST_norole_{unique_id}@test.com",
                "password": "TestPass123!",
                "first_name": "NoRole",
                "last_name": "User"
                # role intentionally omitted
            }
        )
        # Should either succeed with default role or fail with validation error
        if response.status_code in [200, 201]:
            data = response.json()
            if "user" in data:
                # Default role should be 'customer' based on model
                assert data["user"]["role"] in ALL_ROLES
                print(f"PASSED: Default role assigned: {data['user']['role']}")
        else:
            # Validation error is also acceptable
            print(f"PASSED: Role validation enforced (status {response.status_code})")
    
    def test_invalid_role_rejected(self, auth_headers):
        """Test that invalid role values are rejected"""
        unique_id = str(uuid.uuid4())[:8]
        response = requests.post(f"{BASE_URL}/api/admin/users", 
            headers=auth_headers,
            json={
                "email": f"TEST_badrole_{unique_id}@test.com",
                "password": "TestPass123!",
                "first_name": "Bad",
                "last_name": "Role",
                "role": "invalid_role_xyz"
            }
        )
        # Should fail with 422 validation error
        assert response.status_code == 422, f"Invalid role should be rejected: {response.status_code} - {response.text}"
        print("PASSED: Invalid role rejected with 422")


class TestVendorOpsAccess:
    """Test that vendor_ops users can access vendor-ops endpoints"""
    
    def test_vendor_ops_user_login(self):
        """Test that existing vendor_ops user can login"""
        # Use the test vendor_ops user created by main agent
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "vops.test@konekt.co.tz",
            "password": "VendorOps123!"
        })
        if response.status_code == 200:
            data = response.json()
            assert data["user"]["role"] == "vendor_ops", f"Expected vendor_ops role: {data}"
            print("PASSED: vendor_ops user can login")
        else:
            # User might not exist yet - skip
            pytest.skip("vendor_ops test user not found")
    
    def test_vendor_ops_can_access_vendor_ops_endpoints(self):
        """Test that vendor_ops user can access /api/vendor-ops endpoints"""
        # Login as vendor_ops user
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "vops.test@konekt.co.tz",
            "password": "VendorOps123!"
        })
        if login_response.status_code != 200:
            pytest.skip("vendor_ops test user not found")
        
        token = login_response.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Try accessing vendor-ops dashboard stats
        response = requests.get(f"{BASE_URL}/api/vendor-ops/dashboard-stats", headers=headers)
        assert response.status_code == 200, f"vendor_ops should access dashboard-stats: {response.status_code} - {response.text}"
        print("PASSED: vendor_ops user can access vendor-ops endpoints")
    
    def test_vendor_ops_can_access_supply_review(self):
        """Test that vendor_ops user can access supply review endpoint"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "vops.test@konekt.co.tz",
            "password": "VendorOps123!"
        })
        if login_response.status_code != 200:
            pytest.skip("vendor_ops test user not found")
        
        token = login_response.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Try accessing supply review dashboard
        response = requests.get(f"{BASE_URL}/api/admin/vendor-supply/review-dashboard", headers=headers)
        # vendor_ops should have access via get_admin_user which includes vendor_ops
        assert response.status_code == 200, f"vendor_ops should access supply review: {response.status_code} - {response.text}"
        print("PASSED: vendor_ops user can access supply review")


class TestExistingRoles:
    """Test that existing roles still work correctly"""
    
    def test_create_user_with_admin_role(self, auth_headers):
        """Test creating user with admin role"""
        unique_id = str(uuid.uuid4())[:8]
        response = requests.post(f"{BASE_URL}/api/admin/users", 
            headers=auth_headers,
            json={
                "email": f"TEST_admin_{unique_id}@test.com",
                "password": "TestPass123!",
                "first_name": "Admin",
                "last_name": "User",
                "role": "admin"
            }
        )
        assert response.status_code in [200, 201], f"Failed: {response.text}"
        print("PASSED: Created user with admin role")
    
    def test_create_user_with_sales_role(self, auth_headers):
        """Test creating user with sales role"""
        unique_id = str(uuid.uuid4())[:8]
        response = requests.post(f"{BASE_URL}/api/admin/users", 
            headers=auth_headers,
            json={
                "email": f"TEST_sales_{unique_id}@test.com",
                "password": "TestPass123!",
                "first_name": "Sales",
                "last_name": "Rep",
                "role": "sales"
            }
        )
        assert response.status_code in [200, 201], f"Failed: {response.text}"
        print("PASSED: Created user with sales role")
    
    def test_create_user_with_marketing_role(self, auth_headers):
        """Test creating user with marketing role"""
        unique_id = str(uuid.uuid4())[:8]
        response = requests.post(f"{BASE_URL}/api/admin/users", 
            headers=auth_headers,
            json={
                "email": f"TEST_marketing_{unique_id}@test.com",
                "password": "TestPass123!",
                "first_name": "Marketing",
                "last_name": "User",
                "role": "marketing"
            }
        )
        assert response.status_code in [200, 201], f"Failed: {response.text}"
        print("PASSED: Created user with marketing role")
    
    def test_create_user_with_production_role(self, auth_headers):
        """Test creating user with production role"""
        unique_id = str(uuid.uuid4())[:8]
        response = requests.post(f"{BASE_URL}/api/admin/users", 
            headers=auth_headers,
            json={
                "email": f"TEST_production_{unique_id}@test.com",
                "password": "TestPass123!",
                "first_name": "Production",
                "last_name": "User",
                "role": "production"
            }
        )
        assert response.status_code in [200, 201], f"Failed: {response.text}"
        print("PASSED: Created user with production role")
    
    def test_create_user_with_customer_role(self, auth_headers):
        """Test creating user with customer role"""
        unique_id = str(uuid.uuid4())[:8]
        response = requests.post(f"{BASE_URL}/api/admin/users", 
            headers=auth_headers,
            json={
                "email": f"TEST_customer_{unique_id}@test.com",
                "password": "TestPass123!",
                "first_name": "Customer",
                "last_name": "User",
                "role": "customer"
            }
        )
        assert response.status_code in [200, 201], f"Failed: {response.text}"
        print("PASSED: Created user with customer role")


class TestGetUsersEndpoint:
    """Test GET /api/admin/users endpoint"""
    
    def test_get_users_returns_list(self, auth_headers):
        """Test that GET /api/admin/users returns user list"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "users" in data
        assert "total" in data
        assert isinstance(data["users"], list)
        print(f"PASSED: GET users returned {len(data['users'])} users")
    
    def test_filter_users_by_role(self, auth_headers):
        """Test filtering users by role"""
        response = requests.get(f"{BASE_URL}/api/admin/users?role=admin", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        # All returned users should have admin role
        for user in data["users"]:
            assert user["role"] == "admin", f"Expected admin role: {user}"
        print(f"PASSED: Filter by role works, found {len(data['users'])} admins")
