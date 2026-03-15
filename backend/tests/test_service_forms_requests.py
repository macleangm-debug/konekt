"""
Test Suite for Service Forms API - Codebase Pack 2
Tests service forms listing, slug-based retrieval, admin endpoints, and service request submission
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_CREDENTIALS = {
    "email": "admin@konekt.co.tz",
    "password": "KnktcKk_L-hw1wSyquvd!"
}


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin auth token"""
    response = api_client.post(f"{BASE_URL}/api/admin/auth/login", json=ADMIN_CREDENTIALS)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed")


@pytest.fixture(scope="module")
def authenticated_admin(api_client, admin_token):
    """Session with admin auth header"""
    api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
    return api_client


class TestServiceFormsPublicAPI:
    """Public service forms endpoint tests"""
    
    def test_list_public_service_forms(self, api_client):
        """GET /api/service-forms/public - should return all active service forms"""
        response = api_client.get(f"{BASE_URL}/api/service-forms/public")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of service forms"
        assert len(data) == 9, f"Expected 9 seeded service forms, got {len(data)}"
        
        # Validate first form has required fields
        first_form = data[0]
        assert "id" in first_form, "Missing id field"
        assert "title" in first_form, "Missing title field"
        assert "slug" in first_form, "Missing slug field"
        assert "category" in first_form, "Missing category field"
        assert "base_price" in first_form, "Missing base_price field"
        assert "form_schema" in first_form, "Missing form_schema field"
        assert "add_ons" in first_form, "Missing add_ons field"
        
        print(f"PASS: Got {len(data)} public service forms")
    
    def test_service_forms_categories(self, api_client):
        """Verify all 4 categories are present"""
        response = api_client.get(f"{BASE_URL}/api/service-forms/public")
        
        assert response.status_code == 200
        
        data = response.json()
        categories = set(form["category"] for form in data)
        
        expected_categories = {"creative", "maintenance", "support", "copywriting"}
        assert categories == expected_categories, f"Expected categories {expected_categories}, got {categories}"
        
        print(f"PASS: All 4 categories present: {categories}")
    
    def test_filter_by_category(self, api_client):
        """GET /api/service-forms/public?category=creative - should filter by category"""
        response = api_client.get(f"{BASE_URL}/api/service-forms/public?category=creative")
        
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) == 5, f"Expected 5 creative services, got {len(data)}"
        
        for form in data:
            assert form["category"] == "creative", f"Expected creative category, got {form['category']}"
        
        print(f"PASS: Category filter returns {len(data)} creative services")
    
    def test_get_service_form_by_slug(self, api_client):
        """GET /api/service-forms/public/slug/logo-design - should return specific form"""
        response = api_client.get(f"{BASE_URL}/api/service-forms/public/slug/logo-design")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["slug"] == "logo-design", f"Expected slug logo-design, got {data['slug']}"
        assert data["title"] == "Logo Design", f"Expected title Logo Design, got {data['title']}"
        assert data["category"] == "creative"
        assert data["base_price"] == 150000
        assert data["currency"] == "TZS"
        
        # Validate form schema
        assert len(data["form_schema"]) > 0, "Form schema should not be empty"
        required_fields = [f for f in data["form_schema"] if f.get("required")]
        assert len(required_fields) >= 2, "Should have required fields"
        
        # Validate add-ons
        assert len(data["add_ons"]) == 3, f"Expected 3 add-ons, got {len(data['add_ons'])}"
        
        print(f"PASS: Logo design form retrieved with {len(data['form_schema'])} fields and {len(data['add_ons'])} add-ons")
    
    def test_get_nonexistent_slug(self, api_client):
        """GET /api/service-forms/public/slug/nonexistent - should return 404"""
        response = api_client.get(f"{BASE_URL}/api/service-forms/public/slug/nonexistent-service")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        print("PASS: Non-existent slug returns 404")
    
    def test_all_seeded_services_exist(self, api_client):
        """Verify all 9 seeded service forms exist"""
        expected_slugs = [
            "logo-design",
            "flyer-design",
            "brochure-design",
            "company-profile-design",
            "banner-design",
            "copywriting-service",
            "equipment-repair-request",
            "preventive-maintenance",
            "technical-support-request"
        ]
        
        response = api_client.get(f"{BASE_URL}/api/service-forms/public")
        assert response.status_code == 200
        
        data = response.json()
        actual_slugs = [form["slug"] for form in data]
        
        for slug in expected_slugs:
            assert slug in actual_slugs, f"Missing expected service: {slug}"
        
        print(f"PASS: All 9 seeded services verified: {expected_slugs}")


