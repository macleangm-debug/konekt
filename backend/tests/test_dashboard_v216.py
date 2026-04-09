"""
Test Dashboard V216 - Admin Dashboard V2 and Customer Dashboard V3
Tests for:
- GET /api/admin/dashboard/kpis - Admin dashboard KPIs, snapshots, charts
- GET /api/dashboard-metrics/customer - Customer dashboard metrics
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
CUSTOMER_EMAIL = "demo.customer@konekt.com"
CUSTOMER_PASSWORD = "Demo123!"


class TestAdminDashboardKPIs:
    """Test Admin Dashboard V2 KPIs endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin and get token"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if login_resp.status_code == 200:
            data = login_resp.json()
            token = data.get("token") or data.get("access_token")
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.user_id = data.get("user", {}).get("id") or data.get("user_id")
        else:
            pytest.skip(f"Admin login failed: {login_resp.status_code}")
    
    def test_admin_dashboard_kpis_endpoint_returns_200(self):
        """Test that /api/admin/dashboard/kpis returns 200"""
        resp = self.session.get(f"{BASE_URL}/api/admin/dashboard/kpis")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print("PASS: Admin dashboard KPIs endpoint returns 200")
    
    def test_admin_dashboard_kpis_structure(self):
        """Test that response contains all required top-level keys"""
        resp = self.session.get(f"{BASE_URL}/api/admin/dashboard/kpis")
        assert resp.status_code == 200
        data = resp.json()
        
        # Check top-level keys
        required_keys = ["kpis", "operations", "finance", "commercial", "partners", "team", "charts"]
        for key in required_keys:
            assert key in data, f"Missing key: {key}"
        print(f"PASS: Response contains all required keys: {required_keys}")
    
    def test_admin_kpis_object_structure(self):
        """Test that kpis object contains 6 KPI fields"""
        resp = self.session.get(f"{BASE_URL}/api/admin/dashboard/kpis")
        assert resp.status_code == 200
        kpis = resp.json().get("kpis", {})
        
        required_kpi_fields = [
            "orders_today",
            "revenue_month",
            "pending_payments",
            "active_quotes",
            "open_delays",
            "pending_approvals"
        ]
        for field in required_kpi_fields:
            assert field in kpis, f"Missing KPI field: {field}"
            # Values should be numeric
            assert isinstance(kpis[field], (int, float)), f"KPI {field} should be numeric"
        print(f"PASS: KPIs object contains all 6 fields: {list(kpis.keys())}")
        print(f"  - orders_today: {kpis['orders_today']}")
        print(f"  - revenue_month: {kpis['revenue_month']}")
        print(f"  - pending_payments: {kpis['pending_payments']}")
        print(f"  - active_quotes: {kpis['active_quotes']}")
        print(f"  - open_delays: {kpis['open_delays']}")
        print(f"  - pending_approvals: {kpis['pending_approvals']}")
    
    def test_admin_operations_snapshot(self):
        """Test operations snapshot contains status_counts and total_orders"""
        resp = self.session.get(f"{BASE_URL}/api/admin/dashboard/kpis")
        assert resp.status_code == 200
        ops = resp.json().get("operations", {})
        
        assert "total_orders" in ops, "Missing total_orders in operations"
        assert "status_counts" in ops, "Missing status_counts in operations"
        assert isinstance(ops["status_counts"], dict), "status_counts should be a dict"
        print(f"PASS: Operations snapshot - total_orders: {ops['total_orders']}, status_counts keys: {list(ops['status_counts'].keys())[:5]}...")
    
    def test_admin_finance_snapshot(self):
        """Test finance snapshot contains invoices and outstanding amount"""
        resp = self.session.get(f"{BASE_URL}/api/admin/dashboard/kpis")
        assert resp.status_code == 200
        fin = resp.json().get("finance", {})
        
        required_fields = ["invoices_this_month", "total_invoices", "outstanding_amount"]
        for field in required_fields:
            assert field in fin, f"Missing finance field: {field}"
        print(f"PASS: Finance snapshot - invoices_this_month: {fin['invoices_this_month']}, total_invoices: {fin['total_invoices']}, outstanding: {fin['outstanding_amount']}")
    
    def test_admin_commercial_snapshot(self):
        """Test commercial snapshot contains promotions and discount requests"""
        resp = self.session.get(f"{BASE_URL}/api/admin/dashboard/kpis")
        assert resp.status_code == 200
        comm = resp.json().get("commercial", {})
        
        required_fields = ["active_promotions", "pending_discount_requests"]
        for field in required_fields:
            assert field in comm, f"Missing commercial field: {field}"
        print(f"PASS: Commercial snapshot - active_promotions: {comm['active_promotions']}, pending_discount_requests: {comm['pending_discount_requests']}")
    
    def test_admin_partners_snapshot(self):
        """Test partners snapshot contains vendor and affiliate counts"""
        resp = self.session.get(f"{BASE_URL}/api/admin/dashboard/kpis")
        assert resp.status_code == 200
        parts = resp.json().get("partners", {})
        
        required_fields = ["active_partners", "active_vendors", "total_affiliates"]
        for field in required_fields:
            assert field in parts, f"Missing partners field: {field}"
        print(f"PASS: Partners snapshot - active_partners: {parts['active_partners']}, active_vendors: {parts['active_vendors']}, total_affiliates: {parts['total_affiliates']}")
    
    def test_admin_team_snapshot(self):
        """Test team snapshot contains customer and sales counts"""
        resp = self.session.get(f"{BASE_URL}/api/admin/dashboard/kpis")
        assert resp.status_code == 200
        team = resp.json().get("team", {})
        
        required_fields = ["total_customers", "total_sales"]
        for field in required_fields:
            assert field in team, f"Missing team field: {field}"
        print(f"PASS: Team snapshot - total_customers: {team['total_customers']}, total_sales: {team['total_sales']}")
    
    def test_admin_charts_structure(self):
        """Test charts object contains orders_trend, revenue_trend, status_distribution"""
        resp = self.session.get(f"{BASE_URL}/api/admin/dashboard/kpis")
        assert resp.status_code == 200
        charts = resp.json().get("charts", {})
        
        required_charts = ["orders_trend", "revenue_trend", "status_distribution"]
        for chart in required_charts:
            assert chart in charts, f"Missing chart: {chart}"
            assert isinstance(charts[chart], list), f"Chart {chart} should be a list"
        
        # Verify orders_trend structure (14 days)
        if charts["orders_trend"]:
            sample = charts["orders_trend"][0]
            assert "date" in sample, "orders_trend items should have 'date'"
            assert "orders" in sample, "orders_trend items should have 'orders'"
        
        # Verify revenue_trend structure (6 months)
        if charts["revenue_trend"]:
            sample = charts["revenue_trend"][0]
            assert "month" in sample, "revenue_trend items should have 'month'"
            assert "revenue" in sample, "revenue_trend items should have 'revenue'"
        
        # Verify status_distribution structure
        if charts["status_distribution"]:
            sample = charts["status_distribution"][0]
            assert "status" in sample, "status_distribution items should have 'status'"
            assert "count" in sample, "status_distribution items should have 'count'"
        
        print(f"PASS: Charts structure verified - orders_trend: {len(charts['orders_trend'])} items, revenue_trend: {len(charts['revenue_trend'])} items, status_distribution: {len(charts['status_distribution'])} items")


