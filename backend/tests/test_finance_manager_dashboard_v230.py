"""
Test Finance Manager Dashboard - Phase 3 of Unified Access Model
Tests the Finance Manager specific dashboard, KPIs, sidebar filtering, and role-based access.
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


class TestFinanceManagerLogin:
    """Test Finance Manager login and authentication"""
    
    def test_finance_manager_login_via_auth_login(self):
        """Finance Manager can login via /api/auth/login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": FINANCE_MANAGER_EMAIL,
            "password": FINANCE_MANAGER_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data or "access_token" in data, "No token in response"
        assert data.get("role") == "finance_manager" or data.get("user", {}).get("role") == "finance_manager", f"Expected role 'finance_manager', got {data}"
        print(f"✓ Finance Manager login successful, role: {data.get('role') or data.get('user', {}).get('role')}")
    
    def test_finance_manager_login_via_admin_auth(self):
        """Finance Manager can login via /api/admin/auth/login (allowed in gate list)"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": FINANCE_MANAGER_EMAIL,
            "password": FINANCE_MANAGER_PASSWORD
        })
        assert response.status_code == 200, f"Admin auth login failed: {response.text}"
        data = response.json()
        assert "token" in data or "access_token" in data, "No token in response"
        print(f"✓ Finance Manager login via admin auth successful")
    
    def test_finance_manager_me_endpoint(self):
        """GET /api/auth/me returns correct role for finance_manager"""
        # First login
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": FINANCE_MANAGER_EMAIL,
            "password": FINANCE_MANAGER_PASSWORD
        })
        assert login_resp.status_code == 200
        token = login_resp.json().get("token") or login_resp.json().get("access_token")
        
        # Then check /me
        me_resp = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert me_resp.status_code == 200, f"Me endpoint failed: {me_resp.text}"
        data = me_resp.json()
        assert data.get("role") == "finance_manager", f"Expected role 'finance_manager', got {data.get('role')}"
        print(f"✓ /api/auth/me returns correct role: finance_manager")


class TestFinanceKPIsEndpoint:
    """Test the Finance Manager dashboard KPIs endpoint"""
    
    @pytest.fixture
    def finance_token(self):
        """Get Finance Manager auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": FINANCE_MANAGER_EMAIL,
            "password": FINANCE_MANAGER_PASSWORD
        })
        assert response.status_code == 200
        return response.json().get("token") or response.json().get("access_token")
    
    def test_finance_kpis_endpoint_returns_200(self, finance_token):
        """GET /api/admin/dashboard/finance-kpis returns 200"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard/finance-kpis", headers={
            "Authorization": f"Bearer {finance_token}"
        })
        assert response.status_code == 200, f"Finance KPIs endpoint failed: {response.text}"
        print(f"✓ Finance KPIs endpoint returns 200")
    
    def test_finance_kpis_has_required_fields(self, finance_token):
        """Finance KPIs response has all required fields"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard/finance-kpis", headers={
            "Authorization": f"Bearer {finance_token}"
        })
        assert response.status_code == 200
        data = response.json()
        
        # Check finance_kpis object
        assert "finance_kpis" in data, "Missing finance_kpis object"
        fk = data["finance_kpis"]
        required_kpi_fields = ["total_revenue", "collected_payments", "pending_payments_count", 
                               "outstanding_count", "commission_payable", "net_margin", "margin_pct"]
        for field in required_kpi_fields:
            assert field in fk, f"Missing field: {field} in finance_kpis"
        print(f"✓ Finance KPIs has all required fields: {list(fk.keys())}")
    
    def test_finance_kpis_has_payment_status_breakdown(self, finance_token):
        """Finance KPIs response has payment_status_breakdown"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard/finance-kpis", headers={
            "Authorization": f"Bearer {finance_token}"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "payment_status_breakdown" in data, "Missing payment_status_breakdown"
        assert isinstance(data["payment_status_breakdown"], list), "payment_status_breakdown should be a list"
        print(f"✓ Payment status breakdown present with {len(data['payment_status_breakdown'])} statuses")
    
    def test_finance_kpis_has_invoice_breakdown(self, finance_token):
        """Finance KPIs response has invoice_breakdown"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard/finance-kpis", headers={
            "Authorization": f"Bearer {finance_token}"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "invoice_breakdown" in data, "Missing invoice_breakdown"
        assert isinstance(data["invoice_breakdown"], list), "invoice_breakdown should be a list"
        print(f"✓ Invoice breakdown present with {len(data['invoice_breakdown'])} statuses")
    
    def test_finance_kpis_has_top_revenue_sources(self, finance_token):
        """Finance KPIs response has top_revenue_sources"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard/finance-kpis", headers={
            "Authorization": f"Bearer {finance_token}"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "top_revenue_sources" in data, "Missing top_revenue_sources"
        assert isinstance(data["top_revenue_sources"], list), "top_revenue_sources should be a list"
        print(f"✓ Top revenue sources present with {len(data['top_revenue_sources'])} customers")
    
    def test_finance_kpis_has_risky_discounts(self, finance_token):
        """Finance KPIs response has risky_discounts"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard/finance-kpis", headers={
            "Authorization": f"Bearer {finance_token}"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "risky_discounts" in data, "Missing risky_discounts"
        assert isinstance(data["risky_discounts"], list), "risky_discounts should be a list"
        print(f"✓ Risky discounts present with {len(data['risky_discounts'])} items")
    
    def test_finance_kpis_has_commission_by_rep(self, finance_token):
        """Finance KPIs response has commission_by_rep"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard/finance-kpis", headers={
            "Authorization": f"Bearer {finance_token}"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "commission_by_rep" in data, "Missing commission_by_rep"
        assert isinstance(data["commission_by_rep"], list), "commission_by_rep should be a list"
        print(f"✓ Commission by rep present with {len(data['commission_by_rep'])} reps")
    
    def test_finance_kpis_has_charts(self, finance_token):
        """Finance KPIs response has charts with cash_flow_trend and margin_trend"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard/finance-kpis", headers={
            "Authorization": f"Bearer {finance_token}"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "charts" in data, "Missing charts object"
        charts = data["charts"]
        assert "cash_flow_trend" in charts, "Missing cash_flow_trend in charts"
        assert "margin_trend" in charts, "Missing margin_trend in charts"
        assert isinstance(charts["cash_flow_trend"], list), "cash_flow_trend should be a list"
        assert isinstance(charts["margin_trend"], list), "margin_trend should be a list"
        print(f"✓ Charts present: cash_flow_trend ({len(charts['cash_flow_trend'])} months), margin_trend ({len(charts['margin_trend'])} months)")


class TestRegressionAdminDashboard:
    """Regression tests to ensure Admin dashboard still works correctly"""
    
    @pytest.fixture
    def admin_token(self):
        """Get Admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json().get("token") or response.json().get("access_token")
    
    def test_admin_dashboard_kpis_still_works(self, admin_token):
        """Admin dashboard KPIs endpoint still returns correct data"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard/kpis", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200, f"Admin KPIs failed: {response.text}"
        data = response.json()
        
        # Check for admin-specific fields
        assert "kpis" in data, "Missing kpis object"
        assert "operations" in data, "Missing operations object"
        assert "finance" in data, "Missing finance object"
        assert "charts" in data, "Missing charts object"
        print(f"✓ Admin dashboard KPIs still working correctly")
    
    def test_admin_login_still_works(self):
        """Admin login still works correctly"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert data.get("role") == "admin" or data.get("user", {}).get("role") == "admin", f"Expected role 'admin', got {data}"
        print(f"✓ Admin login still working correctly")


class TestRegressionSalesManagerDashboard:
    """Regression tests to ensure Sales Manager dashboard still works correctly"""
    
    @pytest.fixture
    def sales_manager_token(self):
        """Get Sales Manager auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SALES_MANAGER_EMAIL,
            "password": SALES_MANAGER_PASSWORD
        })
        assert response.status_code == 200
        return response.json().get("token") or response.json().get("access_token")
    
    def test_sales_manager_team_kpis_still_works(self, sales_manager_token):
        """Sales Manager team KPIs endpoint still returns correct data"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard/team-kpis", headers={
            "Authorization": f"Bearer {sales_manager_token}"
        })
        assert response.status_code == 200, f"Team KPIs failed: {response.text}"
        data = response.json()
        
        # Check for sales manager-specific fields
        assert "team_kpis" in data, "Missing team_kpis object"
        assert "team_table" in data, "Missing team_table array"
        assert "leaderboard" in data, "Missing leaderboard array"
        print(f"✓ Sales Manager team KPIs still working correctly")
    
    def test_sales_manager_login_still_works(self):
        """Sales Manager login still works correctly"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SALES_MANAGER_EMAIL,
            "password": SALES_MANAGER_PASSWORD
        })
        assert response.status_code == 200, f"Sales Manager login failed: {response.text}"
        data = response.json()
        assert data.get("role") == "sales_manager" or data.get("user", {}).get("role") == "sales_manager", f"Expected role 'sales_manager', got {data}"
        print(f"✓ Sales Manager login still working correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
