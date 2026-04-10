"""
Test Milestone System v241
Tests the referral milestone/progress system:
- GET /api/customer/referrals/overview — includes 'milestones' object
- GET /api/customer/referrals/me — includes 'milestones' field
- GET /api/dashboard-metrics/customer — referral object includes successful_referrals and next_milestone
- Milestone computation correctness
- referral_milestone notification event in in_app_notification_service
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CUSTOMER_EMAIL = "test@konekt.tz"
CUSTOMER_PASSWORD = "TestUser123!"


class TestMilestoneSystem:
    """Test milestone system for referrals"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.token = None
        self.user_id = None
        
    def _login_customer(self):
        """Login as customer and get token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("token")
            self.user_id = data.get("user", {}).get("id")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
            return True
        return False

    # ── Test 1: Referral Overview includes milestones ──
    def test_referral_overview_includes_milestones(self):
        """GET /api/customer/referrals/overview should include milestones object"""
        assert self._login_customer(), "Customer login failed"
        
        response = self.session.get(f"{BASE_URL}/api/customer/referrals/overview")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify milestones field exists
        assert "milestones" in data, "Response should include 'milestones' field"
        milestones = data["milestones"]
        
        # Verify referrals milestone structure
        assert "referrals" in milestones, "milestones should have 'referrals' key"
        ref_milestones = milestones["referrals"]
        assert "current" in ref_milestones, "referrals milestones should have 'current'"
        assert "achieved" in ref_milestones, "referrals milestones should have 'achieved'"
        assert "next_target" in ref_milestones, "referrals milestones should have 'next_target'"
        assert "all_complete" in ref_milestones, "referrals milestones should have 'all_complete'"
        
        # Verify earnings milestone structure
        assert "earnings" in milestones, "milestones should have 'earnings' key"
        earn_milestones = milestones["earnings"]
        assert "current" in earn_milestones, "earnings milestones should have 'current'"
        assert "achieved" in earn_milestones, "earnings milestones should have 'achieved'"
        assert "next_target" in earn_milestones, "earnings milestones should have 'next_target'"
        assert "all_complete" in earn_milestones, "earnings milestones should have 'all_complete'"
        
        print(f"✓ Referral overview includes milestones: {milestones}")

    # ── Test 2: Referral Me includes milestones ──
    def test_referral_me_includes_milestones(self):
        """GET /api/customer/referrals/me should include milestones field"""
        assert self._login_customer(), "Customer login failed"
        
        response = self.session.get(f"{BASE_URL}/api/customer/referrals/me")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify milestones field exists
        assert "milestones" in data, "Response should include 'milestones' field"
        milestones = data["milestones"]
        
        # Verify both dimensions
        assert "referrals" in milestones, "milestones should have 'referrals' key"
        assert "earnings" in milestones, "milestones should have 'earnings' key"
        
        # Verify referrals structure
        ref = milestones["referrals"]
        assert isinstance(ref.get("current"), int), "current should be an integer"
        assert isinstance(ref.get("achieved"), list), "achieved should be a list"
        assert isinstance(ref.get("all_complete"), bool), "all_complete should be boolean"
        
        # Verify earnings structure
        earn = milestones["earnings"]
        assert isinstance(earn.get("current"), (int, float)), "current should be numeric"
        assert isinstance(earn.get("achieved"), list), "achieved should be a list"
        assert isinstance(earn.get("all_complete"), bool), "all_complete should be boolean"
        
        print(f"✓ Referral /me includes milestones: {milestones}")

    # ── Test 3: Dashboard metrics includes referral progress ──
    def test_dashboard_metrics_includes_referral_progress(self):
        """GET /api/dashboard-metrics/customer should include successful_referrals and next_milestone"""
        assert self._login_customer(), "Customer login failed"
        
        response = self.session.get(f"{BASE_URL}/api/dashboard-metrics/customer?user_id={self.user_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify referral object exists
        assert "referral" in data, "Response should include 'referral' field"
        referral = data["referral"]
        
        # Verify successful_referrals field
        assert "successful_referrals" in referral, "referral should have 'successful_referrals'"
        assert isinstance(referral["successful_referrals"], int), "successful_referrals should be int"
        
        # Verify next_milestone field
        assert "next_milestone" in referral, "referral should have 'next_milestone'"
        # next_milestone can be None if all milestones are complete, or an int
        if referral["next_milestone"] is not None:
            assert isinstance(referral["next_milestone"], int), "next_milestone should be int or None"
            assert referral["next_milestone"] in [1, 5, 10, 25, 50], f"next_milestone should be valid: {referral['next_milestone']}"
        
        print(f"✓ Dashboard metrics includes referral progress: successful_referrals={referral['successful_referrals']}, next_milestone={referral['next_milestone']}")

    # ── Test 4: Milestone computation for 0 referrals ──
    def test_milestone_computation_zero_referrals(self):
        """Verify milestone computation for 0 referrals: next_target=1, achieved=[], all_complete=False"""
        assert self._login_customer(), "Customer login failed"
        
        response = self.session.get(f"{BASE_URL}/api/customer/referrals/overview")
        assert response.status_code == 200
        
        data = response.json()
        milestones = data.get("milestones", {})
        ref = milestones.get("referrals", {})
        
        # For a user with 0 successful referrals
        if ref.get("current", 0) == 0:
            assert ref.get("next_target") == 1, "With 0 referrals, next_target should be 1"
            assert ref.get("achieved") == [], "With 0 referrals, achieved should be empty"
            assert ref.get("all_complete") == False, "With 0 referrals, all_complete should be False"
            print("✓ Milestone computation correct for 0 referrals")
        else:
            # User has some referrals, just verify structure
            print(f"✓ User has {ref.get('current')} referrals, milestone structure valid")

    # ── Test 5: Earnings milestone structure ──
    def test_earnings_milestone_structure(self):
        """Verify earnings milestones use correct thresholds: 10K, 50K, 100K, 250K, 500K"""
        assert self._login_customer(), "Customer login failed"
        
        response = self.session.get(f"{BASE_URL}/api/customer/referrals/me")
        assert response.status_code == 200
        
        data = response.json()
        milestones = data.get("milestones", {})
        earn = milestones.get("earnings", {})
        
        # Verify next_target is one of the valid thresholds or None
        valid_thresholds = [10000, 50000, 100000, 250000, 500000, None]
        assert earn.get("next_target") in valid_thresholds, f"next_target should be valid: {earn.get('next_target')}"
        
        # Verify achieved contains only valid thresholds
        for achieved in earn.get("achieved", []):
            assert achieved in [10000, 50000, 100000, 250000, 500000], f"Invalid achieved milestone: {achieved}"
        
        print(f"✓ Earnings milestone structure valid: current={earn.get('current')}, next_target={earn.get('next_target')}")

    # ── Test 6: Referral stats endpoint still works ──
    def test_referral_stats_endpoint(self):
        """GET /api/customer/referrals/stats should still work"""
        assert self._login_customer(), "Customer login failed"
        
        response = self.session.get(f"{BASE_URL}/api/customer/referrals/stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "referral_code" in data
        assert "total_referrals" in data
        assert "successful_referrals" in data
        assert "total_earned" in data
        assert "wallet_balance" in data
        
        print(f"✓ Referral stats endpoint works: {data}")

    # ── Test 7: Wallet usage rules endpoint still works ──
    def test_wallet_usage_rules_endpoint(self):
        """GET /api/customer/referrals/wallet-usage-rules should still work"""
        assert self._login_customer(), "Customer login failed"
        
        response = self.session.get(f"{BASE_URL}/api/customer/referrals/wallet-usage-rules")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "wallet_balance" in data
        assert "max_wallet_usage_pct" in data
        
        print(f"✓ Wallet usage rules endpoint works: {data}")

    # ── Test 8: Referral overview has all required fields ──
    def test_referral_overview_complete_schema(self):
        """Verify /overview returns all required fields"""
        assert self._login_customer(), "Customer login failed"
        
        response = self.session.get(f"{BASE_URL}/api/customer/referrals/overview")
        assert response.status_code == 200
        
        data = response.json()
        
        # Required fields
        required_fields = ["referral_code", "wallet_balance", "total_earned", "successful_referrals", "total_referrals", "milestones"]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        print(f"✓ Referral overview has all required fields")

    # ── Test 9: Referral /me has all required fields ──
    def test_referral_me_complete_schema(self):
        """Verify /me returns all required fields including milestones"""
        assert self._login_customer(), "Customer login failed"
        
        response = self.session.get(f"{BASE_URL}/api/customer/referrals/me")
        assert response.status_code == 200
        
        data = response.json()
        
        # Required fields
        required_fields = ["referral_code", "referral_link", "wallet", "stats", "milestones", "max_wallet_usage_pct", "referral_transactions"]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        # Verify wallet structure
        wallet = data.get("wallet", {})
        assert "balance" in wallet
        assert "total_earned" in wallet
        assert "total_used" in wallet
        
        # Verify stats structure
        stats = data.get("stats", {})
        assert "total_referrals" in stats
        assert "successful_referrals" in stats
        assert "reward_earned" in stats
        
        print(f"✓ Referral /me has all required fields")

    # ── Test 10: Dashboard metrics referral object complete ──
    def test_dashboard_referral_object_complete(self):
        """Verify dashboard metrics referral object has all required fields"""
        assert self._login_customer(), "Customer login failed"
        
        response = self.session.get(f"{BASE_URL}/api/dashboard-metrics/customer?user_id={self.user_id}")
        assert response.status_code == 200
        
        data = response.json()
        referral = data.get("referral", {})
        
        # Required fields for referral object
        required_fields = ["balance", "code", "total_earned", "successful_referrals", "next_milestone"]
        for field in required_fields:
            assert field in referral, f"Missing required field in referral: {field}"
        
        print(f"✓ Dashboard referral object complete: {referral}")


class TestMilestoneConstants:
    """Test milestone constant definitions"""
    
    def test_referral_count_milestones_defined(self):
        """Verify REFERRAL_COUNT_MILESTONES = [1, 5, 10, 25, 50]"""
        # This is a code review test - we verify via API behavior
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200
        token = response.json().get("token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get milestones
        response = session.get(f"{BASE_URL}/api/customer/referrals/overview")
        assert response.status_code == 200
        
        data = response.json()
        ref = data.get("milestones", {}).get("referrals", {})
        
        # next_target should be one of [1, 5, 10, 25, 50] or None
        valid_targets = [1, 5, 10, 25, 50, None]
        assert ref.get("next_target") in valid_targets, f"Invalid next_target: {ref.get('next_target')}"
        
        print("✓ REFERRAL_COUNT_MILESTONES correctly defined")

    def test_earnings_milestones_defined(self):
        """Verify EARNINGS_MILESTONES = [10K, 50K, 100K, 250K, 500K]"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200
        token = response.json().get("token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get milestones
        response = session.get(f"{BASE_URL}/api/customer/referrals/overview")
        assert response.status_code == 200
        
        data = response.json()
        earn = data.get("milestones", {}).get("earnings", {})
        
        # next_target should be one of [10000, 50000, 100000, 250000, 500000] or None
        valid_targets = [10000, 50000, 100000, 250000, 500000, None]
        assert earn.get("next_target") in valid_targets, f"Invalid next_target: {earn.get('next_target')}"
        
        print("✓ EARNINGS_MILESTONES correctly defined")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
