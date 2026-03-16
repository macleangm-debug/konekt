"""
Partner Listings & Media Pack Tests
Tests for partner listing submission, media upload, CSV/Excel import, and marketplace APIs

Features tested:
- Partner authentication (login/me)
- Partner listing submission CRUD
- Media upload API (images/documents)
- CSV template download and import preview
- Admin marketplace listings CRUD
- Public marketplace API
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from review request
PARTNER_EMAIL = "partner@demo.com"
PARTNER_PASSWORD = "partner123"
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"

# Alternative partner credentials from previous test
DEMO_PARTNER_EMAIL = "demo@supplier.com"
DEMO_PARTNER_PASSWORD = "partner123"


class TestPartnerAuthentication:
    """Test partner authentication endpoints"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    def test_partner_login_success(self, session):
        """Test partner login with valid credentials"""
        # Try primary credentials
        response = session.post(f"{BASE_URL}/api/partner-auth/login", json={
            "email": PARTNER_EMAIL,
            "password": PARTNER_PASSWORD
        })
        
        # If primary fails, try demo credentials
        if response.status_code != 200:
            response = session.post(f"{BASE_URL}/api/partner-auth/login", json={
                "email": DEMO_PARTNER_EMAIL,
                "password": DEMO_PARTNER_PASSWORD
            })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert "partner" in data
        print(f"✓ Partner login successful for: {data['user'].get('email')}")
        return data["access_token"]
    
    def test_partner_login_invalid_credentials(self, session):
        """Test partner login with invalid credentials returns 401"""
        response = session.post(f"{BASE_URL}/api/partner-auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials correctly return 401")
    
    def test_partner_login_missing_fields(self, session):
        """Test partner login with missing fields returns 400"""
        response = session.post(f"{BASE_URL}/api/partner-auth/login", json={
            "email": "",
            "password": ""
        })
        assert response.status_code == 400
        print("✓ Missing fields correctly return 400")


