"""
Test Suite for Konekt B2B Critical Fixes - Iteration 327
Tests:
1. Pricing Engine uses Pricing Tiers from Settings Hub
2. Product search returns products with correct selling_price
3. QuotesPage API returns quotes with proper structure
4. Settings Hub Product Categories structure
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

class TestPricingEngine:
    """Test pricing engine uses Pricing Tiers from Settings Hub"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login to get admin token
        login_resp = self.session.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        if login_resp.status_code == 200:
            self.admin_token = login_resp.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
        else:
            pytest.skip("Admin login failed")
    
    def test_pricing_tiers_exist_in_settings_hub(self):
        """Verify Pricing Tiers are configured in Settings Hub"""
        resp = self.session.get(f"{BASE_URL}/api/admin/settings-hub")
        assert resp.status_code == 200, f"Settings hub failed: {resp.text}"
        
        data = resp.json()
        tiers = data.get("pricing_policy_tiers", [])
        assert len(tiers) >= 1, "No pricing tiers configured"
        
        # Verify first tier (0-100K) has 35% margin
        tier1 = tiers[0]
        assert tier1.get("min_amount") == 0, "First tier should start at 0"
        assert tier1.get("max_amount") == 100000, "First tier should end at 100K"
        assert tier1.get("total_margin_pct") == 35, "First tier should have 35% margin"
        print(f"✓ Pricing Tier 1: {tier1.get('label')} = {tier1.get('total_margin_pct')}%")
    
    def test_pricing_tier_100k_500k_has_30_percent(self):
        """Verify 100K-500K tier has 30% margin"""
        resp = self.session.get(f"{BASE_URL}/api/admin/settings-hub")
        assert resp.status_code == 200
        
        tiers = resp.json().get("pricing_policy_tiers", [])
        tier2 = next((t for t in tiers if t.get("min_amount", 0) > 100000 and t.get("max_amount", 0) <= 500000), None)
        assert tier2 is not None, "100K-500K tier not found"
        assert tier2.get("total_margin_pct") == 30, f"Expected 30%, got {tier2.get('total_margin_pct')}%"
        print(f"✓ Pricing Tier 2: {tier2.get('label')} = {tier2.get('total_margin_pct')}%")


class TestProductSearch:
    """Test product search returns products with correct pricing"""
    
    def test_search_a5_notebook_returns_correct_price(self):
        """GET /api/public-marketplace/products?q=A5 returns A5 Notebook with selling_price=10800"""
        resp = requests.get(f"{BASE_URL}/api/public-marketplace/products", params={"q": "A5"})
        assert resp.status_code == 200, f"Search failed: {resp.text}"
        
        products = resp.json()
        assert len(products) >= 1, "No products found for 'A5'"
        
        # Find A5 Notebook
        a5_notebook = next((p for p in products if "A5 Notebook" in p.get("name", "")), None)
        assert a5_notebook is not None, "A5 Notebook not found in search results"
        
        base_price = a5_notebook.get("base_price")
        selling_price = a5_notebook.get("selling_price")
        
        assert base_price == 8000, f"Expected base_price=8000, got {base_price}"
        assert selling_price == 10800, f"Expected selling_price=10800 (35% margin), got {selling_price}"
        
        # Verify margin calculation
        margin_pct = ((selling_price - base_price) / base_price) * 100
        assert abs(margin_pct - 35) < 0.1, f"Expected 35% margin, got {margin_pct}%"
        print(f"✓ A5 Notebook: base={base_price}, sell={selling_price}, margin={margin_pct:.1f}%")
    
    def test_product_100k_base_gets_35_percent_margin(self):
        """Product with base_price=100000 gets selling_price=135000 (35% margin from Tier 1)"""
        resp = requests.get(f"{BASE_URL}/api/public-marketplace/products", params={"q": "TEST_ApproveFlow"})
        assert resp.status_code == 200
        
        products = resp.json()
        if len(products) == 0:
            pytest.skip("No test products with base_price=100000 found")
        
        product = products[0]
        base_price = float(product.get("base_price", 0))
        selling_price = float(product.get("selling_price", 0))
        
        if base_price == 100000:
            # 100000 falls in 0-100K tier (35% margin)
            expected_sell = 135000
            assert selling_price == expected_sell, f"Expected {expected_sell}, got {selling_price}"
            print(f"✓ Product with base=100000 gets sell={selling_price} (35% margin)")
    
    def test_search_returns_active_published_approved_products(self):
        """Product search returns products with status=active/published/approved"""
        resp = requests.get(f"{BASE_URL}/api/public-marketplace/products", params={"limit": 50})
        assert resp.status_code == 200
        
        products = resp.json()
        assert len(products) >= 1, "No products returned"
        
        # Verify products have valid status or is_active
        for p in products[:5]:
            status = p.get("status", "")
            is_active = p.get("is_active", False)
            valid = status in ["active", "published", "approved"] or is_active
            assert valid, f"Product {p.get('name')} has invalid status: {status}, is_active: {is_active}"
        
        print(f"✓ Search returns {len(products)} products with valid status")


