"""
Test Group Deal Features v304
Tests for:
1. Repeat buyer logic (same phone can join again if not pending_payment)
2. Repeat buyer blocked if pending_payment exists
3. Quantity-based closure (campaign becomes successful when target reached)
4. Overflow allowed (units can exceed target)
5. Sales campaigns endpoint includes group_deals
6. Affiliate campaigns endpoint includes group_deals
7. Group deal captions include promo code
8. Group deal captions use amount-based format (Save TZS X)
9. Creative generator returns proper group_deals structure
"""
import pytest
import requests
import os
import time
from uuid import uuid4

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
STAFF_EMAIL = "staff@konekt.co.tz"
STAFF_PASSWORD = "Staff123!"
AFFILIATE_EMAIL = "qualifier.test@example.com"
AFFILIATE_PASSWORD = "Qualifier123!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin JWT token."""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if resp.status_code == 200:
        return resp.json().get("token")
    pytest.skip(f"Admin login failed: {resp.status_code} - {resp.text}")


@pytest.fixture(scope="module")
def staff_token():
    """Get staff JWT token."""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": STAFF_EMAIL,
        "password": STAFF_PASSWORD
    })
    if resp.status_code == 200:
        return resp.json().get("token")
    pytest.skip(f"Staff login failed: {resp.status_code} - {resp.text}")


@pytest.fixture(scope="module")
def affiliate_token():
    """Get affiliate JWT token."""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": AFFILIATE_EMAIL,
        "password": AFFILIATE_PASSWORD
    })
    if resp.status_code == 200:
        return resp.json().get("token")
    pytest.skip(f"Affiliate login failed: {resp.status_code} - {resp.text}")


