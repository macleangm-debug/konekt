"""
Weekly Digest API Tests - Iteration 276
Tests the /api/admin/weekly-digest/snapshot endpoint for the executive operations report.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestWeeklyDigestAPI:
    """Tests for Weekly Digest snapshot endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        assert login_resp.status_code == 200, f"Admin login failed: {login_resp.text}"
        self.token = login_resp.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_weekly_digest_snapshot_returns_200(self):
        """Test that snapshot endpoint returns 200 with ok=true"""
        resp = requests.get(f"{BASE_URL}/api/admin/weekly-digest/snapshot", headers=self.headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("ok") is True, "Response should have ok=true"
    
    def test_weekly_digest_has_week_range_and_timestamp(self):
        """Test that response includes week_start, week_end, and generated_at"""
        resp = requests.get(f"{BASE_URL}/api/admin/weekly-digest/snapshot", headers=self.headers)
        data = resp.json()
        assert "week_start" in data, "Missing week_start"
        assert "week_end" in data, "Missing week_end"
        assert "generated_at" in data, "Missing generated_at"
        # Verify format (e.g., "Apr 06" and "Apr 12, 2026")
        assert len(data["week_start"]) > 0, "week_start should not be empty"
        assert len(data["week_end"]) > 0, "week_end should not be empty"
    
    def test_weekly_digest_has_kpis(self):
        """Test that KPIs section contains all required fields"""
        resp = requests.get(f"{BASE_URL}/api/admin/weekly-digest/snapshot", headers=self.headers)
        data = resp.json()
        kpis = data.get("kpis", {})
        
        required_kpi_fields = ["revenue", "orders", "customers", "new_affiliates", "active_partners_pct", "critical_alerts"]
        for field in required_kpi_fields:
            assert field in kpis, f"Missing KPI field: {field}"
        
        # Verify types
        assert isinstance(kpis["revenue"], (int, float)), "revenue should be numeric"
        assert isinstance(kpis["orders"], int), "orders should be integer"
        assert isinstance(kpis["customers"], int), "customers should be integer"
        assert isinstance(kpis["active_partners_pct"], (int, float)), "active_partners_pct should be numeric"
        assert isinstance(kpis["critical_alerts"], int), "critical_alerts should be integer"
    
    def test_weekly_digest_has_revenue_breakdown(self):
        """Test that revenue_breakdown contains category, revenue, and pct"""
        resp = requests.get(f"{BASE_URL}/api/admin/weekly-digest/snapshot", headers=self.headers)
        data = resp.json()
        breakdown = data.get("revenue_breakdown", [])
        
        assert isinstance(breakdown, list), "revenue_breakdown should be a list"
        if len(breakdown) > 0:
            item = breakdown[0]
            assert "category" in item, "Missing category in revenue_breakdown"
            assert "revenue" in item, "Missing revenue in revenue_breakdown"
            assert "pct" in item, "Missing pct in revenue_breakdown"
    
    def test_weekly_digest_has_operations(self):
        """Test that operations section contains health metrics"""
        resp = requests.get(f"{BASE_URL}/api/admin/weekly-digest/snapshot", headers=self.headers)
        data = resp.json()
        ops = data.get("operations", {})
        
        required_ops_fields = ["pending_payments", "overdue_followups", "stale_leads", "unassigned_tasks"]
        for field in required_ops_fields:
            assert field in ops, f"Missing operations field: {field}"
            assert isinstance(ops[field], int), f"{field} should be integer"
    
    def test_weekly_digest_has_sales_performance(self):
        """Test that sales section contains top_reps, lowest_rep, stuck_deals, total_reps"""
        resp = requests.get(f"{BASE_URL}/api/admin/weekly-digest/snapshot", headers=self.headers)
        data = resp.json()
        sales = data.get("sales", {})
        
        assert "top_reps" in sales, "Missing top_reps"
        assert "lowest_rep" in sales, "Missing lowest_rep"
        assert "stuck_deals" in sales, "Missing stuck_deals"
        assert "total_reps" in sales, "Missing total_reps"
        
        # Verify top_reps structure
        top_reps = sales.get("top_reps", [])
        assert isinstance(top_reps, list), "top_reps should be a list"
        assert len(top_reps) <= 3, "top_reps should have at most 3 entries"
        
        if len(top_reps) > 0:
            rep = top_reps[0]
            assert "name" in rep, "Missing name in top_rep"
            assert "deals" in rep, "Missing deals in top_rep"
            assert "revenue" in rep, "Missing revenue in top_rep"
    
    def test_weekly_digest_has_ecosystem(self):
        """Test that ecosystem section contains partner metrics"""
        resp = requests.get(f"{BASE_URL}/api/admin/weekly-digest/snapshot", headers=self.headers)
        data = resp.json()
        eco = data.get("ecosystem", {})
        
        required_eco_fields = [
            "total_partners", "active_partners", "inactive_partners",
            "regions_without_coverage", "categories_without_partners", "pending_applications"
        ]
        for field in required_eco_fields:
            assert field in eco, f"Missing ecosystem field: {field}"
    
    def test_weekly_digest_has_affiliates(self):
        """Test that affiliates section contains total and active counts"""
        resp = requests.get(f"{BASE_URL}/api/admin/weekly-digest/snapshot", headers=self.headers)
        data = resp.json()
        aff = data.get("affiliates", {})
        
        assert "total" in aff, "Missing affiliates.total"
        assert "active" in aff, "Missing affiliates.active"
        assert isinstance(aff["total"], int), "affiliates.total should be integer"
        assert isinstance(aff["active"], int), "affiliates.active should be integer"
    
    def test_weekly_digest_has_alerts(self):
        """Test that alerts section contains severity, message, cta, cta_label"""
        resp = requests.get(f"{BASE_URL}/api/admin/weekly-digest/snapshot", headers=self.headers)
        data = resp.json()
        alerts = data.get("alerts", [])
        
        assert isinstance(alerts, list), "alerts should be a list"
        assert len(alerts) <= 3, "alerts should have at most 3 entries"
        
        if len(alerts) > 0:
            alert = alerts[0]
            assert "severity" in alert, "Missing severity in alert"
            assert "message" in alert, "Missing message in alert"
            assert "cta" in alert, "Missing cta in alert"
            assert "cta_label" in alert, "Missing cta_label in alert"
            assert alert["severity"] in ["critical", "warning", "info"], f"Invalid severity: {alert['severity']}"
    
    def test_weekly_digest_has_actions(self):
        """Test that actions section contains label and path"""
        resp = requests.get(f"{BASE_URL}/api/admin/weekly-digest/snapshot", headers=self.headers)
        data = resp.json()
        actions = data.get("actions", [])
        
        assert isinstance(actions, list), "actions should be a list"
        
        if len(actions) > 0:
            action = actions[0]
            assert "label" in action, "Missing label in action"
            assert "path" in action, "Missing path in action"
            # Verify path is a valid admin route
            assert action["path"].startswith("/admin"), f"Action path should start with /admin: {action['path']}"
    
    def test_weekly_digest_data_consistency(self):
        """Test that KPI counts are consistent with detailed data"""
        resp = requests.get(f"{BASE_URL}/api/admin/weekly-digest/snapshot", headers=self.headers)
        data = resp.json()
        
        kpis = data.get("kpis", {})
        eco = data.get("ecosystem", {})
        aff = data.get("affiliates", {})
        
        # Partner utilization should match ecosystem data
        if eco.get("total_partners", 0) > 0:
            expected_pct = round((eco["active_partners"] / eco["total_partners"]) * 100)
            assert abs(kpis.get("active_partners_pct", 0) - expected_pct) <= 1, \
                f"Partner utilization mismatch: KPI={kpis.get('active_partners_pct')}, calculated={expected_pct}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
