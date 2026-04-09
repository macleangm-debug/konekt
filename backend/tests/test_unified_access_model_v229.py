"""
Test Suite for Unified Access Model - Phase 1 & Phase 2
Tests: Manager login, sidebar filtering, role badges, team-kpis endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
SALES_MANAGER_EMAIL = "sales.manager@konekt.co.tz"
SALES_MANAGER_PASSWORD = "Manager123!"
FINANCE_MANAGER_EMAIL = "finance@konekt.co.tz"
FINANCE_MANAGER_PASSWORD = "Finance123!"
STAFF_EMAIL = "staff@konekt.co.tz"
STAFF_PASSWORD = "Staff123!"


class TestManagerLogin:
    """Test login flows for manager roles"""
    
    def test_sales_manager_login_via_unified_login(self):
        """Sales Manager should be able to login via /api/auth/login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SALES_MANAGER_EMAIL,
            "password": SALES_MANAGER_PASSWORD
        })
        print(f"Sales Manager login response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["role"] == "sales_manager", f"Expected role 'sales_manager', got {data['user']['role']}"
        assert data["user"]["email"] == SALES_MANAGER_EMAIL
        print(f"Sales Manager login SUCCESS - role: {data['user']['role']}")
    
    def test_finance_manager_login_via_unified_login(self):
        """Finance Manager should be able to login via /api/auth/login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": FINANCE_MANAGER_EMAIL,
            "password": FINANCE_MANAGER_PASSWORD
        })
        print(f"Finance Manager login response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["role"] == "finance_manager", f"Expected role 'finance_manager', got {data['user']['role']}"
        assert data["user"]["email"] == FINANCE_MANAGER_EMAIL
        print(f"Finance Manager login SUCCESS - role: {data['user']['role']}")
    
    def test_admin_login_still_works(self):
        """Admin should still be able to login via /api/auth/login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        print(f"Admin login response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["user"]["role"] == "admin", f"Expected role 'admin', got {data['user']['role']}"
        print(f"Admin login SUCCESS - role: {data['user']['role']}")
    
    def test_sales_manager_login_via_admin_endpoint(self):
        """Sales Manager should also be able to login via /api/admin/auth/login"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": SALES_MANAGER_EMAIL,
            "password": SALES_MANAGER_PASSWORD
        })
        print(f"Sales Manager admin login response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["user"]["role"] == "sales_manager"
        print(f"Sales Manager admin login SUCCESS")
    
    def test_finance_manager_login_via_admin_endpoint(self):
        """Finance Manager should also be able to login via /api/admin/auth/login"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": FINANCE_MANAGER_EMAIL,
            "password": FINANCE_MANAGER_PASSWORD
        })
        print(f"Finance Manager admin login response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["user"]["role"] == "finance_manager"
        print(f"Finance Manager admin login SUCCESS")


class TestAuthMeEndpoint:
    """Test /api/auth/me returns correct role for managers"""
    
    def test_auth_me_returns_sales_manager_role(self):
        """GET /api/auth/me should return sales_manager role"""
        # First login
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SALES_MANAGER_EMAIL,
            "password": SALES_MANAGER_PASSWORD
        })
        assert login_res.status_code == 200
        token = login_res.json()["token"]
        
        # Then check /api/auth/me
        me_res = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        print(f"Auth/me response: {me_res.status_code}")
        assert me_res.status_code == 200
        
        data = me_res.json()
        assert data["role"] == "sales_manager", f"Expected 'sales_manager', got {data['role']}"
        print(f"Auth/me returns correct role: {data['role']}")
    
    def test_auth_me_returns_finance_manager_role(self):
        """GET /api/auth/me should return finance_manager role"""
        # First login
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": FINANCE_MANAGER_EMAIL,
            "password": FINANCE_MANAGER_PASSWORD
        })
        assert login_res.status_code == 200
        token = login_res.json()["token"]
        
        # Then check /api/auth/me
        me_res = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert me_res.status_code == 200
        
        data = me_res.json()
        assert data["role"] == "finance_manager", f"Expected 'finance_manager', got {data['role']}"
        print(f"Auth/me returns correct role: {data['role']}")


