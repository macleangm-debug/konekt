"""
Test Super Admin Ecosystem & Commercial Controls Pack APIs
Tests:
- Ecosystem Dashboard APIs
- Group Markup Settings APIs
- Partner Settlement APIs
- Payment Proof APIs
- Pricing Validation APIs
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/admin/auth/login", json={
        "email": "admin@konekt.co.tz",
        "password": "KnktcKk_L-hw1wSyquvd!"
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    pytest.skip(f"Admin auth failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def authenticated_client(api_client, admin_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
    return api_client


class TestEcosystemDashboard:
    """Test Ecosystem Dashboard APIs"""
    
    def test_ecosystem_overview(self, api_client):
        """Test ecosystem overview endpoint returns all expected metrics"""
        response = api_client.get(f"{BASE_URL}/api/admin/ecosystem-dashboard/overview")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Validate response structure
        expected_fields = [
            "total_revenue", "total_orders", "total_service_requests",
            "active_partners", "active_affiliates", "active_contract_clients",
            "live_countries", "delayed_jobs", "issue_jobs", "stale_jobs",
            "pending_payment_proofs", "total_quotes", "approved_quotes",
            "quote_conversion_rate"
        ]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        # Validate data types
        assert isinstance(data["total_revenue"], (int, float))
        assert isinstance(data["total_orders"], int)
        assert isinstance(data["quote_conversion_rate"], (int, float))
        print(f"Ecosystem Overview: {data}")

    def test_partner_summary(self, api_client):
        """Test partner summary endpoint"""
        response = api_client.get(f"{BASE_URL}/api/admin/ecosystem-dashboard/partner-summary")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        
        if len(data) > 0:
            partner = data[0]
            expected_fields = ["partner_id", "partner_name", "status", "assigned", "completed", "completion_rate"]
            for field in expected_fields:
                assert field in partner, f"Missing field in partner: {field}"
        print(f"Partner Summary: {len(data)} partners returned")

    def test_affiliate_summary(self, api_client):
        """Test affiliate summary endpoint"""
        response = api_client.get(f"{BASE_URL}/api/admin/ecosystem-dashboard/affiliate-summary")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        
        if len(data) > 0:
            affiliate = data[0]
            expected_fields = ["affiliate_code", "name", "total_sales", "total_commission"]
            for field in expected_fields:
                assert field in affiliate, f"Missing field in affiliate: {field}"
        print(f"Affiliate Summary: {len(data)} affiliates returned")

    def test_country_summary(self, api_client):
        """Test country summary endpoint"""
        response = api_client.get(f"{BASE_URL}/api/admin/ecosystem-dashboard/country-summary")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        assert len(data) > 0, "Expected at least one country"
        
        country = data[0]
        expected_fields = ["country_code", "country_name", "status", "currency"]
        for field in expected_fields:
            assert field in country, f"Missing field in country: {field}"
        print(f"Country Summary: {len(data)} countries returned")

    def test_at_risk_items(self, api_client):
        """Test at-risk items endpoint"""
        response = api_client.get(f"{BASE_URL}/api/admin/ecosystem-dashboard/at-risk-items")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        expected_fields = ["delayed_jobs", "issue_jobs", "overdue_invoices", "stale_quotes"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
            assert isinstance(data[field], list), f"{field} should be a list"
        print(f"At-Risk Items: {sum(len(data[f]) for f in expected_fields)} total items")


class TestGroupMarkupSettings:
    """Test Group Markup Settings CRUD APIs"""
    
    created_setting_id = None
    
    def test_list_group_markup_settings(self, api_client):
        """Test listing all group markup settings"""
        response = api_client.get(f"{BASE_URL}/api/admin/group-markup")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"Group Markup Settings: {len(data)} settings found")

    def test_list_group_markup_with_filter(self, api_client):
        """Test listing group markup settings with country filter"""
        response = api_client.get(f"{BASE_URL}/api/admin/group-markup?country_code=TZ")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        # All returned should match filter
        for setting in data:
            assert setting.get("country_code") == "TZ", "Country filter not applied correctly"
        print(f"Filtered Group Markup Settings (TZ): {len(data)} settings found")

    def test_create_group_markup_setting(self, api_client):
        """Test creating a new group markup setting"""
        payload = {
            "product_group": "TEST_ProductGroup",
            "country_code": "TZ",
            "markup_type": "percent",
            "markup_value": 30,
            "minimum_margin_percent": 10,
            "max_affiliate_percent": 8,
            "max_promo_percent": 12,
            "max_points_percent": 5,
            "affiliate_allowed": True,
            "is_active": True
        }
        
        response = api_client.post(f"{BASE_URL}/api/admin/group-markup", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Missing id in response"
        assert data["product_group"] == "TEST_ProductGroup"
        assert data["markup_value"] == 30
        assert data["minimum_margin_percent"] == 10
        
        TestGroupMarkupSettings.created_setting_id = data["id"]
        print(f"Created Group Markup Setting: {data['id']}")

    def test_get_group_markup_setting(self, api_client):
        """Test getting a specific markup setting"""
        if not TestGroupMarkupSettings.created_setting_id:
            pytest.skip("No setting created to get")
        
        setting_id = TestGroupMarkupSettings.created_setting_id
        response = api_client.get(f"{BASE_URL}/api/admin/group-markup/{setting_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["id"] == setting_id
        assert data["product_group"] == "TEST_ProductGroup"
        print(f"Retrieved Group Markup Setting: {setting_id}")

    def test_update_group_markup_setting(self, api_client):
        """Test updating a markup setting"""
        if not TestGroupMarkupSettings.created_setting_id:
            pytest.skip("No setting created to update")
        
        setting_id = TestGroupMarkupSettings.created_setting_id
        payload = {
            "markup_value": 35,
            "minimum_margin_percent": 12
        }
        
        response = api_client.put(f"{BASE_URL}/api/admin/group-markup/{setting_id}", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["markup_value"] == 35
        assert data["minimum_margin_percent"] == 12
        
        # Verify with GET
        get_response = api_client.get(f"{BASE_URL}/api/admin/group-markup/{setting_id}")
        get_data = get_response.json()
        assert get_data["markup_value"] == 35
        print(f"Updated Group Markup Setting: {setting_id}")

    def test_delete_group_markup_setting(self, api_client):
        """Test deleting a markup setting"""
        if not TestGroupMarkupSettings.created_setting_id:
            pytest.skip("No setting created to delete")
        
        setting_id = TestGroupMarkupSettings.created_setting_id
        response = api_client.delete(f"{BASE_URL}/api/admin/group-markup/{setting_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("deleted") == True
        
        # Verify deletion with GET (should 404)
        get_response = api_client.get(f"{BASE_URL}/api/admin/group-markup/{setting_id}")
        assert get_response.status_code == 404, "Deleted setting should return 404"
        print(f"Deleted Group Markup Setting: {setting_id}")


class TestPartnerSettlements:
    """Test Partner Settlement APIs"""
    
    created_profile_partner_id = "TEST_partner_001"
    created_settlement_id = None
    test_partner_id = None
    
    def test_list_payout_profiles(self, api_client):
        """Test listing all payout profiles"""
        response = api_client.get(f"{BASE_URL}/api/admin/partner-settlements/payout-profiles")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"Payout Profiles: {len(data)} profiles found")

    def test_get_payout_profile_empty(self, api_client):
        """Test getting payout profile for new partner returns empty structure"""
        response = api_client.get(f"{BASE_URL}/api/admin/partner-settlements/payout-profiles/{TestPartnerSettlements.created_profile_partner_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["partner_id"] == TestPartnerSettlements.created_profile_partner_id
        assert data["is_verified"] == False
        print(f"Empty Payout Profile structure returned for new partner")

    def test_create_payout_profile(self, api_client):
        """Test creating/updating a payout profile"""
        payload = {
            "partner_id": TestPartnerSettlements.created_profile_partner_id,
            "account_name": "Test Partner Account",
            "bank_name": "NMB Bank",
            "bank_account_number": "1234567890",
            "bank_branch": "Dar es Salaam Branch",
            "bank_swift_code": "NMBCTZTZ",
            "mobile_money_provider": "M-Pesa",
            "mobile_money_number": "+255123456789",
            "preferred_method": "bank",
            "currency": "TZS",
            "country_code": "TZ",
            "tax_id": "TIN12345",
            "is_verified": False
        }
        
        response = api_client.post(f"{BASE_URL}/api/admin/partner-settlements/payout-profiles", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["partner_id"] == TestPartnerSettlements.created_profile_partner_id
        assert data["bank_name"] == "NMB Bank"
        assert data["bank_account_number"] == "1234567890"
        print(f"Created Payout Profile for: {data['partner_id']}")

    def test_settlement_summary(self, api_client):
        """Test getting settlement summary"""
        response = api_client.get(f"{BASE_URL}/api/admin/partner-settlements/summary")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        expected_fields = ["pending_count", "eligible_count", "approved_count", 
                          "paid_count", "held_count", "total_pending_amount", "total_paid_amount"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        print(f"Settlement Summary: {data}")

    def test_list_settlements(self, api_client):
        """Test listing settlements"""
        response = api_client.get(f"{BASE_URL}/api/admin/partner-settlements/settlements")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"Settlements: {len(data)} settlements found")

    def test_list_settlements_with_filter(self, api_client):
        """Test listing settlements with status filter"""
        response = api_client.get(f"{BASE_URL}/api/admin/partner-settlements/settlements?status=pending")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        for settlement in data:
            assert settlement.get("status") == "pending", "Status filter not applied correctly"
        print(f"Filtered Settlements (pending): {len(data)} found")


class TestPaymentProofs:
    """Test Payment Proof APIs"""
    
    created_proof_id = None
    
    def test_submit_payment_proof(self, api_client):
        """Test submitting a payment proof"""
        payload = {
            "invoice_id": "test_invoice_001",
            "customer_email": "test_customer@example.com",
            "customer_name": "Test Customer",
            "amount_paid": 500000,
            "currency": "TZS",
            "payment_date": datetime.utcnow().isoformat(),
            "bank_reference": "REF123456",
            "payment_method": "bank_transfer",
            "proof_file_url": "https://example.com/proof.pdf",
            "notes": "Payment for test invoice"
        }
        
        response = api_client.post(f"{BASE_URL}/api/payment-proofs/submit", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "submission" in data
        assert data["submission"]["customer_email"] == "test_customer@example.com"
        assert data["submission"]["status"] == "pending"
        
        TestPaymentProofs.created_proof_id = data["submission"]["id"]
        print(f"Submitted Payment Proof: {data['submission']['id']}")

    def test_list_customer_submissions(self, api_client):
        """Test listing customer's own submissions"""
        response = api_client.get(f"{BASE_URL}/api/payment-proofs/my-submissions?customer_email=test_customer@example.com")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        assert len(data) >= 1, "Should have at least one submission"
        print(f"Customer Submissions: {len(data)} found")

    def test_admin_list_payment_proofs(self, api_client):
        """Test admin listing all payment proofs"""
        response = api_client.get(f"{BASE_URL}/api/payment-proofs/admin")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"Admin Payment Proofs: {len(data)} found")

    def test_admin_list_payment_proofs_with_filter(self, api_client):
        """Test admin listing payment proofs with status filter"""
        response = api_client.get(f"{BASE_URL}/api/payment-proofs/admin?status=pending")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        for proof in data:
            assert proof.get("status") == "pending", "Status filter not applied correctly"
        print(f"Admin Pending Payment Proofs: {len(data)} found")

    def test_admin_get_payment_proof(self, api_client):
        """Test admin getting a specific payment proof"""
        if not TestPaymentProofs.created_proof_id:
            pytest.skip("No proof created to get")
        
        proof_id = TestPaymentProofs.created_proof_id
        response = api_client.get(f"{BASE_URL}/api/payment-proofs/admin/{proof_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["id"] == proof_id
        assert data["customer_email"] == "test_customer@example.com"
        print(f"Retrieved Payment Proof: {proof_id}")

    def test_admin_approve_payment_proof(self, api_client):
        """Test admin approving a payment proof"""
        if not TestPaymentProofs.created_proof_id:
            pytest.skip("No proof created to approve")
        
        proof_id = TestPaymentProofs.created_proof_id
        payload = {
            "approved_by": "admin@konekt.co.tz",
            "notes": "Payment verified and approved"
        }
        
        response = api_client.post(f"{BASE_URL}/api/payment-proofs/admin/{proof_id}/approve", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["submission"]["status"] == "approved"
        print(f"Approved Payment Proof: {proof_id}")

    def test_payment_proof_reject_flow(self, api_client):
        """Test the reject workflow for payment proofs"""
        # Create a new submission to reject
        submit_payload = {
            "invoice_id": "test_invoice_reject",
            "customer_email": "reject_test@example.com",
            "customer_name": "Reject Test",
            "amount_paid": 100000,
            "currency": "TZS",
            "payment_method": "mobile_money"
        }
        
        submit_response = api_client.post(f"{BASE_URL}/api/payment-proofs/submit", json=submit_payload)
        assert submit_response.status_code == 200
        proof_id = submit_response.json()["submission"]["id"]
        
        # Reject the proof
        reject_payload = {
            "rejected_by": "admin@konekt.co.tz",
            "reason": "Invalid payment reference"
        }
        
        response = api_client.post(f"{BASE_URL}/api/payment-proofs/admin/{proof_id}/reject", json=reject_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["submission"]["status"] == "rejected"
        assert data["submission"]["rejection_reason"] == "Invalid payment reference"
        print(f"Rejected Payment Proof: {proof_id}")


class TestPricingValidation:
    """Test Pricing Validation APIs with Margin Protection"""
    
    def test_calculate_protected_price(self, api_client):
        """Test calculating protected price with margin protection"""
        payload = {
            "partner_cost": 10000,
            "product_group": "Apparel",
            "country_code": "TZ",
            "promo_discount": 2000,
            "affiliate_commission": 1000,
            "points_discount": 500
        }
        
        response = api_client.post(f"{BASE_URL}/api/admin/pricing-validation/calculate-price", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        expected_fields = [
            "partner_cost", "base_selling_price", "promo_discount",
            "affiliate_commission", "points_discount", "final_price",
            "gross_margin", "gross_margin_percent", "final_margin",
            "final_margin_percent", "margin_safe", "was_adjusted"
        ]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        assert data["partner_cost"] == 10000
        assert data["base_selling_price"] > 10000  # Should have markup
        assert isinstance(data["margin_safe"], bool)
        print(f"Protected Price: {data}")

    def test_validate_line_item(self, api_client):
        """Test validating a line item pricing"""
        payload = {
            "name": "Custom T-Shirt",
            "partner_cost": 10000,
            "unit_price": 12500,
            "quantity": 50,
            "product_group": "Apparel",
            "country_code": "TZ"
        }
        
        response = api_client.post(f"{BASE_URL}/api/admin/pricing-validation/validate-line-item", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "margin_checked" in data
        assert "margin_safe" in data
        assert data["name"] == "Custom T-Shirt"
        print(f"Line Item Validation: margin_safe={data['margin_safe']}")

    def test_validate_line_item_below_margin(self, api_client):
        """Test validating a line item with price below minimum margin"""
        # Price very close to cost - should trigger margin warning
        payload = {
            "name": "Low Margin Item",
            "partner_cost": 10000,
            "unit_price": 10100,  # Only 1% margin
            "quantity": 10,
            "product_group": "Apparel",
            "country_code": "TZ"
        }
        
        response = api_client.post(f"{BASE_URL}/api/admin/pricing-validation/validate-line-item", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["margin_checked"] == True
        # With 1% margin and 8% minimum, should be unsafe
        assert data["margin_safe"] == False, "Low margin item should be flagged as unsafe"
        assert "suggested_price" in data and data["suggested_price"] is not None
        print(f"Low Margin Item: margin_safe={data['margin_safe']}, suggested_price={data['suggested_price']}")

    def test_max_discount_calculation(self, api_client):
        """Test calculating maximum allowed discount"""
        payload = {
            "selling_price": 15000,
            "partner_cost": 10000,
            "product_group": "Apparel",
            "country_code": "TZ"
        }
        
        response = api_client.post(f"{BASE_URL}/api/admin/pricing-validation/max-discount", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        expected_fields = [
            "selling_price", "partner_cost", "gross_margin",
            "minimum_margin_required", "max_discount_amount", "max_discount_percent"
        ]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        assert data["selling_price"] == 15000
        assert data["partner_cost"] == 10000
        assert data["gross_margin"] == 5000
        assert data["max_discount_amount"] > 0
        assert data["max_discount_percent"] > 0
        print(f"Max Discount: {data}")

    def test_validate_quote_pricing(self, api_client):
        """Test validating entire quote pricing"""
        payload = {
            "line_items": [
                {
                    "name": "Item 1",
                    "partner_cost": 10000,
                    "unit_price": 13000,
                    "quantity": 5,
                    "product_group": "Apparel"
                },
                {
                    "name": "Item 2",
                    "partner_cost": 5000,
                    "unit_price": 7000,
                    "quantity": 10,
                    "product_group": "Accessories"
                }
            ],
            "discount": 5000,
            "affiliate_commission": 2500,
            "points_discount": 1000,
            "country_code": "TZ"
        }
        
        response = api_client.post(f"{BASE_URL}/api/admin/pricing-validation/validate-quote", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        expected_fields = [
            "line_items", "total_partner_cost", "total_selling_price",
            "requested_discount", "adjusted_discount", "final_margin",
            "margin_safe", "was_adjusted"
        ]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        assert len(data["line_items"]) == 2
        assert data["total_partner_cost"] == 100000  # 10000*5 + 5000*10
        assert data["total_selling_price"] == 135000  # 13000*5 + 7000*10
        print(f"Quote Validation: margin_safe={data['margin_safe']}, final_margin={data['final_margin']}")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_data(self, api_client):
        """Clean up test markup settings"""
        # Get all markup settings
        response = api_client.get(f"{BASE_URL}/api/admin/group-markup")
        if response.status_code == 200:
            settings = response.json()
            for setting in settings:
                if setting.get("product_group", "").startswith("TEST_"):
                    api_client.delete(f"{BASE_URL}/api/admin/group-markup/{setting['id']}")
                    print(f"Cleaned up test setting: {setting['id']}")
        print("Test cleanup completed")
