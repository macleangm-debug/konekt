"""
Phase 4: Reports Hub Refinement - Backend API Tests
Tests for:
- GET /api/admin/reports/business-health
- GET /api/admin/reports/financial
- GET /api/admin/reports/sales
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_CREDS = {"email": "admin@konekt.co.tz", "password": "KnktcKk_L-hw1wSyquvd!"}
SALES_MANAGER_CREDS = {"email": "sales.manager@konekt.co.tz", "password": "Manager123!"}
FINANCE_MANAGER_CREDS = {"email": "finance@konekt.co.tz", "password": "Finance123!"}


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
    if resp.status_code == 200:
        return resp.json().get("token")
    pytest.skip("Admin login failed")


@pytest.fixture(scope="module")
def sales_manager_token():
    """Get sales manager auth token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json=SALES_MANAGER_CREDS)
    if resp.status_code == 200:
        return resp.json().get("token")
    pytest.skip("Sales Manager login failed")


@pytest.fixture(scope="module")
def finance_manager_token():
    """Get finance manager auth token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json=FINANCE_MANAGER_CREDS)
    if resp.status_code == 200:
        return resp.json().get("token")
    pytest.skip("Finance Manager login failed")


class TestBusinessHealthReport:
    """Tests for GET /api/admin/reports/business-health endpoint"""

    def test_business_health_returns_200(self, admin_token):
        """Business Health endpoint returns 200 OK"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/business-health?days=180",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print("✓ Business Health endpoint returns 200")

    def test_business_health_has_kpis(self, admin_token):
        """Business Health response has kpis object with required fields"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/business-health?days=180",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = resp.json()
        assert "kpis" in data, "Response missing 'kpis' key"
        kpis = data["kpis"]
        
        # Check required KPI fields
        required_kpi_fields = [
            "total_revenue", "margin_pct", "avg_rating", "total_orders",
            "pending_payments", "discount_risk_score"
        ]
        for field in required_kpi_fields:
            assert field in kpis, f"KPIs missing '{field}'"
        print(f"✓ Business Health KPIs present: {list(kpis.keys())}")

    def test_business_health_has_charts(self, admin_token):
        """Business Health response has charts with 4 trend arrays"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/business-health?days=180",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = resp.json()
        assert "charts" in data, "Response missing 'charts' key"
        charts = data["charts"]
        
        # Check required chart arrays
        required_charts = ["revenue_trend", "margin_trend", "rating_trend", "discount_risk_trend"]
        for chart in required_charts:
            assert chart in charts, f"Charts missing '{chart}'"
            assert isinstance(charts[chart], list), f"'{chart}' should be a list"
        print(f"✓ Business Health charts present: {list(charts.keys())}")

    def test_business_health_has_alerts(self, admin_token):
        """Business Health response has alerts array"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/business-health?days=180",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = resp.json()
        assert "alerts" in data, "Response missing 'alerts' key"
        assert isinstance(data["alerts"], list), "'alerts' should be a list"
        print(f"✓ Business Health alerts present: {len(data['alerts'])} alerts")

    def test_business_health_days_filter(self, admin_token):
        """Business Health respects days query parameter"""
        for days in [30, 90, 180, 365]:
            resp = requests.get(
                f"{BASE_URL}/api/admin/reports/business-health?days={days}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert resp.status_code == 200, f"Failed for days={days}"
        print("✓ Business Health days filter works for 30/90/180/365")


class TestFinancialReports:
    """Tests for GET /api/admin/reports/financial endpoint"""

    def test_financial_returns_200(self, admin_token):
        """Financial Reports endpoint returns 200 OK"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/financial?days=180",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print("✓ Financial Reports endpoint returns 200")

    def test_financial_has_kpis(self, admin_token):
        """Financial Reports response has kpis object with required fields"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/financial?days=180",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = resp.json()
        assert "kpis" in data, "Response missing 'kpis' key"
        kpis = data["kpis"]
        
        # Check required KPI fields
        required_kpi_fields = [
            "total_revenue", "revenue_month", "collected", 
            "outstanding_invoices", "commission_total", "margin_pct"
        ]
        for field in required_kpi_fields:
            assert field in kpis, f"KPIs missing '{field}'"
        print(f"✓ Financial Reports KPIs present: {list(kpis.keys())}")

    def test_financial_has_charts(self, admin_token):
        """Financial Reports response has charts with 4 trend arrays"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/financial?days=180",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = resp.json()
        assert "charts" in data, "Response missing 'charts' key"
        charts = data["charts"]
        
        # Check required chart arrays
        required_charts = ["revenue_trend", "cash_flow_trend", "margin_trend", "commission_trend"]
        for chart in required_charts:
            assert chart in charts, f"Charts missing '{chart}'"
            assert isinstance(charts[chart], list), f"'{chart}' should be a list"
        print(f"✓ Financial Reports charts present: {list(charts.keys())}")

    def test_financial_has_top_customers(self, admin_token):
        """Financial Reports response has top_customers array"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/financial?days=180",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = resp.json()
        assert "top_customers" in data, "Response missing 'top_customers' key"
        assert isinstance(data["top_customers"], list), "'top_customers' should be a list"
        print(f"✓ Financial Reports top_customers present: {len(data['top_customers'])} customers")

    def test_financial_has_commission_by_rep(self, admin_token):
        """Financial Reports response has commission_by_rep array"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/financial?days=180",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = resp.json()
        assert "commission_by_rep" in data, "Response missing 'commission_by_rep' key"
        assert isinstance(data["commission_by_rep"], list), "'commission_by_rep' should be a list"
        print(f"✓ Financial Reports commission_by_rep present: {len(data['commission_by_rep'])} reps")

    def test_financial_has_payment_breakdown(self, admin_token):
        """Financial Reports response has payment_breakdown array"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/financial?days=180",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = resp.json()
        assert "payment_breakdown" in data, "Response missing 'payment_breakdown' key"
        assert isinstance(data["payment_breakdown"], list), "'payment_breakdown' should be a list"
        print(f"✓ Financial Reports payment_breakdown present: {len(data['payment_breakdown'])} statuses")


class TestSalesReports:
    """Tests for GET /api/admin/reports/sales endpoint"""

    def test_sales_returns_200(self, admin_token):
        """Sales Reports endpoint returns 200 OK"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/sales?days=180",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print("✓ Sales Reports endpoint returns 200")

    def test_sales_has_kpis(self, admin_token):
        """Sales Reports response has kpis object with required fields"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/sales?days=180",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = resp.json()
        assert "kpis" in data, "Response missing 'kpis' key"
        kpis = data["kpis"]
        
        # Check required KPI fields
        required_kpi_fields = [
            "total_deals", "total_revenue", "avg_rating",
            "conversion_rate", "active_reps", "pipeline_value"
        ]
        for field in required_kpi_fields:
            assert field in kpis, f"KPIs missing '{field}'"
        print(f"✓ Sales Reports KPIs present: {list(kpis.keys())}")

    def test_sales_has_team_table(self, admin_token):
        """Sales Reports response has team_table array"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/sales?days=180",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = resp.json()
        assert "team_table" in data, "Response missing 'team_table' key"
        assert isinstance(data["team_table"], list), "'team_table' should be a list"
        print(f"✓ Sales Reports team_table present: {len(data['team_table'])} reps")

    def test_sales_has_leaderboard(self, admin_token):
        """Sales Reports response has leaderboard array"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/sales?days=180",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = resp.json()
        assert "leaderboard" in data, "Response missing 'leaderboard' key"
        assert isinstance(data["leaderboard"], list), "'leaderboard' should be a list"
        print(f"✓ Sales Reports leaderboard present: {len(data['leaderboard'])} entries")

    def test_sales_has_charts(self, admin_token):
        """Sales Reports response has charts with conversion_trend and deals_trend"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/sales?days=180",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = resp.json()
        assert "charts" in data, "Response missing 'charts' key"
        charts = data["charts"]
        
        # Check required chart arrays
        required_charts = ["conversion_trend", "deals_trend"]
        for chart in required_charts:
            assert chart in charts, f"Charts missing '{chart}'"
            assert isinstance(charts[chart], list), f"'{chart}' should be a list"
        print(f"✓ Sales Reports charts present: {list(charts.keys())}")


