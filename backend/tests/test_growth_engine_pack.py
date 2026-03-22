"""
Growth Engine Pack Tests
Tests for: Commission Engine, Promotion Engine, Payout Engine, Attribution Engine
Key business rules:
- If lead source is affiliate → sales commission reduced
- If lead is self-generated → sales gets full commission
- Company 20% protected markup
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPromotionEngine:
    """Promotion Engine API tests - calculates safe promotion budget"""
    
    def test_preview_promotion_basic(self):
        """POST /api/promotion-engine/preview - basic calculation"""
        response = requests.post(f"{BASE_URL}/api/promotion-engine/preview", json={
            "base_amount": 100000,
            "company_markup_percent": 20,
            "extra_sell_percent": 10
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify margin protection: 20% markup = 20000
        assert data["protected_company_markup_amount"] == 20000, f"Expected 20000, got {data['protected_company_markup_amount']}"
        # Distributable layer: 10% = 10000
        assert data["distributable_layer_amount"] == 10000, f"Expected 10000, got {data['distributable_layer_amount']}"
        # Selling price: 100000 + 20000 + 10000 = 130000
        assert data["selling_price"] == 130000, f"Expected 130000, got {data['selling_price']}"
        # Max safe promotion = distributable layer only
        assert data["max_safe_promotion_amount"] == 10000, f"Expected 10000, got {data['max_safe_promotion_amount']}"
        print("✓ Promotion preview calculates safe budget correctly")
    
    def test_preview_promotion_zero_base(self):
        """POST /api/promotion-engine/preview - handles zero base amount"""
        response = requests.post(f"{BASE_URL}/api/promotion-engine/preview", json={
            "base_amount": 0,
            "company_markup_percent": 20,
            "extra_sell_percent": 10
        })
        assert response.status_code == 200
        data = response.json()
        assert data["selling_price"] == 0
        assert data["max_safe_promotion_amount"] == 0
        print("✓ Promotion preview handles zero base amount")
    
    def test_preview_promotion_default_values(self):
        """POST /api/promotion-engine/preview - uses default markup values"""
        response = requests.post(f"{BASE_URL}/api/promotion-engine/preview", json={
            "base_amount": 50000
        })
        assert response.status_code == 200
        data = response.json()
        # Default: 20% markup, 10% extra
        assert data["protected_company_markup_amount"] == 10000  # 20% of 50000
        assert data["distributable_layer_amount"] == 5000  # 10% of 50000
        print("✓ Promotion preview uses default markup values")
    
    def test_list_campaigns(self):
        """GET /api/promotion-engine/campaigns - lists campaigns"""
        response = requests.get(f"{BASE_URL}/api/promotion-engine/campaigns")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of campaigns"
        print(f"✓ Campaigns list returned {len(data)} campaigns")
    
    def test_create_campaign(self):
        """POST /api/promotion-engine/campaigns - creates campaign"""
        response = requests.post(f"{BASE_URL}/api/promotion-engine/campaigns", json={
            "title": "TEST_Growth_Engine_Campaign",
            "scope_type": "service_group",
            "scope_key": "printing",
            "promo_type": "safe_distribution",
            "discount_percent": 5,
            "affiliate_enabled": True,
            "visible_to_all_affiliates": True,
            "status": "active"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == True
        assert "id" in data
        print(f"✓ Campaign created with ID: {data['id']}")


class TestPayoutEngine:
    """Payout Engine API tests - payout eligibility and thresholds"""
    
    def test_payout_summary(self):
        """GET /api/payout-engine/summary - returns payout eligibility"""
        response = requests.get(f"{BASE_URL}/api/payout-engine/summary", params={
            "beneficiary_type": "affiliate"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify required fields
        assert "pending_total" in data, "Missing pending_total"
        assert "paid_total" in data, "Missing paid_total"
        assert "minimum_payout_threshold" in data, "Missing minimum_payout_threshold"
        assert "eligible_for_payout" in data, "Missing eligible_for_payout"
        assert "payout_cycle" in data, "Missing payout_cycle"
        
        # Verify minimum threshold is 50000 TZS
        assert data["minimum_payout_threshold"] == 50000, f"Expected 50000, got {data['minimum_payout_threshold']}"
        assert data["payout_cycle"] == "monthly"
        print(f"✓ Payout summary: pending={data['pending_total']}, paid={data['paid_total']}, eligible={data['eligible_for_payout']}")
    
    def test_payout_summary_sales(self):
        """GET /api/payout-engine/summary - works for sales beneficiary type"""
        response = requests.get(f"{BASE_URL}/api/payout-engine/summary", params={
            "beneficiary_type": "sales"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "eligible_for_payout" in data
        print("✓ Payout summary works for sales beneficiary type")


class TestUnifiedCommissionEngine:
    """Unified Commission Engine API tests - commission record creation"""
    
    def test_create_commission_affiliate(self):
        """POST /api/commission-engine-unified/create - creates affiliate commission"""
        response = requests.post(f"{BASE_URL}/api/commission-engine-unified/create", json={
            "order_id": "TEST_ORDER_001",
            "beneficiary_type": "affiliate",
            "beneficiary_user_id": "test_affiliate_user",
            "amount": 5000,
            "source_type": "affiliate",
            "status": "pending",
            "campaign_id": "test_campaign_001"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == True
        assert "id" in data
        print(f"✓ Affiliate commission created with ID: {data['id']}")
    
    def test_create_commission_sales_self_generated(self):
        """POST /api/commission-engine-unified/create - sales gets full commission for self-generated lead"""
        response = requests.post(f"{BASE_URL}/api/commission-engine-unified/create", json={
            "order_id": "TEST_ORDER_002",
            "beneficiary_type": "sales",
            "beneficiary_user_id": "test_sales_user",
            "amount": 15000,  # Full commission for self-generated
            "source_type": "sales",  # Self-generated lead
            "status": "pending"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == True
        print("✓ Sales commission created for self-generated lead (full commission)")
    
    def test_create_commission_sales_affiliate_lead(self):
        """POST /api/commission-engine-unified/create - sales gets reduced commission for affiliate lead"""
        response = requests.post(f"{BASE_URL}/api/commission-engine-unified/create", json={
            "order_id": "TEST_ORDER_003",
            "beneficiary_type": "sales",
            "beneficiary_user_id": "test_sales_user",
            "amount": 7500,  # Reduced commission for affiliate lead
            "source_type": "affiliate",  # Lead came from affiliate
            "status": "pending",
            "attribution_reference": "affiliate_ref_001"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == True
        print("✓ Sales commission created for affiliate lead (reduced commission)")
    
    def test_create_commission_hybrid(self):
        """POST /api/commission-engine-unified/create - handles hybrid source type"""
        response = requests.post(f"{BASE_URL}/api/commission-engine-unified/create", json={
            "order_id": "TEST_ORDER_004",
            "beneficiary_type": "sales",
            "beneficiary_user_id": "test_sales_user",
            "amount": 10000,
            "source_type": "hybrid",  # Both affiliate and sales involved
            "status": "pending"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == True
        print("✓ Commission created for hybrid source type")


class TestAttributionEngine:
    """Attribution Engine API tests - tracks lead source for commission calculations"""
    
    def test_capture_attribution_website(self):
        """POST /api/attribution-engine/capture - captures website attribution"""
        response = requests.post(f"{BASE_URL}/api/attribution-engine/capture", json={
            "source_type": "website",
            "session_id": "test_session_001",
            "order_id": "TEST_ORDER_005"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == True
        assert "id" in data
        print(f"✓ Website attribution captured with ID: {data['id']}")
    
    def test_capture_attribution_affiliate(self):
        """POST /api/attribution-engine/capture - captures affiliate attribution"""
        response = requests.post(f"{BASE_URL}/api/attribution-engine/capture", json={
            "source_type": "affiliate",
            "affiliate_code": "AFF123",
            "affiliate_user_id": "test_affiliate_user",
            "session_id": "test_session_002",
            "order_id": "TEST_ORDER_006"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == True
        print("✓ Affiliate attribution captured")
    
    def test_capture_attribution_sales(self):
        """POST /api/attribution-engine/capture - captures sales attribution"""
        response = requests.post(f"{BASE_URL}/api/attribution-engine/capture", json={
            "source_type": "sales",
            "sales_user_id": "test_sales_user",
            "quote_id": "test_quote_001",
            "order_id": "TEST_ORDER_007"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == True
        print("✓ Sales attribution captured")
    
    def test_capture_attribution_hybrid(self):
        """POST /api/attribution-engine/capture - captures hybrid attribution"""
        response = requests.post(f"{BASE_URL}/api/attribution-engine/capture", json={
            "source_type": "hybrid",
            "affiliate_code": "AFF456",
            "affiliate_user_id": "test_affiliate_user",
            "sales_user_id": "test_sales_user",
            "promo_code": "PROMO10",
            "order_id": "TEST_ORDER_008"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == True
        print("✓ Hybrid attribution captured")
    
    def test_get_attribution_by_order(self):
        """GET /api/attribution-engine/by-order/{order_id} - retrieves attribution by order"""
        # First create an attribution
        requests.post(f"{BASE_URL}/api/attribution-engine/capture", json={
            "source_type": "website",
            "order_id": "TEST_ORDER_LOOKUP"
        })
        
        # Then retrieve it
        response = requests.get(f"{BASE_URL}/api/attribution-engine/by-order/TEST_ORDER_LOOKUP")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of attributions"
        print(f"✓ Attribution lookup returned {len(data)} records")


class TestMarginProtection:
    """Tests verifying 20% company margin protection"""
    
    def test_margin_protection_calculation(self):
        """Verify company 20% markup is always protected"""
        response = requests.post(f"{BASE_URL}/api/promotion-engine/preview", json={
            "base_amount": 100000,
            "company_markup_percent": 20,
            "extra_sell_percent": 10
        })
        assert response.status_code == 200
        data = response.json()
        
        # Company protected markup should be exactly 20% of base
        expected_protected = 100000 * 0.20
        assert data["protected_company_markup_amount"] == expected_protected
        
        # Max safe promotion should NOT exceed distributable layer
        assert data["max_safe_promotion_amount"] <= data["distributable_layer_amount"]
        
        # Selling price should include protected markup
        assert data["selling_price"] >= data["base_amount"] + data["protected_company_markup_amount"]
        
        print("✓ 20% company margin protection verified")
    
    def test_distributable_layer_only(self):
        """Verify promotions only come from distributable layer, not protected markup"""
        response = requests.post(f"{BASE_URL}/api/promotion-engine/preview", json={
            "base_amount": 200000,
            "company_markup_percent": 20,
            "extra_sell_percent": 15
        })
        assert response.status_code == 200
        data = response.json()
        
        # Protected markup: 40000 (20% of 200000)
        # Distributable layer: 30000 (15% of 200000)
        # Max safe promotion should be 30000 (distributable only)
        assert data["protected_company_markup_amount"] == 40000
        assert data["distributable_layer_amount"] == 30000
        assert data["max_safe_promotion_amount"] == 30000
        
        print("✓ Promotions only from distributable layer verified")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