class TestPartnerListingSubmission:
    """Test partner listing submission CRUD operations"""
    
    @pytest.fixture(scope="class")
    def partner_token(self):
        """Get partner auth token"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/partner-auth/login", json={
            "email": PARTNER_EMAIL,
            "password": PARTNER_PASSWORD
        })
        if response.status_code != 200:
            response = session.post(f"{BASE_URL}/api/partner-auth/login", json={
                "email": DEMO_PARTNER_EMAIL,
                "password": DEMO_PARTNER_PASSWORD
            })
        if response.status_code != 200:
            pytest.skip("Could not authenticate partner user")
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_session(self, partner_token):
        """Session with auth header"""
        session = requests.Session()
        session.headers.update({
            "Authorization": f"Bearer {partner_token}",
            "Content-Type": "application/json"
        })
        return session
    
    def test_get_partner_listings(self, auth_session):
        """Test fetching partner's own listings"""
        response = auth_session.get(f"{BASE_URL}/api/partner-listings")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Partner listings fetched: {len(data)} items")
    
    def test_create_partner_listing(self, auth_session):
        """Test creating a new partner listing"""
        import uuid
        unique_id = str(uuid.uuid4())[:8]
        
        payload = {
            "listing_type": "product",
            "product_family": "promotional",
            "sku": f"TEST-LISTING-{unique_id}",
            "slug": f"test-listing-{unique_id}",
            "name": f"Test Promotional Product {unique_id}",
            "short_description": "A test product for automated testing",
            "description": "This is a detailed description for the test product",
            "category": "promotional",
            "subcategory": "mugs",
            "brand": "Test Brand",
            "base_partner_price": 5000,
            "partner_available_qty": 100,
            "partner_status": "in_stock",
            "lead_time_days": 3
        }
        
        response = auth_session.post(f"{BASE_URL}/api/partner-listings", json=payload)
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        assert data["sku"] == payload["sku"]
        assert data["name"] == payload["name"]
        assert data["approval_status"] == "submitted"
        assert data["source_mode"] == "partner"
        print(f"✓ Partner listing created: {data['sku']}")
        
        # Store for cleanup
        return data["id"]
    
    def test_create_service_listing(self, auth_session):
        """Test creating a service listing"""
        import uuid
        unique_id = str(uuid.uuid4())[:8]
        
        payload = {
            "listing_type": "service",
            "service_family": "printing",
            "sku": f"TEST-SERVICE-{unique_id}",
            "slug": f"test-service-{unique_id}",
            "name": f"Test Printing Service {unique_id}",
            "short_description": "Test printing service",
            "category": "printing",
            "base_partner_price": 25000,
            "partner_available_qty": 9999,
            "partner_status": "in_stock",
            "lead_time_days": 5
        }
        
        response = auth_session.post(f"{BASE_URL}/api/partner-listings", json=payload)
        assert response.status_code == 200, f"Create service failed: {response.text}"
        
        data = response.json()
        assert data["listing_type"] == "service"
        assert data["service_family"] == "printing"
        print(f"✓ Service listing created: {data['sku']}")
    
    def test_create_listing_missing_required_fields(self, auth_session):
        """Test creating listing with missing required fields"""
        payload = {
            "listing_type": "product"
            # Missing sku, name
        }
        
        response = auth_session.post(f"{BASE_URL}/api/partner-listings", json=payload)
        assert response.status_code == 400
        print("✓ Missing required fields correctly rejected")
    
    def test_create_duplicate_sku_rejected(self, auth_session):
        """Test that duplicate SKU is rejected"""
        import uuid
        unique_id = str(uuid.uuid4())[:8]
        sku = f"TEST-DUP-{unique_id}"
        
        # Create first listing
        payload1 = {
            "listing_type": "product",
            "product_family": "promotional",
            "sku": sku,
            "slug": f"test-dup-1-{unique_id}",
            "name": "First Listing",
            "category": "promotional",
            "base_partner_price": 1000
        }
        
        response1 = auth_session.post(f"{BASE_URL}/api/partner-listings", json=payload1)
        assert response1.status_code == 200
        
        # Try to create duplicate
        payload2 = {
            "listing_type": "product",
            "product_family": "promotional",
            "sku": sku,  # Same SKU
            "slug": f"test-dup-2-{unique_id}",
            "name": "Duplicate Listing",
            "category": "promotional",
            "base_partner_price": 2000
        }
        
        response2 = auth_session.post(f"{BASE_URL}/api/partner-listings", json=payload2)
        assert response2.status_code == 400
        assert "already exists" in response2.text.lower() or "sku" in response2.text.lower()
        print("✓ Duplicate SKU correctly rejected")
    
    def test_get_listing_stats(self, auth_session):
        """Test partner listing statistics endpoint"""
        response = auth_session.get(f"{BASE_URL}/api/partner-listings/stats/my-summary")
        assert response.status_code == 200
        
        data = response.json()
        assert "total" in data
        assert "published" in data
        assert "by_status" in data
        print(f"✓ Listing stats: total={data['total']}, published={data['published']}")


