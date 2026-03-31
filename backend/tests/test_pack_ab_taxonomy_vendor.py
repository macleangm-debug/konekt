"""
Pack A+B Backend Tests - Taxonomy, Vendor Submissions, Admin Catalog
Tests for:
- GET /api/marketplace/taxonomy (public taxonomy tree)
- GET /api/marketplace/products/search with taxonomy filters
- GET /api/admin/catalog/summary
- POST /api/admin/catalog/groups (create group)
- POST /api/admin/catalog/categories (create category)
- POST /api/vendor/catalog/submissions (vendor product submission)
- GET /api/vendor/catalog/submissions (vendor's submissions)
- POST /api/admin/catalog/submissions/{id}/approve (approve + publish)
- POST /api/admin/catalog/submissions/{id}/reject (reject)
- E2E: Approved vendor product appears in marketplace search
"""
import pytest
import requests
import os
import time
from uuid import uuid4

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
VENDOR_EMAIL = "demo.partner@konekt.com"
VENDOR_PASSWORD = "Partner123!"


class TestPublicTaxonomy:
    """Public taxonomy endpoint tests"""
    
    def test_get_taxonomy_returns_groups_categories_subcategories(self):
        """GET /api/marketplace/taxonomy returns full taxonomy tree"""
        response = requests.get(f"{BASE_URL}/api/marketplace/taxonomy")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "groups" in data, "Response should have 'groups'"
        assert "categories" in data, "Response should have 'categories'"
        assert "subcategories" in data, "Response should have 'subcategories'"
        
        # Verify counts (4 groups, 23+ categories, 59+ subcategories per seed)
        assert len(data["groups"]) >= 4, f"Expected at least 4 groups, got {len(data['groups'])}"
        assert len(data["categories"]) >= 20, f"Expected at least 20 categories, got {len(data['categories'])}"
        assert len(data["subcategories"]) >= 50, f"Expected at least 50 subcategories, got {len(data['subcategories'])}"
        
        # Verify group structure
        for group in data["groups"]:
            assert "id" in group, "Group should have 'id'"
            assert "name" in group, "Group should have 'name'"
            assert "slug" in group, "Group should have 'slug'"
        
        print(f"✓ Taxonomy: {len(data['groups'])} groups, {len(data['categories'])} categories, {len(data['subcategories'])} subcategories")