class TestRoleBasedAccess:
    """Tests for role-based access to reports"""

    def test_sales_manager_can_access_business_health(self, sales_manager_token):
        """Sales Manager can access Business Health report"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/business-health?days=180",
            headers={"Authorization": f"Bearer {sales_manager_token}"}
        )
        assert resp.status_code == 200, f"Sales Manager should access Business Health: {resp.status_code}"
        print("✓ Sales Manager can access Business Health")

    def test_sales_manager_can_access_sales_reports(self, sales_manager_token):
        """Sales Manager can access Sales Reports"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/sales?days=180",
            headers={"Authorization": f"Bearer {sales_manager_token}"}
        )
        assert resp.status_code == 200, f"Sales Manager should access Sales Reports: {resp.status_code}"
        print("✓ Sales Manager can access Sales Reports")

    def test_finance_manager_can_access_business_health(self, finance_manager_token):
        """Finance Manager can access Business Health report"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/business-health?days=180",
            headers={"Authorization": f"Bearer {finance_manager_token}"}
        )
        assert resp.status_code == 200, f"Finance Manager should access Business Health: {resp.status_code}"
        print("✓ Finance Manager can access Business Health")

    def test_finance_manager_can_access_financial_reports(self, finance_manager_token):
        """Finance Manager can access Financial Reports"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/financial?days=180",
            headers={"Authorization": f"Bearer {finance_manager_token}"}
        )
        assert resp.status_code == 200, f"Finance Manager should access Financial Reports: {resp.status_code}"
        print("✓ Finance Manager can access Financial Reports")


class TestRegressionDashboards:
    """Regression tests for existing dashboards"""

    def test_admin_dashboard_kpis_still_works(self, admin_token):
        """Admin dashboard KPIs endpoint still works"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/dashboard/kpis",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200, f"Admin dashboard KPIs failed: {resp.status_code}"
        data = resp.json()
        assert "kpis" in data, "Admin dashboard missing 'kpis'"
        print("✓ Admin dashboard KPIs still works")

    def test_sales_manager_team_kpis_still_works(self, sales_manager_token):
        """Sales Manager team KPIs endpoint still works"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/dashboard/team-kpis",
            headers={"Authorization": f"Bearer {sales_manager_token}"}
        )
        assert resp.status_code == 200, f"Team KPIs failed: {resp.status_code}"
        data = resp.json()
        assert "team_kpis" in data, "Team KPIs missing 'team_kpis'"
        print("✓ Sales Manager team KPIs still works")

    def test_finance_manager_finance_kpis_still_works(self, finance_manager_token):
        """Finance Manager finance KPIs endpoint still works"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/dashboard/finance-kpis",
            headers={"Authorization": f"Bearer {finance_manager_token}"}
        )
        assert resp.status_code == 200, f"Finance KPIs failed: {resp.status_code}"
        data = resp.json()
        assert "finance_kpis" in data, "Finance KPIs missing 'finance_kpis'"
        print("✓ Finance Manager finance KPIs still works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