class TestMediaUpload:
    """Test media upload endpoints"""
    
    def test_upload_image_validation(self):
        """Test that image upload validates file types"""
        session = requests.Session()
        
        # Try uploading an invalid file type
        files = {
            "file": ("test.txt", b"This is not an image", "text/plain")
        }
        data = {"kind": "image"}
        
        response = session.post(
            f"{BASE_URL}/api/media-upload/listing-media",
            files=files,
            data=data
        )
        
        # Should reject invalid file type
        assert response.status_code == 400
        assert "unsupported" in response.text.lower()
        print("✓ Invalid image file type correctly rejected")
    
    def test_upload_valid_image(self):
        """Test uploading a valid image"""
        session = requests.Session()
        
        # Create a minimal valid PNG (1x1 pixel)
        png_data = (
            b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01'
            b'\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00'
            b'\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        )
        
        files = {
            "file": ("test.png", png_data, "image/png")
        }
        data = {"kind": "image"}
        
        response = session.post(
            f"{BASE_URL}/api/media-upload/listing-media",
            files=files,
            data=data
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        result = response.json()
        assert "url" in result
        assert result["kind"] == "image"
        print(f"✓ Image uploaded: {result['url']}")
    
    def test_upload_document_validation(self):
        """Test that document upload validates file types"""
        session = requests.Session()
        
        # Try uploading an invalid document type (exe file)
        files = {
            "file": ("test.exe", b"Not a valid document", "application/octet-stream")
        }
        data = {"kind": "document"}
        
        response = session.post(
            f"{BASE_URL}/api/media-upload/listing-media",
            files=files,
            data=data
        )
        
        assert response.status_code == 400
        print("✓ Invalid document file type correctly rejected")


class TestCSVImport:
    """Test CSV/Excel import functionality"""
    
    @pytest.fixture(scope="class")
    def partner_token(self):
        """Get partner auth token"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/partner-auth/login", json={
            "email": PARTNER_EMAIL,
            "password": PARTNER_PASSWORD
        })
        if response.status_code != 200:
            response = session.post(f"{BASE_URL}/api/partner-auth/login", json={
                "email": DEMO_PARTNER_EMAIL,
                "password": DEMO_PARTNER_PASSWORD
            })
        if response.status_code != 200:
            pytest.skip("Could not authenticate partner user")
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_session(self, partner_token):
        """Session with auth header"""
        session = requests.Session()
        session.headers.update({"Authorization": f"Bearer {partner_token}"})
        return session
    
    def test_csv_template_download(self, auth_session):
        """Test CSV template download"""
        response = auth_session.get(f"{BASE_URL}/api/partner-import/template/csv")
        assert response.status_code == 200
        
        content = response.text
        # Check that header contains expected columns
        assert "listing_type" in content
        assert "sku" in content
        assert "name" in content
        assert "category" in content
        assert "base_partner_price" in content
        print("✓ CSV template downloaded successfully")
    
    def test_template_fields_documentation(self, auth_session):
        """Test field descriptions endpoint"""
        response = auth_session.get(f"{BASE_URL}/api/partner-import/template/fields")
        assert response.status_code == 200
        
        data = response.json()
        assert "fields" in data
        assert "sku" in data["fields"]
        assert "listing_type" in data["fields"]
        print(f"✓ Template fields documentation: {len(data['fields'])} fields documented")
    
    def test_import_preview_validates_data(self, auth_session):
        """Test import preview with validation"""
        import uuid
        unique_id = str(uuid.uuid4())[:8]
        
        # Create valid CSV content
        csv_content = f"""listing_type,product_family,service_family,sku,slug,name,short_description,description,category,subcategory,brand,country_code,regions,currency,base_partner_price,partner_available_qty,partner_status,lead_time_days,images,documents
product,promotional,,TEST-CSV-{unique_id},test-csv-{unique_id},Test CSV Product,Short desc,Long desc,promotional,mugs,TestBrand,TZ,Dar es Salaam,TZS,5000,50,in_stock,2,,"""
        
        files = {
            "file": ("test_import.csv", csv_content.encode('utf-8'), "text/csv")
        }
        
        response = auth_session.post(
            f"{BASE_URL}/api/partner-import/preview",
            files=files
        )
        
        assert response.status_code == 200, f"Preview failed: {response.text}"
        data = response.json()
        assert "total_rows" in data
        assert "valid_count" in data
        assert "error_count" in data
        assert "preview_rows" in data
        print(f"✓ Import preview: {data['valid_count']} valid, {data['error_count']} errors")
    
    def test_import_preview_catches_errors(self, auth_session):
        """Test that import preview catches validation errors"""
        # CSV with missing required fields
        csv_content = """listing_type,product_family,service_family,sku,slug,name,short_description,description,category,subcategory,brand,country_code,regions,currency,base_partner_price,partner_available_qty,partner_status,lead_time_days,images,documents
product,,,,,Missing Required Fields,Short desc,Long desc,promotional,mugs,TestBrand,TZ,Dar es Salaam,TZS,5000,50,in_stock,2,,"""
        
        files = {
            "file": ("test_errors.csv", csv_content.encode('utf-8'), "text/csv")
        }
        
        response = auth_session.post(
            f"{BASE_URL}/api/partner-import/preview",
            files=files
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["error_count"] > 0
        assert len(data["errors"]) > 0
        print(f"✓ Import preview caught {data['error_count']} validation errors")


class TestAdminMarketplaceListings:
    """Test admin marketplace listings endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Could not authenticate admin user: {response.text}")
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def admin_session(self, admin_token):
        """Session with admin auth header"""
        session = requests.Session()
        session.headers.update({
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        })
        return session
    
    def test_list_marketplace_listings(self, admin_session):
        """Test listing all marketplace items"""
        response = admin_session.get(f"{BASE_URL}/api/admin/marketplace-listings")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Admin marketplace listings: {len(data)} items")
    
    def test_list_with_filters(self, admin_session):
        """Test filtering marketplace listings"""
        # Filter by listing type
        response = admin_session.get(
            f"{BASE_URL}/api/admin/marketplace-listings",
            params={"listing_type": "product"}
        )
        assert response.status_code == 200
        
        # Filter by approval status
        response = admin_session.get(
            f"{BASE_URL}/api/admin/marketplace-listings",
            params={"approval_status": "submitted"}
        )
        assert response.status_code == 200
        print("✓ Marketplace listings filtered successfully")
    
    def test_get_listing_stats(self, admin_session):
        """Test marketplace listing statistics"""
        response = admin_session.get(f"{BASE_URL}/api/admin/marketplace-listings/stats/summary")
        assert response.status_code == 200
        
        data = response.json()
        assert "total" in data
        assert "published" in data
        assert "pending_review" in data
        assert "by_status" in data
        print(f"✓ Listing stats: total={data['total']}, pending={data['pending_review']}")


class TestPublicMarketplace:
    """Test public marketplace endpoints"""
    
    def test_get_country_listings(self):
        """Test public country listings endpoint"""
        session = requests.Session()
        
        response = session.get(f"{BASE_URL}/api/public-marketplace/country/TZ")
        assert response.status_code == 200
        
        data = response.json()
        assert "total" in data
        assert "items" in data
        assert isinstance(data["items"], list)
        
        # Verify internal fields are hidden
        for item in data["items"]:
            assert "partner_id" not in item
            assert "base_partner_price" not in item
            assert "admin_notes" not in item
        
        print(f"✓ Public marketplace for TZ: {data['total']} items")
    
    def test_get_country_categories(self):
        """Test country categories endpoint"""
        session = requests.Session()
        
        response = session.get(f"{BASE_URL}/api/public-marketplace/categories/TZ")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Categories for TZ: {len(data)} categories")
    
    def test_get_featured_listings(self):
        """Test featured listings endpoint"""
        session = requests.Session()
        
        response = session.get(f"{BASE_URL}/api/public-marketplace/featured/TZ")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Featured listings for TZ: {len(data)} items")
    
    def test_search_listings(self):
        """Test marketplace search endpoint"""
        session = requests.Session()
        
        response = session.get(
            f"{BASE_URL}/api/public-marketplace/search",
            params={"q": "test", "country_code": "TZ"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Search results: {len(data)} items")
    
    def test_new_arrivals(self):
        """Test new arrivals endpoint"""
        session = requests.Session()
        
        response = session.get(f"{BASE_URL}/api/public-marketplace/new-arrivals/TZ")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ New arrivals for TZ: {len(data)} items")


class TestPartnerMe:
    """Test partner /me endpoint to verify auth token works"""
    
    @pytest.fixture(scope="class")
    def partner_token(self):
        """Get partner auth token"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/partner-auth/login", json={
            "email": PARTNER_EMAIL,
            "password": PARTNER_PASSWORD
        })
        if response.status_code != 200:
            response = session.post(f"{BASE_URL}/api/partner-auth/login", json={
                "email": DEMO_PARTNER_EMAIL,
                "password": DEMO_PARTNER_PASSWORD
            })
        if response.status_code != 200:
            pytest.skip("Could not authenticate partner user")
        return response.json().get("access_token")
    
    def test_get_me(self, partner_token):
        """Test partner /me endpoint"""
        session = requests.Session()
        session.headers.update({"Authorization": f"Bearer {partner_token}"})
        
        response = session.get(f"{BASE_URL}/api/partner-auth/me")
        assert response.status_code == 200, f"/me failed: {response.text}"
        
        data = response.json()
        assert "user" in data
        assert "partner" in data
        print(f"✓ Partner /me returned: {data['user'].get('email')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
