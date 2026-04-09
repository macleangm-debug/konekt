"""
Test Suite for Weekly Performance Report and Alert Dashboard (Iteration 233)
Tests:
- GET /api/admin/reports/weekly-performance endpoint
- GET /api/admin/alerts endpoint
- POST /api/admin/alerts/generate endpoint
- POST /api/admin/alerts/{alert_id}/resolve endpoint
- Role-based access for admin, sales_manager, finance_manager
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


def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ═══════════════════════════════════════════════════════════════════════════════
# WEEKLY PERFORMANCE REPORT TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestWeeklyPerformanceReport:
    """Tests for GET /api/admin/reports/weekly-performance"""

    def test_weekly_performance_returns_200(self, admin_token):
        """Weekly performance endpoint returns 200"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/weekly-performance?weeks_back=0",
            headers=auth_headers(admin_token)
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print("✓ Weekly performance endpoint returns 200")

    def test_weekly_performance_has_executive_summary(self, admin_token):
        """Response has executive_summary with required KPIs"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/weekly-performance?weeks_back=0",
            headers=auth_headers(admin_token)
        )
        data = resp.json()
        assert "executive_summary" in data, "Missing executive_summary"
        es = data["executive_summary"]
        required_fields = ["revenue", "orders_completed", "margin_pct", "avg_rating", "discounts_given", "net_profit"]
        for field in required_fields:
            assert field in es, f"Missing {field} in executive_summary"
        print(f"✓ Executive summary has all required fields: {list(es.keys())}")

    def test_weekly_performance_has_sales_performance(self, admin_token):
        """Response has sales_performance with top/under performers"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/weekly-performance?weeks_back=0",
            headers=auth_headers(admin_token)
        )
        data = resp.json()
        assert "sales_performance" in data, "Missing sales_performance"
        sp = data["sales_performance"]
        assert "top_performers" in sp, "Missing top_performers"
        assert "under_performers" in sp, "Missing under_performers"
        assert "total_deals" in sp, "Missing total_deals"
        assert "pipeline_value" in sp, "Missing pipeline_value"
        print(f"✓ Sales performance has top_performers ({len(sp.get('top_performers', []))}) and under_performers ({len(sp.get('under_performers', []))})")

    def test_weekly_performance_has_financial_summary(self, admin_token):
        """Response has financial_summary"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/weekly-performance?weeks_back=0",
            headers=auth_headers(admin_token)
        )
        data = resp.json()
        assert "financial_summary" in data, "Missing financial_summary"
        fin = data["financial_summary"]
        required_fields = ["collected", "pending_payments", "outstanding", "commission_payable"]
        for field in required_fields:
            assert field in fin, f"Missing {field} in financial_summary"
        print(f"✓ Financial summary has all required fields")

    def test_weekly_performance_has_customer_experience(self, admin_token):
        """Response has customer_experience"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/weekly-performance?weeks_back=0",
            headers=auth_headers(admin_token)
        )
        data = resp.json()
        assert "customer_experience" in data, "Missing customer_experience"
        cx = data["customer_experience"]
        assert "avg_rating" in cx, "Missing avg_rating in customer_experience"
        print(f"✓ Customer experience section present with avg_rating: {cx.get('avg_rating')}")

    def test_weekly_performance_has_product_intelligence(self, admin_token):
        """Response has product_intelligence"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/weekly-performance?weeks_back=0",
            headers=auth_headers(admin_token)
        )
        data = resp.json()
        assert "product_intelligence" in data, "Missing product_intelligence"
        pi = data["product_intelligence"]
        assert "top_products" in pi, "Missing top_products"
        print(f"✓ Product intelligence has top_products ({len(pi.get('top_products', []))} items)")

    def test_weekly_performance_has_procurement(self, admin_token):
        """Response has procurement insights"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/weekly-performance?weeks_back=0",
            headers=auth_headers(admin_token)
        )
        data = resp.json()
        assert "procurement" in data, "Missing procurement"
        proc = data["procurement"]
        assert "restock" in proc or "remove" in proc, "Missing restock/remove in procurement"
        print(f"✓ Procurement insights present")

    def test_weekly_performance_has_risk_alerts(self, admin_token):
        """Response has risk_alerts"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/weekly-performance?weeks_back=0",
            headers=auth_headers(admin_token)
        )
        data = resp.json()
        assert "risk_alerts" in data, "Missing risk_alerts"
        print(f"✓ Risk alerts present ({len(data.get('risk_alerts', []))} alerts)")

    def test_weekly_performance_has_action_recommendations(self, admin_token):
        """Response has action_recommendations"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/weekly-performance?weeks_back=0",
            headers=auth_headers(admin_token)
        )
        data = resp.json()
        assert "action_recommendations" in data, "Missing action_recommendations"
        print(f"✓ Action recommendations present ({len(data.get('action_recommendations', []))} items)")

    def test_weekly_performance_has_period(self, admin_token):
        """Response has period with start/end dates"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/weekly-performance?weeks_back=0",
            headers=auth_headers(admin_token)
        )
        data = resp.json()
        assert "period" in data, "Missing period"
        period = data["period"]
        assert "start" in period, "Missing start in period"
        assert "end" in period, "Missing end in period"
        print(f"✓ Period: {period.get('start')} — {period.get('end')}")

    def test_weekly_performance_weeks_back_navigation(self, admin_token):
        """weeks_back parameter changes the report period"""
        resp0 = requests.get(
            f"{BASE_URL}/api/admin/reports/weekly-performance?weeks_back=0",
            headers=auth_headers(admin_token)
        )
        resp1 = requests.get(
            f"{BASE_URL}/api/admin/reports/weekly-performance?weeks_back=1",
            headers=auth_headers(admin_token)
        )
        assert resp0.status_code == 200
        assert resp1.status_code == 200
        period0 = resp0.json().get("period", {})
        period1 = resp1.json().get("period", {})
        # Periods should be different
        assert period0.get("start") != period1.get("start"), "weeks_back=0 and weeks_back=1 should have different periods"
        print(f"✓ Week navigation works: week 0 = {period0.get('start')}, week 1 = {period1.get('start')}")


# ═══════════════════════════════════════════════════════════════════════════════
# ALERT DASHBOARD TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestAlertDashboard:
    """Tests for Alert Dashboard / Action Center endpoints"""

    def test_get_alerts_returns_200(self, admin_token):
        """GET /api/admin/alerts returns 200"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/alerts",
            headers=auth_headers(admin_token)
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print("✓ GET /api/admin/alerts returns 200")

    def test_get_alerts_has_kpis(self, admin_token):
        """Response has KPI summary"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/alerts",
            headers=auth_headers(admin_token)
        )
        data = resp.json()
        assert "kpis" in data, "Missing kpis"
        kpis = data["kpis"]
        required_fields = ["critical", "warning", "open", "resolved"]
        for field in required_fields:
            assert field in kpis, f"Missing {field} in kpis"
        print(f"✓ Alert KPIs: critical={kpis.get('critical')}, warning={kpis.get('warning')}, open={kpis.get('open')}, resolved={kpis.get('resolved')}")

    def test_get_alerts_has_alerts_array(self, admin_token):
        """Response has alerts array"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/alerts",
            headers=auth_headers(admin_token)
        )
        data = resp.json()
        assert "alerts" in data, "Missing alerts array"
        assert isinstance(data["alerts"], list), "alerts should be a list"
        print(f"✓ Alerts array present with {len(data['alerts'])} alerts")

    def test_generate_alerts_returns_200(self, admin_token):
        """POST /api/admin/alerts/generate returns 200"""
        resp = requests.post(
            f"{BASE_URL}/api/admin/alerts/generate",
            headers=auth_headers(admin_token)
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "ok" in data, "Missing ok field"
        assert "alerts_created" in data, "Missing alerts_created field"
        print(f"✓ Generate alerts: ok={data.get('ok')}, alerts_created={data.get('alerts_created')}")

    def test_filter_alerts_by_severity(self, admin_token):
        """Filter alerts by severity works"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/alerts?severity=critical",
            headers=auth_headers(admin_token)
        )
        assert resp.status_code == 200
        data = resp.json()
        # All returned alerts should be critical (if any)
        for alert in data.get("alerts", []):
            assert alert.get("severity") == "critical", f"Expected critical severity, got {alert.get('severity')}"
        print(f"✓ Severity filter works: {len(data.get('alerts', []))} critical alerts")

    def test_filter_alerts_by_status(self, admin_token):
        """Filter alerts by status works"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/alerts?status=open",
            headers=auth_headers(admin_token)
        )
        assert resp.status_code == 200
        data = resp.json()
        for alert in data.get("alerts", []):
            assert alert.get("status") == "open", f"Expected open status, got {alert.get('status')}"
        print(f"✓ Status filter works: {len(data.get('alerts', []))} open alerts")

    def test_filter_alerts_by_type(self, admin_token):
        """Filter alerts by alert_type works"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/alerts?alert_type=rating",
            headers=auth_headers(admin_token)
        )
        assert resp.status_code == 200
        data = resp.json()
        for alert in data.get("alerts", []):
            assert alert.get("alert_type") == "rating", f"Expected rating type, got {alert.get('alert_type')}"
        print(f"✓ Type filter works: {len(data.get('alerts', []))} rating alerts")

    def test_alerts_sorted_by_priority(self, admin_token):
        """Alerts are sorted by priority_score descending"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/alerts",
            headers=auth_headers(admin_token)
        )
        data = resp.json()
        alerts = data.get("alerts", [])
        if len(alerts) >= 2:
            # Check that priority scores are in descending order
            for i in range(len(alerts) - 1):
                score_current = alerts[i].get("priority_score", 0)
                score_next = alerts[i + 1].get("priority_score", 0)
                assert score_current >= score_next, f"Alerts not sorted by priority: {score_current} < {score_next}"
            print(f"✓ Alerts sorted by priority (highest first)")
        else:
            print(f"✓ Not enough alerts to verify sorting (only {len(alerts)} alerts)")