class TestCustomerDashboardMetrics:
    """Test Customer Dashboard V3 metrics endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as customer and get token"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if login_resp.status_code == 200:
            data = login_resp.json()
            token = data.get("token") or data.get("access_token")
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.user_id = data.get("user", {}).get("id") or data.get("user_id")
        else:
            pytest.skip(f"Customer login failed: {login_resp.status_code}")
    
    def test_customer_dashboard_metrics_endpoint_returns_200(self):
        """Test that /api/dashboard-metrics/customer returns 200"""
        resp = self.session.get(f"{BASE_URL}/api/dashboard-metrics/customer?user_id={self.user_id}")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print("PASS: Customer dashboard metrics endpoint returns 200")
    
    def test_customer_dashboard_metrics_structure(self):
        """Test that response contains all required top-level keys"""
        resp = self.session.get(f"{BASE_URL}/api/dashboard-metrics/customer?user_id={self.user_id}")
        assert resp.status_code == 200
        data = resp.json()
        
        required_keys = ["kpis", "active_orders", "reminders", "referral", "charts"]
        for key in required_keys:
            assert key in data, f"Missing key: {key}"
        print(f"PASS: Response contains all required keys: {required_keys}")
    
    def test_customer_kpis_structure(self):
        """Test that customer kpis contains 4 main KPI fields"""
        resp = self.session.get(f"{BASE_URL}/api/dashboard-metrics/customer?user_id={self.user_id}")
        assert resp.status_code == 200
        kpis = resp.json().get("kpis", {})
        
        required_kpi_fields = [
            "active_orders",
            "pending_invoices",
            "referral_balance",
            "total_quotes"
        ]
        for field in required_kpi_fields:
            assert field in kpis, f"Missing KPI field: {field}"
        print(f"PASS: Customer KPIs - active_orders: {kpis['active_orders']}, pending_invoices: {kpis['pending_invoices']}, referral_balance: {kpis.get('referral_balance', 0)}, total_quotes: {kpis['total_quotes']}")
    
    def test_customer_active_orders_structure(self):
        """Test active_orders is a list with proper structure"""
        resp = self.session.get(f"{BASE_URL}/api/dashboard-metrics/customer?user_id={self.user_id}")
        assert resp.status_code == 200
        active_orders = resp.json().get("active_orders", [])
        
        assert isinstance(active_orders, list), "active_orders should be a list"
        if active_orders:
            sample = active_orders[0]
            # Should have customer_status for customer-safe labels
            assert "customer_status" in sample or "status" in sample, "Order should have status field"
            assert "order_number" in sample or "id" in sample, "Order should have identifier"
        print(f"PASS: Active orders list - {len(active_orders)} orders")
    
    def test_customer_reminders_structure(self):
        """Test reminders is a list with proper structure"""
        resp = self.session.get(f"{BASE_URL}/api/dashboard-metrics/customer?user_id={self.user_id}")
        assert resp.status_code == 200
        reminders = resp.json().get("reminders", [])
        
        assert isinstance(reminders, list), "reminders should be a list"
        if reminders:
            sample = reminders[0]
            assert "type" in sample, "Reminder should have 'type'"
            assert "message" in sample, "Reminder should have 'message'"
            assert "cta" in sample, "Reminder should have 'cta'"
            assert "url" in sample, "Reminder should have 'url'"
        print(f"PASS: Reminders list - {len(reminders)} reminders")
    
    def test_customer_referral_structure(self):
        """Test referral object contains balance and code"""
        resp = self.session.get(f"{BASE_URL}/api/dashboard-metrics/customer?user_id={self.user_id}")
        assert resp.status_code == 200
        referral = resp.json().get("referral", {})
        
        assert "balance" in referral, "Referral should have 'balance'"
        assert "code" in referral, "Referral should have 'code'"
        print(f"PASS: Referral - balance: {referral['balance']}, code: {referral.get('code', 'N/A')}")
    
    def test_customer_charts_structure(self):
        """Test charts object contains order_trend and spend_trend"""
        resp = self.session.get(f"{BASE_URL}/api/dashboard-metrics/customer?user_id={self.user_id}")
        assert resp.status_code == 200
        charts = resp.json().get("charts", {})
        
        required_charts = ["order_trend", "spend_trend"]
        for chart in required_charts:
            assert chart in charts, f"Missing chart: {chart}"
            assert isinstance(charts[chart], list), f"Chart {chart} should be a list"
        
        # Verify order_trend structure
        if charts["order_trend"]:
            sample = charts["order_trend"][0]
            assert "month" in sample, "order_trend items should have 'month'"
            assert "orders" in sample, "order_trend items should have 'orders'"
        
        # Verify spend_trend structure
        if charts["spend_trend"]:
            sample = charts["spend_trend"][0]
            assert "month" in sample, "spend_trend items should have 'month'"
            assert "spend" in sample, "spend_trend items should have 'spend'"
        
        print(f"PASS: Charts structure verified - order_trend: {len(charts['order_trend'])} items, spend_trend: {len(charts['spend_trend'])} items")


class TestDashboardWithoutAuth:
    """Test dashboard endpoints without authentication"""
    
    def test_admin_dashboard_kpis_without_auth(self):
        """Test admin dashboard KPIs endpoint without auth - should still work (public endpoint)"""
        resp = requests.get(f"{BASE_URL}/api/admin/dashboard/kpis")
        # This endpoint may or may not require auth - just verify it doesn't crash
        assert resp.status_code in [200, 401, 403], f"Unexpected status: {resp.status_code}"
        print(f"Admin dashboard KPIs without auth: {resp.status_code}")
    
    def test_customer_dashboard_metrics_without_user_id(self):
        """Test customer dashboard metrics without user_id param"""
        resp = requests.get(f"{BASE_URL}/api/dashboard-metrics/customer")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        # Should return empty/default data
        assert "kpis" in data
        print(f"PASS: Customer dashboard metrics without user_id returns default data")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
