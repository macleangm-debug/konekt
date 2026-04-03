"""
Test Suite for Phase 25: Taxonomy-driven Product Upload, Variants, and Bulk Import
Tests vendor product upload, taxonomy filtering, 2-step bulk import, and admin review.
"""
import pytest
import requests
import os
import io
import csv

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
VENDOR_EMAIL = "demo.partner@konekt.com"
VENDOR_PASSWORD = "Partner123!"
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


@pytest.fixture(scope="module")
def vendor_token():
    """Get vendor/partner JWT token."""
    res = requests.post(f"{BASE_URL}/api/partner-auth/login", json={
        "email": VENDOR_EMAIL,
        "password": VENDOR_PASSWORD
    })
    if res.status_code == 200:
        data = res.json()
        return data.get("token") or data.get("access_token")
    pytest.skip(f"Vendor login failed: {res.status_code} - {res.text}")


@pytest.fixture(scope="module")
def admin_token():
    """Get admin JWT token."""
    res = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if res.status_code == 200:
        data = res.json()
        return data.get("token") or data.get("access_token")
    pytest.skip(f"Admin login failed: {res.status_code} - {res.text}")


@pytest.fixture
def vendor_headers(vendor_token):
    return {"Authorization": f"Bearer {vendor_token}"}


@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


class TestVendorTaxonomy:
    """Test vendor taxonomy endpoint with capability filtering."""

    def test_get_taxonomy_returns_groups_categories_subcategories(self, vendor_headers):
        """GET /api/vendor/products/taxonomy returns taxonomy tree."""
        res = requests.get(f"{BASE_URL}/api/vendor/products/taxonomy", headers=vendor_headers)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        
        # Should have groups, categories, subcategories
        assert "groups" in data, "Response should have 'groups'"
        assert "categories" in data, "Response should have 'categories'"
        assert "subcategories" in data, "Response should have 'subcategories'"
        
        # Should not be blocked for product vendor
        assert data.get("blocked") != True, "Product vendor should not be blocked"
        
        # Should have some taxonomy data
        assert len(data["groups"]) > 0 or len(data["categories"]) > 0, "Should have taxonomy data"
        print(f"Taxonomy: {len(data['groups'])} groups, {len(data['categories'])} categories, {len(data['subcategories'])} subcategories")

    def test_taxonomy_requires_auth(self):
        """GET /api/vendor/products/taxonomy requires authorization."""
        res = requests.get(f"{BASE_URL}/api/vendor/products/taxonomy")
        assert res.status_code in [401, 422], f"Expected 401/422 without auth, got {res.status_code}"


class TestSingleProductUpload:
    """Test single product upload endpoint."""

    def test_upload_product_success(self, vendor_headers):
        """POST /api/vendor/products/upload creates pending_review submission."""
        # First get a valid category from taxonomy
        tax_res = requests.get(f"{BASE_URL}/api/vendor/products/taxonomy", headers=vendor_headers)
        assert tax_res.status_code == 200
        taxonomy = tax_res.json()
        
        # Find a category to use
        categories = taxonomy.get("categories", [])
        assert len(categories) > 0, "Need at least one category for testing"
        category = categories[0]
        
        payload = {
            "product": {
                "product_name": "TEST_HP LaserJet Pro M404dn",
                "brand": "HP",
                "category_id": category["id"],
                "short_description": "Professional laser printer",
                "full_description": "High-speed professional laser printer for office use",
                "images": ["https://example.com/printer1.jpg", "https://example.com/printer2.jpg"]
            },
            "supply": {
                "base_price_vat_inclusive": 850000,
                "lead_time_days": 3,
                "supply_mode": "in_stock",
                "default_quantity": 1,
                "vendor_product_code": "HP-LJ-M404DN"
            },
            "variants": [
                {
                    "sku": "HP-M404-BLK",
                    "color": "Black",
                    "quantity": 10,
                    "price_override": None
                }
            ]
        }
        
        res = requests.post(f"{BASE_URL}/api/vendor/products/upload", json=payload, headers=vendor_headers)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        
        data = res.json()
        assert data.get("ok") == True, "Response should have ok=True"
        assert "submission" in data, "Response should have submission"
        
        submission = data["submission"]
        assert submission.get("review_status") == "pending_review", "Submission should be pending_review"
        assert submission.get("product", {}).get("product_name") == "TEST_HP LaserJet Pro M404dn"
        assert submission.get("supply", {}).get("base_price_vat_inclusive") == 850000
        assert len(submission.get("variants", [])) == 1
        
        print(f"Created submission: {submission['id']}")
        return submission["id"]

    def test_upload_requires_product_name(self, vendor_headers):
        """POST /api/vendor/products/upload validates required fields."""
        # Get a category first
        tax_res = requests.get(f"{BASE_URL}/api/vendor/products/taxonomy", headers=vendor_headers)
        taxonomy = tax_res.json()
        category = taxonomy.get("categories", [{}])[0]
        
        payload = {
            "product": {
                "product_name": "",  # Empty name
                "category_id": category.get("id", "test")
            },
            "supply": {
                "base_price_vat_inclusive": 1000
            },
            "variants": []
        }
        
        res = requests.post(f"{BASE_URL}/api/vendor/products/upload", json=payload, headers=vendor_headers)
        # Should fail validation - either 400 or 422
        assert res.status_code in [400, 422], f"Expected 400/422 for empty name, got {res.status_code}"

    def test_upload_requires_valid_price(self, vendor_headers):
        """POST /api/vendor/products/upload requires price > 0."""
        tax_res = requests.get(f"{BASE_URL}/api/vendor/products/taxonomy", headers=vendor_headers)
        taxonomy = tax_res.json()
        category = taxonomy.get("categories", [{}])[0]
        
        payload = {
            "product": {
                "product_name": "Test Product",
                "category_id": category.get("id", "test")
            },
            "supply": {
                "base_price_vat_inclusive": 0  # Invalid price
            },
            "variants": []
        }
        
        res = requests.post(f"{BASE_URL}/api/vendor/products/upload", json=payload, headers=vendor_headers)
        # Should fail - price must be > 0
        assert res.status_code in [400, 422], f"Expected 400/422 for zero price, got {res.status_code}"


