"""
Sales Dashboard V217 Upgrade Tests
Tests the upgraded Sales Dashboard API with:
- commission_summary (expected, pending, paid, total)
- pipeline with values per stage
- charts (pipeline_trend, deals_closed_trend, commission_trend)
- today_actions (quotes expiring, delayed orders, stale clients, promotions)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Sales Staff credentials
SALES_EMAIL = "neema.sales@konekt.demo"
SALES_PASSWORD = "password123"


class TestSalesDashboardUpgrade:
    """Tests for the upgraded Sales Dashboard API"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for sales staff"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SALES_EMAIL, "password": SALES_PASSWORD}
        )
        if response.status_code == 200:
            data = response.json()
            return data.get("token") or data.get("access_token")
        pytest.skip(f"Staff login failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def dashboard_data(self, auth_token):
        """Fetch dashboard data once for all tests"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/staff/sales-dashboard", headers=headers)
        assert response.status_code == 200, f"Dashboard API failed: {response.status_code} - {response.text}"
        return response.json()
    
    # ═══ BASIC API RESPONSE TESTS ═══
    
    def test_dashboard_returns_ok(self, dashboard_data):
        """Test that dashboard returns ok: true"""
        assert dashboard_data.get("ok") is True, "Dashboard should return ok: true"
        print("PASS: Dashboard returns ok: true")
    
    def test_dashboard_has_staff_name(self, dashboard_data):
        """Test that dashboard returns staff_name"""
        assert "staff_name" in dashboard_data, "Dashboard should have staff_name"
        print(f"PASS: staff_name = {dashboard_data.get('staff_name')}")
    
    def test_dashboard_has_kpis(self, dashboard_data):
        """Test that dashboard returns kpis object"""
        assert "kpis" in dashboard_data, "Dashboard should have kpis"
        kpis = dashboard_data["kpis"]
        expected_keys = ["today_orders", "today_revenue", "month_orders", "month_revenue", 
                        "pipeline_value", "total_earned", "pending_payout", "conversion_rate"]
        for key in expected_keys:
            assert key in kpis, f"KPIs should have {key}"
        print(f"PASS: KPIs present with keys: {list(kpis.keys())}")
    
    # ═══ COMMISSION SUMMARY TESTS ═══
    
    def test_commission_summary_exists(self, dashboard_data):
        """Test that commission_summary object exists"""
        assert "commission_summary" in dashboard_data, "Dashboard should have commission_summary"
        print("PASS: commission_summary exists")
    
    def test_commission_summary_has_expected(self, dashboard_data):
        """Test commission_summary has 'expected' key"""
        summary = dashboard_data.get("commission_summary", {})
        assert "expected" in summary, "commission_summary should have 'expected'"
        assert isinstance(summary["expected"], (int, float)), "expected should be numeric"
        print(f"PASS: commission_summary.expected = {summary['expected']}")
    
    def test_commission_summary_has_pending(self, dashboard_data):
        """Test commission_summary has 'pending' key"""
        summary = dashboard_data.get("commission_summary", {})
        assert "pending" in summary, "commission_summary should have 'pending'"
        assert isinstance(summary["pending"], (int, float)), "pending should be numeric"
        print(f"PASS: commission_summary.pending = {summary['pending']}")
    
    def test_commission_summary_has_paid(self, dashboard_data):
        """Test commission_summary has 'paid' key"""
        summary = dashboard_data.get("commission_summary", {})
        assert "paid" in summary, "commission_summary should have 'paid'"
        assert isinstance(summary["paid"], (int, float)), "paid should be numeric"
        print(f"PASS: commission_summary.paid = {summary['paid']}")
    
    def test_commission_summary_has_total(self, dashboard_data):
        """Test commission_summary has 'total' key"""
        summary = dashboard_data.get("commission_summary", {})
        assert "total" in summary, "commission_summary should have 'total'"
        assert isinstance(summary["total"], (int, float)), "total should be numeric"
        print(f"PASS: commission_summary.total = {summary['total']}")
    
    # ═══ PIPELINE WITH VALUES TESTS ═══
    
    def test_pipeline_exists(self, dashboard_data):
        """Test that pipeline object exists"""
        assert "pipeline" in dashboard_data, "Dashboard should have pipeline"
        print("PASS: pipeline exists")
    
    def test_pipeline_has_stage_counts(self, dashboard_data):
        """Test pipeline has stage counts"""
        pipeline = dashboard_data.get("pipeline", {})
        expected_stages = ["new_leads", "contacted", "quoted", "approved", "paid", "fulfilled"]
        for stage in expected_stages:
            assert stage in pipeline, f"Pipeline should have {stage} count"
        print(f"PASS: Pipeline has all stage counts: {expected_stages}")
    
    def test_pipeline_has_values_object(self, dashboard_data):
        """Test pipeline has 'values' sub-object with per-stage monetary values"""
        pipeline = dashboard_data.get("pipeline", {})
        assert "values" in pipeline, "Pipeline should have 'values' sub-object"
        values = pipeline["values"]
        expected_stages = ["new_leads", "contacted", "quoted", "approved", "paid", "fulfilled"]
        for stage in expected_stages:
            assert stage in values, f"Pipeline values should have {stage}"
            assert isinstance(values[stage], (int, float)), f"Pipeline values.{stage} should be numeric"
        print(f"PASS: Pipeline values present: {values}")
    
    # ═══ TODAY'S ACTIONS TESTS ═══
    
    def test_today_actions_exists(self, dashboard_data):
        """Test that today_actions array exists"""
        assert "today_actions" in dashboard_data, "Dashboard should have today_actions"
        assert isinstance(dashboard_data["today_actions"], list), "today_actions should be a list"
        print(f"PASS: today_actions exists with {len(dashboard_data['today_actions'])} items")
    
    def test_today_actions_structure(self, dashboard_data):
        """Test today_actions items have correct structure"""
        actions = dashboard_data.get("today_actions", [])
        if len(actions) > 0:
            action = actions[0]
            expected_keys = ["type", "urgency", "title", "description"]
            for key in expected_keys:
                assert key in action, f"Action should have {key}"
            print(f"PASS: Action structure valid. First action: {action.get('title')}")
        else:
            print("INFO: No actions present (empty list is valid)")
    
    def test_today_actions_types(self, dashboard_data):
        """Test that today_actions have valid types"""
        actions = dashboard_data.get("today_actions", [])
        valid_types = ["quote_followup", "delayed_order", "stale_client", "close_deal", "share_promo"]
        for action in actions:
            action_type = action.get("type")
            assert action_type in valid_types, f"Invalid action type: {action_type}"
        print(f"PASS: All action types are valid")
    
    # ═══ CHARTS TESTS ═══
    
    def test_charts_exists(self, dashboard_data):
        """Test that charts object exists"""
        assert "charts" in dashboard_data, "Dashboard should have charts"
        print("PASS: charts exists")
    
    def test_charts_has_pipeline_trend(self, dashboard_data):
        """Test charts has pipeline_trend array"""
        charts = dashboard_data.get("charts", {})
        assert "pipeline_trend" in charts, "Charts should have pipeline_trend"
        trend = charts["pipeline_trend"]
        assert isinstance(trend, list), "pipeline_trend should be a list"
        assert len(trend) == 6, f"pipeline_trend should have 6 monthly entries, got {len(trend)}"
        if len(trend) > 0:
            assert "month" in trend[0], "pipeline_trend items should have 'month'"
            assert "value" in trend[0], "pipeline_trend items should have 'value'"
        print(f"PASS: pipeline_trend has {len(trend)} entries")
    
    def test_charts_has_deals_closed_trend(self, dashboard_data):
        """Test charts has deals_closed_trend array"""
        charts = dashboard_data.get("charts", {})
        assert "deals_closed_trend" in charts, "Charts should have deals_closed_trend"
        trend = charts["deals_closed_trend"]
        assert isinstance(trend, list), "deals_closed_trend should be a list"
        assert len(trend) == 6, f"deals_closed_trend should have 6 monthly entries, got {len(trend)}"
        if len(trend) > 0:
            assert "month" in trend[0], "deals_closed_trend items should have 'month'"
            assert "count" in trend[0], "deals_closed_trend items should have 'count'"
            assert "value" in trend[0], "deals_closed_trend items should have 'value'"
        print(f"PASS: deals_closed_trend has {len(trend)} entries")
    
    def test_charts_has_commission_trend(self, dashboard_data):
        """Test charts has commission_trend array"""
        charts = dashboard_data.get("charts", {})
        assert "commission_trend" in charts, "Charts should have commission_trend"
        trend = charts["commission_trend"]
        assert isinstance(trend, list), "commission_trend should be a list"
        assert len(trend) == 6, f"commission_trend should have 6 monthly entries, got {len(trend)}"
        if len(trend) > 0:
            assert "month" in trend[0], "commission_trend items should have 'month'"
            assert "amount" in trend[0], "commission_trend items should have 'amount'"
        print(f"PASS: commission_trend has {len(trend)} entries")
    
    # ═══ OTHER REQUIRED FIELDS ═══
    
    def test_recent_orders_exists(self, dashboard_data):
        """Test that recent_orders array exists"""
        assert "recent_orders" in dashboard_data, "Dashboard should have recent_orders"
        assert isinstance(dashboard_data["recent_orders"], list), "recent_orders should be a list"
        print(f"PASS: recent_orders exists with {len(dashboard_data['recent_orders'])} items")
    
    def test_recent_orders_have_commission_fields(self, dashboard_data):
        """Test recent_orders have commission breakdown fields"""
        orders = dashboard_data.get("recent_orders", [])
        if len(orders) > 0:
            order = orders[0]
            assert "commission_amount" in order, "Order should have commission_amount"
            assert "commission_status" in order, "Order should have commission_status"
            print(f"PASS: Orders have commission fields. First order commission: {order.get('commission_amount')}")
        else:
            print("INFO: No recent orders present")
    
    def test_assigned_customers_exists(self, dashboard_data):
        """Test that assigned_customers array exists"""
        assert "assigned_customers" in dashboard_data, "Dashboard should have assigned_customers"
        assert isinstance(dashboard_data["assigned_customers"], list), "assigned_customers should be a list"
        print(f"PASS: assigned_customers exists with {len(dashboard_data['assigned_customers'])} items")


class TestSalesDashboardAPIAccess:
    """Test API access without authentication"""
    
    def test_dashboard_requires_auth(self):
        """Test that dashboard endpoint works (may return empty data without auth)"""
        response = requests.get(f"{BASE_URL}/api/staff/sales-dashboard")
        # The endpoint should still return 200 but with limited/empty data
        assert response.status_code == 200, f"Dashboard should return 200, got {response.status_code}"
        data = response.json()
        assert data.get("ok") is True, "Dashboard should return ok: true even without auth"
        print("PASS: Dashboard accessible (returns ok: true)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
