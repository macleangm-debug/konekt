"""
Test Margin Engine APIs - Phase 42
Tests: margin rules CRUD, resolve-distribution endpoint, hierarchy resolution
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestMarginRulesAPI:
    """Margin Rules CRUD and resolve-distribution tests"""
    
    def test_list_margin_rules(self):
        """GET /api/admin/margin-rules returns list of rules"""
        response = requests.get(f"{BASE_URL}/api/admin/margin-rules")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of rules"
        print(f"Found {len(data)} margin rules")
        # Check if any rule has distributable_margin_pct field
        for rule in data:
            print(f"  Rule: scope={rule.get('scope')}, target_id={rule.get('target_id')}, value={rule.get('value')}, distributable={rule.get('distributable_margin_pct')}")
    
    def test_create_margin_rule_with_distributable(self):
        """POST /api/admin/margin-rules creates rule with distributable_margin_pct"""
        # First delete if exists
        existing = requests.get(f"{BASE_URL}/api/admin/margin-rules?scope=group")
        for rule in existing.json():
            if rule.get('target_id') == 'test-group-v193':
                requests.delete(f"{BASE_URL}/api/admin/margin-rules/{rule['id']}")
        
        payload = {
            "scope": "group",
            "target_id": "test-group-v193",
            "target_name": "Test Group V193",
            "method": "percentage",
            "value": 18,
            "distributable_margin_pct": 8
        }
        response = requests.post(f"{BASE_URL}/api/admin/margin-rules", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get('id'), "Expected rule ID"
        assert data.get('scope') == 'group'
        assert data.get('target_id') == 'test-group-v193'
        assert data.get('value') == 18
        assert data.get('distributable_margin_pct') == 8
        print(f"Created rule: {data}")
        return data['id']
    
    def test_resolve_distribution_with_group_rule(self):
        """POST /api/admin/margin-rules/resolve-distribution resolves by hierarchy"""
        # Ensure test group rule exists
        existing = requests.get(f"{BASE_URL}/api/admin/margin-rules?scope=group")
        test_rule = None
        for rule in existing.json():
            if rule.get('target_id') == 'test-group-v193':
                test_rule = rule
                break
        
        if not test_rule:
            # Create it
            payload = {
                "scope": "group",
                "target_id": "test-group-v193",
                "target_name": "Test Group V193",
                "method": "percentage",
                "value": 18,
                "distributable_margin_pct": 8
            }
            requests.post(f"{BASE_URL}/api/admin/margin-rules", json=payload)
        
        # Now resolve distribution for this group
        resolve_payload = {
            "group_id": "test-group-v193",
            "vendor_price": 10000
        }
        response = requests.post(f"{BASE_URL}/api/admin/margin-rules/resolve-distribution", json=resolve_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get('ok') == True
        pricing = data.get('pricing', {})
        
        # Verify canonical pricing object fields
        assert 'base_price' in pricing, "Missing base_price"
        assert 'effective_margin_pct' in pricing, "Missing effective_margin_pct"
        assert 'effective_margin_value' in pricing, "Missing effective_margin_value"
        assert 'effective_distributable_margin_pct' in pricing, "Missing effective_distributable_margin_pct"
        assert 'effective_distributable_margin_value' in pricing, "Missing effective_distributable_margin_value"
        assert 'sales_share_pct' in pricing, "Missing sales_share_pct"
        assert 'affiliate_share_pct' in pricing, "Missing affiliate_share_pct"
        assert 'discount_share_pct' in pricing, "Missing discount_share_pct"
        assert 'sales_amount' in pricing, "Missing sales_amount"
        assert 'affiliate_amount' in pricing, "Missing affiliate_amount"
        assert 'discount_amount' in pricing, "Missing discount_amount"
        assert 'final_price' in pricing, "Missing final_price"
        assert 'rule_scope' in pricing, "Missing rule_scope"
        assert 'rule_label' in pricing, "Missing rule_label"
        
        # Verify values for group rule (18% margin, 8% distributable)
        assert pricing['base_price'] == 10000
        assert pricing['effective_margin_pct'] == 18
        assert pricing['effective_distributable_margin_pct'] == 8
        # final = 10000 + 1800 + 800 = 12600
        assert pricing['final_price'] == 12600, f"Expected 12600, got {pricing['final_price']}"
        assert pricing['rule_scope'] == 'group'
        print(f"Resolved pricing: {pricing}")
    
    def test_resolve_distribution_global_fallback(self):
        """resolve-distribution falls back to global when no specific rule"""
        resolve_payload = {
            "product_id": "nonexistent-product-xyz",
            "vendor_price": 5000
        }
        response = requests.post(f"{BASE_URL}/api/admin/margin-rules/resolve-distribution", json=resolve_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get('ok') == True
        pricing = data.get('pricing', {})
        # Should fall back to global (20% margin, 10% distributable from distribution_settings)
        assert pricing['rule_scope'] == 'global'
        print(f"Global fallback pricing: {pricing}")
    
    def test_resolve_distribution_hierarchy_product_beats_group(self):
        """Product rule beats group rule in hierarchy"""
        # Create a product rule
        existing = requests.get(f"{BASE_URL}/api/admin/margin-rules?scope=product")
        for rule in existing.json():
            if rule.get('target_id') == 'test-product-v193':
                requests.delete(f"{BASE_URL}/api/admin/margin-rules/{rule['id']}")
        
        product_payload = {
            "scope": "product",
            "target_id": "test-product-v193",
            "target_name": "Test Product V193",
            "method": "percentage",
            "value": 25,
            "distributable_margin_pct": 12
        }
        response = requests.post(f"{BASE_URL}/api/admin/margin-rules", json=product_payload)
        assert response.status_code == 200
        
        # Resolve with both product_id and group_id - product should win
        resolve_payload = {
            "product_id": "test-product-v193",
            "group_id": "test-group-v193",
            "vendor_price": 10000
        }
        response = requests.post(f"{BASE_URL}/api/admin/margin-rules/resolve-distribution", json=resolve_payload)
        assert response.status_code == 200
        data = response.json()
        pricing = data.get('pricing', {})
        
        # Product rule should win (25% margin, 12% distributable)
        assert pricing['effective_margin_pct'] == 25, f"Expected 25, got {pricing['effective_margin_pct']}"
        assert pricing['effective_distributable_margin_pct'] == 12
        assert pricing['rule_scope'] == 'product'
        # final = 10000 + 2500 + 1200 = 13700
        assert pricing['final_price'] == 13700, f"Expected 13700, got {pricing['final_price']}"
        print(f"Product beats group: {pricing}")
    
    def test_cleanup_test_rules(self):
        """Cleanup test rules"""
        existing = requests.get(f"{BASE_URL}/api/admin/margin-rules")
        for rule in existing.json():
            if rule.get('target_id') in ['test-group-v193', 'test-product-v193']:
                requests.delete(f"{BASE_URL}/api/admin/margin-rules/{rule['id']}")
        print("Cleaned up test rules")


class TestDistributionMarginSettings:
    """Distribution margin settings API tests"""
    
    def test_get_settings(self):
        """GET /api/admin/distribution-margin/settings"""
        response = requests.get(f"{BASE_URL}/api/admin/distribution-margin/settings")
        assert response.status_code == 200
        data = response.json()
        assert data.get('ok') == True
        settings = data.get('settings', {})
        assert 'konekt_margin_pct' in settings
        assert 'distribution_margin_pct' in settings
        print(f"Settings: {settings}")
    
    def test_preview_distribution(self):
        """POST /api/admin/distribution-margin/preview"""
        payload = {
            "vendor_price_tax_inclusive": 10000,
            "konekt_margin_pct": 20,
            "distribution_margin_pct": 10,
            "affiliate_pct": 4,
            "sales_pct": 3,
            "discount_pct": 3
        }
        response = requests.post(f"{BASE_URL}/api/admin/distribution-margin/preview", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get('ok') == True
        pricing = data.get('pricing', {})
        assert pricing.get('final_price') == 13000
        print(f"Preview: {data}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