@pytest.fixture(scope="module")
def active_campaign_id(admin_token):
    """Get an active group deal campaign ID."""
    resp = requests.get(
        f"{BASE_URL}/api/admin/group-deals/campaigns",
        params={"status": "active"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    if resp.status_code == 200:
        campaigns = resp.json()
        if campaigns:
            return campaigns[0]["id"]
    pytest.skip("No active group deal campaigns found")


class TestGroupDealRepeatBuyer:
    """Test repeat buyer logic - same phone can join again if not pending_payment."""

    def test_join_creates_pending_payment_commitment(self, admin_token, active_campaign_id):
        """Test that joining creates a pending_payment commitment."""
        test_phone = f"+255700{uuid4().hex[:6]}"
        resp = requests.post(
            f"{BASE_URL}/api/admin/group-deals/campaigns/{active_campaign_id}/join",
            json={
                "customer_name": "Test Repeat Buyer",
                "customer_phone": test_phone,
                "customer_email": f"test_{uuid4().hex[:6]}@example.com",
                "quantity": 1
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200, f"Join failed: {resp.text}"
        data = resp.json()
        assert data["status"] == "pending_payment"
        assert "commitment_ref" in data
        print(f"✓ Join created pending_payment commitment: {data['commitment_ref']}")
        return test_phone, data["commitment_ref"]

    def test_same_phone_blocked_if_pending_payment(self, admin_token, active_campaign_id):
        """Test that same phone is blocked if they have pending_payment commitment."""
        test_phone = f"+255700{uuid4().hex[:6]}"
        
        # First join
        resp1 = requests.post(
            f"{BASE_URL}/api/admin/group-deals/campaigns/{active_campaign_id}/join",
            json={
                "customer_name": "Test Duplicate Buyer",
                "customer_phone": test_phone,
                "quantity": 1
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp1.status_code == 200
        
        # Second join with same phone - should be blocked
        resp2 = requests.post(
            f"{BASE_URL}/api/admin/group-deals/campaigns/{active_campaign_id}/join",
            json={
                "customer_name": "Test Duplicate Buyer 2",
                "customer_phone": test_phone,
                "quantity": 1
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp2.status_code == 400, f"Expected 400, got {resp2.status_code}"
        assert "pending payment" in resp2.json().get("detail", "").lower()
        print(f"✓ Same phone blocked when pending_payment exists")

    def test_repeat_buyer_allowed_after_payment_submitted(self, admin_token, active_campaign_id):
        """Test that same phone can join again after payment is submitted."""
        test_phone = f"+255700{uuid4().hex[:6]}"
        
        # First join
        resp1 = requests.post(
            f"{BASE_URL}/api/admin/group-deals/campaigns/{active_campaign_id}/join",
            json={
                "customer_name": "Test Repeat After Submit",
                "customer_phone": test_phone,
                "quantity": 1
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp1.status_code == 200
        commitment_ref = resp1.json()["commitment_ref"]
        
        # Submit payment proof
        resp_submit = requests.post(
            f"{BASE_URL}/api/public/group-deals/submit-payment",
            json={
                "commitment_ref": commitment_ref,
                "payer_name": "Test Repeat After Submit",
                "amount_paid": 50000,
                "bank_reference": "TXN-TEST-123"
            }
        )
        assert resp_submit.status_code == 200
        
        # Now same phone should be able to join again
        resp2 = requests.post(
            f"{BASE_URL}/api/admin/group-deals/campaigns/{active_campaign_id}/join",
            json={
                "customer_name": "Test Repeat After Submit 2",
                "customer_phone": test_phone,
                "quantity": 1
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp2.status_code == 200, f"Repeat join failed: {resp2.text}"
        print(f"✓ Repeat buyer allowed after payment_submitted")


class TestGroupDealQuantityClosure:
    """Test quantity-based immediate closure when target reached."""

    def test_campaign_becomes_successful_when_target_reached(self, admin_token):
        """Test that campaign status becomes 'successful' when approved units reach target."""
        # Create a campaign with low target for testing
        create_resp = requests.post(
            f"{BASE_URL}/api/admin/group-deals/campaigns",
            json={
                "product_name": f"TEST_Closure_Campaign_{uuid4().hex[:6]}",
                "vendor_cost": 40000,
                "display_target": 2,  # Low target for testing
                "discounted_price": 50000,
                "duration_days": 7,
                "original_price": 60000
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_resp.status_code == 200, f"Campaign creation failed: {create_resp.text}"
        campaign_id = create_resp.json()["id"]
        print(f"✓ Created test campaign with target=2: {campaign_id}")
        
        # Join with 2 units (to reach target)
        test_phone = f"+255700{uuid4().hex[:6]}"
        join_resp = requests.post(
            f"{BASE_URL}/api/admin/group-deals/campaigns/{campaign_id}/join",
            json={
                "customer_name": "Test Closure Buyer",
                "customer_phone": test_phone,
                "quantity": 2
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert join_resp.status_code == 200
        commitment_ref = join_resp.json()["commitment_ref"]
        
        # Submit payment
        submit_resp = requests.post(
            f"{BASE_URL}/api/public/group-deals/submit-payment",
            json={
                "commitment_ref": commitment_ref,
                "payer_name": "Test Closure Buyer",
                "amount_paid": 100000,
                "bank_reference": "TXN-CLOSURE-TEST"
            }
        )
        assert submit_resp.status_code == 200
        
        # Approve payment - this should trigger quantity closure
        approve_resp = requests.post(
            f"{BASE_URL}/api/admin/group-deals/commitments/{commitment_ref}/approve-payment",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert approve_resp.status_code == 200
        
        # Check campaign status - should be 'successful'
        campaign_resp = requests.get(
            f"{BASE_URL}/api/admin/group-deals/campaigns/{campaign_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert campaign_resp.status_code == 200
        campaign_data = campaign_resp.json()
        assert campaign_data["status"] == "successful", f"Expected 'successful', got '{campaign_data['status']}'"
        assert campaign_data["threshold_met"] == True
        print(f"✓ Campaign became 'successful' when target reached")

    def test_overflow_allowed(self, admin_token):
        """Test that units can exceed target (overflow allowed)."""
        # Create a campaign with low target
        create_resp = requests.post(
            f"{BASE_URL}/api/admin/group-deals/campaigns",
            json={
                "product_name": f"TEST_Overflow_Campaign_{uuid4().hex[:6]}",
                "vendor_cost": 40000,
                "display_target": 2,
                "discounted_price": 50000,
                "duration_days": 7,
                "original_price": 60000
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_resp.status_code == 200
        campaign_id = create_resp.json()["id"]
        
        # Join with 3 units (exceeds target of 2)
        test_phone = f"+255700{uuid4().hex[:6]}"
        join_resp = requests.post(
            f"{BASE_URL}/api/admin/group-deals/campaigns/{campaign_id}/join",
            json={
                "customer_name": "Test Overflow Buyer",
                "customer_phone": test_phone,
                "quantity": 3  # Exceeds target of 2
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert join_resp.status_code == 200, f"Overflow join failed: {join_resp.text}"
        print(f"✓ Overflow allowed - joined with 3 units when target is 2")


class TestSalesCampaignsEndpoint:
    """Test that sales campaigns endpoint includes group_deals."""

    def test_sales_campaigns_returns_group_deals(self, staff_token):
        """Test GET /api/sales-promo/campaigns returns group_deals array."""
        resp = requests.get(
            f"{BASE_URL}/api/sales-promo/campaigns",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        assert resp.status_code == 200, f"Sales campaigns failed: {resp.text}"
        data = resp.json()
        
        # Check structure
        assert "campaigns" in data, "Missing 'campaigns' key"
        assert "group_deals" in data, "Missing 'group_deals' key"
        assert "promo_code" in data, "Missing 'promo_code' key"
        assert "has_code" in data, "Missing 'has_code' key"
        
        print(f"✓ Sales campaigns endpoint returns group_deals: {len(data.get('group_deals', []))} deals")
        
        # If has_code is true, verify group_deals have promo_code
        if data.get("has_code") and data.get("group_deals"):
            for deal in data["group_deals"]:
                assert "promo_code" in deal, "Group deal missing promo_code"
                assert "caption" in deal, "Group deal missing caption"
                assert "product_link" in deal, "Group deal missing product_link"
            print(f"✓ Group deals have promo_code injected")


class TestAffiliateCampaignsEndpoint:
    """Test that affiliate campaigns endpoint includes group_deals."""

    def test_affiliate_campaigns_returns_group_deals(self, affiliate_token):
        """Test GET /api/affiliate-program/campaigns returns group_deals array."""
        resp = requests.get(
            f"{BASE_URL}/api/affiliate-program/campaigns",
            headers={"Authorization": f"Bearer {affiliate_token}"}
        )
        assert resp.status_code == 200, f"Affiliate campaigns failed: {resp.text}"
        data = resp.json()
        
        # Check structure
        assert "campaigns" in data, "Missing 'campaigns' key"
        assert "group_deals" in data, "Missing 'group_deals' key"
        assert "promo_code" in data, "Missing 'promo_code' key"
        
        print(f"✓ Affiliate campaigns endpoint returns group_deals: {len(data.get('group_deals', []))} deals")
        
        # Verify group_deals structure
        if data.get("group_deals"):
            for deal in data["group_deals"]:
                assert "id" in deal, "Group deal missing id"
                assert "name" in deal, "Group deal missing name"
                assert "caption" in deal, "Group deal missing caption"
                assert "product_link" in deal, "Group deal missing product_link"
                assert "savings" in deal, "Group deal missing savings"
                assert "type" in deal and deal["type"] == "group_deal", "Group deal missing type"
            print(f"✓ Group deals have proper structure")


class TestGroupDealCaptions:
    """Test group deal captions include promo code and use amount-based format."""

    def test_caption_includes_promo_code(self, staff_token):
        """Test that group deal captions include the promo code."""
        resp = requests.get(
            f"{BASE_URL}/api/sales-promo/campaigns",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        if data.get("has_code") and data.get("group_deals"):
            promo_code = data.get("promo_code", "")
            for deal in data["group_deals"]:
                caption = deal.get("caption", "")
                if promo_code:
                    assert promo_code in caption, f"Promo code '{promo_code}' not in caption"
            print(f"✓ Group deal captions include promo code: {promo_code}")
        else:
            print("⚠ No promo code or group deals to test caption")

    def test_caption_uses_amount_format(self, staff_token):
        """Test that captions use amount-based format (Save TZS X, not percentage)."""
        resp = requests.get(
            f"{BASE_URL}/api/sales-promo/campaigns",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        if data.get("group_deals"):
            for deal in data["group_deals"]:
                caption = deal.get("caption", "")
                savings = deal.get("savings", 0)
                if savings > 0:
                    # Should contain "Save TZS" not percentage
                    assert "TZS" in caption, f"Caption should use TZS amount format"
                    assert "%" not in caption.split("Save")[1] if "Save" in caption else True, "Caption should not use percentage"
            print(f"✓ Group deal captions use amount-based format (Save TZS X)")
        else:
            print("⚠ No group deals to test caption format")


class TestCreativeGeneratorService:
    """Test creative generator returns proper group_deals structure."""

    def test_group_deals_structure(self, staff_token):
        """Test that group_deals have proper structure from creative generator."""
        resp = requests.get(
            f"{BASE_URL}/api/sales-promo/campaigns",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        if data.get("group_deals"):
            for deal in data["group_deals"]:
                # Required fields
                assert "id" in deal, "Missing id"
                assert "name" in deal, "Missing name"
                assert "selling_price" in deal, "Missing selling_price"
                assert "original_price" in deal, "Missing original_price"
                assert "savings" in deal, "Missing savings"
                assert "savings_text" in deal, "Missing savings_text"
                assert "product_link" in deal, "Missing product_link"
                assert "caption" in deal, "Missing caption"
                assert "type" in deal, "Missing type"
                
                # Verify savings_text format
                if deal["savings"] > 0:
                    assert "TZS" in deal["savings_text"], "savings_text should contain TZS"
                
            print(f"✓ Creative generator returns proper group_deals structure")
        else:
            print("⚠ No group deals to verify structure")


class TestPublicGroupDealEndpoints:
    """Test public group deal endpoints."""

    def test_public_list_deals(self):
        """Test public listing of active deals."""
        resp = requests.get(f"{BASE_URL}/api/public/group-deals")
        assert resp.status_code == 200
        deals = resp.json()
        assert isinstance(deals, list)
        print(f"✓ Public group deals endpoint returns {len(deals)} active deals")

    def test_public_featured_deals(self):
        """Test public featured deals endpoint."""
        resp = requests.get(f"{BASE_URL}/api/public/group-deals/featured")
        assert resp.status_code == 200
        deals = resp.json()
        assert isinstance(deals, list)
        assert len(deals) <= 6, "Featured should return max 6 deals"
        print(f"✓ Public featured deals endpoint returns {len(deals)} deals")

    def test_public_deal_detail(self, active_campaign_id):
        """Test public deal detail endpoint."""
        resp = requests.get(f"{BASE_URL}/api/public/group-deals/{active_campaign_id}")
        assert resp.status_code == 200
        deal = resp.json()
        
        # Should not expose internal fields
        assert "vendor_cost" not in deal, "vendor_cost should be hidden"
        assert "margin_per_unit" not in deal, "margin_per_unit should be hidden"
        assert "margin_pct" not in deal, "margin_pct should be hidden"
        
        # Should have public fields
        assert "product_name" in deal
        assert "discounted_price" in deal
        assert "display_target" in deal
        assert "current_committed" in deal
        assert "buyer_count" in deal
        
        print(f"✓ Public deal detail hides internal fields, shows public fields")


class TestPaymentFlow:
    """Test payment submission and approval flow."""

    def test_submit_payment_proof(self, admin_token, active_campaign_id):
        """Test submitting payment proof for a commitment."""
        # Create commitment
        test_phone = f"+255700{uuid4().hex[:6]}"
        join_resp = requests.post(
            f"{BASE_URL}/api/admin/group-deals/campaigns/{active_campaign_id}/join",
            json={
                "customer_name": "Test Payment Flow",
                "customer_phone": test_phone,
                "quantity": 1
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert join_resp.status_code == 200
        commitment_ref = join_resp.json()["commitment_ref"]
        
        # Submit payment proof
        submit_resp = requests.post(
            f"{BASE_URL}/api/public/group-deals/submit-payment",
            json={
                "commitment_ref": commitment_ref,
                "payer_name": "Test Payment Flow",
                "amount_paid": 50000,
                "bank_reference": f"TXN-{uuid4().hex[:8]}",
                "payment_method": "bank_transfer",
                "payment_date": "2026-01-15"
            }
        )
        assert submit_resp.status_code == 200
        data = submit_resp.json()
        assert data["status"] == "payment_submitted"
        print(f"✓ Payment proof submitted successfully")

    def test_list_pending_payments(self, admin_token):
        """Test listing pending payments for admin approval."""
        resp = requests.get(
            f"{BASE_URL}/api/admin/group-deals/commitments/pending-payments",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200
        payments = resp.json()
        assert isinstance(payments, list)
        print(f"✓ Pending payments list returns {len(payments)} items")


class TestTrackGroupDeal:
    """Test public tracking of group deal commitments."""

    def test_track_by_commitment_ref(self, admin_token, active_campaign_id):
        """Test tracking commitment by reference."""
        # Create commitment
        test_phone = f"+255700{uuid4().hex[:6]}"
        join_resp = requests.post(
            f"{BASE_URL}/api/admin/group-deals/campaigns/{active_campaign_id}/join",
            json={
                "customer_name": "Test Track",
                "customer_phone": test_phone,
                "quantity": 1
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert join_resp.status_code == 200
        commitment_ref = join_resp.json()["commitment_ref"]
        
        # Track by ref
        track_resp = requests.get(
            f"{BASE_URL}/api/public/group-deals/track",
            params={"ref": commitment_ref}
        )
        assert track_resp.status_code == 200
        results = track_resp.json()
        assert len(results) == 1
        assert results[0]["commitment_ref"] == commitment_ref
        print(f"✓ Track by commitment ref works")

    def test_track_by_phone(self, admin_token, active_campaign_id):
        """Test tracking commitments by phone number."""
        test_phone = f"+255700{uuid4().hex[:6]}"
        
        # Create commitment
        join_resp = requests.post(
            f"{BASE_URL}/api/admin/group-deals/campaigns/{active_campaign_id}/join",
            json={
                "customer_name": "Test Track Phone",
                "customer_phone": test_phone,
                "quantity": 1
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert join_resp.status_code == 200
        
        # Track by phone
        track_resp = requests.get(
            f"{BASE_URL}/api/public/group-deals/track",
            params={"phone": test_phone}
        )
        assert track_resp.status_code == 200
        results = track_resp.json()
        assert len(results) >= 1
        print(f"✓ Track by phone works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