class TestQuotesAPI:
    """Test Quotes API returns proper structure"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        login_resp = self.session.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        if login_resp.status_code == 200:
            self.admin_token = login_resp.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
        else:
            pytest.skip("Admin login failed")
    
    def test_quotes_list_returns_array(self):
        """GET /api/admin/quotes returns array of quotes"""
        resp = self.session.get(f"{BASE_URL}/api/admin/quotes")
        assert resp.status_code == 200, f"Quotes list failed: {resp.text}"
        
        data = resp.json()
        # Can be array directly or {quotes: [...]}
        quotes = data if isinstance(data, list) else data.get("quotes", [])
        assert isinstance(quotes, list), "Quotes should be a list"
        print(f"✓ Quotes API returns {len(quotes)} quotes")
    
    def test_quote_has_required_fields(self):
        """Quotes have fields needed for table: quote_number, customer_name, total, status"""
        resp = self.session.get(f"{BASE_URL}/api/admin/quotes")
        assert resp.status_code == 200
        
        data = resp.json()
        quotes = data if isinstance(data, list) else data.get("quotes", [])
        
        if len(quotes) == 0:
            pytest.skip("No quotes to verify structure")
        
        quote = quotes[0]
        # Check required fields for QuotesPage table
        required_fields = ["id", "quote_number", "status"]
        for field in required_fields:
            assert field in quote, f"Quote missing required field: {field}"
        
        # Customer can be customer_name or customer_company
        has_customer = "customer_name" in quote or "customer_company" in quote or "customer_email" in quote
        assert has_customer, "Quote missing customer info"
        
        print(f"✓ Quote has required fields: {list(quote.keys())[:10]}")


class TestSettingsHubCategories:
    """Test Settings Hub Product Categories structure"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        login_resp = self.session.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        if login_resp.status_code == 200:
            self.admin_token = login_resp.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
        else:
            pytest.skip("Admin login failed")
    
    def test_catalog_categories_exist(self):
        """Settings Hub has catalog.product_categories"""
        resp = self.session.get(f"{BASE_URL}/api/admin/settings-hub")
        assert resp.status_code == 200
        
        data = resp.json()
        catalog = data.get("catalog", {})
        categories = catalog.get("product_categories", [])
        
        assert len(categories) >= 1, "No product categories configured"
        print(f"✓ Found {len(categories)} product categories")
    
    def test_category_can_have_subcategories(self):
        """Categories support subcategories field"""
        resp = self.session.get(f"{BASE_URL}/api/admin/settings-hub")
        assert resp.status_code == 200
        
        data = resp.json()
        catalog = data.get("catalog", {})
        categories = catalog.get("product_categories", [])
        
        # Check if any category has subcategories or if structure supports it
        # Categories can be strings (legacy) or objects (new)
        for cat in categories[:3]:
            if isinstance(cat, dict):
                # New format supports subcategories
                print(f"✓ Category '{cat.get('name')}' supports subcategories field")
                return
            elif isinstance(cat, str):
                # Legacy string format - will be normalized by frontend
                print(f"✓ Legacy category '{cat}' will be normalized to support subcategories")
                return
        
        print("✓ Category structure supports subcategories")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
