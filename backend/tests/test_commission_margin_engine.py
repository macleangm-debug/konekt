"""
Commission + Margin Distribution Engine API Tests
Tests for commission calculation, preview, validation, and order calculation endpoints.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCommissionEngineDefaultConfig:
    """Tests for /api/commission-engine/default-config endpoint"""
    
    def test_get_default_config_returns_200(self):
        """Test that default config endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/commission-engine/default-config")
        assert response.status_code == 200
        
    def test_default_config_has_required_fields(self):
        """Test that default config contains all required configuration fields"""
        response = requests.get(f"{BASE_URL}/api/commission-engine/default-config")
        data = response.json()
        
        assert "config" in data
        assert "explanation" in data
        assert "notes" in data
        
        config = data["config"]
        assert "protected_company_margin_percent" in config
        assert "affiliate_percent_of_distributable" in config
        assert "sales_percent_of_distributable" in config
        assert "promo_percent_of_distributable" in config
        assert "referral_percent_of_distributable" in config
        assert "country_bonus_percent_of_distributable" in config
        
    def test_default_config_values_are_correct(self):
        """Test that default config has expected values"""
        response = requests.get(f"{BASE_URL}/api/commission-engine/default-config")
        config = response.json()["config"]
        
        assert config["protected_company_margin_percent"] == 8
        assert config["affiliate_percent_of_distributable"] == 10
        assert config["sales_percent_of_distributable"] == 15
        assert config["promo_percent_of_distributable"] == 10
        assert config["referral_percent_of_distributable"] == 5
        assert config["country_bonus_percent_of_distributable"] == 5


class TestCommissionEnginePreview:
    """Tests for /api/commission-engine/preview endpoint"""
    
    def test_preview_returns_200(self):
        """Test that preview endpoint returns 200"""
        payload = {
            "selling_price": 100000,
            "base_cost": 60000,
            "protected_company_margin_percent": 8
        }
        response = requests.post(f"{BASE_URL}/api/commission-engine/preview", json=payload)
        assert response.status_code == 200
        
    def test_preview_calculates_margin_pool_correctly(self):
        """Test that margin pool calculation is correct"""
        payload = {
            "selling_price": 100000,
            "base_cost": 60000,
            "protected_company_margin_percent": 8
        }
        response = requests.post(f"{BASE_URL}/api/commission-engine/preview", json=payload)
        data = response.json()
        
        pool = data["pool"]
        assert pool["selling_price"] == 100000.0
        assert pool["base_cost"] == 60000.0
        assert pool["gross_margin"] == 40000.0  # 100000 - 60000
        assert pool["protected_company_margin_amount"] == 8000.0  # 8% of 100000
        assert pool["distributable_margin"] == 32000.0  # 40000 - 8000
        
    def test_preview_calculates_distribution_correctly(self):
        """Test that distribution calculation is correct"""
        payload = {
            "selling_price": 100000,
            "base_cost": 60000,
            "protected_company_margin_percent": 8,
            "affiliate_percent_of_distributable": 10,
            "sales_percent_of_distributable": 15,
            "promo_percent_of_distributable": 10,
            "referral_percent_of_distributable": 5,
            "country_bonus_percent_of_distributable": 5
        }
        response = requests.post(f"{BASE_URL}/api/commission-engine/preview", json=payload)
        data = response.json()
        
        dist = data["distribution"]
        # Distributable margin is 32000
        assert dist["affiliate_amount"] == 3200.0  # 10% of 32000
        assert dist["sales_amount"] == 4800.0  # 15% of 32000
        assert dist["promo_amount"] == 3200.0  # 10% of 32000
        assert dist["referral_amount"] == 1600.0  # 5% of 32000
        assert dist["country_bonus_amount"] == 1600.0  # 5% of 32000
        assert dist["allocated_distributable_margin"] == 14400.0  # Total allocated
        assert dist["retained_company_margin"] == 25600.0  # 40000 - 14400
        
    def test_preview_auto_scales_when_exceeds_distributable(self):
        """Test that distribution is auto-scaled when total exceeds 100%"""
        payload = {
            "selling_price": 100000,
            "base_cost": 60000,
            "protected_company_margin_percent": 8,
            "affiliate_percent_of_distributable": 50,
            "sales_percent_of_distributable": 50,
            "promo_percent_of_distributable": 50,
            "referral_percent_of_distributable": 0,
            "country_bonus_percent_of_distributable": 0
        }
        response = requests.post(f"{BASE_URL}/api/commission-engine/preview", json=payload)
        data = response.json()
        
        dist = data["distribution"]
        # Total requested is 150%, should be scaled down
        # Distributable is 32000, total allocated should not exceed it (with small tolerance for floating point)
        total_allocated = (
            dist["affiliate_amount"] + 
            dist["sales_amount"] + 
            dist["promo_amount"] + 
            dist["referral_amount"] + 
            dist["country_bonus_amount"]
        )
        # Allow small floating point tolerance
        assert total_allocated <= 32000.0 + 0.1
        
    def test_preview_handles_zero_margin(self):
        """Test preview when selling price equals base cost (zero margin)"""
        payload = {
            "selling_price": 100000,
            "base_cost": 100000,
            "protected_company_margin_percent": 8,
            "affiliate_percent_of_distributable": 10
        }
        response = requests.post(f"{BASE_URL}/api/commission-engine/preview", json=payload)
        data = response.json()
        
        pool = data["pool"]
        assert pool["gross_margin"] == 0.0
        assert pool["distributable_margin"] == 0.0
        
        dist = data["distribution"]
        assert dist["affiliate_amount"] == 0.0