class TestServiceFormsAdminAPI:
    """Admin service forms endpoint tests"""
    
    def test_admin_endpoint_requires_auth(self, api_client):
        """GET /api/service-forms/admin - should require authentication"""
        # Clear any existing auth
        client = requests.Session()
        client.headers.update({"Content-Type": "application/json"})
        
        response = client.get(f"{BASE_URL}/api/service-forms/admin")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        
        print("PASS: Admin endpoint requires authentication")
    
    def test_admin_list_service_forms(self, authenticated_admin):
        """GET /api/service-forms/admin - should return all forms (including inactive)"""
        response = authenticated_admin.get(f"{BASE_URL}/api/service-forms/admin")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of service forms"
        assert len(data) >= 9, f"Expected at least 9 service forms, got {len(data)}"
        
        # Check that each form has admin-relevant fields
        for form in data:
            assert "is_active" in form, "Missing is_active field"
            assert "requires_payment" in form, "Missing requires_payment field"
            assert "requires_quote_review" in form, "Missing requires_quote_review field"
        
        print(f"PASS: Admin endpoint returns {len(data)} service forms")


class TestServiceRequestAPI:
    """Service request submission tests"""
    
    def test_create_service_request_basic(self, api_client):
        """POST /api/service-requests - should create a service request"""
        # First get a valid service form ID
        forms_response = api_client.get(f"{BASE_URL}/api/service-forms/public/slug/logo-design")
        assert forms_response.status_code == 200
        form_id = forms_response.json()["id"]
        
        # Create service request
        request_data = {
            "service_form_id": form_id,
            "customer_name": "TEST_Service Request User",
            "customer_email": "test_service_request@example.com",
            "company_name": "Test Company Ltd",
            "country": "TZ",
            "city": "Dar es Salaam",
            "phone_prefix": "+255",
            "phone_number": "712345678",
            "address_line_1": "123 Test Street",
            "service_answers": {
                "brand_description": "A modern tech startup focusing on AI solutions",
                "industry": "Technology"
            },
            "selected_add_ons": [],
            "payment_choice": "quote_first",
            "save_address": True
        }
        
        response = api_client.post(f"{BASE_URL}/api/service-requests", json=request_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain id"
        assert data["service_form_id"] == form_id
        assert data["customer_email"] == request_data["customer_email"]
        assert data["service_title"] == "Logo Design"
        assert data["status"] == "submitted"
        assert data["base_price"] == 150000.0
        assert data["total_price"] == 150000.0  # No add-ons
        
        print(f"PASS: Service request created with ID {data['id']}")
    
    def test_create_service_request_with_addons(self, api_client):
        """POST /api/service-requests - should calculate total with add-ons"""
        forms_response = api_client.get(f"{BASE_URL}/api/service-forms/public/slug/logo-design")
        assert forms_response.status_code == 200
        form_id = forms_response.json()["id"]
        
        request_data = {
            "service_form_id": form_id,
            "customer_name": "TEST_Addon User",
            "customer_email": "test_addon@example.com",
            "company_name": "Addon Test Ltd",
            "country": "TZ",
            "city": "Dar es Salaam",
            "phone_prefix": "+255",
            "phone_number": "712345679",
            "address_line_1": "456 Addon Street",
            "service_answers": {
                "brand_description": "A luxury brand",
                "industry": "Fashion"
            },
            "selected_add_ons": ["copywriting-tagline", "brand-guideline-mini"],
            "payment_choice": "pay_now",
            "save_address": False
        }
        
        response = api_client.post(f"{BASE_URL}/api/service-requests", json=request_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify add-ons calculation: 150000 base + 30000 tagline + 50000 brand guide = 230000
        assert data["base_price"] == 150000.0
        assert data["add_on_total"] == 80000.0, f"Expected add_on_total 80000, got {data['add_on_total']}"
        assert data["total_price"] == 230000.0, f"Expected total 230000, got {data['total_price']}"
        assert len(data["selected_add_ons"]) == 2
        
        print(f"PASS: Service request with add-ons - Base: {data['base_price']}, Add-ons: {data['add_on_total']}, Total: {data['total_price']}")
    
    def test_service_request_missing_form_id(self, api_client):
        """POST /api/service-requests - should return 400 for missing service_form_id"""
        request_data = {
            "customer_name": "Test User",
            "customer_email": "test@example.com"
        }
        
        response = api_client.post(f"{BASE_URL}/api/service-requests", json=request_data)
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        
        print("PASS: Missing service_form_id returns 400")
    
    def test_service_request_invalid_form_id(self, api_client):
        """POST /api/service-requests - should return 404 for invalid service_form_id"""
        request_data = {
            "service_form_id": "000000000000000000000000",  # Valid ObjectId format but doesn't exist
            "customer_name": "Test User",
            "customer_email": "test@example.com"
        }
        
        response = api_client.post(f"{BASE_URL}/api/service-requests", json=request_data)
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        print("PASS: Invalid service_form_id returns 404")
    
    def test_maintenance_service_request(self, api_client):
        """Test creating a maintenance category service request"""
        forms_response = api_client.get(f"{BASE_URL}/api/service-forms/public/slug/equipment-repair-request")
        assert forms_response.status_code == 200
        form = forms_response.json()
        
        request_data = {
            "service_form_id": form["id"],
            "customer_name": "TEST_Maintenance User",
            "customer_email": "test_maintenance@example.com",
            "company_name": "Office Solutions Ltd",
            "country": "KE",
            "city": "Nairobi",
            "phone_prefix": "+254",
            "phone_number": "712345680",
            "address_line_1": "789 Repair Street",
            "service_answers": {
                "machine_type": "Printer",
                "brand": "HP",
                "issue_description": "Paper jamming frequently",
                "urgency": "high"
            },
            "selected_add_ons": ["priority-diagnosis"],
            "payment_choice": "quote_first",
            "save_address": True
        }
        
        response = api_client.post(f"{BASE_URL}/api/service-requests", json=request_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["category"] == "maintenance"
        assert data["service_slug"] == "equipment-repair-request"
        assert data["base_price"] == 50000.0
        assert data["add_on_total"] == 40000.0  # priority-diagnosis
        
        print(f"PASS: Maintenance service request created - Total: {data['total_price']}")


class TestServiceFormSchemaValidation:
    """Tests for service form schema and structure"""
    
    def test_form_schema_field_types(self, api_client):
        """Verify various field types in form schemas"""
        response = api_client.get(f"{BASE_URL}/api/service-forms/public/slug/logo-design")
        assert response.status_code == 200
        
        schema = response.json()["form_schema"]
        field_types = {f["key"]: f["type"] for f in schema}
        
        # Check expected field types
        assert field_types.get("brand_description") == "textarea"
        assert field_types.get("industry") == "text"
        assert field_types.get("style_direction") == "select"
        assert field_types.get("deadline") == "date"
        
        print(f"PASS: Form schema has correct field types")
    
    def test_select_field_has_options(self, api_client):
        """Verify select fields have options"""
        response = api_client.get(f"{BASE_URL}/api/service-forms/public/slug/logo-design")
        assert response.status_code == 200
        
        schema = response.json()["form_schema"]
        style_field = next((f for f in schema if f["key"] == "style_direction"), None)
        
        assert style_field is not None, "style_direction field should exist"
        assert "options" in style_field, "Select field should have options"
        assert len(style_field["options"]) == 5, f"Expected 5 style options, got {len(style_field['options'])}"
        
        print(f"PASS: Select field has {len(style_field['options'])} options")
    
    def test_radio_field_has_options(self, api_client):
        """Verify radio fields have options"""
        response = api_client.get(f"{BASE_URL}/api/service-forms/public/slug/flyer-design")
        assert response.status_code == 200
        
        schema = response.json()["form_schema"]
        format_field = next((f for f in schema if f["key"] == "format_type"), None)
        
        assert format_field is not None, "format_type field should exist"
        assert format_field["type"] == "radio"
        assert len(format_field["options"]) == 3, "Format should have 3 options (Digital, Print, Both)"
        
        print("PASS: Radio field has correct options")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