# ═══════════════════════════════════════════════════════════════════════════════
# ROLE-BASED ACCESS TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestRoleBasedAccess:
    """Tests for role-based access to new pages"""

    def test_admin_can_access_weekly_performance(self, admin_token):
        """Admin can access weekly performance report"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/weekly-performance?weeks_back=0",
            headers=auth_headers(admin_token)
        )
        assert resp.status_code == 200, f"Admin should access weekly performance, got {resp.status_code}"
        print("✓ Admin can access weekly performance report")

    def test_admin_can_access_alerts(self, admin_token):
        """Admin can access alerts"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/alerts",
            headers=auth_headers(admin_token)
        )
        assert resp.status_code == 200, f"Admin should access alerts, got {resp.status_code}"
        print("✓ Admin can access alerts")

    def test_sales_manager_can_access_weekly_performance(self, sales_manager_token):
        """Sales Manager can access weekly performance report"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/weekly-performance?weeks_back=0",
            headers=auth_headers(sales_manager_token)
        )
        assert resp.status_code == 200, f"Sales Manager should access weekly performance, got {resp.status_code}"
        print("✓ Sales Manager can access weekly performance report")

    def test_sales_manager_can_access_alerts(self, sales_manager_token):
        """Sales Manager can access alerts"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/alerts",
            headers=auth_headers(sales_manager_token)
        )
        assert resp.status_code == 200, f"Sales Manager should access alerts, got {resp.status_code}"
        print("✓ Sales Manager can access alerts")

    def test_finance_manager_can_access_weekly_performance(self, finance_manager_token):
        """Finance Manager can access weekly performance report"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/weekly-performance?weeks_back=0",
            headers=auth_headers(finance_manager_token)
        )
        assert resp.status_code == 200, f"Finance Manager should access weekly performance, got {resp.status_code}"
        print("✓ Finance Manager can access weekly performance report")

    def test_finance_manager_can_access_alerts(self, finance_manager_token):
        """Finance Manager can access alerts"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/alerts",
            headers=auth_headers(finance_manager_token)
        )
        assert resp.status_code == 200, f"Finance Manager should access alerts, got {resp.status_code}"
        print("✓ Finance Manager can access alerts")


