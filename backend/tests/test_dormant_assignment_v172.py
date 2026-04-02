"""
Test Suite for Iteration 172: Dormant Client Alert System + Assignment Reasoning Transparency

Pack 1: Dormant Client Alert System
- GET /api/admin/dormant-clients/summary — Summary counts with per-owner breakdown
- GET /api/admin/dormant-clients/alerts — Full list of dormant clients with filters
- POST /api/admin/dormant-clients/{client_id}/reactivate — Mark client as reactivated
- GET /api/staff/dormant-clients/mine — Sales owner's own dormant clients
- GET /api/staff/dormant-clients/summary — Sales owner's own summary
- POST /api/staff/dormant-clients/{client_id}/reactivate — Sales reactivate own clients

Pack 2: Assignment Reasoning Transparency
- GET /api/admin/assignment/candidates/{product_id} — Regression test
- GET /api/admin/assignment/explain/{order_id} — Returns 404 for nonexistent orders
- GET /api/admin/assignment/decisions — Returns array (regression)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
SALES_EMAIL = "neema.sales@konekt.demo"
SALES_PASSWORD = "Sales123!"


class TestAdminAuth:
    """Admin authentication tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        return data["token"]
    
    @pytest.fixture(scope="class")
    def sales_token(self):
        """Get sales auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SALES_EMAIL,
            "password": SALES_PASSWORD
        })
        assert response.status_code == 200, f"Sales login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        return data["token"]
    
    def test_admin_login(self, admin_token):
        """Verify admin login works"""
        assert admin_token is not None
        assert len(admin_token) > 0
        print(f"✓ Admin login successful")
    
    def test_sales_login(self, sales_token):
        """Verify sales login works"""
        assert sales_token is not None
        assert len(sales_token) > 0
        print(f"✓ Sales login successful")


class TestDormantClientAdminEndpoints:
    """Admin dormant client endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_admin_dormant_summary(self, admin_token):
        """GET /api/admin/dormant-clients/summary — Returns summary counts and per-owner breakdown"""
        response = requests.get(
            f"{BASE_URL}/api/admin/dormant-clients/summary",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify summary structure
        assert "summary" in data, "Missing 'summary' key"
        summary = data["summary"]
        assert "at_risk" in summary, "Missing 'at_risk' count"
        assert "inactive" in summary, "Missing 'inactive' count"
        assert "lost" in summary, "Missing 'lost' count"
        assert "active" in summary, "Missing 'active' count"
        
        # Verify by_owner structure
        assert "by_owner" in data, "Missing 'by_owner' key"
        assert isinstance(data["by_owner"], list), "by_owner should be a list"
        
        print(f"✓ Dormant summary: at_risk={summary['at_risk']}, inactive={summary['inactive']}, lost={summary['lost']}, active={summary['active']}")
        print(f"✓ Owners with dormant clients: {len(data['by_owner'])}")
    
    def test_admin_dormant_alerts_all(self, admin_token):
        """GET /api/admin/dormant-clients/alerts — Returns full list of dormant clients"""
        response = requests.get(
            f"{BASE_URL}/api/admin/dormant-clients/alerts",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "alerts" in data, "Missing 'alerts' key"
        assert "total" in data, "Missing 'total' key"
        assert isinstance(data["alerts"], list), "alerts should be a list"
        
        # Verify alert structure if any exist
        if len(data["alerts"]) > 0:
            alert = data["alerts"][0]
            assert "client_id" in alert, "Missing client_id"
            assert "client_name" in alert, "Missing client_name"
            assert "client_type" in alert, "Missing client_type"
            assert "status" in alert, "Missing status"
            assert "days_since_activity" in alert, "Missing days_since_activity"
            assert alert["status"] in ["at_risk", "inactive", "lost"], f"Unexpected status: {alert['status']}"
        
        print(f"✓ Dormant alerts: {data['total']} total clients")
    
    def test_admin_dormant_alerts_filter_at_risk(self, admin_token):
        """GET /api/admin/dormant-clients/alerts?status=at_risk — Filter by at_risk status"""
        response = requests.get(
            f"{BASE_URL}/api/admin/dormant-clients/alerts?status=at_risk",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # All returned alerts should be at_risk
        for alert in data["alerts"]:
            assert alert["status"] == "at_risk", f"Expected at_risk, got {alert['status']}"
        
        print(f"✓ At-risk filter: {data['total']} clients")
    
    def test_admin_dormant_alerts_filter_inactive(self, admin_token):
        """GET /api/admin/dormant-clients/alerts?status=inactive — Filter by inactive status"""
        response = requests.get(
            f"{BASE_URL}/api/admin/dormant-clients/alerts?status=inactive",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        for alert in data["alerts"]:
            assert alert["status"] == "inactive", f"Expected inactive, got {alert['status']}"
        
        print(f"✓ Inactive filter: {data['total']} clients")
    
    def test_admin_dormant_alerts_filter_lost(self, admin_token):
        """GET /api/admin/dormant-clients/alerts?status=lost — Filter by lost status"""
        response = requests.get(
            f"{BASE_URL}/api/admin/dormant-clients/alerts?status=lost",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        for alert in data["alerts"]:
            assert alert["status"] == "lost", f"Expected lost, got {alert['status']}"
        
        print(f"✓ Lost filter: {data['total']} clients")


class TestDormantClientReactivation:
    """Test reactivation functionality"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_admin_reactivate_client(self, admin_token):
        """POST /api/admin/dormant-clients/{client_id}/reactivate — Mark client as reactivated"""
        # First get a dormant client
        response = requests.get(
            f"{BASE_URL}/api/admin/dormant-clients/alerts",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data["alerts"]) == 0:
            pytest.skip("No dormant clients to reactivate")
        
        client_id = data["alerts"][0]["client_id"]
        
        # Reactivate the client
        response = requests.post(
            f"{BASE_URL}/api/admin/dormant-clients/{client_id}/reactivate",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        result = response.json()
        
        assert result.get("ok") == True, "Reactivation should return ok=True"
        assert result.get("client_id") == client_id, "Should return client_id"
        
        print(f"✓ Reactivated client: {client_id}")


class TestDormantClientStaffEndpoints:
    """Staff/Sales dormant client endpoints"""
    
    @pytest.fixture(scope="class")
    def sales_token(self):
        """Get sales auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SALES_EMAIL,
            "password": SALES_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_staff_my_dormant_clients(self, sales_token):
        """GET /api/staff/dormant-clients/mine — Returns only sales owner's own dormant clients"""
        response = requests.get(
            f"{BASE_URL}/api/staff/dormant-clients/mine",
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "alerts" in data, "Missing 'alerts' key"
        assert "total" in data, "Missing 'total' key"
        assert isinstance(data["alerts"], list), "alerts should be a list"
        
        print(f"✓ Staff dormant clients: {data['total']} total")
    
    def test_staff_my_dormant_summary(self, sales_token):
        """GET /api/staff/dormant-clients/summary — Returns sales owner's own summary"""
        response = requests.get(
            f"{BASE_URL}/api/staff/dormant-clients/summary",
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "summary" in data, "Missing 'summary' key"
        assert "by_owner" in data, "Missing 'by_owner' key"
        
        print(f"✓ Staff dormant summary retrieved")


class TestAssignmentRegressions:
    """Regression tests for assignment endpoints from Phase 22"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_assignment_candidates_endpoint(self, admin_token):
        """GET /api/admin/assignment/candidates/{product_id} — Regression test"""
        # Use a known product ID from context
        product_id = "6d927ec9-a7b8-43f5-8ade-15f211d2112a"
        
        response = requests.get(
            f"{BASE_URL}/api/admin/assignment/candidates/{product_id}?quantity=10",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "product_id" in data, "Missing product_id"
        assert "candidates" in data, "Missing candidates"
        assert "engine" in data, "Missing engine"
        assert data["engine"] == "stock_first_product", f"Expected stock_first_product engine"
        
        print(f"✓ Candidates endpoint: {len(data['candidates'])} candidates for product")
    
    def test_assignment_explain_404_for_nonexistent(self, admin_token):
        """GET /api/admin/assignment/explain/{order_id} — Returns 404 for nonexistent orders"""
        fake_order_id = "nonexistent-order-12345"
        
        response = requests.get(
            f"{BASE_URL}/api/admin/assignment/explain/{fake_order_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        print(f"✓ Explain endpoint returns 404 for nonexistent order")
    
    def test_assignment_decisions_returns_array(self, admin_token):
        """GET /api/admin/assignment/decisions — Returns array (regression)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/assignment/decisions",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Should return a list (may be empty if no decisions yet)
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        
        print(f"✓ Decisions endpoint returns array: {len(data)} decisions")
    
    def test_assignment_decisions_with_engine_filter(self, admin_token):
        """GET /api/admin/assignment/decisions?engine=stock_first_product — Filter by engine"""
        response = requests.get(
            f"{BASE_URL}/api/admin/assignment/decisions?engine=stock_first_product",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        
        # All returned decisions should have the filtered engine
        for decision in data:
            assert decision.get("engine_used") == "stock_first_product", \
                f"Expected stock_first_product, got {decision.get('engine_used')}"
        
        print(f"✓ Decisions filter by engine: {len(data)} decisions")


class TestHealthAndBasicEndpoints:
    """Basic health and regression tests"""
    
    def test_health_endpoint(self):
        """GET /api/health — Basic health check"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        print(f"✓ Health endpoint OK")
    
    def test_admin_login_regression(self):
        """POST /api/auth/login — Admin login regression"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "admin"
        print(f"✓ Admin login regression OK")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
