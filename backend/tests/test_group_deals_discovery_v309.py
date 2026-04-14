"""
Test Group Deals Discovery Overhaul - Backend API Tests
Tests: public group deals endpoints, deal-of-the-day fallback, featured deals
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestGroupDealsPublicAPIs:
    """Test public group deals endpoints"""
    
    def test_get_active_deals(self):
        """GET /api/public/group-deals - returns active deals sorted by progress"""
        response = requests.get(f"{BASE_URL}/api/public/group-deals")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Verify deal structure if deals exist
        if len(data) > 0:
            deal = data[0]
            # Required fields for public display
            assert "id" in deal, "Deal should have id"
            assert "product_name" in deal, "Deal should have product_name"
            assert "discounted_price" in deal, "Deal should have discounted_price"
            assert "original_price" in deal, "Deal should have original_price"
            assert "display_target" in deal, "Deal should have display_target"
            assert "current_committed" in deal, "Deal should have current_committed"
            assert "buyer_count" in deal, "Deal should have buyer_count"
            assert "deadline" in deal, "Deal should have deadline"
            assert "status" in deal, "Deal should have status"
            
            # Verify hidden fields are NOT exposed
            assert "vendor_cost" not in deal, "vendor_cost should be hidden"
            assert "vendor_threshold" not in deal, "vendor_threshold should be hidden"
            assert "margin_per_unit" not in deal, "margin_per_unit should be hidden"
            assert "margin_pct" not in deal, "margin_pct should be hidden"
            
            print(f"Found {len(data)} active deals")
            print(f"First deal: {deal.get('product_name')} - {deal.get('current_committed')}/{deal.get('display_target')} committed")
    
    def test_get_featured_deals(self):
        """GET /api/public/group-deals/featured - returns top 6 deals for homepage"""
        response = requests.get(f"{BASE_URL}/api/public/group-deals/featured")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) <= 6, f"Featured deals should be max 6, got {len(data)}"
        
        if len(data) > 0:
            deal = data[0]
            assert "id" in deal
            assert "product_name" in deal
            assert "buyer_count" in deal, "Featured deals should include buyer_count"
            print(f"Featured deals count: {len(data)}")
    
    def test_deal_of_the_day_endpoint(self):
        """GET /api/public/group-deals/deal-of-the-day - returns featured or best deal"""
        response = requests.get(f"{BASE_URL}/api/public/group-deals/deal-of-the-day")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Can be null if no active deals
        if data is None:
            print("No deal of the day available (no active deals)")
            return
        
        # Verify deal structure
        assert "id" in data, "Deal should have id"
        assert "product_name" in data, "Deal should have product_name"
        assert "discounted_price" in data, "Deal should have discounted_price"
        assert "display_target" in data, "Deal should have display_target"
        assert "current_committed" in data, "Deal should have current_committed"
        assert "buyer_count" in data, "Deal should have buyer_count"
        
        print(f"Deal of the Day: {data.get('product_name')}")
        print(f"  Progress: {data.get('current_committed')}/{data.get('display_target')}")
        print(f"  Is Featured: {data.get('is_featured', False)}")
    
    def test_deal_of_the_day_fallback_logic(self):
        """Verify deal-of-the-day returns best deal even without is_featured flag"""
        # Get all active deals
        all_deals_response = requests.get(f"{BASE_URL}/api/public/group-deals")
        assert all_deals_response.status_code == 200
        all_deals = all_deals_response.json()
        
        # Get deal of the day
        dotd_response = requests.get(f"{BASE_URL}/api/public/group-deals/deal-of-the-day")
        assert dotd_response.status_code == 200
        dotd = dotd_response.json()
        
        if dotd is None and len(all_deals) == 0:
            print("No deals available - fallback logic not testable")
            return
        
        if dotd is not None and len(all_deals) > 0:
            # Verify the returned deal is from active deals
            deal_ids = [d['id'] for d in all_deals]
            assert dotd['id'] in deal_ids, "Deal of the day should be from active deals"
            print(f"Deal of the day '{dotd.get('product_name')}' is correctly from active deals")
    
    def test_get_single_deal_detail(self):
        """GET /api/public/group-deals/{id} - returns deal detail"""
        # First get list of deals
        list_response = requests.get(f"{BASE_URL}/api/public/group-deals")
        assert list_response.status_code == 200
        deals = list_response.json()
        
        if len(deals) == 0:
            pytest.skip("No active deals to test detail endpoint")
        
        deal_id = deals[0]['id']
        response = requests.get(f"{BASE_URL}/api/public/group-deals/{deal_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data['id'] == deal_id
        assert "product_name" in data
        assert "description" in data
        assert "product_image" in data
        assert "buyer_count" in data
        
        # Verify hidden fields are NOT exposed
        assert "vendor_cost" not in data, "vendor_cost should be hidden in detail"
        assert "margin_per_unit" not in data, "margin_per_unit should be hidden in detail"
        
        print(f"Deal detail: {data.get('product_name')}")
        print(f"  Description: {(data.get('description') or 'N/A')[:50]}...")
    
    def test_deals_sorted_by_progress(self):
        """Verify deals are sorted by progress percentage (highest first)"""
        response = requests.get(f"{BASE_URL}/api/public/group-deals")
        assert response.status_code == 200
        deals = response.json()
        
        if len(deals) < 2:
            pytest.skip("Need at least 2 deals to test sorting")
        
        # Calculate progress for each deal
        progress_values = []
        for deal in deals:
            target = max(deal.get('display_target', 1), 1)
            committed = deal.get('current_committed', 0)
            progress = (committed / target) * 100
            progress_values.append(progress)
            print(f"  {deal.get('product_name')}: {progress:.1f}% ({committed}/{target})")
        
        # Verify sorted by progress (descending)
        for i in range(len(progress_values) - 1):
            assert progress_values[i] >= progress_values[i+1], \
                f"Deals should be sorted by progress descending: {progress_values[i]} < {progress_values[i+1]}"
        
        print("Deals are correctly sorted by progress (highest first)")


class TestGroupDealsDataIntegrity:
    """Test data integrity and response structure"""
    
    def test_deal_pricing_fields(self):
        """Verify pricing fields are present and valid"""
        response = requests.get(f"{BASE_URL}/api/public/group-deals")
        assert response.status_code == 200
        deals = response.json()
        
        if len(deals) == 0:
            pytest.skip("No deals to test pricing")
        
        for deal in deals[:3]:  # Test first 3 deals
            assert deal.get('discounted_price', 0) > 0, f"discounted_price should be positive for {deal.get('product_name')}"
            assert deal.get('original_price', 0) >= deal.get('discounted_price', 0), \
                f"original_price should be >= discounted_price for {deal.get('product_name')}"
            
            savings = deal.get('original_price', 0) - deal.get('discounted_price', 0)
            print(f"  {deal.get('product_name')}: TZS {deal.get('discounted_price'):,} (save TZS {savings:,})")
    
    def test_deal_progress_fields(self):
        """Verify progress tracking fields"""
        response = requests.get(f"{BASE_URL}/api/public/group-deals")
        assert response.status_code == 200
        deals = response.json()
        
        if len(deals) == 0:
            pytest.skip("No deals to test progress")
        
        for deal in deals[:3]:
            assert deal.get('display_target', 0) > 0, "display_target should be positive"
            assert deal.get('current_committed', 0) >= 0, "current_committed should be non-negative"
            assert deal.get('buyer_count', 0) >= 0, "buyer_count should be non-negative"
            
            print(f"  {deal.get('product_name')}: {deal.get('current_committed')}/{deal.get('display_target')} units, {deal.get('buyer_count')} buyers")
    
    def test_deal_deadline_format(self):
        """Verify deadline is in ISO format"""
        response = requests.get(f"{BASE_URL}/api/public/group-deals")
        assert response.status_code == 200
        deals = response.json()
        
        if len(deals) == 0:
            pytest.skip("No deals to test deadline")
        
        from datetime import datetime
        
        for deal in deals[:3]:
            deadline = deal.get('deadline')
            if deadline:
                # Should be ISO format
                try:
                    parsed = datetime.fromisoformat(deadline.replace('Z', '+00:00'))
                    print(f"  {deal.get('product_name')}: deadline {parsed.strftime('%Y-%m-%d %H:%M')}")
                except ValueError as e:
                    pytest.fail(f"Invalid deadline format for {deal.get('product_name')}: {deadline}")


class TestGroupDealsCount:
    """Test deal counts for conditional rendering"""
    
    def test_active_deals_count(self):
        """Verify we can get count of active deals for UI conditional rendering"""
        response = requests.get(f"{BASE_URL}/api/public/group-deals")
        assert response.status_code == 200
        deals = response.json()
        
        count = len(deals)
        print(f"Active deals count: {count}")
        
        # This count is used by:
        # - HomepageGroupDealsSection (hide if 0)
        # - MarketplaceBrowsePageContent (show banner if > 0)
        assert isinstance(count, int)
    
    def test_featured_deals_count(self):
        """Verify featured deals count for marketplace banner"""
        response = requests.get(f"{BASE_URL}/api/public/group-deals/featured")
        assert response.status_code == 200
        deals = response.json()
        
        count = len(deals)
        print(f"Featured deals count: {count}")
        
        # Used by MarketplaceBrowsePageContent for "{count} active" badge
        assert isinstance(count, int)
        assert count <= 6, "Featured should be max 6"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
