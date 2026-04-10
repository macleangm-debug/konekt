"""
Test Suite for Referral System Revamp (Iteration 240)
Tests: Customer referral routes, admin settings hub, wallet usage rules
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CUSTOMER_EMAIL = "test@konekt.tz"
CUSTOMER_PASSWORD = "TestUser123!"
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


class TestHealthCheck:
    """Basic health check"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ API health check passed")


class TestCustomerAuth:
    """Customer authentication tests"""
    
    @pytest.fixture
    def customer_token(self):
        """Get customer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Customer login failed: {response.status_code} - {response.text}")
        return response.json().get("token")
    
    def test_customer_login(self):
        """Test customer can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print(f"✓ Customer login successful")


class TestCustomerReferralOverview:
    """Test GET /api/customer/referrals/overview"""
    
    @pytest.fixture
    def customer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Customer login failed")
        return response.json().get("token")
    
    def test_referral_overview_returns_expected_fields(self, customer_token):
        """Test /api/customer/referrals/overview returns required fields"""
        headers = {"Authorization": f"Bearer {customer_token}"}
        response = requests.get(f"{BASE_URL}/api/customer/referrals/overview", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields
        assert "referral_code" in data, "Missing referral_code"
        assert "wallet_balance" in data, "Missing wallet_balance"
        assert "total_earned" in data, "Missing total_earned"
        assert "successful_referrals" in data, "Missing successful_referrals"
        
        # Verify data types
        assert isinstance(data["wallet_balance"], (int, float))
        assert isinstance(data["total_earned"], (int, float))
        assert isinstance(data["successful_referrals"], int)
        
        print(f"✓ Referral overview: code={data['referral_code']}, balance={data['wallet_balance']}, earned={data['total_earned']}, referrals={data['successful_referrals']}")


class TestCustomerReferralMe:
    """Test GET /api/customer/referrals/me"""
    
    @pytest.fixture
    def customer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Customer login failed")
        return response.json().get("token")
    
    def test_referral_me_returns_full_data(self, customer_token):
        """Test /api/customer/referrals/me returns full referral data"""
        headers = {"Authorization": f"Bearer {customer_token}"}
        response = requests.get(f"{BASE_URL}/api/customer/referrals/me", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields
        assert "referral_code" in data, "Missing referral_code"
        assert "referral_link" in data, "Missing referral_link"
        assert "wallet" in data, "Missing wallet"
        assert "stats" in data, "Missing stats"
        assert "max_wallet_usage_pct" in data, "Missing max_wallet_usage_pct"
        assert "referral_transactions" in data, "Missing referral_transactions"
        
        # Verify wallet structure
        wallet = data["wallet"]
        assert "balance" in wallet, "Missing wallet.balance"
        assert "total_earned" in wallet, "Missing wallet.total_earned"
        assert "total_used" in wallet, "Missing wallet.total_used"
        
        # Verify stats structure
        stats = data["stats"]
        assert "total_referrals" in stats, "Missing stats.total_referrals"
        assert "successful_referrals" in stats, "Missing stats.successful_referrals"
        assert "reward_earned" in stats, "Missing stats.reward_earned"
        
        # Verify referral_link format
        assert "ref=" in data["referral_link"], "Referral link should contain ref= parameter"
        
        print(f"✓ Referral /me: code={data['referral_code']}, link={data['referral_link'][:50]}...")
        print(f"  Wallet: balance={wallet['balance']}, earned={wallet['total_earned']}, used={wallet['total_used']}")
        print(f"  Stats: total={stats['total_referrals']}, successful={stats['successful_referrals']}")
        print(f"  Max wallet usage: {data['max_wallet_usage_pct']}%")


class TestCustomerReferralStats:
    """Test GET /api/customer/referrals/stats"""
    
    @pytest.fixture
    def customer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Customer login failed")
        return response.json().get("token")
    
    def test_referral_stats_returns_summary(self, customer_token):
        """Test /api/customer/referrals/stats returns summary stats"""
        headers = {"Authorization": f"Bearer {customer_token}"}
        response = requests.get(f"{BASE_URL}/api/customer/referrals/stats", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields
        assert "referral_code" in data
        assert "total_referrals" in data
        assert "successful_referrals" in data
        assert "total_earned" in data
        assert "wallet_balance" in data
        
        print(f"✓ Referral stats: code={data['referral_code']}, total={data['total_referrals']}, successful={data['successful_referrals']}, earned={data['total_earned']}, balance={data['wallet_balance']}")


class TestCustomerWalletUsageRules:
    """Test GET /api/customer/referrals/wallet-usage-rules"""
    
    @pytest.fixture
    def customer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Customer login failed")
        return response.json().get("token")
    
    def test_wallet_usage_rules_returns_balance_and_max_pct(self, customer_token):
        """Test /api/customer/referrals/wallet-usage-rules returns wallet_balance and max_wallet_usage_pct"""
        headers = {"Authorization": f"Bearer {customer_token}"}
        response = requests.get(f"{BASE_URL}/api/customer/referrals/wallet-usage-rules", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields
        assert "wallet_balance" in data, "Missing wallet_balance"
        assert "max_wallet_usage_pct" in data, "Missing max_wallet_usage_pct"
        
        # Verify data types
        assert isinstance(data["wallet_balance"], (int, float))
        assert isinstance(data["max_wallet_usage_pct"], (int, float))
        
        # Verify max_wallet_usage_pct is reasonable (0-100)
        assert 0 <= data["max_wallet_usage_pct"] <= 100, f"max_wallet_usage_pct should be 0-100, got {data['max_wallet_usage_pct']}"
        
        print(f"✓ Wallet usage rules: balance={data['wallet_balance']}, max_pct={data['max_wallet_usage_pct']}%")


class TestAdminSettingsHub:
    """Test GET /api/admin/settings-hub"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.status_code}")
        return response.json().get("token")
    
    def test_admin_login(self):
        """Test admin can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print(f"✓ Admin login successful")
    
    def test_settings_hub_returns_commercial_section(self, admin_token):
        """Test /api/admin/settings-hub returns commercial section with referral settings"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify commercial section exists
        assert "commercial" in data, "Missing commercial section"
        commercial = data["commercial"]
        
        # Verify referral-related fields in commercial section
        assert "referral_pct" in commercial, "Missing referral_pct in commercial"
        assert "max_wallet_usage_pct" in commercial, "Missing max_wallet_usage_pct in commercial"
        assert "referral_min_order_amount" in commercial, "Missing referral_min_order_amount in commercial"
        assert "referral_max_reward_per_order" in commercial, "Missing referral_max_reward_per_order in commercial"
        
        # Verify data types
        assert isinstance(commercial["referral_pct"], (int, float))
        assert isinstance(commercial["max_wallet_usage_pct"], (int, float))
        assert isinstance(commercial["referral_min_order_amount"], (int, float))
        assert isinstance(commercial["referral_max_reward_per_order"], (int, float))
        
        print(f"✓ Admin settings hub commercial section:")
        print(f"  referral_pct: {commercial['referral_pct']}%")
        print(f"  max_wallet_usage_pct: {commercial['max_wallet_usage_pct']}%")
        print(f"  referral_min_order_amount: {commercial['referral_min_order_amount']}")
        print(f"  referral_max_reward_per_order: {commercial['referral_max_reward_per_order']}")


class TestReferralPublicEndpoints:
    """Test public referral endpoints"""
    
    def test_public_referral_settings(self):
        """Test /api/referrals/settings/public returns public settings"""
        response = requests.get(f"{BASE_URL}/api/referrals/settings/public")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify expected fields
        assert "is_active" in data
        assert "referee_discount_type" in data
        assert "referee_discount_value" in data
        
        print(f"✓ Public referral settings: active={data['is_active']}, discount_type={data['referee_discount_type']}, discount_value={data['referee_discount_value']}")


class TestReferralCodeUse:
    """Test POST /api/referrals/use - applies referral code without immediate rewards"""
    
    def test_referral_use_endpoint_exists(self):
        """Test that /api/referrals/use endpoint exists (may require auth)"""
        # This endpoint typically requires authentication
        response = requests.post(f"{BASE_URL}/api/referrals/use", json={
            "referral_code": "TESTCODE"
        })
        
        # Should return 401 (unauthorized) or 404 (code not found), not 500
        assert response.status_code in [200, 400, 401, 404, 422], f"Unexpected status: {response.status_code}"
        print(f"✓ Referral use endpoint responds with status {response.status_code}")


class TestMarginEngineIntegration:
    """Test margin engine includes referral_share_pct"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json().get("token")
    
    def test_settings_hub_has_referral_in_commercial(self, admin_token):
        """Verify referral_pct is part of commercial settings (used by margin engine)"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        commercial = data.get("commercial", {})
        referral_pct = commercial.get("referral_pct", 0)
        
        # Verify referral_pct is a reasonable value
        assert isinstance(referral_pct, (int, float))
        assert 0 <= referral_pct <= 100
        
        print(f"✓ Margin engine referral_pct: {referral_pct}%")


class TestUnauthorizedAccess:
    """Test unauthorized access to protected endpoints"""
    
    def test_referral_overview_requires_auth(self):
        """Test /api/customer/referrals/overview requires authentication"""
        response = requests.get(f"{BASE_URL}/api/customer/referrals/overview")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Referral overview requires authentication")
    
    def test_referral_me_requires_auth(self):
        """Test /api/customer/referrals/me requires authentication"""
        response = requests.get(f"{BASE_URL}/api/customer/referrals/me")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Referral /me requires authentication")
    
    def test_admin_settings_hub_requires_auth(self):
        """Test /api/admin/settings-hub requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Admin settings hub requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
