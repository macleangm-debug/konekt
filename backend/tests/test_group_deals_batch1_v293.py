"""
Test Group Deals Batch 1 Pre-Deployment Fixes:
1. Product selector for campaign creation (products from marketplace_listings)
2. Structured pricing: Base Price (read-only), Vendor Best Price, Deal Price
3. Live profit calculator validation (margin >= 5%)
4. Number formatting verification (API returns proper numeric values)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestProductSearchEndpoint:
    """Test GET /api/admin/group-deals/products/search endpoint"""
    
    def test_products_search_returns_list(self):
        """Products search returns list of products from marketplace_listings"""
        response = requests.get(f"{BASE_URL}/api/admin/group-deals/products/search")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Products search returned {len(data)} products")
    
    def test_products_search_has_required_fields(self):
        """Each product has required fields: id, name, category, base_price, image"""
        response = requests.get(f"{BASE_URL}/api/admin/group-deals/products/search")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            product = data[0]
            required_fields = ['id', 'name', 'category', 'base_price', 'image']
            for field in required_fields:
                assert field in product, f"Missing field: {field}"
            print(f"PASS: Product has all required fields: {required_fields}")
        else:
            pytest.skip("No products in catalog to test")
    
    def test_products_search_with_query_filters(self):
        """Search with query parameter filters products"""
        response = requests.get(f"{BASE_URL}/api/admin/group-deals/products/search?q=chair")
        assert response.status_code == 200
        data = response.json()
        
        # Should return filtered results
        for product in data:
            # Check if 'chair' appears in name, description, or category
            name_lower = product.get('name', '').lower()
            desc_lower = product.get('description', '').lower()
            cat_lower = product.get('category', '').lower()
            assert 'chair' in name_lower or 'chair' in desc_lower or 'chair' in cat_lower, \
                f"Product {product.get('name')} doesn't match 'chair' query"
        print(f"PASS: Search query 'chair' returned {len(data)} matching products")
    
    def test_products_search_empty_query_returns_all(self):
        """Empty query returns all active products"""
        response = requests.get(f"{BASE_URL}/api/admin/group-deals/products/search?q=")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Empty query returned {len(data)} products")
    
    def test_products_search_name_derived_from_slug(self):
        """Product name is derived from slug (e.g., 'company-stamps' -> 'Company Stamps')"""
        response = requests.get(f"{BASE_URL}/api/admin/group-deals/products/search")
        assert response.status_code == 200
        data = response.json()
        
        for product in data:
            slug = product.get('slug', '')
            name = product.get('name', '')
            if slug:
                # Name should be title-cased version of slug with hyphens replaced by spaces
                expected_name = slug.replace('-', ' ').title()
                assert name == expected_name, f"Name '{name}' doesn't match expected '{expected_name}' from slug '{slug}'"
        print(f"PASS: Product names correctly derived from slugs")


class TestCampaignCreationWithProduct:
    """Test campaign creation with product_id from catalog"""
    
    def test_create_campaign_with_product_id(self):
        """Create campaign with product_id from catalog"""
        # First get a product
        products_response = requests.get(f"{BASE_URL}/api/admin/group-deals/products/search")
        assert products_response.status_code == 200
        products = products_response.json()
        
        if len(products) == 0:
            pytest.skip("No products in catalog")
        
        product = products[0]
        unique_id = str(uuid.uuid4())[:6]
        
        payload = {
            "product_name": f"TEST_BATCH1_{product['name']}_{unique_id}",
            "product_id": product['id'],
            "product_image": product.get('image', ''),
            "category": product.get('category', ''),
            "description": f"Test campaign for {product['name']}",
            "vendor_cost": 80000,
            "original_price": 120000,  # Base price from product (or calculated)
            "discounted_price": 100000,  # Deal price
            "display_target": 20,
            "vendor_threshold": 10,
            "duration_days": 7,
            "commission_mode": "none",
            "affiliate_share_pct": 0,
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/group-deals/campaigns", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Verify product_id is stored
        assert data.get('product_id') == product['id'], "product_id not stored correctly"
        assert data.get('product_name') == payload['product_name']
        print(f"PASS: Campaign created with product_id: {product['id']}")
        
        # Cleanup - cancel the campaign
        campaign_id = data.get('id')
        if campaign_id:
            requests.post(f"{BASE_URL}/api/admin/group-deals/campaigns/{campaign_id}/cancel")


class TestStructuredPricing:
    """Test structured pricing: Base Price, Vendor Best Price, Deal Price"""
    
    def test_pricing_fields_in_campaign(self):
        """Campaign has all pricing fields: vendor_cost, original_price, discounted_price"""
        response = requests.get(f"{BASE_URL}/api/admin/group-deals/campaigns")
        assert response.status_code == 200
        campaigns = response.json()
        
        if len(campaigns) == 0:
            pytest.skip("No campaigns to test")
        
        campaign = campaigns[0]
        pricing_fields = ['vendor_cost', 'original_price', 'discounted_price', 'margin_per_unit', 'margin_pct']
        for field in pricing_fields:
            assert field in campaign, f"Missing pricing field: {field}"
        print(f"PASS: Campaign has all pricing fields: {pricing_fields}")
    
    def test_margin_calculation_correct(self):
        """Margin = discounted_price - vendor_cost"""
        response = requests.get(f"{BASE_URL}/api/admin/group-deals/campaigns")
        assert response.status_code == 200
        campaigns = response.json()
        
        for campaign in campaigns:
            vendor_cost = campaign.get('vendor_cost', 0)
            discounted_price = campaign.get('discounted_price', 0)
            margin_per_unit = campaign.get('margin_per_unit', 0)
            
            expected_margin = discounted_price - vendor_cost
            assert abs(margin_per_unit - expected_margin) < 0.01, \
                f"Margin mismatch: expected {expected_margin}, got {margin_per_unit}"
        print(f"PASS: Margin calculations correct for {len(campaigns)} campaigns")
    
    def test_margin_percentage_calculation(self):
        """Margin % = (margin / discounted_price) * 100"""
        response = requests.get(f"{BASE_URL}/api/admin/group-deals/campaigns")
        assert response.status_code == 200
        campaigns = response.json()
        
        for campaign in campaigns:
            discounted_price = campaign.get('discounted_price', 0)
            margin_per_unit = campaign.get('margin_per_unit', 0)
            margin_pct = campaign.get('margin_pct', 0)
            
            if discounted_price > 0:
                expected_pct = round((margin_per_unit / discounted_price) * 100, 1)
                assert abs(margin_pct - expected_pct) < 0.2, \
                    f"Margin % mismatch: expected {expected_pct}, got {margin_pct}"
        print(f"PASS: Margin percentage calculations correct")


class TestMarginValidation:
    """Test margin validation (>= 5% threshold)"""
    
    def test_reject_campaign_below_minimum_margin(self):
        """Campaign creation rejected if margin < 5%"""
        unique_id = str(uuid.uuid4())[:6]
        
        # Create campaign with 3% margin (below 5% threshold)
        # vendor_cost=97, deal_price=100 -> margin=3, margin%=3%
        payload = {
            "product_name": f"TEST_LOW_MARGIN_{unique_id}",
            "vendor_cost": 97000,
            "original_price": 120000,
            "discounted_price": 100000,  # margin = 3000, margin% = 3%
            "display_target": 10,
            "duration_days": 7,
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/group-deals/campaigns", json=payload)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        
        error_detail = response.json().get('detail', '')
        assert 'margin' in error_detail.lower() or 'threshold' in error_detail.lower(), \
            f"Error should mention margin threshold: {error_detail}"
        print(f"PASS: Campaign with 3% margin rejected: {error_detail}")
    
    def test_reject_campaign_negative_margin(self):
        """Campaign creation rejected if deal price < vendor cost"""
        unique_id = str(uuid.uuid4())[:6]
        
        payload = {
            "product_name": f"TEST_NEGATIVE_MARGIN_{unique_id}",
            "vendor_cost": 100000,
            "original_price": 120000,
            "discounted_price": 90000,  # Below vendor cost
            "display_target": 10,
            "duration_days": 7,
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/group-deals/campaigns", json=payload)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        
        error_detail = response.json().get('detail', '')
        assert 'below' in error_detail.lower() or 'vendor' in error_detail.lower(), \
            f"Error should mention vendor cost: {error_detail}"
        print(f"PASS: Campaign with negative margin rejected: {error_detail}")
    
    def test_accept_campaign_at_minimum_margin(self):
        """Campaign creation accepted at exactly 5% margin"""
        unique_id = str(uuid.uuid4())[:6]
        
        # 5% margin: vendor_cost=95000, deal_price=100000 -> margin=5000, margin%=5%
        payload = {
            "product_name": f"TEST_MIN_MARGIN_{unique_id}",
            "vendor_cost": 95000,
            "original_price": 120000,
            "discounted_price": 100000,
            "display_target": 10,
            "duration_days": 7,
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/group-deals/campaigns", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get('margin_pct') >= 5, f"Margin should be >= 5%, got {data.get('margin_pct')}"
        print(f"PASS: Campaign with 5% margin accepted, margin_pct={data.get('margin_pct')}")
        
        # Cleanup
        campaign_id = data.get('id')
        if campaign_id:
            requests.post(f"{BASE_URL}/api/admin/group-deals/campaigns/{campaign_id}/cancel")


class TestNumberFormatting:
    """Test that API returns proper numeric values for formatting"""
    
    def test_campaign_prices_are_numbers(self):
        """Campaign prices are returned as numbers (not strings)"""
        response = requests.get(f"{BASE_URL}/api/admin/group-deals/campaigns")
        assert response.status_code == 200
        campaigns = response.json()
        
        if len(campaigns) == 0:
            pytest.skip("No campaigns to test")
        
        campaign = campaigns[0]
        numeric_fields = ['vendor_cost', 'original_price', 'discounted_price', 'margin_per_unit', 'margin_pct']
        
        for field in numeric_fields:
            value = campaign.get(field)
            assert isinstance(value, (int, float)), f"{field} should be numeric, got {type(value)}"
        print(f"PASS: All price fields are numeric types")
    
    def test_public_deals_prices_are_numbers(self):
        """Public deals endpoint returns numeric prices"""
        response = requests.get(f"{BASE_URL}/api/public/group-deals")
        assert response.status_code == 200
        deals = response.json()
        
        if len(deals) == 0:
            pytest.skip("No public deals to test")
        
        deal = deals[0]
        numeric_fields = ['original_price', 'discounted_price', 'discount_pct', 'display_target', 'current_committed']
        
        for field in numeric_fields:
            value = deal.get(field)
            assert isinstance(value, (int, float)), f"{field} should be numeric, got {type(value)}"
        print(f"PASS: Public deals have numeric price fields")
    
    def test_featured_deals_prices_are_numbers(self):
        """Featured deals endpoint returns numeric prices"""
        response = requests.get(f"{BASE_URL}/api/public/group-deals/featured")
        assert response.status_code == 200
        deals = response.json()
        
        if len(deals) == 0:
            pytest.skip("No featured deals to test")
        
        deal = deals[0]
        numeric_fields = ['original_price', 'discounted_price', 'discount_pct']
        
        for field in numeric_fields:
            value = deal.get(field)
            assert isinstance(value, (int, float)), f"{field} should be numeric, got {type(value)}"
        print(f"PASS: Featured deals have numeric price fields")


class TestVBOFormattedUnits:
    """Test VBO info shows formatted unit counts"""
    
    def test_finalized_campaign_has_vbo_info(self):
        """Finalized campaigns have VBO info with unit counts"""
        response = requests.get(f"{BASE_URL}/api/admin/group-deals/campaigns?status=finalized")
        assert response.status_code == 200
        campaigns = response.json()
        
        finalized = [c for c in campaigns if c.get('status') == 'finalized']
        
        if len(finalized) == 0:
            # Check all campaigns for finalized ones
            all_response = requests.get(f"{BASE_URL}/api/admin/group-deals/campaigns")
            all_campaigns = all_response.json()
            finalized = [c for c in all_campaigns if c.get('status') == 'finalized']
        
        if len(finalized) == 0:
            pytest.skip("No finalized campaigns to test VBO info")
        
        campaign = finalized[0]
        assert 'vbo_number' in campaign, "Finalized campaign should have vbo_number"
        assert 'total_units_ordered' in campaign, "Finalized campaign should have total_units_ordered"
        assert 'orders_created' in campaign, "Finalized campaign should have orders_created"
        
        # Verify numeric types
        assert isinstance(campaign.get('total_units_ordered'), (int, float))
        assert isinstance(campaign.get('orders_created'), (int, float))
        print(f"PASS: Finalized campaign has VBO info: {campaign.get('vbo_number')}, units={campaign.get('total_units_ordered')}")


class TestProductSearchEdgeCases:
    """Test edge cases for product search"""
    
    def test_search_nonexistent_product(self):
        """Search for non-existent product returns empty list"""
        response = requests.get(f"{BASE_URL}/api/admin/group-deals/products/search?q=xyznonexistent123")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0, f"Expected empty list for non-existent product, got {len(data)} results"
        print(f"PASS: Non-existent product search returns empty list")
    
    def test_search_special_characters(self):
        """Search with special characters doesn't crash"""
        response = requests.get(f"{BASE_URL}/api/admin/group-deals/products/search?q=test%20product")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Search with special characters works, returned {len(data)} results")
    
    def test_search_category_filter(self):
        """Search can filter by category"""
        response = requests.get(f"{BASE_URL}/api/admin/group-deals/products/search?q=furniture")
        assert response.status_code == 200
        data = response.json()
        
        # Should return products in furniture category
        for product in data:
            cat = product.get('category', '').lower()
            name = product.get('name', '').lower()
            desc = product.get('description', '').lower()
            assert 'furniture' in cat or 'furniture' in name or 'furniture' in desc, \
                f"Product doesn't match 'furniture': {product.get('name')}"
        print(f"PASS: Category search 'furniture' returned {len(data)} products")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