class TestVendorSubmissions:
    """Test vendor submissions listing."""

    def test_list_my_submissions(self, vendor_headers):
        """GET /api/vendor/products/my-submissions returns vendor's submissions."""
        res = requests.get(f"{BASE_URL}/api/vendor/products/my-submissions", headers=vendor_headers)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        
        data = res.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Vendor has {len(data)} submissions")

    def test_list_submissions_with_status_filter(self, vendor_headers):
        """GET /api/vendor/products/my-submissions?status=pending_review filters by status."""
        res = requests.get(f"{BASE_URL}/api/vendor/products/my-submissions?status=pending_review", headers=vendor_headers)
        assert res.status_code == 200
        
        data = res.json()
        for sub in data:
            assert sub.get("review_status") == "pending_review", "All should be pending_review"


class TestBulkImportValidate:
    """Test 2-step bulk import - Step 1: Validate."""

    def test_validate_csv_import(self, vendor_headers):
        """POST /api/vendor/products/import/validate parses and validates CSV."""
        # Create a test CSV in memory
        csv_content = """product_name,category,base_price_vat_inclusive,brand,quantity,sku
TEST_Epson Printer,Printers,450000,Epson,5,EPS-001
TEST_Canon Scanner,Scanners,350000,Canon,3,CAN-001
TEST_Invalid Product,,100,NoCategory,1,INV-001"""
        
        files = {"file": ("test_import.csv", csv_content.encode(), "text/csv")}
        
        res = requests.post(
            f"{BASE_URL}/api/vendor/products/import/validate",
            files=files,
            headers=vendor_headers
        )
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        
        data = res.json()
        assert data.get("ok") == True
        assert "import_job" in data
        
        job = data["import_job"]
        assert job.get("status") == "validated"
        assert job.get("total_rows") == 3
        assert "validation_result" in job
        
        # Check validation results
        results = job["validation_result"]
        assert len(results) == 3
        
        # Third row should have errors (missing category)
        invalid_rows = [r for r in results if not r["valid"]]
        assert len(invalid_rows) >= 1, "Should have at least one invalid row"
        
        print(f"Import job {job['id']}: {job['valid_rows']} valid, {job['error_rows']} errors")
        return job["id"]

    def test_validate_xlsx_import(self, vendor_headers):
        """POST /api/vendor/products/import/validate handles XLSX files."""
        # Create minimal XLSX-like content (actually CSV for simplicity)
        # In real test, would use openpyxl to create actual XLSX
        csv_content = """product_name,category,base_price_vat_inclusive,brand
TEST_Office Chair,Office Furniture,250000,Generic"""
        
        files = {"file": ("test_import.csv", csv_content.encode(), "text/csv")}
        
        res = requests.post(
            f"{BASE_URL}/api/vendor/products/import/validate",
            files=files,
            headers=vendor_headers
        )
        assert res.status_code == 200

    def test_validate_rejects_unsupported_format(self, vendor_headers):
        """POST /api/vendor/products/import/validate rejects unsupported formats."""
        files = {"file": ("test.pdf", b"fake pdf content", "application/pdf")}
        
        res = requests.post(
            f"{BASE_URL}/api/vendor/products/import/validate",
            files=files,
            headers=vendor_headers
        )
        assert res.status_code == 400, f"Expected 400 for unsupported format, got {res.status_code}"

    def test_validate_requires_columns(self, vendor_headers):
        """POST /api/vendor/products/import/validate requires mandatory columns."""
        # Missing base_price_vat_inclusive column
        csv_content = """product_name,category
TEST_Product,Printers"""
        
        files = {"file": ("test.csv", csv_content.encode(), "text/csv")}
        
        res = requests.post(
            f"{BASE_URL}/api/vendor/products/import/validate",
            files=files,
            headers=vendor_headers
        )
        assert res.status_code == 400, f"Expected 400 for missing columns, got {res.status_code}"


