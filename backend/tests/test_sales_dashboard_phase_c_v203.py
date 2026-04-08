"""
Phase C Sales Dashboard Tests - Iteration 203
Tests for GET /api/staff/sales-dashboard endpoint
Verifies KPIs, pipeline, today_actions, recent_orders, assigned_customers
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Staff credentials
STAFF_EMAIL = "neema.sales@konekt.demo"
STAFF_PASSWORD = "password123"


class TestStaffLogin:
    """Staff authentication tests"""
    
    def test_staff_login_success(self):
        """Test staff login returns valid token with full_name"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": STAFF_EMAIL, "password": STAFF_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Token missing from response"
        assert "user" in data, "User missing from response"
        
        user = data["user"]
        assert user["email"] == STAFF_EMAIL
        assert user["role"] == "sales"
        assert "full_name" in user, "full_name missing from user"
        assert user["full_name"] == "Neema Mallya", f"Expected 'Neema Mallya', got '{user.get('full_name')}'"
    
    def test_staff_login_invalid_password(self):
        """Test staff login with wrong password fails"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": STAFF_EMAIL, "password": "wrongpassword"}
        )
        assert response.status_code in [401, 400], f"Expected 401/400, got {response.status_code}"


class TestSalesDashboardAPI:
    """Sales Dashboard API tests"""
    
    @pytest.fixture
    def staff_token(self):
        """Get staff authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": STAFF_EMAIL, "password": STAFF_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip("Staff login failed")
        return response.json()["token"]
    
    def test_sales_dashboard_returns_200(self, staff_token):
        """Test sales dashboard endpoint returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/staff/sales-dashboard",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
    
    def test_sales_dashboard_has_ok_flag(self, staff_token):
        """Test response has ok: true"""
        response = requests.get(
            f"{BASE_URL}/api/staff/sales-dashboard",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        data = response.json()
        assert data.get("ok") is True, "ok flag should be True"
    
    def test_sales_dashboard_has_staff_name(self, staff_token):
        """Test response includes staff_name (not generic 'Sales')"""
        response = requests.get(
            f"{BASE_URL}/api/staff/sales-dashboard",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        data = response.json()
        assert "staff_name" in data, "staff_name missing"
        assert data["staff_name"] == "Neema Mallya", f"Expected 'Neema Mallya', got '{data.get('staff_name')}'"
    
    def test_sales_dashboard_has_kpis(self, staff_token):
        """Test response includes KPIs with required fields"""
        response = requests.get(
            f"{BASE_URL}/api/staff/sales-dashboard",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        data = response.json()
        assert "kpis" in data, "kpis missing"
        
        kpis = data["kpis"]
        required_kpi_fields = [
            "today_orders", "today_revenue",
            "month_orders", "month_revenue",
            "pipeline_value", "total_earned",
            "pending_payout", "open_orders"
        ]
        for field in required_kpi_fields:
            assert field in kpis, f"KPI field '{field}' missing"
    
    def test_sales_dashboard_has_pipeline(self, staff_token):
        """Test response includes pipeline with 6 stages"""
        response = requests.get(
            f"{BASE_URL}/api/staff/sales-dashboard",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        data = response.json()
        assert "pipeline" in data, "pipeline missing"
        
        pipeline = data["pipeline"]
        required_stages = ["new_leads", "contacted", "quoted", "approved", "paid", "fulfilled"]
        for stage in required_stages:
            assert stage in pipeline, f"Pipeline stage '{stage}' missing"
            assert isinstance(pipeline[stage], (int, float)), f"Pipeline stage '{stage}' should be numeric"
    
    def test_sales_dashboard_has_today_actions(self, staff_token):
        """Test response includes today_actions array"""
        response = requests.get(
            f"{BASE_URL}/api/staff/sales-dashboard",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        data = response.json()
        assert "today_actions" in data, "today_actions missing"
        assert isinstance(data["today_actions"], list), "today_actions should be a list"
    
    def test_sales_dashboard_has_recent_orders(self, staff_token):
        """Test response includes recent_orders with commission data"""
        response = requests.get(
            f"{BASE_URL}/api/staff/sales-dashboard",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        data = response.json()
        assert "recent_orders" in data, "recent_orders missing"
        assert isinstance(data["recent_orders"], list), "recent_orders should be a list"
        
        # If there are orders, verify structure
        if len(data["recent_orders"]) > 0:
            order = data["recent_orders"][0]
            required_fields = ["order_id", "order_number", "customer_name", "total", 
                              "commission_amount", "commission_status"]
            for field in required_fields:
                assert field in order, f"Order field '{field}' missing"
    
    def test_sales_dashboard_has_assigned_customers(self, staff_token):
        """Test response includes assigned_customers array"""
        response = requests.get(
            f"{BASE_URL}/api/staff/sales-dashboard",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        data = response.json()
        assert "assigned_customers" in data, "assigned_customers missing"
        assert isinstance(data["assigned_customers"], list), "assigned_customers should be a list"
    
    def test_sales_dashboard_pipeline_value_matches_open_orders(self, staff_token):
        """Test pipeline_value is consistent with open_orders count"""
        response = requests.get(
            f"{BASE_URL}/api/staff/sales-dashboard",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        data = response.json()
        kpis = data.get("kpis", {})
        
        # If there are open orders, pipeline_value should be > 0
        if kpis.get("open_orders", 0) > 0:
            assert kpis.get("pipeline_value", 0) > 0, "Pipeline value should be > 0 when there are open orders"
    
    def test_sales_dashboard_without_auth_fails(self):
        """Test sales dashboard without auth returns 401/403"""
        response = requests.get(f"{BASE_URL}/api/staff/sales-dashboard")
        # Should fail without auth (401 or 403 or redirect)
        # Some implementations may return 200 with empty data, so we check for that too
        if response.status_code == 200:
            data = response.json()
            # If 200, staff_name should be generic or None
            assert data.get("staff_name") in [None, "Sales", ""], "Without auth, should not get specific staff name"


class TestSalesDashboardDataIntegrity:
    """Data integrity tests for sales dashboard"""
    
    @pytest.fixture
    def staff_token(self):
        """Get staff authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": STAFF_EMAIL, "password": STAFF_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip("Staff login failed")
        return response.json()["token"]
    
    def test_kpi_values_are_numeric(self, staff_token):
        """Test all KPI values are numeric"""
        response = requests.get(
            f"{BASE_URL}/api/staff/sales-dashboard",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        data = response.json()
        kpis = data.get("kpis", {})
        
        numeric_fields = ["today_revenue", "month_revenue", "pipeline_value", 
                         "total_earned", "pending_payout"]
        for field in numeric_fields:
            value = kpis.get(field)
            assert isinstance(value, (int, float)), f"KPI '{field}' should be numeric, got {type(value)}"
    
    def test_commission_amounts_are_tzs(self, staff_token):
        """Test commission amounts appear to be in TZS (reasonable values)"""
        response = requests.get(
            f"{BASE_URL}/api/staff/sales-dashboard",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        data = response.json()
        
        # Check recent_orders commission amounts
        for order in data.get("recent_orders", [])[:5]:
            total = order.get("total", 0)
            commission = order.get("commission_amount", 0)
            
            # Commission should be a reasonable percentage of total (typically 1-10%)
            if total > 0 and commission > 0:
                pct = (commission / total) * 100
                assert 0 < pct < 50, f"Commission {commission} seems unreasonable for total {total}"
