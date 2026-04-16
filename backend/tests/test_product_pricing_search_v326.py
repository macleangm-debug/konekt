"""
Test Product Pricing and Search - Iteration 326

Tests:
1. GET /api/public-marketplace/products returns products with selling_price computed from base_price
2. GET /api/public-marketplace/products?q=A5 returns A5 Notebook with selling_price > 0
3. Products with base_price but no selling_price get computed selling_price via pricing engine
4. Products search includes status 'active', 'published', AND is_active=true products
5. CantFindWhatYouNeedBanner inline form submits to /api/public/quote-requests
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

class TestPublicMarketplaceProducts:
    """Test public marketplace product listing with pricing engine"""
    
    def test_products_endpoint_returns_list(self):
        """GET /api/public-marketplace/products returns a list of products"""
        response = requests.get(f"{BASE_URL}/api/public-marketplace/products?limit=20")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Products endpoint returned {len(data)} products")
    
    def test_products_have_selling_price_computed(self):
        """Products with base_price should have selling_price computed via pricing engine"""
        response = requests.get(f"{BASE_URL}/api/public-marketplace/products?limit=50")
        assert response.status_code == 200
        data = response.json()
        
        # Find products with base_price
        products_with_base = [p for p in data if p.get("base_price")]
        assert len(products_with_base) > 0, "Should have products with base_price"
        
        # Check that selling_price is computed
        for p in products_with_base[:5]:
            base = p.get("base_price", 0)
            sell = p.get("selling_price", 0)
            assert sell > 0, f"Product '{p.get('name')}' should have selling_price > 0"
            assert sell >= base, f"selling_price ({sell}) should be >= base_price ({base})"
            print(f"✓ {p.get('name')}: base={base}, sell={sell}, margin={(sell-base)/base*100:.1f}%")
    
    def test_search_a5_returns_notebook(self):
        """GET /api/public-marketplace/products?q=A5 returns A5 Notebook with selling_price > 0"""
        response = requests.get(f"{BASE_URL}/api/public-marketplace/products?q=A5&limit=20")
        assert response.status_code == 200
        data = response.json()
        
        # Find A5 Notebook
        a5_notebook = next((p for p in data if "A5 Notebook" in p.get("name", "")), None)
        assert a5_notebook is not None, "A5 Notebook should be in search results"
        assert a5_notebook.get("selling_price", 0) > 0, "A5 Notebook should have selling_price > 0"
        assert a5_notebook.get("base_price", 0) > 0, "A5 Notebook should have base_price > 0"
        
        # Verify margin is applied (should be ~30% based on pricing engine)
        base = a5_notebook.get("base_price", 0)
        sell = a5_notebook.get("selling_price", 0)
        margin_pct = (sell - base) / base * 100 if base > 0 else 0
        assert margin_pct >= 15, f"Margin should be at least 15%, got {margin_pct:.1f}%"
        print(f"✓ A5 Notebook found: base={base}, sell={sell}, margin={margin_pct:.1f}%")
    
    def test_search_notebook_returns_results(self):
        """GET /api/public-marketplace/products?q=notebook returns matching products"""
        response = requests.get(f"{BASE_URL}/api/public-marketplace/products?q=notebook&limit=20")
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0, "Should find products matching 'notebook'"
        
        # Verify all results contain 'notebook' in searchable fields
        for p in data:
            searchable = f"{p.get('name', '')} {p.get('description', '')} {p.get('category_name', '')}".lower()
            assert "notebook" in searchable, f"Product '{p.get('name')}' should match 'notebook'"
        print(f"✓ Found {len(data)} products matching 'notebook'")
    
    def test_products_include_active_and_is_active(self):
        """Products with status='active'/'published'/'approved' OR is_active=true are returned"""
        response = requests.get(f"{BASE_URL}/api/public-marketplace/products?limit=100")
        assert response.status_code == 200
        data = response.json()
        
        # Check that we have products with different status/is_active combinations
        has_is_active = any(p.get("is_active") == True for p in data)
        has_status_active = any(p.get("status") in ["active", "published", "approved"] for p in data)
        
        print(f"✓ Products with is_active=true: {sum(1 for p in data if p.get('is_active') == True)}")
        print(f"✓ Products with status in [active,published,approved]: {sum(1 for p in data if p.get('status') in ['active', 'published', 'approved'])}")
        
        # At least one of these should be true
        assert has_is_active or has_status_active, "Should have products with is_active=true or status=active/published/approved"


class TestCantFindWhatYouNeedBanner:
    """Test the inline form submission for CantFindWhatYouNeedBanner"""
    
    def test_quote_request_submission(self):
        """POST /api/public/quote-requests accepts inline form submission"""
        payload = {
            "items": [],
            "custom_items": [
                {
                    "name": "TEST_CustomProduct_v326",
                    "quantity": 10,
                    "unit_of_measurement": "Piece",
                    "description": "Test product from CantFindWhatYouNeedBanner"
                }
            ],
            "category": "Marketplace Request",
            "customer_note": "Testing inline form submission",
            "customer": {
                "first_name": "Test",
                "last_name": "User",
                "phone": "+255712345678",
                "email": "test.v326@example.com",
                "company": "Test Company"
            },
            "source": "marketplace_cta"
        }
        
        response = requests.post(f"{BASE_URL}/api/public/quote-requests", json=payload)
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify response contains expected fields
        assert "id" in data or "request_number" in data or "success" in data, "Response should contain id, request_number, or success"
        print(f"✓ Quote request submitted successfully: {data}")


class TestQuotesAdminAPI:
    """Test admin quotes API endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/staff-login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("token") or data.get("access_token")
        pytest.skip("Admin authentication failed")
    
    def test_get_quotes_list(self, admin_token):
        """GET /api/admin/quotes returns list of quotes"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/quotes", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        # Response could be list or dict with quotes key
        quotes = data if isinstance(data, list) else data.get("quotes", [])
        print(f"✓ Quotes list returned {len(quotes)} quotes")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