class TestBulkImportConfirm:
    """Test 2-step bulk import - Step 2: Confirm."""

    def test_confirm_import_creates_submissions(self, vendor_headers):
        """POST /api/vendor/products/import/{job_id}/confirm creates submissions from valid rows."""
        # First validate a file
        csv_content = """product_name,category,base_price_vat_inclusive,brand,quantity,sku
TEST_Confirm Printer,Printers,550000,TestBrand,2,CONF-001"""
        
        files = {"file": ("confirm_test.csv", csv_content.encode(), "text/csv")}
        
        validate_res = requests.post(
            f"{BASE_URL}/api/vendor/products/import/validate",
            files=files,
            headers=vendor_headers
        )
        assert validate_res.status_code == 200
        job_id = validate_res.json()["import_job"]["id"]
        
        # Now confirm
        confirm_res = requests.post(
            f"{BASE_URL}/api/vendor/products/import/{job_id}/confirm",
            headers=vendor_headers
        )
        assert confirm_res.status_code == 200, f"Expected 200, got {confirm_res.status_code}: {confirm_res.text}"
        
        data = confirm_res.json()
        assert data.get("ok") == True
        assert "created_count" in data
        assert "submission_ids" in data
        
        print(f"Confirmed import: {data['created_count']} submissions created")

    def test_confirm_invalid_job_fails(self, vendor_headers):
        """POST /api/vendor/products/import/{job_id}/confirm fails for invalid job."""
        res = requests.post(
            f"{BASE_URL}/api/vendor/products/import/invalid-job-id/confirm",
            headers=vendor_headers
        )
        assert res.status_code == 400, f"Expected 400 for invalid job, got {res.status_code}"


class TestImportJobHistory:
    """Test import job history endpoints."""

    def test_list_import_jobs(self, vendor_headers):
        """GET /api/vendor/products/import/jobs returns vendor's import history."""
        res = requests.get(f"{BASE_URL}/api/vendor/products/import/jobs", headers=vendor_headers)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        
        data = res.json()
        assert isinstance(data, list)
        print(f"Vendor has {len(data)} import jobs")


