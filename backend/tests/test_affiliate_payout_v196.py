"""
Phase 44A: Affiliate Payout Foundation Tests
Tests wallet, payout accounts CRUD, payout history, payout request, and admin settings hub payouts section.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
PARTNER_EMAIL = "demo.partner@konekt.com"
PARTNER_PASSWORD = "Partner123!"
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


@pytest.fixture(scope="module")
def partner_token():
    """Get partner auth token"""
    response = requests.post(f"{BASE_URL}/api/partner-auth/login", json={
        "email": PARTNER_EMAIL,
        "password": PARTNER_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    pytest.skip(f"Partner login failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")


@pytest.fixture
def partner_headers(partner_token):
    return {"Authorization": f"Bearer {partner_token}", "Content-Type": "application/json"}


@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


class TestAffiliateWallet:
    """Test GET /api/affiliate/wallet endpoint"""
    
    def test_wallet_returns_all_required_fields(self, partner_headers):
        """Wallet endpoint returns pending, available, paid_out, pending_withdrawal, minimum_payout, payout_cycle, payout_methods, can_withdraw"""
        response = requests.get(f"{BASE_URL}/api/affiliate/wallet", headers=partner_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Check all required fields exist
        required_fields = ["pending", "available", "paid_out", "pending_withdrawal", "minimum_payout", "payout_cycle", "payout_methods", "can_withdraw"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        # Validate types
        assert isinstance(data["pending"], (int, float)), "pending should be numeric"
        assert isinstance(data["available"], (int, float)), "available should be numeric"
        assert isinstance(data["paid_out"], (int, float)), "paid_out should be numeric"
        assert isinstance(data["pending_withdrawal"], (int, float)), "pending_withdrawal should be numeric"
        assert isinstance(data["minimum_payout"], (int, float)), "minimum_payout should be numeric"
        assert isinstance(data["payout_cycle"], str), "payout_cycle should be string"
        assert isinstance(data["payout_methods"], list), "payout_methods should be list"
        assert isinstance(data["can_withdraw"], bool), "can_withdraw should be boolean"
        
        print(f"Wallet data: pending={data['pending']}, available={data['available']}, paid_out={data['paid_out']}, min_payout={data['minimum_payout']}, can_withdraw={data['can_withdraw']}")


class TestPayoutAccounts:
    """Test payout accounts CRUD endpoints"""
    
    def test_list_payout_accounts(self, partner_headers):
        """GET /api/affiliate/payout-accounts returns accounts array"""
        response = requests.get(f"{BASE_URL}/api/affiliate/payout-accounts", headers=partner_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "accounts" in data, "Response should have 'accounts' field"
        assert isinstance(data["accounts"], list), "accounts should be a list"
        print(f"Found {len(data['accounts'])} payout accounts")
    
    def test_create_mobile_money_account(self, partner_headers):
        """POST /api/affiliate/payout-accounts with method=mobile_money creates mobile money account"""
        payload = {
            "method": "mobile_money",
            "provider": "M-Pesa",
            "account_name": "TEST_Mobile Account",
            "phone_number": "+255700000001",
            "is_default": False
        }
        response = requests.post(f"{BASE_URL}/api/affiliate/payout-accounts", json=payload, headers=partner_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True, "Response should have ok=True"
        assert "account" in data, "Response should have 'account' field"
        
        account = data["account"]
        assert account["method"] == "mobile_money"
        assert account["provider"] == "M-Pesa"
        assert account["phone_number"] == "+255700000001"
        assert "id" in account, "Account should have an id"
        
        # Store for cleanup
        self.__class__.mobile_account_id = account["id"]
        print(f"Created mobile money account: {account['id']}")
    
    def test_create_bank_transfer_account(self, partner_headers):
        """POST /api/affiliate/payout-accounts with method=bank_transfer creates bank account"""
        payload = {
            "method": "bank_transfer",
            "bank_name": "TEST_CRDB Bank",
            "account_name": "TEST_Bank Account",
            "account_number": "1234567890",
            "branch_name": "Main Branch",
            "swift_code": "CORUTZTZ",
            "is_default": False
        }
        response = requests.post(f"{BASE_URL}/api/affiliate/payout-accounts", json=payload, headers=partner_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True, "Response should have ok=True"
        assert "account" in data, "Response should have 'account' field"
        
        account = data["account"]
        assert account["method"] == "bank_transfer"
        assert account["bank_name"] == "TEST_CRDB Bank"
        assert account["account_number"] == "1234567890"
        assert "id" in account, "Account should have an id"
        
        # Store for cleanup
        self.__class__.bank_account_id = account["id"]
        print(f"Created bank transfer account: {account['id']}")
    
    def test_delete_payout_account(self, partner_headers):
        """DELETE /api/affiliate/payout-accounts/{id} deletes account"""
        # First create an account to delete
        payload = {
            "method": "mobile_money",
            "provider": "Tigo Pesa",
            "account_name": "TEST_Delete Account",
            "phone_number": "+255700000002",
            "is_default": False
        }
        create_response = requests.post(f"{BASE_URL}/api/affiliate/payout-accounts", json=payload, headers=partner_headers)
        assert create_response.status_code == 200
        account_id = create_response.json()["account"]["id"]
        
        # Now delete it
        delete_response = requests.delete(f"{BASE_URL}/api/affiliate/payout-accounts/{account_id}", headers=partner_headers)
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}: {delete_response.text}"
        
        data = delete_response.json()
        assert data.get("ok") == True, "Response should have ok=True"
        print(f"Deleted payout account: {account_id}")
        
        # Verify it's gone
        list_response = requests.get(f"{BASE_URL}/api/affiliate/payout-accounts", headers=partner_headers)
        accounts = list_response.json().get("accounts", [])
        account_ids = [a["id"] for a in accounts]
        assert account_id not in account_ids, "Deleted account should not appear in list"
    
    def test_delete_nonexistent_account_returns_404(self, partner_headers):
        """DELETE /api/affiliate/payout-accounts/{id} returns 404 for nonexistent account"""
        response = requests.delete(f"{BASE_URL}/api/affiliate/payout-accounts/nonexistent-id-12345", headers=partner_headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestPayoutHistory:
    """Test GET /api/affiliate/payout-history endpoint"""
    
    def test_payout_history_returns_payouts_array(self, partner_headers):
        """GET /api/affiliate/payout-history returns payouts array"""
        response = requests.get(f"{BASE_URL}/api/affiliate/payout-history", headers=partner_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "payouts" in data, "Response should have 'payouts' field"
        assert isinstance(data["payouts"], list), "payouts should be a list"
        print(f"Found {len(data['payouts'])} payout history records")


class TestPayoutRequest:
    """Test POST /api/affiliate/me/payout-request endpoint"""
    
    def test_payout_request_requires_affiliate_profile(self, partner_headers):
        """POST /api/affiliate/me/payout-request returns 404 if no affiliate profile exists"""
        # Partner user without affiliate profile should get 404
        payload = {
            "amount": 1000,
            "payout_method": "mobile_money"
        }
        response = requests.post(f"{BASE_URL}/api/affiliate/me/payout-request", json=payload, headers=partner_headers)
        
        # Should fail with 404 because partner doesn't have affiliate profile
        # This is correct behavior - only affiliates can request payouts
        assert response.status_code in [400, 404], f"Expected 400 or 404, got {response.status_code}: {response.text}"
        print(f"Payout request without affiliate profile: {response.status_code} - {response.json().get('detail', '')}")
    
    def test_payout_request_invalid_amount(self, partner_headers):
        """POST /api/affiliate/me/payout-request should fail for invalid amount"""
        payload = {
            "amount": 0,
            "payout_method": "mobile_money"
        }
        response = requests.post(f"{BASE_URL}/api/affiliate/me/payout-request", json=payload, headers=partner_headers)
        # Should fail with 400 (invalid amount) or 404 (no affiliate profile)
        assert response.status_code in [400, 404], f"Expected 400 or 404 for zero amount, got {response.status_code}"


class TestAdminSettingsHubPayouts:
    """Test admin settings hub payouts section"""
    
    def test_settings_hub_returns_payouts_section(self, admin_headers):
        """GET /api/admin/settings-hub returns payouts section with required fields"""
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "payouts" in data, "Settings hub should have 'payouts' section"
        
        payouts = data["payouts"]
        required_fields = ["affiliate_minimum_payout", "sales_minimum_payout", "payout_cycle"]
        for field in required_fields:
            assert field in payouts, f"Payouts section missing field: {field}"
        
        # Validate types
        assert isinstance(payouts["affiliate_minimum_payout"], (int, float)), "affiliate_minimum_payout should be numeric"
        assert isinstance(payouts["sales_minimum_payout"], (int, float)), "sales_minimum_payout should be numeric"
        assert isinstance(payouts["payout_cycle"], str), "payout_cycle should be string"
        
        print(f"Payouts settings: affiliate_min={payouts['affiliate_minimum_payout']}, sales_min={payouts['sales_minimum_payout']}, cycle={payouts['payout_cycle']}")
    
    def test_settings_hub_save_payouts_section(self, admin_headers):
        """PUT /api/admin/settings-hub saves payouts section correctly"""
        # First get current settings
        get_response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers)
        current_settings = get_response.json()
        
        # Modify payouts section
        new_affiliate_min = 75000
        new_sales_min = 150000
        new_cycle = "bi_weekly"
        
        current_settings["payouts"]["affiliate_minimum_payout"] = new_affiliate_min
        current_settings["payouts"]["sales_minimum_payout"] = new_sales_min
        current_settings["payouts"]["payout_cycle"] = new_cycle
        
        # Save
        put_response = requests.put(f"{BASE_URL}/api/admin/settings-hub", json=current_settings, headers=admin_headers)
        assert put_response.status_code == 200, f"Expected 200, got {put_response.status_code}: {put_response.text}"
        
        # Verify by fetching again
        verify_response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers)
        verified = verify_response.json()
        
        assert verified["payouts"]["affiliate_minimum_payout"] == new_affiliate_min, "affiliate_minimum_payout not saved"
        assert verified["payouts"]["sales_minimum_payout"] == new_sales_min, "sales_minimum_payout not saved"
        assert verified["payouts"]["payout_cycle"] == new_cycle, "payout_cycle not saved"
        
        print(f"Settings saved and verified: affiliate_min={new_affiliate_min}, sales_min={new_sales_min}, cycle={new_cycle}")
        
        # Restore defaults
        current_settings["payouts"]["affiliate_minimum_payout"] = 50000
        current_settings["payouts"]["sales_minimum_payout"] = 100000
        current_settings["payouts"]["payout_cycle"] = "monthly"
        requests.put(f"{BASE_URL}/api/admin/settings-hub", json=current_settings, headers=admin_headers)


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_accounts(self, partner_headers):
        """Remove TEST_ prefixed payout accounts"""
        response = requests.get(f"{BASE_URL}/api/affiliate/payout-accounts", headers=partner_headers)
        if response.status_code == 200:
            accounts = response.json().get("accounts", [])
            for account in accounts:
                if "TEST_" in account.get("account_name", "") or "TEST_" in account.get("provider", "") or "TEST_" in account.get("bank_name", ""):
                    requests.delete(f"{BASE_URL}/api/affiliate/payout-accounts/{account['id']}", headers=partner_headers)
                    print(f"Cleaned up test account: {account['id']}")
        print("Cleanup complete")