class TestCommissionEngineValidateConfig:
    """Tests for /api/commission-engine/validate-config endpoint"""
    
    def test_validate_config_returns_200(self):
        """Test that validate-config endpoint returns 200"""
        payload = {
            "affiliate_percent_of_distributable": 10,
            "sales_percent_of_distributable": 15,
            "protected_company_margin_percent": 8
        }
        response = requests.post(f"{BASE_URL}/api/commission-engine/validate-config", json=payload)
        assert response.status_code == 200
        
    def test_validate_config_valid_allocation(self):
        """Test validation with valid allocation (under 100%)"""
        payload = {
            "affiliate_percent_of_distributable": 10,
            "sales_percent_of_distributable": 15,
            "promo_percent_of_distributable": 10,
            "referral_percent_of_distributable": 5,
            "country_bonus_percent_of_distributable": 5,
            "protected_company_margin_percent": 8
        }
        response = requests.post(f"{BASE_URL}/api/commission-engine/validate-config", json=payload)
        data = response.json()
        
        assert data["valid"] == True
        assert data["total_allocation_percent"] == 45.0
        
    def test_validate_config_exceeds_100_percent(self):
        """Test validation when allocation exceeds 100%"""
        payload = {
            "affiliate_percent_of_distributable": 30,
            "sales_percent_of_distributable": 40,
            "promo_percent_of_distributable": 20,
            "referral_percent_of_distributable": 15,
            "country_bonus_percent_of_distributable": 10,
            "protected_company_margin_percent": 8
        }
        response = requests.post(f"{BASE_URL}/api/commission-engine/validate-config", json=payload)
        data = response.json()
        
        assert data["valid"] == False
        assert data["total_allocation_percent"] == 115.0
        assert len(data["warnings"]) > 0
        assert any("exceeds 100%" in w for w in data["warnings"])
        
    def test_validate_config_high_allocation_warning(self):
        """Test that high allocation (>80%) generates warning"""
        payload = {
            "affiliate_percent_of_distributable": 30,
            "sales_percent_of_distributable": 30,
            "promo_percent_of_distributable": 25,
            "referral_percent_of_distributable": 0,
            "country_bonus_percent_of_distributable": 0,
            "protected_company_margin_percent": 8
        }
        response = requests.post(f"{BASE_URL}/api/commission-engine/validate-config", json=payload)
        data = response.json()
        
        assert data["total_allocation_percent"] == 85.0
        assert any("High allocation" in w for w in data["warnings"])
        
    def test_validate_config_low_protected_margin_warning(self):
        """Test that low protected margin (<5%) generates warning"""
        payload = {
            "affiliate_percent_of_distributable": 10,
            "sales_percent_of_distributable": 15,
            "protected_company_margin_percent": 3
        }
        response = requests.post(f"{BASE_URL}/api/commission-engine/validate-config", json=payload)
        data = response.json()
        
        assert any("Protected margin" in w and "quite low" in w for w in data["warnings"])


