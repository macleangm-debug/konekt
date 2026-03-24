"""
Tests for Instant Quote Engine and Sales Command Center APIs
- POST /api/instant-quote/preview - Calculate quote with margin, buffer, VAT
- GET /api/sales-command/dispatch-summary - Get dispatch board data
- POST /api/sales-command/claim-lead - Claim a lead
- POST /api/sales-command/mark-followup - Mark quote as followed up
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestInstantQuoteEngine:
    """Instant Quote Engine API tests"""

    def test_instant_quote_preview_success(self):
        """Test POST /api/instant-quote/preview with valid base_amount"""
        response = requests.post(
            f"{BASE_URL}/api/instant-quote/preview",
            json={"base_amount": 500000}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["ok"] is True
        assert "estimate" in data
        assert "rules" in data
        
        # Verify estimate breakdown
        estimate = data["estimate"]
        assert estimate["base_amount"] == 500000
        assert estimate["company_margin_amount"] == 100000  # 20% of 500000
        assert estimate["distribution_buffer_amount"] == 50000  # 10% of 500000
        assert estimate["subtotal_amount"] == 650000  # 500000 + 100000 + 50000
        assert estimate["vat_amount"] == 117000  # 18% of 650000
        assert estimate["total_amount"] == 767000  # 650000 + 117000
        
        # Verify rules
        rules = data["rules"]
        assert rules["minimum_company_margin_percent"] == 20
        assert rules["distribution_buffer_percent"] == 10
        assert rules["vat_percent"] == 18

    def test_instant_quote_preview_different_amount(self):
        """Test with different base amount to verify calculation"""
        response = requests.post(
            f"{BASE_URL}/api/instant-quote/preview",
            json={"base_amount": 1000000}
        )
        assert response.status_code == 200
        
        data = response.json()
        estimate = data["estimate"]
        
        # 1,000,000 base
        assert estimate["base_amount"] == 1000000
        assert estimate["company_margin_amount"] == 200000  # 20%
        assert estimate["distribution_buffer_amount"] == 100000  # 10%
        assert estimate["subtotal_amount"] == 1300000
        assert estimate["vat_amount"] == 234000  # 18% of 1,300,000
        assert estimate["total_amount"] == 1534000

    def test_instant_quote_preview_zero_amount(self):
        """Test with zero base_amount - should return 400"""
        response = requests.post(
            f"{BASE_URL}/api/instant-quote/preview",
            json={"base_amount": 0}
        )
        assert response.status_code == 400
        assert "greater than zero" in response.json().get("detail", "").lower()

    def test_instant_quote_preview_negative_amount(self):
        """Test with negative base_amount - should return 400"""
        response = requests.post(
            f"{BASE_URL}/api/instant-quote/preview",
            json={"base_amount": -100}
        )
        assert response.status_code == 400

    def test_instant_quote_preview_missing_amount(self):
        """Test with missing base_amount - should return 400"""
        response = requests.post(
            f"{BASE_URL}/api/instant-quote/preview",
            json={}
        )
        assert response.status_code == 400


class TestSalesCommandCenter:
    """Sales Command Center API tests"""

    def test_dispatch_summary_success(self):
        """Test GET /api/sales-command/dispatch-summary"""
        response = requests.get(f"{BASE_URL}/api/sales-command/dispatch-summary")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify counts structure
        assert "counts" in data
        counts = data["counts"]
        assert "new_leads" in counts
        assert "followups_due" in counts
        assert "overdue_responses" in counts
        assert "ready_to_close" in counts
        
        # Verify lists structure
        assert "new_leads" in data
        assert "followups_due" in data
        assert "overdue_responses" in data
        assert "ready_to_close" in data
        
        # Verify counts are integers
        assert isinstance(counts["new_leads"], int)
        assert isinstance(counts["followups_due"], int)
        assert isinstance(counts["overdue_responses"], int)
        assert isinstance(counts["ready_to_close"], int)

    def test_dispatch_summary_with_sales_owner_filter(self):
        """Test dispatch summary with sales_owner_id filter"""
        response = requests.get(
            f"{BASE_URL}/api/sales-command/dispatch-summary",
            params={"sales_owner_id": "test-owner-123"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "counts" in data
        # Filtered results may be empty but structure should be valid
        assert isinstance(data["new_leads"], list)
        assert isinstance(data["followups_due"], list)

    def test_claim_lead_success(self):
        """Test POST /api/sales-command/claim-lead"""
        # First get a lead to claim
        summary_response = requests.get(f"{BASE_URL}/api/sales-command/dispatch-summary")
        summary_data = summary_response.json()
        
        if summary_data["new_leads"]:
            lead = summary_data["new_leads"][0]
            lead_id = lead.get("id")
            
            response = requests.post(
                f"{BASE_URL}/api/sales-command/claim-lead",
                json={
                    "lead_id": lead_id,
                    "sales_owner_id": "test-sales-owner-pytest",
                    "sales_owner_name": "Pytest Sales Rep"
                }
            )
            assert response.status_code == 200
            
            data = response.json()
            assert data["ok"] is True
            assert "matched" in data
            assert "modified" in data
        else:
            pytest.skip("No new leads available to test claim")

    def test_claim_lead_nonexistent(self):
        """Test claiming a non-existent lead"""
        response = requests.post(
            f"{BASE_URL}/api/sales-command/claim-lead",
            json={
                "lead_id": "nonexistent-lead-id-12345",
                "sales_owner_id": "test-owner",
                "sales_owner_name": "Test Owner"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["ok"] is True
        assert data["matched"] == 0  # No lead matched

    def test_mark_followup_success(self):
        """Test POST /api/sales-command/mark-followup"""
        # First get a quote to mark
        summary_response = requests.get(f"{BASE_URL}/api/sales-command/dispatch-summary")
        summary_data = summary_response.json()
        
        if summary_data["followups_due"]:
            quote = summary_data["followups_due"][0]
            quote_id = quote.get("id")
            
            response = requests.post(
                f"{BASE_URL}/api/sales-command/mark-followup",
                json={"quote_id": quote_id}
            )
            assert response.status_code == 200
            
            data = response.json()
            assert data["ok"] is True
            assert "matched" in data
            assert "modified" in data
        else:
            pytest.skip("No followups available to test mark-followup")

    def test_mark_followup_nonexistent(self):
        """Test marking followup on non-existent quote"""
        response = requests.post(
            f"{BASE_URL}/api/sales-command/mark-followup",
            json={"quote_id": "nonexistent-quote-id-12345"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["ok"] is True
        assert data["matched"] == 0  # No quote matched


class TestInstantQuoteEdgeCases:
    """Edge case tests for Instant Quote Engine"""

    def test_instant_quote_small_amount(self):
        """Test with small base amount"""
        response = requests.post(
            f"{BASE_URL}/api/instant-quote/preview",
            json={"base_amount": 100}
        )
        assert response.status_code == 200
        
        data = response.json()
        estimate = data["estimate"]
        assert estimate["base_amount"] == 100
        assert estimate["company_margin_amount"] == 20  # 20%
        assert estimate["distribution_buffer_amount"] == 10  # 10%

    def test_instant_quote_large_amount(self):
        """Test with large base amount"""
        response = requests.post(
            f"{BASE_URL}/api/instant-quote/preview",
            json={"base_amount": 10000000}  # 10 million
        )
        assert response.status_code == 200
        
        data = response.json()
        estimate = data["estimate"]
        assert estimate["base_amount"] == 10000000
        assert estimate["total_amount"] > estimate["base_amount"]

    def test_instant_quote_decimal_amount(self):
        """Test with decimal base amount"""
        response = requests.post(
            f"{BASE_URL}/api/instant-quote/preview",
            json={"base_amount": 123456.78}
        )
        assert response.status_code == 200
        
        data = response.json()
        estimate = data["estimate"]
        # Values should be rounded to 2 decimal places
        assert isinstance(estimate["base_amount"], (int, float))
        assert isinstance(estimate["total_amount"], (int, float))
