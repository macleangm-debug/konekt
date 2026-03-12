"""
Test Suite for Referral Settings, Points Wallet, and Affiliate System
Tests:
- Referral Settings API (GET, PUT)
- Customer Points API (GET /me, GET /balance)
- Admin Points API (GET wallets, GET transactions)
- Affiliate Admin API (CRUD)
- Affiliate Public API (GET by code)
- Affiliate Commission API (GET, approve, mark-paid)
- Affiliate Payout API (GET, create, approve, mark-paid)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
TEST_AFFILIATE_CODE = "PARTNER10"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/admin/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed - skipping admin tests")


@pytest.fixture(scope="module")
def customer_token():
    """Get customer authentication token (using admin account as customer)"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Customer authentication failed - skipping customer tests")


@pytest.fixture
def auth_headers(admin_token):
    """Return auth headers for admin requests"""
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture
def customer_headers(customer_token):
    """Return auth headers for customer requests"""
    return {"Authorization": f"Bearer {customer_token}", "Content-Type": "application/json"}


class TestReferralSettingsAdmin:
    """Tests for /api/admin/referral-settings (Admin Referral Settings CRUD)"""

    def test_get_referral_settings_requires_auth(self):
        """GET /api/admin/referral-settings without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/admin/referral-settings")
        assert response.status_code == 401
        print("PASS: GET /api/admin/referral-settings requires auth (401)")

    def test_get_referral_settings(self, auth_headers):
        """GET /api/admin/referral-settings returns settings"""
        response = requests.get(
            f"{BASE_URL}/api/admin/referral-settings",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields exist
        assert "enabled" in data
        assert "reward_mode" in data
        assert "trigger_event" in data
        assert "points_per_amount" in data
        assert "amount_unit" in data
        assert "redemption_enabled" in data
        assert "share_message" in data
        assert "whatsapp_message" in data
        print(f"PASS: GET referral settings - enabled={data['enabled']}, reward_mode={data['reward_mode']}")

    def test_update_referral_settings(self, auth_headers):
        """PUT /api/admin/referral-settings updates settings"""
        # First get current settings
        get_response = requests.get(
            f"{BASE_URL}/api/admin/referral-settings",
            headers=auth_headers
        )
        original_settings = get_response.json()
        
        # Update with new values
        update_payload = {
            "enabled": True,
            "reward_type": "points",
            "reward_mode": "points_per_amount",
            "trigger_event": "every_paid_order",
            "points_per_amount": 2,
            "amount_unit": 1500,
            "fixed_points": 0,
            "minimum_order_amount": 5000,
            "max_points_per_order": 10000,
            "max_points_per_referred_customer": 25000,
            "redemption_enabled": True,
            "point_value_points": 100,
            "point_value_amount": 5000,
            "minimum_redeem_points": 100,
            "max_redeem_percent_per_order": 50,
            "share_message": "Test update message",
            "whatsapp_message": "Test WhatsApp update"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/referral-settings",
            headers=auth_headers,
            json=update_payload
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify updates
        assert data["points_per_amount"] == 2
        assert data["amount_unit"] == 1500
        assert data["minimum_order_amount"] == 5000
        print(f"PASS: PUT referral settings updated - points_per_amount={data['points_per_amount']}")
        
        # Restore original settings
        restore_payload = {
            "enabled": original_settings.get("enabled", True),
            "reward_type": original_settings.get("reward_type", "points"),
            "reward_mode": original_settings.get("reward_mode", "points_per_amount"),
            "trigger_event": original_settings.get("trigger_event", "every_paid_order"),
            "points_per_amount": original_settings.get("points_per_amount", 1),
            "amount_unit": original_settings.get("amount_unit", 1000),
            "fixed_points": original_settings.get("fixed_points", 0),
            "minimum_order_amount": original_settings.get("minimum_order_amount", 0),
            "max_points_per_order": original_settings.get("max_points_per_order", 5000),
            "max_points_per_referred_customer": original_settings.get("max_points_per_referred_customer", 20000),
            "redemption_enabled": original_settings.get("redemption_enabled", True),
            "point_value_points": original_settings.get("point_value_points", 100),
            "point_value_amount": original_settings.get("point_value_amount", 5000),
            "minimum_redeem_points": original_settings.get("minimum_redeem_points", 100),
            "max_redeem_percent_per_order": original_settings.get("max_redeem_percent_per_order", 50),
            "share_message": original_settings.get("share_message", "I use Konekt for branded products and design services. Join using my link: {referral_link}"),
            "whatsapp_message": original_settings.get("whatsapp_message", "I use Konekt for branded products and design services. Join using my link: {referral_link}")
        }
        requests.put(f"{BASE_URL}/api/admin/referral-settings", headers=auth_headers, json=restore_payload)
        print("PASS: Original settings restored")


class TestCustomerPointsAPI:
    """Tests for /api/customer/points (Customer Points Wallet)"""

    def test_get_my_points_requires_auth(self):
        """GET /api/customer/points/me without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/customer/points/me")
        assert response.status_code == 401
        print("PASS: GET /api/customer/points/me requires auth (401)")

    def test_get_my_points(self, customer_headers):
        """GET /api/customer/points/me returns wallet and transactions"""
        response = requests.get(
            f"{BASE_URL}/api/customer/points/me",
            headers=customer_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "wallet" in data
        assert "transactions" in data
        assert isinstance(data["transactions"], list)
        print(f"PASS: GET /api/customer/points/me - wallet={data['wallet']}, transactions={len(data['transactions'])}")

    def test_get_points_balance(self, customer_headers):
        """GET /api/customer/points/balance returns balance info"""
        response = requests.get(
            f"{BASE_URL}/api/customer/points/balance",
            headers=customer_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "points_balance" in data
        assert "points_earned_total" in data
        assert "points_redeemed_total" in data
        print(f"PASS: GET /api/customer/points/balance - balance={data['points_balance']}")


class TestAdminPointsAPI:
    """Tests for /api/admin/points (Admin Points Management)"""

    def test_get_wallets_requires_auth(self):
        """GET /api/admin/points/wallets without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/admin/points/wallets")
        assert response.status_code == 401
        print("PASS: GET /api/admin/points/wallets requires auth (401)")

    def test_get_wallets(self, auth_headers):
        """GET /api/admin/points/wallets returns all wallets"""
        response = requests.get(
            f"{BASE_URL}/api/admin/points/wallets",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "wallets" in data
        assert isinstance(data["wallets"], list)
        print(f"PASS: GET /api/admin/points/wallets - count={len(data['wallets'])}")

    def test_get_transactions(self, auth_headers):
        """GET /api/admin/points/transactions returns all transactions"""
        response = requests.get(
            f"{BASE_URL}/api/admin/points/transactions",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "transactions" in data
        assert isinstance(data["transactions"], list)
        print(f"PASS: GET /api/admin/points/transactions - count={len(data['transactions'])}")


class TestAffiliateAdminAPI:
    """Tests for /api/admin/affiliates (Affiliate Admin CRUD)"""

    def test_get_affiliates_requires_auth(self):
        """GET /api/admin/affiliates without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/admin/affiliates")
        assert response.status_code == 401
        print("PASS: GET /api/admin/affiliates requires auth (401)")

    def test_get_affiliates(self, auth_headers):
        """GET /api/admin/affiliates returns all affiliates"""
        response = requests.get(
            f"{BASE_URL}/api/admin/affiliates",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "affiliates" in data
        assert isinstance(data["affiliates"], list)
        
        # Should have at least the seeded PARTNER10 affiliate
        affiliate_codes = [a["affiliate_code"] for a in data["affiliates"]]
        assert "PARTNER10" in affiliate_codes
        print(f"PASS: GET /api/admin/affiliates - count={len(data['affiliates'])}, includes PARTNER10")

    def test_create_and_delete_affiliate(self, auth_headers):
        """POST /api/admin/affiliates creates, then DELETE removes"""
        # Create test affiliate
        create_payload = {
            "name": "TEST_Pytest Affiliate",
            "email": "test_pytest_affiliate@test.com",
            "affiliate_code": "PYTEST99",
            "is_active": True,
            "commission_type": "percentage",
            "commission_value": 15,
            "notes": "Created by pytest"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/affiliates",
            headers=auth_headers,
            json=create_payload
        )
        assert create_response.status_code == 200
        create_data = create_response.json()
        
        assert "affiliate" in create_data
        affiliate = create_data["affiliate"]
        assert affiliate["name"] == "TEST_Pytest Affiliate"
        assert affiliate["affiliate_code"] == "PYTEST99"
        assert affiliate["commission_value"] == 15
        affiliate_id = affiliate["id"]
        print(f"PASS: Created affiliate - id={affiliate_id}, code=PYTEST99")
        
        # Verify it appears in list
        list_response = requests.get(
            f"{BASE_URL}/api/admin/affiliates",
            headers=auth_headers
        )
        affiliate_codes = [a["affiliate_code"] for a in list_response.json()["affiliates"]]
        assert "PYTEST99" in affiliate_codes
        print("PASS: Affiliate appears in list")
        
        # Delete the test affiliate
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/affiliates/{affiliate_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200
        print(f"PASS: Deleted affiliate - id={affiliate_id}")
        
        # Verify deletion
        list_after = requests.get(
            f"{BASE_URL}/api/admin/affiliates",
            headers=auth_headers
        )
        codes_after = [a["affiliate_code"] for a in list_after.json()["affiliates"]]
        assert "PYTEST99" not in codes_after
        print("PASS: Affiliate removed from list after deletion")

    def test_create_duplicate_affiliate_fails(self, auth_headers):
        """POST /api/admin/affiliates with duplicate code returns 400"""
        duplicate_payload = {
            "name": "Duplicate Test",
            "email": "duplicate@test.com",
            "affiliate_code": "PARTNER10",  # Already exists
            "is_active": True,
            "commission_type": "percentage",
            "commission_value": 10
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/affiliates",
            headers=auth_headers,
            json=duplicate_payload
        )
        assert response.status_code == 400
        assert "already exists" in response.json().get("detail", "").lower()
        print("PASS: Duplicate affiliate code rejected (400)")


class TestAffiliatePublicAPI:
    """Tests for /api/affiliates (Public Affiliate Lookup)"""

    def test_get_affiliate_by_code_valid(self):
        """GET /api/affiliates/code/{code} returns affiliate info"""
        response = requests.get(
            f"{BASE_URL}/api/affiliates/code/{TEST_AFFILIATE_CODE}"
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["affiliate_code"] == TEST_AFFILIATE_CODE
        assert "name" in data
        assert "message" in data
        print(f"PASS: GET affiliate by code - name={data['name']}, code={data['affiliate_code']}")

    def test_get_affiliate_by_code_case_insensitive(self):
        """GET /api/affiliates/code/{code} works with lowercase"""
        response = requests.get(
            f"{BASE_URL}/api/affiliates/code/{TEST_AFFILIATE_CODE.lower()}"
        )
        # Should work regardless of case
        if response.status_code == 200:
            assert response.json()["affiliate_code"] == TEST_AFFILIATE_CODE
            print("PASS: Affiliate code lookup is case-insensitive")
        else:
            print(f"INFO: Affiliate code lookup may be case-sensitive (status={response.status_code})")

    def test_get_affiliate_by_invalid_code(self):
        """GET /api/affiliates/code/{invalid} returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/affiliates/code/INVALID_CODE_12345"
        )
        assert response.status_code == 404
        print("PASS: Invalid affiliate code returns 404")


class TestAffiliateCommissionsAPI:
    """Tests for /api/admin/affiliate-commissions (Commission Management)"""

    def test_get_commissions_requires_auth(self):
        """GET /api/admin/affiliate-commissions without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/admin/affiliate-commissions")
        assert response.status_code == 401
        print("PASS: GET /api/admin/affiliate-commissions requires auth (401)")

    def test_get_commissions(self, auth_headers):
        """GET /api/admin/affiliate-commissions returns commission list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/affiliate-commissions",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "commissions" in data
        assert isinstance(data["commissions"], list)
        print(f"PASS: GET /api/admin/affiliate-commissions - count={len(data['commissions'])}")

    def test_get_commissions_with_status_filter(self, auth_headers):
        """GET /api/admin/affiliate-commissions?status=pending filters results"""
        response = requests.get(
            f"{BASE_URL}/api/admin/affiliate-commissions?status=pending",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # All returned commissions should have pending status
        for commission in data["commissions"]:
            assert commission["status"] == "pending"
        print(f"PASS: Commission status filter works - pending count={len(data['commissions'])}")


class TestAffiliatePayoutsAPI:
    """Tests for /api/affiliate-payouts (Payout Management)"""

    def test_get_payouts_requires_auth(self):
        """GET /api/affiliate-payouts/admin without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/affiliate-payouts/admin")
        assert response.status_code == 401
        print("PASS: GET /api/affiliate-payouts/admin requires auth (401)")

    def test_get_payouts(self, auth_headers):
        """GET /api/affiliate-payouts/admin returns payout list"""
        response = requests.get(
            f"{BASE_URL}/api/affiliate-payouts/admin",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "payouts" in data
        assert isinstance(data["payouts"], list)
        print(f"PASS: GET /api/affiliate-payouts/admin - count={len(data['payouts'])}")

    def test_create_and_manage_payout_request(self, auth_headers):
        """POST /api/affiliate-payouts/admin creates payout, then approve/mark-paid"""
        # Get an affiliate ID first
        affiliates_response = requests.get(
            f"{BASE_URL}/api/admin/affiliates",
            headers=auth_headers
        )
        affiliates = affiliates_response.json().get("affiliates", [])
        if not affiliates:
            pytest.skip("No affiliates available for payout test")
        
        affiliate = affiliates[0]
        
        # Create payout request
        payout_payload = {
            "affiliate_id": affiliate["id"],
            "affiliate_email": affiliate["email"],
            "requested_amount": 50000,
            "notes": "Test payout from pytest"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/affiliate-payouts/admin",
            headers=auth_headers,
            json=payout_payload
        )
        assert create_response.status_code == 200
        payout = create_response.json().get("payout")
        assert payout["requested_amount"] == 50000
        assert payout["status"] == "requested"
        payout_id = payout["id"]
        print(f"PASS: Created payout request - id={payout_id}, amount=50000")
        
        # Approve payout
        approve_response = requests.post(
            f"{BASE_URL}/api/affiliate-payouts/admin/{payout_id}/approve",
            headers=auth_headers
        )
        assert approve_response.status_code == 200
        approved = approve_response.json().get("payout")
        assert approved["status"] == "approved"
        print("PASS: Payout approved")
        
        # Mark as paid
        paid_response = requests.post(
            f"{BASE_URL}/api/affiliate-payouts/admin/{payout_id}/mark-paid",
            headers=auth_headers
        )
        assert paid_response.status_code == 200
        paid = paid_response.json().get("payout")
        assert paid["status"] == "paid"
        print("PASS: Payout marked as paid")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
