"""
Test suite for Unified Commerce Fixes Pack
Tests: Marketplace filters, Product groups/subgroups, PDF hooks, Sales assist
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://konekt-live-payments.preview.emergentagent.com')

class TestMarketplaceFilters:
    """Tests for GET /api/marketplace/filters endpoint"""
    
    def test_marketplace_filters_returns_groups_and_subgroups(self):
        """Verify filters endpoint returns both groups and subgroups"""
        response = requests.get(f"{BASE_URL}/api/marketplace/filters")
        assert response.status_code == 200
        
        data = response.json()
        assert "groups" in data
        assert "subgroups" in data
        assert isinstance(data["groups"], list)
        assert isinstance(data["subgroups"], list)
    
    def test_marketplace_filters_groups_have_required_fields(self):
        """Verify each group has id, name, slug"""
        response = requests.get(f"{BASE_URL}/api/marketplace/filters")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["groups"]) >= 3, "Expected at least 3 seeded groups"
        
        for group in data["groups"]:
            assert "id" in group
            assert "name" in group
            assert "slug" in group
    
    def test_marketplace_filters_subgroups_have_required_fields(self):
        """Verify each subgroup has id, name, slug, group_slug"""
        response = requests.get(f"{BASE_URL}/api/marketplace/filters")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["subgroups"]) >= 6, "Expected at least 6 seeded subgroups"
        
        for subgroup in data["subgroups"]:
            assert "id" in subgroup
            assert "name" in subgroup
            assert "slug" in subgroup
            assert "group_slug" in subgroup


class TestAdminProductGroups:
    """Tests for GET /api/admin/product-groups endpoint"""
    
    def test_list_product_groups(self):
        """Verify product groups list returns data"""
        response = requests.get(f"{BASE_URL}/api/admin/product-groups")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 3, "Expected at least 3 seeded groups"
    
    def test_product_groups_have_required_fields(self):
        """Verify each group has required fields"""
        response = requests.get(f"{BASE_URL}/api/admin/product-groups")
        assert response.status_code == 200
        
        data = response.json()
        for group in data:
            assert "id" in group
            assert "name" in group
            assert "slug" in group
            assert "status" in group
            assert group["status"] == "active"


class TestAdminProductSubgroups:
    """Tests for /api/admin/product-subgroups endpoints"""
    
    def test_list_product_subgroups(self):
        """Verify product subgroups list returns data"""
        response = requests.get(f"{BASE_URL}/api/admin/product-subgroups")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 6, "Expected at least 6 seeded subgroups"
    
    def test_product_subgroups_have_required_fields(self):
        """Verify each subgroup has required fields"""
        response = requests.get(f"{BASE_URL}/api/admin/product-subgroups")
        assert response.status_code == 200
        
        data = response.json()
        for subgroup in data:
            assert "id" in subgroup
            assert "name" in subgroup
            assert "slug" in subgroup
            assert "group_slug" in subgroup
            assert "group_name" in subgroup
    
    def test_create_product_subgroup(self):
        """Test creating a new product subgroup"""
        payload = {
            "name": "TEST_Monitors",
            "slug": "test-monitors",
            "group_slug": "office-equipment",
            "group_name": "Office Equipment",
            "status": "active"
        }
        response = requests.post(f"{BASE_URL}/api/admin/product-subgroups", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["ok"] == True
        assert "id" in data
        
        # Verify it was created by fetching the list
        list_response = requests.get(f"{BASE_URL}/api/admin/product-subgroups")
        subgroups = list_response.json()
        created = [s for s in subgroups if s["slug"] == "test-monitors"]
        assert len(created) >= 1, "Created subgroup should appear in list"
    
    def test_filter_subgroups_by_group(self):
        """Test filtering subgroups by group_slug"""
        response = requests.get(f"{BASE_URL}/api/admin/product-subgroups?group_slug=promotional-materials")
        assert response.status_code == 200
        
        data = response.json()
        for subgroup in data:
            assert subgroup["group_slug"] == "promotional-materials"


class TestMarketplaceProductSearch:
    """Tests for GET /api/marketplace/products/search endpoint"""
    
    def test_search_products_returns_list(self):
        """Verify search returns a list of products"""
        response = requests.get(f"{BASE_URL}/api/marketplace/products/search")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0, "Expected some products in the marketplace"
    
    def test_search_products_by_query(self):
        """Test searching products by text query"""
        response = requests.get(f"{BASE_URL}/api/marketplace/products/search?q=laptop")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        # Should find at least the Laptop Backpack
        assert len(data) >= 1
        
        # Verify search term appears in results
        for product in data:
            name_lower = product.get("name", "").lower()
            desc_lower = product.get("description", "").lower()
            assert "laptop" in name_lower or "laptop" in desc_lower
    
    def test_search_products_by_group_slug(self):
        """Test filtering products by group_slug (maps to branch)"""
        # Note: The search uses $or with group_slug and branch
        response = requests.get(f"{BASE_URL}/api/marketplace/products/search?group_slug=KonektSeries")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
    
    def test_search_products_combined_filters(self):
        """Test combining search query with filters"""
        response = requests.get(f"{BASE_URL}/api/marketplace/products/search?q=cap")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)


class TestDocumentPDFHooks:
    """Tests for PDF download hooks"""
    
    def test_quote_pdf_not_found(self):
        """Test quote PDF returns 404 for non-existent quote"""
        response = requests.get(f"{BASE_URL}/api/docs/quote/nonexistent-id/pdf")
        assert response.status_code == 404
        
        data = response.json()
        assert "detail" in data
        assert "not found" in data["detail"].lower()
    
    def test_invoice_pdf_not_found(self):
        """Test invoice PDF returns 404 for non-existent invoice"""
        response = requests.get(f"{BASE_URL}/api/docs/invoice/nonexistent-id/pdf")
        assert response.status_code == 404
        
        data = response.json()
        assert "detail" in data
        assert "not found" in data["detail"].lower()


class TestSalesAssistRequests:
    """Tests for POST /api/sales/assist-requests endpoint"""
    
    def test_create_sales_assist_request(self):
        """Test creating a sales assist request"""
        payload = {
            "context_type": "cart",
            "context_summary": "3 items in cart",
            "items": [
                {"name": "Test Product", "price": 10000}
            ],
            "objective": "Corporate event merchandise",
            "timeline": "Next week",
            "notes": "Need bulk pricing"
        }
        response = requests.post(f"{BASE_URL}/api/sales/assist-requests", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["ok"] == True
        assert "id" in data
    
    def test_create_sales_assist_request_minimal(self):
        """Test creating a sales assist request with minimal data"""
        payload = {
            "context_type": "general",
            "context_summary": "General inquiry"
        }
        response = requests.post(f"{BASE_URL}/api/sales/assist-requests", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["ok"] == True
        assert "id" in data
    
    def test_create_sales_assist_request_service_context(self):
        """Test creating a sales assist request with service context"""
        payload = {
            "context_type": "service",
            "context_summary": "Service selected: Logo Design",
            "service_context": {"name": "Logo Design", "price": 75000},
            "objective": "Need a new company logo",
            "timeline": "2 weeks"
        }
        response = requests.post(f"{BASE_URL}/api/sales/assist-requests", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["ok"] == True


class TestVendorProducts:
    """Tests for POST /api/vendor/products endpoint"""
    
    def test_create_vendor_product(self):
        """Test creating a vendor product"""
        payload = {
            "name": "TEST_Vendor Product",
            "slug": "test-vendor-product",
            "group_slug": "office-equipment",
            "group_name": "Office Equipment",
            "subgroup_slug": "laptops",
            "subgroup_name": "Laptops",
            "price": 500000,
            "currency": "TZS",
            "description": "Test vendor product description",
            "status": "active"
        }
        response = requests.post(f"{BASE_URL}/api/vendor/products", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["ok"] == True
        assert "id" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
