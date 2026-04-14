"""
Vendor Ops Foundation Tests - v307
Tests for:
1. Dashboard stats API
2. Image upload + processing pipeline (crop, WebP, variants)
3. Products CRUD with updated_by_role tracking
4. Vendors listing
5. Price Requests CRUD with status auto-transition
6. Role enforcement (admin/vendor_ops access, 403 for others)
"""
import pytest
import requests
import os
import io
from PIL import Image

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
STAFF_EMAIL = "staff@konekt.co.tz"
STAFF_PASSWORD = "Staff123!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token."""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if resp.status_code == 200:
        return resp.json().get("token")
    pytest.skip(f"Admin login failed: {resp.status_code} - {resp.text}")


@pytest.fixture(scope="module")
def staff_token():
    """Get staff (sales role) auth token - should NOT have vendor_ops access."""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": STAFF_EMAIL,
        "password": STAFF_PASSWORD
    })
    if resp.status_code == 200:
        return resp.json().get("token")
    pytest.skip(f"Staff login failed: {resp.status_code} - {resp.text}")


@pytest.fixture
def admin_headers(admin_token):
    """Headers with admin auth."""
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture
def staff_headers(staff_token):
    """Headers with staff auth (sales role)."""
    return {"Authorization": f"Bearer {staff_token}", "Content-Type": "application/json"}


