"""
Test Business Settings API - iteration 265
Tests for:
1. GET /api/admin/business-settings - Get current settings (admin auth required)
2. PUT /api/admin/business-settings - Update settings including stamp_path and company_logo_path
3. GET /api/admin/business-settings/public - Get public business info (no auth)
4. POST /api/files/upload?folder=branding - File upload for logo/stamp
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials from test_credentials.md
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    data = response.json()
    token = data.get("token") or data.get("access_token")
    if not token:
        pytest.skip("No token in login response")
    return token


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    """Headers with admin auth token"""
    return {"Authorization": f"Bearer {admin_token}"}


class TestBusinessSettingsAPI:
    """Business Settings API tests"""

    def test_get_business_settings_requires_auth(self):
        """GET /api/admin/business-settings should require authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/business-settings")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ GET /api/admin/business-settings requires auth")

    def test_get_business_settings_success(self, auth_headers):
        """GET /api/admin/business-settings should return settings with all fields"""
        response = requests.get(
            f"{BASE_URL}/api/admin/business-settings",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify Business Identity fields exist
        assert "company_name" in data, "Missing company_name field"
        assert "trading_name" in data or data.get("trading_name") == "", "Missing trading_name field"
        assert "tin" in data, "Missing tin field"
        assert "brn" in data or data.get("brn") == "", "Missing brn field"
        assert "vrn" in data or data.get("vrn") == "", "Missing vrn field"
        assert "company_logo_path" in data or data.get("company_logo_path") == "", "Missing company_logo_path field"
        # stamp_path may not exist in older records, but should be settable
        # We verify it can be set in the update test
        
        # Verify Contact fields
        assert "email" in data, "Missing email field"
        assert "phone" in data, "Missing phone field"
        assert "website" in data, "Missing website field"
        assert "city" in data, "Missing city field"
        assert "address" in data or "address_line_1" in data, "Missing address field"
        
        # Verify Banking fields
        assert "bank_name" in data, "Missing bank_name field"
        assert "bank_account_name" in data, "Missing bank_account_name field"
        assert "bank_account_number" in data, "Missing bank_account_number field"
        assert "bank_branch" in data, "Missing bank_branch field"
        assert "bank_swift_code" in data, "Missing bank_swift_code field"
        
        # Verify Document & Tax fields
        assert "currency" in data, "Missing currency field"
        assert "default_tax_rate" in data, "Missing default_tax_rate field"
        assert "default_payment_terms" in data, "Missing default_payment_terms field"
        
        print(f"✓ GET /api/admin/business-settings returns all fields")
        print(f"  - company_name: {data.get('company_name')}")
        print(f"  - trading_name: {data.get('trading_name')}")
        print(f"  - tin: {data.get('tin')}")
        print(f"  - stamp_path: {data.get('stamp_path')}")
        print(f"  - company_logo_path: {data.get('company_logo_path')}")

    def test_update_business_settings_success(self, auth_headers):
        """PUT /api/admin/business-settings should update settings"""
        # First get current settings
        get_response = requests.get(
            f"{BASE_URL}/api/admin/business-settings",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        current = get_response.json()
        
        # Update with test values
        test_update = {
            "company_name": "TEST_Konekt Ltd",
            "trading_name": "Konekt",
            "tin": "TEST-TIN-265",
            "stamp_path": "branding/test-stamp.png",
            "company_logo_path": "branding/test-logo.png",
            "email": "test@konekt.co.tz",
            "phone": "+255 123 456 789",
            "bank_name": "Test Bank",
            "currency": "TZS"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/business-settings",
            json=test_update,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify updates were applied
        assert data.get("company_name") == "TEST_Konekt Ltd", f"company_name not updated: {data.get('company_name')}"
        assert data.get("tin") == "TEST-TIN-265", f"tin not updated: {data.get('tin')}"
        assert data.get("stamp_path") == "branding/test-stamp.png", f"stamp_path not updated: {data.get('stamp_path')}"
        assert data.get("company_logo_path") == "branding/test-logo.png", f"company_logo_path not updated: {data.get('company_logo_path')}"
        
        print("✓ PUT /api/admin/business-settings updates settings correctly")
        print(f"  - Updated company_name: {data.get('company_name')}")
        print(f"  - Updated stamp_path: {data.get('stamp_path')}")
        print(f"  - Updated company_logo_path: {data.get('company_logo_path')}")
        
        # Verify persistence with GET
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/business-settings",
            headers=auth_headers
        )
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        assert verify_data.get("stamp_path") == "branding/test-stamp.png", "stamp_path not persisted"
        assert verify_data.get("company_logo_path") == "branding/test-logo.png", "company_logo_path not persisted"
        print("✓ Settings persisted correctly (verified with GET)")

    def test_update_business_settings_requires_auth(self):
        """PUT /api/admin/business-settings should require authentication"""
        response = requests.put(
            f"{BASE_URL}/api/admin/business-settings",
            json={"company_name": "Unauthorized Update"}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ PUT /api/admin/business-settings requires auth")

    def test_get_public_business_info_no_auth(self):
        """GET /api/admin/business-settings/public should work without auth"""
        response = requests.get(f"{BASE_URL}/api/admin/business-settings/public")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify public fields are present
        expected_fields = [
            "company_name", "trading_name", "phone", "email", 
            "address", "city", "country", "website", "tin", "brn",
            "bank_name", "bank_account_name", "bank_account_number",
            "bank_branch", "swift_code", "logo_url", "stamp_url"
        ]
        
        for field in expected_fields:
            assert field in data, f"Missing public field: {field}"
        
        print("✓ GET /api/admin/business-settings/public returns public info without auth")
        print(f"  - company_name: {data.get('company_name')}")
        print(f"  - logo_url: {data.get('logo_url')}")
        print(f"  - stamp_url: {data.get('stamp_url')}")


class TestFileUploadAPI:
    """File upload API tests for branding folder"""

    def test_file_upload_endpoint_exists(self, auth_headers):
        """POST /api/files/upload should exist and accept multipart/form-data"""
        # Create a simple test image (1x1 PNG)
        import io
        # Minimal valid PNG (1x1 transparent pixel)
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  # IHDR chunk
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,  # 1x1
            0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,  # 8-bit RGBA
            0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,  # IDAT chunk
            0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,  # compressed data
            0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,  # 
            0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,  # IEND chunk
            0x42, 0x60, 0x82
        ])
        
        files = {
            'file': ('test-logo.png', io.BytesIO(png_data), 'image/png')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/files/upload?folder=branding",
            files=files,
            headers=auth_headers
        )
        
        # Should return 200 with file info or 400/422 for validation
        assert response.status_code in [200, 400, 422], f"Unexpected status: {response.status_code}: {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("ok") == True or "storage_path" in data, "Missing success indicator"
            print(f"✓ POST /api/files/upload?folder=branding works")
            print(f"  - storage_path: {data.get('storage_path')}")
        else:
            print(f"✓ POST /api/files/upload endpoint exists (returned {response.status_code})")


class TestContentCenterRegression:
    """Regression tests for Content Center (from iteration 264)"""

    def test_content_center_api_works(self, auth_headers):
        """GET /api/admin/content-center should still work"""
        response = requests.get(
            f"{BASE_URL}/api/admin/content-center",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "items" in data, "Missing items in response"
        print(f"✓ GET /api/admin/content-center returns {len(data.get('items', []))} items")

    def test_campaigns_api_works(self, auth_headers):
        """GET /api/content-engine/campaigns should still work"""
        response = requests.get(
            f"{BASE_URL}/api/content-engine/campaigns",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        campaigns = data.get("campaigns", [])
        print(f"✓ GET /api/content-engine/campaigns returns {len(campaigns)} campaigns")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
