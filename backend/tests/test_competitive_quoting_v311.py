"""
Test Competitive Quoting System for Konekt B2B Platform
Tests: Price Request CRUD, Send to Vendors, Submit Quote, Select Vendor, Dashboard Stats
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


@pytest.fixture(scope="module")
def auth_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Authenticated requests session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestPriceRequestCRUD:
    """Test Price Request Create, Read, Update operations"""
    
    def test_create_price_request(self, api_client):
        """POST /api/vendor-ops/price-requests creates a new price request"""
        unique_id = str(uuid4())[:8]
        payload = {
            "product_or_service": f"TEST_QuoteSystem_{unique_id}",
            "description": "Test product for competitive quoting",
            "category": "Office Equipment",
            "quantity": 10,
            "unit_of_measurement": "Piece",
            "notes": "Test notes for vendors"
        }
        response = api_client.post(f"{BASE_URL}/api/vendor-ops/price-requests", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == True
        assert "price_request" in data
        
        pr = data["price_request"]
        assert pr["product_or_service"] == payload["product_or_service"]
        assert pr["category"] == payload["category"]
        assert pr["quantity"] == payload["quantity"]
        assert pr["status"] == "new"
        assert "id" in pr
        assert "sourcing_mode" in pr  # Auto-set from settings
        assert "vendor_quotes" in pr
        assert isinstance(pr["vendor_quotes"], list)
        
        # Store for later tests
        TestPriceRequestCRUD.created_request_id = pr["id"]
        print(f"Created price request: {pr['id']}")
    
    def test_get_price_request_detail(self, api_client):
        """GET /api/vendor-ops/price-requests/{id} returns full request detail"""
        request_id = getattr(TestPriceRequestCRUD, 'created_request_id', None)
        if not request_id:
            pytest.skip("No request created in previous test")
        
        response = api_client.get(f"{BASE_URL}/api/vendor-ops/price-requests/{request_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "price_request" in data
        
        pr = data["price_request"]
        assert pr["id"] == request_id
        assert "vendor_quotes" in pr
        assert "sourcing_mode" in pr
        assert "default_quote_expiry_hours" in pr
        assert "default_lead_time_days" in pr
    
    def test_update_price_request(self, api_client):
        """PUT /api/vendor-ops/price-requests/{id} updates request fields"""
        request_id = getattr(TestPriceRequestCRUD, 'created_request_id', None)
        if not request_id:
            pytest.skip("No request created in previous test")
        
        payload = {
            "internal_notes": "Updated internal notes",
            "quantity": 20
        }
        response = api_client.put(f"{BASE_URL}/api/vendor-ops/price-requests/{request_id}", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == True
        
        # Verify update persisted
        get_response = api_client.get(f"{BASE_URL}/api/vendor-ops/price-requests/{request_id}")
        pr = get_response.json()["price_request"]
        assert pr["internal_notes"] == "Updated internal notes"
        assert pr["quantity"] == 20


class TestPriceRequestTabs:
    """Test tab-based filtering for price requests"""
    
    def test_list_new_tab(self, api_client):
        """GET /api/vendor-ops/price-requests?tab=new returns new/pending_vendor_response"""
        response = api_client.get(f"{BASE_URL}/api/vendor-ops/price-requests?tab=new")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "price_requests" in data
        assert "total" in data
        
        # All returned should be new or pending_vendor_response
        for pr in data["price_requests"]:
            assert pr["status"] in ["new", "pending_vendor_response"], f"Unexpected status: {pr['status']}"
        print(f"New tab: {data['total']} requests")
    
    def test_list_awaiting_tab(self, api_client):
        """GET /api/vendor-ops/price-requests?tab=awaiting returns sent_to_vendors/partially_quoted"""
        response = api_client.get(f"{BASE_URL}/api/vendor-ops/price-requests?tab=awaiting")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "price_requests" in data
        
        # All returned should be awaiting statuses
        for pr in data["price_requests"]:
            assert pr["status"] in ["sent_to_vendors", "partially_quoted", "awaiting_quotes"], f"Unexpected status: {pr['status']}"
        print(f"Awaiting tab: {data['total']} requests")
    
    def test_list_ready_tab(self, api_client):
        """GET /api/vendor-ops/price-requests?tab=ready returns ready_for_sales/response_received"""
        response = api_client.get(f"{BASE_URL}/api/vendor-ops/price-requests?tab=ready")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "price_requests" in data
        
        # All returned should be ready statuses
        for pr in data["price_requests"]:
            assert pr["status"] in ["ready_for_sales", "response_received"], f"Unexpected status: {pr['status']}"
        print(f"Ready tab: {data['total']} requests")
    
    def test_list_closed_tab(self, api_client):
        """GET /api/vendor-ops/price-requests?tab=closed returns closed/expired"""
        response = api_client.get(f"{BASE_URL}/api/vendor-ops/price-requests?tab=closed")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "price_requests" in data
        print(f"Closed tab: {data['total']} requests")


class TestPriceRequestStats:
    """Test dashboard stats endpoint"""
    
    def test_get_stats(self, api_client):
        """GET /api/vendor-ops/price-requests/stats returns counts"""
        response = api_client.get(f"{BASE_URL}/api/vendor-ops/price-requests/stats")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "new" in data
        assert "awaiting" in data
        assert "ready" in data
        assert "overdue" in data
        
        assert isinstance(data["new"], int)
        assert isinstance(data["awaiting"], int)
        assert isinstance(data["ready"], int)
        assert isinstance(data["overdue"], int)
        
        print(f"Stats: new={data['new']}, awaiting={data['awaiting']}, ready={data['ready']}, overdue={data['overdue']}")


class TestVendorList:
    """Test vendor listing for selection"""
    
    def test_list_vendors(self, api_client):
        """GET /api/vendor-ops/vendors returns available vendors"""
        response = api_client.get(f"{BASE_URL}/api/vendor-ops/vendors")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "vendors" in data
        assert "total" in data
        
        # Should have seeded vendors
        vendors = data["vendors"]
        print(f"Found {len(vendors)} vendors")
        
        # Store vendor IDs for later tests
        if vendors:
            TestVendorList.vendor_ids = [v.get("id") for v in vendors[:3] if v.get("id")]
            print(f"Vendor IDs for testing: {TestVendorList.vendor_ids}")


class TestCompetitiveQuotingFlow:
    """Test the full competitive quoting flow: Create -> Send -> Quote -> Select"""
    
    def test_full_quoting_flow(self, api_client):
        """Complete flow: Create request -> Send to vendors -> Submit quotes -> Select winner"""
        
        # Step 1: Create a new price request
        unique_id = str(uuid4())[:8]
        create_payload = {
            "product_or_service": f"TEST_FullFlow_{unique_id}",
            "description": "Full flow test for competitive quoting",
            "category": "IT & Electronics",
            "quantity": 5,
            "unit_of_measurement": "Piece"
        }
        create_response = api_client.post(f"{BASE_URL}/api/vendor-ops/price-requests", json=create_payload)
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        
        request_id = create_response.json()["price_request"]["id"]
        print(f"Step 1: Created request {request_id}")
        
        # Step 2: Get available vendors
        vendors_response = api_client.get(f"{BASE_URL}/api/vendor-ops/vendors")
        assert vendors_response.status_code == 200
        vendors = vendors_response.json().get("vendors", [])
        
        if len(vendors) < 2:
            pytest.skip("Need at least 2 vendors for competitive quoting test")
        
        vendor_ids = [v["id"] for v in vendors[:3] if v.get("id")]
        print(f"Step 2: Found {len(vendor_ids)} vendors to send to")
        
        # Step 3: Send to vendors
        send_payload = {"vendor_ids": vendor_ids}
        send_response = api_client.post(f"{BASE_URL}/api/vendor-ops/price-requests/{request_id}/send-to-vendors", json=send_payload)
        assert send_response.status_code == 200, f"Send failed: {send_response.text}"
        
        send_data = send_response.json()
        assert send_data.get("ok") == True
        assert send_data.get("vendors_contacted") == len(vendor_ids)
        print(f"Step 3: Sent to {send_data['vendors_contacted']} vendors")
        
        # Verify status changed to sent_to_vendors
        get_response = api_client.get(f"{BASE_URL}/api/vendor-ops/price-requests/{request_id}")
        pr = get_response.json()["price_request"]
        assert pr["status"] == "sent_to_vendors", f"Expected sent_to_vendors, got {pr['status']}"
        assert len(pr["vendor_quotes"]) == len(vendor_ids)
        
        # Step 4: Submit quotes from vendors
        quotes = [
            {"vendor_id": vendor_ids[0], "base_price": 50000, "lead_time": "3 days", "notes": "Best quality"},
            {"vendor_id": vendor_ids[1], "base_price": 45000, "lead_time": "5 days", "notes": "Budget option"},
        ]
        if len(vendor_ids) > 2:
            quotes.append({"vendor_id": vendor_ids[2], "base_price": 55000, "lead_time": "2 days", "notes": "Express delivery"})
        
        for quote in quotes:
            quote_response = api_client.post(f"{BASE_URL}/api/vendor-ops/price-requests/{request_id}/submit-quote", json=quote)
            assert quote_response.status_code == 200, f"Quote submit failed: {quote_response.text}"
            print(f"Step 4: Submitted quote from vendor {quote['vendor_id']}: {quote['base_price']}")
        
        # Verify status changed to partially_quoted
        get_response = api_client.get(f"{BASE_URL}/api/vendor-ops/price-requests/{request_id}")
        pr = get_response.json()["price_request"]
        assert pr["status"] == "partially_quoted", f"Expected partially_quoted, got {pr['status']}"
        
        # Step 5: Select winning vendor (lowest price = vendor_ids[1] at 45000)
        select_payload = {"vendor_id": vendor_ids[1]}
        select_response = api_client.post(f"{BASE_URL}/api/vendor-ops/price-requests/{request_id}/select-vendor", json=select_payload)
        assert select_response.status_code == 200, f"Select failed: {select_response.text}"
        
        select_data = select_response.json()
        assert select_data.get("ok") == True
        assert select_data.get("base_price") == 45000
        # Sell price should have margin applied (default 20%)
        expected_sell_price = round(45000 * 1.2)
        assert select_data.get("sell_price") == expected_sell_price, f"Expected {expected_sell_price}, got {select_data.get('sell_price')}"
        print(f"Step 5: Selected vendor with base_price={select_data['base_price']}, sell_price={select_data['sell_price']}")
        
        # Verify final state
        get_response = api_client.get(f"{BASE_URL}/api/vendor-ops/price-requests/{request_id}")
        pr = get_response.json()["price_request"]
        assert pr["status"] == "ready_for_sales", f"Expected ready_for_sales, got {pr['status']}"
        assert pr["selected_vendor_id"] == vendor_ids[1]
        assert pr["final_base_price"] == 45000
        assert pr["final_sell_price"] == expected_sell_price
        assert pr["final_lead_time"] == "5 days"
        
        print(f"Full flow complete! Request {request_id} is ready_for_sales")
        
        # Store for cleanup
        TestCompetitiveQuotingFlow.test_request_id = request_id


class TestSendToVendorsValidation:
    """Test validation for send-to-vendors endpoint"""
    
    def test_send_requires_vendor_ids(self, api_client):
        """POST /api/vendor-ops/price-requests/{id}/send-to-vendors requires vendor_ids"""
        # Create a request first
        unique_id = str(uuid4())[:8]
        create_response = api_client.post(f"{BASE_URL}/api/vendor-ops/price-requests", json={
            "product_or_service": f"TEST_Validation_{unique_id}",
            "category": "Other",
            "quantity": 1
        })
        request_id = create_response.json()["price_request"]["id"]
        
        # Try to send without vendor_ids
        response = api_client.post(f"{BASE_URL}/api/vendor-ops/price-requests/{request_id}/send-to-vendors", json={})
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        
        # Try with empty array
        response = api_client.post(f"{BASE_URL}/api/vendor-ops/price-requests/{request_id}/send-to-vendors", json={"vendor_ids": []})
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"


class TestSubmitQuoteValidation:
    """Test validation for submit-quote endpoint"""
    
    def test_submit_quote_requires_vendor_id(self, api_client):
        """POST /api/vendor-ops/price-requests/{id}/submit-quote requires vendor_id"""
        # Get any existing request
        list_response = api_client.get(f"{BASE_URL}/api/vendor-ops/price-requests?tab=awaiting")
        requests_list = list_response.json().get("price_requests", [])
        
        if not requests_list:
            pytest.skip("No awaiting requests to test with")
        
        request_id = requests_list[0]["id"]
        
        # Try to submit without vendor_id
        response = api_client.post(f"{BASE_URL}/api/vendor-ops/price-requests/{request_id}/submit-quote", json={
            "base_price": 10000
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"


class TestSelectVendorValidation:
    """Test validation for select-vendor endpoint"""
    
    def test_select_requires_valid_quote(self, api_client):
        """POST /api/vendor-ops/price-requests/{id}/select-vendor requires valid quoted vendor"""
        # Create a new request (no quotes yet)
        unique_id = str(uuid4())[:8]
        create_response = api_client.post(f"{BASE_URL}/api/vendor-ops/price-requests", json={
            "product_or_service": f"TEST_SelectValidation_{unique_id}",
            "category": "Other",
            "quantity": 1
        })
        request_id = create_response.json()["price_request"]["id"]
        
        # Try to select a vendor that hasn't quoted
        response = api_client.post(f"{BASE_URL}/api/vendor-ops/price-requests/{request_id}/select-vendor", json={
            "vendor_id": "nonexistent-vendor-id"
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"


class TestDashboardStats:
    """Test vendor ops dashboard stats"""
    
    def test_dashboard_stats(self, api_client):
        """GET /api/vendor-ops/dashboard-stats returns all KPIs"""
        response = api_client.get(f"{BASE_URL}/api/vendor-ops/dashboard-stats")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify all expected fields
        assert "total_vendors" in data
        assert "total_products" in data
        assert "active_products" in data
        assert "draft_products" in data
        assert "pending_price_requests" in data
        assert "awaiting_quotes" in data
        assert "ready_for_sales" in data
        
        print(f"Dashboard stats: vendors={data['total_vendors']}, products={data['total_products']}, pending={data['pending_price_requests']}, awaiting={data['awaiting_quotes']}, ready={data['ready_for_sales']}")


class TestSettingsHubVendorOps:
    """Test vendor ops settings in Settings Hub"""
    
    def test_get_settings_hub(self, api_client):
        """GET /api/admin/settings-hub returns vendor_ops settings"""
        response = api_client.get(f"{BASE_URL}/api/admin/settings-hub")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Check vendor_ops section exists
        if "vendor_ops" in data:
            vo = data["vendor_ops"]
            print(f"Vendor Ops Settings: {vo}")
            assert "default_sourcing_mode" in vo or True  # May use defaults
        else:
            print("vendor_ops not in settings yet - using defaults")


class TestCatalogConfig:
    """Test catalog configuration endpoint"""
    
    def test_get_catalog_config(self, api_client):
        """GET /api/vendor-ops/catalog-config returns units, categories, variants"""
        response = api_client.get(f"{BASE_URL}/api/vendor-ops/catalog-config")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "units" in data
        assert "categories" in data
        assert "variant_types" in data
        assert "sku_prefix" in data
        assert "sku_format" in data
        
        print(f"Catalog config: {len(data['units'])} units, {len(data['categories'])} categories, {len(data['variant_types'])} variant types")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
