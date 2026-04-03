"""
Test Suite for Approved Products → Marketplace Wiring (Iteration 175)

Tests:
1. POST /api/admin/vendor-supply/submissions/{id}/review with status=approved creates/updates canonical product
2. Re-approving same submission does NOT create duplicate products (idempotent)
3. GET /api/marketplace/products/search returns approved vendor products with is_active=true
4. GET /api/marketplace/products/{product_id} returns product detail without vendor_id or vendor_name
5. GET /api/admin/business-settings/public returns company info from DB
"""
import pytest
import requests
import os
from uuid import uuid4

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
CUSTOMER_EMAIL = "demo.customer@konekt.com"
CUSTOMER_PASSWORD = "Demo123!"
VENDOR_EMAIL = "demo.partner@konekt.com"
VENDOR_PASSWORD = "Partner123!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Admin authentication failed: {response.status_code}")


@pytest.fixture(scope="module")
def customer_token():
    """Get customer authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": CUSTOMER_EMAIL,
        "password": CUSTOMER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Customer authentication failed: {response.status_code}")


@pytest.fixture(scope="module")
def vendor_token():
    """Get vendor authentication token"""
    # Try partner-auth endpoint first (returns access_token)
    response = requests.post(f"{BASE_URL}/api/partner-auth/login", json={
        "email": VENDOR_EMAIL,
        "password": VENDOR_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        token = data.get("access_token") or data.get("token")
        if token:
            return token
    
    # Fallback to regular auth endpoint
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": VENDOR_EMAIL,
        "password": VENDOR_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Vendor authentication failed: {response.status_code}")


class TestHealthAndAuth:
    """Basic health and authentication tests"""
    
    def test_health_endpoint(self):
        """Health endpoint returns healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("PASS: Health endpoint returns healthy")
    
    def test_admin_auth(self, admin_token):
        """Admin authentication works"""
        assert admin_token is not None
        assert len(admin_token) > 0
        print("PASS: Admin authentication successful")
    
    def test_customer_auth(self, customer_token):
        """Customer authentication works"""
        assert customer_token is not None
        assert len(customer_token) > 0
        print("PASS: Customer authentication successful")
    
    def test_vendor_auth(self, vendor_token):
        """Vendor authentication works"""
        assert vendor_token is not None
        assert len(vendor_token) > 0
        print("PASS: Vendor authentication successful")


class TestBusinessSettingsPublic:
    """Test GET /api/admin/business-settings/public"""
    
    def test_public_business_settings_returns_company_info(self):
        """Public business settings endpoint returns company info without auth"""
        response = requests.get(f"{BASE_URL}/api/admin/business-settings/public")
        assert response.status_code == 200
        data = response.json()
        
        # Verify expected fields are present
        assert "company_name" in data
        assert "trading_name" in data
        assert "phone" in data
        assert "email" in data
        assert "address" in data
        assert "city" in data
        assert "country" in data
        assert "tin" in data
        assert "brn" in data
        assert "bank_name" in data
        assert "bank_account_name" in data
        assert "bank_account_number" in data
        
        # Verify some values are populated
        assert data.get("company_name") or data.get("trading_name")
        print(f"PASS: Public business settings returns company info: {data.get('company_name')} / {data.get('trading_name')}")


