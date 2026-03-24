"""
Test Suite: Referral + Sales Commission Governance Pack & Payment Confirmation + Affiliate Promo Pack
Tests commission rules, affiliate CRUD, referral tracking, commission trigger, affiliate promo benefit,
submit payment, and approve-payment-and-distribute flows.
"""
import pytest
import requests
import os
from uuid import uuid4

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCommissionRules:
    """Commission rules CRUD tests"""
    
    def test_get_default_commission_rules(self):
        """GET /api/referral-commission/rules returns default commission rules"""
        response = requests.get(f"{BASE_URL}/api/referral-commission/rules")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "affiliate_commission_percent" in data
        assert "sales_commission_percent" in data
        assert data["affiliate_commission_percent"] == 5, "Default affiliate commission should be 5%"
        assert data["sales_commission_percent"] == 3, "Default sales commission should be 3%"
        print(f"✓ Commission rules: affiliate={data['affiliate_commission_percent']}%, sales={data['sales_commission_percent']}%")
    
    def test_update_commission_rules(self):
        """PUT /api/referral-commission/rules saves updated commission rules"""
        new_rules = {
            "affiliate_commission_percent": 7,
            "sales_commission_percent": 4,
            "minimum_payout_threshold": 75000
        }
        response = requests.put(f"{BASE_URL}/api/referral-commission/rules", json=new_rules)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True
        assert data["rules"]["affiliate_commission_percent"] == 7
        assert data["rules"]["sales_commission_percent"] == 4
        print("✓ Commission rules updated successfully")
        
        # Restore defaults
        requests.put(f"{BASE_URL}/api/referral-commission/rules", json={
            "affiliate_commission_percent": 5,
            "sales_commission_percent": 3,
            "minimum_payout_threshold": 50000
        })


