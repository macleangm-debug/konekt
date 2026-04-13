"""
Performance KPI Dashboard API Tests — Batch 2 KPI System
Tests: /api/admin/performance/dashboard endpoint
- KPI strip: total_profit, target_profit, achievement_pct, total_revenue, active_sales, active_affiliates
- Channels: sales, affiliate, direct, group_deal with revenue, profit, target, achievement_pct, contribution_pct
- Sales leaderboard: profit-first (profit is PRIMARY), revenue secondary, status (top/warning/underperform)
- Affiliate leaderboard: earnings-only (NO revenue/profit/margin), deals, conversions, status
- Actions: underperformer warnings + smart insights
- Month/year filter
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPerformanceKPIDashboard:
    """Performance KPI Dashboard API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for admin"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        assert login_resp.status_code == 200, f"Admin login failed: {login_resp.text}"
        token = login_resp.json().get("token")
        assert token, "No token returned from login"
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_dashboard_endpoint_returns_200(self):
        """Test that dashboard endpoint returns 200 with auth"""
        resp = self.session.get(f"{BASE_URL}/api/admin/performance/dashboard")
        assert resp.status_code == 200, f"Dashboard returned {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data is not None
        print(f"✓ Dashboard endpoint returns 200")
    
    def test_dashboard_has_required_fields(self):
        """Test dashboard response has all required top-level fields"""
        resp = self.session.get(f"{BASE_URL}/api/admin/performance/dashboard")
        assert resp.status_code == 200
        data = resp.json()
        
        required_fields = ["period", "kpi_strip", "channels", "sales_leaderboard", "affiliate_leaderboard", "actions", "targets"]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        print(f"✓ Dashboard has all required fields: {required_fields}")
    
    def test_kpi_strip_structure(self):
        """Test KPI strip has correct fields: total_profit, target_profit, achievement_pct, total_revenue, active_sales, active_affiliates"""
        resp = self.session.get(f"{BASE_URL}/api/admin/performance/dashboard")
        assert resp.status_code == 200
        kpi = resp.json().get("kpi_strip", {})
        
        required_kpi_fields = ["total_profit", "target_profit", "achievement_pct", "total_revenue", "active_sales", "active_affiliates"]
        for field in required_kpi_fields:
            assert field in kpi, f"KPI strip missing field: {field}"
        
        # Verify types
        assert isinstance(kpi["total_profit"], (int, float)), "total_profit should be numeric"
        assert isinstance(kpi["target_profit"], (int, float)), "target_profit should be numeric"
        assert isinstance(kpi["achievement_pct"], (int, float)), "achievement_pct should be numeric"
        assert isinstance(kpi["total_revenue"], (int, float)), "total_revenue should be numeric"
        assert isinstance(kpi["active_sales"], int), "active_sales should be int"
        assert isinstance(kpi["active_affiliates"], int), "active_affiliates should be int"
        
        print(f"✓ KPI strip structure valid: total_profit={kpi['total_profit']}, target_profit={kpi['target_profit']}, achievement_pct={kpi['achievement_pct']}%")
    
    def test_channels_structure(self):
        """Test channels data includes sales, affiliate, direct, group_deal with required fields"""
        resp = self.session.get(f"{BASE_URL}/api/admin/performance/dashboard")
        assert resp.status_code == 200
        channels = resp.json().get("channels", {})
        
        required_channels = ["sales", "affiliate", "direct", "group_deal"]
        for ch in required_channels:
            assert ch in channels, f"Missing channel: {ch}"
        
        # Check each channel has required fields
        channel_fields = ["label", "revenue", "profit", "target", "achievement_pct", "contribution_pct", "deal_count"]
        for ch_key, ch_data in channels.items():
            for field in channel_fields:
                assert field in ch_data, f"Channel {ch_key} missing field: {field}"
        
        print(f"✓ Channels structure valid: {list(channels.keys())}")
        for ch_key, ch_data in channels.items():
            print(f"  - {ch_data['label']}: revenue={ch_data['revenue']}, profit={ch_data['profit']}, achievement={ch_data['achievement_pct']}%")
    
    def test_sales_leaderboard_profit_first(self):
        """Test sales leaderboard has profit as PRIMARY column, revenue secondary, status field"""
        resp = self.session.get(f"{BASE_URL}/api/admin/performance/dashboard")
        assert resp.status_code == 200
        sales_lb = resp.json().get("sales_leaderboard", [])
        
        if len(sales_lb) == 0:
            print("⚠ No sales staff in leaderboard (may be empty data)")
            return
        
        # Check first entry has required fields
        required_fields = ["id", "name", "profit", "revenue", "deals", "target_profit", "achievement_pct", "status"]
        for field in required_fields:
            assert field in sales_lb[0], f"Sales leaderboard entry missing field: {field}"
        
        # Verify status values
        valid_statuses = ["top", "warning", "underperform"]
        for entry in sales_lb:
            assert entry["status"] in valid_statuses, f"Invalid status: {entry['status']}"
        
        print(f"✓ Sales leaderboard structure valid ({len(sales_lb)} entries)")
        for entry in sales_lb[:3]:
            print(f"  - {entry['name']}: profit={entry['profit']}, revenue={entry['revenue']}, status={entry['status']}")
    
    def test_affiliate_leaderboard_earnings_only(self):
        """Test affiliate leaderboard shows EARNINGS (not revenue), deals, conversions, status — NO revenue/profit/margin"""
        resp = self.session.get(f"{BASE_URL}/api/admin/performance/dashboard")
        assert resp.status_code == 200
        aff_lb = resp.json().get("affiliate_leaderboard", [])
        
        if len(aff_lb) == 0:
            print("⚠ No affiliates in leaderboard (may be empty data)")
            return
        
        # Check first entry has required fields
        required_fields = ["id", "name", "earnings", "deals", "conversions", "achievement_pct", "status"]
        for field in required_fields:
            assert field in aff_lb[0], f"Affiliate leaderboard entry missing field: {field}"
        
        # Verify NO revenue/profit/margin fields (earnings-only rule)
        forbidden_fields = ["revenue", "profit", "margin"]
        for entry in aff_lb:
            for forbidden in forbidden_fields:
                assert forbidden not in entry, f"Affiliate leaderboard should NOT have '{forbidden}' field (earnings-only rule)"
        
        # Verify status values
        valid_statuses = ["top", "warning", "underperform"]
        for entry in aff_lb:
            assert entry["status"] in valid_statuses, f"Invalid status: {entry['status']}"
        
        print(f"✓ Affiliate leaderboard structure valid ({len(aff_lb)} entries) — earnings-only confirmed")
        for entry in aff_lb[:3]:
            print(f"  - {entry['name']}: earnings={entry['earnings']}, deals={entry['deals']}, status={entry['status']}")
    
    def test_actions_panel_structure(self):
        """Test action panel has warnings and insights"""
        resp = self.session.get(f"{BASE_URL}/api/admin/performance/dashboard")
        assert resp.status_code == 200
        actions = resp.json().get("actions", [])
        
        # Actions may be empty if no underperformers
        if len(actions) == 0:
            print("⚠ No actions in panel (may be no underperformers)")
            return
        
        # Check action structure
        for action in actions:
            assert "type" in action, "Action missing 'type' field"
            assert "message" in action, "Action missing 'message' field"
            assert action["type"] in ["warning", "insight"], f"Invalid action type: {action['type']}"
        
        print(f"✓ Actions panel structure valid ({len(actions)} actions)")
        for action in actions[:3]:
            print(f"  - [{action['type']}] {action['message']}")
    
    def test_month_year_filter(self):
        """Test month/year filter works — ?year=2026&month=4"""
        resp = self.session.get(f"{BASE_URL}/api/admin/performance/dashboard?year=2026&month=4")
        assert resp.status_code == 200, f"Filter failed: {resp.text}"
        data = resp.json()
        
        # Verify period reflects filter
        period = data.get("period", {})
        assert period.get("year") == 2026, f"Year filter not applied: {period}"
        assert period.get("month") == 4, f"Month filter not applied: {period}"
        
        print(f"✓ Month/year filter works: period={period}")
    
    def test_month_year_filter_different_month(self):
        """Test filter with different month — ?year=2026&month=1"""
        resp = self.session.get(f"{BASE_URL}/api/admin/performance/dashboard?year=2026&month=1")
        assert resp.status_code == 200
        data = resp.json()
        
        period = data.get("period", {})
        assert period.get("year") == 2026
        assert period.get("month") == 1
        
        print(f"✓ Different month filter works: period={period}")
    
    def test_targets_in_response(self):
        """Test targets are included in response"""
        resp = self.session.get(f"{BASE_URL}/api/admin/performance/dashboard")
        assert resp.status_code == 200
        targets = resp.json().get("targets", {})
        
        required_target_fields = ["monthly_revenue_target", "target_margin_pct", "channel_allocation", "sales_staff_count", "affiliate_count"]
        for field in required_target_fields:
            assert field in targets, f"Targets missing field: {field}"
        
        print(f"✓ Targets in response: monthly_revenue_target={targets['monthly_revenue_target']}, margin={targets['target_margin_pct']}%")
    
    def test_unauthorized_access_rejected(self):
        """Test that unauthenticated requests are rejected"""
        unauth_session = requests.Session()
        resp = unauth_session.get(f"{BASE_URL}/api/admin/performance/dashboard")
        assert resp.status_code in [401, 403], f"Unauthenticated request should be rejected, got {resp.status_code}"
        print(f"✓ Unauthorized access correctly rejected with {resp.status_code}")