class TestVendorSubmissionApproval:
    """Test vendor submission approval creates canonical products"""
    
    # Use real taxonomy IDs from the system
    TEST_GROUP_ID = "0c8b3053-3a90-4ba6-9041-bcae181a1118"  # Office Supplies
    TEST_CATEGORY_ID = "8c1dc822-5551-4cf9-bc80-f5a8847a84e4"  # Office Supplies category
    
    def test_list_pending_submissions(self, admin_token):
        """Admin can list pending vendor submissions"""
        response = requests.get(
            f"{BASE_URL}/api/admin/vendor-supply/submissions?status=pending_review",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Listed {len(data)} pending submissions")
    
    def test_approve_submission_creates_canonical_product(self, admin_token, vendor_token):
        """Approving a vendor submission creates a canonical product in products collection"""
        # First, create a new vendor submission for testing
        unique_name = f"TEST_ApprovalProduct_{uuid4().hex[:8]}"
        submission_payload = {
            "product": {
                "product_name": unique_name,
                "brand": "TestBrand",
                "short_description": "Test product for approval flow",
                "group_id": self.TEST_GROUP_ID,
                "group_name": "Office Supplies",
                "category_id": self.TEST_CATEGORY_ID,
                "category_name": "Office Supplies"
            },
            "supply": {
                "base_price_vat_inclusive": 50000,
                "lead_time_days": 3,
                "supply_mode": "in_stock",
                "default_quantity": 1,
                "vendor_product_code": f"VP-{uuid4().hex[:6]}"
            },
            "variants": []
        }
        
        # Create submission via vendor endpoint
        create_response = requests.post(
            f"{BASE_URL}/api/vendor/products/upload",
            json=submission_payload,
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        
        if create_response.status_code not in [200, 201]:
            print(f"Create submission failed: {create_response.status_code} - {create_response.text}")
            pytest.skip(f"Could not create test submission: {create_response.status_code}")
        
        response_data = create_response.json()
        submission_id = response_data.get("submission_id") or response_data.get("id") or response_data.get("submission", {}).get("id")
        assert submission_id, "Submission ID should be returned"
        print(f"Created test submission: {submission_id}")
        
        # Now approve the submission
        approve_response = requests.post(
            f"{BASE_URL}/api/admin/vendor-supply/submissions/{submission_id}/review",
            json={"status": "approved", "notes": "Approved for testing"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert approve_response.status_code == 200
        approve_data = approve_response.json()
        assert approve_data.get("ok") == True
        assert approve_data.get("submission") is not None
        assert approve_data.get("submission", {}).get("review_status") == "approved"
        
        # Verify published_product is returned
        published_product = approve_data.get("published_product")
        assert published_product is not None, "published_product should be returned on approval"
        assert published_product.get("name") == unique_name
        assert published_product.get("is_active") == True
        assert published_product.get("source") == "vendor_submission"
        print(f"PASS: Approval created canonical product: {published_product.get('name')}")
        
        # Store for cleanup
        return submission_id, unique_name
    
    def test_reapproval_is_idempotent_no_duplicates(self, admin_token, vendor_token):
        """Re-approving same submission does NOT create duplicate products"""
        # Create a submission
        unique_name = f"TEST_IdempotentProduct_{uuid4().hex[:8]}"
        submission_payload = {
            "product": {
                "product_name": unique_name,
                "brand": "IdempotentBrand",
                "short_description": "Test idempotent approval",
                "group_id": self.TEST_GROUP_ID,
                "group_name": "Office Supplies",
                "category_id": self.TEST_CATEGORY_ID,
                "category_name": "Office Supplies"
            },
            "supply": {
                "base_price_vat_inclusive": 75000,
                "lead_time_days": 2,
                "supply_mode": "in_stock"
            },
            "variants": []
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/vendor/products/upload",
            json=submission_payload,
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        
        if create_response.status_code not in [200, 201]:
            print(f"Create submission failed: {create_response.status_code} - {create_response.text}")
            pytest.skip(f"Could not create test submission: {create_response.status_code}")
        
        response_data = create_response.json()
        submission_id = response_data.get("submission_id") or response_data.get("id") or response_data.get("submission", {}).get("id")
        
        # First approval
        approve1 = requests.post(
            f"{BASE_URL}/api/admin/vendor-supply/submissions/{submission_id}/review",
            json={"status": "approved", "notes": "First approval"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert approve1.status_code == 200
        product1 = approve1.json().get("published_product")
        
        # Second approval (re-approval)
        approve2 = requests.post(
            f"{BASE_URL}/api/admin/vendor-supply/submissions/{submission_id}/review",
            json={"status": "approved", "notes": "Second approval - should update, not duplicate"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert approve2.status_code == 200
        product2 = approve2.json().get("published_product")
        
        # Search for products with this name - should only find ONE
        search_response = requests.get(f"{BASE_URL}/api/marketplace/products/search?q={unique_name}")
        assert search_response.status_code == 200
        products = search_response.json()
        
        matching = [p for p in products if p.get("name") == unique_name]
        assert len(matching) == 1, f"Expected 1 product, found {len(matching)} - idempotency failed!"
        print(f"PASS: Re-approval is idempotent - only 1 product exists for {unique_name}")


class TestMarketplaceProductSearch:
    """Test GET /api/marketplace/products/search"""
    
    # Use real taxonomy IDs from the system
    TEST_GROUP_ID = "0c8b3053-3a90-4ba6-9041-bcae181a1118"  # Office Supplies
    TEST_CATEGORY_ID = "8c1dc822-5551-4cf9-bc80-f5a8847a84e4"  # Office Supplies category
    
    def test_marketplace_search_returns_active_products(self):
        """Marketplace search returns products with is_active=true"""
        response = requests.get(f"{BASE_URL}/api/marketplace/products/search")
        assert response.status_code == 200
        products = response.json()
        assert isinstance(products, list)
        
        # All returned products should have is_active=true (implicit filter)
        for product in products[:10]:  # Check first 10
            assert product.get("is_active") == True or product.get("is_active") is None
            assert "id" in product
            assert "name" in product
        
        print(f"PASS: Marketplace search returns {len(products)} active products")
    
    def test_marketplace_search_with_query(self):
        """Marketplace search filters by query string"""
        # Search for a common term
        response = requests.get(f"{BASE_URL}/api/marketplace/products/search?q=test")
        assert response.status_code == 200
        products = response.json()
        assert isinstance(products, list)
        print(f"PASS: Marketplace search with query returns {len(products)} products")
    
    def test_marketplace_search_returns_vendor_products(self, admin_token, vendor_token):
        """Marketplace search includes approved vendor products"""
        # Create and approve a product
        unique_name = f"TEST_MarketplaceSearch_{uuid4().hex[:8]}"
        submission_payload = {
            "product": {
                "product_name": unique_name,
                "brand": "SearchTestBrand",
                "short_description": "Product for marketplace search test",
                "group_id": self.TEST_GROUP_ID,
                "group_name": "Office Supplies",
                "category_id": self.TEST_CATEGORY_ID,
                "category_name": "Office Supplies"
            },
            "supply": {
                "base_price_vat_inclusive": 100000,
                "lead_time_days": 1,
                "supply_mode": "in_stock"
            },
            "variants": []
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/vendor/products/upload",
            json=submission_payload,
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        
        if create_response.status_code not in [200, 201]:
            print(f"Create submission failed: {create_response.status_code} - {create_response.text}")
            pytest.skip(f"Could not create test submission: {create_response.status_code}")
        
        response_data = create_response.json()
        submission_id = response_data.get("submission_id") or response_data.get("id") or response_data.get("submission", {}).get("id")
        
        # Approve it
        approve_response = requests.post(
            f"{BASE_URL}/api/admin/vendor-supply/submissions/{submission_id}/review",
            json={"status": "approved", "notes": "Approved for search test"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert approve_response.status_code == 200
        
        # Now search for it
        search_response = requests.get(f"{BASE_URL}/api/marketplace/products/search?q={unique_name}")
        assert search_response.status_code == 200
        products = search_response.json()
        
        matching = [p for p in products if p.get("name") == unique_name]
        assert len(matching) >= 1, f"Approved product {unique_name} should appear in marketplace search"
        
        found_product = matching[0]
        assert found_product.get("is_active") == True
        assert found_product.get("source") == "vendor_submission"
        print(f"PASS: Approved vendor product appears in marketplace search: {unique_name}")


class TestMarketplaceProductDetail:
    """Test GET /api/marketplace/products/{product_id}"""
    
    # Use real taxonomy IDs from the system
    TEST_GROUP_ID = "0c8b3053-3a90-4ba6-9041-bcae181a1118"  # Office Supplies
    TEST_CATEGORY_ID = "8c1dc822-5551-4cf9-bc80-f5a8847a84e4"  # Office Supplies category
    
    def test_product_detail_hides_vendor_info(self, admin_token, vendor_token):
        """Product detail endpoint hides vendor_id and vendor_name from public"""
        # Create and approve a product
        unique_name = f"TEST_DetailHideVendor_{uuid4().hex[:8]}"
        submission_payload = {
            "product": {
                "product_name": unique_name,
                "brand": "HiddenVendorBrand",
                "short_description": "Product to test vendor info hiding",
                "group_id": self.TEST_GROUP_ID,
                "group_name": "Office Supplies",
                "category_id": self.TEST_CATEGORY_ID,
                "category_name": "Office Supplies"
            },
            "supply": {
                "base_price_vat_inclusive": 80000,
                "lead_time_days": 2,
                "supply_mode": "in_stock"
            },
            "variants": []
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/vendor/products/upload",
            json=submission_payload,
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        
        if create_response.status_code not in [200, 201]:
            print(f"Create submission failed: {create_response.status_code} - {create_response.text}")
            pytest.skip(f"Could not create test submission: {create_response.status_code}")
        
        response_data = create_response.json()
        submission_id = response_data.get("submission_id") or response_data.get("id") or response_data.get("submission", {}).get("id")
        
        # Approve it
        approve_response = requests.post(
            f"{BASE_URL}/api/admin/vendor-supply/submissions/{submission_id}/review",
            json={"status": "approved", "notes": "Approved for detail test"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert approve_response.status_code == 200
        published_product = approve_response.json().get("published_product")
        
        # Get product ID - try both id field and search
        product_id = published_product.get("id")
        if not product_id:
            # Search for it
            search_response = requests.get(f"{BASE_URL}/api/marketplace/products/search?q={unique_name}")
            products = search_response.json()
            matching = [p for p in products if p.get("name") == unique_name]
            if matching:
                product_id = matching[0].get("id")
        
        assert product_id, "Could not get product ID"
        
        # Fetch product detail (no auth - public endpoint)
        detail_response = requests.get(f"{BASE_URL}/api/marketplace/products/{product_id}")
        assert detail_response.status_code == 200
        product = detail_response.json()
        
        # Verify vendor info is hidden
        assert "vendor_id" not in product, "vendor_id should be hidden from public detail"
        assert "vendor_name" not in product, "vendor_name should be hidden from public detail"
        assert "source_submission_id" not in product, "source_submission_id should be hidden"
        assert "vendor_product_code" not in product, "vendor_product_code should be hidden"
        
        # Verify product data is present
        assert product.get("name") == unique_name
        assert "id" in product
        assert "price" in product or "customer_price" in product
        print(f"PASS: Product detail hides vendor info for {unique_name}")
    
    def test_product_detail_returns_404_for_invalid_id(self):
        """Product detail returns 404 for non-existent product"""
        fake_id = "nonexistent_product_id_12345"
        response = requests.get(f"{BASE_URL}/api/marketplace/products/{fake_id}")
        assert response.status_code == 404
        print("PASS: Product detail returns 404 for invalid ID")


class TestAdminVendorSupplyReview:
    """Test admin vendor supply review endpoints"""
    
    # Use real taxonomy IDs from the system
    TEST_GROUP_ID = "0c8b3053-3a90-4ba6-9041-bcae181a1118"  # Office Supplies
    TEST_CATEGORY_ID = "8c1dc822-5551-4cf9-bc80-f5a8847a84e4"  # Office Supplies category
    
    def test_list_all_submissions(self, admin_token):
        """Admin can list all vendor submissions"""
        response = requests.get(
            f"{BASE_URL}/api/admin/vendor-supply/submissions",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Admin listed {len(data)} total submissions")
    
    def test_list_submissions_by_status(self, admin_token):
        """Admin can filter submissions by status"""
        for status in ["pending_review", "approved", "rejected"]:
            response = requests.get(
                f"{BASE_URL}/api/admin/vendor-supply/submissions?status={status}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            # Verify all returned items have the correct status
            for item in data:
                assert item.get("review_status") == status
            print(f"PASS: Filtered submissions by status={status}: {len(data)} items")
    
    def test_reject_submission(self, admin_token, vendor_token):
        """Admin can reject a vendor submission"""
        # Create a submission
        unique_name = f"TEST_RejectProduct_{uuid4().hex[:8]}"
        submission_payload = {
            "product": {
                "product_name": unique_name,
                "brand": "RejectBrand",
                "short_description": "Product to be rejected",
                "group_id": self.TEST_GROUP_ID,
                "group_name": "Office Supplies",
                "category_id": self.TEST_CATEGORY_ID,
                "category_name": "Office Supplies"
            },
            "supply": {
                "base_price_vat_inclusive": 30000,
                "lead_time_days": 5,
                "supply_mode": "on_demand"
            },
            "variants": []
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/vendor/products/upload",
            json=submission_payload,
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        
        if create_response.status_code not in [200, 201]:
            print(f"Create submission failed: {create_response.status_code} - {create_response.text}")
            pytest.skip(f"Could not create test submission: {create_response.status_code}")
        
        response_data = create_response.json()
        submission_id = response_data.get("submission_id") or response_data.get("id") or response_data.get("submission", {}).get("id")
        
        # Reject it
        reject_response = requests.post(
            f"{BASE_URL}/api/admin/vendor-supply/submissions/{submission_id}/review",
            json={"status": "rejected", "notes": "Rejected for testing purposes"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert reject_response.status_code == 200
        data = reject_response.json()
        assert data.get("ok") == True
        assert data.get("submission", {}).get("review_status") == "rejected"
        # Rejected submissions should NOT create a published product
        assert data.get("published_product") is None
        print(f"PASS: Submission rejected successfully: {submission_id}")
    
    def test_invalid_review_status_returns_400(self, admin_token, vendor_token):
        """Invalid review status returns 400"""
        # Create a submission
        unique_name = f"TEST_InvalidStatus_{uuid4().hex[:8]}"
        submission_payload = {
            "product": {
                "product_name": unique_name,
                "group_id": self.TEST_GROUP_ID,
                "group_name": "Office Supplies",
                "category_id": self.TEST_CATEGORY_ID,
                "category_name": "Office Supplies"
            },
            "supply": {"base_price_vat_inclusive": 10000},
            "variants": []
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/vendor/products/upload",
            json=submission_payload,
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        
        if create_response.status_code not in [200, 201]:
            print(f"Create submission failed: {create_response.status_code} - {create_response.text}")
            pytest.skip(f"Could not create test submission: {create_response.status_code}")
        
        response_data = create_response.json()
        submission_id = response_data.get("submission_id") or response_data.get("id") or response_data.get("submission", {}).get("id")
        
        # Try invalid status
        response = requests.post(
            f"{BASE_URL}/api/admin/vendor-supply/submissions/{submission_id}/review",
            json={"status": "invalid_status", "notes": ""},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 400
        print("PASS: Invalid review status returns 400")
    
    def test_review_nonexistent_submission_returns_404(self, admin_token):
        """Reviewing non-existent submission returns 404"""
        fake_id = "nonexistent_submission_12345"
        response = requests.post(
            f"{BASE_URL}/api/admin/vendor-supply/submissions/{fake_id}/review",
            json={"status": "approved", "notes": ""},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 404
        print("PASS: Review non-existent submission returns 404")


class TestAdminImportJobs:
    """Test admin import jobs endpoints"""
    
    def test_list_import_jobs(self, admin_token):
        """Admin can list all import jobs"""
        response = requests.get(
            f"{BASE_URL}/api/admin/vendor-supply/import-jobs",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Admin listed {len(data)} import jobs")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