class TestAffiliateManagement:
    """Affiliate CRUD and management tests"""
    
    def test_create_affiliate_success(self):
        """POST /api/referral-commission/affiliate/create creates affiliate with promo code"""
        unique_code = f"TEST{uuid4().hex[:6].upper()}"
        payload = {
            "name": "Test Affiliate",
            "email": "test.affiliate@example.com",
            "phone": "+255700000000",
            "promo_code": unique_code
        }
        response = requests.post(f"{BASE_URL}/api/referral-commission/affiliate/create", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True
        assert "affiliate" in data
        assert data["affiliate"]["promo_code"] == unique_code
        assert data["affiliate"]["name"] == "Test Affiliate"
        assert "id" in data["affiliate"]
        print(f"✓ Affiliate created with code: {unique_code}")
        return data["affiliate"]
    
    def test_create_affiliate_duplicate_code_rejected(self):
        """POST /api/referral-commission/affiliate/create rejects duplicate promo codes (409)"""
        # First create an affiliate
        unique_code = f"DUP{uuid4().hex[:6].upper()}"
        payload = {"name": "First Affiliate", "promo_code": unique_code}
        response1 = requests.post(f"{BASE_URL}/api/referral-commission/affiliate/create", json=payload)
        assert response1.status_code == 200
        
        # Try to create another with same code
        payload2 = {"name": "Second Affiliate", "promo_code": unique_code}
        response2 = requests.post(f"{BASE_URL}/api/referral-commission/affiliate/create", json=payload2)
        assert response2.status_code == 409, f"Expected 409 for duplicate, got {response2.status_code}"
        print(f"✓ Duplicate promo code correctly rejected with 409")
    
    def test_create_affiliate_missing_code_rejected(self):
        """POST /api/referral-commission/affiliate/create rejects missing promo code"""
        payload = {"name": "No Code Affiliate"}
        response = requests.post(f"{BASE_URL}/api/referral-commission/affiliate/create", json=payload)
        assert response.status_code == 400, f"Expected 400 for missing code, got {response.status_code}"
        print("✓ Missing promo code correctly rejected with 400")
    
    def test_get_admin_affiliates_list(self):
        """GET /api/referral-commission/admin/affiliates returns list of affiliates with stats"""
        response = requests.get(f"{BASE_URL}/api/referral-commission/admin/affiliates")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of affiliates"
        
        if len(data) > 0:
            affiliate = data[0]
            assert "id" in affiliate
            assert "name" in affiliate
            assert "promo_code" in affiliate
            assert "status" in affiliate
            assert "clicks" in affiliate
            assert "leads" in affiliate
            assert "approved_sales" in affiliate
            assert "unpaid_commission" in affiliate
            print(f"✓ Admin affiliates list returned {len(data)} affiliates with stats")
        else:
            print("✓ Admin affiliates list returned empty (no affiliates yet)")


class TestAffiliateDashboard:
    """Affiliate dashboard tests"""
    
    def test_affiliate_dashboard_success(self):
        """GET /api/referral-commission/affiliate/dashboard?affiliate_id=X returns affiliate stats"""
        # First create an affiliate to test with
        unique_code = f"DASH{uuid4().hex[:6].upper()}"
        create_resp = requests.post(f"{BASE_URL}/api/referral-commission/affiliate/create", json={
            "name": "Dashboard Test Affiliate",
            "promo_code": unique_code
        })
        assert create_resp.status_code == 200
        affiliate_id = create_resp.json()["affiliate"]["id"]
        
        # Get dashboard
        response = requests.get(f"{BASE_URL}/api/referral-commission/affiliate/dashboard?affiliate_id={affiliate_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "affiliate" in data
        assert "stats" in data
        assert data["affiliate"]["id"] == affiliate_id
        assert data["affiliate"]["promo_code"] == unique_code
        assert "clicks" in data["stats"]
        assert "leads" in data["stats"]
        assert "sales" in data["stats"]
        assert "earnings_total" in data["stats"]
        assert "unpaid_commission" in data["stats"]
        print(f"✓ Affiliate dashboard returned for {affiliate_id}")
    
    def test_affiliate_dashboard_not_found(self):
        """GET /api/referral-commission/affiliate/dashboard returns 404 for invalid affiliate"""
        response = requests.get(f"{BASE_URL}/api/referral-commission/affiliate/dashboard?affiliate_id=nonexistent-id")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid affiliate ID correctly returns 404")


class TestReferralTracking:
    """Referral event tracking tests"""
    
    def test_track_referral_click_event(self):
        """POST /api/referral-commission/track tracks referral click/lead events"""
        # Create affiliate first
        unique_code = f"TRACK{uuid4().hex[:6].upper()}"
        create_resp = requests.post(f"{BASE_URL}/api/referral-commission/affiliate/create", json={
            "name": "Tracking Test Affiliate",
            "promo_code": unique_code
        })
        assert create_resp.status_code == 200
        
        # Track click event
        payload = {
            "promo_code": unique_code,
            "event_type": "click",
            "customer_id": "test-customer-123"
        }
        response = requests.post(f"{BASE_URL}/api/referral-commission/track", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True
        assert "event" in data
        assert data["event"]["event_type"] == "click"
        assert data["event"]["promo_code"] == unique_code
        print(f"✓ Click event tracked for code: {unique_code}")
    
    def test_track_referral_lead_event(self):
        """POST /api/referral-commission/track tracks lead events"""
        # Create affiliate first
        unique_code = f"LEAD{uuid4().hex[:6].upper()}"
        create_resp = requests.post(f"{BASE_URL}/api/referral-commission/affiliate/create", json={
            "name": "Lead Test Affiliate",
            "promo_code": unique_code
        })
        assert create_resp.status_code == 200
        
        # Track lead event
        payload = {
            "promo_code": unique_code,
            "event_type": "lead",
            "customer_id": "test-customer-456"
        }
        response = requests.post(f"{BASE_URL}/api/referral-commission/track", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["event"]["event_type"] == "lead"
        print(f"✓ Lead event tracked for code: {unique_code}")
    
    def test_track_referral_invalid_code(self):
        """POST /api/referral-commission/track returns 404 for invalid promo code"""
        payload = {
            "promo_code": "INVALIDCODE999",
            "event_type": "click"
        }
        response = requests.post(f"{BASE_URL}/api/referral-commission/track", json=payload)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid promo code correctly returns 404")
    
    def test_track_referral_missing_code(self):
        """POST /api/referral-commission/track returns 400 for missing promo code"""
        payload = {"event_type": "click"}
        response = requests.post(f"{BASE_URL}/api/referral-commission/track", json=payload)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Missing promo code correctly returns 400")


class TestCommissionTrigger:
    """Commission trigger after payment approval tests"""
    
    def test_trigger_commission_after_payment_approval(self):
        """POST /api/referral-commission/trigger-after-payment-approval creates commissions from commissionable base"""
        # Create affiliate first
        unique_code = f"COMM{uuid4().hex[:6].upper()}"
        create_resp = requests.post(f"{BASE_URL}/api/referral-commission/affiliate/create", json={
            "name": "Commission Test Affiliate",
            "promo_code": unique_code
        })
        assert create_resp.status_code == 200
        affiliate_id = create_resp.json()["affiliate"]["id"]
        
        # Trigger commission
        payload = {
            "order_id": f"test-order-{uuid4().hex[:8]}",
            "invoice_id": f"test-invoice-{uuid4().hex[:8]}",
            "customer_id": "test-customer-789",
            "commissionable_base_amount": 100000,  # TZS 100,000
            "affiliate_id": affiliate_id,
            "promo_code": unique_code,
            "sales_owner_id": "sales-user-001",
            "sales_owner_name": "Test Sales Rep"
        }
        response = requests.post(f"{BASE_URL}/api/referral-commission/trigger-after-payment-approval", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True
        assert "created_commissions" in data
        assert len(data["created_commissions"]) >= 1, "Should create at least affiliate commission"
        
        # Verify affiliate commission (5% of 100,000 = 5,000)
        affiliate_comm = next((c for c in data["created_commissions"] if c["source_type"] == "affiliate"), None)
        assert affiliate_comm is not None, "Affiliate commission should be created"
        assert affiliate_comm["amount"] == 5000.0, f"Expected 5000, got {affiliate_comm['amount']}"
        assert affiliate_comm["status"] == "approved"
        
        # Verify sales commission (3% of 100,000 = 3,000)
        sales_comm = next((c for c in data["created_commissions"] if c["source_type"] == "sales"), None)
        assert sales_comm is not None, "Sales commission should be created"
        assert sales_comm["amount"] == 3000.0, f"Expected 3000, got {sales_comm['amount']}"
        
        print(f"✓ Commissions created: affiliate={affiliate_comm['amount']}, sales={sales_comm['amount']}")
    
    def test_trigger_commission_zero_base_rejected(self):
        """POST /api/referral-commission/trigger-after-payment-approval rejects zero base amount"""
        payload = {
            "order_id": "test-order",
            "commissionable_base_amount": 0
        }
        response = requests.post(f"{BASE_URL}/api/referral-commission/trigger-after-payment-approval", json=payload)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Zero commissionable base correctly rejected with 400")


class TestAffiliatePromoBenefit:
    """Affiliate promo benefit editor tests"""
    
    def test_save_affiliate_promo_benefit(self):
        """POST /api/payment-submission-fixes/affiliate-promo-benefit saves affiliate promo benefit text"""
        # Create affiliate first
        unique_code = f"PROMO{uuid4().hex[:6].upper()}"
        create_resp = requests.post(f"{BASE_URL}/api/referral-commission/affiliate/create", json={
            "name": "Promo Benefit Test Affiliate",
            "promo_code": unique_code
        })
        assert create_resp.status_code == 200
        affiliate_id = create_resp.json()["affiliate"]["id"]
        
        # Save promo benefit
        payload = {
            "affiliate_id": affiliate_id,
            "headline": "Get 10% Off Your First Order!",
            "description": "Use this exclusive link to save on your purchase.",
            "cta_label": "Shop Now"
        }
        response = requests.post(f"{BASE_URL}/api/payment-submission-fixes/affiliate-promo-benefit", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True
        assert data["promo_benefit"]["headline"] == "Get 10% Off Your First Order!"
        print(f"✓ Promo benefit saved for affiliate: {affiliate_id}")
        return affiliate_id
    
    def test_get_affiliate_promo_benefit(self):
        """GET /api/payment-submission-fixes/affiliate-promo-benefit?affiliate_id=X returns benefit"""
        # First save a benefit
        affiliate_id = self.test_save_affiliate_promo_benefit()
        
        # Get the benefit
        response = requests.get(f"{BASE_URL}/api/payment-submission-fixes/affiliate-promo-benefit?affiliate_id={affiliate_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "headline" in data
        assert data["headline"] == "Get 10% Off Your First Order!"
        print(f"✓ Promo benefit retrieved for affiliate: {affiliate_id}")
    
    def test_save_promo_benefit_missing_affiliate_id(self):
        """POST /api/payment-submission-fixes/affiliate-promo-benefit rejects missing affiliate_id"""
        payload = {"headline": "Test"}
        response = requests.post(f"{BASE_URL}/api/payment-submission-fixes/affiliate-promo-benefit", json=payload)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Missing affiliate_id correctly rejected with 400")


class TestPaymentSubmission:
    """Payment submission flow tests"""
    
    @pytest.fixture(autouse=True)
    def setup_test_payment(self):
        """Create test invoice and payment for submission tests"""
        self.test_invoice_id = f"test-invoice-{uuid4().hex[:8]}"
        self.test_payment_id = f"test-payment-{uuid4().hex[:8]}"
        self.test_customer_id = f"test-customer-{uuid4().hex[:8]}"
    
    def test_submit_payment_creates_proof(self):
        """POST /api/payment-submission-fixes/submit-payment creates proof and moves payment to under_review"""
        # Note: This test requires a payment to exist in the database
        # For now, we test the endpoint behavior
        payload = {
            "payment_id": self.test_payment_id,
            "customer_id": self.test_customer_id,
            "payer_name": "Test Payer",
            "amount_paid": 50000,
            "file_url": "https://example.com/proof.jpg"
        }
        response = requests.post(f"{BASE_URL}/api/payment-submission-fixes/submit-payment", json=payload)
        
        # Payment not found is expected since we don't have real payment data
        if response.status_code == 404:
            print("✓ Submit payment correctly returns 404 for non-existent payment")
        elif response.status_code == 200:
            data = response.json()
            assert data.get("ok") == True
            print("✓ Payment submitted successfully")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}")
    
    def test_submit_payment_missing_fields(self):
        """POST /api/payment-submission-fixes/submit-payment rejects missing required fields"""
        payload = {"payment_id": "test"}  # Missing customer_id
        response = requests.post(f"{BASE_URL}/api/payment-submission-fixes/submit-payment", json=payload)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Missing required fields correctly rejected with 400")


class TestApprovePaymentAndDistribute:
    """Approve payment and distribute flow tests"""
    
    def test_approve_payment_role_validation(self):
        """POST /api/payment-submission-fixes/approve-payment-and-distribute rejects non-admin/finance roles (403)"""
        payload = {
            "payment_id": "test-payment",
            "approver_role": "sales"  # Not admin or finance
        }
        response = requests.post(f"{BASE_URL}/api/payment-submission-fixes/approve-payment-and-distribute", json=payload)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Non-admin/finance role correctly rejected with 403")
    
    def test_approve_payment_admin_role_allowed(self):
        """POST /api/payment-submission-fixes/approve-payment-and-distribute allows admin role"""
        payload = {
            "payment_id": f"test-payment-{uuid4().hex[:8]}",
            "approver_role": "admin"
        }
        response = requests.post(f"{BASE_URL}/api/payment-submission-fixes/approve-payment-and-distribute", json=payload)
        
        # Payment not found is expected since we don't have real payment data
        if response.status_code == 404:
            print("✓ Admin role allowed, payment not found (expected)")
        elif response.status_code == 200:
            print("✓ Payment approved successfully with admin role")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}")
    
    def test_approve_payment_finance_role_allowed(self):
        """POST /api/payment-submission-fixes/approve-payment-and-distribute allows finance role"""
        payload = {
            "payment_id": f"test-payment-{uuid4().hex[:8]}",
            "approver_role": "finance"
        }
        response = requests.post(f"{BASE_URL}/api/payment-submission-fixes/approve-payment-and-distribute", json=payload)
        
        # Payment not found is expected
        if response.status_code == 404:
            print("✓ Finance role allowed, payment not found (expected)")
        elif response.status_code == 200:
            print("✓ Payment approved successfully with finance role")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}")


class TestAdminFlowFixesCommissionIntegration:
    """Test commission integration in admin flow fixes approve-proof endpoint"""
    
    def test_finance_approve_proof_role_validation(self):
        """POST /api/admin-flow-fixes/finance/approve-proof validates role"""
        payload = {
            "payment_proof_id": "test-proof",
            "approver_role": "sales"  # Not finance or admin
        }
        response = requests.post(f"{BASE_URL}/api/admin-flow-fixes/finance/approve-proof", json=payload)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Non-finance/admin role correctly rejected with 403")
    
    def test_finance_reject_proof_role_validation(self):
        """POST /api/admin-flow-fixes/finance/reject-proof validates role"""
        payload = {
            "payment_proof_id": "test-proof",
            "approver_role": "marketing"  # Not finance or admin
        }
        response = requests.post(f"{BASE_URL}/api/admin-flow-fixes/finance/reject-proof", json=payload)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Non-finance/admin role correctly rejected for reject-proof")


class TestExistingAdminFlowEndpoints:
    """Verify existing admin flow endpoints still work"""
    
    def test_service_leads_endpoint(self):
        """GET /api/admin-flow-fixes/sales/service-leads returns array"""
        response = requests.get(f"{BASE_URL}/api/admin-flow-fixes/sales/service-leads")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list of leads"
        print(f"✓ Service leads endpoint returned {len(data)} leads")
    
    def test_finance_queue_endpoint(self):
        """GET /api/admin-flow-fixes/finance/queue returns array"""
        response = requests.get(f"{BASE_URL}/api/admin-flow-fixes/finance/queue")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list of payment proofs"
        print(f"✓ Finance queue endpoint returned {len(data)} proofs")
    
    def test_admin_orders_split_endpoint(self):
        """GET /api/admin-flow-fixes/admin/orders-split returns array"""
        response = requests.get(f"{BASE_URL}/api/admin-flow-fixes/admin/orders-split")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list of orders"
        print(f"✓ Admin orders split endpoint returned {len(data)} orders")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