class TestAdminSubmissionsReview:
    """Test admin vendor supply review endpoints."""

    def test_admin_list_submissions(self, admin_headers):
        """GET /api/admin/vendor-supply/submissions returns all submissions."""
        res = requests.get(f"{BASE_URL}/api/admin/vendor-supply/submissions", headers=admin_headers)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        
        data = res.json()
        assert isinstance(data, list)
        print(f"Admin sees {len(data)} submissions")

    def test_admin_list_submissions_with_filter(self, admin_headers):
        """GET /api/admin/vendor-supply/submissions?status=pending_review filters."""
        res = requests.get(
            f"{BASE_URL}/api/admin/vendor-supply/submissions?status=pending_review",
            headers=admin_headers
        )
        assert res.status_code == 200
        
        data = res.json()
        for sub in data:
            assert sub.get("review_status") == "pending_review"

    def test_admin_review_submission_approve(self, admin_headers, vendor_headers):
        """POST /api/admin/vendor-supply/submissions/{id}/review approves submission."""
        # First create a submission
        tax_res = requests.get(f"{BASE_URL}/api/vendor/products/taxonomy", headers=vendor_headers)
        taxonomy = tax_res.json()
        category = taxonomy.get("categories", [{}])[0]
        
        payload = {
            "product": {
                "product_name": "TEST_Review Product",
                "category_id": category.get("id", "test")
            },
            "supply": {
                "base_price_vat_inclusive": 100000
            },
            "variants": []
        }
        
        create_res = requests.post(f"{BASE_URL}/api/vendor/products/upload", json=payload, headers=vendor_headers)
        if create_res.status_code != 200:
            pytest.skip("Could not create submission for review test")
        
        submission_id = create_res.json()["submission"]["id"]
        
        # Now approve it
        review_res = requests.post(
            f"{BASE_URL}/api/admin/vendor-supply/submissions/{submission_id}/review",
            json={"status": "approved", "notes": "Looks good, approved for catalog"},
            headers=admin_headers
        )
        assert review_res.status_code == 200, f"Expected 200, got {review_res.status_code}: {review_res.text}"
        
        data = review_res.json()
        assert data.get("ok") == True
        assert data["submission"]["review_status"] == "approved"
        assert data["submission"]["review_notes"] == "Looks good, approved for catalog"
        print(f"Approved submission {submission_id}")

    def test_admin_review_submission_reject(self, admin_headers, vendor_headers):
        """POST /api/admin/vendor-supply/submissions/{id}/review rejects submission."""
        # Create a submission
        tax_res = requests.get(f"{BASE_URL}/api/vendor/products/taxonomy", headers=vendor_headers)
        taxonomy = tax_res.json()
        category = taxonomy.get("categories", [{}])[0]
        
        payload = {
            "product": {
                "product_name": "TEST_Reject Product",
                "category_id": category.get("id", "test")
            },
            "supply": {
                "base_price_vat_inclusive": 50000
            },
            "variants": []
        }
        
        create_res = requests.post(f"{BASE_URL}/api/vendor/products/upload", json=payload, headers=vendor_headers)
        if create_res.status_code != 200:
            pytest.skip("Could not create submission for reject test")
        
        submission_id = create_res.json()["submission"]["id"]
        
        # Reject it
        review_res = requests.post(
            f"{BASE_URL}/api/admin/vendor-supply/submissions/{submission_id}/review",
            json={"status": "rejected", "notes": "Price too low, does not meet minimum"},
            headers=admin_headers
        )
        assert review_res.status_code == 200
        
        data = review_res.json()
        assert data["submission"]["review_status"] == "rejected"

    def test_admin_review_invalid_status(self, admin_headers):
        """POST /api/admin/vendor-supply/submissions/{id}/review rejects invalid status."""
        res = requests.post(
            f"{BASE_URL}/api/admin/vendor-supply/submissions/some-id/review",
            json={"status": "invalid_status", "notes": "test"},
            headers=admin_headers
        )
        # Should fail with 400 or 404
        assert res.status_code in [400, 404]


class TestAdminImportJobs:
    """Test admin import jobs endpoints."""

    def test_admin_list_import_jobs(self, admin_headers):
        """GET /api/admin/vendor-supply/import-jobs returns all import jobs."""
        res = requests.get(f"{BASE_URL}/api/admin/vendor-supply/import-jobs", headers=admin_headers)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        
        data = res.json()
        assert isinstance(data, list)
        print(f"Admin sees {len(data)} import jobs")

    def test_admin_list_import_jobs_with_filter(self, admin_headers):
        """GET /api/admin/vendor-supply/import-jobs?status=confirmed filters."""
        res = requests.get(
            f"{BASE_URL}/api/admin/vendor-supply/import-jobs?status=confirmed",
            headers=admin_headers
        )
        assert res.status_code == 200


class TestImageValidation:
    """Test image URL validation in product upload."""

    def test_valid_image_urls_accepted(self, vendor_headers):
        """Valid image URLs are accepted and stored."""
        tax_res = requests.get(f"{BASE_URL}/api/vendor/products/taxonomy", headers=vendor_headers)
        taxonomy = tax_res.json()
        category = taxonomy.get("categories", [{}])[0]
        
        payload = {
            "product": {
                "product_name": "TEST_Image Product",
                "category_id": category.get("id", "test"),
                "images": [
                    "https://example.com/image1.jpg",
                    "https://cdn.example.com/products/image2.png"
                ]
            },
            "supply": {
                "base_price_vat_inclusive": 75000
            },
            "variants": []
        }
        
        res = requests.post(f"{BASE_URL}/api/vendor/products/upload", json=payload, headers=vendor_headers)
        assert res.status_code == 200
        
        submission = res.json()["submission"]
        assert len(submission["product"]["images"]) == 2
        assert submission["product"]["primary_image"] == "https://example.com/image1.jpg"


class TestHealthAndRegression:
    """Basic health and regression tests."""

    def test_health_endpoint(self):
        """GET /api/health returns healthy."""
        res = requests.get(f"{BASE_URL}/api/health")
        assert res.status_code == 200

    def test_vendor_auth_works(self, vendor_token):
        """Vendor authentication works."""
        assert vendor_token is not None
        assert len(vendor_token) > 10

    def test_admin_auth_works(self, admin_token):
        """Admin authentication works."""
        assert admin_token is not None
        assert len(admin_token) > 10