class TestMarketplaceProductSearch:
    """Marketplace product search with taxonomy filters"""
    
    def test_search_products_no_filter(self):
        """GET /api/marketplace/products/search returns products"""
        response = requests.get(f"{BASE_URL}/api/marketplace/products/search")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should have at least some products"
        print(f"✓ Product search (no filter): {len(data)} products")
    
    def test_search_products_by_group_id(self):
        """GET /api/marketplace/products/search?group_id=<id> filters by group"""
        # First get taxonomy to get a valid group_id
        tax_response = requests.get(f"{BASE_URL}/api/marketplace/taxonomy")
        assert tax_response.status_code == 200
        taxonomy = tax_response.json()
        
        if not taxonomy["groups"]:
            pytest.skip("No groups in taxonomy")
        
        group = taxonomy["groups"][0]
        group_id = group["id"]
        
        # Search with group filter
        response = requests.get(f"{BASE_URL}/api/marketplace/products/search?group_id={group_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Verify all returned products have the correct group_id
        for product in data:
            if product.get("group_id"):
                assert product["group_id"] == group_id, f"Product {product.get('name')} has wrong group_id"
        
        print(f"✓ Product search by group '{group['name']}': {len(data)} products")
    
    def test_search_products_by_category_id(self):
        """GET /api/marketplace/products/search?category_id=<id> filters by category"""
        tax_response = requests.get(f"{BASE_URL}/api/marketplace/taxonomy")
        assert tax_response.status_code == 200
        taxonomy = tax_response.json()
        
        if not taxonomy["categories"]:
            pytest.skip("No categories in taxonomy")
        
        category = taxonomy["categories"][0]
        category_id = category["id"]
        
        response = requests.get(f"{BASE_URL}/api/marketplace/products/search?category_id={category_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Product search by category '{category['name']}': {len(data)} products")


class TestAdminCatalogSummary:
    """Admin catalog summary endpoint tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.text}")
        return response.json().get("token")
    
    def test_get_catalog_summary(self, admin_token):
        """GET /api/admin/catalog/summary returns counts"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/catalog/summary", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "groups" in data, "Should have 'groups' count"
        assert "categories" in data, "Should have 'categories' count"
        assert "subcategories" in data, "Should have 'subcategories' count"
        assert "products" in data, "Should have 'products' count"
        assert "vendor_submissions" in data, "Should have 'vendor_submissions' count"
        assert "pending_submissions" in data, "Should have 'pending_submissions' count"
        
        print(f"✓ Catalog summary: {data['groups']} groups, {data['categories']} categories, {data['products']} products, {data['pending_submissions']} pending")


class TestAdminTaxonomyCRUD:
    """Admin taxonomy CRUD operations"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.text}")
        return response.json().get("token")
    
    def test_create_group(self, admin_token):
        """POST /api/admin/catalog/groups creates a new group"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        unique_name = f"TEST_Group_{uuid4().hex[:8]}"
        
        response = requests.post(f"{BASE_URL}/api/admin/catalog/groups", 
            json={"name": unique_name},
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("name") == unique_name, "Group name should match"
        assert "id" in data, "Should return group id"
        assert data.get("is_active") == True, "Should be active"
        
        print(f"✓ Created group: {unique_name} (id: {data['id']})")
        return data["id"]
    
    def test_create_category_under_group(self, admin_token):
        """POST /api/admin/catalog/categories creates a category under a group"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First create a group
        group_name = f"TEST_Group_{uuid4().hex[:8]}"
        group_response = requests.post(f"{BASE_URL}/api/admin/catalog/groups",
            json={"name": group_name},
            headers=headers
        )
        assert group_response.status_code == 200
        group_id = group_response.json()["id"]
        
        # Create category under the group
        cat_name = f"TEST_Category_{uuid4().hex[:8]}"
        response = requests.post(f"{BASE_URL}/api/admin/catalog/categories",
            json={"name": cat_name, "group_id": group_id},
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("name") == cat_name, "Category name should match"
        assert data.get("group_id") == group_id, "Category should be under the correct group"
        
        print(f"✓ Created category: {cat_name} under group {group_name}")


class TestVendorProductSubmission:
    """Vendor product submission workflow tests"""
    
    @pytest.fixture
    def vendor_token(self):
        """Get vendor auth token via partner-auth endpoint"""
        # Try partner-auth first
        response = requests.post(f"{BASE_URL}/api/partner-auth/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        
        # Fallback to regular auth
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Vendor login failed: {response.text}")
        return response.json().get("token")
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.text}")
        return response.json().get("token")
    
    def test_vendor_submit_product(self, vendor_token):
        """POST /api/vendor/catalog/submissions creates a pending submission"""
        headers = {"Authorization": f"Bearer {vendor_token}"}
        
        # Get taxonomy for valid group/category IDs
        tax_response = requests.get(f"{BASE_URL}/api/vendor/catalog/taxonomy", headers=headers)
        taxonomy = tax_response.json() if tax_response.status_code == 200 else {"groups": [], "categories": []}
        
        group_id = taxonomy["groups"][0]["id"] if taxonomy.get("groups") else None
        category_id = taxonomy["categories"][0]["id"] if taxonomy.get("categories") else None
        
        product_name = f"TEST_VendorProduct_{uuid4().hex[:8]}"
        payload = {
            "product_name": product_name,
            "description": "Test product submitted by vendor",
            "base_cost": 50000,
            "currency_code": "TZS",
            "visibility_mode": "request_quote",
            "group_id": group_id,
            "category_id": category_id,
            "min_quantity": 10
        }
        
        response = requests.post(f"{BASE_URL}/api/vendor/catalog/submissions",
            json=payload,
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True, "Should return ok: true"
        assert "submission" in data, "Should return submission object"
        
        submission = data["submission"]
        assert submission.get("product_name") == product_name
        assert submission.get("review_status") == "pending", "New submission should be pending"
        assert submission.get("base_cost") == 50000
        
        print(f"✓ Vendor submitted product: {product_name} (status: pending)")
        return submission["id"]
    
    def test_vendor_list_submissions(self, vendor_token):
        """GET /api/vendor/catalog/submissions returns vendor's submissions"""
        headers = {"Authorization": f"Bearer {vendor_token}"}
        
        response = requests.get(f"{BASE_URL}/api/vendor/catalog/submissions", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Should return a list"
        print(f"✓ Vendor has {len(data)} submissions")


class TestAdminSubmissionReview:
    """Admin submission review workflow tests"""
    
    @pytest.fixture
    def vendor_token(self):
        """Get vendor auth token"""
        response = requests.post(f"{BASE_URL}/api/partner-auth/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Vendor login failed: {response.text}")
        return response.json().get("token")
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.text}")
        return response.json().get("token")
    
    def test_admin_approve_submission_publishes_product(self, vendor_token, admin_token):
        """POST /api/admin/catalog/submissions/{id}/approve publishes product to marketplace"""
        vendor_headers = {"Authorization": f"Bearer {vendor_token}"}
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        # 1. Vendor submits a product
        product_name = f"TEST_ApproveFlow_{uuid4().hex[:8]}"
        submit_response = requests.post(f"{BASE_URL}/api/vendor/catalog/submissions",
            json={
                "product_name": product_name,
                "description": "Product for approval test",
                "base_cost": 100000,
                "currency_code": "TZS",
                "visibility_mode": "request_quote",
                "min_quantity": 5
            },
            headers=vendor_headers
        )
        assert submit_response.status_code == 200, f"Submission failed: {submit_response.text}"
        submission_id = submit_response.json()["submission"]["id"]
        print(f"  → Vendor submitted: {product_name}")
        
        # 2. Admin approves with margin
        approve_response = requests.post(
            f"{BASE_URL}/api/admin/catalog/submissions/{submission_id}/approve",
            json={"margin_percent": 25},
            headers=admin_headers
        )
        assert approve_response.status_code == 200, f"Approval failed: {approve_response.text}"
        
        data = approve_response.json()
        assert data.get("ok") == True
        assert "product" in data, "Should return published product"
        
        product = data["product"]
        assert product.get("name") == product_name
        assert product.get("is_active") == True
        assert product.get("publish_status") == "published"
        
        # Verify margin was applied: base_cost 100000 * 1.25 = 125000
        expected_price = 100000 * 1.25
        assert product.get("base_price") == expected_price, f"Expected price {expected_price}, got {product.get('base_price')}"
        
        print(f"  → Admin approved with 25% margin, sell price: {product.get('base_price')}")
        
        # 3. Verify product appears in marketplace search
        time.sleep(0.5)  # Brief delay for DB consistency
        search_response = requests.get(f"{BASE_URL}/api/marketplace/products/search?q={product_name}")
        assert search_response.status_code == 200
        
        search_results = search_response.json()
        found = any(p.get("name") == product_name for p in search_results)
        assert found, f"Approved product '{product_name}' should appear in marketplace search"
        
        print(f"✓ E2E: Vendor submit → Admin approve → Product in marketplace")
    
    def test_admin_reject_submission(self, vendor_token, admin_token):
        """POST /api/admin/catalog/submissions/{id}/reject sets status to rejected"""
        vendor_headers = {"Authorization": f"Bearer {vendor_token}"}
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        # 1. Vendor submits a product
        product_name = f"TEST_RejectFlow_{uuid4().hex[:8]}"
        submit_response = requests.post(f"{BASE_URL}/api/vendor/catalog/submissions",
            json={
                "product_name": product_name,
                "description": "Product for rejection test",
                "base_cost": 75000,
                "currency_code": "TZS",
                "visibility_mode": "buy_now",
                "min_quantity": 1
            },
            headers=vendor_headers
        )
        assert submit_response.status_code == 200
        submission_id = submit_response.json()["submission"]["id"]
        
        # 2. Admin rejects with notes
        reject_response = requests.post(
            f"{BASE_URL}/api/admin/catalog/submissions/{submission_id}/reject",
            json={"notes": "Product does not meet quality standards"},
            headers=admin_headers
        )
        assert reject_response.status_code == 200, f"Rejection failed: {reject_response.text}"
        
        data = reject_response.json()
        assert data.get("ok") == True
        assert "submission" in data
        
        submission = data["submission"]
        assert submission.get("review_status") == "rejected"
        assert "quality standards" in submission.get("review_notes", "")
        
        print(f"✓ Admin rejected submission with notes")


class TestRegressionChecks:
    """Regression tests for existing functionality"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.text}")
        return response.json().get("token")
    
    def test_crm_leads_api_still_works(self, admin_token):
        """GET /api/admin/crm/leads should still work"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/crm/leads", headers=headers)
        assert response.status_code == 200, f"CRM leads API failed: {response.status_code}"
        print(f"✓ CRM leads API works")
    
    def test_requests_inbox_api_still_works(self, admin_token):
        """GET /api/admin/requests should still work"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/requests", headers=headers)
        assert response.status_code == 200, f"Requests inbox API failed: {response.status_code}"
        print(f"✓ Requests inbox API works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