class TestCommissionEngineCalculateOrder:
    """Tests for /api/commission-engine/calculate-order endpoint"""
    
    def test_calculate_order_returns_200(self):
        """Test that calculate-order endpoint returns 200"""
        payload = {
            "order_id": "TEST-ORDER-001",
            "line_items": [
                {"sku": "SKU001", "name": "Product 1", "selling_price": 50000, "base_cost": 30000, "quantity": 1}
            ],
            "source_type": "website"
        }
        response = requests.post(f"{BASE_URL}/api/commission-engine/calculate-order", json=payload)
        assert response.status_code == 200
        
    def test_calculate_order_single_item(self):
        """Test order calculation with single line item"""
        payload = {
            "order_id": "TEST-ORDER-002",
            "line_items": [
                {"sku": "SKU001", "name": "Product 1", "selling_price": 50000, "base_cost": 30000, "quantity": 1}
            ],
            "source_type": "affiliate",
            "affiliate_user_id": "aff123"
        }
        response = requests.post(f"{BASE_URL}/api/commission-engine/calculate-order", json=payload)
        data = response.json()
        
        assert data["order_id"] == "TEST-ORDER-002"
        assert data["source_type"] == "affiliate"
        assert "totals" in data
        assert "item_breakdowns" in data
        assert len(data["item_breakdowns"]) == 1
        
    def test_calculate_order_multiple_items(self):
        """Test order calculation with multiple line items"""
        payload = {
            "order_id": "TEST-ORDER-003",
            "line_items": [
                {"sku": "SKU001", "name": "Product 1", "selling_price": 50000, "base_cost": 30000, "quantity": 2},
                {"sku": "SKU002", "name": "Product 2", "selling_price": 75000, "base_cost": 45000, "quantity": 1}
            ],
            "source_type": "affiliate",
            "affiliate_user_id": "aff123",
            "assigned_sales_id": "sales456",
            "country_code": "TZ"
        }
        response = requests.post(f"{BASE_URL}/api/commission-engine/calculate-order", json=payload)
        data = response.json()
        
        assert len(data["item_breakdowns"]) == 2
        
        # Verify totals are sum of line items
        totals = data["totals"]
        assert totals["affiliate_commission"] > 0
        assert totals["sales_commission"] > 0
        assert totals["country_bonus"] > 0
        
    def test_calculate_order_respects_ownership(self):
        """Test that commission is only applied when ownership is set"""
        # Without affiliate_user_id, affiliate commission should be 0
        payload = {
            "order_id": "TEST-ORDER-004",
            "line_items": [
                {"sku": "SKU001", "name": "Product 1", "selling_price": 50000, "base_cost": 30000, "quantity": 1}
            ],
            "source_type": "website"
            # No affiliate_user_id, assigned_sales_id, etc.
        }
        response = requests.post(f"{BASE_URL}/api/commission-engine/calculate-order", json=payload)
        data = response.json()
        
        totals = data["totals"]
        assert totals["affiliate_commission"] == 0
        assert totals["sales_commission"] == 0
        assert totals["referral_bonus"] == 0
        assert totals["country_bonus"] == 0
        
    def test_calculate_order_quantity_multiplier(self):
        """Test that quantity correctly multiplies commission"""
        # Single item with quantity 1
        payload1 = {
            "order_id": "TEST-ORDER-005",
            "line_items": [
                {"sku": "SKU001", "name": "Product 1", "selling_price": 50000, "base_cost": 30000, "quantity": 1}
            ],
            "source_type": "affiliate",
            "affiliate_user_id": "aff123"
        }
        response1 = requests.post(f"{BASE_URL}/api/commission-engine/calculate-order", json=payload1)
        data1 = response1.json()
        
        # Same item with quantity 3
        payload3 = {
            "order_id": "TEST-ORDER-006",
            "line_items": [
                {"sku": "SKU001", "name": "Product 1", "selling_price": 50000, "base_cost": 30000, "quantity": 3}
            ],
            "source_type": "affiliate",
            "affiliate_user_id": "aff123"
        }
        response3 = requests.post(f"{BASE_URL}/api/commission-engine/calculate-order", json=payload3)
        data3 = response3.json()
        
        # Commission for qty 3 should be 3x commission for qty 1
        assert data3["totals"]["affiliate_commission"] == data1["totals"]["affiliate_commission"] * 3
        
    def test_calculate_order_config_applied(self):
        """Test that config_applied is returned correctly"""
        payload = {
            "order_id": "TEST-ORDER-007",
            "line_items": [
                {"sku": "SKU001", "name": "Product 1", "selling_price": 50000, "base_cost": 30000, "quantity": 1}
            ],
            "source_type": "affiliate",
            "affiliate_user_id": "aff123"
        }
        response = requests.post(f"{BASE_URL}/api/commission-engine/calculate-order", json=payload)
        data = response.json()
        
        assert "config_applied" in data
        config = data["config_applied"]
        assert "protected_company_margin_percent" in config
        assert "affiliate_percent_of_distributable" in config


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
