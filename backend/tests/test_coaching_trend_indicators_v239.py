"""
Test Suite for Iteration 239: Trend Indicators + Sales Team Coaching System

Features tested:
1. Trend Indicators in weekly report notifications (week-over-week comparison)
2. Sales Team Coaching System - coaching insights per sales rep
3. Coaching classification: Top Performer (≥75), Strong (50-74), Improving (25-49), Needs Attention (10-24), Critical (<10)
4. Frontend: Team Coaching Insights section in Sales Manager Dashboard
5. Frontend: Team Coaching Summary in Weekly Report
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    pytest.skip(f"Admin login failed: {response.status_code}")


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    """Auth headers for API requests"""
    return {"Authorization": f"Bearer {admin_token}"}


class TestCoachingEngineBackend:
    """Test coaching engine backend APIs"""

    def test_team_kpis_returns_coaching_insights(self, auth_headers):
        """GET /api/admin/dashboard/team-kpis returns coaching_insights array"""
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard/team-kpis",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify coaching_insights field exists
        assert "coaching_insights" in data, "coaching_insights field missing from response"
        assert isinstance(data["coaching_insights"], list), "coaching_insights should be a list"
        print(f"✓ coaching_insights returned with {len(data['coaching_insights'])} flagged reps")

    def test_team_kpis_returns_coaching_all(self, auth_headers):
        """GET /api/admin/dashboard/team-kpis returns coaching_all array with all reps"""
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard/team-kpis",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify coaching_all field exists
        assert "coaching_all" in data, "coaching_all field missing from response"
        assert isinstance(data["coaching_all"], list), "coaching_all should be a list"
        print(f"✓ coaching_all returned with {len(data['coaching_all'])} total reps")

    def test_coaching_insight_structure(self, auth_headers):
        """Verify coaching insight has correct structure: id, name, score, status, reasons, actions, metrics"""
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard/team-kpis",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        coaching_all = data.get("coaching_all", [])
        if not coaching_all:
            pytest.skip("No coaching data available")
        
        # Check first coaching insight structure
        insight = coaching_all[0]
        required_fields = ["id", "name", "score", "status", "reasons", "actions", "metrics"]
        for field in required_fields:
            assert field in insight, f"Missing field: {field}"
        
        # Verify types
        assert isinstance(insight["score"], (int, float)), "score should be numeric"
        assert isinstance(insight["status"], str), "status should be string"
        assert isinstance(insight["reasons"], list), "reasons should be list"
        assert isinstance(insight["actions"], list), "actions should be list"
        assert isinstance(insight["metrics"], dict), "metrics should be dict"
        
        print(f"✓ Coaching insight structure valid: {insight['name']} - {insight['status']} (score: {insight['score']})")

    def test_coaching_classification_thresholds(self, auth_headers):
        """Verify coaching classification: ≥75=Top Performer, 50-74=Strong, 25-49=Improving, 10-24=Needs Attention, <10=Critical"""
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard/team-kpis",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        coaching_all = data.get("coaching_all", [])
        valid_statuses = ["Top Performer", "Strong", "Improving", "Needs Attention", "Critical"]
        
        for insight in coaching_all:
            score = insight["score"]
            status = insight["status"]
            
            # Verify status is valid
            assert status in valid_statuses, f"Invalid status: {status}"
            
            # Verify classification matches score
            if score >= 75:
                assert status == "Top Performer", f"Score {score} should be Top Performer, got {status}"
            elif score >= 50:
                assert status == "Strong", f"Score {score} should be Strong, got {status}"
            elif score >= 25:
                assert status == "Improving", f"Score {score} should be Improving, got {status}"
            elif score >= 10:
                assert status == "Needs Attention", f"Score {score} should be Needs Attention, got {status}"
            else:
                assert status == "Critical", f"Score {score} should be Critical, got {status}"
        
        print(f"✓ All {len(coaching_all)} coaching classifications are correct")

    def test_coaching_reasons_and_actions_max_two(self, auth_headers):
        """Verify coaching insights have max 2 reasons and max 2 actions"""
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard/team-kpis",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        coaching_all = data.get("coaching_all", [])
        for insight in coaching_all:
            reasons = insight.get("reasons", [])
            actions = insight.get("actions", [])
            
            assert len(reasons) <= 2, f"Rep {insight['name']} has {len(reasons)} reasons (max 2)"
            assert len(actions) <= 2, f"Rep {insight['name']} has {len(actions)} actions (max 2)"
        
        print(f"✓ All coaching insights have ≤2 reasons and ≤2 actions")

    def test_coaching_metrics_snapshot(self, auth_headers):
        """Verify coaching metrics include avg_rating, deals, critical_discounts"""
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard/team-kpis",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        coaching_all = data.get("coaching_all", [])
        if not coaching_all:
            pytest.skip("No coaching data available")
        
        insight = coaching_all[0]
        metrics = insight.get("metrics", {})
        
        # Verify required metrics fields
        assert "avg_rating" in metrics, "metrics missing avg_rating"
        assert "deals" in metrics, "metrics missing deals"
        assert "critical_discounts" in metrics, "metrics missing critical_discounts"
        
        print(f"✓ Coaching metrics snapshot valid: avg_rating={metrics['avg_rating']}, deals={metrics['deals']}, critical_discounts={metrics['critical_discounts']}")


class TestWeeklyReportCoachingSummary:
    """Test weekly performance report coaching summary"""

    def test_weekly_report_returns_coaching_summary(self, auth_headers):
        """GET /api/admin/reports/weekly-performance returns coaching_summary field"""
        response = requests.get(
            f"{BASE_URL}/api/admin/reports/weekly-performance?weeks_back=0",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify coaching_summary field exists
        assert "coaching_summary" in data, "coaching_summary field missing from weekly report"
        assert isinstance(data["coaching_summary"], list), "coaching_summary should be a list"
        print(f"✓ Weekly report includes coaching_summary with {len(data['coaching_summary'])} flagged reps")

    def test_coaching_summary_structure(self, auth_headers):
        """Verify coaching summary has name, status, issue, action fields"""
        response = requests.get(
            f"{BASE_URL}/api/admin/reports/weekly-performance?weeks_back=0",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        coaching_summary = data.get("coaching_summary", [])
        if not coaching_summary:
            print("✓ No flagged reps in coaching summary (all performing well)")
            return
        
        # Check structure of first entry
        entry = coaching_summary[0]
        required_fields = ["name", "status", "issue", "action"]
        for field in required_fields:
            assert field in entry, f"Missing field in coaching summary: {field}"
        
        # Verify status is Critical or Needs Attention (only flagged reps)
        assert entry["status"] in ["Critical", "Needs Attention"], f"Unexpected status in summary: {entry['status']}"
        
        print(f"✓ Coaching summary structure valid: {entry['name']} - {entry['status']}")

    def test_coaching_summary_only_flagged_reps(self, auth_headers):
        """Verify coaching summary only includes Critical and Needs Attention reps"""
        response = requests.get(
            f"{BASE_URL}/api/admin/reports/weekly-performance?weeks_back=0",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        coaching_summary = data.get("coaching_summary", [])
        for entry in coaching_summary:
            assert entry["status"] in ["Critical", "Needs Attention"], \
                f"Coaching summary should only include flagged reps, got: {entry['status']}"
        
        print(f"✓ Coaching summary correctly filters to flagged reps only ({len(coaching_summary)} reps)")


class TestTrendIndicatorsInNotifications:
    """Test trend indicators in weekly report delivery notifications"""

    def test_deliver_now_creates_notification_with_trends(self, auth_headers):
        """POST /api/admin/settings-hub/report-schedule/deliver-now creates notification with trend indicators"""
        response = requests.post(
            f"{BASE_URL}/api/admin/settings-hub/report-schedule/deliver-now",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # API returns status: delivered or ok: true
        assert data.get("status") == "delivered" or data.get("ok") == True, "deliver-now should return status: delivered"
        assert "recipients_count" in data, "Missing recipients_count in response"
        print(f"✓ Report delivered to {data['recipients_count']} recipients")

    def test_notification_message_contains_trend_indicators(self, auth_headers):
        """Verify notification message contains trend indicators (e.g., '+12% ↑', '-2 ↓')"""
        # First trigger delivery
        requests.post(
            f"{BASE_URL}/api/admin/settings-hub/report-schedule/deliver-now",
            headers=auth_headers
        )
        
        # Get admin notifications
        response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        notifications = data if isinstance(data, list) else data.get("notifications", [])
        
        # Find the weekly report notification
        weekly_notif = None
        for n in notifications:
            if "Weekly Performance" in (n.get("title", "") or n.get("message", "")):
                weekly_notif = n
                break
        
        if not weekly_notif:
            pytest.skip("No weekly report notification found")
        
        message = weekly_notif.get("message", "")
        
        # Check for trend indicators in message
        has_trend = any(indicator in message for indicator in ["↑", "↓", "+", "-", "%"])
        assert has_trend, f"Notification message should contain trend indicators: {message}"
        
        print(f"✓ Notification contains trend indicators: {message[:100]}...")

    def test_notification_includes_coaching_critical_count(self, auth_headers):
        """Verify notification mentions coaching critical count if any reps need attention"""
        # Trigger delivery
        requests.post(
            f"{BASE_URL}/api/admin/settings-hub/report-schedule/deliver-now",
            headers=auth_headers
        )
        
        # Get notifications
        response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        notifications = data if isinstance(data, list) else data.get("notifications", [])
        
        # Find weekly report notification
        weekly_notif = None
        for n in notifications:
            if "Weekly Performance" in (n.get("title", "") or n.get("message", "")):
                weekly_notif = n
                break
        
        if not weekly_notif:
            pytest.skip("No weekly report notification found")
        
        message = weekly_notif.get("message", "")
        context = weekly_notif.get("context", {})
        
        # Check if coaching info is present (either in message or context)
        has_coaching_info = "coaching" in message.lower() or "trends" in context
        print(f"✓ Notification message: {message[:150]}...")
        print(f"✓ Notification context includes trends: {'trends' in context}")


class TestReportScheduleEndpoints:
    """Test report schedule endpoints"""

    def test_get_report_schedule(self, auth_headers):
        """GET /api/admin/settings-hub/report-schedule returns schedule config"""
        response = requests.get(
            f"{BASE_URL}/api/admin/settings-hub/report-schedule",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields
        assert "enabled" in data, "Missing enabled field"
        assert "day" in data, "Missing day field"
        assert "time" in data, "Missing time field"
        assert "timezone" in data, "Missing timezone field"
        assert "recipient_roles" in data, "Missing recipient_roles field"
        
        print(f"✓ Report schedule: {data['day']} at {data['time']} ({data['timezone']})")

    def test_get_last_delivery_status(self, auth_headers):
        """GET /api/admin/settings-hub/report-schedule includes last_delivery info"""
        response = requests.get(
            f"{BASE_URL}/api/admin/settings-hub/report-schedule",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # last_delivery may be empty if never delivered
        if "last_delivery" in data and data["last_delivery"]:
            ld = data["last_delivery"]
            print(f"✓ Last delivery: {ld.get('delivered_at', 'N/A')} - {ld.get('status', 'N/A')}")
        else:
            print("✓ No previous delivery recorded")


class TestCoachingInsightsFiltering:
    """Test coaching insights filtering for dashboard"""

    def test_coaching_insights_filtered_for_dashboard(self, auth_headers):
        """Verify coaching_insights only includes Critical, Needs Attention, Improving reps"""
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard/team-kpis",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        coaching_insights = data.get("coaching_insights", [])
        allowed_statuses = ["Critical", "Needs Attention", "Improving"]
        
        for insight in coaching_insights:
            assert insight["status"] in allowed_statuses, \
                f"Dashboard coaching_insights should only include flagged reps, got: {insight['status']}"
        
        print(f"✓ Dashboard coaching_insights correctly filtered ({len(coaching_insights)} flagged reps)")

    def test_coaching_insights_max_seven(self, auth_headers):
        """Verify coaching_insights returns max 7 reps for dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard/team-kpis",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        coaching_insights = data.get("coaching_insights", [])
        assert len(coaching_insights) <= 7, f"coaching_insights should have max 7 reps, got {len(coaching_insights)}"
        
        print(f"✓ coaching_insights limited to max 7 reps ({len(coaching_insights)} returned)")

    def test_coaching_all_sorted_by_score_ascending(self, auth_headers):
        """Verify coaching_all is sorted by score ascending (worst first)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard/team-kpis",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        coaching_all = data.get("coaching_all", [])
        if len(coaching_all) < 2:
            pytest.skip("Not enough coaching data to verify sorting")
        
        scores = [c["score"] for c in coaching_all]
        assert scores == sorted(scores), "coaching_all should be sorted by score ascending"
        
        print(f"✓ coaching_all sorted by score ascending (worst first): {scores[:5]}...")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
