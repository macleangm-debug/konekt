"""
Partner Portal Pack - Backend API Tests
Tests for: Partner Auth, Partner Portal Dashboard, Catalog CRUD, Fulfillment Jobs,
Settlements, Bulk Upload, Country Launch Config, Country Expansion, Partner Applications
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from the review request
PARTNER_EMAIL = "demo@supplier.com"
PARTNER_PASSWORD = "partner123"
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"

# Shared state for tests
PARTNER_TOKEN = None
TEST_ITEM_ID = None

def get_partner_token():
    """Get or refresh partner token"""
    global PARTNER_TOKEN
    if PARTNER_TOKEN:
        return PARTNER_TOKEN
        
    response = requests.post(f"{BASE_URL}/api/partner-auth/login", json={
        "email": PARTNER_EMAIL,
        "password": PARTNER_PASSWORD
    })
    if response.status_code == 200:
        PARTNER_TOKEN = response.json().get("access_token")
        return PARTNER_TOKEN
    return None

def partner_headers():
    """Get headers with partner auth"""
    token = get_partner_token()
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}" if token else ""
    }

# ============== PARTNER AUTH TESTS ==============
class TestPartnerAuth:
    """Partner Authentication endpoint tests"""
    
    def test_partner_login_success(self):
        """Test partner login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/partner-auth/login", json={
            "email": PARTNER_EMAIL,
            "password": PARTNER_PASSWORD
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "access_token" in data, "Response missing access_token"
        assert "token_type" in data, "Response missing token_type"
        assert data["token_type"] == "bearer"
        assert "user" in data, "Response missing user data"
        
        # Verify user data
        user = data["user"]
        assert user["email"] == PARTNER_EMAIL
        assert "password_hash" not in user, "Password hash should not be exposed"
        
    def test_partner_login_invalid_credentials(self):
        """Test partner login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/partner-auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        
    def test_partner_login_missing_fields(self):
        """Test partner login with missing fields"""
        response = requests.post(
            f"{BASE_URL}/api/partner-auth/login",
            headers={"Content-Type": "application/json"},
            json={"email": "", "password": ""}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        
    def test_partner_me_endpoint(self):
        """Test /me endpoint returns current partner user"""
        response = requests.get(
            f"{BASE_URL}/api/partner-auth/me",
            headers=partner_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "user" in data
        assert data["user"]["email"] == PARTNER_EMAIL

# ============== PARTNER DASHBOARD TESTS ==============
class TestPartnerDashboard:
    """Partner Dashboard endpoint tests"""
    
    def test_dashboard_returns_summary_stats(self):
        """Test dashboard endpoint returns partner summary statistics"""
        response = requests.get(
            f"{BASE_URL}/api/partner-portal/dashboard",
            headers=partner_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "partner" in data, "Response missing partner data"
        assert "summary" in data, "Response missing summary data"
        
        # Verify summary fields
        summary = data["summary"]
        assert "catalog_count" in summary
        assert "active_allocations" in summary
        assert "pending_fulfillment" in summary
        assert "completed_jobs" in summary
        assert "settlement_total_estimate" in summary
        
        # Verify values are numbers
        assert isinstance(summary["catalog_count"], int)
        assert isinstance(summary["pending_fulfillment"], int)
        
    def test_dashboard_requires_auth(self):
        """Test dashboard requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/partner-portal/dashboard",
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 401