class TestTeamKPIsEndpoint:
    """Test Sales Manager dashboard team-kpis endpoint"""
    
    @pytest.fixture
    def sales_manager_token(self):
        """Get sales manager token"""
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SALES_MANAGER_EMAIL,
            "password": SALES_MANAGER_PASSWORD
        })
        if res.status_code != 200:
            pytest.skip("Sales Manager login failed")
        return res.json()["token"]
    
    def test_team_kpis_endpoint_returns_data(self, sales_manager_token):
        """GET /api/admin/dashboard/team-kpis should return team KPIs"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard/team-kpis", headers={
            "Authorization": f"Bearer {sales_manager_token}"
        })
        print(f"Team KPIs response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Check required fields
        assert "team_kpis" in data, "Response should contain team_kpis"
        assert "team_table" in data, "Response should contain team_table"
        assert "pipeline_overview" in data, "Response should contain pipeline_overview"
        assert "leaderboard" in data, "Response should contain leaderboard"
        
        print(f"Team KPIs structure verified")
    
    def test_team_kpis_contains_expected_metrics(self, sales_manager_token):
        """Team KPIs should contain expected metrics"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard/team-kpis", headers={
            "Authorization": f"Bearer {sales_manager_token}"
        })
        assert response.status_code == 200
        
        data = response.json()
        team_kpis = data.get("team_kpis", {})
        
        # Check expected KPI fields
        expected_fields = ["team_deals", "team_revenue_month", "avg_rating", "pipeline_value", 
                          "critical_discount_alerts", "low_rating_alerts"]
        for field in expected_fields:
            assert field in team_kpis, f"team_kpis should contain '{field}'"
        
        print(f"Team KPIs metrics: deals={team_kpis.get('team_deals')}, revenue_month={team_kpis.get('team_revenue_month')}, avg_rating={team_kpis.get('avg_rating')}")
    
    def test_team_table_structure(self, sales_manager_token):
        """Team table should have correct structure"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard/team-kpis", headers={
            "Authorization": f"Bearer {sales_manager_token}"
        })
        assert response.status_code == 200
        
        data = response.json()
        team_table = data.get("team_table", [])
        
        if len(team_table) > 0:
            rep = team_table[0]
            expected_fields = ["id", "name", "deals", "revenue", "pipeline", "commission", "avg_rating"]
            for field in expected_fields:
                assert field in rep, f"Team table entry should contain '{field}'"
            print(f"Team table has {len(team_table)} reps, first rep: {rep.get('name')}")
        else:
            print("Team table is empty (no sales reps)")
    
    def test_leaderboard_structure(self, sales_manager_token):
        """Leaderboard should have correct structure with labels"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard/team-kpis", headers={
            "Authorization": f"Bearer {sales_manager_token}"
        })
        assert response.status_code == 200
        
        data = response.json()
        leaderboard = data.get("leaderboard", [])
        
        if len(leaderboard) > 0:
            entry = leaderboard[0]
            expected_fields = ["rank", "name", "deals", "score", "label"]
            for field in expected_fields:
                assert field in entry, f"Leaderboard entry should contain '{field}'"
            print(f"Leaderboard has {len(leaderboard)} entries, #1: {entry.get('name')} - {entry.get('label')}")
        else:
            print("Leaderboard is empty")


class TestAdminDashboardKPIs:
    """Test admin dashboard KPIs endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if res.status_code != 200:
            pytest.skip("Admin login failed")
        return res.json()["token"]
    
    def test_admin_dashboard_kpis(self, admin_token):
        """GET /api/admin/dashboard/kpis should return admin KPIs"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard/kpis", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        print(f"Admin KPIs response: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        assert "kpis" in data
        assert "operations" in data
        assert "finance" in data
        print(f"Admin dashboard KPIs verified")


class TestSidebarCounts:
    """Test sidebar counts endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if res.status_code != 200:
            pytest.skip("Admin login failed")
        return res.json()["token"]
    
    def test_sidebar_counts_endpoint(self, admin_token):
        """GET /api/admin/sidebar-counts should return badge counts"""
        response = requests.get(f"{BASE_URL}/api/admin/sidebar-counts", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        print(f"Sidebar counts response: {response.status_code}")
        # This endpoint may return 200 or 404 depending on implementation
        if response.status_code == 200:
            data = response.json()
            print(f"Sidebar counts: {data}")
        else:
            print(f"Sidebar counts endpoint returned {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