class TestDashboardStats:
    """Test GET /api/vendor-ops/dashboard-stats"""
    
    def test_dashboard_stats_returns_counts(self, admin_headers):
        """Dashboard stats should return vendor/product/request counts."""
        resp = requests.get(f"{BASE_URL}/api/vendor-ops/dashboard-stats", headers=admin_headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert "total_vendors" in data
        assert "total_products" in data
        assert "active_products" in data
        assert "draft_products" in data
        assert "pending_price_requests" in data
        
        # Values should be integers
        assert isinstance(data["total_vendors"], int)
        assert isinstance(data["total_products"], int)
        print(f"Dashboard stats: {data}")
    
    def test_dashboard_stats_requires_auth(self):
        """Dashboard stats should require authentication."""
        resp = requests.get(f"{BASE_URL}/api/vendor-ops/dashboard-stats")
        assert resp.status_code == 401


class TestImageUpload:
    """Test POST /api/vendor-ops/images/upload"""
    
    def test_image_upload_generates_webp_variants(self, admin_token):
        """Image upload should process and generate WebP variants."""
        # Create a test image using Pillow
        img = Image.new("RGB", (800, 600), color=(255, 100, 100))
        img_bytes = io.BytesIO()
        img.save(img_bytes, format="PNG")
        img_bytes.seek(0)
        
        files = {"file": ("test_image.png", img_bytes, "image/png")}
        data = {"crop_x": "0", "crop_y": "0", "crop_width": "0", "crop_height": "0"}
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        resp = requests.post(f"{BASE_URL}/api/vendor-ops/images/upload", files=files, data=data, headers=headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        result = resp.json()
        assert result.get("ok") is True
        assert "image_id" in result
        assert "original" in result
        assert "variants" in result
        
        # Check variants exist
        variants = result["variants"]
        assert "thumbnail" in variants, "Missing thumbnail variant"
        assert "card" in variants, "Missing card variant"
        assert "detail" in variants, "Missing detail variant"
        
        # All paths should be WebP
        assert result["original"].endswith(".webp")
        assert variants["thumbnail"].endswith(".webp")
        assert variants["card"].endswith(".webp")
        assert variants["detail"].endswith(".webp")
        
        print(f"Image upload result: {result}")
    
    def test_image_upload_with_crop(self, admin_token):
        """Image upload with crop parameters should work."""
        img = Image.new("RGB", (1000, 1000), color=(100, 200, 100))
        img_bytes = io.BytesIO()
        img.save(img_bytes, format="JPEG")
        img_bytes.seek(0)
        
        files = {"file": ("test_crop.jpg", img_bytes, "image/jpeg")}
        data = {"crop_x": "100", "crop_y": "100", "crop_width": "500", "crop_height": "500"}
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        resp = requests.post(f"{BASE_URL}/api/vendor-ops/images/upload", files=files, data=data, headers=headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        result = resp.json()
        assert result.get("ok") is True
        assert "variants" in result
        print(f"Cropped image upload result: {result}")
    
    def test_image_upload_rejects_non_image(self, admin_token):
        """Image upload should reject non-image files."""
        files = {"file": ("test.txt", b"This is not an image", "text/plain")}
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        resp = requests.post(f"{BASE_URL}/api/vendor-ops/images/upload", files=files, headers=headers)
        assert resp.status_code == 400, f"Expected 400 for non-image, got {resp.status_code}"
    
    def test_image_upload_requires_auth(self):
        """Image upload should require authentication."""
        img = Image.new("RGB", (100, 100), color=(0, 0, 255))
        img_bytes = io.BytesIO()
        img.save(img_bytes, format="PNG")
        img_bytes.seek(0)
        
        files = {"file": ("test.png", img_bytes, "image/png")}
        resp = requests.post(f"{BASE_URL}/api/vendor-ops/images/upload", files=files)
        assert resp.status_code == 401


class TestProductsCRUD:
    """Test Products CRUD via /api/vendor-ops/products"""
    
    @pytest.fixture
    def test_product_data(self):
        """Sample product data for testing."""
        return {
            "name": "TEST_VendorOps_Product_307",
            "description": "Test product for vendor ops testing",
            "category": "Test Category",
            "images": ["/uploads/product_images/test_thumbnail.webp"],
            "selling_price": 50000,
            "original_price": 55000,
            "vendor_cost": 40000,
            "stock": 100,
            "status": "draft",
            "variants": [
                {"attributes": {"size": "M", "color": "Red"}, "stock": 50, "sku": "TEST-M-RED"}
            ]
        }
    
    def test_create_product(self, admin_headers, test_product_data):
        """Create product should work and track created_by_role."""
        resp = requests.post(f"{BASE_URL}/api/vendor-ops/products", json=test_product_data, headers=admin_headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        result = resp.json()
        assert result.get("ok") is True
        assert "product" in result
        
        product = result["product"]
        assert product["name"] == test_product_data["name"]
        assert "id" in product
        assert "created_by" in product
        assert "created_by_role" in product
        assert product["created_by_role"] in ("admin", "super_admin", "vendor_ops")
        assert product["has_variants"] is True
        
        print(f"Created product: {product['id']}, created_by_role: {product['created_by_role']}")
        return product["id"]
    
    def test_list_products(self, admin_headers):
        """List products should return products array."""
        resp = requests.get(f"{BASE_URL}/api/vendor-ops/products", headers=admin_headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert "products" in data
        assert "total" in data
        assert isinstance(data["products"], list)
        print(f"Listed {data['total']} products")
    
    def test_list_products_with_status_filter(self, admin_headers):
        """List products with status filter should work."""
        resp = requests.get(f"{BASE_URL}/api/vendor-ops/products?status=draft", headers=admin_headers)
        assert resp.status_code == 200
        
        data = resp.json()
        # All returned products should have draft status
        for p in data["products"]:
            assert p.get("status") == "draft", f"Product {p.get('id')} has status {p.get('status')}, expected draft"
    
    def test_update_product_tracks_updated_by_role(self, admin_headers, test_product_data):
        """Update product should track updated_by_role."""
        # First create a product
        create_resp = requests.post(f"{BASE_URL}/api/vendor-ops/products", json=test_product_data, headers=admin_headers)
        assert create_resp.status_code == 200
        product_id = create_resp.json()["product"]["id"]
        
        # Update the product
        update_data = {"name": "TEST_VendorOps_Product_307_Updated", "status": "active"}
        update_resp = requests.put(f"{BASE_URL}/api/vendor-ops/products/{product_id}", json=update_data, headers=admin_headers)
        assert update_resp.status_code == 200, f"Expected 200, got {update_resp.status_code}: {update_resp.text}"
        
        result = update_resp.json()
        assert result.get("ok") is True
        
        # Verify the update by fetching the product
        get_resp = requests.get(f"{BASE_URL}/api/vendor-ops/products/{product_id}", headers=admin_headers)
        assert get_resp.status_code == 200
        
        product = get_resp.json()["product"]
        assert product["name"] == "TEST_VendorOps_Product_307_Updated"
        assert product["status"] == "active"
        assert "updated_by" in product
        assert "updated_by_role" in product
        assert product["updated_by_role"] in ("admin", "super_admin", "vendor_ops")
        
        print(f"Updated product {product_id}, updated_by_role: {product['updated_by_role']}")
    
    def test_get_single_product(self, admin_headers, test_product_data):
        """Get single product should return product details."""
        # Create a product first
        create_resp = requests.post(f"{BASE_URL}/api/vendor-ops/products", json=test_product_data, headers=admin_headers)
        assert create_resp.status_code == 200
        product_id = create_resp.json()["product"]["id"]
        
        # Get the product
        get_resp = requests.get(f"{BASE_URL}/api/vendor-ops/products/{product_id}", headers=admin_headers)
        assert get_resp.status_code == 200
        
        data = get_resp.json()
        assert "product" in data
        assert data["product"]["id"] == product_id
    
    def test_get_nonexistent_product_returns_404(self, admin_headers):
        """Get nonexistent product should return 404."""
        resp = requests.get(f"{BASE_URL}/api/vendor-ops/products/nonexistent-id-12345", headers=admin_headers)
        assert resp.status_code == 404
    
    def test_create_product_requires_name(self, admin_headers):
        """Create product without name should fail."""
        resp = requests.post(f"{BASE_URL}/api/vendor-ops/products", json={"images": ["/test.webp"]}, headers=admin_headers)
        assert resp.status_code == 400
    
    def test_create_product_requires_images(self, admin_headers):
        """Create product without images should fail."""
        resp = requests.post(f"{BASE_URL}/api/vendor-ops/products", json={"name": "Test"}, headers=admin_headers)
        assert resp.status_code == 400


class TestVendorsListing:
    """Test GET /api/vendor-ops/vendors"""
    
    def test_list_vendors(self, admin_headers):
        """List vendors should return vendors array."""
        resp = requests.get(f"{BASE_URL}/api/vendor-ops/vendors", headers=admin_headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert "vendors" in data
        assert "total" in data
        assert isinstance(data["vendors"], list)
        print(f"Listed {data['total']} vendors")
    
    def test_list_vendors_requires_auth(self):
        """List vendors should require authentication."""
        resp = requests.get(f"{BASE_URL}/api/vendor-ops/vendors")
        assert resp.status_code == 401


class TestPriceRequests:
    """Test Price Requests CRUD via /api/vendor-ops/price-requests"""
    
    @pytest.fixture
    def test_price_request_data(self):
        """Sample price request data."""
        return {
            "product_or_service": "TEST_Custom_Printing_Service_307",
            "description": "Need pricing for bulk custom t-shirt printing",
            "requested_by": "test_sales_user",
            "requested_by_role": "sales"
        }
    
    def test_create_price_request(self, admin_headers, test_price_request_data):
        """Create price request should set pending_vendor_response status."""
        resp = requests.post(f"{BASE_URL}/api/vendor-ops/price-requests", json=test_price_request_data, headers=admin_headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        result = resp.json()
        assert result.get("ok") is True
        assert "price_request" in result
        
        pr = result["price_request"]
        assert pr["product_or_service"] == test_price_request_data["product_or_service"]
        assert pr["status"] == "pending_vendor_response"
        assert pr["base_price"] is None
        assert "id" in pr
        
        print(f"Created price request: {pr['id']}, status: {pr['status']}")
        return pr["id"]
    
    def test_list_price_requests(self, admin_headers):
        """List price requests should return requests array."""
        resp = requests.get(f"{BASE_URL}/api/vendor-ops/price-requests", headers=admin_headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert "price_requests" in data
        assert "total" in data
        assert isinstance(data["price_requests"], list)
        print(f"Listed {data['total']} price requests")
    
    def test_list_price_requests_with_status_filter(self, admin_headers):
        """List price requests with status filter should work."""
        resp = requests.get(f"{BASE_URL}/api/vendor-ops/price-requests?status=pending_vendor_response", headers=admin_headers)
        assert resp.status_code == 200
        
        data = resp.json()
        for pr in data["price_requests"]:
            assert pr.get("status") == "pending_vendor_response"
    
    def test_update_price_request_auto_transitions_status(self, admin_headers, test_price_request_data):
        """Update price request with base_price should auto-transition to response_received."""
        # Create a price request
        create_resp = requests.post(f"{BASE_URL}/api/vendor-ops/price-requests", json=test_price_request_data, headers=admin_headers)
        assert create_resp.status_code == 200
        request_id = create_resp.json()["price_request"]["id"]
        
        # Update with base_price - should auto-transition status
        update_data = {"base_price": 25000, "lead_time": "3-5 days", "notes": "Bulk discount available"}
        update_resp = requests.put(f"{BASE_URL}/api/vendor-ops/price-requests/{request_id}", json=update_data, headers=admin_headers)
        assert update_resp.status_code == 200, f"Expected 200, got {update_resp.status_code}: {update_resp.text}"
        
        result = update_resp.json()
        assert result.get("ok") is True
        
        # Verify the update and status transition
        list_resp = requests.get(f"{BASE_URL}/api/vendor-ops/price-requests", headers=admin_headers)
        assert list_resp.status_code == 200
        
        # Find our request
        requests_list = list_resp.json()["price_requests"]
        updated_pr = next((pr for pr in requests_list if pr["id"] == request_id), None)
        assert updated_pr is not None
        assert updated_pr["status"] == "response_received", f"Expected response_received, got {updated_pr['status']}"
        assert updated_pr["base_price"] == 25000
        assert "updated_by_role" in updated_pr
        
        print(f"Updated price request {request_id}, status auto-transitioned to: {updated_pr['status']}")
    
    def test_update_nonexistent_price_request_returns_404(self, admin_headers):
        """Update nonexistent price request should return 404."""
        resp = requests.put(f"{BASE_URL}/api/vendor-ops/price-requests/nonexistent-id-12345", json={"notes": "test"}, headers=admin_headers)
        assert resp.status_code == 404


class TestRoleEnforcement:
    """Test role enforcement - only admin/vendor_ops should have access."""
    
    def test_staff_sales_cannot_access_dashboard_stats(self, staff_headers):
        """Staff with sales role should get 403 on vendor-ops endpoints."""
        resp = requests.get(f"{BASE_URL}/api/vendor-ops/dashboard-stats", headers=staff_headers)
        assert resp.status_code == 403, f"Expected 403 for sales role, got {resp.status_code}"
    
    def test_staff_sales_cannot_access_products(self, staff_headers):
        """Staff with sales role should get 403 on products endpoint."""
        resp = requests.get(f"{BASE_URL}/api/vendor-ops/products", headers=staff_headers)
        assert resp.status_code == 403, f"Expected 403 for sales role, got {resp.status_code}"
    
    def test_staff_sales_cannot_access_vendors(self, staff_headers):
        """Staff with sales role should get 403 on vendors endpoint."""
        resp = requests.get(f"{BASE_URL}/api/vendor-ops/vendors", headers=staff_headers)
        assert resp.status_code == 403, f"Expected 403 for sales role, got {resp.status_code}"
    
    def test_staff_sales_cannot_access_price_requests(self, staff_headers):
        """Staff with sales role should get 403 on price-requests endpoint."""
        resp = requests.get(f"{BASE_URL}/api/vendor-ops/price-requests", headers=staff_headers)
        assert resp.status_code == 403, f"Expected 403 for sales role, got {resp.status_code}"
    
    def test_staff_sales_cannot_create_product(self, staff_headers):
        """Staff with sales role should get 403 when creating product."""
        resp = requests.post(f"{BASE_URL}/api/vendor-ops/products", json={
            "name": "Test",
            "images": ["/test.webp"]
        }, headers=staff_headers)
        assert resp.status_code == 403, f"Expected 403 for sales role, got {resp.status_code}"
    
    def test_unauthenticated_gets_401(self):
        """Unauthenticated requests should get 401."""
        endpoints = [
            "/api/vendor-ops/dashboard-stats",
            "/api/vendor-ops/products",
            "/api/vendor-ops/vendors",
            "/api/vendor-ops/price-requests"
        ]
        for endpoint in endpoints:
            resp = requests.get(f"{BASE_URL}{endpoint}")
            assert resp.status_code == 401, f"Expected 401 for {endpoint}, got {resp.status_code}"


class TestCleanup:
    """Cleanup test data after tests."""
    
    def test_cleanup_test_products(self, admin_headers):
        """Clean up TEST_ prefixed products."""
        resp = requests.get(f"{BASE_URL}/api/vendor-ops/products", headers=admin_headers)
        if resp.status_code == 200:
            products = resp.json().get("products", [])
            test_products = [p for p in products if p.get("name", "").startswith("TEST_")]
            print(f"Found {len(test_products)} test products to clean up")
            # Note: No delete endpoint implemented, so just report
