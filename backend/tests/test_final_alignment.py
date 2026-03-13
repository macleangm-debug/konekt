"""
Test Final Alignment Code Pack
Tests for: QA Routes, Health Routes, Team Roles, Admin Setup, Creative Projects,
Creative Project Collaboration, Customer Statement, Affiliate Self-Service, Stock Reserve/Deduct
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/admin/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    """Create auth headers"""
    return {"Authorization": f"Bearer {admin_token}"}


# ==================== HEALTH ROUTES ====================

class TestHealthRoutes:
    """Health check endpoint tests"""
    
    def test_health_endpoint(self):
        """Test /api/health returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        # The original /api/health endpoint returns {"status": "healthy"}
        assert data["status"] in ["healthy", "ok", "degraded"]
    
    def test_health_ready_endpoint(self):
        """Test /api/health/ready returns readiness status"""
        response = requests.get(f"{BASE_URL}/api/health/ready")
        assert response.status_code == 200
        data = response.json()
        assert "ready" in data
        assert isinstance(data["ready"], bool)


# ==================== QA ROUTES ====================

class TestQARoutes:
    """QA health check endpoint tests"""
    
    def test_qa_health_check_requires_auth(self):
        """Test QA health check requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/qa/health-check")
        assert response.status_code == 401
    
    def test_qa_health_check_authenticated(self, auth_headers):
        """Test QA health check returns readiness score"""
        response = requests.get(
            f"{BASE_URL}/api/admin/qa/health-check",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "counts" in data
        assert "checks" in data
        assert "ready_score" in data
        assert "max_score" in data
        assert "status" in data
        
        # Verify counts has expected keys
        expected_count_keys = ["users", "products", "inventory_variants", "orders"]
        for key in expected_count_keys:
            assert key in data["counts"]
        
        # Verify checks structure
        expected_check_keys = ["has_products", "has_variants", "has_warehouses"]
        for key in expected_check_keys:
            assert key in data["checks"]
        
        # Verify score is valid
        assert data["ready_score"] <= data["max_score"]
        assert data["status"] in ["ready", "needs_attention"]


# ==================== TEAM ROLES ROUTES ====================

class TestTeamRolesRoutes:
    """Team roles endpoint tests"""
    
    def test_list_staff_roles_requires_auth(self):
        """Test listing staff roles requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/team-roles/roles")
        assert response.status_code == 401
    
    def test_list_staff_roles(self, auth_headers):
        """Test listing available staff roles"""
        response = requests.get(
            f"{BASE_URL}/api/admin/team-roles/roles",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify it returns a list of roles
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Verify role structure
        for role in data:
            assert "value" in role
            assert "label" in role
        
        # Check expected roles exist
        role_values = [r["value"] for r in data]
        assert "sales" in role_values
        assert "finance" in role_values
        assert "production" in role_values
    
    def test_list_staff_users(self, auth_headers):
        """Test listing staff users with roles"""
        response = requests.get(
            f"{BASE_URL}/api/admin/team-roles/users",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should return a list
        assert isinstance(data, list)


# ==================== ADMIN SETUP ROUTES ====================

class TestAdminSetupRoutes:
    """Admin setup endpoint tests (industries and sources)"""
    
    def test_get_industries_requires_auth(self):
        """Test getting industries requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/setup/industries")
        assert response.status_code == 401
    
    def test_get_industries(self, auth_headers):
        """Test getting all industries"""
        response = requests.get(
            f"{BASE_URL}/api/admin/setup/industries",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_industry(self, auth_headers):
        """Test creating a new industry"""
        response = requests.post(
            f"{BASE_URL}/api/admin/setup/industries",
            headers=auth_headers,
            json={"name": "TEST_Industry_Manufacturing"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["name"] == "TEST_Industry_Manufacturing"
        
        # Store ID for cleanup
        TestAdminSetupRoutes.test_industry_id = data["id"]
    
    def test_delete_industry(self, auth_headers):
        """Test deleting an industry"""
        industry_id = getattr(TestAdminSetupRoutes, 'test_industry_id', None)
        if not industry_id:
            pytest.skip("No test industry created")
        
        response = requests.delete(
            f"{BASE_URL}/api/admin/setup/industries/{industry_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["deleted"] == True
    
    def test_get_sources(self, auth_headers):
        """Test getting all lead sources"""
        response = requests.get(
            f"{BASE_URL}/api/admin/setup/sources",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_source(self, auth_headers):
        """Test creating a new lead source"""
        response = requests.post(
            f"{BASE_URL}/api/admin/setup/sources",
            headers=auth_headers,
            json={"name": "TEST_Source_LinkedIn"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["name"] == "TEST_Source_LinkedIn"
        
        # Store ID for cleanup
        TestAdminSetupRoutes.test_source_id = data["id"]
    
    def test_delete_source(self, auth_headers):
        """Test deleting a lead source"""
        source_id = getattr(TestAdminSetupRoutes, 'test_source_id', None)
        if not source_id:
            pytest.skip("No test source created")
        
        response = requests.delete(
            f"{BASE_URL}/api/admin/setup/sources/{source_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["deleted"] == True
    
    def test_get_payment_terms(self, auth_headers):
        """Test getting payment terms"""
        response = requests.get(
            f"{BASE_URL}/api/admin/setup/payment-terms",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


# ==================== CREATIVE PROJECTS ROUTES ====================

class TestCreativeProjectRoutes:
    """Creative project endpoint tests"""
    
    def test_list_all_projects_admin(self, auth_headers):
        """Test listing all creative projects (admin view)"""
        response = requests.get(
            f"{BASE_URL}/api/creative-projects/admin",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        if len(data) > 0:
            # Verify project structure
            project = data[0]
            assert "id" in project
            assert "status" in project
    
    def test_get_my_projects_requires_auth(self):
        """Test getting my projects requires authentication"""
        response = requests.get(f"{BASE_URL}/api/creative-projects/my")
        assert response.status_code == 401
    
    def test_get_my_projects(self, auth_headers):
        """Test getting current user's creative projects"""
        response = requests.get(
            f"{BASE_URL}/api/creative-projects/my",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


# ==================== CREATIVE PROJECT COLLABORATION ROUTES ====================

class TestCreativeProjectCollabRoutes:
    """Creative project collaboration endpoint tests (comments, revisions, deliverables)"""
    
    @pytest.fixture(scope="class")
    def project_id(self, auth_headers):
        """Get a project ID for testing"""
        response = requests.get(
            f"{BASE_URL}/api/creative-projects/admin",
            headers=auth_headers
        )
        data = response.json()
        if len(data) > 0:
            return data[0]["id"]
        pytest.skip("No creative projects available for testing")
    
    def test_list_project_comments(self, auth_headers, project_id):
        """Test listing comments for a project"""
        response = requests.get(
            f"{BASE_URL}/api/creative-project-collab/{project_id}/comments",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_add_project_comment(self, auth_headers, project_id):
        """Test adding a comment to a project"""
        response = requests.post(
            f"{BASE_URL}/api/creative-project-collab/{project_id}/comments",
            headers=auth_headers,
            json={"message": "TEST_Comment - Automated testing comment"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["message"] == "TEST_Comment - Automated testing comment"
        assert "created_at" in data
    
    def test_list_project_revisions(self, auth_headers, project_id):
        """Test listing revision requests for a project"""
        response = requests.get(
            f"{BASE_URL}/api/creative-project-collab/{project_id}/revisions",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_list_project_deliverables(self, auth_headers, project_id):
        """Test listing deliverables for a project"""
        response = requests.get(
            f"{BASE_URL}/api/creative-project-collab/{project_id}/deliverables",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_add_project_deliverable(self, auth_headers, project_id):
        """Test adding a deliverable to a project"""
        response = requests.post(
            f"{BASE_URL}/api/creative-project-collab/{project_id}/deliverables",
            headers=auth_headers,
            json={
                "title": "TEST_Deliverable - Draft Design v1",
                "file_url": "https://example.com/test-deliverable.pdf",
                "file_type": "pdf"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["title"] == "TEST_Deliverable - Draft Design v1"


# ==================== CUSTOMER STATEMENT ROUTES ====================

class TestCustomerStatementRoutes:
    """Customer statement endpoint tests"""
    
    def test_get_my_statement_requires_auth(self):
        """Test getting statement requires authentication"""
        response = requests.get(f"{BASE_URL}/api/customer/statements/me")
        assert response.status_code == 401
    
    def test_get_my_statement(self, auth_headers):
        """Test getting customer statement"""
        response = requests.get(
            f"{BASE_URL}/api/customer/statements/me",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "customer_email" in data
        assert "entries" in data
        assert "summary" in data
        
        # Verify summary structure
        summary = data["summary"]
        assert "total_invoiced" in summary
        assert "total_paid" in summary
        assert "balance_due" in summary


# ==================== AFFILIATE SELF-SERVICE ROUTES ====================

class TestAffiliateSelfServiceRoutes:
    """Affiliate self-service endpoint tests"""
    
    def test_affiliate_dashboard_requires_auth(self):
        """Test affiliate dashboard requires authentication"""
        response = requests.get(f"{BASE_URL}/api/affiliate-self/dashboard")
        assert response.status_code == 401
    
    def test_affiliate_dashboard_non_affiliate(self, auth_headers):
        """Test affiliate dashboard returns 404 for non-affiliate user"""
        response = requests.get(
            f"{BASE_URL}/api/affiliate-self/dashboard",
            headers=auth_headers
        )
        # Admin is not an affiliate, should return 404
        assert response.status_code == 404
        data = response.json()
        assert data["detail"] == "Affiliate profile not found"


# ==================== STOCK RESERVE/DEDUCT ROUTES ====================

class TestStockReserveDeductRoutes:
    """Stock reserve and deduct endpoint tests"""
    
    @pytest.fixture(scope="class")
    def order_id(self, auth_headers):
        """Get an order ID for testing"""
        response = requests.get(
            f"{BASE_URL}/api/admin/orders-ops",
            headers=auth_headers
        )
        data = response.json()
        if len(data) > 0:
            return data[0]["id"]
        pytest.skip("No orders available for testing")
    
    def test_reserve_stock_endpoint_exists(self, auth_headers, order_id):
        """Test reserve stock endpoint exists and responds"""
        response = requests.post(
            f"{BASE_URL}/api/admin/orders-ops/{order_id}/reserve-stock",
            headers=auth_headers
        )
        # Should return 200 or 400 (if stock issues), not 404
        assert response.status_code in [200, 400]
    
    def test_deduct_stock_endpoint_exists(self, auth_headers, order_id):
        """Test deduct stock endpoint exists and responds"""
        response = requests.post(
            f"{BASE_URL}/api/admin/orders-ops/{order_id}/deduct-stock",
            headers=auth_headers
        )
        # Should return 200 or 400 (if stock issues), not 404
        assert response.status_code in [200, 400]


# ==================== STOCK MOVEMENTS ROUTES ====================

class TestStockMovementsRoutes:
    """Stock movements endpoint tests"""
    
    def test_list_stock_movements(self, auth_headers):
        """Test listing stock movements"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stock-movements",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


# ==================== WAREHOUSE TRANSFERS ROUTES ====================

class TestWarehouseTransfersRoutes:
    """Warehouse transfers endpoint tests"""
    
    def test_list_transfers(self, auth_headers):
        """Test listing warehouse transfers"""
        response = requests.get(
            f"{BASE_URL}/api/admin/warehouse-transfers",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