# ============== PARTNER CATALOG CRUD TESTS ==============
class TestPartnerCatalog:
    """Partner Catalog CRUD tests"""
    
    def test_get_catalog_items(self):
        """Test getting partner's catalog items"""
        response = requests.get(
            f"{BASE_URL}/api/partner-portal/catalog",
            headers=partner_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Expected list of catalog items"
        
    def test_create_catalog_item(self):
        """Test creating a new catalog item"""
        global TEST_ITEM_ID
        
        payload = {
            "source_type": "product",
            "sku": f"TEST-SKU-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "name": "TEST Partner Product Item",
            "description": "Test product for partner portal testing",
            "category": "promotional",
            "base_partner_price": 15000,
            "partner_available_qty": 100,
            "partner_status": "in_stock",
            "lead_time_days": 3,
            "min_order_qty": 10,
            "unit": "piece",
            "regions": ["Dar es Salaam", "Arusha"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/partner-portal/catalog",
            headers=partner_headers(),
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response
        assert "id" in data, "Response missing item ID"
        assert data["sku"] == payload["sku"]
        assert data["name"] == payload["name"]
        assert data["base_partner_price"] == payload["base_partner_price"]
        
        # Store for later tests
        TEST_ITEM_ID = data["id"]
        
    def test_update_catalog_item(self):
        """Test updating a catalog item"""
        global TEST_ITEM_ID
        
        if not TEST_ITEM_ID:
            pytest.skip("No test item ID available")
            
        payload = {
            "name": "TEST Partner Product Item - Updated",
            "base_partner_price": 18000,
            "partner_available_qty": 150
        }
        
        response = requests.put(
            f"{BASE_URL}/api/partner-portal/catalog/{TEST_ITEM_ID}",
            headers=partner_headers(),
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify update
        assert data["name"] == payload["name"]
        assert data["base_partner_price"] == payload["base_partner_price"]
        
    def test_delete_catalog_item(self):
        """Test deactivating a catalog item"""
        global TEST_ITEM_ID
        
        if not TEST_ITEM_ID:
            pytest.skip("No test item ID available")
            
        response = requests.delete(
            f"{BASE_URL}/api/partner-portal/catalog/{TEST_ITEM_ID}",
            headers=partner_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "message" in data
        assert "deactivated" in data["message"].lower()

# ============== PARTNER STOCK TABLE TESTS ==============
class TestPartnerStockTable:
    """Partner Stock Table and Bulk Update tests"""
    
    def test_get_stock_table(self):
        """Test getting stock table"""
        response = requests.get(
            f"{BASE_URL}/api/partner-portal/stock-table",
            headers=partner_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Expected list of stock items"
        
        if len(data) > 0:
            # Verify stock item structure
            item = data[0]
            assert "id" in item
            assert "sku" in item
            assert "name" in item
            
    def test_bulk_update_stock(self):
        """Test bulk stock update"""
        # First get existing items
        response = requests.get(
            f"{BASE_URL}/api/partner-portal/stock-table",
            headers=partner_headers()
        )
        items = response.json()
        
        if len(items) == 0:
            pytest.skip("No items to update")
            
        # Update first item
        updates = [{
            "id": items[0]["id"],
            "partner_available_qty": 999,
            "partner_status": "in_stock"
        }]
        
        response = requests.post(
            f"{BASE_URL}/api/partner-portal/stock-table/bulk-update",
            headers=partner_headers(),
            json={"updates": updates}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "updated" in data
        assert data["updated"] >= 1 or "errors" in data

# ============== PARTNER FULFILLMENT JOBS TESTS ==============
class TestPartnerFulfillmentJobs:
    """Partner Fulfillment Jobs tests - CRITICAL: Verify NO customer PII exposed"""
    
    PII_FIELDS = ["customer_email", "customer_name", "customer_phone", "customer_company", "delivery_address", "customer_id"]
    
    def test_get_fulfillment_jobs(self):
        """Test getting partner fulfillment jobs"""
        response = requests.get(
            f"{BASE_URL}/api/partner-portal/fulfillment-jobs",
            headers=partner_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Expected list of fulfillment jobs"
        
    def test_fulfillment_jobs_no_customer_pii(self):
        """CRITICAL: Verify fulfillment jobs do NOT contain customer PII"""
        response = requests.get(
            f"{BASE_URL}/api/partner-portal/fulfillment-jobs",
            headers=partner_headers()
        )
        
        assert response.status_code == 200
        jobs = response.json()
        
        for job in jobs:
            for pii_field in self.PII_FIELDS:
                assert pii_field not in job, f"CRITICAL: Customer PII field '{pii_field}' exposed in fulfillment job!"
                
    def test_get_fulfillment_jobs_with_status_filter(self):
        """Test filtering fulfillment jobs by status"""
        statuses = ["allocated", "accepted", "in_progress", "fulfilled"]
        
        for status in statuses:
            response = requests.get(
                f"{BASE_URL}/api/partner-portal/fulfillment-jobs?status={status}",
                headers=partner_headers()
            )
            
            assert response.status_code == 200, f"Failed for status '{status}'"

# ============== PARTNER SETTLEMENTS TESTS ==============
class TestPartnerSettlements:
    """Partner Settlements tests"""
    
    def test_get_settlements_summary(self):
        """Test getting settlement summary"""
        response = requests.get(
            f"{BASE_URL}/api/partner-portal/settlements",
            headers=partner_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "total_due" in data, "Missing total_due"
        assert "total_paid" in data, "Missing total_paid"
        assert "total_all_time" in data, "Missing total_all_time"
        assert "rows" in data, "Missing rows"
        
        # Verify values are numbers
        assert isinstance(data["total_due"], (int, float))
        assert isinstance(data["total_paid"], (int, float))
        
        # Verify rows are list
        assert isinstance(data["rows"], list)

# ============== PARTNER BULK UPLOAD TESTS ==============
class TestPartnerBulkUpload:
    """Partner Bulk Upload tests"""
    
    def test_get_upload_template(self):
        """Test getting bulk upload template"""
        response = requests.get(f"{BASE_URL}/api/partner-bulk-upload/template")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "template" in data
        assert "fields" in data
        
        # Verify template structure
        template = data["template"][0]
        assert "sku" in template
        assert "name" in template
        assert "base_partner_price" in template
        
    def test_validate_upload(self):
        """Test validating bulk upload data"""
        payload = {
            "rows": [
                {
                    "sku": "VALIDATE-TEST-001",
                    "name": "Validation Test Product 1",
                    "base_partner_price": 10000,
                    "partner_available_qty": 50
                },
                {
                    "sku": "VALIDATE-TEST-002",
                    "name": "Validation Test Product 2",
                    "base_partner_price": 15000,
                    "partner_available_qty": 30
                }
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/partner-bulk-upload/validate",
            headers=partner_headers(),
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "valid_count" in data
        assert "error_count" in data
        assert "preview" in data
        
    def test_bulk_upload_catalog(self):
        """Test bulk uploading catalog items"""
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        payload = {
            "rows": [
                {
                    "sku": f"BULK-TEST-{timestamp}-001",
                    "name": "Bulk Upload Test Product 1",
                    "description": "Test product from bulk upload",
                    "category": "promotional",
                    "base_partner_price": 12000,
                    "partner_available_qty": 75,
                    "partner_status": "in_stock",
                    "lead_time_days": 2
                }
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/partner-bulk-upload/catalog",
            headers=partner_headers(),
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "inserted" in data or "updated" in data
        assert "total_processed" in data

# ============== COUNTRY LAUNCH CONFIG TESTS ==============
class TestCountryLaunchConfig:
    """Country Launch Configuration CRUD tests"""
    
    test_country_code = "TEST_CC"
    
    def test_list_country_launch_configs(self):
        """Test listing country launch configurations"""
        response = requests.get(f"{BASE_URL}/api/admin/country-launch")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert isinstance(data, list)
        
    def test_create_country_launch_config(self):
        """Test creating country launch configuration"""
        payload = {
            "country_code": self.test_country_code,
            "country_name": "Test Country",
            "currency": "TCC",
            "status": "coming_soon",
            "waitlist_enabled": True,
            "partner_recruitment_enabled": True,
            "headline": "Test Headline",
            "message": "Test message for country launch"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/country-launch",
            headers={"Content-Type": "application/json"},
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["country_code"] == self.test_country_code
        assert data["status"] == "coming_soon"
        
    def test_get_country_launch_config(self):
        """Test getting specific country launch configuration"""
        response = requests.get(f"{BASE_URL}/api/admin/country-launch/{self.test_country_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["country_code"] == self.test_country_code
        
    def test_public_country_launch_config(self):
        """Test public endpoint for country availability"""
        response = requests.get(f"{BASE_URL}/api/admin/country-launch/public/KE")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "country_code" in data
        assert "status" in data
        assert "waitlist_enabled" in data
        
    def test_delete_country_launch_config(self):
        """Test deleting country launch configuration"""
        response = requests.delete(f"{BASE_URL}/api/admin/country-launch/{self.test_country_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

# ============== COUNTRY EXPANSION TESTS ==============
class TestCountryExpansion:
    """Country Expansion - Waitlist and Partner Application tests"""
    
    def test_join_country_waitlist(self):
        """Test joining country waitlist"""
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        payload = {
            "country_code": "KE",
            "email": f"test_waitlist_{timestamp}@example.com",
            "name": "Test Waitlist User",
            "customer_type": "company",
            "company_name": "Test Company Ltd",
            "phone": "+254700000000",
            "note": "Testing waitlist signup"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/expansion/waitlist",
            headers={"Content-Type": "application/json"},
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "id" in data or "message" in data
        
    def test_waitlist_missing_required_fields(self):
        """Test waitlist signup with missing fields"""
        response = requests.post(
            f"{BASE_URL}/api/expansion/waitlist",
            headers={"Content-Type": "application/json"},
            json={"country_code": "", "email": ""}
        )
        
        assert response.status_code == 400
        
    def test_submit_partner_application(self):
        """Test submitting partner application"""
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        payload = {
            "country_code": "KE",
            "company_name": f"Test Partner Company {timestamp}",
            "contact_person": "Test Contact",
            "email": f"test_partner_{timestamp}@example.com",
            "phone": "+254700000001",
            "city": "Nairobi",
            "regions_served": ["Nairobi", "Mombasa"],
            "company_type": "distributor",
            "categories_supported": ["promotional", "office_supplies"],
            "years_in_business": 5,
            "employee_count": 25,
            "warehouse_available": True,
            "service_team_available": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/expansion/partner-application",
            headers={"Content-Type": "application/json"},
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "id" in data or "message" in data
        
    def test_partner_application_missing_required_fields(self):
        """Test partner application with missing fields"""
        response = requests.post(
            f"{BASE_URL}/api/expansion/partner-application",
            headers={"Content-Type": "application/json"},
            json={"country_code": "KE"}
        )
        
        assert response.status_code == 400
        
    def test_check_application_status(self):
        """Test checking partner application status"""
        response = requests.get(f"{BASE_URL}/api/expansion/partner-application/status/test@example.com")
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)

# ============== ADMIN COUNTRY PARTNER APPLICATIONS TESTS ==============
class TestAdminCountryPartnerApplications:
    """Admin management of country partner applications"""
    
    def test_list_partner_applications(self):
        """Test listing partner applications"""
        response = requests.get(f"{BASE_URL}/api/admin/country-partner-applications")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert isinstance(data, list)
        
    def test_list_applications_filter_by_status(self):
        """Test filtering applications by status"""
        response = requests.get(f"{BASE_URL}/api/admin/country-partner-applications?status=submitted")
        
        assert response.status_code == 200
        
    def test_list_applications_filter_by_country(self):
        """Test filtering applications by country"""
        response = requests.get(f"{BASE_URL}/api/admin/country-partner-applications?country_code=KE")
        
        assert response.status_code == 200
        
    def test_get_application_stats(self):
        """Test getting application statistics"""
        response = requests.get(f"{BASE_URL}/api/admin/country-partner-applications/stats/summary")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "total" in data
        assert "by_status" in data
        assert "by_country" in data

# ============== PUBLIC COUNTRY CATALOG TESTS ==============
class TestPublicCountryCatalog:
    """Public country catalog tests"""
    
    def test_get_country_availability(self):
        """Test getting country availability status"""
        response = requests.get(f"{BASE_URL}/api/public-country/availability/TZ")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "country_code" in data
        assert "status" in data
        assert "waitlist_enabled" in data
        assert "partner_recruitment_enabled" in data
        
    def test_get_public_country_catalog(self):
        """Test getting public country catalog"""
        response = requests.get(f"{BASE_URL}/api/public-country/catalog/TZ")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert isinstance(data, list)
        
        # Verify no internal pricing info exposed
        for item in data:
            assert "base_partner_price" not in item, "Internal partner price should not be exposed"
            assert "partner_id" not in item, "Partner ID should not be exposed in public catalog"
            
    def test_get_country_categories(self):
        """Test getting country categories"""
        response = requests.get(f"{BASE_URL}/api/public-country/categories/TZ")
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