# ═══════════════════════════════════════════════════════════════════════════════
# ALERT RESOLVE FUNCTIONALITY TEST
# ═══════════════════════════════════════════════════════════════════════════════

class TestAlertResolve:
    """Tests for resolving alerts"""

    def test_resolve_alert_flow(self, admin_token):
        """Test the full resolve alert flow"""
        # First generate some alerts
        gen_resp = requests.post(
            f"{BASE_URL}/api/admin/alerts/generate",
            headers=auth_headers(admin_token)
        )
        assert gen_resp.status_code == 200

        # Get open alerts
        alerts_resp = requests.get(
            f"{BASE_URL}/api/admin/alerts?status=open",
            headers=auth_headers(admin_token)
        )
        assert alerts_resp.status_code == 200
        alerts = alerts_resp.json().get("alerts", [])

        if len(alerts) > 0:
            # Resolve the first alert
            alert_id = alerts[0].get("alert_id")
            resolve_resp = requests.post(
                f"{BASE_URL}/api/admin/alerts/{alert_id}/resolve",
                headers=auth_headers(admin_token)
            )
            assert resolve_resp.status_code == 200, f"Failed to resolve alert: {resolve_resp.text}"
            data = resolve_resp.json()
            assert data.get("ok") == True, "Expected ok=True"
            print(f"✓ Successfully resolved alert {alert_id}")
        else:
            print("✓ No open alerts to resolve (test skipped)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
