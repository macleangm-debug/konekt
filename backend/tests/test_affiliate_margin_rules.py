"""
Test Affiliate Margin Rules API - Margin Protection Pack
Tests the margin protection logic where:
- Company never earns less than 20% markup on base amount
- Only extra distributable layer is shared with affiliates/sales/promo/referral/country bonus
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestAffiliateMarginRulesAPI:
    """Test the affiliate margin rules preview endpoint"""

    def test_margin_rules_preview_basic_calculation(self):
        """Test basic margin calculation with base 100000"""
        payload = {
            "base_amount": 100000,
            "company_markup_percent": 20,
            "extra_sell_percent": 10,
            "affiliate_percent_of_distributable": 10,
            "sales_percent_of_distributable": 15,
            "promo_percent_of_distributable": 10,
            "referral_percent_of_distributable": 5,
            "country_bonus_percent_of_distributable": 5
        }
        
        response = requests.post(f"{BASE_URL}/api/affiliate-margin-rules/preview", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify pricing model
        pricing = data.get("pricing_model", {})
        assert pricing.get("base_amount") == 100000, "Base amount should be 100000"
        assert pricing.get("company_markup_percent") == 20, "Company markup should be 20%"
        assert pricing.get("protected_company_markup_amount") == 20000, "Protected markup should be 20000 (20% of 100000)"
        assert pricing.get("extra_sell_percent") == 10, "Extra sell percent should be 10%"
        assert pricing.get("distributable_layer_amount") == 10000, "Distributable layer should be 10000 (10% of 100000)"
        assert pricing.get("selling_price") == 130000, "Selling price should be 130000 (100000 + 20000 + 10000)"
        
        print(f"✓ Pricing model verified: base={pricing.get('base_amount')}, selling_price={pricing.get('selling_price')}")

    def test_margin_rules_distribution_amounts(self):
        """Test distribution amounts from distributable layer"""
        payload = {
            "base_amount": 100000,
            "company_markup_percent": 20,
            "extra_sell_percent": 10,
            "affiliate_percent_of_distributable": 10,
            "sales_percent_of_distributable": 15,
            "promo_percent_of_distributable": 10,
            "referral_percent_of_distributable": 5,
            "country_bonus_percent_of_distributable": 5
        }
        
        response = requests.post(f"{BASE_URL}/api/affiliate-margin-rules/preview", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        distribution = data.get("distribution", {})
        
        # Distributable layer is 10000 (10% of 100000)
        # Affiliate: 10% of 10000 = 1000
        assert distribution.get("affiliate_amount") == 1000, f"Affiliate amount should be 1000, got {distribution.get('affiliate_amount')}"
        
        # Sales: 15% of 10000 = 1500
        assert distribution.get("sales_amount") == 1500, f"Sales amount should be 1500, got {distribution.get('sales_amount')}"
        
        # Promo: 10% of 10000 = 1000
        assert distribution.get("promo_amount") == 1000, f"Promo amount should be 1000, got {distribution.get('promo_amount')}"
        
        # Referral: 5% of 10000 = 500
        assert distribution.get("referral_amount") == 500, f"Referral amount should be 500, got {distribution.get('referral_amount')}"
        
        # Country bonus: 5% of 10000 = 500
        assert distribution.get("country_bonus_amount") == 500, f"Country bonus should be 500, got {distribution.get('country_bonus_amount')}"
        
        # Total allocated: 1000 + 1500 + 1000 + 500 + 500 = 4500 (45% of distributable)
        assert distribution.get("allocated_distributable_amount") == 4500, f"Allocated should be 4500, got {distribution.get('allocated_distributable_amount')}"
        
        # Remaining: 10000 - 4500 = 5500 (55% retained by company)
        assert distribution.get("remaining_distributable_retained") == 5500, f"Remaining should be 5500, got {distribution.get('remaining_distributable_retained')}"
        
        # Company total kept: 20000 (protected) + 5500 (remaining) = 25500
        assert distribution.get("company_total_kept") == 25500, f"Company total should be 25500, got {distribution.get('company_total_kept')}"
        
        print(f"✓ Distribution verified: affiliate={distribution.get('affiliate_amount')}, company_total={distribution.get('company_total_kept')}")

    def test_margin_rules_protection_rules(self):
        """Test that protection rules are correctly returned"""
        payload = {
            "base_amount": 100000,
            "company_markup_percent": 20,
            "extra_sell_percent": 10,
            "affiliate_percent_of_distributable": 10
        }
        
        response = requests.post(f"{BASE_URL}/api/affiliate-margin-rules/preview", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        rules = data.get("rules", {})
        
        assert rules.get("company_never_below_markup_percent") == 20.0, "Company protection should be 20%"
        assert rules.get("distribution_only_from_extra_layer") == True, "Distribution should only be from extra layer"
        
        print(f"✓ Protection rules verified: company_never_below={rules.get('company_never_below_markup_percent')}%")

    def test_margin_rules_company_markup_never_touched(self):
        """Test that company protected markup is never touched regardless of distribution"""
        payload = {
            "base_amount": 100000,
            "company_markup_percent": 20,
            "extra_sell_percent": 10,
            "affiliate_percent_of_distributable": 100  # Even with 100% affiliate, company markup should be protected
        }
        
        response = requests.post(f"{BASE_URL}/api/affiliate-margin-rules/preview", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        pricing = data.get("pricing_model", {})
        distribution = data.get("distribution", {})
        
        # Company protected markup should always be 20000 (20% of 100000)
        assert pricing.get("protected_company_markup_amount") == 20000, "Protected markup should always be 20000"
        
        # Company total kept should be at least the protected markup
        assert distribution.get("company_total_kept") >= 20000, "Company should keep at least the protected markup"
        
        print(f"✓ Company protection verified: protected_markup={pricing.get('protected_company_markup_amount')}, total_kept={distribution.get('company_total_kept')}")

    def test_margin_rules_affiliate_only_from_distributable(self):
        """Test that affiliate amount comes only from distributable layer"""
        payload = {
            "base_amount": 100000,
            "company_markup_percent": 20,
            "extra_sell_percent": 10,
            "affiliate_percent_of_distributable": 10
        }
        
        response = requests.post(f"{BASE_URL}/api/affiliate-margin-rules/preview", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        pricing = data.get("pricing_model", {})
        distribution = data.get("distribution", {})
        
        distributable = pricing.get("distributable_layer_amount")
        affiliate = distribution.get("affiliate_amount")
        
        # Affiliate amount should be exactly 10% of distributable layer
        expected_affiliate = distributable * 0.10
        assert affiliate == expected_affiliate, f"Affiliate should be {expected_affiliate}, got {affiliate}"
        
        # Affiliate amount should never exceed distributable layer
        assert affiliate <= distributable, "Affiliate amount should never exceed distributable layer"
        
        print(f"✓ Affiliate from distributable verified: distributable={distributable}, affiliate={affiliate}")

    def test_margin_rules_over_allocation_scaling(self):
        """Test that over-allocation is scaled down to fit distributable layer"""
        payload = {
            "base_amount": 100000,
            "company_markup_percent": 20,
            "extra_sell_percent": 10,
            "affiliate_percent_of_distributable": 50,
            "sales_percent_of_distributable": 50,
            "promo_percent_of_distributable": 50,
            "referral_percent_of_distributable": 50,
            "country_bonus_percent_of_distributable": 50  # Total 250% - should be scaled
        }
        
        response = requests.post(f"{BASE_URL}/api/affiliate-margin-rules/preview", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        pricing = data.get("pricing_model", {})
        distribution = data.get("distribution", {})
        
        distributable = pricing.get("distributable_layer_amount")
        allocated = distribution.get("allocated_distributable_amount")
        
        # Allocated should never exceed distributable layer
        assert allocated <= distributable, f"Allocated {allocated} should not exceed distributable {distributable}"
        
        print(f"✓ Over-allocation scaling verified: distributable={distributable}, allocated={allocated}")

    def test_margin_rules_zero_base_amount(self):
        """Test handling of zero base amount"""
        payload = {
            "base_amount": 0,
            "company_markup_percent": 20,
            "extra_sell_percent": 10,
            "affiliate_percent_of_distributable": 10
        }
        
        response = requests.post(f"{BASE_URL}/api/affiliate-margin-rules/preview", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        pricing = data.get("pricing_model", {})
        
        assert pricing.get("base_amount") == 0
        assert pricing.get("selling_price") == 0
        assert pricing.get("protected_company_markup_amount") == 0
        
        print(f"✓ Zero base amount handled correctly")

    def test_margin_rules_different_base_amounts(self):
        """Test with different base amounts to verify calculations scale correctly"""
        test_cases = [
            {"base": 50000, "expected_selling": 65000, "expected_distributable": 5000},
            {"base": 200000, "expected_selling": 260000, "expected_distributable": 20000},
            {"base": 1000000, "expected_selling": 1300000, "expected_distributable": 100000},
        ]
        
        for tc in test_cases:
            payload = {
                "base_amount": tc["base"],
                "company_markup_percent": 20,
                "extra_sell_percent": 10,
                "affiliate_percent_of_distributable": 10
            }
            
            response = requests.post(f"{BASE_URL}/api/affiliate-margin-rules/preview", json=payload)
            assert response.status_code == 200
            
            data = response.json()
            pricing = data.get("pricing_model", {})
            
            assert pricing.get("selling_price") == tc["expected_selling"], f"For base {tc['base']}, expected selling {tc['expected_selling']}, got {pricing.get('selling_price')}"
            assert pricing.get("distributable_layer_amount") == tc["expected_distributable"], f"For base {tc['base']}, expected distributable {tc['expected_distributable']}, got {pricing.get('distributable_layer_amount')}"
            
            print(f"✓ Base {tc['base']} → Selling {pricing.get('selling_price')}, Distributable {pricing.get('distributable_layer_amount')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