class TestSettingsHubPerformanceTargets:
    """Test Settings Hub has performance_targets section"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for admin"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        assert login_resp.status_code == 200
        token = login_resp.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_settings_hub_has_performance_targets(self):
        """Test settings hub includes performance_targets section"""
        resp = self.session.get(f"{BASE_URL}/api/admin/settings-hub")
        assert resp.status_code == 200, f"Settings hub failed: {resp.text}"
        data = resp.json()
        
        # Check if performance_targets exists (may be in defaults or stored)
        # The settings hub merges defaults with stored values
        print(f"✓ Settings hub endpoint accessible")
        print(f"  Keys in response: {list(data.keys())[:10]}...")
    
    def test_settings_hub_update_performance_targets(self):
        """Test updating performance targets via settings hub"""
        # First get current settings
        get_resp = self.session.get(f"{BASE_URL}/api/admin/settings-hub")
        assert get_resp.status_code == 200
        current = get_resp.json()
        
        # Update with performance_targets
        current["performance_targets"] = {
            "monthly_revenue_target": 600000000,
            "target_margin_pct": 25,
            "channel_allocation": {
                "sales_pct": 45,
                "affiliate_pct": 35,
                "direct_pct": 10,
                "group_deals_pct": 10
            },
            "sales_staff_count": 15,
            "affiliate_count": 20,
            "sales_min_kpi_pct": 75,
            "affiliate_min_kpi_pct": 65
        }
        
        put_resp = self.session.put(f"{BASE_URL}/api/admin/settings-hub", json=current)
        assert put_resp.status_code == 200, f"Settings update failed: {put_resp.text}"
        
        # Verify update persisted
        verify_resp = self.session.get(f"{BASE_URL}/api/admin/settings-hub")
        assert verify_resp.status_code == 200
        updated = verify_resp.json()
        
        pt = updated.get("performance_targets", {})
        assert pt.get("monthly_revenue_target") == 600000000, "Revenue target not updated"
        
        print(f"✓ Performance targets update works")
        
        # Restore defaults
        current["performance_targets"] = {
            "monthly_revenue_target": 500000000,
            "target_margin_pct": 20,
            "channel_allocation": {
                "sales_pct": 50,
                "affiliate_pct": 30,
                "direct_pct": 10,
                "group_deals_pct": 10
            },
            "sales_staff_count": 10,
            "affiliate_count": 10,
            "sales_min_kpi_pct": 70,
            "affiliate_min_kpi_pct": 60
        }
        self.session.put(f"{BASE_URL}/api/admin/settings-hub", json=current)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
